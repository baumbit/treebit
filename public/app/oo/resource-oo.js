import OO from './oo.js';
import {createLufo} from './lufo.js';
/**
 * Since a response can be generated locally,
 * a "from" property is added to the response object:
 *      res.from === 'external'
 *      res.from === 'cache'
 *      res.from === 'store'
 */

const DEBUG = true;

const  // note: these constants are not exported, because API implementing should not always import this file.
    // GET                  no remote mutations intended and a resource external as a result
    SET = 'SET',        //  local and remote resource mutations may be intended and a resource expected as a result
    SEND = 'SEND',      //  remote mutations mutations, but No resource result expected
    DROP = 'DROP';      //  local removal of resource, maybe remote mutation and No resource result expected

function timeoutAsync(ms, cb, cb2) {
    return new Promise(res => {
        const clear = timeout(ms, async () => {
            await cb().catch(console.error);
            res();
        });
        if(cb2) cb2(clear);
    });
}

function timeout(ms, cb) {
    const id = OO.timeout(ms, cb);
    return () => {
        OO.timeout.clear(id);
    };
};

function createStoreValue($, path, value, defaultValue) {
    let v = $(path);                //console.log(path, value, defaultValue);

    if(Object.prototype.toString.call(defaultValue) === '[object Object]'
        && Object.prototype.toString.call(v) ===  '[object Object]') v = { ...defaultValue };
    else v = defaultValue;

    if(Object.prototype.toString.call(value) === '[object Object]'
        && Object.prototype.toString.call(v) ===  '[object Object]') v = { ...value };
    else v = value;

    return v;
}

export function createResource(resourceClient, isPollEnabled) {
    function buildPath(url, path, params) {                                             //console.log('---------->', ...arguments);
        if(!path) path = url.split('?')[0];
        if(path.indexOf(':') >= 0 || path.indexOf('?') >= 0) throw 'bad path. ' + path;
        if(params) {
            let delim = '?';
            for(let p in params) {
                path += delim + p + '=' + params[p]
                delim = '&';
            }
        }
        return path;
    }

    async function getResource(o, debugStack) {
        const
            {isAlive, url, path, ms, set, addPromise, cache, hash, save, $, isNotifyParent, allowNull, cb} = o,
            // TODO
            //     1. optmz by sending hash to server
            //        when server gets hash and hash differs it can send only the mutable fields if there are 
            //        immutable ones (mitable is: node.children immutable: node.card.data.prev)
            res = await resourceClient(url, undefined, cache).catch(console.error);
        //console.log('getResource', res.from, {res}, {cache});
        if(!res.error) {
            //if(!res.hasOwnProperty('origin')) res.origin = 'net';
            //console.log('----------->', path, res);
            try {
            //if(res.hasOwnProperty('data')) { // so that it can store undefined
                const data = res.data; //console.log({data});
                if(data === null && !allowNull) {
                    console.log('data is null, not allowed');
                    return;
                }
                //console.log(path, '------->', data, res);
                const reshash = OO.hashcode(JSON.stringify(data));  //console.log('getResource', reshash, hash, url);
                if(isAlive && reshash !== hash) {                   //console.log('### new hash');
                    o.hash = reshash;                    //console.log('resource set', res.data);
                    if(save) {                                         //    console.log('save resource', path, data);
                        //console.log('[resource-oo set]', path, 'was', JSON.stringify($(path)), 'setting', JSON.stringify(data), debugStack);
                        set(path, createStoreValue($, path, data), isNotifyParent);           //if(DEBUG) console.log('set', {path, data}); }
                    } else if(cb) { //console.log('resource-oo cb', path, $(path));
                        //console.error('resource-oo cb TODO remove double spamming on result @see treehut/user.js');
                        cb(res, o.oo);
                    }
                    else console.log('resource-oo muted', path, $(path)); // remove this 
                }                                                                           //else console.log('### old hash');
            } catch(e) {
                console.log(e, res, o, debugStack);
                throw e;
            }
            //} else if(cb){
            //    cb(res, o.oo, res);
            //}
        } else {
            if(cb) cb(res, o.oo);
            console.log('error:', res);
            throw new Error('resource client returned an error');
        }
        if(isAlive && ms && isPollEnabled) {
            // download resource automatically.
            // since it makes no sense for a continous polling
            // of the data allready stored in the cache, lets disable
            // the cache.
            o.cache.force = true;
            createTimerAsync(o, undefined, debugStack);
        }
    }

    function createTimerAsync(o, delayMs, debugStack) {
        // addPromise to make it possible to server-side render resourced loaded async.
        // note:    expected behaviour is for server to wait only for delayed (delayMs) promises,
        //          but should NOT wait for scheduled (o.ms) updates.
        // @see oo.resolvePromisesAsync
        const promise = timeoutAsync(delayMs || o.ms || 1, async () => {
            //console.log('getResource', {delayMs, o});
            await getResource(o, debugStack);
        })
        if(o.delayMs) o.addPromise(promise);
        return promise;
    }

    function resource(oo) {                                                          //console.log('resource', ...arguments);
        resourceAsync(...arguments);
        return oo;
    }

    function createCacheOptions(arg) {
        if(arg === true) return {force:false,expire:true};
        else if(arg === false) return {force:true,expire:true};
        else if(arg > 0) return {force:false,expire:arg};
        else if(arg <= 0) return {force:true,expire:false};
        else return arg; // already properly formated for resourceClient
    }

    async function resourceAsync({oo, $:{$, set}, addPromise}, url, isNotifyParent, options_cb, cb) {
        const debugStack = DEBUG ? (new Error()).stack : {};

        //console.log(...arguments);
        //console.trace();
        // XXX fetch from server and store response
        if(typeof isNotifyParent !== 'boolean') {
            cb = options_cb
            options_cb = isNotifyParent;
            //console.log(url, 'isNotifyParent was not a boolean', {cb, options_cb});
        }
        if(Object.prototype.toString.call(options_cb) !== '[object Object]') {
            cb = options_cb;
            options_cb = {force:true,save:true,cache:createCacheOptions(true)};
            //console.log(url, 'options_cb  was not an object', {cb, options_cb});
        }
        if(cb && Object.prototype.toString.call(cb) !== '[object Function]') {
            console.error('bad param cb. not a function', cb);
        }
        let {path,defaultValue,delayMs,ms,
            force,
            shake=false,
            save=true,          // save fetched result in store
            observe=true,       // observe store (i.e. register path expression listener)
            allowNull=false,    // default ia that stored or fetched results returning null, should not notify observers
            cache=createCacheOptions(true), 
            params
        } = options_cb;
        //if(DEBUG) console.log('resource', {url, path,defaultValue,delayMs,ms,force,shake,save,params});
        // value from cache will be used if its exists and deleted after 1000.
        //
        // this mechanism can be used to get content from oo.store,
        // and if content is not there fetch it from server.
        // it also has a simple garbage collection, which makes sure
        // that un-used content (i.e. that which have no observer)
        // will be deleted.
        // note that because of this self-cleaning this design depends
        // on data fetched from server, probably should be cached, to
        // reduce bandwidth load.
        //
        // every time the resource function is invoked, a new resource request
        // life-cycle object is created, which is unique and hence defined by
        // the options specified (such as delayMs and ms). howwever, while the request
        // is unique, if the same path is used for storing the resources, naturally
        // all store observers of this path will get this value. if this causes issues
        // the resource on the specified URL can be saved to a different path.
        // if the resource is downloading objects via a caching function, the mutations
        // might however spill (same object is used) over if the URL is not unique.
        //
        // if 'ms' is specified, updates the resource continously.
        //
        // example:
        //      url = 'canopy<api>/getcard<method>/asd123<id>?maxCountToTReturn=123'
        //      oo(Profile).res(url, ({name}, oo) => oo.setName(name), {name:'fetching from server...'});
        //
        // set default and then pull value from server

        path = buildPath(url, path, params);

        const currValue = $(path);                                    //console.log('-->', {currValue, url, path});
        if(!currValue && defaultValue) {                              //console.log('************'setting default value', defaultValue);
            set(path, createStoreValue($, path, undefined, defaultValue), isNotifyParent);
        }

        // this literal is used to keep track of the resource request,
        // throughout its life cycle.
        let o = {isAlive:true, url, path, ms, set, addPromise, cache, save, allowNull, $, isNotifyParent, cb, oo};

        if(delayMs || ms) await createTimerAsync(o, delayMs || 1, debugStack);
        else if(force || currValue === undefined) await getResource(o, debugStack).catch(console.error);

        //const args = [...arguments].slice(3); console.log(path, args);
        // using expressio instead of oo.on, because the store listener might
        // not be removed before oo.onDestroy is invoked and hence the shake
        // will fail with its intended purpose.
        let expression;
        if(observe && cb) {
            expression = oo.context.expression.exec('$'+path, (o, a) => {
                //console.log('from store', allowNull);
                if(o === null && !allowNull) return;
                //same format as when delivered from network
                const res = createResponseObject({data:o, error: false, from:'store', cacheOptions:cache});
                cb(res, oo);
            }, undefined, true);
        }

        oo.onDestroy(() => {                                           //console.log('destroy', url);
            // this depends on the on-listeners to be removed when oo is destroyed,
            // before onDestroy is invoked, because path is only removed if there are
            // no other listener attached.
            o.isAlive = false;
            if(expression) expression.remove();
            if(shake) $.shake(path);
            o = null; // just to make it clear for programmers whats going on here
        });                                                             //console.log('create', url, sync[url].count);
        return $(path);
    };

    async function dropResourceAsync({oo, $:{$, drop}, addPromise}, url, data, options_cb, cb) {
        // drop resource from store and inform server
        if(Object.prototype.toString.call(options_cb) === '[object Function]') {
            cb = options_cb;
            options_cb = null;
        }
        let {path, save=false, cache=createCacheOptions(false)} = options_cb || {};
        path = buildPath(url, path);
        drop(path);
        const promise = resourceClient(url, {DROP, data}, cache);
        addPromise(promise);
        const res = await promise;
        if(!res.error) {
            let result;
            if(res.hasOwnProperty('data')) result = res.data;
            else result = res;
            //L('SUCCESS', result);
            if(cb) cb(result, false);
        } else {
            ////console.log('error:', {url, path, res});
            if(cb) cb(res, true);
            throw new Error('resource client returned an error');
        }
        return res;
    }

    async function sendResourceAsync({oo, addPromise}, url, data, options_cb, cb) { //L();
        // XXX send to server but do NOT store anything locally in store
        if(Object.prototype.toString.call(options_cb) !== '[object Function]') {
            cb = options_cb;
            options_cb = null;
            //console.log(url, 'options_cb  was not an object', {cb, options_cb});
        }
        let {save=false, cache=createCacheOptions(false)} = options_cb || {};
        const promise = resourceClient(url, {SEND, data}, cache); //L(promise);
        addPromise(promise);
        const res = await promise;
        if(!res.error) {
            let result;
            if(res.hasOwnProperty('data')) result = res.data;
            else result = res;
            //L('SUCCESS', result);
            if(cb) cb(result, false);
        } else {
            console.log('error:', {url, res});
            if(cb) cb(res, true);
            throw new Error('resource client returned an error');
        }
        return res;
    }

    async function setResourceAsync({oo, $:{$, set}, addPromise}, url, data, isNotifyParent, options, cb){
        //console.log('setResourceAsync', ...arguments);
        // XXX set resource locally, then send to server then save response
        if(typeof isNotifyParent !== 'boolean') {
            cb = options;
            options = isNotifyParent;
        }
        let {path, wait, delayMs, defaultValue, save=true, cache=createCacheOptions(false), params} = options || {};
        path = buildPath(url, path, params);
        if(!wait) {          //console.log('setting default value', {data, defaultValue, save});
            const storeValue = createStoreValue($, path, data, defaultValue); //console.log({storeValue});
            set(path, storeValue, isNotifyParent);
        }
        let result;
        const promise = await timeoutAsync(delayMs || 1, async () => {      //console.log('--> setRes', url, cache);
            const res = await resourceClient(url, {SET, data}, cache);
            if(!res.error) {
                result = res.data;
                //console.log('->', path, result);
                if(res.hasOwnProperty('data') && save) set(path, createStoreValue($, path, result), isNotifyParent); //console.log('set', {path, result, isNotifyParent});
                if(cb) cb(result, false);
            } else {
                ////console.log('error:', {url, path, res});
                if(cb) cb(res.data, true);
                throw new Error('resource client returned an error');
            }
        })
        addPromise(promise);
        return result;
    }

    return {
        buildPath,
        resource,
        resourceAsync,
        setResourceAsync,
        sendResourceAsync,
        dropResourceAsync
    };
};

export function createResourceRouter() {
    // setup headless instance of OO and use as route handler.
    const ooRouter = OO(undefined, undefined, undefined, {renderVirtual:true});
    ooRouter.context.history = (function() { // overide default oo history
           return {
                onpopstate: () => {},
                replaceState: () => {},
                pushState: () => {},
                back: () => {}
            };
    })();
    const {route, go} = ooRouter; //console.log(go);

    function defaultRouteShim(next, done, props, params, data, hints) { //console.log('-');
        // when asking router to process a path, its possible to provide
        // it with a routeShim that will replace this default.
        // this provide means to pre-process requests before te route
        // handles it.
        // likely use-case it to provide a generic router that many
        // different OO instances uses, with a OO specific instance when
        // handling a route.
        // exampale of a routeShim that pre-pends oo to the list of arguments
        //      router(pathRequestedByClient, dataFromClient, function() {
        //          routeHandler({oo}, done, props, params, data);
        //      });
        next(done, props, params, data, hints);
    }
    function wrappedRoute(path, cb, routeOptions={}) {
        path = '/' + path; //console.log('router add route:', {path});
        if(!routeOptions.path) routeOptions.path = path;
        route(path, ({props, hints:{params, data, done, routeShim=defaultRouteShim}}) => {
            //console.log('routroutee -->', path, params, data);
            //if(params) {
            //console.log(props.url.pathname);
            //console.log(JSON.stringify(props.url.searchparams));
            //    console.log(JSON.stringify(props));
            //}
            //console.log('shimmming', {routeShim, cb, routeShim});
            routeShim(cb, function() {
                let error, data;
                if(arguments.length === 1) data = arguments[0];
                else if(arguments.length === 2) {
                    error = arguments[1];
                    data = arguments[0];
                }
                const parcel = {
                    data: data === undefined ? null : data,
                    error
                };
                done(parcel);
            }, props, params, data, routeOptions);

            ////cb(function() { //console.log(path, arguments.length);
            ////    let error, data;
            ////    if(arguments.length === 1) data = arguments[0];
            ////    else if(arguments.length === 2) {
            ////        error = arguments[1];
            ////        data = arguments[0];
            ////    }
            ////    const parcel = {
            ////        data: data === undefined ? null : data,
            ////        error
            ////    };
            ////    //console.log(path, parcel);
            ////    done(parcel);
            ////}, props, params, data);
        });
    };

    function parsePath(path) {
        const
            params = {},
            url = new URL('roouter://nohost' + path); //console.log({url});
        url.searchParams.forEach((v, k) => {
            if(Number.isFinite(v)) {
                if(v.indexOf('.') === -1) v = parseInt(v, 10);
                else v = parseFloat(v);
            }
            params[k] = v;
        });
        const pos = path.indexOf('?');          //console.log('1', path);
        if(pos >= 0) {
            path = path.substring(0, pos);      //console.log('2', path);
        }
        return {
            params,
            pathname: path
        };
    }

    async function router(path, data, routeShim) { //console.log('>--- router ---> ', {path, data}); console.trace();
        const {pathname, params} = parsePath(path); //console.log('router processing:', path);
        return new Promise(res => {
            const o = {params, data, done:res, routeShim};  //console.log('>--- go --->', pathname, o);
            go(pathname, null, o);
        });
    }

    return {
        router,
        addRoute: wrappedRoute,
        parsePath,
        go
    };
};


export function createResourceClient({snatch, cache, timeToLive, maxTimeToLive, baseResourcePath='/api/'}) {

    // this is the resourceClient that runs in browser enviroment
    if(cache === true) cache = createCache();

    function resourceClient(path, data, cacheOptions={}) { //, baseResourcePath='/api/') { console.log(...arguments);
        path = baseResourcePath + path; // resour
        if(!cacheOptions.path) cacheOptions.path = path;
        if(cacheOptions.expire === true) cacheOptions.expire = timeToLive;

        //// TODO add signatures
        return new Promise(async resolve => {            //console.log('resourceClient get', path, data);
            let parcel = cache ? cache.loadFromCache(cacheOptions) : undefined;
            if(parcel) { //console.log('from cache', {parcel});
                resolve(createResponseObject({...parcel, cacheOptions, from:'cache'}));
                return;
            }
            //parcel = await resourceClient.fetch(path, data).catch(console.error);
            //console.log('resourceClient postAsync', path, data);
            parcel = await snatch.postAsync(path, data).catch(console.error);
            // if parcel is bad, cache will clear
            if(cache) cache.saveToCache(cacheOptions, (parcel && !parcel.error) ? parcel : null);
            resolve(createResponseObject({...parcel, cacheOptions, from:'external'}));
        });
    }

    // TODO remove this when snatch is implemented
    //resourceClient.fetch = async function(path, data) {
    //    if(!baseUrl) console.error('ERROR: baseUrl not set');
    //    const url = baseUrl + path; //console.log('---->', url);
    //    const response = await fetch(url, {
    //        headers: {
    //            'Accept': 'application/json',
    //            'Content-Type': 'application/json'
    //        },
    //        method: "POST",
    //        body: JSON.stringify(data)
    //    });
    //    const parcel = await response.json(); //console.log('response from server', parcel);
    //    return parcel;
    //};

    //GURKresourceClient.setBaseUrl = function (url) {
    //    // location of resource api, likely something like this:
    //    //      http://localhost:9000/api/
    //    snatch.setBaseUrl(url);
    //};

    resourceClient.snatch = snatch;

    return resourceClient;
};

export function createResponseObject({data, error, from, cacheOptions}) {
    return {
        data,
        error,
        from,
        cacheOptions
    };
};

export function createCache() {
    const cacheLufo = createLufo({maxKeys:10, maxSize:0});

    function loadFromCache({path, force}) {
        if(force) {                                         console.log('force download (ignore cache)');
            return; // expiration not allowed
        }

        const o = cacheLufo.getValue(path);
        if(o) {
            if(o.expire < Date.now()) {
                cacheLufo.remove(path);                     console.log('expire cache', path);
            } else {                                        console.log('load from cache', path);
                return o.parcel;
            }
        }
    }

    function saveToCache({path, expire}, parcel) {
        if(expire >= 0 && parcel) {                         console.log('saving to cache', path, expire, parcel);
            cacheLufo.add(path, {expire: Date.now() + expire, parcel});
        } else {
            cacheLufo.remove(path);                         console.log('cache outdated', path);
        }
    }

    return {
        loadFromCache,
        saveToCache
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

