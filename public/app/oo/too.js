const OO = function(rootElement, store={}, context={}, ooptions={}, pAArent) { //console.log('OO');
    // if a rootElement is specified (either as HTML ), OO will append to it.
    // if no rootElement is specified OO will try to 
    //
    //
    // but there are HTML element matching the refs supplied those will be used.
    // if there is no rootElement and no matching HTML elements
    if(arguments.length === 1) {
        if(typeof rootElement === 'object') {
            if(!rootElement.toString().endsWith('Element]')) {
                // running OO headless
                ooptions = rootElement;
            }
        }
    }

    const DEBUG = ooptions.debug, // general
          //DEBUG_VDOM = ooptions.debugVirtualDom,
          DEBUG_ROUTE = ooptions.debugRoute,
          DEBUG_EXPRESSION = ooptions.debugExpressions;
    /*
     *                     ?
     *                  OO
     *                -____-
     *
     * Purpose of this function is to limit bloat,
     * boilerplate, memory footprint and third-party dependencies.
     * This achieved by extensive use of scope, currying and
     * taking a non-modularized approach; packaging DOM, route and
     * model into a dense single function.
     */
    if(!pAArent) {
        //if(ooptions) console.log('[OO] ooptions=', ooptions);
        // shim prima

        // setup OO
        context = {
            //rootRef: 'r' + (DEBUG > 0 ? '' : Date.now() + Math.random()), // used for client-side plugin to server side rendering
            //rootRef: 'r' + Math.random(),
            rootRef: ooptions?.refPrefix || 'r',
            store: {$:{}},
            oos: {},
            ooFunction: ooptions?.ooFunction || {},
            globalProps: ooptions?.globalProps || {},
            globalPromises: [],
            ...context // presumably re-inflating a deflated context
        };
        // default ooptions used internally in oo
        if(ooptions.routerBasename === undefined) ooptions.routerBasename = '';
        if(ooptions.renderVirtual === undefined) ooptions.renderVirtual = false;
        context.ooptions = ooptions;
        if(DEBUG > 0) {
            OO.debug(context, DEBUG);
        }

        // UTILS & HELPERS
        if(!OO.count) OO.count = 0;
        OO.count++;
        context.tooString = (f, print) => {
            const keys = Object.keys(f).sort();
            const s = f.ref + (f.isDestroyed ? ' -[ destroyed ]- ' : ' - ') + f.elementName; if(print) console.log(s, {keys});
            return s;
        };
        context.destroyListeners = [];
        context.destroyAsync = async (cb) => {
            if(cb) context.onDestroy(cb);
            const rootF = context.oos[context.rootRef];
            if(rootF) rootF.destroy();
            return context.resolvePromisesAsync(async () => {
                OO.count--;
                for(let i = 0, l; i < context.destroyListeners.length; i++) {
                    l = context.destroyListeners[i];
                    await l({count: OO.count});
                    ////.forEach(async (l) => await l);
                }
            });
        };
        context.onDestroy = (cb) => {
            context.destroyListeners.push(cb);
        };
        context.resolvePromisesAsync = (cb) => {
            return Promise.all(context.globalPromises).then(() => { //console.log('done', context.globalPromises);
                context.globalPromises = [];
            }).then(cb);
        };
        context.addPromise = (promise) => {
            context.globalPromises.push(promise);
            return promise;
        };
        context.hasUnresolved = () => context.globalPromises.length > 1;
        context.timer = function(oo, ms, options_cb, cb) { //L(...arguments);
            const ARGS = arguments;
            if(context.isFunction(options_cb)) {
                cb = options_cb;
                options_cb = {}
            }
            let {
                interval=false,    // if true timer becomes an interval if false it becomes a timeout
                promise=false, // if true the timer returns a promise and can be
                destroy=true  // if false, the timer is removed when oo is destroyed
            } = options_cb;//L({destroy});
            let resolve;//;,reject
            if(promise) { //T();
                promise = oo.addPromise(new Promise((res/*, rej*/) => {
                    resolve = res;
                    //reject = rej
                }));
            }
            const clear = () => {
                if(id !== null) {
                    if(interval) {
                        OO.interval.clear(id);
                        context.timer.countInterval--;
                    } else {
                        OO.timeout.clear(id);
                        context.timer.countTimeout--;
                    }
                    id = null;
                    if(destroy) { //console.log(context.timer.debugCount, 'removing timer', f.elm);
                        context.removeFromOnRemoved(oo, clear);
                    }
                    //else console.log(context.timer.debugCount, 'timer NOT removed', f.elm);
                    if(promise) resolve(oo);
                }
            };
            if(destroy) oo.onRemoved.push(clear);
            let id;
            if(interval) {
                context.timer.countInterval++;
                let count = 1;
                id = OO.interval(ms, () => {
                    //console.log({count, interval});
                    if(interval === true) {
                        cb({oo});
                        return;
                    }
                    cb({oo, count, interval, delta: interval - count});
                    count++;
                    if(count <= interval) return;
                    clear();
                });
            } else {
                context.timer.countTimeout++;
                id = OO.timeout(ms, () => {
                    cb({oo});
                    clear();
                });
            }
            return promise || clear;
        };
        context.timer.countInterval = 0;
        context.timer.countTimeout = 0;
        // TODO
        // create a priority queue of tasks
        //context.addTask = function(oo, options_cb, cb) {
        //    if(Object.prototype.toString.call(options_cb) === '[object Function]') {
        //        cb = options_cb;
        //        options_cb = {}
        //    }
        //    let {
        //        delay=0,
        //        ms=0,
        //    } = options_cb;
        //};

        context.parseTug = (o, isTag, excludes=['props']) => {
            if(!o) return;
            for(let p in o) { // TODO make props rserver key word for Tug
                let isCapital = isTag || p[0] !== p[0].toLowerCase();
                if(isCapital && o.hasOwnProperty(p) && !excludes.includes(p)) { //console.log('parsing', p, o);
                    let t = o[p];
                    if(isTag || (!isTag && typeof t !== 'string')) {
                        return o[p];
                    }
                }
            }
        };
        //context.isFalsy = (v) => {
        //    switch(v) { case false: case 0: case -0: case '': case null: case undefined: case NaN: return true; }
        //};
        context.eachProp = (o, cb, excludeProp) => {
            for(let p in o) {
                if(o.hasOwnProperty(p) && p !== excludeProp) {
                    cb(o[p], p, o);
                }
            }
        };
        context.toArray = (obj, prop, arr=[]) => {
            //console.log(obj, prop);
            context.eachProp(obj, o => arr.push(prop ? o[prop] : o));
            return arr;
        };
        context.each = (obj_arr, prop_cb, cb) => {
            if(!cb) {
                cb = prop_cb;
            }
            //console.log('each', obj_arr, prop_cb, Object.prototype.toString.call(obj_arr));
            if(Object.prototype.toString.call(obj_arr) === '[object Array]') {
                OO.swipe(cb, f, x, y, speed);
                return f;
            };

            //context.shimMethod(f, 'onclick', elm);
            //context.shimMethod(f, 'oninput', elm, ({cb, args}) => {
            //    return cb(elm.input, f, ...args);
            //});
            //context.shimEvent(f, 'focusout', elm);
            //context.shimEvent(f, 'blur', elm);
            //context.shimMethod(f, 'onmouseover', elm)
            //context.shimMethod(f, 'onmouseout', elm)
                // element augmentation methods
            f.css = f.stylesheet = (css, name) => {
                if(!name) {
                    name = f.elementName;
                }
                if(css.indexOf('{') === -1) {
                    if(!name) throw 'missing a Tug name.';
                    css = name + ' { ' + css + ' }';
                }
                context.stylesheet(css, name);
            };
            f.destroy = () => {
                /*if(!f.isDestroyed)*/ context.remove(f);
            };
            f.clear = () => {
                const arr = f.ooo.children.slice(0);
                arr.forEach(ref => context.removeRef(ref));
                return f;
            };
            f.createCue = context.createCue;
            f.transition = (run, end) => { //console.log(f.elm, run, end);
                //if(className) f.elm.classList.add(className);
                if(run) {
                    f.elm.addEventListener('transitionrun', event => { //console.log('transitionrun', event);
                        run(f, event);
                    }, {once: true});
                }
                if(end) {
                    f.elm.addEventListener('transitionend', event => { //console.log('transitionend', event);
                        //if(className) f.elm.classList.remove(className);
                        end(f, event);
                    }, {once: true});
                }
                return f;
            };
            f.go = context.router.go;
            f.route = function() {
                context.router.route(null, ...arguments)
                return f;
            };
            f.resolvePromisesAsync = context.resolvePromisesAsync;
            f.addPromise = context.addPromise;
            f.hasUnresolved = context.hasUnresolved;
            f.timer = function() { return context.timer(f, ...arguments); };
                        // store
            f.storekeeper = context.storekeeper;
            f.store = context.createStoreListener;
            f.$  = context.storekeeper.$;
            f.on = (pathCbObj, arg1, arg2, arg3) => { //console.log({path, arg1, arg2, arg3});
                let path;
                // --- prepare for replaceable expressions --
                let isReturnObj = false;
                const isReplaceableExp = context.isFunction(pathCbObj);
                if(isReplaceableExp) {
                    let replaceableExp;
                    pathCbObj(function(path, arg1, arg2, arg3) {
                        if(replaceableExp) {
                            // expressions will be added to life cycle, but since it will be removed next step anyway,
                            // remove it manually now so at to not spam the onRemoved array.
                            context.removeFromOnRemoved(f, replaceableExp.remove);
                            // remove expression listener, because we will create a new one to replace the old one
                            replaceableExp.remove();
                        }
                        replaceableExp = f.on({path}, arg1, arg2, arg3).expression;
                        //console.log(path, f.onRemoved.length);
                    });
                    return f;
                } else if(Object.prototype.toString.call(pathCbObj) === '[object Object]'){
                    isReturnObj = true;
                    path = pathCbObj.path;
                } else {
                    path = pathCbObj;
                }

                // --- create expression based on ---
                if(!path.startsWith('$') && !path.startsWith('@')) {
                    path = '$' + path;
                }

                let mode, tagTug, props, cb, t;
                if(arg3) {                                          //console.log("path, ''{}, TrueFalse, Cb", path);
                    t = Object.prototype.toString.call(arg1);
                    tagTug = arg1;                                  //console.log({tagTug});
                    mode = arg2;
                    cb = arg3;
                } else if(arg2) {                                   //console.log("// path, TrueFalse''{}, Cb", path);
                    t = Object.prototype.toString.call(arg1);       //console.log('t='+t);
                    if(t === '[object Boolean]') {
                        mode = arg1;
                    } else {
                        tagTug = arg1;                              //console.log({tagTug});
                    }
                    cb = arg2;
                } else if(arg1) {                                   //console.log("// path, Cb", path);
                    cb = arg1;
                }

                let when;
                if(tagTug && t === '[object Object]') {
                    if(tagTug.hasOwnProperty('when')) { // hasOwnProperty needed, because when can be "undefined" 
                        when = context.createWhen(tagTug.when);
                    }
                    props = tagTug.props;
                    tagTug = context.parseTug(tagTug, true, ['when', 'props']);
                }

                let isPreferValue, is$;
                if(mode === true) {
                    isPreferValue = true;
                    is$ = true; // cb arg1 should be metadata
                } else if(mode === false) {
                    isPreferValue = false; // cb arg1 should be obj no matter what is stored
                } else { // undefined
                    isPreferValue = true; // most common use-case, arg1 should be obj/val depending on what is stored
                }

                let F = f,
                    lastV = {}; // init as obj, because value undefined (used in when) will not match and obj will pass through
                const exp = context.expression.exec(path, v => { //console.log({path, v});
                    // objects should always propagate,
                    // so that if parent is told to be notified
                    // that object will be propagated.
                    if(lastV === v && typeof v !== 'object') return;
                    lastV = v;

                    //console.log({path, arg1, arg2, arg3, v});
                    //console.log({path, tagTug, props, isPreferValue, is$});
                    const b = !when || when.is(v);
                    if(!b) return;
                    if(when) {
                        v = when.transform(v);
                        if(typeof v === 'object') {
                            const parsedTug = context.parseTug(v, true, ['when', 'props']);
                            if(parsedTug) {
                                props = v.props;
                                tagTug = parsedTug;
                            }
                        }
                    }

                    if(tagTug) {    //console.log('tagTUg', tagTug);
                        f.clear();
                        //if(F) F.destroy(); // when specifying tagTug, replace all children of f.
                        if(props) { //console.log('tagTug=', tagTug);
                            F = f(tagTug, props); // Tug
                        } else {
                            F = f(tagTug); // tag
                        }
                    }
                    //console.log('hello', F.$);
                    return cb && cb(v, F, F.$, debugTag);
                }, undefined, isPreferValue, is$, !!when/*, debugTag*/); // expressionlistener
                if(exp.isExpression) {
                    f.onRemoved.push(exp.remove);
                }

                if(isReturnObj) {
                    return {
                        path,
                        oo: f,
                        expression: exp.isExpression ? exp : null
                    };
                }
                return f;
            };
            f.xx = (name) => { // TODO if this is used a lot, add expressions
                const arr = []; // instead of check
                if(!f[name]) {
                    f[name] = (cb, cbOwner) => {
                        arr.push(cb);
                        if(!cbOwner) {
                            cbOwner = parentF;
                        }
                        if(DEBUG) console.log('no cb owner specified, so defaulting to parent. elementName=', cbOwner.elementName);
                        cbOwner.onRemoved.push(() => {
                            const i = arr.findIndex(o => o === cb);
                            if(i >= 0) arr.splice(i, 1);
                        });
                        return f;
                    };
                } else {
                    throw 'function exists. name=' + name;
                }
                return function() { //console.log(arr);
                    if(arr.length === 1) return arr[0](...arguments); // when there is only one listener, a result can be returned
                    else for(let i = 0; i < arr.length; i++) arr[i](...arguments);   //arr.forEach(cb => cb(...arguments));
                };
            };
            f.x = f.expose = function(mode_name, cbowner_name, cb) { // TODO possibly deprecate f.x in favour of f.xx
                if(Object.prototype.toString.call(mode_name) === '[object Array]') {
                    mode_name.forEach(f.expose);
                    return f;
                }
                if(typeof mode_name === 'string' && arguments.length === 1) {
                    // add callback
                    return f.xx(mode_name);
                }

                let name = cbowner_name;
                if(context.isFunction(mode_name)) {
                    cb = mode_name;
                    name = mode_name.name;
                } else if(!cb) {
                    cb = name;
                    name = mode_name;
                }
                if(!f[name]) {
                    f[name] = function() {
                        if(DEBUG > 2) {
                            console.log('expose', name, 'on', f.debugId);
                        }
                        const exp = context.expression.exec(arguments[0], v => cb(v, f)); // expressionlistener
                        if(exp.isExpression) {
                            f.onRemoved.push(exp.remove);
                        } else {
                            const r = cb(...arguments, f);
                            if(r !== undefined) return r;
                        }
                        return f;
                    };
                    if(mode_name === 'default') {
                        if(f.defaultExpose) {
                            throw 'default function exists. name='+name;
                        }
                        f.defaultExpose = f[name];
                    }
                } else {
                    throw 'function exists. name=' + name;
                }
                return f;
            };
            f.props = (props={}) => {
                f.style(props.style);
                f.className(props.className);
                return f;
            };
            f.props(props);
            f.getProps = () => props;

            for(let p in context.ooFunction) {
                if(f[p] && !context.ooFunction.override) {
                    throw 'default oo.functions must be be explicitly overriden. name=' + p;
                }
                f[p] = function() {
                    return context.ooFunction[p](f, ...arguments);
                };
            }

            let tugReturnValue;
            if(isFunction) {
                tugReturnValue = Tug(f, props);
            }

            // EXPRESSION
            if(x_prop_str) { //console.log({x_prop_str});
                context.expressionfy(f, x_prop_str, null, (v, funcName, exp={isExpression:true}) => { // expressionlistener
                    //console.log(x_prop_str, {v, funcName, exp});
                    if(funcName) {
                        f[funcName](v, f); // '@icecream eat $color/blue ice.'
                    } else if(f.defaultExpose) {
                        f.defaultExpose(v, f); // 'eat $color/blue ice.'
                    } else if(exp.isExpression) {
                        f.escape(v);
                    } else {
                        f.noescape(v);
                    }
                }, undefined, undefined, true);
            }

            if(DEBUG > 0 && !context.oos[ref]) throw 'missing oo in oos. ref='+ref;
            if(tugReturnValue !== undefined) return tugReturnValue; // break the chains
            /*if(DEBUG > 0) TODO remove comment*/ f.toString = () => context.tooString(f);
            /*if(DEBUG > 0) TODO remove comment*/ f.i = () => context.tooString(f, true);

            if(parentF && parentF.onchild) parentF.onchild(f);

            return f;
        };
        //console.log('end of OO init (rootElement)');
        if(OO.isNodeJs) {
            // TODO console.log('Created OO in NodeJS. TODO should we do something special?');
        }
        if(typeof rootElement === 'string') {
            rootElement = context.getDomElementById(rootElement); //console.log('rootElement was a string', {rootElement});
            if(!rootElement) {
                throw 'missing rootElement';
            }
        } else if(!rootElement) {
            // no target rootElement provided to append to,
            // which implies OO should try to attach itself to existing
            // (likely) server-side rendered HTML.
            //rootElement = context.dokument.querySelector('[ref="r/0"]');
        }
        return context.OO(pAArent, 'oo', undefined, undefined, true);
    }
    if(!context) {
        throw 'missing context. rootElement='+rootElement;
    }
    return (Tug, x_prop_str, props, debugTag) => context.OO(pAArent, Tug, x_prop_str, props, debugTag);
};
OO.extend = (name_func, obj_func) => { //console.log({name_func, obj_func});
    let name;
    if(typeof name_func === 'string') {
        name = name_func;
    } else {
        name = name_func.name;
        obj_func = name_func;
    }
    if(OO[name]) {
        throw 'OO extension exists. name='+name;
    } else {
        console.log('[OO] extending ', name);
        return OO[name] = obj_func;
    }
};
OO.debug = function(context, DEBUG) {
    context.debug = {};

    const map = {},
          logs = [],
          contexts = [];

    function get(type) {
        let o = map[type];
        if(!o) {
            o = { allocate: 0, release: 0 };
            map[type] = o;
        }
        return o;
    }

    function log(s) {
        logs.push('[' + new Date() + '] ' + s);
    }

    context.debug.watch = (isAbortLoop) => {
        console.log('-- Debug Watch --');
        contexts.forEach((o, i) => {
            let a, b;
            console.log('\tcontext '+ (i+1) + ' / ' + contexts.length);
            console.log('\t\trootRef: ' + o.rootRef);
            a = Object.keys(o.oos).length;
            console.log('\t\tOOS keys: ' + a);
            console.log('\tStore: ', o.store);
        });
        console.log('\ttotal:');
        for(let p in map) {
            if(map.hasOwnProperty(p)) {
                console.log('\t\t' + p + '\t\tallocate: ' + map[p].allocate + '\t\trelease: ' + map[p].release);
            }
        }
        if(!isAbortLoop) {
            OO.timeout(1000 * 60, context.debug.watch);
        }
    }

    context.debug.allocate = (type) => {
        get(type).allocate++;
        log('allocate ' + type);
    };

    context.debug.release = (type) => {
        get(type).release++;
        log('release ' + type);
    };

    if(DEBUG > 5) OO.timeout(1, context.debug.watch);

};

// use this to track memory leaks more easily
OO.timeout = function(ms, cb) { OO.timeout.count++; return setTimeout(() => {
    OO.timeout.count--; // will become less then 0 if dead timeouts are cleared
    cb();
}, ms); };
OO.timeout.clear = function(id) { OO.timeout.count--; clearTimeout(id); };
OO.timeout.count = 0;
OO.interval = function(ms, cb) { OO.interval.count++; return setInterval(cb, ms); };
OO.interval.clear = function(id) { OO.interval.count--; clearInterval(id); };
OO.interval.count = 0;

OO.isNodeJs = typeof process === 'object';
OO.isBrowser = !OO.isNodeJs;
OO.isSafari = OO.isBrowser && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
OO.isChrome = OO.isBrowser && /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

OO.swipe = function(cb/*y, flingSpeed*/, oo, xController, yController, {dragThresholdX=3, dragThresholdY=3, speedFactor=10}) {
    //console.log(...arguments);
    let dataY = {}, dataX = {}, isSwiping = false;//startY, prevY, distanceY, time;
    let elm = oo.elm,
        downSet = (o, screen) => {
            o.fling = false;
            o.prev = screen;
            o.start = o.prev;
            o.distance = 0;
            o.time = Date.now();
            o.begin = true;
            o.end = false;
            o.move = false;
        },
        down = (event) => {
            if(isSwiping) throw new Error('bad state. already swiping');
            if(oo.isDestroyed) return;
            isSwiping = true;
            if(xController) downSet(dataX, event.screenX);
            if(yController) downSet(dataY, event.screenY);
        },
        moveSet = (o, screen, dragThreshold) => {
            if(o.distance < 0 && screen > o.prev) {
                o.distance = 0;
                o.time = Date.now();
            }
            else if(o.distance > 0 && screen < o.prev) {
                o.distance = 0;
                o.time = Date.now();
            }
            const delta = o.prev - screen;
            if(screen > o.prev) o.distance += Math.abs(delta);
            else o.distance -= Math.abs(delta);
            o.prev = screen;
            o.fling = false;
            o.delta = delta*-1;
            o.screen = screen;
            o.drag = Math.abs(o.distance) > dragThreshold;
            if(o.move) o.begin = false;
            o.move = true;
        },
        move = (event) => {
            if(!isSwiping) return;
            if(oo.isDestroyed) return;
            if(xController) moveSet(dataX, event.screenX, dragThresholdX);
            if(yController) moveSet(dataY, event.screenY, dragThresholdY);
            cb(dataX, dataY);
        },
        upSet = (o, screen, dragThreshold) => {
            o.time = Date.now() - o.time; //console.log(time);
            const speed = (Math.abs(o.distance) / o.time) * speedFactor; //console.log({time, speed});
            o.drag = false;
            o.fling = Math.abs(o.distance) > dragThreshold; //console.log(o.distance, dragThreshold)
            o.delta = 0;
            o.distance = Math.floor(o.distance * speed);
            o.move = false;
            o.end = true;
        },
        up = (event) => {                                                                   //console.log(event);
            if(!isSwiping) return;
            if(oo.isDestroyed) return;
            isSwiping = false;
            if(xController) upSet(dataX, event.screenX, dragThresholdX);
            if(yController) upSet(dataY, event.screenY, dragThresholdY); //console.log({dataY});
            //dataY.inversedDistance = dataY.distance*-1;
            //dataX.inversedDistance = dataX.distance*-1;
            cb(dataX, dataY);
        };

    oo.elm.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    oo.elm.addEventListener('mouseleave', up);
    let destroy = () => {
        elm.removeEventListener('mousedown', down, false);
        elm.removeEventListener('mousemove', move, false);
        elm.removeEventListener('mouseup', up, false);
        elm.removeEventListener('mouseleave', up, false);
    };

    oo.onDestroy(() => {
        if(destroy) {
            destroy();
            destroy = null;
        }
    });

    return destroy;
};

OO.scroll = (function(curr) {
    // when mouse enters a element, the scrolling event will be sent to the oo scroll handler for that element

    function scroll(event) {
        if(curr) {
            if(curr.cb(event) !== false) {
                event.preventDefault();
            }
        }
    }

    if(!OO.isNodeJs) {
        //const windowOnWheel = window.onwheel;
        window.addEventListener('mousewheel', event => scroll(event), {passive:false});
        //window.onwheel = (event) => scroll(event);
    }

    function add(cb, oo) {
        let
            elm = oo.elm,
            handler = (/*event*/) => {
                if(oo.isDestroyed) return;
                //if(o.preventDefault) event.preventDefault();
                curr = o; //console.log('scroll now owned by', oo);
            };

        elm.addEventListener('mouseenter', handler, false);

        let o = {
            cb,
            destroy: () => {  //console.log('destroy scroll listener', o.oo);
                elm.removeEventListener('mouseenter', handler, false);
                if(curr === o) curr = null;
                o = null;
                elm = null;
                handler = null;
            }
        };

        oo.onDestroy(() => {
            if(o) o.destroy();
        });

        return o;
    }

    return add;
})();

// https://stackoverflow.com/questions/194846/is-there-any-kind-of-hash-code-function-in-javascript#8076436
OO.hashcode = function(s) {
    var hash = 0;
    for (var i = 0; i < s.length; i++) {
        var character = s.charCodeAt(i);
        hash = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

// https://github.com/sindresorhus/escape-string-regexp/blob/main/index.js
// MIT License
OO.escapeStringRegexp = function(string) {
   if (typeof string !== 'string') {
        throw new TypeError('Expected a string');
    }
    // Escape characters with special meaning either inside or outside character sets.
    // Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
    return string.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');
};

// https://github.com/component/escape-html
// MIT License
var matchHtmlRegExp = /["'&<>]/
OO.escapeHtml = function(string) {
    var str = '' + string;
    var match = matchHtmlRegExp.exec(str);

    if (!match) {
      return str;
    }

    var escape;
    var html = '';
    var index = 0;
    var lastIndex = 0;

    for (index = match.index; index < str.length; index++) {
      switch (str.charCodeAt(index)) {
        case 34: // "
          escape = '&quot;';
          break;
        case 38: // &
          escape = '&amp;';
          break;
        case 39: // '
          // escape = '&#39;';
          escape = '&#x27;'; // modified from escape-html; used to be '&#39'
          break;
        case 60: // <
          escape = '&lt;';
          break;
        case 62: // >
          escape = '&gt;';
          break;
        default:
          continue;
      }

      if (lastIndex !== index) {
        html += str.substring(lastIndex, index);
      }

      lastIndex = index + 1;
      html += escape;
    }

    return lastIndex !== index
      ? html + str.substring(lastIndex, index)
      : html;
};

// version
OO.version = 'v0.0.1-0.43';
export default OO;

