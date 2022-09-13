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
        if(ooptions.maxRouterHistory === undefined) ooptions.maxRouterHistory = 100;
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
                    if(cb(o[p], p, o) === false) break;
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
                // shallow copy arising from removing items in same array,
                // while itterating through it, which OO does a lot.
                const arr = obj_arr.slice(0);
                arr.forEach(cb);
            } else {
                context.eachProp(obj_arr, cb, prop_cb);
            }
        };
        context.deep = (source={}, data={}) => {
            return {...JSON.parse(JSON.stringify(source)), ...data};
        };
        context.shallow = (source, props, target={}) => {
            props.forEach(p => { target[p] = source[p]; });
            return target;
        };
        context.isFunction = function(v) {
            // true for both Function and AsyncFunction
            // return Object.prototype.toString.call(v).endsWith('Function]');
            return typeof v === 'function'; // faster
        };
        context.applyStyle = (elm, style) => {
            //console.log({elm, style});
            if(style !== undefined) {
                for(let p in style) {
                    //console.log({elm, style}, style[p]);
                    if(Object.prototype.hasOwnProperty.call(style, p)) {
                        elm.style[p] = style[p];
                    }
                }
            }
        };
        context.createWhen = (when) => {
            const whenType = Object.prototype.toString.call(when),
                  isObj = whenType === '[object Object]';
            if(!isObj && whenType !== '[object Array]') when = [when];
            if(!isObj) {
                when = when.map(v => {
                    //if(Object.prototype.toString.call(v) === '[object Function]') {
                    if(context.isFunction(v)) {
                        return {t: v.name.toLowerCase()}; // String, Boolean etc.
                    } else {
                        return {v};
                    }
                });
            }
            let transform = v => v,
                is;
            if(!isObj) {
                is = (v) => {
                    const type = typeof v;
                    for(let i = 0; i < when.length; i++) {
                        let o = when[i]; //console.log({o, when});
                        if(o.t) {
                            if(type === o.t) return true;
                            return {v}; // TODO transform
                        } else if(v === o.v) {
                            return true;
                        }
                    }
                };
            } else {
                is = v => {
                    let is = when.hasOwnProperty(v);
                    //if(Object.prototype.toString.call(v) === '[object Function]') {
                    //    console.log('fun name='+v.name.toLowerCase());
                    //}
                    //console.log(when[v], 'transform is, ', is, 
                    //'for v=', v, 'when[',v,']='+v, 'tostrng='+Object.prototype.toString.call(v), 'typeof=',typeof v);
                    return is;
                };
                transform = v => when[v];
            }
            return {
                transform,
                is
            };
            isObj ? transform : is;
        };
        context.expressionfy = (f, arg1, arg2, cb, is, exp, isPreferValue, is$, isForce, debugTag) => { //console.log({f, arg1, arg2, cb, is});
            //console.log(arg1, {noEscape});
            // expressionlistener
            if(is || is === undefined) {
                if(!exp) {
                   exp = context.expression.exec(arg1, function() {return cb(...arguments, exp);}, undefined, isPreferValue, is$, isForce, debugTag);
                } //console.log({exp});
                if(exp.isExpression) {
                    f.onRemoved.push(exp.remove);
                    return;
                } else if(exp.string) {
                    cb(exp.string, undefined, exp);
                    return;
                }
            }
            cb(arg2 || arg1, undefined, exp);
        };
        //context.shimMethod = (f, key, elm, cbShim) => {
        //    f[key] = (cb) => {
        //        elm[key] = function() {
        //            if(cbShim) {
        //                return cbShim({cb, args: arguments});
        //            } else {
        //                return cb(f, ...arguments);
        //            }
        //        };
        //        return f;
        //    };
        //};
        //context.shimEvent = (f, key, elm) => {
        //    f[key] = () => {
        //        elm.addEventListener(key, function() { // TODO removeEventListener onRemoved
        //            cb(f, ...arguments);
        //        });
        //        return f;
        //    };
        //};
        context.history = (function() { // makes it easy to shim history in nodejs
            return {
                onpopstate: l => { window.onpopstate = l;},
                replaceState: function() { history.replaceState(...arguments); },
                pushState: function() { history.pushState(...arguments) },
                back: function() { history.back(); },
                length: function() { return history.length; },
                state: function() { return history.state; }
            };
        })();
        context.setHeadlessHistory = (setHref=()=>{}) => {
            let onpopstate, on;
            const arr = [],
                  curr = {};
            function replaceState(state, title, href) {
                setHref(href);
                curr.title = title;
                curr.href = href;
                arr[arr.length-1] = state;
            }
            function pushState(state, title, href) { //console.trace();
                setHref(href);
                curr.title = title;
                curr.href = href;
                arr.push(state);
            }
            function popState() {
                arr.pop();
                return arr[arr.length-1];
            }
            function back() {
                const state = popState();
                if(onpopstate) onpopstate({state});
            }
            function length() {
                return arr.length;
            }
            function state() {
                return arr[arr.length-1];
            }
            context.history = {
                onpopstate: l => { onpopstate = l; },
                replaceState,
                pushState,
                length,
                state,
                back
            };
        };

        // STOREKEEPER BEGIN
        context.storekeeper = (function() {
            /*
             * a store is a series of container objects on unique plain paths,
             * pointing to values or object.
             * a container will NOT bind to both a value and an obj.
             * importing/adding will NOT transform the input.
             * if manipulating values in an array,
             * dont forget to update the store (@see return in observer)
             *
             * store observers are notified of mutations by regestering as
             * plain paths or parameterized paths listeners.
             * a path listener is notified with a String of the path to the mutation.
             * a param path listener is also notified with an Object containing all the
             * information needed to get the path to the mutation(s), the params and
             * their paths.
             *
             * the storekeeper can keep track of many root objects,
             * hence can store multiple unsegregated stores.
             *
             * development hint:
             *      internally $ refers to the meta object keeping track of the stored data
             *      externally $ refers to storekeeper utils and $() is a shortcut for getting data 
             *      OO internal use of store observers, have been commented with "storelistener"
             *      path is internally an array (efficiency), externally a string (friendlyness). underscore indactes array.
             */

            const onParamPaths = []; // parameterized paths
 
            function buildPath(_path) {
                //console.log({_path});
                let $ = grab(_path);
                if($) return $;
                let walk = [],
                    _parent;
                _path.forEach((seg, i) => {
                    //if(seg === '..') {
                    //    // root/child_a/grandchild/../../child_b
                    //    // push(root) push(child_a) push(grandchild) pop(grandchild) pop(child_a) push(child_b)
                    //    walk.pop();
                    //} else {
                    walk.push(seg);
                    if(!grab(walk)) {
                        //console.log(walk ,' did not exist, will create it');
                        $ = {
                            $: {},
                            _parent,  // path to parent
                            _path: walk.slice(0),
                            seg, // path segment
                            on: []
                        };
                        //console.log('buildPath to: ', $.parent);
                        put($);
                    }
                    _parent = walk.slice(0);
                    //}
                });
                return $;
            }

            function grabParent($) {
                if($._parent) {
                    return grab($._parent);
                } else {
                    return context.store;
                }
            }

            function grab(_path) { //console.log('grab _path=', _path);
                //console.trace();
                const len = _path.length;
                let $$ = context.store; //console.log('grab', _path, 'from store', JSON.stringify(context.store));
                for(let i = 0; i < len; i++) {
                    //console.log(i, _path[i], $$);
                    if(!$$) return;
                    $$ = $$.$;
                    if(!$$) {
                        //console.log(i+'\t\t not found',path, _path[i]);
                        return;
                    }
                    $$ = $$[_path[i]];
                    //console.log(i+'\t\t',path, _path[i], $$);
                }
                //console.log('\tfound', $$);
                return $$;
            }

            function put($) {
                //console.log('put', path, $, arr);
                //console.trace();
                //store[path] = obj;
                const _path = $._path,
                      len = _path.length - 1;
                let $$ = context.store;
                for(let i = 0; i < len; i++) {
                    $$ = $$.$[_path[i]];
                    //console.log(i+'\t\t',path, _path[i], $$);
                }
                $$.$[_path[len]] = $;
                //console.log('\tputted', _path[len], $$);
            }

            //function destroy(_path) { //  TODO verify that this works
            //    //delete store[path];
            //    const len = _path.length - 1;
            //    let $$ = context.store;
            //    console.log('destroy', {_path, $$});
            //    for(let i = 0; i < len; i++) {
            //        $$ = $$.$[_path[i]]
            //    }
            //    console.log('destroy', _path[len], $$);
            //    delete $$.$[_path[len]];
            //    throw 'asd';
            //}

            function notify(_path, $, isNotifyParent, isSupressNotify) { //console.log('isSupressNotify', isSupressNotify);
                if(isSupressNotify) return;

                notifyParamPaths(_path);
                const arr = $.on.slice(0); // protect aganst listeners ruining the arr
                arr.forEach(l => { //console.log('notify', l, _path);
                    notifyListener(l, _path, get); // storelistener
                });

                if(isNotifyParent && $._parent) {
                    const _parent$ = grab($._parent);
                    notify(_parent$._path, _parent$, false, false);
                }
            }

            function notifyListener(cb, _path, get, params) { // storelistener
                // if a _path observer returns a promise,
                // it implies that it is a "doer",
                // meaning something that intended to do (mutate store) something async.
                // if it returns something other then a promise it means to do it right away.
                // if it return undefined, it does not intend to do anything at all.
                const o = cb(_path, get, params);
                if(o && o.toString() === '[object Promise]') {
                    const promises = context.globalPromises;
                    promises.push(o);
                    //promises.push(o);
                    o.then(() => {
                        const i = promises.findIndex(p => p === o);
                        if(i >= 0) {
                            promises.splice(i, 1);
                        }
                    });
                }
            }

            function notifyParamPaths(_path) {
                // P = _path with params
                // N = notifying _path pointing to stored data that have been mutated
                let fullPath;
                // reduce
                for(let j = 0, len = _path.length, jj = onParamPaths.length; j < jj; j++) {
                    let oP = onParamPaths[j];
                    if(oP.len === len) {
                        for(let i = len-1, params = {}; i >= 0; i--) {
                            let segP = oP.segs[i],
                                segment = _path[i];
                            //console.log({j, i}, segP.s, segment);
                            if(!segP.is && segP.s !== segment) {
                                // neither a param,
                                // or matching string
                                //console.log('break');
                                break;
                            }
                            if(segP.is) {
                                let segs = _path.slice(0, i+1);
                                //console.log(segP, i, {segs, _path});
                                if(!fullPath) {
                                    fullPath = _path.join('/');
                                }
                                params[segP.s] = {
                                    fullPath,
                                    _path: segs, // internally store always us a _path split into segments...
                                    path: segs.join('/'), // ...but externally it might be more friendly to work with string.
                                    paramPath: oP.paramPath,
                                    param: segP.s,
                                    segment,
                                    index: i,
                                    len
                                };
                                //console.log(j, params[segP.s]);
                                //console.trace();
                            }
                            if(i === 0) {
                                // found a parameterized _path listener,
                                // that had the same number of segments as _path
                                // and where the segments were an exact match,
                                // or paramPath had a :param
                                // notify
                                // pass an arr if there were many _paths,
                                // or a single object if there was only one.
                                //console.log(_path, get, params);
                                notifyListener(oP.cb, _path, get, params); // storelistener
                            }
                            //else { console.log('continue');}
                        }
                    }
                }
            }

            function onParamPath(paramPath, cb) {
               const o = {
                    segs: [],
                    paramPath,
                    cb
                };
                //paramPath.split('/').forEach(s => {
                paramPath.forEach(s => {
                    const is = s.startsWith(':'); //pre-compute
                    o.segs.push({
                        is,
                        s: is ? s.substring(1, s.length) : s
                    });
                });
                o.len = o.segs.length;
                onParamPaths.push(o);                                   if(DEBUG > 0) context.debug.allocate('store.onparam');
                return () => {
                    const i = onParamPaths.findIndex((o) => o === cb);
                    if(i >= 0) {
                        onParamPaths.splice(i, 1);                      if(DEBUG > 0) context.debug.release('store.onparam');
                    }
                };
            }

            function buildTree($, child) {
                let _parent = $._parent;
                while(_parent) {
                    let seg = $.seg;
                    $ = grab(_parent); //console.log('have parent', $._parent, _parent, $.seg, $);
                    if($.isValue) throw new Error(`store.isValue(${$.isValue})`);
                    if(!$.obj) {
                        _parent = $._parent;
                        $.obj = {};
                    } else {
                        _parent = null;
                    }
                    $.obj[seg] = child; //console.log('set ' + JSON.stringify(child) + ' on ' + seg);
                    child = $.obj;
                }
            }

            function dooo(_path, val_obj, isNotifyParent, isSupressNotify) {
                //console.log('dooo', _path, val_obj);
                const $ = buildPath(_path);
                if(Object.prototype.toString.call(val_obj) === '[object Object]') {
                    if($.obj) {
                        //console.log('remove outdated props', $.obj);
                        let arr;
                        for(let p in $.obj) {
                            if(!Object.prototype.hasOwnProperty.call(val_obj, p)) {
                            //if(!context.hasProp(val_obj, p)) {
                                //console.log('prop i prev obj, does not exist in new', p);
                                arr = _path.slice(0);
                                arr.push(p); //console.log(arr, p);
                                remove(undefined, arr);
                            }
                        }
                    } else {
                        delete $.isValue;
                    }
                    //console.log('set new obj', $, val_obj);
                    $.obj = val_obj; // obj
                    if($._parent) {
                        //REMOVE const _parent$ = grab($._parent); //console.log('have parent', $._parent, _parent$, $.seg);
                        //if(!_parent$.obj) {
                        //    if(_parent$.isValue) {
                        //        delete _parent$.isValue;
                        //        throw 'TODO: is this proper way to do this?!';
                        //    }
                        //    _parent$.obj = {};
                        //}
                        //_parent$.obj[$.seg] = val_obj;
                        buildTree($, val_obj);
                    }
                    let subPath;
                    for(let p in val_obj) {
                        if(Object.prototype.hasOwnProperty.call(val_obj, p)) {
                            //console.log(p, val_obj[p]);
                            subPath = _path.slice(0);
                            subPath.push(p);
                            dooo(subPath, val_obj[p], isSupressNotify);
                        }
                    }
                    //contect.eachProp(val_obj, (v, p) => dooo(path + '/' + p, v));
                } else {
                    $.isValue = true;
                    buildTree($, val_obj);
               }
               notify(_path, $, isNotifyParent, isSupressNotify); // storelistener
            }

            function drop(path, isNotifyParent, isSupressNotify=true, isIgnoreChildListeners=true) { //console.log(...arguments);
                // remove value at path even if there is are listener attached to it,
                // note that shake default behaviour is to delete all subpaths even if they have listeners
                remove(path, undefined, isNotifyParent, isSupressNotify, isIgnoreChildListeners);
             }

            function shake(path, isNotifyParent, isIgnoreChildListeners=true) {
                // remove value at path only if there is no listener attached to it,
                // note that shake default behaviour is to delete all subpaths even if they have listeners
                const _path = path.split('/');
                const $ = grab(_path);
                if($) {
                    if(!$.on.length) remove(undefined, _path, isNotifyParent, true, isIgnoreChildListeners);
                }
             }

            function remove(path, _path, isNotifyParent, isSupressNotify, isIgnoreChildListeners) {
                //console.log({path, _path, isNotifyParent, isSupressNotify, isIgnoreChildListeners});
                //if(isDebug) console.log({path, _path});
                if(DEBUG > 0 && typeof _path === 'string') throw 'expectec arr.';
                if(path) _path = path.split('/');

                const $ = grab(_path);
                                                    //console.log('asking to remove path:', _path, $, {isIgnoreChildListeners});
                // TODO let removed;
                if($) {
                                                    //console.log('  ...attemptin to remove', _path, ' leaf:', $);
                    let isListener;
                    const _parent$ = grabParent($);
                    if($.isValue) {
                                                    //console.log('   ...which is a value');
                        delete $.isValue;
                        //removed = _parent$.obj[$.seg];
                        delete _parent$.obj[$.seg];
                    } else {
                                                    //console.log('      ...which is an object...', $.obj);
                        let arr;
                        for(let p in $.$) {
                            arr = _path.slice(0);
                            arr.push(p);
                                                    //console.log('         ...so also remove path', arr, {isListener});
                                // do NOT notify parents on subpaths
                            if(!isListener && remove(undefined, arr, false, true, isIgnoreChildListeners)) {
                                if(!isIgnoreChildListeners) isListener = true;
                            }
                        }
                        if(_parent$.obj) {          //console.log('      ...which also has a parent...', _parent$);
                            delete _parent$.obj[$.seg];
                        }
                                                    //else console.log('      ...which is a root path...');
                        //removed = $.obj;
                        delete $.obj; // remove obj itself
                    }
                    // TODO notify. if there is no listeners and keepRef is false, then delete
                    if($.on.length === 0 || isIgnoreChildListeners) {
                        //console.log('   ...no more listeners, so we can delete', $.seg, 'in', _parent$.$, {isIgnoreChildListeners});
                        // destroy
                        //if(!_parent$) {
                        //    _parent$ = grabParent($);
                        //}
                        if(!isListener) {
                            if(_parent$ === context.store) {
                                                        //console.log('        ...remove from root', $.seg, _parent$);
                                delete _parent$.$[$.seg];
                            } else {
                                                        //console.log('        ...remove from branch', $.seg, _parent$.$, _parent$);
                                delete _parent$.$[$.seg];
                            }
                        }
                                                    //else console.log('   ...but we can not because there was a listner in the tree');
                    } else if(!isListener){
                        //console.log('   ...there are listeners, so ignore deletion', $.seg, 'in', _parent$.$, {isIgnoreChildListeners});
                        isListener = true;
                    }
                    //console.log({_path, $, isNotifyParent, isSupressNotify});
                    notify(_path, $, isNotifyParent, isSupressNotify); // storelistener
                    return isListener; // recursive
                }
                //console.log('done remove path:', _path, context.store);
                //else { console.log('nothing to remove'); }
            }

            function buildCanonicalPath(string_arr) {
                if(typeof string_arr === 'string') {
                    string_arr = string_arr.split('/');
                }
                const path = [];
                string_arr.forEach(seg => {
                    if(seg === '..') {
                        path.pop();
                    } else {
                        path.push(seg);
                    }
                });
                //console.log('absolute path: ', string_arr, ' transformed to canonical path:', path);
                return path;
            }

            function doo(path_obj, val_obj, isNotifyParent, isSupressNotify) {
                //console.log('doo', {path_obj, val_obj, isNotifyParent, isSupressNotify});
                //onsole.trace();
                if(arguments.length > 1) {
                    return dooo(buildCanonicalPath(path_obj), val_obj, isNotifyParent, isSupressNotify);
                }

                for(let p in path_obj) {
                    if(Object.prototype.hasOwnProperty.call(path_obj, p)) {
                        dooo([p], path_obj[p], isNotifyParent, isSupressNotify);
                    }
                }
            }

            function get(_path, isPreferValue, is$, params) { //console.log('get', {_path, isPreferValue, is$, params});
                if(params) { //console.log('   return params');
                    let param,
                        cnt = 0;
                    for(let p in params) {
                        if(Object.prototype.hasOwnProperty.call(params, p)) {
                            // note: params arg will be mutated
                            param = params[p]; //console.log(p, ' *****     param=',param, param._path);
                            let $ = grab(param._path), // if object was dropped $ will be undefined
                                data;
                            if($) {
                                data = getData(undefined, isPreferValue, $); //console.log(p, param._path, {isPreferValue, _path, data});
                                //if(data === undefined && param.index === param.len-1) { // TODO maybe add a DEBUG or WARNING check?
                                //    throw 'prop named "' + param.param  + '" not found in stored object. _path=' + param.paramPath;
                                //}
                            }
                            if(!is$ && isPreferValue && $.isValue) {
                                // note: isPreferValue hint that the value of leafs in the object tree is preffered,
                                // and in parameterized paths this implies that meta data related to param is unwanted.
                                param = data;
                            } else {
                                createMeta(data, param);
                            }
                            //console.log({param});
                            params[p] = param;
                            cnt++;
                        }
                    }
                    //console.log('getData', _path, params);
                    return cnt > 1 ? params : param;
                } else if(is$) { //console.log('    return $');
                    //console.trace();
                    const $ = grab(_path),
                          data = getData(undefined, isPreferValue, $);
                    return createMeta(data); 
                } else { //console.log('   return data');
                    return getData(_path, isPreferValue);
                }
            }

            function getData(_path, isPreferValue, $) { //console.log('getData', {_path, isPreferValue, $});
                //if(!$) {
                //    $ = grab(_path);
                //}
                $ = $ || grab(_path);
                if($) {
                    if($.isValue) {
                        const _parent$ = grab($._parent),
                              obj = _parent$.obj;
                        if(isPreferValue) { //console.log('is value, prefer value', 'path=',_path, 'parent=',_parent$, 'obj=',obj, $);
                            return obj[$.seg];
                        } else { //console.log('is value, prefer obj');
                            return obj; // parent$.obj
                        }
                    } else { //console.log('no value , return obj');
                        return $.obj;
                    }
                }
            }

            function on(path, cb, isSilent, isForce) { //console.log('asd', path);
                if(path.indexOf(':') >= 0) {
                    // note: a parameterized path is by definition not a plain path,
                    // hence it does not know yet exactly to what in the store it is referencing,
                    // hence the isSilent bool is dropped.
                    return onParamPath(buildCanonicalPath(path), cb);
                }

                const _path = buildCanonicalPath(path),
                      $ = buildPath(_path);
                //console.log('on', path, cb, isSilent, $);
                $.on.push(cb);                                          if(DEBUG > 0) context.debug.allocate('store.on');
                //if(!isSilent && ($.obj || $.isValue)) {
                if(!isSilent) {
                    if($.obj || $.isValue || isForce) { //console.log($);
                        cb(_path, get);
                    }
                    //cb(get(path), $.isValue ? $.seg : undefined);
                }
                return () => {
                    // remove path mutation listener
                    const $ =  grab(_path);
                    if($) {
                        const i = $.on.findIndex((o) => o === cb);
                        if(i >= 0) {
                            $.on.splice(i, 1);                          if(DEBUG > 0) context.debug.release('store.on');
                        }
                        if($.on.length === 0) {
                            //console.log('NO LISTNER LEFT');
                            if(!$.isValue) {
                                //console.log('   NOT A VALUE');
                                const _parent$ = grabParent($);     //console.log('parent to _path:',_path,  _parent$);
                                if(!_parent$.obj) {                 //console.log($._path);
                                    if(_parent$.hasOwnProperty('_parent')) { // parent it not root, so remove
                                        remove(undefined, $._path);
                                    } //else console.log('not removing', $._path);
                                }
                            }
                        }
                    }
                };
            }

            function createMeta(data, o={}) {
                o.size = prop => {
                    if(!data) return 0;
                    return Object.keys(prop ? data[prop] : data).length;
                };
                o.get = prop => data && data[prop];
                o.has = prop => data && !!data[prop];
                //o.each = (cb_prop, cb) => context.each(data, cb_prop, cb);
                o.each = (cb_prop, cb) => context.each(data, cb_prop, cb);
                o.$ = data;
                return o;
            }

            const storeUtils = (function() {
                const $ = (path, isPreferValue) => get(buildCanonicalPath(path), isPreferValue === undefined ? true : isPreferValue);
                const mutate = (path, isNotifyParent, isSupressNotify, cb) => {
                    const _path = buildCanonicalPath(path),
                          meta$ = grab(_path),
                          v = cb(getData(undefined, true, meta$));
                    notify(_path, meta$, isNotifyParent, isSupressNotify); // storelistener
                    return v;
                };
                // mutations
                $.assign = (p, v, isNotifyParent, isDontNotify) => mutate(p, isNotifyParent, isDontNotify, o => Object.assign(o, v));
                $.push = (p, v, isNotifyParent, isDontNotify) => mutate(p, isNotifyParent, isDontNotify, a => a.push(v));
                $.pop = (p, isNotifyParent, isDontNotify) => mutate(p, isNotifyParent, isDontNotify, a => a.pop());
                $.prepend = (p, v, isNotifyParent, isDontNotify) => mutate(p, isNotifyParent, isDontNotify, a => a.unshift(v));
                $.shift = (p, isNotifyParent, isDontNotify) => mutate(p, isNotifyParent, isDontNotify, a => a.shift());
                $.set = doo;
                $.shake = shake;
                $.drop = drop;
                $.remove = (p, isNotifyParent, isDontNotify) => remove(p, undefined, isNotifyParent, isDontNotify);
                // benign
                $.each = (path, prop_cb, cb) => context.each($(path, true), prop_cb, cb),
                $.size = (path) => {
                        const o = $(path, true);
                        return o ? Object.keys(o).length : 0;
                };
                $.$ = $;
                // export
                $.asJson = (excludes=[]) => {
                    const
                        $ = context.store.$,
                        o = {};
                    for(let p in $) {
                        if(!excludes.includes(p) && $.hasOwnProperty(p)) {
                            //console.log(p, $[p]);
                            o[p] = $[p].obj;
                        }
                    }
                    return JSON.stringify(o);
                };
                return $;
            })();

            return {
                $: storeUtils,
                //hasUnresolved: () => promises.length > 1,
                buildCanonicalPath,
                //resolvePromises,
                createMeta,
                do: doo,
                remove,
                //shake,
                get,
                on,
                debug: {
                    getMapPath: () => mapPath
                }
            };
        })();
        context.createStoreListener = function(path, isPreferValue_cb, cb) {
            if(!cb) {
                cb = isPreferValue_cb;
                isPreferValue_cb = true;
            }
            return context.storekeeper.on( path, (_path, get, params) => cb(get(get(_path, isPreferValue_cb, false, params))) );
        };
        // STOREKEEPER END

        // EXPRESSION START
        context.expression = (function() {

            /*
             * expressions are used to craft complex store data retrieval queries.
             * they permit the use of :params in store paths and can be inbedded in human readable strings.
             * expressions observe store mutations and then propagate the result to observers of the expression.
             *
             * development hint:
             *      OO internal use of store observers, have been commented with "expressionlistener"
             */
            function exec(x, cb, funcName, isPreferValue, is$, isForce, debugTag) { //console.log({x, cb, funcName, isForce});
                // x = '@value hello $a/b world$c  cost $$10.'; // 'hello EARTHworldMOON cost $10.'
                if(typeof x !== 'string' || x.indexOf('$') === -1) { // quick check
                    return {
                        string: x,
                        isExpression: false
                    };
                }
                let i = 0;
                //console.log('parse delegation function name');
                if(x.startsWith('@')) { // escape using two @
                    if(x.startsWith('@@')) {
                        i++;
                    } else {
                        const pos = x.indexOf(' ');
                        funcName = x.substr(1, pos-1);
                        if(!DEBUG_EXPRESSION) {
                            x = x.substr(pos, x.length-pos);
                        }
                    }
                }
                //console.log('build array');
                let arr = [''];
                for(let i = 0, j = 0, c = '', p = ''; i < x.length; i++) {
                    c = x.charAt(i); //console.log(i, c, x);
                    if(c === '$') {
                        //console.log('escape using two $$');
                        if(x.charAt(i+1) !== '$') {
                            p = x.indexOf(' ', i); // use two space to print one after store expression
                            if(p === -1) {
                                p = x.length;
                            }
                            arr[j+1] = x.substr(i, p-i);
                            i = p;
                            j += 2;
                            arr[j] = '';
                            continue;
                        } else {
                            i++;
                        }
                    }
                    arr[j] += c;
                }
                let count = 0;
                arr = arr.filter(s => {
                    if(s.startsWith('$')) {
                        count++;
                    }
                    return s && s;
                }, []);
                // make elements with a path,
                // observe store for new values.
                const isHumanSentence = arr.length > count,
                      removeListeners = [];
                if(cb) {
                    for(let i = 0, s = ''; i < arr.length; i++) {
                        s = arr[i];
                        if(s.startsWith('$')) {
                            const path = s.substr(1, x.length-1);
                            if(!isHumanSentence && is$) {
                                arr[i] = context.storekeeper.createMeta();
                            }
                            removeListeners.push(createListener(path, isHumanSentence, arr,i,cb, funcName, isPreferValue, is$, isForce, debugTag));
                        }
                    }
                }
                const string = arr.join(''),
                      isExpression = removeListeners.length > 0; //console.log({x, string, isExpression, isHumanSentence});
                return {
                    string,
                    isExpression,
                    isHumanSentence,
                    remove: () => {
                        const arr = removeListeners.slice(0);
                        arr.forEach(f => f());
                    }
                };
            }

            function createListener(path, isHumanSentence, arr, index, cb, funcName, isPreferValue, is$, isForce, debugTag) {// expressionlistener
                //return context.storekeeper.on(path, (object, propName, isValue) => {
                return context.storekeeper.on(path, (_path, get, params) => { // storelistener
                    // note, replacing get because callback might execute in a context unaware
                    // what kind of result is returned
                    if(isHumanSentence) {
                        if(params) {
                            let s = '';
                            get(_path, false, false, params); // note: params may be mutated by get
                            //console.log('human readable', {_path, get, params});
                            for(let p in params) {
                                if(Object.prototype.hasOwnProperty.call(params, p)) {
                                    let o = params[p];
                                    // string concatenation when there are many :params in a single _path,
                                    // which is likely an edge-case
                                    //console.log({_path, isHumanSentence, cnt, arr});
                                    s += o.$[o.param];
                                }
                            }
                            arr[index] = s;
                        } else {
                            arr[index] = get(_path, true); //console.log({arr});
                        }
                        if(DEBUG_EXPRESSION) {
                            arr[index] += '['+_path+']';
                        }
                        return cb(arr.join(''), funcName);
                    } else {
                        arr[index] = get(_path, isPreferValue, is$, params); //console.log({arr});
                        //console.log(debugTag, arr[index], {isPreferValue, is$});
                        if(DEBUG_EXPRESSION) {
                            arr[index] += '['+_path+']';
                        }
                        return cb(arr.length === 1 ? arr[index] : arr, funcName);
                    }
                }, false, isForce);
            }

            return {
                exec
            };
        })();
        // EXPRESSION END

        // ROUTE START
        context.router = (function() {

            let state = {};
            const handlers = [];

            //function buildUrl(routeUrl) {
            //    // store friendly (no func)
            //    const url = new URL('http://oo.org' + routeUrl);
            //    const data = {
            //        relativePathname: url.pathname,
            //        searchparams: {}
            //    };
            //    url.searchParams.forEach((v, k) => {
            //        data.searchparams[k] = v;
            //    });
            //    const o = context.shallow(url, ['hash','host','hostname','href','origin','password','pathname',
            //        'port','protocol','search','username'], data); //console.log('buildUrl', o);
            //    return o;
            //}

            function route(parentHandler, arg1, arg2, arg3, arg4) {
                //console.log('createRoute', {parentHandler, arg1, arg2, arg3, arg4});
                //console.log(arg2);
                let code, path, cb, chainCb, options = {};
                if(typeof arg1 === 'object') {
                    options = arg1;
                    path = arg2;
                    cb = arg3;
                    chainCb = arg4;
                } else if(typeof arg1 === 'number') {
                    code = arg1;
                    path = arg2;
                    cb = arg3;
                    chainCb = arg4;
                } else {
                    path = arg1;
                    cb = arg2;
                    chainCb = arg3;
                }
                const handler = addHandler(parentHandler, options, code, path, cb, chainCb);
                if(!chainCb) return;
                chainCb((options, code, path, cb, chainCb) => {
                    route(handler, options, code, path, cb, chainCb); // sub-paths use parent oo
                });
            }

            function addHandler(parentHandler, meta, code, path, cb) {
                // optmz match by pre-compute
                const segments = path.substr(1, path.length).split('/').map(s => {
                    const is = s.startsWith(':');
                    if(is) {
                        s = s.substr(1, s.length-1);
                        if(DEBUG > 0) switch(s) { case 'url':case 'title':case 'style':
                            throw 'reserved keyword. param=' + p;}
                    }
                    return { s, is };
                });
                const isRoot = !parentHandler,
                      handler = {
                          handlers: [],
                          meta,
                          segments,
                          isRoot,
                          code,
                          cb
                      },
                      arr = isRoot ? handlers : parentHandler.handlers;
                arr.push(handler);
                //if(DEBUG > 5) { handler.debug = { tugName: Tug ? Tug.name : 'no_tug'}; console.log('   push handler',{handler}); }
                return handler;
            }

            function storeListener(_path, get) { //console.log('*** storeListener', _path);
                const routeData = get(_path, false);    //console.log(' ->O goTo:', {routeData});
                if(!routeData) return;
                const {url, segments, title, hints, other} = routeData; //console.log({handlers});
                for(let i = 0, rootHandler; i < handlers.length; i++) {
                    rootHandler = handlers[i];
                    const result = match(segments, [rootHandler]); //console.log('storeListener', {result});
                    if(result) {
                        context.storekeeper.do('route/params', result.params);
                        const props = {
                            ...result.params,
                            url,
                            title
                        };
                        let arr = result.handlers.slice(0); //console.log(arr.length + ' listeners on ' +  _path);
                        for(let i = 0; i < arr.length; i++) { //console.log('* handler', arr[i]);
                            if(other) {
                                if(arr[i].cb(other, props, hints, state) === false) break;
                            } else {
                                //console.log(i, arr[0], _path);
                                //console.log(i, arr[i].cb);
                                //console.log('hit', arr[i]);
                                if(arr[i].cb({props, hints, state}) === false) break;
                            }
                        }
                        if(!(rootHandler.meta.block === false)) return; // blocking route, so exit
                    }
                }
            }

            function match(segments, handlers, result={handlers:[], params:{}}) {
                // TODO
                //      feature add so that a handler can also match against searchparams and hashtags (now only match segments)
                //
                //console.log('match', {segments, handlers, result});
                for(let i = 0; i < handlers.length; i++) {
                    let h = handlers[i],
                        segs = h.segments,
                        params = {};
                    //console.log(i, 'match against', h);
                    for(let j = 0; j < segments.length && j < segs.length; j++) {
                        let segH = segs[j],
                            seg = segments[j],
                            isMatchAll = false;
                        //console.log('   ', {j, segH, seg});
                        if(segH.is) { //console.log('listener segment is a param', segH);
                            params[segH.s] = seg;
                        } else if(segH.s === '*') { //console.log('listener segment is a "*" is a match all');
                            // but do not save as a param.
                            isMatchAll = true;
                        } else if(segH.s !== seg) {
                            //console.log('not a param and not same string', {segH, seg});
                            // implies this is not a match.
                            break;
                        }

                        if(j === segs.length - 1) { //console.log('success matching incomming url with this handler');
                            let is;
                            //console.log('and no more segments in this handler to match against...');
                            if(isMatchAll) { //console.log('...and last handler segment was a "match all"...');
                                is = true;
                            } else if(j === segments.length - 1) { //console.log('...and no more incomming url segments either...');
                                is = true;
                            } else { //console.log('...but incomming url had more segments to parse...');
                                if(h.handlers) { //console.log('...and handler had sub handlers...');
                                    let subSegments = segments.slice(j+1, segments.length); //console.log(j, {segments, subSegments});
                                    let r = match(subSegments, h.handlers);
                                    if(r) { //console.log('...that successfully matched...');
                                        result.handlers = result.handlers.concat(r.handlers);
                                        result.params = {
                                            ...result.params,
                                            ...r.params
                                        };
                                        is = true;
                                    } else { //console.log('...that failed to match against incomming...');
                                        is = false;
                                    }
                                }
                            }
                            if(is) { //console.log('...so this is a happy ending');
                                    // matching sub handler will be matched first,
                                    // so top handlers added to the list have to be added first.
                                result.handlers.unshift(h);
                                result.params = {
                                    ...result.params,
                                    ...params
                                };
                                return result;
                            }
                            //else { console.log('...so this failed.', {isBlocking}); }
                        }
                    }
                }
            }

            function goTo(path='', title, hints={}, other, routerBasename) {
                //console.log(`goTo "${path}"`, hints); //console.trace();
                // since routing root must be prefixed with / for the route  handler to make sense,
                // a trailing / will be added for the root path (example: ""). however, the exact opposite is true
                // when the pathname contains segments (example: "/page2") where the absence of the trailing / make more
                // sense. OO also needs to be able to render routes so that OO can attach itself to HTML that has
                // been rendered on server (go), hence its important that a route can processed in the client (reload).
                // to complicate things further, while the path might or might not end with trailing /,
                // the locationbar should retain whatever user entered, so context.history always save what user
                // specified. hence most of the operations is merely for dealing with edge-cases.
                const search = path.indexOf('?') >= 0 ? path.substring(path.indexOf('?')) : '';
                if(ooptions.routerBasename === undefined) throw new Error(`undefined ooptions.routerBasename(`);
                routerBasename = routerBasename !== undefined ? routerBasename : ooptions.routerBasename;
                if(hints.reload) {
                    // recycle data
                    const currentRoute = context.storekeeper.$('route') || {};
                    const currentState = context.history.state();
                    if(currentState) {
                        title = currentState.title;
                        path = currentState.path; //console.log('1', {path, routerBasename});
                    } else {
                        title = currentRoute.title;
                        if(OO.isNodeJs) {
                            path = '';
                        } else {
                            const url = new URL(window.location.href);
                            path = url.href.substring(url.origin.length + routerBasename.length); //console.log('2', {path, routerBasename});
                        }
                    }
                    // TODO functions will be missing. they are not really supposed to be
                    // stored in the history route anyway... but maybe a friendly warning to dev?
                    hints = context.deep(currentRoute.hints, {popstate:true});
                    if(other) other = context.deep(currentRoute.other);
                }
                hints = {synthetic:true, ...hints};
                path = OO.escapeStringRegexp(path); // XXX
                const stateUrl = routerBasename + path;    //const stateUrl = baseUrl + path;
                let routePath;
                if(path.length > 1) {
                    if(path.endsWith('/')) routePath = path.slice(0, -1);
                    else routePath = path;
                } else routePath = '/';
                if(!routePath.startsWith('/')) {
                    console.log('[OO] error in router goTo. path must start with "/"', path, routePath);
                    console.trace();
                    return;
                }
                const
                    routeUrl = routerBasename + routePath,
                    relativeUrl = path.startsWith('/') ? path : '/' + path,
                    segments = relativeUrl.split('/');
                segments.shift(); // always starts with "/"
                // propagate
                const route = {
                    url: {
                        routeUrl,
                        relativeUrl,
                        search
                    },
                    segments,
                    title,
                    hints,
                    other
                }; //console.log('-> goto route:', route);
                context.storekeeper.remove(undefined, ['route']);
                if(hints.popstate) {
                    //context.history.replaceState({path, title}, title, stateUrl);
                    replaceState(path, title, stateUrl);
                } else {
                    //context.history.pushState({path, title}, title, stateUrl); //console.log("push ", {path, title});
                    pushState(path, title, stateUrl); //console.log("push ", {path, title});
                    context.history.onpopstate(event => { //console.log("pop ", event);
                        if(event.state) {
                            go(event.state.path, event.state.title, {popstate:true, synthetic: isGoBack});
                        } else {
                            console.log('no history to pop. event=' + JSON.stringify(event));
                        }
                    });
                }
                context.storekeeper.do('route', route); //console.log({route}, context.storekeeper.$.route);
                //console.log({stateUrl, routePath, path, routeUrl, route, hints});
            }

            function reload() {
                goTo(undefined, undefined, {reload:true});
            }

            let appHistory = [];
            let isGoBack;
            function replaceState(path, title, stateUrl) {
                const state = {path, title};
                if(appHistory.length) appHistory[appHistory.length-1] = {state, stateUrl};
                context.history.replaceState(state, title, stateUrl);
            }
            function pushState(path, title, stateUrl) {
                const state = {path, title};
                appHistory.push({state, stateUrl});
                if(appHistory.length > ooptions.maxRouterHistory) appHistory.shift();
                context.history.pushState({path, title}, title, stateUrl); //console.log("push ", {path, title});
            }
            function goBack() {
                isGoBack = true;
                appHistory.pop();
                context.history.back();
                isGoBack = false;
            }

            const go = goTo;
            go.reload = reload;
            go.getBrowserHistory = () => context.history;
            go.getBackState = () => appHistory[appHistory.length-2];
            go.getAppHistory = () => appHistory;
            go.isBackRoot = () => go.isBack() && (go.getBackState().state.path === '' || go.getBackState().state.path === '/');
            go.isBack = () => appHistory.length > 1;
            go.back = goBack;
            go.root = () => goTo('/', undefined, undefined, undefined, '');

            return {
                //GURKbaseUrl: buildBaseUrl,
                storeListener,
                reload,
                route,
                go
            };
        })();
        context.storekeeper.on('route', context.router.storeListener); // note: auto-register.
        // ROUTE END

        // CUE BEGIN
        context.createCue = function(rootoo) {
            /*
             * The purpose of a Cue, is to make it easy to transition visually between a set of different Tugs.
             * A Tug can either be: created (undefined is truthy), replaced or destroyed.
             * All of these actions may be coupled to transitions.
             * Cue is non-oppinionated as to how it should be used,
             * but generally speaking it is a good idea to break up a transition into two steps.
             * 
             * Create Tug if it does not already exist. also run enter transition:
             *      cue({Foo, className: 'enter'});
             * Run exit transition if Foo exists, then destroy when done:
             *      cue({Foo, className: 'exit', regenerate: false})({destroy: true});
             *
             * Each step takes a callback (optional) as an argument.
             * Callback in first step, will be invoked when transition starts to run.
             * Callback in second step, will be invoked when transition in first (note: not second) step ends.
             *
             * Run exit if Foo exists. When transition end replace Foo and create Toga (inside Foo) and finally run enter transition:
             *      cue({Foo, className: 'exit', regenerate: false})({className: 'enter', replace: true}, ({oo}) => {
             *          cue({oo, Toga, props:{} });
             *      });
             *
             * If you intend to do stuff _after_ the transition in the second step ends and write like this, it will NOT work:
             *      cue({Foo, className: 'exit'})({className: 'enter' }, () => cue({Toga})); // create Toga _before_ running enter
             * Instead do like this:
             *      cue({Foo, className: 'exit'})(() => { // when exit transtion ends do this
             *          cue({Foo, className: 'enter'})( () => cue({Toga}) ); // when enter ends, create Toga
             *      });
             * If it still does not work, make sure the transitioned element have a transition property attached to it.
             *
             * If several Tugs of the same type is used in the same cue, it is possible to specify which using a key ('id').
             *      cue({Button, id: 'fooButton', autoId: true}, ({id, oo}) => {
             *          manualId = id;
             *          cue({Button, autoId: true}, ({id, oo}) => {
             *              autoId = id;
             *              cue({Button, id: manualId}, ({id, oo}) => {
             *                  //manualId === id
             *              });
             *          });
             *      });
             *
             * It is possible to create interactive transitions using the actuator option. An actuator is a function that
             * takes 
             *
             */
            const tugs = {};

            function arg(tug) {
                return {oo: tug.o, id: tug.id, state: tug.state, Tug: tug.Tug, tug};
            }

            function exec(Tug, options_cb={}, runCb=()=>{}, id) { //console.log({Tug, options_cb, runCb, id});
                if(context.isFunction(options_cb)) {
                    runCb = options_cb;
                    options_cb = {};
                }
                if(options_cb.autoId) {
                    for(id = 1; tugs[id]; id++);
                }
                if(!id && options_cb) id = options_cb.id;
                if(!id && Tug) id = Tug.name;
                if(!id) throw 'no id found. name=' + name;
                let tug = tugs[id];
                if(!Tug && tug) Tug = tug.Tug;
                if(!Tug) throw 'no Tug found. id=' + id;
                const name = Tug.name;
                if(!tug) tug = { id, Tug, name, state: 'destroyed'}; // lazy
                const {actuator, className, regenerate, replace, destroy, defaultProps={}} = options_cb,
                      props = {...defaultProps, ...options_cb.props};
                let endCb = () => {}; // utlizing scope, set in return func
                //console.log({id, name, Tug, tug, className, regenerate, replace, destroy, defaultProps});
                if(destroy) {//console.log('destroy', {id, name});
                    if(tug.state !== 'destroyed' && tug.o) tug.o.destroy(); // will invoke onDestroy listener above
                } else if(replace || tug.state === 'destroyed') {
                    tug.oo = options_cb.oo || tug.oo || rootoo;
                    if(replace && tug.o) {
                        tug.o.destroy();
                        //props.replaceRef = tug.fullRef;
                    }
                    if(regenerate !== false) { //console.log({Tug, props});
                        tug.o = tug.oo(Tug, props);
                        tug.state = 'created';
                        tug.id = id;
                        tugs[id] = tug; // during a replace, onDestroy will first delete, so we add here
                        tug.o.onDestroy(f => { //console.log('destroyed', {name, f, id, tug});
                            tug.state = 'destroyed';
                            tug.o = null;
                            delete tugs[id];
                        });
                    }
                }

                if(className && actuator) throw 'bad param. cue only accepts one type of transition handler.';

                let isTransitionRun;
                if(actuator) {
                    isTransitionRun = true;
                    tug.isTransitionEnd = false;
                    //console.log(runCb);
                    runCb(arg(tug));
                    actuator(() => {
                        //console.log('hello');
                        tug.isTransitionEnd = true;
                        endCb();
                    }, arg(tug));
                } else if(className) {
                    isTransitionRun = tug.o && tug.o.elm && !tug.o.elm.classList.contains(className);
                    if(isTransitionRun) {
                        tug.isTransitionEnd = false;
                        tug.o.transition(() => runCb( arg(tug) ), () => {
                            tug.isTransitionEnd = true;
                            endCb();
                        });
                        tug.o.classList(className, {swap: tug.className || true});
                        tug.className = className;
                         //tug.o.className(className);
                     }
                }

                if(!isTransitionRun) {
                    runCb( arg(tug) );
                    tug.isTransitionEnd = true;
                }
                //console.log('transition sghould run', id);

                //const isTransitionRun = (className && tug.o && tug.o.elm && !tug.o.elm.classList.contains(className));
                //if(isTransitionRun) { //console.log({className, id, tug});
                //    tug.isTransitionEnd = false;
                //    tug.o.classList(className, {swap: tug.className || true});
                //    tug.className = className;
                //    tug.o.transition(() => runCb( arg(tug) ), () => {
                //        tug.isTransitionEnd = true;
                //        endCb();
                //    });
                //    //console.log('transition sghould run', id);
                //} else {
                //    runCb( arg(tug) );
                //    tug.isTransitionEnd = true;
                //}

                return (options_cb={}, cb=()=>{}) => { //console.log('do this', {isTransition});
                    if(context.isFunction(options_cb)) {
                        cb = options_cb;
                        options_cb = undefined;
                    }
                    endCb = () => { //console.log('postponed until transition is finished');
                        exec(Tug, options_cb, () => { //console.log('boom', arg(tug));
                            cb( arg(tug) );
                        }, id);
                    };
                    if(tug.isTransitionEnd) endCb();
                };
            }

            function all(options={}, cb) {
                const {except=[], regenerate, destroy} = options,
                      exceptIds = except.map(v => typeof v === 'string' ? v : v.name);
                Object.keys(tugs).forEach(k => {
                    const {Tug, id} = tugs[k]; //console.log({id});
                    if(!exceptIds.includes(id)) {
                        exec(Tug, {id, regenerate, destroy})({regenerate:false}, cb);
                    }
                });
            }

            function cue(arg1, arg2, arg3) {
                if(arg1 === 'all') {
                    all(arg2, arg3);
                } else if(Object.prototype.toString.call(arg1) === '[object Array]') {
                    arg1.forEach(TugOptions => { //console.log({TugOptions});
                        exec(context.parseTug(TugOptions), TugOptions);
                    });
                } else {
                    return exec(context.parseTug(arg1), arg1, arg2);
                }
            }

            return cue;
        };
        // CUE END

        // STYLING
        context.stylesheet = (css, ref) => {
            ref = 's/' + ref;
            //let style = id && context.getDomElementById(id);
            let style = ref && context.getDomElementByRef(ref);
            if(!style) {
                style = context.createDomElement('style', ref);
                context.dokument.head.appendChild(style);
            }
            if(style.innerHTML != css) {
                style.innerHTML = css;
            }
        };

        // DOM
        context.eventManager = (function(interceptors) {

            function intercept(f, synthetic, cb, p=0) {
                const o = {cb, p};
                if(!interceptors[synthetic]) interceptors[synthetic] = [];
                let is;
                for(let i = 0, arr = interceptors[synthetic]; i < arr.length; i++) {
                    if(arr[i].p < p) {
                        arr.splice(i, 0, o);
                        is = true;
                        return;
                    }
                }
                if(!is) interceptors[synthetic].push(o);
                f.onRemoved.push(() => {
                    const i = interceptors[synthetic].indexOf(o);
                    if(i >= 0) interceptors[synthetic].splice(i, 1);
                });
                return o;
            }

            function add(f, synthetic, cbArr, options={}) { // TODO add event support for iPad, Android etc
                if(Object.prototype.toString.call(cbArr) === '[object Array]') {
                    if(options.intercept) throw new Error('intercept can not be combined with pre-event');
                } else {
                    cbArr = [null, cbArr];
                }
                if(options.intercept) intercept(f, synthetic, cbArr[1], options.intercept);
                let isTouch;
                const platformEventTypes = [];
                if(synthetic === 'down') {
                    if(OO.isiPhone) {
                        platformEventTypes.push('touchstart');
                        isTouch = true;
                    } else {
                        platformEventTypes.push('mousedown');
                    }
                }
                else if(synthetic === 'move') {
                    if(OO.isiPhone) {
                        platformEventTypes.push('touchmove');
                        isTouch = true;
                    } else {
                        platformEventTypes.push('mousemove');
                    }
                    //platformEventTypes.push('pointermove');
               }
                 else if(synthetic === 'up') {
                    if(OO.isiPhone) {
                        platformEventTypes.push('touchend');
                        isTouch = true;
                    } else {
                        platformEventTypes.push('mouseup');
                    }
                }
                else if(synthetic === 'leave') {
                    /*if(OO.isiPhone) {
                        // ? platformEventTypes.push('touchcancel');
                        isTouch = true;
                    } else {*/
                        platformEventTypes.push('mouseleave');
                    //}
                }
                else { //console.info(`un-supported synthetic event=${synthetic}`);
                    platformEventTypes.push(synthetic);
                }

                if(!f.eventHandlers[synthetic]) {
                    f.eventHandlers[synthetic] = [];
                    const ff = (event) => { //if(event.type !== 'mousemove')console.log(event);
                        let x,y;
                        if(isTouch) {
                            x = event.pageX;
                            y = event.pageY;
                        } else {
                            x = event.screenX;
                            y = event.screenY;
                        }
                        propagate(f, synthetic, x, y, event);
                    };
                    f.onRemoved.push(() => {
                        platformEventTypes.forEach((type) => f.elm.removeEventListener(type, ff, false));
                    });
                    // note: only first option registered will take  effect because listener is re-used
                    platformEventTypes.forEach((type) => {
                        f.elm.addEventListener(type, ff, options);
                    });
                }
                if(!options.intercept) f.eventHandlers[synthetic].push(cbArr);
                return f;
            }

            function propagate(f, synthetic, x, y, event, isStopPropagation, ignoreIntercept) {
                //if(synthetic !== 'move')console.log('propagate', {synthetic, event, isStopPropagation, ignoreIntercept});
                event.stopPropagation(); // awalys stop propagation of real event
                const syntheticEvent = {x, y, event, oo: f.oo, value:f.elm.value, $: f.$, elm: f.elm};
                const iarr = interceptors[synthetic];
                if(!ignoreIntercept && iarr) {
                    for(let i = 0; i < iarr.length; i++) {
                        if(iarr[i].cb(syntheticEvent) === false) return;
                    }
                }
                f = context.ooByElm(event.target); // target/inner oo
                const path = [];
                while(f) {
                    path.push(f); // inner first, outer last
                    f = f._;
                }
                for(let j = path.length - 1, v; j >= 0; j--) { // first: propagate from outer to inner (target last)
                    f = path[j];
                    let arr = f.eventHandlers[synthetic];
                    for(let i = 0; arr && i < arr.length; i++) {  //if(synthetic !== 'move') console.log(i, synthetic, syntheticEvent, arr[i]);
                        if(!isStopPropagation && arr[i][0]) {
                            v = arr[i][0](syntheticEvent, v); //console.log('send', arr[i][0], v);
                            if(v === false) isStopPropagation = true;
                        }
                    }
                    if(isStopPropagation) return; // stop propagating if event handler returned false
                }
                for(let j = 0, v; j < path.length; j++) { // then: propagate from inner to outer
                    f = path[j];
                    let arr = f.eventHandlers[synthetic];
                    for(let i = 0, prevent; arr && i < arr.length; i++) {
                        prevent = arr[i][1];
                        if(!isStopPropagation && prevent) {
                            v = prevent(syntheticEvent, v); //console.log({prevent, v});
                            if(v === false) isStopPropagation = true;
                        }
                    }
                    if(isStopPropagation) return; // stop propagating if event handler returned false
                }
           }

            return {
                add,
                propagate,
                intercept,
                interceptors
            };
        })({});
        context.asHtml = function(doctype) {
            let html = doctype || '<!DOCTYPE html>';
            const htmlF = context.getOOsByTagName('html')[0];
            html += htmlF.asHtml();
            return html;
        };
        context.addBootloader = function(srcOptions={}, includeOnlyOptions) {
            let options = {};
            if(includeOnlyOptions && srcOptions.options) {
                includeOnlyOptions.forEach(p => {
                    options[p] = srcOptions.options[p];
                });
            } else {
                options = srcOptions.options || {};
            }
            if(!options.ooptions) options.ooptions = {};
            options = JSON.stringify(options);
            const headF = context.getOOsByTagName('head')[0];
            //console.log(headF.ooo.elm.previousSibling);
            if(!headF) console.error('Unable to render. HTML element missing');
            const storeJson = context.storekeeper.$.asJson();
            //console.log('store:', JSON.parse(storeJson));
            headF('script')
                .attr('type', 'module')
                .attr('defer', undefined)
                //.html(`
                .noescapeHtml(`
                    import OO from '${srcOptions.path || './oo.js'}';
                    let storeFromServer = ${storeJson};
                    let optionsFromServer = ${options};
                    window.__OO__ = (ooptionsOveride, idObjF, store, context) => {
                        const ooptions = {...optionsFromServer.ooptions, ...ooptionsOveride};
                        const isBuilder = typeof idObjF === 'function';
                        const oo = OO(isBuilder ? undefined : idObjF, store || storeFromServer, context, ooptions);
                        if(isBuilder) idObjF(oo, () => {
                            //setTimeout(() => {
                            //    console.log('reload');
                                oo.context.router.reload();
                            //}, 2000);
                        }, optionsFromServer);
                        storeFromServer = null;
                        optionsFromServer = null;
                        return oo;
                    };

                    console.log('bOOt', OO.version);
                 `);
        };
        context.dokument = (function() {
            const voidElements = ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'].reduce((o, k) => {o[k] = true; return o;}, {});
            //        document wrapper for virtualization purposes
            // when a Tug is instantiated a container is created using createooo()
            // which is used as an argument when invoking OO(), which returns a function
            // which internally is referred to as "f" and externally known as "oo".
            // this "oo" reference is stored in oos[] by its "ref". since the ref is also
            // written to the resulting HTML element, you can find one by looking at the other.
            // note: when creating the "virtual DOM" (the one referenced to in oos[]) OO will either 
            // create "virtual elements" or browser generated elements, depending on ooptions.renderVirtual
            // while accessing the html elements outside of OO isnt encouraged, it will be done so, hence
            // these VirtualElement have to shim at least the common element functions so that server side rendering
            // wont break because of non-existing functions.
             function VirtualElement(tagName, xmlns) { //console.log('new VirtualElement', ...arguments);
                this.__oovelm__ = {xmlns, tagName, attributes:{}, children: []};
                this.style = {};
                this.classList = new VirtualClassList();
            }
                    // Shimmed functions
            VirtualElement.prototype.appendChild = function(elm) {
                // if elm already exists in DOM, remove it, then add to end of the  list of children of parent node.
                this.insertAdjacentElement('beforeend', elm);
            };
            VirtualElement.prototype.insertAdjacentElement = function(s, elm) {
                if(elm.parentElement) elm.parentElement.remove(elm);
                let children = this.__oovelm__.children;
                elm.parentElement = this;
                if(s === 'beforeend') { //  Just inside the targetElement, after its last child.
                    this.previousSibling = children[children.length-1];
                    children.push(elm);
                    return;
                } else if(s === 'afterbegin') { // Just inside the targetElement, before its first child.
                    this.previousSibling = null;
                    children.unshift(elm);
                    return;
                }
                elm.parentElement = this.parentElement;
                children = this.parentElement.__oovelm__.children,
                targetIndex = targetChildren.indexOf(o => o === this);
                if(s === 'beforebegin') { // Before the targetElement itself.
                    if(targetIndex - 1 < 0) this.previousSibling = null;
                    else this.previousSibling =  children[targetIndex - 1];
                    targetChildren.splice(targetIndex, 0, elm);
                } else if(s === 'afterend') { //  After the targetElement itself.
                    this.previousSibling =  children[targetIndex];
                    targetChildren.splice(targetIndex+1, 0, elm);
                } else {
                    throw 'postion not supported: ' + s;
                }
            };
            VirtualElement.prototype.setAttribute = function(name, value) {
                //this[name] = value; dont allow this, since it makes dev more bug prone
                this.__oovelm__.attributes[name] = value;
            };
            VirtualElement.prototype.getAttribute = function(name) {
                return this.__oovelm__.attributes[name];
            };
            VirtualElement.prototype.remove = function() {
                if(this.parentElement) this.parentElement.removeChild(this);
            };
            VirtualElement.prototype.removeChild = function(elm) {
                const i = this.__oovelm__.children.indexOf(o => o === elm);
                if(i >= 0) {
                    this.__oovelm__.children.splice(i, 1);
                    elm.parentElement = null;
                }
            };
                     // intentionally do nothing because OO does not support it in virtul mode
            VirtualElement.prototype.addEventListener = function() {};
            VirtualElement.prototype.getBoundingClientRect = function() {
                return {bottom:0,height:0,left:0,right:0,top:0,width:0,x:0,y:0};
            };
            VirtualElement.prototype.onclick = function() {};
                     // VirtualElement OO proprietary functions
            VirtualElement.prototype.asHtml = function() {
                const o = this.__oovelm__;
                let s = `<${o.tagName}`;
                const clazz = this.classList.asString()
                if(clazz) s += ' class="' + clazz + '"';
                for(let p in o.attributes) {
                    if(o.attributes.hasOwnProperty(p)) {
                        s += ' '+p;
                        let v = o.attributes[p];
                        if(v !== undefined) s += `="${v}"`;
                    }
                }
                s += '>';
                if(this.hasOwnProperty('innerHTML')) s += this.innerHTML;
                o.children.forEach(elm => s += elm.asHtml());
                if(!voidElements[o.tagName]) s += `</${o.tagName}>`;
                return s;
            };
            // VirtualElement has a ClassList used internally.
            function VirtualClassList() { this.list = []; }
                    // Shimmed functions
            VirtualClassList.prototype.contains = function(s) {
                return this.list.indexOf(s) >= 0;
            };
            VirtualClassList.prototype.add = function() {
                Array.from(arguments).forEach(o => this.list.push(o));
            };
            VirtualClassList.prototype.remove = function() {
                Array.from(arguments).forEach(s => {
                    const i = this.list.indexOf(s);
                    if(i >= 0) this.list.splice(i, 1);
                });
            };
            VirtualClassList.prototype.toggle = function(s, isTrue) {
                const has = this.list.indexOf(s) >= 0;
                if(isTrue === false && has) this.remove(s);
                else if(isTrue && !has) this.add(s);
                else if(has) this.remove(s);
                else this.add(s);
            };
            VirtualClassList.prototype.replace = function(old, fresh) {
                const i = this.list.indexOf(s);
                if(i >= 0) {
                    this.list[i] = s;
                }
            };
                    // VirtualClassList OO proprietary functions
            VirtualClassList.prototype.asString = function() {
                return this.list.reduce((p, n) => p+' '+n, '');
            };

            if(ooptions.renderVirtual) {
                // shim document with all the functions used by OO
                // note: dokument is only supposed to be used internally.
                return {
                    // head: set when app is instantiating such element
                    // body: set when app is instantiating such element
                    getElementsByTagName: function(tagName) {
                        return context.getOOsByTagName().map(f => f.ooo.elm);
                    },
                    getDomElementById: function(id) {
                        console.log({ooptions});
                        throw 'getDomElementById not supported when rendering virtually';
                    },
                    createElementNS: function(xmlns, tagName) {
                        return new VirtualElement(tagName, xmlns);
                    },
                    createElement: function(tagName) {
                        return new VirtualElement(tagName);
                    },
                    querySelector: function(ref) {
                        // in a browser there could be many results,
                        // here it should at most be one result and always by ref.
                        const ooo = context.byRef(ref);
                        if(ooo) return ooo.elm;
                    }
                 };
            } else {
                return document;
            }
        })();
        if(DEBUG > 1) console.log('[OO] initial context: ', context);
        context.getDomElementById = (id) => {
            return context.dokument.getElementById(id);
        };
        context.createDomElement = (tagName, ref, xmlns) => {   if(DEBUG > 0) context.debug.allocate('dom.element');
            const elm = xmlns ? context.dokument.createElementNS(xmlns,tagName) : context.dokument.createElement(tagName);
            elm.setAttribute('ref', ref);
            return elm;
        };
        context.removeElement = (elm) => {                          if(DEBUG > 0) context.debug.release('dom.element');
            if(elm.remove) elm.remove();
        };
        context.getOOsByTagName = (tagName) => {
            const arr = [];
            context.eachProp(context.oos, (f) => {
                if(f.ooo.elm && f.ooo.elm.__oovelm__.tagName === tagName) {
                    arr.push(f);
                }
            });
            return arr;
        },
        context.getDomElementsByTagName = (tagName) => {
            return context.dokument.getElementsByTagName(tagName);
        };
        context.getDomElementByRef = (ref) => {
            return context.dokument.querySelector('[ref="'+ref+'"]');
        };
        context.getBounds = (elm) => {
            let {bottom,height,left,right,top,width,x,y} = elm.getBoundingClientRect();
            return {bottom,height,left,right,top,width,x,y}; // TODO add other useful values
        };
        context.createooo = ({ref, elm, parentRef, children=[]}) => {
            // for every new real DOM element created with OO,
            // a virtual DOM element referred to as 'ooo', is created internally
            // and a function is returned. internally it is referred to as  'f' and externally as 'oo'.
            // the real DOM element is used by the browser,
            // the 'ooo' element is used to keep track of the real DOM element,
            // and the 'f' function makes it easy to chain the creation of new elements.
            // inernally theere is a map of all 'oos' created in the scope of OO.
            return {
                parentRef,
                children,
                ref,
                elm
            };
        };
        pAArent = context.createooo({ref: context.rootRef});
        context.byRef = (ref) => context.oos[ref];
        context.ooByElm = (elm) => context.oos[elm.attributes.ref.value];
        context.createIndexRef = (paarent) => {
            const pRef = paarent.ref;
            for(let i = 0; i < Number.MAX_VALUE; i++) {
                let r = pRef + '/' + i;
                if(!paarent.children.includes(r)) {
                    return i;
                }
            }
            throw 'out of bounds. parent.ref=' + paarent.ref
        };
        context.removeFromOnRemoved = (f, ff) => {
            const i = f.onRemoved.findIndex(o => o === ff);
            if(i >= 0) {
                // ...so remove it
                f.onRemoved.splice(i, 1);
            }
        };
        context.remove = (f, isPreserveElement, isPreserveChildren, debugTag) => {
            //if(DEBUG > 4) console.log('[OO] remove. ref=' + f.ref, debugTag);
            if(!f) {
                console.log('[OO] f does not exist', f);
                console.trace();
            }
            //console.log('[OO] remove. ref=' + f.ref, debugTag, f.elementName);
            const arr = f.onRemoved.slice(0); // protect aganst listeners ruining the arr
            for(let i = 0; i < arr.length; i++) { // for-loop to avoid utils.forEach Promise debug warning check
                arr[i](f); // added externally and internally (store,expression)
            }
            if(!isPreserveChildren) {
                const children = f.ooo.children.slice(0); // protect aganst listeners ruining the arr
                children.forEach(ref => { //console.log('   remove child from', debugTag, ref);
                    context.removeRef(ref, isPreserveElement);
                });
            }
            const elm = f.elm;
            if(elm && !isPreserveElement) {
                context.removeElement(elm); //elm.remove();
                f.elm = {}; // should not be needed, but IF something is holding on to f, at least clear it here
            }
            // f is most likely a children of something...
            const parentF = context.oos[f.parentRef];
            if(parentF) {
                const i = parentF.ooo.children.findIndex(ref => ref === f.ref);
                if(i >= 0) {
                    // ...so remove it
                    parentF.ooo.children.splice(i, 1);
                }
            }
            f.isDestroyed = true;
            delete context.oos[f.ref];                                  if(DEBUG > 0) context.debug.release('oo');
        };
        context.removeRef = (ref, isPreserveElement, isPreserveChildren) => { //console.log('removeRef', ref);
            //if(!context.oos[ref]) console.log('Does not exixst', ref);
            return context.remove(context.oos[ref], isPreserveElement);
        };
        context.getProp = function(f, keys, r={}) {
            for(let k in keys) {
                k = keys[k];
                let ff = f;
                while(ff) {
                    let props = ff.getProps(); //console.log(ff, props, k, k in props, keys);
                    if(k in props) {
                        if(keys.length === 1) return props[k];
                        r[k] = props[k];
                    }
                    else if(ff.ref === context.rootRef) break;
                    ff = ff.parent();
                }
            }
            return r;
        };
        context.bubble = function(f) {
            const args = [...arguments].splice(1);
            let parentF = f._;
            while(parentF) {
                for(let i = 0; i < parentF.bubbleListeners.length; i++) {
                    if(parentF.bubbleListeners[i](...args, f) === false) return;
                }
                parentF = parentF._;
            }
        };
        context.storekeeper.do(store);
        context.deflateContext = () => {
            // after rendering on server,
            // context can be exported and sent to browser client,
            // where it can be re-inflated.
            const oos = {};
            for(let p in context.oos) {
                if(Object.prototype.hasOwnProperty.call(context.oos, p)) {
                    // notice that the element itself is not stored,
                    // which informs OO that it should inspect the DOM.
                    oos[p] = {};
                }
            }
            return {
                //store: context.store
                rootRef: context.rootRef,
                oos
            };
        };

        // OO
        context.OO = function(paarent, Tug, x_prop_str, props={}, isSetup, debugTag) {
            //console.log({paarent, Tug, x_prop_str, props, debugTag});
            if(Object.prototype.toString.call(x_prop_str) === '[object Object]') {
                props = x_prop_str;
                x_prop_str = null;
            }
            for(let p in context.globalProps) {
                if(!props[p]) props[p] = context.globalProps[p]; // makes it possible to override
            }

            // CREATE
            const
                ref = isSetup ? context.rootRef : paarent.ref + '/' + (props.ref || context.createIndexRef(paarent)),
                isFunction = Tug !== null && typeof Tug !== 'string',
                elementName = (isFunction ? (props.tag || Tug.tugtag || Tug.name) : Tug).toLowerCase(),
                isReplace = props.replaceRef || props.replace,
                parentF = context.oos[paarent.ref],
                xmlns = props.xmlns || (parentF && parentF.xmlns);
            let
                domElm = context.getDomElementByRef(ref),
                currf = context.oos[ref];
           //console.log({elementName, isFunction, Tug, x_prop_str, props});

            //if(debugTag) console.log(elementName, ref, 'nbr children='+paarent.children.length);

            //if(currf && !props.ref) { throw 'ref already eixsts. ref=' + ref + ' elementName=' + currf.elementName; }
            let elm;
            if(!currf) {
                // totally new element
                if(DEBUG > 3) console.log('[OO] create. ref=' + ref, ' isSetup=', isSetup, ' elementName=' + elementName);
                if(isSetup) {
                    if(rootElement) {
                        if(DEBUG > 3) console.log('[OO] using speficied rootElement. ref=' + ref);
                        elm = rootElement;
                    } else {
                        if(DEBUG > 3) console.log('[OO] no rootElement specified. ref=' + ref);
                    }
                } else if(domElm) {
                    if(DEBUG > 3) console.log('[OO] re-using existing element. ref=' + ref);
                    if(elementName !== domElm.tagName.toLowerCase()) {
                        throw `TODO: elementName=${elementName} element=${domElm.tagName} mismatch`;
                    }
                    // note: this is NOT a replacement. its the opposite where an existing element is being
                    // re-cycled. this typically happens when HTML has been server rendered and the context
                    // has not been serialized and downloaded to client
                    elm = domElm;
                } else if(elementName) {
                    if(DEBUG > 3) console.log('[OO] creating element. ref=' + ref);
                    //console.log({isReplace, domElm});
                    elm = context.createDomElement(elementName, ref, xmlns); //console.log({elm, elementName});
                } else {
                    throw 'TODO: oo hidden from DOM';
                }
            } else if(!currf.elm) {
                ////  // there is a reference to an element but no element,
                ////  // which is to be expected if HTML text was rendered on server.
                ////  //const domElm = context.getDomElementByRef(ref);
                ////  if(domElm) {
                ////      // but exists in dom,
                ////      // which is to be expected if HTML was server rendered.
                ////      elm = domElm;
                ////      currf.elm = elm;
                ////  } else {
                      throw 'element not found in dom. ref=' + ref;
                ////  }
            } else if(isReplace) {
                elm = context.createDomElement(elementName, ref, xmlns);
                if(DEBUG > 3) console.log('[OO] create and replace. ref=' + ref);
            }
            else if(currf.elm) {
            //    // there is a reference to an element,
            //    // and and element
            //    if(currf.elementName === elementName) {
            //        if(DEBUG > 3) console.log('[OO] re-use. ref=' + ref);
            //        elm = currf.elm;
            //        context.remove(currf, true, true);
            //    } else {
                    if(DEBUG > 3) console.log('[OO] destroy existing and create. ref=' + ref);
                    context.remove(currf);
                    elm = context.createDomElement(elementName, ref, xmlns);
            //    }
            }
            // free that which
            // will not be used and should not be used any longer
            currf = null;
            domElm = null;

            if(elm) elm.setAttribute('ref', ref);
            for(let p in props) {
                if(p !== 'className' && (typeof props[p] === 'string' || xmlns)) {
                    elm.setAttribute(p, props[p]);
                }
            }
            // renderVirtual
            if(elm && ooptions.renderVirtual) {
                // there can only be one of these, so they are special case
                if(elementName === 'head') context.dokument.head = elm;
                else if(elementName === 'body') context.dokument.body = elm;
            }
            // ADD TO DOM
            let isReplaced;
            if(isReplace) {
                let replace;
                if(props.replaceRef) {
                    let replaceRef;
                    if(props.replaceRef.startsWith('r')) {
                        if(DEBUG > 5) console.log('[OO] replace by full ref. ref=' + props.replaceRef);
                        replaceRef = props.replaceRef;
                    } else {
                        if(DEBUG > 5) console.log('[OO] replace by sibling ref. ref=' + props.replaceRef);
                        replaceRef = paarent.ref  + '/' + props.replaceRef;
                    }
                    replace = context.oos[replaceRef];
                } else if(typeof props.replace === 'boolean') {
                    replace = context.oos[ref];
                    if(DEBUG > 5) console.log('[OO] replace by self ref. ref=' + replace.ref);
                } else { // has to be by pointer
                    replace = props.replace;
                    if(DEBUG > 5) console.log('[OO] replace by pointer. ref=' + replace.ref);
                }
                if(replace) {
                    const previousSibling = replace.elm.previousSibling;
                    if(previousSibling) {
                        if(DEBUG > 4) console.log('[OO] insert ref=' + ref + ' after sibling ref=' + replace.ref);
                        previousSibling.insertAdjacentElement('afterend', elm)
                        isReplaced = true;
                    } else {
                        if(DEBUG > 4) console.log('[OO] insert ref=' + ref + ' at first child of ref=' + paarent.ref);
                        paarent.elm.insertAdjacentElement('afterbegin', elm);
                        isReplaced = true;
                    }
                    context.remove(replace, null, null, debugTag);
                } else {
                    if(DEBUG > 4) console.log('[OO] nothing to replace.  ref=' + ref);
                }
            }
            if(paarent.parentRef) {
                if(!isReplaced && paarent.elm) {
                    if(DEBUG > 4) console.log('[OO] append ref=' + ref + ' to ref=' + paarent.ref);
                    paarent.elm.appendChild(elm);
                }
            }
            //remove else {
            //    if(DEBUG > 4) console.log('[OO] append ref=' + ref + ' to rootElement');
            //    console.log('rrot', rootElement);
            //    //rootElement.appendChild(elm);
            //}

            // VIRTUAL DOM
            const ooo = context.createooo({ref, elm, parentRef: paarent.ref}),
                  f = OO(null, null, context, ooptions, ooo);
            paarent.children.push(ref);
            context.oos[ref] = f;                                       if(DEBUG > 0) context.debug.allocate('oo');

                // DECORATE
            f.onRemoved = []; // traversed by context.remove
            f.ooo = ooo; // ooo is part of virtual dom to keep track of f and DOM elm
            f.oo = f; // f is a function (referred to as oo externally, so this helps with destructoring)
            f.elementName = elementName;
            f.parentRef = ooo.parentRef;
            f._ = parentF;// context.oos[ooo.parentRef];
            f.ref = ref;
            f.xmlns = xmlns;
            if(DEBUG > 1) {
                f.debugId = (debugTag ? '[ ' + debugTag + ' ] ' : '') +
                    '[ ' + (Tug.name || Tug) + ' : ' + ref + ' ] [ ' + Date.now() + '-' + Math.random() + ' ]';
                if(DEBUG > 2) {
                    console.log('[OO] created oo: ', f.debugId);
                }
            }
            f.elm = elm; //console.log({elm, rootElement});
            f.context = context;
            f.asHtml  = () => {
                let arr = [];
                if(f.elm) {
                    arr.push(f.elm);
                } else if(isSetup){
                    context.oos[ref].ooo.children.forEach(ref => {
                        arr.push(context.oos[ref].ooo.elm);
                    });
                } else throw 'bad internal state';
                return arr.reduce((s, elm) => s += elm.asHtml(), '');
            };
            f.children = () => {
                return context.oos[ref].children; // TODO probably bad code, should be ...[ref].ooo.children
            };
            f.byRef = context.byRef;
            f.parent = () => context.byRef(paarent.ref);
            f.bubbleListeners = [];
            f.bubble = function() { return context.bubble(f, ...arguments); }
            f.onbubble = (cb) => f.bubbleListeners.push(cb);
            f.html = v => f.noescapeHtml(OO.escapeHtml(v));
            f.noescapeHtml = (v) => {
                elm.innerHTML = v;
                return f;
            };
            f.text = v => f.noescapeText(OO.escapeHtml(v));
            f.noescapeText = v => {
                elm.innerText = v;
                return f;
            };
            f.noescape = v => {
                if(elm.nodeName === 'INPUT') {
                    elm.value = v;
                } else {
                    f.html(v);
                }
                return f;
            };
            f.escape = v => f.noescape(OO.escapeHtml(v));
            f.attr = function(k, v) {
                if(arguments.length === 1) return f.elm.getAttribute(k);
                f.elm.setAttribute(k, v);
                return f;
            };
                // element delegation methods
            f.style = (style_path, style) => {
                context.expressionfy(f, style_path, style, v => {
                    if(v) {
                        context.applyStyle(elm, v.$ || v);
                    }
                }, Object.prototype.toString.call(style_path) !== '[object Object]', undefined, false, true); // expressionlistener
                return f;
            };
            f.visible = (is) => {
                f.style({visibility: is ? 'visible' : 'hidden'});
                return f;
            };
            //TODO
            //f.disable = (is_path, is) => {
            //    elm.disable(context.expressionfy(f, is_path, null, ({data}) => {
            //        elm.disable = data;
            //    }, is));
            //    return f;
            //};
            f.getBoundingClientRect = () => {
                return elm.getBoundingClientRect();
            };
            f.getBounds = () => context.getBounds(elm);
            f.className = (name_path, options={}) => {
                return f.classList(name_path, {clear: true, add: true, ...options});
            };
            f.classList = function(name_path, options={}, cb) { //console.log({name_path, options});
                if(arguments.length === 1) {
                    options = name_path;
                }
                if(typeof options === 'function') {
                    cb = options;
                    options = {};
                }
                let curr;
                const {toggle, remove, add, clear, swap, replace} = options;
                let when;
                if(options.when) when = context.createWhen(options.when);
                if(name_path) {
                    context.expressionfy(f, name_path, null, v => { // expressionlistener
                        f.timer(0, () => { // timeout (sometimes) required for animations to work
                            //if(when) console.log({name_path, v}, f.elementName, when.is(v), when.transform(v));
                            const b = !when || when.is(v);
                            if(!b) return;
                            if(when) v = when.transform(v);
                            if(cb) v = cb(v);
                            if(v !== undefined) { //console.log('v='+v, {clear, add});
                                if(v === null || clear) {
                                    const classList = f.elm.classList;
                                    if(!classList) {
                                        console.log(name_path, options);
                                        parentF.i();
                                        console.trace();
                                    }
                                    while(classList.length > 0) {
                                        classList.remove(classList.item(0));
                                    }
                                }
                                if(remove) {
                                    elm.classList.remove(typeof remove === 'string' ? remove : v);
                                }
                                if(toggle) {
                                    elm.classList.toggle(typeof toggle === 'string' ? toggle : v);
                                }
                                if(add) {   // console.log('add', v);
                                    if(v.indexOf && v.indexOf(' ') > -1) v.split(' ').forEach(s => elm.classList.add(s));
                                    else elm.classList.add(typeof add === 'string' ? add : v);
                                }
                                if(replace) {
                                    elm.classList.replace(replace, v);
                                }
                                if(swap) {   //console.log({swap, curr, v});
                                    elm.classList.remove(typeof swap === 'string' ? swap : curr);
                                    if(v) elm.classList.add(v);
                                }
                                curr = v;
                            }
                        });
                    }, undefined, undefined, true, false, !!when);
                }
                return f;
            };
            f.onDestroy = (cb) => {
                f.onRemoved.push(cb);
            };
                // element shim methods
            f.eventHandlers = {};
            f.onevent = (eventType, cbArr, options) => context.eventManager.add(f, eventType, cbArr, options);
            f.onclick = (cb, options={capture:true}) => f.onevent('click', cb, options);
            f.oninput = (cb, options) => f.onevent('input', cb, options);
            f.oninputed = (cb, value, is) => {           // note: does not add async to promises, because its an event
                f.onevent('keydown', () => {
                    if(!is) {
                        is = true;
                        f.onevent('focusout', ({event}) => {
                            if(value !== oo.elm.value) {
                                value = oo.elm.value;
                                return cb({...f.oo, event, value});
                            }
                        });
                    }
                });
                return f;
            };
            // utils
            f.onscroll = (cb) => {
                OO.scroll(cb, f);
                return f;
            };
            f.onswipe = (cb, x, y, speed) => {
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
            f.prop = function() { return context.getProp(f, [...arguments]); } // will search for prop

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
OO.isiPhone = OO.isBrowser && window.navigator.platform.toLowerCase() === 'iphone';

OO.swipe = function(cb/*y, flingSpeed*/, oo, xController, yController, {dragThresholdX=3, dragThresholdY=3, speedFactorX=5, speedFactorY=10, pauseThresholdMs=100}) {
    //console.log(...arguments);
    let dataY = {}, dataX = {}, isSwiping = false;//startY, prevY, distanceY, time;
    let elm = oo.elm,
        downSet = (o, screen) => {
            o.fling = false;
            o.prev = screen;
            o.start = o.prev;
            o.distance = 0;
            o.delta = 0;
            o.screen = screen;
            o.time = Date.now();
            o.begin = true;
            o.end = false;
            o.move = false;
        },
        down = (svnt) => { //console.log('swipe DOWN', event);
            if(isSwiping) throw new Error('bad state. already swiping');
            if(oo.isDestroyed) return;
            isSwiping = true;
            if(xController) downSet(dataX, svnt.x);
            if(yController) downSet(dataY, svnt.y);
            if(xController && yController) cb(dataX, dataY);
            else if(xController) cb(dataX);
            else cb(dataY);
            // allow for bubbling event
        },
        moveSet = (o, screen, dragThreshold) => { //console.log({screen});
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
            o.drag = o.drag || Math.abs(o.distance) > dragThreshold;
            if(o.move) o.begin = false;
            o.move = Date.now();
        },
        move = (svnt) => { //console.log('swipe MOVE');
            if(!isSwiping) return;
            if(oo.isDestroyed) return;
            if(xController) moveSet(dataX, svnt.x, dragThresholdX);
            if(yController) moveSet(dataY, svnt.y, dragThresholdY);
            if(xController && yController) cb(dataX, dataY);
            else if(xController) cb(dataX);
            else cb(dataY);
        },
        upSet = (o, screen, dragThreshold, speedFactor) => {
            o.time = Date.now() - o.time; //console.log(time);
            if(!o.begin && Date.now() - o.move < pauseThresholdMs) {
                let speed = (Math.abs(o.distance) / o.time) * speedFactor;
                o.distance = Math.floor(o.distance * speed);
                o.fling = Math.abs(o.distance) > dragThreshold;
            } else {                                                                        //console.log('abort move');
                o.fling = false;
                o.distance = 0;
            }
            o.drag = false;
            o.delta = 0;
            o.move = false;
            o.end = true;
        },
        up = (svnt) => {                                           //console.log('swipe UP');
            if(!isSwiping) return;
            if(oo.isDestroyed) return;
            isSwiping = false;
            if(xController) upSet(dataX, svnt.x, dragThresholdX, speedFactorX);
            if(yController) upSet(dataY, svnt.y, dragThresholdY, speedFactorY); //console.log({dataY});
            //dataY.inversedDistance = dataY.distance*-1;
            //dataX.inversedDistance = dataX.distance*-1;
            if(xController && yController) cb(dataX, dataY);
            else if(xController) cb(dataX);
            else cb(dataY);
            return false;
        };

    oo.onevent('down', down);
    oo.onevent('move', move);
    oo.onevent('up', up);
    oo.onevent('leave', up);

    //oo.onevent('down', down, {intercept:Number.MAX_VALUE});
    //oo.onevent('move', move, {intercept:Number.MAX_VALUE});
    //oo.onevent('up', (e) => {
    //    console.log('drag intercept', e);
    //    return up(e);
    //}, {intercept:Number.MAX_VALUE});
    //oo.onevent('leave', up, {intercept:Number.MAX_VALUE});

    oo.onDestroy(() => {    //console.log('destroy swipe');
        isSwiping = false;
    });
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
        window.addEventListener('wheel', (event) => {
            //console.log('wheeler');
            return scroll(event);
        }, {passive:false});
        //window.addEventListener('mousewheel', event => { console.log('scrollwheel');
        //    return scroll(event);
        //}, {passive:false});
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
                cb = null;
                oo = null;
                elm = null;
                handler = null;
                o = null;
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
OO.version = 'v0.0.1-0.44';
export default OO;

