const
    DEV = true,
    PWD_DEBUG = 'dragonfirewillkeepsecretsafe'; // TODO XXX TODO remove when finished coding manager etc. XXX not in production

/**
 * Session aware information broker between web client and web server.
 */

import OO from './oo.js';
import {getDocumentCookie, deleteDocumentCookie, createOnNotify} from './utils.js';
import {getHash} from './crypto-common.js';

export const
    SESSION_CHANGED_EVENT       = 'session',
    SESSION_ID_COOKIE           = 'oo_snatch_sessionid',
    CSRF_SIGNIN_SALT_COOKIE     = 'csrfsigninsalt',
    CSRF_SESSION_TOKEN_HEADER   = 'oo-snatch-csrfsessiontoken', // must be lower-case to match nodejs req.headers
    REFERRER_COOKIE             = 'oo_snatch_referrer';

export const // API
    USER_EXISTS_PATH = '/snatch/user/exists',
    USER_PREPARE_ADD_PATH = '/snatch/user/prepareadd',
    USER_DOMAIN_PATH = '/snatch/user/domain',
    USER_ADD_PATH = '/snatch/user/add',
    USER_PASSWORD_PATH = '/snatch/user/password',
    USER_ADMIN_PATH = '/snatch/user/admin',
    USER_DELETE_PATH = '/snatch/user/delete',
    USER_LIST_PATH = '/snatch/user/list',
    SIGNIN_PATH = '/snatch/signin',
    SIGNIN_REFRESH_PATH = '/snatch/signin/refresh',
    SIGNOUT_PATH = '/snatch/signout',
    META_CONFIG_PATH = '/snatch/meta/config';

const
    USR_MIN_LENGTH = 3,
    USR_MAX_LENGTH = 50,
    PWD_MIN_LENGTH = 20;

function isBadUserName(userName) {
    return !userName || userName.length < USR_MIN_LENGTH || userName.length > USR_MAX_LENGTH || typeof userName !== 'string';
}

export function removeSnatchReferrerCookie() {
    const url = getDocumentCookie(REFERRER_COOKIE); //console.log('removeSnatchReferrerCookie', {url});
    deleteDocumentCookie(REFERRER_COOKIE);
    return url;
}

export function tryUserName(userName) {
    if(isBadUserName(userName)) throw new Error(`bad userName(${userName})`);
};

export function isBadPassword(password) {
    return !password || password.length < PWD_MIN_LENGTH || password.indexOf(' ') !== -1 || typeof password !== 'string';
};

export function tryPassword(password) {
    if(isBadPassword(password)) throw new Error(`bad password(${password})`);
};

export async function hashPasswordAsync(salt, password) {
    return getHash(`${salt}_${password}`, true, 'SHA-384');
};

export function createSnatchClient() {
    let signedInProfile = null,
        basename = '',
        csrfSessionToken;

    const {on, notify} = createOnNotify(console.log);

    async function fetchAsync(path='', data, cb) {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
        if(signedInProfile && csrfSessionToken) {
            headers[CSRF_SESSION_TOKEN_HEADER] = csrfSessionToken; // send csrf-session-token
        }
        if(cb) {
            headers = cb(headers);
        }
        const url = basename + path;
        const body = JSON.stringify(data);
        //try {throw new Error();} catch(e) { console.log({path, url, basename}); console.error(e); };
        //console.log('fetchAsync post', {baseUrl, path, url, data, body});
        const response = await fetch(url, {
            headers,
            method: 'POST',
            body
        }); //console.log('fetchAsync', {response})
        return response;
    }

    async function hasUserAsync(userName) {
        const
            response = await fetchAsync(USER_EXISTS_PATH, {userName}),
            data = await response.json();
        return data.success && data.exists;
    }

    async function addUserAsync({userName, password}) {
        tryUserName(userName);
        tryPassword(password);
        let response = await fetchAsync(USER_PREPARE_ADD_PATH),
            result = await response.json();                                     console.log(USER_PREPARE_ADD_PATH, response, result);
        if(result.success) {
            const
                salt = getDocumentCookie(CSRF_SIGNIN_SALT_COOKIE), // double cookie pattern
                hash = await hashPasswordAsync(salt, password),
                saltedPassword = `${salt}:${hash}`;
            response = await fetchAsync(USER_ADD_PATH, {userName, password, saltedPassword});   console.log(USER_ADD_PATH, result);
            result = await response.json();
            if(result.error) throw new Error(`failed to create user error(${result.error})`);
            return result.success;
        }
    }

    async function refreshSigninAsync(cb) {
        const response = await fetchAsync(SIGNIN_REFRESH_PATH);
        const result = await response.json(); //console.log('refreshSigninAsync', result);;
        if(result.success) handleProfileChange(response, result.profile);
        if(typeof cb === 'function') cb(result);
        return result;
    }

    function handleProfileChange(response, profile) {
        // receive csrf-session-token
        const token = response.headers.get(CSRF_SESSION_TOKEN_HEADER);
        if(token) {                                                         //console.log('refreshed csrf-session-token');
            csrfSessionToken = token;
            //console.log({csrfSessionToken})
        }
        // sessionId arrives as cookie HttpOnly so we can not read it
        signedInProfile = profile;
        notify(SESSION_CHANGED_EVENT, signedInProfile);
    }

    async function signInAsync({userName, password}) {
        if(signedInProfile) throw new Error(`already signed in`);
        let response = await fetchAsync(USER_PREPARE_ADD_PATH),
            result = await response.json();                             //console.log(USER_PREPARE_ADD_PATH, response, result);
        if(result.success) {
            const
                salt = getDocumentCookie(CSRF_SIGNIN_SALT_COOKIE), // double cookie pattern
                hash = await hashPasswordAsync(salt, password),
                saltedPassword = `${salt}:${hash}`;
            // submit secrets in body, because greater risk of headers being logged
            response = await fetchAsync(SIGNIN_PATH, {userName, password, saltedPassword});
            result = await response.json();                             //console.log(SIGNIN_PATH, response, result);
            if(result.success) {
                deleteDocumentCookie(CSRF_SIGNIN_SALT_COOKIE);
                handleProfileChange(response, result.profile);
                return true;
            }
        }
        throw new Error(`signin failed`);
    }

    async function setDomainAsync({userName, domain}) {
        if(!signedInProfile) throw new Error(`must be signed in`);
        const response = await fetchAsync(USER_DOMAIN_PATH, {userName, domain});
        const result = await response.json();
        return result.success;
    }

    async function setPasswordAsync({userName, oldPassword, password}) {
        tryPassword(password);
        if(!signedInProfile) throw new Error(`must be signed in`);
        const response = await fetchAsync(USER_PASSWORD_PATH, {userName, oldPassword, password});
        const result = await response.json();
        return result.success;
    }

    async function setAdminEnabled({userName, value}) {
        if(!signedInProfile) throw new Error(`must be signed in`);
        const response = await fetchAsync(USER_ADMIN_PATH, {userName, value});
        const result = await response.json();
        return result.success;
    }

    async function deleteUserAsync(userName) {
        if(!signedInProfile) throw new Error(`must be signed in`);
        await fetchAsync(USER_DELETE_PATH, {userName});
    }

    async function signOutAsync(isNotify=true) {
        if(!signedInProfile) throw new Error(`already signed out`);
        const response = await fetchAsync(SIGNOUT_PATH);
        const result = await response.json(); //console.log('signOutAsync', result);
        if(result.success) {
            csrfSessionToken = null;
            signedInProfile = false;
            deleteDocumentCookie(SESSION_ID_COOKIE);
            if(isNotify) notify(SESSION_CHANGED_EVENT, {signedInProfile});
            return result;
        }
        throw new Error(`sign-out failed. error(${result.error})`);
   }

    async function postAsync(path, data) {
        //if(!path) throw new Error(`bad path(${path})`);
        const response = await fetchAsync(path, data); //console.log('send', data, 'respons', response);
        const parcel = await response.json(); //console.log('response from server', parcel);
        return parcel;
    };

    async function listUsersAsync() {
        if(!signedInProfile) throw new Error(`must be signed in`);
        const response = await fetchAsync(USER_LIST_PATH);
        const result = await response.json();
        if(result.success) {
            return result.list;
        }
    }

    async function configAsync(config) {
        if(!signedInProfile) throw new Error(`must be signed in`);
        const response = await fetchAsync(META_CONFIG_PATH, config);
        const result = await response.json(); //console.log({result});
        if(result.success) {
            return result.config;
        }
    }

    function setBasename(s) {    //console.log('setBaseUrl', {s}); console.trace();
        basename = s;
    }

    function isSignedOut() {
        return !signedInProfile;
    }

    function getProfile() {
        return signedInProfile;
    }

    function SigninRefreshTug({oo, go}) {
        // add this Tug to automatically handle session refresh
        // example: oo(snatch.SigninRefreshTug);
        oo.style({visibility:'hidden'});
        const isClient = !OO.isNodeJs;
        if(isClient) {
            refreshSigninAsync(({error, profile}) => {
                if(!error) {
                    if(profile) {
                        if(isSignedOut()) throw new Error('signed out');
                        const referrerUrl = removeSnatchReferrerCookie();
                        //setTimeout(() => {
                        go(referrerUrl);
                        //}, 3000);
                    }
                }
            });
        }
    }

    return {
        SigninRefreshTug,
        setBasename,
        hasUserAsync,
        addUserAsync,
        signInAsync,
        postAsync,
        setDomainAsync,
        setPasswordAsync,
        setAdminEnabled,
        deleteUserAsync,
        signOutAsync,
        listUsersAsync,
        getProfile,
        configAsync,
        refreshSigninAsync,
        isSignedOut,
        on
    };
};


// tug
export function Signin({oo, go}, {snatch, showSignin=true, showAdd=true, autoRedirect}) { console.log(...arguments);
    if(!snatch) throw new Error('snatch is undefined');

    const
        onProfile = oo.xx('onProfile'),
        onSigninAsync = oo.xx('onSigninAsync'),
        onSigninFailedAsync = oo.xx('onSigninFailedAsync'),
        onAddAsync = oo.xx('onAddAsync');

    snatch.on(SESSION_CHANGED_EVENT, (profile) => {
        onProfile({oo, profile, snatch});
        //console.log({autoRedirect, profile}, !snatch.isSignedOut());
        if(autoRedirect) {
            if(profile && !snatch.isSignedOut()) {
                const referrerUrl = removeSnatchReferrerCookie();  //console.log('autoRedirecting to', {referrerUrl}); setTimeout(() => {
                go(referrerUrl); //}, 2000);
            }
        }
    });


    let userNameDefault = 'Enter user name',
        passwordDefault = 'Enter password',
        passwordDefault2 = 'Re-enter password',
        isUserExists = null;

    //oo.onDestroy(() => {
    //    isDestroyed = true;
    //});


    const setButtonStyles = () => {
        if(isUserExists === null) {
            addButton.elm.disabled = false;
            signinButton.elm.disabled = false;
            //addButton.style({visibility:'hidden'});
            //signinButton.style({visibility:'hidden'});
          } else if(isUserExists) {
            addButton.elm.disabled = true;
            signinButton.elm.disabled = false;
            signinButton.style({visibility:'visible'});
            addButton.style({visibility:'hidden'});
            passwordInput2.style({visibility:'hidden'});
        } else {
            addButton.elm.disabled = false;
            signinButton.elm.disabled = true;
            addButton.style({visibility:'visible'});
            signinButton.style({visibility:'hidden'});
            passwordInput2.style({visibility:'visible'});
        }

        if(!showAdd) {
            if(!isUserExists && !userNameInput.elm.ooIsEditing && userNameInput.elm.value !== userNameDefault) userNameInput.style({outlineStyle:'solid'});
            addButton.style({visibility:'hidden'});
            passwordInput2.style({visibility:'hidden'});
        }
        if(!showSignin) addButton.style({visibility:'hidden'});
    };

    const userNameInput = oo('div')('input', {value:userNameDefault})
        .style({outlineColor: 'red'})
        .onevent('focus', ({elm}) => {
            if(!elm.ooIsEditing) {
                elm.ooIsEditing = true;
                if(DEV) elm.value = 'admin';
                else elm.value = '';
            }
        })
        .oninput(({elm}) => {
            if(DEV) {
                if(elm.ooIsEditing) {
                    setButtonStyles();
                }
            }
        })
        .onevent('focusout', async ({value, elm, oo}) => {
            if(!value.length) {
                elm.ooIsEditing = false;
                elm.value = userNameDefault;
            } else {
                elm.ooIsEditing = false;
                if(isBadUserName(value)) {
                    oo.style({outlineStyle:'solid'});
                } else {
                    oo.style({outlineStyle:'none'});
                    isUserExists = await snatch.hasUserAsync(userNameInput.elm.value);
                }
                setButtonStyles();
            }
        });

    const passwordInput = oo('div')('input', {value: passwordDefault})
        .style({outlineColor: 'red'})
        .onevent('focus', ({elm}) => {
            if(!elm.ooIsEditing) {
                elm.ooIsEditing = true;
                if(DEV) elm.value = PWD_DEBUG;
                else elm.value = '';
                elm.type = 'password';
            }
        })
        .onevent('focusout', ({elm, value, oo}) => {
            if(!value.length) {
                elm.ooIsEditing = false;
                elm.value = passwordDefault;
                elm.type = 'text';
            } else {
                setButtonStyles();
                elm.ooIsEditing = true;
                if(isBadPassword(value)) {
                    oo.style({outlineStyle:'solid'});
                    signinButton.elm.disabled = true;
                    addButton.elm.disabled = true;
                } else {
                    oo.style({outlineStyle:'none'});
                }
            }
        });

    const passwordInput2 = oo('div')('input', {value: passwordDefault2})
        .style({visibility: 'hidden', outlineColor: 'red'})
        .onevent('focus', ({elm}) => {
            if(!elm.ooIsEditing) {
                elm.ooIsEditing = true;
                if(DEV) elm.value = PWD_DEBUG;
                else elm.value = '';
                elm.type = 'password';
            }
        })
        .onevent('focusout', ({oo, elm, value}) => {
            if(!value.length) {
                elm.ooIsEditing = false;
                elm.value = passwordDefault2;
                elm.type = 'text';
            } else {
                setButtonStyles();
                elm.ooIsEditing = true;
                if(value !== passwordInput.elm.value) {
                    oo.style({outlineStyle:'solid'});
                    addButton.elm.disabled = true;
                } else {
                    oo.style({outlineStyle:'none'});
                }
            }
        });

    const signinButton = oo('div')('button', 'Sign in').onclick(async ({oo:o})=> {
        const
            userName = userNameInput.elm.value,
            password = passwordInput.elm.value;

        if(userName === userNameDefault) {
            //console.log('refreh signing');
            await snatch.refreshSigninAsync();
            userNameInput.style({outlineStyle:'none'});
            return;
        }

        if(!await onSigninAsync({userName, password, oo, snatch})) {
            //console.log('callback not handled, so default handling');
            let result;
            try {
                result = await snatch.signInAsync({userName, password});
            } catch(e) {
                passwordInput.style({outlineStyle:'solid'});
                onSigninFailedAsync(e);
            }
        }
    });

    const addButton = oo('div')('button', 'Create new user').onclick(async ()=>{
        const
            userName = userNameInput.elm.value,
            password = passwordInput.elm.value,
            password2 = passwordInput2.elm.value;

        if(userName === userNameDefault) {
            userNameInput.style({outlineStyle:'solid'});
            return;
        }

        if(password !== password2) throw new Error(`password mismatch`);

        const result = await onAddAsync({userName, password, oo, snatch}).catch(console.error);
        if(!result) {
            // callback not handled, so default handling
            await snatch.addUserAsync({userName, password});
            await snatch.signInAsync({userName, password});
        }
    });

    //if(DEV) {
    //    oo('button', 'Refresh existing session (if it exists)').onclick(snatch.refreshSigninAsync);
    //}

    setButtonStyles();

    oo.x([
        function setSignin({text, show=true}) {
            signinButton.text(text);
            showSignin = show;
            setButtonStyles();
        },
        function setAdd({text, show=true}) {
            addButton.text(text);
            showAdd = show;
            setButtonStyles();
        },
        async function devSigninAsync() {
            if(!await snatch.hasUserAsync('user')) {
                await snatch.addUserAsync({userName:'user', password:PWD_DEBUG});
            }
            await snatch.signInAsync({userName:'user', password:PWD_DEBUG});
        }
    ]);
};


