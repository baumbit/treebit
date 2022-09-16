//const consoleLog = console.log; console.log = function() { console.trace(...arguments); };

let DEBUG = false; // should be true during development to reduce bugs. should be false in production.
if(DEBUG) console.info('utils.js running in debug mode');

// ------------ ASYNC FRIENDLY
// itterating over async return values often result in
// hard to find bugs. there are some shims here
// that will notify where this is likely to be the case.
        // array.map
if(DEBUG) {
    ['map','forEach','every'].forEach(function(funcName) {
        const old = Array.prototype[funcName];
        Array.prototype[funcName] = function() {
            const f = arguments[0];
            arguments[0] = function() {
                const v = f.call(this, ...arguments);
                if(Object.prototype.toString.call(v) === '[object Promise]') {
                    //Promise.resolve(v).then(o => console.log('Promise resolved to:', o));
                    console.trace(`returns a promise. replace with array.${funcName}() with utils.${funcName}Async()`);
                }
                return v;
            };
            return old.call(this, ...arguments);
        };
    });
}

export async function everyAsync(arr, cb, self) {
    let r = true;
    for(let i = 0, b = true; b && i < arr.length; i++) {
        b = await cb(arr[i], i, arr, self);
        if(!b) r = false;
    }
    return r;
};

export async function mapAsync(arr=[], cb, self) {
    const r = [];
    for(let i = 0; i < arr.length; i++) {
        r.push(await cb(arr[i], i, arr, self));
    }
    return r;
};

export async function eachAsync(arr, options_cb, cb, destArr) {
    if(arr.push === undefined) { // super fast way of checking if its an array or object
        arr = Object.keys(arr).map(k => arr[k]);
    }
    //if(typeof Object.prototype.toString.call(options_cb).endsWith('Function]')) { // slower
    if(typeof cb !== 'function') {
        destArr = cb;
    }
    if(typeof options_cb === 'function') { // faster
        cb = options_cb;
        options_cb = {};
    }
    let {index=0, search, limit} = options_cb;
    if(!cb && !destArr) destArr = [];
    if(search) index = arr.indexOf(search);
    if(limit === undefined) limit = arr.length;
    //console.log('eachAsync', ...arguments, {index, limit, arr, cb, destArr});
    for(let i = index, elm, r; i < arr.length && limit > 0; i++) {
        elm = arr[i]; //L('eachAsync elm=', {elm, i});
        if(DEBUG) {
            if(Object.prototype.toString.call(elm) === '[object Promise]') {
                console.error(`a promise at position(${i})`, {elm, arr});
            }
        }
        if(cb) {
            if(destArr) {
                r = await cb(elm, destArr, i, arr.length);
            } else {
                r = await cb(elm, i, arr.length); //L({r});
            }
            if(r === false) break; // end
            if(r === undefined) continue; // do not count this element
            limit--;
            if(destArr && destArr.push) destArr.push(r); // push callback result to destArray
        } else if(destArr) {
            if(destArr.push) destArr.push(elm);
            limit--;
        }
    }
    return destArr;
};

export function arrDel(v, arr, key) {
    const i = arr.findIndex(o => {
        if(key === undefined) return o === v;
        else return o[key] === v;
    });
    if(i >= 0) arr.splice(i, 1);
};

 // ------------ CROSS PLATFORM FACADE
let nodejscrypto, subtle, btoa, atob;
    // libs
export function getNodeJsCrypto() { return nodejscrypto; };
export function getSubtle() { return subtle;            };
export function getBase64() { return { btoa, atob };    };
    // events
let addOnEvent;
export const
    EXIT_EVENT = 'EXIT_EVENT';
export function onPlatformEvent(s, f) { return addOnEvent(s, f); }; 

function nodeJsExitHandler() {
    const {on, notify} = createOnNotify(console.log);

    let isHandled;

    ['beforeExit','exit'].forEach(s => {
        process.on(s, async (event) => {
            //console.log('internal exit signal source', s, event);
            if(isHandled) return;
            isHandled = true;
            notify(EXIT_EVENT, event);
        });
    });

    // note: ABORT is intentionally not handled here.
    ['SIGTERM','SIGINT','SIGHUP','SIGQUIT'].forEach(s => {
        process.on(s, async (event) => {
            //console.log('external exit signal source', s, event);
            if(isHandled) return;
            isHandled = true;
            const hard = event === 'SIGINT'; // ctrl+c
            notify(EXIT_EVENT, {event, hard});
            process.exit(0);
        });
    });

    ['SIGUSR1','SIGUSR2','SIGPIPE','SIGBREAK','SIGWINCH'].forEach(s => {
        process.on(s, (event) => {
            console.log('TODO add event handling', s, event);
        });
    });

    return (f) => {
        return on(EXIT_EVENT, f);
    };
}

export function setupInNodeJs({crypto, Buffer, debug=false}) {
    DEBUG = debug;
    nodejscrypto = crypto;
    subtle = nodejscrypto.webcrypto.subtle;
    btoa = s => Buffer.from(s, 'binary').toString('base64');
    atob = base64 => Buffer.from(base64, 'base64').toString('binary');

    const addNodeJsExitListener = nodeJsExitHandler();
    addOnEvent = (eventName, f) => {
        if(eventName === EXIT_EVENT) {
           return  addNodeJsExitListener(f); // returns unsubscribe
        } else {
            throw new Error(`unsupported event(${eventName})`);
        }
    };                                                                      console.log('[utils.js] setting up in nodejs');
};

export function setupInBrowser() {
    subtle = window.crypto.subtle;
    btoa = s => window.btoa(s);
    atob = base64 => window.atob(base64);

    const addBrowserExitListener = browserExitHandler();
    addOnEvent = (eventName, f) => {
        if(eventName === EXIT_EVENT) {
            return addBrowserExitListener(f);
        } else {
            throw new Error(`unsupported event(${eventName})`);
        }
    };                                                                      console.log('setting up in browser', {subtle, btoa, atob});
};
function browserExitHandler() {

    const {on, notify} = createOnNotify(console.log);

    window.addEventListener("beforeunload", function (e) {
        notify(EXIT_EVENT, e);
        if(browserExitHandler.warn === undefined || browserExitHandler.warn) {
            var confirmationMessage = "\o/";
            (e || window.event).returnValue = confirmationMessage;
            return confirmationMessage;
        }
    });

    return (f) => {
        return on(EXIT_EVENT, f);
    };
}
export function setBrowserExitWarn(b) {
    browserExitHandler.warn = b;
};
try {
    if(window) {
        setupInBrowser();
    }
} catch(e) {
    // setupInNodeJs should be called explicitly because it depend on imports
}


// ------------  TOOLS
export function isLessThan(a, b) {
    if(a === null || b === null || a === undefined || b === undefined) console.error('not a number', {a, b});
    return (b < a) ? 1 : ((b > a) ? -1 : 0);
};

export function isGreaterThan(a, b) {
    if(a === null || b === null || a === undefined || b === undefined) console.error('not a number', {a, b});
    return (b > a) ? 1 : ((b < a) ? -1 : 0);
};

export function copyToClipboard(s, cb=()=>{}) {
    navigator.clipboard.writeText(s).then(cb)
};

export function getFromClipboard(oo) {
    oo = oo('input').style({position:'fixed', opacity: 0, top: 0, left: 0});
    oo.elm.focus();
    document.execCommand("paste");
    const s = oo.elm.value;
    oo.destroy();
    return s;
};

//export function paste
//    const elm = document.createElement('input');
//    elm.innerHTML = s;
// 
//    navigator.clipboard.readText().then(text => {
//        document.getElementById("displayText").innerHTML = text;
//    })
//
//    let myInput = document.querySelector("input");
//
//        //Use the clipboard's writeText method to pass the inputs text to the clipboard
//        function readClipBoardText(){
//        navigator.clipboard.readText().then(text=>{
//            document.getElementById("displayText").innerHTML = text;
//        })
//    }
//}

export function createUid(debugTag) {
    // TODO 
    return debugTag + '-' + Date.now().toString().substring(9) + '-' +Math.random().toString().substring(2, 6);
};

export function createOrl(url, isProtocolMissing) { //console.log({url, isProtocolMissing});
    if(typeof url === 'string') {
        isProtocolMissing = url.indexOf(':') === -1;
        if(isProtocolMissing) url = 'https://' + url; // protocol required to not throw error
        url = new URL(url);
        if(isProtocolMissing) url.protocol = 'foo';
    }
    const
        segs = url.hostname.split('.'),
        isOnion = segs.length === 2 && segs[1] === 'onion';
    const orl = {
        href: url.href,
        host: url.host,
        port: url.port,
        hostname: url.hostname,
        pathname: url.pathname,
        search: url.search,
        searchParams: url.searchParams,
        hash: url.hash,
        origin: isOnion ? url.host : url.origin,
        protocol: isOnion ? null : url.protocol,
        isOnion,
        isClearnet: !isOnion
    };
    orl.href = `${orl.origin}${orl.pathname}${orl.search}${orl.hash}`;
    return orl;
};

export function friendlyDate(ms) { // TODO refactor to a utils
    const d = ms ? new Date(ms) : new Date();
    const
        [month, date, year] = d.toLocaleDateString("en-US").split("/"),
        [hour, minute, second] = d.toLocaleTimeString("en-US").split(/:| /);
    return year + '-' + month + '-' + date;
//console.log({month, date, year});
//console.log({hour, minute, second});
};

export function isZero(v) {
    return !(v > 0);
};

export function isTrue(v='') {
    try {
        v = v.toLowerCase();
        return v.indexOf('true') >= 0 || !!JSON.parse(v);
    } catch(e) {
        return false;
    }
};

export function clone(o, defaultO={}) { //console.log('cloning', o);
    return {...(JSON.parse(JSON.stringify(o || defaultO)))};
};

export function sizeOfObject(o) {
    const data = JSON.stringify(o);
    let size;
    try {
        // fast, but does not work on inflated objects and does not work on nodejs
        const blob = new Blob([data]);
        size = blob.size;                 //console.log('getSize data', data, size);
    } catch(e) {
        // slower, but works on inflated objects and on nodejs
        size = roughSizeOfObject(data);
    }
    return size;
};

export function roughSizeOfObject(object) {
    // TODO verify that it works (copied from internet!)
    var objectList = [];
    var stack = [ object ];
    var bytes = 0;
    while ( stack.length ) {
        var value = stack.pop();

        if ( typeof value === 'boolean' ) {
            bytes += 4;
        }
        else if ( typeof value === 'string' ) {
            bytes += value.length * 2;
        }
        else if ( typeof value === 'number' ) {
            bytes += 8;
        }
        else if
        (
            typeof value === 'object'
            && objectList.indexOf( value ) === -1
        )
        {
            objectList.push( value );

            for( var i in value ) {
                stack.push( value[ i ] );
            }
        }
    }
    return bytes;
};

export function copyProps(src, dest, options={}) { //console.log('dest size:', sizeOfObject(dest));
    if(options.maxSize > 0) {
        const size = sizeOfObject(src);
        if(size > options.maxSize) throw new Error(`bad size(${size}. max allowed(${options.maxSize})`);
    }
    Object.keys(src).forEach(key => {
        if(options.isForce || dest.hasOwnProperty(key)) {
            if(typeof src[key] === typeof dest[key]) {
                dest[key] = src[key];
            } else {
                throw new Error(`key mismatch expected(${typeof dest[key]}) but got(${typeof src[key]})`);
            }
        }
    });
};

export function toArr(o={}, arr=[]) {
    for(let p in o) {
        if(o.hasOwnProperty(p)) {
            //console.log('found', p, o);
            arr.push(o[p]);
        };
    }
    return arr;
};

export function getDocumentCookie(name, isValue=true) {   //console.log('getDocumentCookie', document.cookie);
    name += '=';
    const cookies = decodeURIComponent(document.cookie).split('; ');
    for(let i = 0, s; i < cookies.length; i++) {
        s = cookies[i];
        if(s.startsWith('__')) {
            s = (s.split('__')[1]).split('-')[1]; //console.log('cookie prefixed', s);
        }
        if(s.startsWith(name)) {
            if(isValue) {
                s = s.split('=')[1];    //console.log('getRequestCookie parsed', {name, cookies, s});
            } else {
                return cookies[i];
            }
            return s;
        }
    }
};

export function deleteDocumentCookie(name) {
   document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT';
};

export function getParamsFromUrl(url, params={}) {
    if(url.startsWith('/')) url = 'http://oo.oo' + url;
    url = new URL(url);
    url.searchParams.forEach((v, k) => {
        if(Number.isFinite(v)) {
            if(v.indexOf('.') === -1) v = parseInt(v, 10);
            else v = parseFloat(v);
        }
        params[k] = v; //console.log({v, url});
    });
    return params;
}

export function createOnNotify(log) {

    let listeners = [];

    function on(event, l) {
        if(!listeners[event]) listeners[event] = [];
        listeners[event].push(l);
        return () => { // remove listener
            const i = listeners[event].findIndex(l => l === l);
            if(i >= 0) listeners[event].splice(i, 1);
        };
    }

    function notify(event, data, cb) { //log?.('notify', event, data, listeners[event]);
        if(listeners[event]) listeners[event].forEach(l => l(data, cb));
    }

    async function notifyAsync(event, data, cb) { //log?.('notify', event, data, listeners[event]);
        if(listeners[event]) {
            await eachAsync(listeners[event], async (l) => {
                await l(data, cb);
            });
        }
    }

    return {
        on,
        notify,
        notifyAsync
    };
};

export function createLog(name, level=0/* lowest level to log normal */) {
    const n = name;
    const log = function() {
        const tag = `[${n}] `;
        if(typeof arguments[0] === 'string' && arguments[0].startsWith('#')) {
            let s = '%c' + tag,
                arr = [];
            for(let i = 1; i < arguments.length; i++) {
                let o = arguments[i];
                if(typeof o === 'string') s += o;
                else arr.push(o); 
            }
            console.log(s, 'color: ' + arguments[0], ...arr);
        } else {
            console.log(tag, ...arguments);
        }
    };
    log.n = function()  {
        //console.trace();
        if(arguments[0] >= level) log(...Array.from(arguments).slice(1));
    };
    log.w = function()  { console.warn(n, ...arguments); };
    log.e = function()  { console.error(n, ...arguments); };
    log.c = function(e) { console.error(e.message, e.stack, n, {e}); };
    log.log = (name, level) => {
        return createLog(n + ' - ' + name, level);
    };
    return log;
};

