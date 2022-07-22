import OO from './oo.js';
/**
 * First created user automatically becomes admin.
 * The admin must then sign-in and enable new users to be created manually.
 * Note: a signed-in admin have read/write access on all domains.
 *
 * TODO
 *      harden
 *          add if(secure) cookie   += ' Secure;' enable in produciton mode and if its running wtih SSL 
 *          add DDoS protection to userExistsAsync
 *          add DDoS protection to userAddAsync
 *          encrypt secret stored to db
 *          multi-facctor
 *          add protection against pwd spraying
 *          ensure compression is disabled for signin
 */
import * as crypto from 'crypto';
import {eachAsync, onPlatformEvent, EXIT_EVENT} from './utils.js';
import {createBucketTreeDbAsync} from './buckettree-db.js';
import {tryUserName, tryPassword, hashPasswordAsync, SESSION_ID_COOKIE, CSRF_SIGNIN_SALT_COOKIE, CSRF_SESSION_TOKEN_HEADER, USER_EXISTS_PATH, USER_PREPARE_ADD_PATH, USER_ADD_PATH, USER_DOMAIN_PATH, USER_PASSWORD_PATH, USER_LIST_PATH, USER_ADMIN_PATH, USER_DELETE_PATH, SIGNIN_PATH, SIGNOUT_PATH, META_CONFIG_PATH, SIGNIN_REFRESH_PATH, REFERRER_COOKIE} from './snatch-oo.js';

const
    CSRF_SESSION_TOKEN_SIZE = 32,
    SESSION_ID_TIMEOUT_MS = 1000*60*60*30, // max time allowed between visits, before auto-logout
    SESSION_ID_INTERVAL_MS = 1000*60*60,   // check timeout every frequenzy
    SIGIN_FAILED_TIMEOUT_MS = 1000*60*10,
    SIGIN_FAILED_MAX = 5,
    TTL_ONE_HOUR = 1000*60*60;

export async function parseSnatchRequestAsync(req, options, json='') {
    options = {timeout:5000, ...options}; // override default
    return new Promise((resolve, rej) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {       //console.log(`parseSnatchRequestAsync data(${data})`);
            //console.log(req.headers); check // TODO check headers if its JSON or something else and parse if it is otherwise not
            try {
                data = data && JSON.parse(data);
                resolve(data);
            } catch(e) {
                rej(e);
            }
        });
        req.on('error', rej);
        req.on('timeout', rej);
        if(options.timeout) {
            req.setTimeout(options.timeout);
        }
    });
};


export function sendSnatchResponse(res, {html, json, error, code=200, end=true}) {
    // @see http://breachattack.com mitigation: random header lengt is a weak mitigation. instead signin should have compression _disabled_
    res.setHeader('oo-snatch-bam', (Math.random() + '').substring(parseInt((Math.random() * 10)))); // weak random.
    try {
        if(html) {
            res.writeHead(code, { 'Content-Type': 'text/html' });
            res.write(html);
        } else if(json) {
            res.writeHead(code, { 'Content-Type':  'application/json' });
            res.write(JSON.stringify(json));
        } else if(error) {
            res.writeHead(500, { 'Content-Type':  'application/json' });
            res.write(JSON.stringify({error}));
        }
    } catch(e) {
        console.error(e);
        res.writeHead(500, { 'Content-Type': 'text/json' });
        res.write(JSON.stringify({error:'guru meditation'}));
        close = true;
    } finally {
        if(end) {
            res.end();
        }
     }
};

export function redirectSnatchResponse(res, {referrer='/', location, code=302, end=true}) {
    if(!location) throw new Error(`bad args. referrer=${referrer}, location=${location}, code=${code}`);
    addResponseCookie(res, REFERRER_COOKIE, referrer, {sameSite:'Strict', secure:true, httpOnly:false});
    res.setHeader('Location', location);
    res.writeHead(code, { 'Content-Type': 'text/html' });
    res.write(`${code}`);
    if(end) res.end();
};

export function handleSigninRedirect(res, currPath, {isReadAccess, isReadWriteAccess, isDomain}, {referrerPath, signinPath, refreshPath, errorPath}) {
    //console.log({currPath, isReadWriteAccess, isReadAccess, referrerPath, signinPath, refreshPath, errorPath});

    if(isReadAccess && !isDomain) {
        redirectSnatchResponse(res, {referrer:referrerPath, location:errorPath}); //console.log('handleSigninRedirect bad domain go to ', errorPath);
        return true;
    }

    if(!isReadWriteAccess) {

        if(referrerPath === undefined) referrerPath = currPath;

        if(isReadAccess && currPath !== signinPath && currPath !== refreshPath) {
            if(refreshPath) redirectSnatchResponse(res, {referrer:referrerPath, location:refreshPath});
            else redirectSnatchResponse(res, {referrer:referrerPath, location:signinPath});
            return true;
        } else if(!isReadAccess && currPath !== signinPath) {
            redirectSnatchResponse(res, {referrer:referrerPath, location:signinPath});
            return true;
        }

    }
};

async function parseUserDataAsync(req) {
    const data = await parseSnatchRequestAsync(req);
    if(!data) throw new Error(`bad data(${data})`);
    // if client is not able to read cookies,
    // it will not be able to extract the salt generated by the server stored in the cookie,
    // and thus not be able to sumbit a hash of the password that will match one that will
    // now be generated by the salt from the cookie.
    // note: with a properly configured browser is a client, this should provide some protection,
    // but with a program such a curl the salt can be read by the client, or even dont bother even
    // reading the cookie and just generate a new salt, hash with it and send back everything to
    // the server. since the csrfloginsalt is never stored on server, there would be no way to know.
    const saltFromCookie = getRequestCookie(req, CSRF_SIGNIN_SALT_COOKIE); // cookie is (supposedly) from server
    const {userName, password, saltedPassword, admin, domain} = data;
    tryUserName(userName);
    tryPassword(password);
    const [saltFromClient,hashFromClient] = saltedPassword.split(':'); // header set by client (which read it from the cookie)
    const generatedHash = await hashPasswordAsync(saltFromCookie, password);
    //console.log({saltFromCookie, saltFromClient, hashFromClient, generatedHash});
    if(saltFromCookie !== saltFromClient || hashFromClient !== generatedHash) throw new Error(`bad csrf for user(${userName})`);
    return {userName, password, admin, domain};
}

export function addResponseCookie(res, key, value, {destroy, host, httpOnly, secure, sameSite, ttlMs, path='/', cookiePrefix=true}) {
    let cookie = `${key}=${value};`;
    if(path) cookie         += ` path=${path};`;
    // TODO enable secure in HTTPS mode
    ////if(secure) {
    ////    cookie += ' Secure;'
    ////    if(cookiePrefix) {
    ////        if(host) {
    ////            cookie = `__Host-${cookie}`;
    ////        } else {
    ////            cookie = `__Secure-${cookie}`;
    ////        }
    ////    }
    ////}
    if(httpOnly) cookie     += ' HttpOnly;'
    if(sameSite) cookie     += ` SameSite=${sameSite};`
    if(destroy) cookie      += ` expires=Thu, 01 Jan 1970 00:00:01 GMT`
    else if(ttlMs) cookie   += ` expires=${new Date(new Date().getTime()+ttlMs).toUTCString()}`;
    const cookies = res.getHeader('Set-Cookie') || []; //console.log(cookie);
    cookies.push(cookie);
    res.setHeader('Set-Cookie', cookies);
};

function getRequestCookie(req, name) { //console.log('getRequestCookie', req.headers['cookie']);
    name += '=';
    const cookies = decodeURIComponent(req.headers['cookie']).split('; ');
    for(let i = 0, s; i < cookies.length; i++) {
        s = cookies[i];
        if(s.startsWith('__')) {
            s = (s.split('__')[1]).split('-')[1]; //console.log('cookie prefixed', s);
        }
        if(s.startsWith(name)) {
            s = s.split('=')[1];    //console.log('getRequestCookie parsed', {name, cookies, s});
            return OO.escapeStringRegexp(s);
        }
    }
}

async function hashAsync(salt, message) {
    if(!salt || typeof salt !== 'string') throw new Error(`bad salt(${salt})`);
    return new Promise((res, rej) => {
        crypto.scrypt(message, salt, 64, (err, buf) => {
            if(err) rej(err);
            else res(buf);
        })
    });
}

async function isSameHashAsync(salt, hash, message) {
    if(!salt || typeof salt !== 'string') throw new Error(`bad salt(${salt})`);
    if(!message) throw new Error(`bad message(${message})`);
    const expectedHash = Buffer.from(hash, 'hex');
    const generatedHash = await hashAsync(salt, message);
    return crypto.timingSafeEqual(expectedHash, generatedHash);
}

export async function createUserDbAsync(path) {
    const db = await createBucketTreeDbAsync({path});
    onPlatformEvent(EXIT_EVENT, () => {
        db.stopBlocking();
    });
    return db;
};

export async function createSnatchAsync({db, timeoutMs=SESSION_ID_TIMEOUT_MS, log}) {
    // TODO add meta to database, requires db transaction to prevent race conditions
    const meta = await db.getAsync('meta') || {
        config: {
            isAddUserApiEnabled: true // only applies to normal users, admin can always add new users
        },
        users:[]
    };

    let sessions = {},
        addUserSemaphore = {};

    function createSession(res, userName, isAdmin, domain) {
        const o = {
            userName,
            isAdmin,
            domain:{...domain}      // this user has access to following domains
        };
        // create sessionId
        o.sessionId = crypto.randomBytes(64);
        const sessionId = o.sessionId.toString('hex');
        addResponseCookie(res, SESSION_ID_COOKIE, sessionId, {ttlMs: TTL_ONE_HOUR*30, sameSite:'Strict', secure:true, httpOnly:true});
        // create salted csrf token
        o.csrfSessionToken = crypto.randomBytes(CSRF_SESSION_TOKEN_SIZE);
        res.setHeader(CSRF_SESSION_TOKEN_HEADER, o.csrfSessionToken.toString('hex'));
        // session timeout
        o.lastAccess = Date.now();
        o.timeoutId = OO.interval(SESSION_ID_INTERVAL_MS, () => {
            if( (Date.now() - o.lastAccess) > timeoutMs ) {                       //log('timeout: signIn timedout');
                OO.interval.clear(o.timeoutId);
                return;
            }   log('timeout: signIn still fresh');
        });
        // session should never be stored permanently,
        // only reside in memory to prevent credentials
        // leakage.
        sessions[sessionId] = o;                                                  //log('sessions', {sessions});
        return o;
    }

    function signOut(res, {sessionId, timeoutId}) { // destroy session
        sessionId = sessionId.toString('hex');
        clearInterval(timeoutId);
        delete sessions[sessionId];
        addResponseCookie(res, SESSION_ID_COOKIE, '', {destroy:true, sameSite:'Strict', secure:true, httpOnly:true});
    }

    function userPrepareAdd(res) {                                          //log('---------------userPrepareAdd');
        // double cookie pattern, applied to password submit
        const salt =  crypto.randomBytes(32).toString('hex');
        addResponseCookie(res, CSRF_SIGNIN_SALT_COOKIE, salt, {sameSite:'Strict', secure:true, httpOnly:false});
    }

    async function userAddAsync(req, session) {                                 //log('--------------userAddAsync');
        let data = await parseUserDataAsync(req);
        if(!session || !session.isAdmin) {
            // only admins should be able to create new users with escalated priveledges
            delete data.admin;
            delete data.domain;
        } //console.log('userAddAsync', {data});
        return createUserAsync(data);
    }

    async function createUserAsync({userName, password, admin, domain}) {
        if(!userName) throw new Error(`bad user(${userName})`);
        if(addUserSemaphore[userName]) throw new Error(`user(${userName}) is being added`);
        addUserSemaphore[userName] = true;
        if(await hasUserAsync(userName)) {
            delete addUserSemaphore[userName];
            throw new Error(`user exists`);
        }
        // update meta
        const isAdmin = admin || meta.users.length === 0;
        // note: first user added becomes admin.
        // no need to worry about admin having default admin pwd.
        if(meta.users.length === 0) {
            meta.config.isAddUserApiEnabled = false; // automatically disable after creating first user
        }
        const user = await updateUserAsync({userName, password, admin: isAdmin, domain});
        meta.users.push(userName);
        await db.setAsync('meta', meta);
        delete addUserSemaphore[userName];
        //console.log('created user', user);
        return user;
    }

    async function setPasswordAsync(req, session) {
        const {userName, oldPassword, password} = await parseSnatchRequestAsync(req);
        tryUserName(userName);
        tryPassword(oldPassword);
        tryPassword(password);
        if(oldPassword === password) throw new Error(`new password same as old`);
        if(session && !session.isAdmin && session.userName !== userName) throw new Error(`user(${session.userName}) can not change pwd for user(${userName})`);
        await updateUserAsync({userName, oldPassword, password});
    }

    async function setAdminEnabled(req, session) {
        if(!session.isAdmin) throw new Error(`no access`);
        const {userName, value} = await parseSnatchRequestAsync(req);
        if(session.userName === userName) throw new Error(`admin(${userName}) can not downgrade self `);
        await updateUserAsync({userName, admin: !!value});
    }

    async function setDomainAsync(req, session) {                           //console.log('setDomainAsync');
        if(!session.isAdmin) throw new Error(`no access`);
        let {userName, domain} = await parseSnatchRequestAsync(req);
        if(!domain) domain='';
        await updateUserAsync({userName, domain});
    }

    async function updateUserAsync({userName, oldPassword, password, admin, domain}) {
        let user = await loadUserAsync(userName);
        if(domain) domain = domain.split(',').reduce((a, s) => {
            if(s.length) a[s] = true;
            return a;
        }, {});
        if(!user) {
            user = {
                //salt      // changed when new pwd is set
                //hash      // password hash
                created: Date.now(),
                userName,   // can never be changed
                admin: false,
                domain: {
                    ...domain
                },
                success: {
                    last: 0,
                },
                failed: {
                    last: 0,
                    cnt: 0
                }
            };
        }
        if(admin !== undefined) user.admin = admin;
        if(domain !== undefined) user.domain = domain;
        if(password !== undefined) {
            if(user.hash) {
                const hash = (await hashAsync(user.salt, oldPassword)).toString('hex');
                if(!await isSameHashAsync(user.salt, user.hash, oldPassword)) throw new Error(`bad password`);
            }
            user.salt = crypto.randomBytes(64).toString('hex');
            user.hash = (await hashAsync(user.salt, password)).toString('hex');
            console.log('updated user', user);
        }
        user.updated = Date.now();
        await saveUserAsync(user); //console.log('saved', user);
        return user;
    }

    async function signInAsync(req, res) {
        const {userName, password} = await parseUserDataAsync(req);
        const o = await loadUserAsync(userName);
        if(!o) throw new Error(`user(${userName}) not found`);
        if(o.userName !== userName) throw new Error(`db inconsistency. keyUserName(${userName}) savedUserName(${o.userName}) `);
        // check if sign-in has been failing too much lately
        if((Date.now() - o.failed.last) < SIGIN_FAILED_TIMEOUT_MS) {
            // more time must pass before signin is allowed
            throw new Error(`time punish(${userName})`);
        }

        // verify password
        if(await isSameHashAsync(o.salt, o.hash, password)) {
            // success
            o.success.last = Date.now();
            o.failed.last = 0;
            o.failed.cnt = 0;
            createSession(res, userName, o.admin, o.domain);
            await saveUserAsync(o);
            return createProfile(o);
        } else {
            // failed
            o.failed.cnt++;
            if(o.failed.cnt > SIGIN_FAILED_MAX) {
                // too many failures
                o.failed.last = Date.now();
            }
            await saveUserAsync(o);
            throw new Error(`bad hash(${userName})`);
        }
    }

    function createProfile(user) {
        return {
            userName: user.userName,
            isAdmin: user.admin,
            last: user.success.last,
            failed: user.failed.cnt,
            failedLast: user.failed.last,
            domains: Object.keys(user.domain)
        };
    }

    async function signinRefreshAsync(req, res, session) {
        const userName = session.userName;
        const user = await loadUserAsync(userName);
        if(!user) throw new Error(`user(${userName}) not found`);
        res.setHeader(CSRF_SESSION_TOKEN_HEADER, session.csrfSessionToken.toString('hex'));
        return createProfile(user);
    }

    async function saveUserAsync(o) {
        // TODO encrypt secret
        await db.setAsync('u' + o.userName, o);
    }

    async function loadUserAsync(userName) {
        const o = await db.getAsync('u' + userName);
        // TODO decrypt secret
        return o;
    }

    async function userExistsAsync(req) {
        const data = await parseSnatchRequestAsync(req);
        if(!data) throw new Error(`bad data(${data})`);
        const {userName} = data;
        return hasUserAsync(userName);
    }

    async function hasUserAsync(userName) {
        // internal use only.
        const o = await loadUserAsync(userName);
        return o && o.userName === userName;
    }

    async function userListAsync(session) {
        if(session && !session.isAdmin) throw new Error(`user(${session.userName} does not have admin priveledge)`);
        return eachAsync(meta.users, async (userName) => {
            const user = await loadUserAsync(userName); //console.log({user});
            const domain = user.domain ? Object.keys(user.domain).join(',') : ''; //console.log('---->', domain)
            return {
                userName,
                domain,
                admin: user.admin
            };
        }, [])
    }

    async function userDeleteAsync(req, session) {
        const {userName} = await parseSnatchRequestAsync(req);  //console.log('deleteUserAsync', userName);
        if(session) {
            if(!session.isAdmin && session.userName !== userName) throw new Error(`user(${session.userName}) can not delete user(${userName})`);
        }
        await deleteUserAsync(userName);
     }

    async function deleteUserAsync(userName) {
       await db.deleteAsync('u' + userName);
        // update meta
        const i = meta.users.findIndex(s => s === userName);
        if(i >= 0) meta.users.splice(i, 1);
        await db.setAsync('meta', meta);
    }

    async function metaConfigAsync(req, session) {
        if(session && !session.isAdmin) throw new Error(`user(${session.userName} does not have admin priveledge)`);
        const config = await parseSnatchRequestAsync(req);
        if(config) meta.config = config;
        return meta.config;
    }

    async function handleSnatchSessionAsync(req, res, path, domain) {
        // @see http://breachattack.com mitigation: random header lengt is a weak mitigation. instead signin should have compression _disabled_
        let isRequestConsumed,
            isReadAccess = false,
            isReadWriteAccess = false,
            isDomain = false,
            isAdmin = false;

        const
            sessionIdFromClient = getRequestCookie(req, SESSION_ID_COOKIE),
            session = sessions[sessionIdFromClient];

        if(session && session.sessionId && session.csrfSessionToken) {
            if(crypto.timingSafeEqual(session.sessionId, Buffer.from(sessionIdFromClient, 'hex'))) {
                isReadAccess = true;
            }

            isDomain = session.domain[domain] || domain === '*' || session.isAdmin;

            const csrfSessionTokenFromClient = req.headers[CSRF_SESSION_TOKEN_HEADER];  
            if(csrfSessionTokenFromClient && crypto.timingSafeEqual(session.csrfSessionToken, Buffer.from(csrfSessionTokenFromClient, 'hex'))) {
                session.lastAccess = Date.now(); // debounce session timeout
                isReadWriteAccess = isReadAccess && isDomain;
            }   //console.log('handleSnatchSessionAsync', {domain:!!isDomain, token:csrfSessionTokenFromClient});

        }

        if(path.startsWith('/snatch/')) {                               log('snatch.sessionHandler', {path});
            isRequestConsumed = true;

            try {
                // no session
                switch(path) {
                    case USER_EXISTS_PATH:
                        sendSnatchResponse(res, {json:{success:true, exists: await userExistsAsync(req)}});
                        return {isRequestConsumed};
                    case USER_PREPARE_ADD_PATH:
                        userPrepareAdd(res);
                        sendSnatchResponse(res, {json:{success:true}});
                        return {isRequestConsumed};
                    case USER_ADD_PATH:
                        if(meta.config.isAddUserApiEnabled || (session && session.isAdmin)) await userAddAsync(req, session);
                        else throw new Error(`disabled`);
                        sendSnatchResponse(res, {json:{success:true}});
                        return {isRequestConsumed};
                    case SIGNIN_PATH:
                        sendSnatchResponse(res, {json:{success:true, profile: await signInAsync(req, res)}});
                        return {isRequestConsumed};
                }

                // session required
                if(!session) throw new Error('no access');

                // handle read access only
                if(!isReadAccess) throw new Error(`no r access`);
                switch(path) {
                    case SIGNIN_REFRESH_PATH:
                        sendSnatchResponse(res, {json:{success:true, profile: await signinRefreshAsync(req, res, session)}});
                        return {isRequestConsumed};
                }

                // handle readwrite
                // note: additional priveledge checks (such as admin/domain) is checked in invoked functions.
                if(!isReadWriteAccess) throw new Error(`no rw access`);
                switch(path) {
                    case SIGNOUT_PATH:
                        signOut(res, session);
                        sendSnatchResponse(res, {json:{success:true}});
                        return {isRequestConsumed};
                     case USER_LIST_PATH:
                        sendSnatchResponse(res, {json:{success:true, list: await userListAsync(session)}});
                        return {isRequestConsumed};
                    case META_CONFIG_PATH:
                        sendSnatchResponse(res, {json:{success:true, config:await metaConfigAsync(req, session)}});
                        return {isRequestConsumed};
                    case USER_DOMAIN_PATH:
                        await setDomainAsync(req, session);
                        break;
                     case USER_PASSWORD_PATH:
                        await setPasswordAsync(req, session);
                        break;
                    case USER_ADMIN_PATH:
                        await setAdminEnabled(req, session);
                        break;
                    case USER_DELETE_PATH:
                        await userDeleteAsync(req, session);
                        break;
                }

                sendSnatchResponse(res, {json:{success:true}});
                return {isRequestConsumed};
            } catch(e) {
                console.error(e); // error
                sendSnatchResponse(res, {json:{error:true}}); // do not leak error message to client
            }
        }

        return {
            // XXX WARNING: returned value may be propagated to client. do not add secrets!!!
            isAdmin,
            isDomain,
            isReadAccess,
            isReadWriteAccess,
            isRequestConsumed
        };
    };

    return {
        handleSnatchSessionAsync,
        loadUserAsync,
        createUserAsync,
        deleteUserAsync
    };
};

export function createSessionAwareResourceRoutePreprocessor(options) {
    return function(routeHandler, done, pathSegments, searchParams, data={}, {path, overrideSession=false}) {
        //console.log('resourceRoutePreprocessor', pathSegments, searchParams, data);
        const log = function(){options.log(path.toUpperCase(), ...arguments);};
        if(data.DROP) pathSegments.DROP = data.DROP;        // mutate
        else if(data.SET) pathSegments.SET = data.SET;      // mutate
        else if(data.SEND) pathSegments.SEND = data.SEND;   // mutate
        else pathSegments.GET = 'GET';                      // non-mutation

        if(!overrideSession) {
            if(!options.session.isDomain) {
                done(undefined, 'no access');
                return;
            } else if(pathSegments.GET) {
                if(!options.session.isReadAccess) {
                    done(undefined, 'no access');
                    return;
                }
            } else {
                if(!options.session.isReadWriteAccess) {
                    done(undefined, 'no access');
                    return;
                }
            }
        }

        //console.log(routeHandler, data.data);
        routeHandler({...options, log}, done, pathSegments, searchParams, data.data);
    };
};

