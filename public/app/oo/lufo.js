/**
 * LUFO - v0.0.5
 * Fri Mar  4 14:52:05 CET 2022
 *
 * Least Used First Out (LUFO) is a data structure which is friendly to caching strategies.
 *
 * This implementation is a self-organizing list (https://en.wikipedia.org/wiki/Self-organizing_list)
 * where the data is sorted whenever the list is mutated, to ensure that the sorting procedure
 * is spread out over program execution time and hence mitigate blocking behaviour.
 *
 * The implementation is simple. It is a combination of a double linked list and a map. The map
 * fascilitates low latency random access and the linked-list low latency sorting.
 *
 * The word 'cache' is internally referring to data stored in memory only, and 'storage' is intended to
 * refer to a more permanent/persistant data storage such as a web browser storage or a database.
 * Where as a cacheLufo can be synchronous, a storageLufo is more likely to depend on asynchronous accessed
 * storage medium and hence its functions are async.
 *
 * A cachedStorageLufo is a combination of a memory-based (the default) lufo and a specified storageLufo.
 * It provides fast access to most frequently used data, while ensuring that all data that is added, is also
 * added to the storage (note: data that overflow will be removed also from storage). Since the storage is
 * also behaving as a lufo, the sorted list can be larger then what can fit into the memory of the caching lufo.
 */

// TODO
//      refactor:
//              -
//
//      deprecated:
//              -
//
//      add:
//              test for add(,,,,size)
//              test for pop
//              test for double lufo
//              test for combinedLufo
//              test for splice
//              test for addPrev, addNext, removeOverflow, append

const
    MAX_USE_COUNT = 1231006505, // magic
    MBFactor = 1000000;

function createSynchronizer(jobQueue=[], isProcessing=false) {
    async function addJob(f, job={}) {
        //job.track = Math.random();
        //console.log('-- addJob -- (queue:'+jobQueue.length+')', options);
        job.promise = new Promise((resolve, reject) => {
            job.process = async () => {                         //console.log('do job', options);
                try {
                    //setTimeout(async () => {
                    const result = await f();            //console.log('     +  process resolved', options);
                    resolve(result);
                    //}, 100);
                } catch(e) {                                    //console.log('    -    process rejected', options);
                    reject(e);
                }
            };
        });
        if(isProcessing) {
            jobQueue.unshift(job);
        } else {
            isProcessing = true;
            await job.process();
            //setTimeout(async () => {
            while(jobQueue.length) {
                let job = jobQueue.pop();                       //console.log('process', job);
                await job.process();
            }
            isProcessing = false;
            //}, 0);
        }
        return job.promise;
    }

    return {
        addJob
    };
}

function fixAsync(revealed) {
    const sync = createSynchronizer();
    const o = {}
    Object.keys(revealed).map(k => {
        const f = revealed[k];
        o[k+'Async'] = function() {         // mutate function name
            return sync.addJob(async () => {       // add to job queue so that example each() can not be confused by doing add()
                return f(...arguments);
            });
        };
        o[k] = function() {
            //console.log('DEPRECATED');
            //console.trace();
            return f(...arguments);
        };
    });
    if(Object.keys(o).length) {
        revealed['async'] = o;
    }
    return revealed;
}

// DEPRECATED function fixAsync(revealed) {
//    const o = {}
//    Object.keys(revealed).map(k => {
//        const f = revealed[k];
//        if(Object.prototype.toString.call(f) === '[object AsyncFunction]') {
//            o[k+'Async'] = f; // there may be functions that does not return promises, so keep them as is
//        } else {
//            o[k] = f; // there may be functions that does not return promises, so keep them as is
//        }
//    });
//    if(Object.keys(o).length) {
//        revealed['async'] = o;
//    }
//    return revealed;
//}

let localStorage;
try {
    if(window) {
        localStorage = window.localStorage;
    }
} catch(e) {
    localStorage = (() => {
        let o = {};
        return {
            clear: () => { 
                //console.log('clear');
                o = {};
            },
            setItem: (k, v) => { 
                //console.log('set', k, v);
                o[k] = v;
            },
            getItem: (k) => {
                const v = o[k];
                //console.log('get', k, v);
                return v;
            },
            removeItem: (k) => {
                delete o[k];
                //console.log('remove', k, o[k]);
            }
        };
    })();
}

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
}

function sizeOfValue(data) {
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
}

export function createCombinedLufo() {
    /*
     * Some methods requires a named lufo and some do not.
     *
     * Use:
     *      o = createCombinedLufo()
     *      o.addLufo('permanent', databaseLufo);
     *      o.addLufo('temporary', localStorageLufo)
     *      o.addLufo('session', memoryStorageLufo)
     *      o.add('session', 'xyz', v);
     *      o.move('xyz', 'permanent', 'bubble')
     */
    const obj = {},
          arr = [];

    function addLufo(name, lufo) {
        obj[name] = lufo;
        arr.push(lufo);
    }

    async function has(key, name) {
        if(name) {
            return await obj[name].has(key);
        } else {
            return await get(key);
        }
    }

    async function useValue(key, sort) {
        const o = await use(key, sort);
        if(o) return o.value;
    }

    async function use(key, sort) {
        if(name) {
            return await obj[name].use(key, sort);
        } else {
            for(let i = 0, lufo, elm; i < arr.length; i++) {
                lufo = arr[i],
                elm = await lufo.get(key);
                if(elm) {
                    await lufo.use(key, sort);
                    return elm;
                }
            }
        }
    }

    async function get(key, name) {
        if(name) {
            return await obj[name].get(key);
        } else {
            for(let i = 0, lufo, elm; i < arr.length; i++) {
                lufo = arr[i],
                elm = await lufo.get(key);
                if(elm) {
                    return elm;
                }
            }
        }
    }

    async function getValue(key, name) {
        const o = await get(key, name);
        if(o) return o.value;
    }

    async function addPrev(atKey, key, value) {
        return obj[name].addPrev(atKey, key, value);
    }

    async function addNext(atKey, key, value) {
        return obj[name].addNext(atKey, key, value);
    }

    async function push(name, key, value) {
        return obj[name].add(key, value, 'top');
    }

    //function append(name, key, value) {
    //    const o = last();
    //    return o ? addNext(o.key, key, value) : add(key, value);
    //}

    async function add(name, key, value, sort) {
        return obj[name].add(key, value, sort);
    }

    async function pop(name, limit) {
        return obj[name].pop(limit);
    }

    async function clone(name, {maxKeys, maxSize, lufo}) {
        return obj[name].clone({maxKeys, maxSize, lufo});
    }

    async function move(key, name, sort) {
        // if element exists, move to name
        let elm, removed;
        if(name) {
            elm = await obj[name].get(key);

        } else {
            for(let i = 0, lufo, elm; i < arr.length; i++) {
                lufo = arr[i];
                elm = await lufo.get(key);
                if(elm) {
                    removed = await lufo.remove(key);
                    break;
                }
            }
        }
        if(elm) {
            removed = await obj[name].add(key, elm.value, sort);
        }
        return removed;
    }

    return fixAsync({
        addLufo,
        move,
        add,
        use,
        useValue,
        pop,
        get,
        getValue,
        has
    });
}

export function createDoubleLufo({maxKeys, maxSize, read, write}) {
    read = read ?? createLufo({maxKeys, maxSize}),
    write = write ?? createLufo({maxKeys, maxSize})

    async function flip() {
        const o = write;
        write = read;
        read = o;
    }

    async function first() {
        return await read.first();
    }

    async function last() {
        return await read.last();
    }

    async function pop(limit) {
       return await read.pop(limit);
    }

    async function prev(key) {
        return await read.prev(key);
    }

    async function next(key) {
        return await read.next(key);
    }

    async function addArray({arr, sort, key, value}) {
        key = key ?? 'key';
        value = value ?? 'value';
        for(let i = 0, elm; i < arr.length; i++) {
            elm = arr[i];
            await add(elm[key], elm[value], sort);
        }
    }

    async function addPrev(atKey, key, value) {
        if(!read.get(key)) {
            return write.addPrev(atKey, key, value);
        }
    }

    async function addNext(atKey, key, value) {
        if(!await read.get(key)) {
            return write.addNext(atKey, key, value);
        }
    }

    async function push(key, value) {
        if(!await read.get(key)) {
            return write.add(key, value, 'top');
        }
    }

    async function append(key, value) {
        if(!await read.get(key)) {
            const o = await write.last();
            return o ? await write.addNext(o.key, key, value) : await write.add(key, value);
        }
    }

    async function add(key, value, sort) {
        if(!await read.get(key)) {
            await write.add(key, value, sort);
        }
    }

    async function useValue(key, sort) {
        const o = await use(key, sort);
        if(o) return o.value;
    }

    async function use(key, sort) {
        let o = await read.use(key, sort);
        if(!o) {
            o = await write.use(key, sort);
        }
        return o;
    }

    async function has(key) {
        return await get(key);
    }

    async function get(key) {
        let o = await read.get(key);
        if(!o) {
            o = await write.get(key);
        }
        return o;
    }

    async function getValue(key) {
        const o = await get(key);
        if(o) return o.value;
    }

    async function remove(key) {
        await remove(key);
        await write.remove(key);
    }

    async function clear(buffer) {
        if(!buffer || buffer === 'read') {
            await read.clear();
        }
        if(!buffer || buffer === 'write') {
            await write.clear();
        }
    }

    async function clone(buffer, {maxKeys, maxSize, lufo}) {
        if(buffer === 'read') {
            return read.clone({maxKeys, maxSize, lufo});
        } else if(buffer === 'write') {
            return write.clone({maxKeys, maxSize, lufo});
        }
    }


    async function length(buffer) {
        if(buffer === 'read') {
            return read.length();
        } else if(buffer === 'write') {
            return write.length();
        } else {
            throw 'bad buffer';
        }
    }

    return fixAsync({
        first,
        last,
        pop,
        has,
        get,
        use,
        useValue,
        add,
        remove,
        clear,
        length
    });
}

export function createCachedStorageLufo({maxKeys, maxSize, bytes, mb, storageLufo}) {
    const cacheLufo = createLufo({maxKeys, maxSize, bytes, mb});

    async function useValue() {
        const o = await use(...arguments);
        if(o) return o.value;
    }

    async function use(key, sort) {
        let o = cacheLufo.use(key);
        if(!o) {
            o = await storageLufo.use(key);
            if(o) {
                cacheLufo.add(key, o.value, sort);
            }
        }
        return o;
    }

    async function addPrev() {
        return storageLufo.addPrev(...arguments);
    }

    async function addNext() {
        return storageLufo.addNext(...arguments);
    }

    async function push() {
        return storageLufo.push(...arguments);
    }

    async function pop(limit) {
        const o = await storageLufo.pop(limit);
        if(limit > 0) {
            return o || [];
        } else if(o) {
            await remove(o.key);
            return o;
        }
    }

    async function append(key, value) {
        const o = await last();
        return o ? await addNext(o.key, key, value) : await add(key, value);
    }

    async function add() {
        return storageLufo.add(...arguments);
    }

    async function remove(key) {
        cacheLufo.remove(key);
        await storageLufo.remove(key);
    }

    async function clear() {
        cacheLufo.clear();
        await storageLufo.clear();
    }

    async function has(key) {
        return cacheLufo.has(key) || await storageLufo.has(key);
    }

    async function get(key) {
        let o = cacheLufo.get(key);
        if(!o) {
            o = await storageLufo.get(key);
        }
        return o;
    }

    async function getValue() {
        const o = await get(...arguments);
        if(o) return o.value;
    }

    async function first() {
        return storageLufo.first();
    }

    async function last() {
        return storageLufo.last();
    }

    async function prev(key) {
        return storageLufo.prev(key);
    }

    async function next() {
        return storageLufo.next(...arguments);
    }

    async function pop(limit) {
        const o = await storageLufo.pop(limit);
        if(limit > 0) {
            return o || [];
        } else if(o) {
            await remove(o.key);
            return o;
        }
    }

    async function addDescending() {
        return storageLufo.addDescending(...arguments);
    }

    async function eachValue() {
        return storageLufo.eachValue(...arguments);
    }

    async function each() {
        return storageLufo.each(...arguments);
    }

    async function stepValue() {
        return storageLufo.stepValue(...arguments);
    }

    async function step() {
        return storageLufo.step(...arguments);
    }

    async function twoStepValue() {
        return storageLufo.twoStepValue(...arguments);
    }

    async function twoStep() {
        return storageLufo.twoStep(...arguments);
    }

    async function length() {
        return storageLufo.length();
    }

    function destroy() {
        cacheLufo.destroy();
        storageLufo.destroy();
    }

    function stop() {
        if(storageLufo.stop) return storageLufo.stop();
    }

    return fixAsync({
        get,
        getValue,
        has,
        use,
        useValue,
        add,
        addDescending,
        prev,
        next,
        pop,
        push,
        first,
        last,
        remove,
        clear,
        destroy,
        stop,
        each,
        eachValue,
        step,
        stepValue,
        twoStep,
        twoStepValue,
        length,
        getCacheLufo: () => cacheLufo,
        getStorageLufo: () => storageLufo
    });
}

export function createLocalStorageLufo({maxKeys, maxSize, bytes, mb, prefix}) {
    if(!bytes && mb) bytes = mb * MBFactor;
    if(!maxSize) maxSize = bytes; // TODO deprecate maxSize

    let lufo;
    localStorage.setItem(prefix, JSON.stringify((localStorage.getItem(prefix) && JSON.parse(localStorage.getItem(prefix))) || {})); // meta
    const storage = {
        stop: () => {}, // nothing to stop
        destroy: async () => {
            await storage.clear();
            localStorage.removeItem(prefix);
        },
        sizeOfValue: (value) => sizeOfValue(JSON.stringify(value)),
        clear: async () => {
            await lufo.each(o => storage.removeItem(o.key));
            localStorage.setItem(prefix, JSON.stringify({})); // meta
        },
        getMeta: (key) => {
            const meta = JSON.parse(localStorage.getItem(prefix)); //console.log({meta});
            return meta[key];
        },
        setMeta: (key, value) => {
            const meta = JSON.parse(localStorage.getItem(prefix));
            meta[key] = value;
            localStorage.setItem(prefix, JSON.stringify(meta));
        },
        setItem: (key, value) => {
            localStorage.setItem(prefix+key, JSON.stringify(value));
        },
        getItem: (key) => {
            const s = localStorage.getItem(prefix+key);
            try {
                return s && JSON.parse(s);
            } catch(e) {
            }
        },
        removeItem: (key) => {
            localStorage.removeItem(prefix+key);
        }

        ,debugDump: () => { console.log('=== STORAGE DUMP - LOCAL STORAGE LUFO ===');
            for(let i = 0; i < localStorage.length; i++) {
                console.log(i, JSON.parse(localStorage.getItem(localStorage.key(i))));
            }
        }
 };
    lufo = createStorageLufo({maxKeys, maxSize, storage});
    return lufo;
}

export function createRamStorageLufo({maxKeys, maxSize, prefix, load}) {
    // note: for development purposes, use createLufo instead.
    if(load) {
        throw 'load not supported for memory';
    }
    let map = {};
    map[prefix] = {};
    const storage = {
        stop: () => {},  // nothing to stop
        sizeOfValue: roughSizeOfObject,
        destroy: () => { map = null; },
        clear: () => { map = {}; },
        getMeta: (key) => map[prefix][key],
        setMeta: (key, value) => {
            const meta = map[prefix];
            meta[key] = value;
        },
        setItem: (key, value) => { map[prefix+key] = value; },
        getItem: (key) => map[prefix+key],
        removeItem: (key) => { delete map[prefix+key] }
        ,debugDump: () => { console.log('=== DEBUG LUFO - RAM STORAGE LUFO - DUMP ===', map); }
     };
    return createStorageLufo({maxKeys, maxSize, storage});
}

export function createStorageLufo({maxKeys, maxSize, storage, onOverflow}) {
    //const DEBUG_ID = Math.random() * 1000;

    // same behaviour as the default (memory-based/cache) lufo,
    // but stores data and meta-data in storage.
    // storage is likely to be accessed asynchronously
    // hence functions are async.

    async function size() {
        return storage.getMeta('valueSize');
    }

    async function splice(key, limit) {
        const arr = [];
        while(limit > 0) {
            const o = await get(key);
            arr.push(o);
            await remove(key);
            key = o.next;
            limit--;
        }
        return arr;
    }

    async function pop(limit) {
        const o = await first();
        if(limit > 0) {
            return o ? await splice(o.key, limit) : [];
        } else if(o) {
            await remove(o.key);
            return o;
        }
    }

    async function first() {
        return storage.getItem(await storage.getMeta('head'));
    }

    async function last() {
        //console.log('tai', storage.getItem(await storage.getMeta('tail')));
        //console.log('head', storage.getItem(await storage.getMeta('head')));
        //console.log('res', storage.getItem(await storage.getMeta('tail')) || await storage.getItem(await storage.getMeta('head')));
        return storage.getItem(await storage.getMeta('tail')) || await storage.getItem(await storage.getMeta('head'));
    }

    async function length() {
        return storage.getMeta('keyCount') || 0;
    }

    async function has(key) {
        return storage.getItem(key);
    }

    async function get(key) {
        return storage.getItem(key);
    }

    async function getValue(key) {
        const o = await get(key);
        if(o) return o.value;
    }

    async function prev(key) {
        return storage.getItem((await storage.getItem(key)).prev);
    }

    async function next(key) {
        return storage.getItem((await storage.getItem(key)).next);
    }

    async function useValue(key) {
        const o = await use(key);
        if(o) return o.value;
    }

    async function use(key) { // bump one step close to first
       // console.log(DEBUG_ID, 'use', key);
        const o = await storage.getItem(key);
        if(o) {
            if(o.use < MAX_USE_COUNT /* magic value */) {
                o.use++;
            }
            const head = await storage.getMeta('head'),
                  tail = await storage.getMeta('tail');
            if(o.key !== head) {
                const id = Math.random();
                const prevObj = await storage.getItem(o.prev), //|| {},
                      nextObj = await storage.getItem(o.next); //|| {};
                //console.log(o);
                if(prevObj.key === head) {
                    o.prev = null;
                    await storage.setMeta('head', o.key); // store head
                } else {
                    const prevPrevObj = await storage.getItem(prevObj.prev);
                    prevPrevObj.next = o.key;
                    await storage.setItem(prevPrevObj.key, prevPrevObj); // store prev.prev
                    //if(prevPrevObj.key === head) {
                    //    storage.setMeta('head', prevPrevObj); // store head
                    //}
                }
                o.prev = prevObj.prev;
                o.next = prevObj.key;
                await storage.setItem(o.key, o); // store o
                prevObj.prev = o.key;
                if(o.key === tail) {
                    prevObj.next = null;
                    await storage.setMeta('tail', prevObj.key); // store tail
                } else {
                    //try {
                    nextObj.prev = prevObj.key;
                    prevObj.next = nextObj.key;
                    //} catch(e) {
                    //    console.log(DEBUG_ID, '***********CRASHED');
                    //    storage.debugDump();
                    //    throw e;
                    //}
                    await storage.setItem(nextObj.key, nextObj); // store next
                }
                await storage.setItem(prevObj.key, prevObj); // store prev
            }
        }
        return o;
    }

    async function push(key, value) {
        return add(key, value, 'top');
    }

    async function append(key, value) {
        const o = await last();
        return o ? addNext(o.key, key, value) : add(key, value);
    }
                                                                //const lufoDevID = Math.random();
    async function add(key, value, sort, size) {
        //console.log(DEBUG_ID, 'add', key);
        // returns false if object was not added, arr of removed if added
        const itemObj = createItem(key, value, size);
        if(!itemObj) {
            return;
        }

        const o = await storage.getItem(key);
        if(o) { //console.log('object already exists...');
            if(sort === 'top') {
                await remove(key); // ...put object on top.
            } else {
                if(o.value !== value || o.size !== size) {
                    o.value = value; // ...update its content...
                    o.size = size;
                    await storage.setItem(key, o);
                }
                if(sort) { // ...sort it
                    if(sort === 'bubble') { // transpose
                        await use(key);
                    } else {
                        throw 'bad sort';
                    }
                }
                return;
            }
        }

        // sort
        const old = await storage.getItem(await storage.getMeta('head')),
              headObj = itemObj;
        if(old) {
            headObj.next = old.key;
            old.prev = headObj.key;
            await storage.setItem(old.key, old);
            if(!await storage.getMeta('tail')) {
                //console.log('set new tail to ', old.key);
                await storage.setMeta('tail', old.key);
            }
        }
        await storage.setMeta('head', headObj.key);

        await storage.setItem(key, headObj);
        let keyCount = await storage.getMeta('keyCount') ?? 0;
        keyCount++;
        await storage.setMeta('keyCount', keyCount);

        return removeOverflow(itemObj.size);
     }

    async function addPrev(atKey, key, value, size) {
        if(atKey === key) return;
        await remove(key);
        const atObj = await storage.getItem(atKey);
        if(atObj) {
            const head = await storage.getMeta('head');
            if(atKey === head) {
                return add(key, value, 'top');
            } else {
                const itemObj = createItem(key, value, size),
                      prevObj = await storage.getItem(atObj.prev);
                prevObj.next = key;
                itemObj.prev = prevObj.key;
                itemObj.next = atKey;
                atObj.prev = itemObj.key;
                await storage.setItem(itemObj.key, itemObj);
                await storage.setItem(atObj.key, atObj);
                await storage.setItem(prevObj.key, prevObj);
                await storage.setMeta('keyCount', await storage.getMeta('keyCount') + 1);
                return removeOverflow(itemObj.size);
            }
        }
    }

    async function addNext(atKey, key, value, size) {
        if(atKey === key) return;
        await remove(key);
        const atObj = await storage.getItem(atKey);
        if(atObj) {
            const tail = await storage.getMeta('tail'),
                  itemObj = createItem(key, value, size);
            if(!tail || atKey === tail) {
                await storage.setMeta('tail', key);
            } else {
                itemObj.next = atObj.next;
                const nextObj = await storage.getItem(atObj.next);
                nextObj.prev = key;
                await storage.setItem(nextObj.key, nextObj);
            }
            itemObj.prev = atKey;
            atObj.next = key;
            await storage.setItem(itemObj.key, itemObj);
            await storage.setItem(atObj.key, atObj);
            await storage.setMeta('keyCount', await storage.getMeta('keyCount') + 1);
            return removeOverflow(itemObj.size);
        }
    }

    async function addDescending(key, value, prop) {
        // TODO optimize by reducing search range, by means of adding a memory (lastDescending)
        const keyCount = await length();
        const head = await first();
        const v = value[prop]; //console.log('addDescending ----------------\r\n', {key, value, prop, v, head, tail});
        if(!keyCount || head.value[prop] <= v) { //console.log('will add as head. head key=', debugDumpItem(head?.key));
            // add to top beuacse if head existed it was less
            const o = await add(key, value, 'top'); //console.log('added as head. head key=', debugDumpItem(head.key));
            return o;
        } else {
            const tail = await last();
            if(!tail || tail.value[prop] >= v) { //console.log('will add as tail. tail key=', debugDumpItem(tail?.key), {tail});
                // add to bottom because if tail existed it was greater
                const o = await append(key, value); //console.log('added as tail. tail key=', debugDumpItem(tail?.key), {tail});
                return o;
            }
        }
        // search between head and tail,
        // until finding element which is lower
        let o = head;
        while(o) { //console.log({o});
            //map[key].next;
            if(o.value[prop] <= v) break;
            o = await next(o.key);
        }
        return addPrev(o.key, key, value); // has to be lower, so add before
    }

    function createItem(key, value, size) {
        if(maxSize && !size) {
            size = storage.sizeOfValue(value);
            if(size > maxSize) {
                return;
            }
        }
        return {key, value, size, use: 0};
    }

    async function removeOverflow(sizeIncrease) {
        // limit
        const removed = [];
        if(maxKeys) {
            const keyCount = await storage.getMeta('keyCount');
            if(keyCount > maxKeys) {
                const o = await remove((await last()).key);
                // TODO if memory do not allow for this item.value = null;
                await removed.push(o);
            }
        }
        if(maxSize) {
            let valueSize = await storage.getMeta('valueSize') ?? 0;
            valueSize += sizeIncrease;
            await storage.setMeta('valueSize', valueSize);
            while(valueSize > maxSize) {
                valueSize = await storage.getMeta('valueSize');
                const o = await remove((await last()).key);
                // TODO if memory do not allow for this item.value = null;
                removed.push(o);
            }
        }

        if(onOverflow) await onOverflow(removed);

        return removed;
    }

    async function remove(key, isDebug) {
        const o = await storage.getItem(key);
        if(o) {
            let head = await storage.getMeta('head'),
                tail = await storage.getMeta('tail');
            const nextObj = await storage.getItem(o.next),
                  prevObj = await storage.getItem(o.prev),
                  isHead = head === o.key,
                  isTail = tail === o.key,
                  hasTail = nextObj;
            if(isHead) {
                if(hasTail) {
                    nextObj.prev = null;
                    await storage.setItem(nextObj.key, nextObj);
                    await storage.setMeta('head', nextObj.key);
                } else {
                    await storage.setMeta('head', null);
                }
            } else if(isTail) {
                if(prevObj.key === head) {
                    prevObj.next = null;
                    await storage.setItem(prevObj.key, prevObj);
                    await storage.setMeta('tail', null);
                } else {
                    prevObj.next = null;
                    await storage.setItem(prevObj.key, prevObj);
                    await storage.setMeta('tail', prevObj.key);
                }
            } else {
                if(isDebug) console.log({key, prev, next});
                prevObj.next = nextObj ? nextObj.key : null;
                await storage.setItem(prevObj.key, prevObj);
                if(nextObj) {
                    nextObj.prev = prevObj.key;
                    await storage.setItem(nextObj.key, nextObj);
                }
            }
            await storage.removeItem(key); // remove curr

            // limit
            let keyCount = await storage.getMeta('keyCount');
            keyCount--;
            await storage.setMeta('keyCount', keyCount);
            if(maxSize) {
                const valueSize = await storage.getMeta('valueSize') - o.size;
                await storage.setMeta('valueSize', valueSize);
            }

            return o;
        }
    }

    async function clear() {
        await storage.clear();
    }

    async function clone({maxKeys, maxSize, lufo}) {
        lufo = lufo ?? createLufo({maxKeys, maxSize});
        await each(async (o) => {
            await lufo.add(o.key, o.value);
        });
        return lufo;
    }

    // this function should be 100% same behaviour as in default lufo so,
    // copy+pasted from createLufo and added async.
    async function eachValue(options_cb={}, cb, arr) {
        if(typeof options_cb === 'function') {
            cb = options_cb;
            options_cb = {};
        }
        options_cb.value = true;
        return each(options_cb, cb, arr);
    }

    // this function should be 100% same behaviour as in default lufo so,
    // copy+pasted from createLufo and added async.
    async function each(options_cb={}, cb, arr) {
        if(typeof options_cb === 'function') {
            cb = options_cb;
            options_cb = {};
        }
        let {index=0, key, limit=0, value=false, reverse=false} = options_cb;
        if(!cb && !arr) arr = [];
        let curr;
        if(!key) {
            if(reverse) {
                curr = await last();
             } else {
                key = await storage.getMeta('head');
                curr = await storage.getItem(key);
            }
        } else {
            curr = await storage.getItem(key);
            index = 0;
        }
        let i = 0, cnt = 0;
        if(reverse) i = await length();
        //if(options_cb.debug) console.log('lufo.each', {i, cnt, index, key, curr, limit, len: await length()});
        while(curr) { //console.log(i, index, curr);
            if(reverse ? i <= index : i >= index) {
                let o = value ? curr.value : curr;
                if(!o) break;
                if(!cb) arr.push(o);
                else {                                                      //console.log('cnt='+cnt, 'limit='+limit);
                    let v = await cb(o, cnt);
                    if(v === false) break;
                    if(arr) arr.push(v);
                    cnt++;
                }

                if(limit) {
                    limit--;
                    if(limit === 0) break;
                }
            }
            if(reverse) {
                curr = await storage.getItem(curr.prev);
                i--;
            } else {                                                        //console.log('curr=', {...curr});
                curr = await storage.getItem(curr.next);                    //console.log('curr.next=', {...curr});
                i++;
            }
        }
        return arr;
    }

    // this function should be 100% same behaviour as in default lufo so,
    // copy+pasted from createLufo and added async.
    async function stepValue(options={}, cb) {
        options.value = true;
        return step(options, cb);
    }

    // this function should be 100% same behaviour as in default lufo so,
    // copy+pasted from createLufo and added async.
    async function step({index=0, value=false, limit}, cb) {
        if(index >= await length()) {
            index = 0;
        }
        let curr;
        const
            next = async () => {
                if(!curr) return;
                index++;
                if(limit) limit--;
                const r = value ? curr.value : curr;
                curr = await storage.getItem(curr.next);
                return r;
            },
            nextAsync = next,
            reset = async () => {
                const headKey = await storage.getMeta('head');
                curr = await storage.getItem(headKey);
                let i = 0;
                while(curr && i < index) { // optmz: replace loop
                    curr = await storage.getItem(curr.next);
                    i++;
                }
                if(curr) {
                    index = i;
                }
            },
            resetAsync = reset,
            hasMore = () => {
                return !!curr && limit !== 0;
            },
            getIndex = () => {
                return index;
            };
        await reset();
        if(cb) {
            let cnt = 0;
            while(hasMore()) {
                if(await cb(await next(), cnt) === false) break;
                cnt++;
            }
        }
        return {
            next,
            nextAsync,
            reset,
            resetAsync,
            hasMore,
            getIndex
        };
    }

    // this function should be 100% same behaviour as in default lufo so,
    // copy+pasted from createLufo and added async.
    async function twoStepValue(options={}, cb) {
        options.value = true;
        return twoStep(options);
    }

    // this function should be 100% same behaviour as in default lufo so,
    // copy+pasted from createLufo and added async.
    async function twoStep({index1=0, index2=0, value=false, limit}, cb) {
        // func will step one key at the time, but will alternate
        // between two positions when delivering the result.
        //
        //console.log('* * * * * * index2=', index2, 'length=', length())
        let isA = true;
        let step1Limit, step2Limit;
        if(index1 < index2) {
            step1Limit = index2-index1;
        } else {
            step2Limit = index1-index2;
        }
        const
            a = await step({index: index1, limit: step1Limit, value}),
            b = await step({index: index2, limit: step2Limit, value}),
            next = async () => {
                if(limit) limit--;

                if(isA) {
                    if(b.hasMore()) isA = false;
                    //console.log('A');
                    return a.next();
                }

                if(a.hasMore()) isA = true;
                //console.log('B');
                return b.next();
            },
            nextAsync = next,
            getIndices = () => {
                // ensure that index1 is always less then index2,
                // otherwise if index2 starts of at zero and index1 is reset to zero outside on each invocation,
                // index2 will never advance forward, rendering the whole point of twostep mute.
                let i1 = a.getIndex(),
                    i2 = b.getIndex();
                if(i1 > i2) {
                    const i = i2;
                    i2 = i1;
                    i1 = i;
                }
                return [i1, i2];
            },
            hasMore = () => {
                return limit !== 0 && (a.hasMore() || b.hasMore());
            };
        if(cb) {
            while(hasMore()) {
                if(await cb(next()) === false) break;
            }
        }
        return {
            getIndices,
            hasMore,
            next,
            nextAsync
        };
    }

    async function destroy() {
        await storage.destroy();
    }

    function stop() {
        storage.stop();
    }

    return fixAsync({
        has,
        get,
        getValue,
        use,
        useValue,
        add,
        addDescending,
        push,
        remove,
        clear,
        stop,
        destroy,
        first,
        last,
        prev,
        next,
        size,
        length,
        each,
        eachValue,
        step,
        stepValue,
        twoStep,
        twoStepValue
    });
}

export function createLufo({maxKeys=0, maxSize=0, bytes, mb, onOverflow}) {
    if(!bytes && mb) bytes = mb * MBFactor;
    if(!maxSize) maxSize = bytes; // TODO deprecate maxSize

    // use will make value propagate to head
    // prev.prev...prev is head
    // next.next...next is tail
    // head never same as tail
    // head can be first and last
    // tail can only be last
    let map = {},
        keyCount = 0,
        valueSize = 0,
        head,
        tail;

    function size() {
        return valueSize;
    }

    function setOnOverflow(cb) {
        onOverflow = cb;
    }

    function splice(key, limit) {
        const arr = [];
        while(limit > 0) {
            const o = get(key);
            arr.push(o);
            remove(key);
            key = o.next;
            limit--;
        }
        return arr;
    }

    function pop(limit) {
        const o = head;
        if(limit > 0) {
            return o ? splice(o.key, limit) : [];
        } else if(o) {
            remove(o.key);
            return o;
        }
    }

    function first() {
        return head;
    }

    function last() {
        return tail || head;
    }

    function length() {
        return keyCount;
    }

    function has(key) {
        return !!map[key];
    }

    function get(key) { //console.log('get', key, map[key]);
        return map[key];
    }

    function getValue(key, isDebug) {
        const o = get(key); if(isDebug) console.log('getValue', {key, o, head});
        if(o) return o.value;
    }

    function prev(key) {
        return map[key].prev;
    }

    function next(key) { //console.log({key});
        return map[key].next;
     }

    function useValue(key) {
        const o = use(key);
        if(o) return o.value;
    }

    function use(key) { // bump one step close to first
        const o = map[key];
        if(o) {
            if(o.use < MAX_USE_COUNT /* magic value */) {
                o.use++;
            }
            if(o !== head) {
                const prev = o.prev,
                      next = o.next;
                if(prev === head) {
                    head = o;
                    head.prev = null;
                } else {
                    prev.prev.next = o;
                }
                o.prev = prev.prev;
                o.next = prev;
                prev.prev = o;
                if(o === tail) {
                    tail = prev;
                    tail.next = null;
                } else {
                    next.prev = prev;
                    prev.next = next;
                }
            }
        } //console.log('use', {key, o});
        return o;
    }

    function push(key, value, size) {
        return add(key, value, 'top', size);
    }

    function append(key, value, size) {
        const o = last(); //console.log('append', key, ' last key=', o?.key);
        return o ? addNext(o.key, key, value, size) : add(key, value, size);
    }

    function add(key, value, sort, size){//, isDebug) { if(isDebug)console.log('add', {key, value, sort, map, has:has(key)});
        //console.log(key, value);
        //if(!value) console.trace();
        // returns false if object was not added, arr of removed if added
        const item = createItem(key, value, size); //console.log({key, value, item});
        //if(isDebug) console.log({head});
        if(!item) {
            return;
        }

        const o = map[key];
        if(o) { // object already exists...
            if(sort === 'top') {
                remove(key); // ...put object on top.
            } else {
                o.value = value; // ...update its content...
                o.size = item.size;
                if(sort) { // ...sort it
                    if(sort === 'bubble') {
                        use(key);
                    } else {
                        throw 'bad sort';
                    }
                }
                return;
            }
        }

        // sort
        const old = head;
        head = item;
        if(old) {
            head.next = old;
            old.prev = head;
            if(!tail) {
                tail = old;
            }
        }

        map[key] = head;
        keyCount++;

        return removeOverflow(item.size);
    }

    function addPrev(atKey, key, value, size) {
        if(atKey === key) return;
        remove(key);
        const at = map[atKey];
        if(at) {
            if(at === head) {
                return add(key, value, 'top');
            } else {
                const item = createItem(key, value, size);
                item.prev = at.prev;
                item.prev.next = item;
                item.next = at;
                at.prev = item;
                map[key] = item;
                keyCount++;
                return removeOverflow(item.size);
            }
        }
    }

    function addNext(atKey, key, value, size) { //console.log('-------------->addNext', {atKey, key});
        if(atKey === key) return;
        remove(key);
        const at = map[atKey];
        const item = createItem(key, value, size);
        if(!tail || at === tail) {
            tail = item; //console.log('replacing tail with', {key, tail});
        } else if(at) {
            item.next = at.next;
            item.next.prev = item;
        }
        if(at) {
            item.prev = at;
            at.next = item;
        }
        map[key] = item;
        keyCount++;
        return removeOverflow(item.size);
    }

    function debugDumpItem(key) {
        const o = get(key);
        console.log({o});
        if(o) return `key=${o.key} prev=${o?.prev?.key} next=${o?.next?.key} value=${o.value}`;
    }

    function addDescending(key, value, prop) {
        // TODO optimize by reducing search range, by means of adding a memory (lastDescending)
        const v = value[prop]; //console.log('addDescending ----------------\r\n', {key, value, prop, v, head, tail});
        if(!keyCount || head.value[prop] <= v) { //console.log('will add as head. head key=', debugDumpItem(head?.key));
            // add to top beuacse if head existed it was less
            const o = add(key, value, 'top'); //console.log('added as head. head key=', debugDumpItem(head.key));
            return o;
        } else if(!tail || tail.value[prop] >= v) { //console.log('will add as tail. tail key=', debugDumpItem(tail?.key), {tail});
            // add to bottom because if tail existed it was greater
            const o = append(key, value); //console.log('added as tail. tail key=', debugDumpItem(tail?.key), {tail});
            return o;
        }
        // search between head and tail,
        // until finding element which is lower
        let o = head;
        while(o) { //console.log('v='+v, map[o.key], {map});
            //map[key].next;
            if(o.value[prop] <= v) break;
            o = next(o.key);
        }
        return addPrev(o.key, key, value); // has to be lower, so add before
    }

    function createItem(key, value, size) {
        if(!key) throw 'bad key. key= ' + key;
        if(maxSize && !size) {
            size = roughSizeOfObject(value);
            if(size > maxSize) {
                return;
            }
        }
        return {key, value, size, use: 0};
    }

    function removeOverflow(sizeIncrease) {
        // limit
        let removed = [];
        if(maxKeys) {
            if(keyCount > maxKeys) {
                //if(onOverflow) console.log('---------------->', {keyCount, maxKeys}, last());
                removed.push(remove(last().key));
            }
        }
        if(maxSize) {
            valueSize += sizeIncrease;
            while(valueSize > maxSize) {
                removed.push(remove(last().key));
            }
        }

        if(onOverflow) onOverflow(removed);

        return removed;
    }

    function remove(key, isDebug) { //log('remove', {key, map});
        const o = map[key];
        if(o) {
            const next = o.next,
                  prev = o.prev,
                  isHead = head === o,
                  isTail = tail === o,
                  hasTail = next;
            if(isHead) {
                if(hasTail) {
                    head = next;
                    head.prev = null;
                } else {
                    head = null;
                }
            } else if(isTail) {
                if(prev === head) {
                    tail = null;
                    head.next = null;
                } else {
                    tail = prev;
                    tail.next = null;
                }
            } else {
                //if(isDebug) console.//log({key, prev, next});
                prev.next = next;
                next.prev = prev;
            }
            delete map[key];

            // limit
            keyCount--;
            if(maxSize) {
                valueSize -= o.size;
            }

            return o;
        }
    }

    function eachValue(options_cb={}, cb, arr) {
        if(typeof options_cb === 'function') {
            cb = options_cb;
            options_cb = {};
        }
        options_cb.value = true;
        return each(options_cb, cb, arr);
    }

    function each(options_cb={}, cb, arr) {
        if(typeof options_cb === 'function') {
            cb = options_cb;
            options_cb = {};
        }
        let {index=0, key, limit=0, value=false, reverse=false} = options_cb;
        if(!cb && !arr) arr = [];
        let curr;
        if(!key) {
            if(reverse) curr = last();
            else curr = head;
        } else {
            curr = get(key);
            index = 0;
        }
        let i = 0, cnt=0;
        if(reverse) i = length();
        while(curr) { //console.log(i, index, curr);
            if(reverse ? i <= index : i >= index) {
                let o = value ? curr.value : curr;
                if(!o) break;
                if(!cb) arr.push(o);
                else {
                    let v = cb(o, cnt);
                    if(v === false) break;
                    if(arr) arr.push(v);
                    cnt++;
                }

                if(limit) {
                    limit--;
                    if(limit === 0) break;
                }
            }
            if(reverse) {
                curr = curr.prev;
                i--;
            } else {
                curr = curr.next;
                i++;
            }
        }
        return arr;
    }

    function stepValue(options={}, cb) {
        options.value = true;
        return step(options, cb);
    }

    function step({index=0, value=false, limit}, cb) {
        if(index >= length()) {
            index = 0;
        }
        let curr;
        const
            next = () => {
                if(!curr) return;
                index++;
                if(limit) limit--;
                const r = value ? curr.value : curr;
                curr = curr.next;
                return r;
            },
            reset = () => {
                curr = head;
                let i = 0;
                while(curr && i < index) { // optmz: replace loop
                    curr = curr.next;
                    i++;
                }
                if(curr) {
                    index = i;
                }
            },
            hasMore = () => {
                return !!curr && limit !== 0;
            },
            getIndex = () => {
                return index;
            };
        reset();
        if(cb) {
            let cnt = 0;
            while(hasMore()) {
                if(cb(next(), cnt) === false) break;
                cnt++;
            }
        }
        return {
            next,
            hasMore,
            getIndex
        };
    }

    function twoStepValue(options={}, cb) {
        options.value = true;
        return twoStep(options, cb);
    }

    function twoStep({index1=0, index2=0, value=false, limit}, cb) {
        // func will step one key at the time, but will alternate
        // between two positions when delivering the result.
        //
        //console.log('* * * * * * index2=', index2, 'length=', length())
        let isA = true;
        let step1Limit, step2Limit;
        if(index1 < index2) {
            step1Limit = index2-index1;
        } else {
            step2Limit = index1-index2;
        }
        const
            a = step({index: index1, limit: step1Limit, value}),
            b = step({index: index2, limit: step2Limit, value}),
            next = () => {
                if(limit) limit--;

                if(isA) {
                    if(b.hasMore()) isA = false;
                    //console.log('A');
                    return a.next();
                }

                if(a.hasMore()) isA = true;
                //console.log('B');
                return b.next();
            },
            getIndices = () => {
                // ensure that index1 is always less then index2,
                // otherwise if index2 starts of at zero and index1 is reset to zero outside on each invocation,
                // index2 will never advance forward, rendering the whole point of twostep mute.
                let i1 = a.getIndex(),
                    i2 = b.getIndex();
                if(i1 > i2) {
                    const i = i2;
                    i2 = i1;
                    i1 = i;
                }
                return [i1, i2];
            },
            hasMore = () => {
                return limit !== 0 && (a.hasMore() || b.hasMore());
            };
        if(cb) {
            while(hasMore()) {
                if(cb(next()) === false) break;
            }
        }
        return {
            getIndices,
            hasMore,
            next
        };
    }

    function clone({maxKeys, maxSize, lufo}) {
        lufo = lufo || createLufo({maxKeys, maxSize});
        each(o => lufo.add(o.key, o.value));
        return lufo;
    }

    function clear() { //console.log('clear', {map, head, tail});
        map = {};
        keyCount = 0;
        valueSize = 0;
        head = null;
        tail = null;
    }

    function destroy() {
        clear();
    }

    return fixAsync({
        has,
        get,
        getValue,
        use,
        useValue,
        add,
        addDescending,
        push,
        remove,
        first,
        last,
        prev,
        next,
        size,
        length,
        step,
        stepValue,
        twoStep,
        twoStepValue,
        each,
        eachValue,
        clear,
        destroy,
        setOnOverflow,
        debug: {
            map
        }
     });
}

(async function() {
    try {
        console.log('test lufo');
        let LOG, lufo,
            prefix = 'lufotest-' + Date.now();
        async function dump(s, l) {
            //l = l || lufo;
            //if(LOG > 1) {
            //    console.log(s, await l.length());
            //    await l.each((o, i, isHead, isTail) => {
            //        console.log(i, o,
            //            o.prev ? 'prev='+(o.prev.key || o.prev) : 'head='+isHead,
            //            o.next ? 'next='+(o.next.key || o.next) : 'tail='+isTail);
            //    });
            //}
        }
        function eqArr(arr, expected) {
            arr.forEach((elm, i) => eq(elm, expected[i]));
        }
        function eq(found, expected) {
            if(found !== expected) throw new Error(`assert failed: expected(${expected}) found(${found})`);
        }
        function assert(o, expected, propName) {
            const found = propName ? o.value[propName] : o.value;
            if(found !== expected) {
                console.error('ASSERTION ERROR LUFO', {expected, found, o})
                throw new Error(`assert failed: expected(${expected}) found(${found})`);
            };
        }
        async function create(creator, nbrObjects, {maxKeys, maxSize}) {
            if(lufo) await lufo.destroy();
            lufo = creator({maxKeys, maxSize});
            for(let i = 0; i < nbrObjects; i++) {
                await lufo.add('k'+i, 'v'+i);
            }
        }
        async function testLufo(creator, expectedSize) {
            await create(creator, 4, {});                   await dump('after init get,first,last,add,use');
            assert(await lufo.get('k'+0), 'v'+0);
            assert(await lufo.get('k'+2), 'v'+2);
            assert(await lufo.first(), 'v'+3);
            assert(await lufo.last(), 'v'+0);
            await lufo.add('k'+1, 'v'+1);                   await dump('after add k1 no sort');
            await lufo.add('k'+1, 'v'+1);                   await dump('after add k1 no sort');
            assert(await lufo.prev((await lufo.last()).key), 'v'+1);
            await lufo.push('k'+1, 'v'+1);                  await dump('after add k1 sort by top');
            assert(await lufo.prev((await lufo.last()).key), 'v'+2);
            assert(await lufo.first(), 'v'+1);
            await lufo.add('k'+2, 'v'+2, 'bubble');         await dump('after add k2 sort by bubble');
            assert(await lufo.next((await lufo.first()).key), 'v'+2);
            await lufo.use('k'+2, 'v'+2, 'bubble');         await dump('after use k2 - bubble ');
            assert(await lufo.first(), 'v'+2);
            assert(await lufo.next((await lufo.first()).key), 'v'+1);
            await lufo.use('k'+2, 'v'+2, 'bubble');         await dump('after use k2 - already on top');
            assert(await lufo.first(), 'v'+2);
            await lufo.use('k'+0, 'v'+0, 'bubble');         await dump('after use k0');
            assert(await lufo.last(), 'v'+3);
            assert(await lufo.prev((await lufo.last()).key), 'v'+0);
            await lufo.clear();

            await create(creator, 3, {maxKeys: 2});         await dump('test max nbr keys');
            assert({value: await lufo.length()}, 2);
            assert(await lufo.first(), 'v'+2);
            assert(await lufo.last(), 'v'+1);
            await lufo.clear();

            await create(creator, 30, {maxSize: 150});      await dump('test max size');
            assert({value: await lufo.size()}, expectedSize);
            await lufo.clear();

            await create(creator, 2, {});                   await dump('test remove tail');
            await lufo.remove('k'+0);                       await dump('after remove k0');
            assert({value: await lufo.length()}, 1);
            await lufo.remove('k'+1);                       await dump('after remove k1');
            assert({value: await lufo.length()}, 0);
            await lufo.clear();

            await await dump('test descending');
            await create(creator, 0, {});
            await lufo.addDescending('k'+1, {v:'v'+1, p: 1}, 'p');
            assert(await lufo.first(), 'v'+1, 'v');
            await lufo.addDescending('k'+2, {v:'v'+2, p: 2}, 'p');
            assert(await lufo.first(), 'v'+2, 'v');
            assert(await lufo.last(), 'v'+1, 'v');
            await lufo.addDescending('k'+3, {v:'v'+3, p: 3}, 'p');
            assert(await lufo.first(), 'v'+3, 'v');
            assert(await lufo.last(), 'v'+1, 'v');
            await lufo.addDescending('k'+4, {v:'v'+4, p: 4}, 'p');
            assert(await lufo.first(), 'v'+4, 'v');
            assert(await lufo.last(), 'v'+1, 'v');
            await lufo.clear();
            await create(creator, 0, {});
            await lufo.addDescending('k'+4, {v:'v'+4, p: 4}, 'p');
            await lufo.addDescending('k'+2, {v:'v'+2, p: 2}, 'p');
            assert(await lufo.first(), 'v'+4, 'v');
            assert(await lufo.last(), 'v'+2, 'v');
            await lufo.addDescending('k'+3, {v:'v'+3, p: 3}, 'p');
            assert(await lufo.first(), 'v'+4, 'v');
            assert(await lufo.last(), 'v'+2, 'v');
            assert({value: await lufo.length()}, 3);
            await lufo.addDescending('k'+1, {v:'v'+1, p: 1}, 'p');
            assert(await lufo.last(), 'v'+1, 'v');
            assert({value: await lufo.length()}, 4);
            await lufo.addDescending('k'+5, {v:'v'+5, p: 5}, 'p');
            assert(await lufo.first(), 'v'+5, 'v');
            for(let i = 5, k = (await lufo.first()).key; i >= 1; i--, i > 0 && (k = (await lufo.next(k)).key)) assert({value: await lufo.getValue(k)}, 'v'+i, 'v');
            await lufo.addDescending('k'+6, {v:'v'+5, p: 5}, 'p');
            await lufo.addDescending('k'+7, {v:'v'+4, p: 4}, 'p');
            await lufo.addDescending('k'+8, {v:'v'+0, p: -1}, 'p');
            assert({value: (await lufo.first()).key}, 'k6');
            assert(await lufo.first(), 'v'+5, 'v');
            assert(await lufo.last(), 'v'+0, 'v');
            await lufo.clear();
        }

        async function testCachedStorageLufo(creator) {
            lufo = creator();
            for(let i = 0; i < 10; i++) {
                await lufo.add('k'+i, 'v'+i);
            }
            await dump('after initial, cacheLufo=', lufo.getCacheLufo());
            await dump('after initial, storageLufo=', lufo.getStorageLufo());
            assert({value: lufo.getCacheLufo().length()}, 0);
            assert({value: await lufo.getStorageLufo().length()}, 10);
            await lufo.use('k5');
            assert({value: lufo.getCacheLufo().length()}, 1);
            assert(lufo.getCacheLufo().first(), 'v5');
            assert(await lufo.getStorageLufo().first(), 'v9');
            await lufo.use('k8');
            assert(lufo.getCacheLufo().first(), 'v8');
            assert(await lufo.getStorageLufo().first(), 'v8');
            await lufo.remove('k8');
            await dump('after remove k8, cacheLufo=', lufo.getCacheLufo());
            await dump('after remove k8, storageLufo=', lufo.getStorageLufo());
            assert(lufo.getCacheLufo().last(), 'v5');
            assert(await lufo.getStorageLufo().first(), 'v9');
            assert({value: lufo.getCacheLufo().get('k7')}, undefined);
            assert(await lufo.getStorageLufo().get('k7'), 'v7');
            await lufo.clear();
        }

        LOG = 1;
        await testLufo(({maxKeys, maxSize}) => {
            //localStorage.clear(); // should not be needed (test-cases clear themselves)
            return createLufo({maxKeys, maxSize});
        }, 148);

        LOG = 1;
        await testLufo(({maxKeys, maxSize}) => {
            return createLocalStorageLufo({maxKeys, maxSize, prefix})
        }, 140);

        LOG = 1;
        await testCachedStorageLufo(() => {
            return createCachedStorageLufo({maxKeys: 5, storageLufo: createRamStorageLufo({maxKeys: 10, prefix})});
        });

        LOG = 1;
        await testCachedStorageLufo(() => {
            return createCachedStorageLufo({maxKeys: 5, storageLufo: createLocalStorageLufo({maxKeys: 10, prefix})});
        });

        async function testItterator(creator) {
            let arr, expected, step;

            //console.log('*** test itterator: each ***');
            await create(creator, 10, {});
            arr = await lufo.eachValue(undefined, undefined, ['other']);
            eq(arr[0], 'other');
            eq(arr[1], 'v9');
            eq(arr[5], 'v5');
            eq(arr[10], 'v0');
            await lufo.clear();

            await create(creator, 10, {});
            arr = await lufo.eachValue({index:2, limit:4}); //console.log({arr});
            eq(arr[0], 'v7');
            eq(arr[2], 'v5');
            eq(arr[3], 'v4');
            await lufo.clear();

            await create(creator, 10, {});
            arr = await lufo.eachValue({index:2, limit:100}); //console.log({arr});
            eq(arr[0], 'v7');
            eq(arr[7], 'v0');
            arr = await lufo.eachValue({index:2, limit:100, reverse:true}); //console.log({arr});
            eq(arr[0], 'v8');
            eq(arr[1], 'v9');
            await lufo.clear();

            await create(creator, 10, {});
            arr = await lufo.eachValue({index:2, limit:999})
            eq(arr[0], 'v7');
            eq(arr[7], 'v0');
            await lufo.clear();

            await create(creator, 10, {});
            expected = ['v7','v6','v5'];
            await lufo.eachValue({key:'k7', limit:3}, (v, i) => eq(v, expected[i]));
            await lufo.clear();

            await create(creator, 10, {});
            expected = ['v7','v6','v5'];
            await lufo.each({index:2, limit:3}, (o, i) => eq(o.value, expected[i]));
            expected = ['v5','v6','v7'];
            await lufo.each({index:5, limit:3, reverse:true}, (o, i) => eq(o.value, expected[i]));
            await lufo.clear();

            await create(creator, 10, {});
            expected = ['v7','v6','v5'];
            arr = await lufo.eachValue({index:2, limit:999}, (v, i) => {
                eq(v, expected[i]);
                // mutate value pushed to arr
                // end loop with false
                return i < 2 ? 'T'+v : false;
            }, []);
            eq(arr[0], 'Tv7');
            eq(arr[1], 'Tv6');
            eq(arr.length, 2);
            await lufo.clear();

            // test itterator: step
            await create(creator, 4, {});
            expected = ['v3','v2','v1', 'v0'];
            step = await lufo.stepValue();
            while(step.hasMore()) {
                let i = step.getIndex();
                eq(await step.next(), expected[i]);
            }
            await lufo.clear();

            await create(creator, 4, {});
            expected = ['v3','v2','v1', 'v0'];
            await lufo.stepValue({}, (v, i) => eq(v, expected[i]));
            await lufo.clear();

            await create(creator, 10, {});
            expected = ['v6','v5'];
            await lufo.stepValue({index:3, limit:2}, (v, i) => eq(v, expected[i]));
            await lufo.clear();

            await create(creator, 10, {});
            expected = ['v8','v7','v6'];
            arr = [];
            await lufo.stepValue({index:1}, (v, i) => {
                eq(v, expected[i]);
                arr.push(v);
                return i < 2;
            });
            eq(arr.length, 3);
            await lufo.clear();

            // test itterator: twoStep
            await create(creator, 4, {});
            arr = [];
            await lufo.twoStepValue({index1:0, index2:0}, (v) => arr.push(v));
            eqArr(arr, ['v3','v2','v1', 'v0']);
            await lufo.clear();

            await create(creator, 4/*even number*/, {});
            arr = [];
            await lufo.twoStepValue({index1:0, index2:2}, (v) => arr.push(v));
            eqArr(arr, ['v3','v1','v2', 'v0']);
            await lufo.clear();

            await create(creator, 5/*uneven number*/, {});
            arr = [];
            await lufo.twoStepValue({index1:0, index2:2}, (v) => arr.push(v));
            eqArr(arr, ['v4', 'v2','v3','v1', 'v0']);
            await lufo.clear();

            await create(creator, 4, {});
            arr = [];
            await lufo.twoStepValue({index1:0, index2:3/*starting at the end*/}, (v) => arr.push(v));
            eqArr(arr, ['v3', 'v0','v2','v1']);
            await lufo.clear();

            await create(creator, 4, {});
            arr = [];
            await lufo.twoStepValue({index1:3/*starting at the end*/, index2:0}, (v) => arr.push(v));
            eqArr(arr, ['v0', 'v3','v2','v1']);
            await lufo.clear();
        }

        async function testRaceCondition(creator) {
            let arr, expected, step, resolve, done;
            const wait = () => new Promise((r) => resolve = r);

            await create(creator, 10, {});
            arr = [];
            lufo = lufo.async;
            lufo.addAsync('k-b', 'v-b');
            lufo.addAsync('k-a', 'v-a');
            lufo.eachValueAsync({index:0, limit:6}, (v, i) => {                 //console.log(i, v)
                arr.push(v);
                if(i === 5) {
                    eq(arr[0], 'v-a');
                    eq(arr[1], 'v-b');
                    eq(arr[4], 'v7');
                    eq(arr[5], 'v6');                                           //console.log('resolved', arr)
                    resolve();
                }
            });
            await wait();
            await lufo.clearAsync();
        }

        LOG = 2;
        await testItterator(() => {
            return createLufo({});
        });

        LOG = 2;
        await testItterator(() => {
            return createRamStorageLufo({prefix});
        });

        LOG = 2;
        await testItterator(() => {
            // implicit test of Storage
            return createCachedStorageLufo({storageLufo: createRamStorageLufo({prefix})});
        });

        LOG = 2;
        await testRaceCondition(() => {
            // implicit test of Storage
            return createCachedStorageLufo({storageLufo: createRamStorageLufo({prefix})});
        });

        await lufo.destroyAsync();
    } catch(e) {
        console.error(e);
    }
})();

