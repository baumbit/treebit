/**
 * Storage is a facade, exposing a common interface across platforms.
 * It offers two types of storage: memory storage and persistent storage.
 *
 * The storage interface may change depending on what type is used, but
 * should be the same across platforms.
 *
 * Since some storage mediums may need to be safely stopped to ensure
 * data integrity, or destroyed to leave no data garbage behind, for
 * the sake of simplicty all stores offers: stopAsync and destroyAsync.
 *
 */

// TODO
//      optimize
//          reduce latency by keeping bucket lufo meta values in memory and save to separate file on same path as database

import OO from './../oo/oo.js';
import {onPlatformEvent, EXIT_EVENT} from './../oo/utils.js';
import {createLufo as createDefaultLufo, createCachedStorageLufo, createLocalStorageLufo, createStorageLufo} from '../oo/lufo.js';
import {createBucketTreeDbAsync} from './../oo/buckettree-db.js';
import {mapAsync} from '../oo/utils.js';

const MBFactor = 1000000;

let basePathPermanentStorage;

export async function setupInNodeJs({basePath='./_storage'}) {
    basePathPermanentStorage = basePath;
};

export function createStorage(ß, prefix) {
    onPlatformEvent(EXIT_EVENT, () => {
        // note: everything in this call must be blocking
        // to guarantee completion.
        stopAllBlocking();
    });

    const
        log = ß.log.log('STORAGE', 3),
        store = {};

    function createBuilder(prefix, defaultOptions={}) {
        return async (name, options) => {
            return getAsync({name: `${prefix}${name}`, ...defaultOptions, ...options});
        };
    }

    async function getAsync({name, lufo=false, /* TODO medium,*/ capacity, memory, persistent}) {
        if(memory === true && persistent) throw new Error('bad arg. memory storage can no be persistent(${persistent})');
        if(!memory && !persistent) throw new Error(`bad arg. memory(${memory} persistent(${persistent})`);
        if(!name.startsWith('/') && !name.startsWith('.')) throw new Error(`bad name(${name}). must start with "." or "/"`);

        // get or create store
        name = prefix + name;
        if(!name) {
            throw new Error(`bad name(${name})`);
        } else if(store[name]) {
            return store[name];
        }

        const isPersistent = !!persistent;
        if(persistent === true) persistent = undefined;

        log?.n(1, `creating store(${name}) lufo(${!!lufo+':'+(typeof lufo)})) isPersistent(${isPersistent}) capacity(${capacity}) memory(${memory}) persistent(${persistent})`);
        //console.log({basePathPermanentStorage, prefix, name});

        if(lufo) {
            let lufoStorage;
            if(isPersistent) {
                if(OO.isNodeJs) {
                    lufoStorage = await createBucketTreeDbLufoAsync(
                        // mem
                        {maxKeys:capacity, mb:memory},
                        // file
                        {mb:persistent, path:`${basePathPermanentStorage}/${name}`}
                    );
                } else { //if(medium === LOCAL_STORAGE){
                    lufoStorage = createCachedStorageLufo({
                        // memory
                        maxKeys:capacity, mb:memory,
                        // file
                        storageLufo:createLocalStorageLufo( {maxKeys:capacity, mb:persistent, prefix:name} )
                    });
                //} else if(medium === INDEX_DB) {
                //    throw new Error(`TODO store type(${type}) not implemented`);
                //} else {
                //    throw new Error(`bad store type(${type})`);
                }
            } else /*memory*/ {
                lufoStorage = createDefaultLufo({maxKeys:capacity, maxSize:memory});
            }
            // ensure that async LufoStorage ONLY reveals async functions with Async suffix,
            // because that it how tree is written. this way it will become apparent during
            // development, if a promise is expected or not which will make it easier to
            // spot when a function is missing the await keyword etc.
            if(lufoStorage.async) {
                store[name] = lufoStorage.async;
            } else {
                store[name] = lufoStorage;
            }
            // override
            store[name].destroyAsync = async () => {
                delete store[name];
                await lufoStorage.destroy();
            };
         } else {
            let dbStorage;
            if(isPersistent) {
                if(OO.isNodeJs) {
                    dbStorage = await createBucketTreeDbAsync({
                            cache: memory || (1 * MBFactor),  // max size in bytes to store in dataLufo
                            path: `${basePathPermanentStorage}/${name}`
                    });
                    //console.log(dbStorage);
                } else {
                    dbStorage = await createLocalStorageDb(name);
                }
                // simple runtime sanity test, to verify that all storages implementation offers same interface,
                // the signature is not fully tested, it is just a brief test to verify
                // that source code have not moved too much.
                ['dropDbAsync','setAsync','getAsync','hasAsync','removeAsync','deleteAsync','stopAsync'].forEach(s => {
                    if(!dbStorage[s]) throw new Error(`missing function(${s}). persistant-db facade depends on it`);
                });
                store[name] = dbStorage;
                // override
                store[name].destroyAsync = async () => {
                    delete store[name];
                    await dbStorage.dropDbAsync();
                };
            } else {
                throw new Error(`unsupported storage config`);
            }
        }

        //log?.n(10, `\tstore creted(${name})`, store[name]);
        return store[name];
    }

    function stopBlocking(name) {
        const o = store[name];                                      log.n(0, 'stopBlocking', name, !!o);
        o.stop();
    }

    function stopAllBlocking() {
        Object.keys(store).forEach(stopBlocking);                   log.n(0, 'stopped');
    }

    async function destroyAsync(name) {
        const o = store[name];
        if(o) {
            if(o.destroy) o.destroy();
            else await o.destroyAsync();
        }
    }

    async function destroyAllAsync(name) {
        await mapAsync(Object.keys(store), async (name) => store[name].destroyAsync());
    }

    return {
        createBuilder,
        getAsync,
        stopBlocking,
        stopAllBlocking,
        destroyAsync,
        destroyAllAsync
    };
};

export function createLocalStorageDb(name) {
    const k = (k) => { return name + '/' + k; };
    const db = {
        dropDbAsync: () => {
            for(let i = 0, k; localStorage.length; i++) {
                k = localStorage.key(i);
                if(k.startsWith(name)) {
                    localStorage.removeItem(k);
                }
            }
        },
        setAsync: (key, value) => {
            localStorage.setItem(k(key), JSON.stringify(value));
        },
        getAsync: (key) => {
            let s = localStorage.getItem(k(key));
            try {
                if(s) {
                    s = JSON.parse(s);  //L(k(key), s);
                    return s;
                }
            } catch(e) {
            }
        },
        hasAsync: (key) => {
            return !!localStorage.getItem(k(key));
        },
        removeAsync: (key) => {
            return localStorage.removeItem(k(key));
        },
        deleteAsync: (key) => {
            db.removeAsync(key);
        },
        stopAsync: () => {
            // nothing to stop
        }

        ,debugDump: () => { console.log('=== STORAGE DUMP - LOCAL STORAGE DB ===');
            console.error('TODO impl');
        }
     };
    return db;
};

export async function createBucketTreeDbLufoAsync(cacheOptions={}, storageOptions={}) {
    let meta;
    const
        db = await createBucketTreeDbAsync(storageOptions),
        storage = {
            stop: () => {
                // note: this is intentionally blocking,
                // to ensure database integrity (ie. safe shutdown).
                db.setExtraBlocking('meta', JSON.stringify(meta));
                db.stopBlocking();
            },
            destroy: async () => {
                await db.dropDbAsync();
            },
            clear: async () => {
                meta = {};
                await db.clearDbAsync();
            },
            getMeta: async (key) => {
                return meta[key];
            },
            setMeta: async (key, value) => {
                meta[key] = value;
            },
            setItem: async (key, value) => {
                await db.setAsync(key, value, {size:value.size});
            },
            getItem: async (key) => {
                return db.getAsync(key);
            },
            deleteItem: async (key) => {
                await db.deleteAsync(key);
            },
            removeItem: async (key) => {
                const s = await db.removeAsync(key);
                if(s) return JSON.parse(s);
            },
            sizeOfValue: (value) => {
                return getSize(value);
            }

            ,debugDump: () => { console.log('=== STORAGE DUMP - BUCKET TREE DB LUFO ===');
                db.debugDump();
            }
        },
        storageLufo = createStorageLufo({maxKeys:storageOptions.maxKeys, maxSize:storageOptions.bytes, storage}),
        lufo = createCachedStorageLufo({...cacheOptions, storageLufo});

    meta = await db.getExtraAsync('meta');
    if(!meta) meta = {};

    return lufo;
};

