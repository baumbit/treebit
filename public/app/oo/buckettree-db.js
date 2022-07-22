const version = '0.0.27';
//
//var oldlog=console.log;console.log = function(){oldlog(...arguments);console.trace()};
// node example-buckettree-db.js
// TODO
//          make browser friendly, saving to localstorage and/or indexdb
//          package
//              const child_process = require("child_process");
//              child_process.execSync(`zip -r DESIRED_NAME_OF_ZIP_FILE_HERE *`, {
//                  cwd: PATH_TO_FOLDER_YOU_WANT_ZIPPED_HERE
//              });
// TODO
//      stability
//              when SAFU file does not exist on path, database needs re-indexing.
//                  add this as a manually invoked procedure. note: .bck files are
//                  still required to map data correctly, because the keys are stored
//                  in the descriptors. possible fix for this is to store the key together
//                  with the data in the .dat file.
//
//              add TEST_RANDOM to memory test
//
//              add save all buckets in lufo every X period IF there have been no jobs running for a while
//                  create a timeout the debounce when adding a job (if no job added, no mutations can occur eiter
//                  so no need for a timer)
//
//      known possible optimzations:
//          known ~x2 speed improvement while preserving lufo bytes size limit:
//              to reduce latency, you want to cache buckets in memory bucketLufo,
//              but you also want to set a max-size for the lufo, and hence buckets needs 
//              to have ethier a max number keys set or their size calculated to know if they overflow.
//              by NOT defining the max bytes size of the lufo, size is never computed and hence its the fastest it can get
//              (instead you limit bucket size by number of keys).
//              however a bucket is less then 200 bytes (Fri Feb 11 12:22:17 CET 2022) and when descriptors are added and or
//              removed, the individual size of the descriptor can either be added or deducted from the bucket size which
//              is added to the bucketLufo - and this will be faster compared to stringify the bucket and or letting lufo
//              loop through it.
//                  helpful code:
//                  //const tmp = deepClone(bucket);
//                  //delete tmp.descriptor;
//                  //const bucketSize = getSize(JSON.stringify(tmp));
//                  ////console.log(bucketSize / Object.keys(bucket.descriptor).length);
//                  //console.log(bucketSize);
//
//           clustering:
//              because of how bucket are named there are are 10 possible entry points
//                using a facade, such an entry point could point to a server
//                    main issues with this solution:
//                        major: data might not be evenly distributed
//                        minor: bubbling data to a parent wont work
//
//          garbage collection:
//              optimize loadDataAsync by opening a stream from file

import { createLufo, createStorageLufo, createCachedStorageLufo } from './lufo.js';

const CHECKS = false; // run with safety checks, but slower

export const
    MBFactor = 1000000;

const
    STATE_SLEEP = 0,
    STATE_STARTING = 1,
    STATE_RUNNING = 2;

/**
 * simple keyvalue db.
 */
let getSize;

let nodejs; // similar to common, but exists only in nodejs
export async function setupInNodeJsAsync({buffer, fsPromises, fs}, testOptions={testBasePath:'./_test-buckettree-db-artifacts', isTestFile:true}) {
    nodejs.fsPromises = fsPromises;
    nodejs.fs = fs;
    getSize = (data) => {
        const buffer = Buffer.from(data/*, 'utf-8'*/);
        return buffer.byteLength;
        //const blob = new buffer.Blob([data]);
        //const size = blob.size; //console.log('getSize data', data, size);
        //return size;
    };
    //console.log({testOptions});
    await nodejs.runTest(testOptions);
};

function setupInBrowser() {
    getSize = (data) => {
        const blob = new Blob([data]);
        const size = blob.size;
        //console.log('getSize data', data, size);
        return size;
    };
};

try {
    if(window) {
        setupInBrowser();
    }
} catch(e) {
    // setupInNodeJs should be called explicitly because it depend on imports
}

const common = {
    deleteDescriptor: (bucket, descriptor) => {
        bucket.size.virtual -= descriptor.size;
        bucket.count--;
        if(bucket.size.virtual < 0) throw new Error(`bucket[${bucket.name}] size virtual is less then zero: ${bucket.size.virtual}`);
        if(bucket.count < 0) throw new Error(`bucket[${bucket.name}] count is less then zero: ${bucket.count}`);
        delete bucket.descriptor[descriptor.key]; // forget value (will reside in storage as garbage)
    },
    hasSpace: (bucket, size, isReplace, bucketMaxCount, bucketMaxBytes, debugLog) => {
        let bucketCount = bucket.count;
        if(isReplace) bucketCount--;
        //if(isDebug) console.log(bucketCount, bucketMaxCount, (bucket.size.real + size) < bucketMaxBytes);
        if(bucketCount >= bucketMaxCount) return false;
        const isSpace = (bucket.size.real + size) < bucketMaxBytes;
        debugLog?.push(`bucket(${bucket.name}) space=${isSpace} add=${size} real:${bucket.size.real} max:${bucketMaxBytes}`);
        return isSpace;
    },
    garbageCollectionAsync: async (garbageBucketName, db, medium, debugLog) => {debugLog?.push(`garbage collect:${garbageBucketName}`);
        // note: since file handlers are open and there is a timebox for house keeping
        // this is an opportune time to do some simple sorting too.

        // get bucket
        const
            {bucketMaxBytes, sortMs} = medium,
            bucket = await db.getBucketAsync(garbageBucketName);
        if(!bucket) return false; // this is normal if job was posted, but the bucket for some reason was deleted
        if(!db.hasBucketGarbage(bucket)) return false;
        const
            stopTime = sortMs ? Date.now() + sortMs : 0,
            moveToBucketFromChild = {},
            moveToChildFromBucket = {};

        // selecte a random child
        let child, childName;
        if(stopTime) {
            const children = Object.keys(bucket.children);
            if(children.length) {
                childName = garbageBucketName + children[ (Math.floor(Math.random() * children.length)) ];
                child = await db.getBucketAsync(childName);
            }
        }

        // select descriptors to swap around
        if(child) {                                                             debugLog?.push(`sort with child: ${child.name}`);
            const
                bucketDescs = Object.values(bucket.descriptor),
                childDescs = Object.values(child.descriptor);
            let bucketSpace = bucketMaxBytes - bucket.size.virtual, // calculated space left after garbage collection completed
                childSpace = bucketMaxBytes - child.size.virtual;

            // compare the number of hits of randomly picked parent and child items,
            // items should be swapped one-2-one so that items with greater hits accumulate in parent
            // and when parent runs out of items, be filled with items from child.
            for(let i = 0, d, cd;  i < childDescs.length; i++) {
                d = i < bucketDescs.length ? bucketDescs[i] : null;
                cd = childDescs[i];
                // when descriptor is moved from child to parent,
                // its turns into garbage in the child, hence do
                // not increase available space in child.
                // however when descriptor is moved from parent
                // to child, it will be garbage collected hence
                // space will be freed in parent.
                if(!d) {
                    // no more descriptors in bucket,
                    // so just bubble the child descriptor.
                    if( bucketMaxBytes > (bucketSpace + cd.size) ) {
                        moveToBucketFromChild[cd.key] = cd;
                        bucketSpace += cd.size;
                   }
                } else if(d.hits < cd.hits) {                               debugLog?.push(`try swap ${d.key} with ${cd.key}`);
                    // swap descriptors between parent and child
                    let bucketSpaceAfterSwap = bucketSpace - d.size + cd.size,
                        childSpaceAfterSwap = childSpace - cd.size + d.size;
                    if(bucketMaxBytes > bucketSpaceAfterSwap && bucketMaxBytes > childSpaceAfterSwap) {
                        //debugLog?.push({bucketMaxBytes, bucketSpaceAfterSwap, childSpaceAfterSwap});
                        moveToChildFromBucket[d.key] = d;
                        moveToBucketFromChild[cd.key] = cd;
                        bucketSpace = bucketSpaceAfterSwap;
                        childSpace = childSpaceAfterSwap;
                    }
                }

                if(stopTime - Date.now() < 0) {                             debugLog?.push(`out-of-time`);
                    break;
                }
            }
        }

        // garbage collection
        const
            name = 'dirty_' + bucket.name,
            dirtyDataFileName = medium.buildDataFileName(name),
            dataFileName = medium.buildDataFileName(bucket.name),
            bucketDescriptor = bucket.descriptor;
        await medium.rename(dataFileName, dirtyDataFileName);

        // zerorize bucket
        bucket.count = 0;
        bucket.descriptor = {};
        bucket.size.real = 0;
        bucket.size.virtual = 0;

        // file does not exist so there will be no trailing garbage
        const dataFile = await medium.writeFileAsync(dataFileName, 0);      debugLog?.push(`begin copy items`);
        for(let p in bucketDescriptor) {
            let d = bucketDescriptor[p];
            if(!moveToChildFromBucket[d.key]) {
                // TODO optimize loadDataAsync by opening a stream
                let data = await medium.loadDataAsync({name}, d); // load from dirty data file
                await common.saveDataAsync(bucket, d, data, d.size, false, false, dataFile.write, bucketMaxBytes, debugLog); // append
                bucket.descriptor[d.key] = d; // add descriptor to parent
            }
        }

        if(bucket.size.real !== bucket.size.virtual) {
            throw new Error(`bucket[${bucket.name}] size mismatch real:${bucket.size.real} virtual:${bucket.size.virtual}`);
        }

        if(!child) {
            dataFile.close();
            await db.saveBucketAsync(bucket);
            await medium.rm(dirtyDataFileName);
            return 1; // truthy, but not sorted
        }
                                                    debugLog?.push(`move items from bucket:${child.name} to:${bucket.name}`);
        // simple append descriptor from child to parent
        for(let p in moveToBucketFromChild) {
            let d = moveToBucketFromChild[p];
            let data = await medium.loadDataAsync(child, d);
            await common.saveDataAsync(bucket, d, data, d.size, false, false, dataFile.write, bucketMaxBytes, debugLog);
            bucket.descriptor[d.key] = d; // add descriptor to parent
            common.deleteDescriptor(child, d); // remove from child
        }
        if(bucket.size.real !== bucket.size.virtual) {
            throw new Error(`bucket[${bucket.name}] size mismatch real:${bucket.size.real} virtual:${bucket.size.virtual}`);
        }
        dataFile.close();
        await db.saveBucketAsync(bucket); // done mutating bucket

        // simple append descriptor from parent to child
        const childDataFile = await medium.writeFileAsync(medium.buildDataFileName(childName), child.size.real); // append at the end
                                              debugLog?.push(`move items from bucket:${name} to:${child.name}:${child.size.real}`);
        for(let p in moveToChildFromBucket) {
            let d = moveToChildFromBucket[p];
            let data = await medium.loadDataAsync({name}, d); // load from the old dirty data file which the descriptor is mapping to.
            await common.saveDataAsync(child, d, data, d.size, false, false, childDataFile.write, bucketMaxBytes, debugLog); // 
            child.descriptor[d.key] = d; // add descriptor to child
            // no need to remove descriptor from parent,
            // since it was never included during the garbage collection above.
        }
        childDataFile.close();
        await db.saveBucketAsync(child); // done mutating child
        medium.rm(dirtyDataFileName); // done working with dirty data file

        return 2; // garbage collecte and bucket sorted
    },
    saveDataAsync: async (bucket, descriptor, data, size, isReplace, isHit=true, write, bucketMaxBytes, debugLog) => {
        if(typeof data !== 'string') throw new Error('data must be a string');

        const p = /*no need to block*/ write(data, debugLog);

        if(isReplace) {                                             debugLog?.push(`replace. new size: ${size}`);
            bucket.size.virtual -= descriptor.size;
        } else {
            bucket.count++;
        }
        bucket.size.virtual += size;

        descriptor.pos = bucket.size.real;
        descriptor.size = size;
        bucket.size.real += size;                           debugLog?.push(`bucket(${bucket.name}) size real: ${bucket.size.real}`);

        if(isHit) {
            descriptor.hits++;
        }

        return p;
    }
};

function deepClone(o) {
    return JSON.parse(JSON.stringify(o));
}

function hashcode(s) {
    // XXX: changing this will break test, because it relies on hashcodes
    // https://stackoverflow.com/questions/194846/is-there-any-kind-of-hash-code-function-in-javascript#8076436
    var hash = 0;
    for (var i = 0; i < s.length; i++) {
        var character = s.charCodeAt(i);
        hash = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    if(hash < Number.MIN_SAFE_INTEGER) throw new Error(`bad hash: ${hash} from key: ${key}`);
    else if(hash > Number.MAX_SAFE_INTEGER) throw new Error(`bad hash: ${hash} from key: ${key}`);
    if(hash < 0) {
        hash = ''+hash;
        return '0' + hash.slice(1);
    } else {
        return ''+hash;
    }
}

function checkBucketIntegrity(bucket, isExit, tag='') { //console.log({bucket, isExit, tag});
    const
        descriptorSizeSum = Object.keys(bucket.descriptor).reduce((a, k) => {
            return a + bucket.descriptor[k].size;
        }, 0);
        if(descriptorSizeSum !== bucket.size.virtual) {
            const e = new Error(`${tag} bucket[${bucket.name}] size virtual(${bucket.size.virtual}) does not match descriptor total(${descriptorSizeSum}).`);
            if(isExit) {
                console.error(e);
                process.exit();
            }
            else throw e;
        }
}

export async function createFileMediumAsync({bucketMaxCount, bucketMaxBytes, sortMs, path}) {

    if(!path) throw new Error('no path specified');

    const
        safuFileName = `${path}/SAFU`,
        // TODO when all test cases works... impl promisified read/write file
        //{ readFile, writeFile, access, rm, open, appendFile, rename } = nodejs.fsPromises,
        { access, rm, open, appendFile, rename, stat, mkdir } = nodejs.fsPromises,
        { constants, readFile, writeFile, writeFileSync } = nodejs.fs;
        //{ constants } = nodejs.fs;

    function buildExtraDataFileName(name) {
        return `${path}/${name}.xtr`;
    }

    function buildDataFileName(name) {
        return `${path}/${name}.dat`;
    }

    function buildBucketFileName(name) {
        return `${path}/${name}.bck`;
    }

    async function startAsync() {                           //console.log('startAsync', path);
        try {
            await stat(path);                               //console.log('found db dir', path);
        } catch(e) {
            await mkdir(path, {recursive: true});           //console.log('created db dir', path);
            return;
        }

        try {
            const a = await stat(safuFileName);             //console.log('stat ok, will try to delete', safuFileName, !!a);
            await deleteSafuFile();                         //console.log('del ok', safuFileName);
        } catch(e) {
            //console.error(e);
            throw new Error(`re-indexing required for database(${path})`);
        }

    }

    async function deleteSafuFile() {
        await rm(safuFileName);
    }

    function stopBlocking() {
        //console.log('stopBlocking. create SAFU file:', safuFileName);
        overwriteFileBlocking(safuFileName, `${Date.now()}`);
    }

    async function deleteFileAsync(fileName) {
        try {
            await rm(fileName, {recursive:true});
        } catch(e) {
            if(e.errno !== -2) throw e;
            //else console.log(`file did not exist ${fileName}`);
        }
    }

    async function clearDbAsync() {
        await deleteFileAsync(path);
        await startAsync();
    }

    function setExtraBlocking(key, data) {
        overwriteFileBlocking(buildExtraDataFileName(key), data);
    }

    async function getExtraAsync(key) {
        return new Promise((res, rej) => {
                const fileName = buildExtraDataFileName(key);
                readFile(fileName, (err, data) => {
                    if(err && err.errno === -2) {
                        res(undefined); // not found
                    };
                    if(err) rej(err);
                    else res(JSON.parse(data));
                });
        });
    }

    async function delExtraAsync(key) {
        await rm(buildExtraDataFileName(key));
    }

    async function dropDbAsync() {
        await deleteFileAsync(path);
    }

    async function loadBucketAsync(name) { //console.log('loadBucketAsync', name);
        return new Promise((res, rej) => {
                const fileName = buildBucketFileName(name);
                readFile(fileName, (err, data) => {
                    if(err) rej(err);
                    else res(JSON.parse(data));
                });
        });
        //const fileName = buildBucketFileName(name);
        //const data = await readFile(fileName);
        //let o;
        //try {
        //    o = JSON.parse(data);
        //} catch(e) {
        //    if(e.errno === -2) throw e;
        //    console.log('error loading bucket', {name, data});
        //    console.log(e);
        //    process.exit();
        //}
    }

    async function saveBucketAsync(name, o) { //console.log('MEDIUM saveBucketAsync ', name);
        return new Promise((res, rej) => {
           o = saveBucketBlocking(name, o);
           res(o);
        });
    }

    function saveBucketBlocking(name, o) {
        o.saved = Date.now();
        const fileName = buildBucketFileName(name);
        const data = JSON.stringify(o);
        overwriteFileBlocking(fileName, data);
        return o;
    }

    async function deleteBucketAsync(name) { //console.log('medium.deleteBucketAsync', name);
        await deleteFileAsync(buildBucketFileName(name));
        await deleteFileAsync(buildDataFileName(name));
    }

    async function hasBucketAsync(name) {
        const fileName = buildBucketFileName(name);
        try {
            await access(fileName, constants.R_OK | constants.W_OK);
            return true;
        } catch(e) {
            return false;
        }
    }

    function overwriteFileBlocking(fileName, data) {
        writeFileSync(fileName, data);
    }

    async function writeFileAsync(fileName, start) {
        const filehandle = await open(fileName, 'a+');
        const stream = filehandle.createWriteStream({start});
        return {
            write: (data, debugLog) => {                            debugLog?.push(`write(${fileName}:${start}) data:${data}`);
                stream.write(data);
            },
            close: () => {
                stream.close();
                filehandle.close();
            }
        };
    }

    async function readFileAsync(fileName) {
        const filehandle = await open(fileName, 'r');
        return {
            readAsync: async (size, pos) => {
                if(!(size >= 0)||!(pos >= 0)) throw new Error(`bad arg. size=${size}, pos=${pos}`);
                const arr = new Uint8Array(size);
                const buffer = Buffer.from(arr.buffer);
                await filehandle.read(buffer, 0, size, pos);
                const s = buffer.toString();
                return s;
            },
            close: () => {
                filehandle.close();
            }
        };
    }

    async function loadDataAsync(/*bucket*/{name}, descriptor, isClose) { //console.log('< loadDataAsync', ...arguments);
        const
            { size, pos } = descriptor,
            fileName = buildDataFileName(name), // same name as bucket, but different extension
            file = await readFileAsync(fileName),
            s = await file.readAsync(size, pos);
        file.close(); //console.log('> loadDataAsync', {size, pos, fileName, s});
        return s;
    }

    async function saveDataAsync(bucket, descriptor, data, size, isReplace, isHit, debugLog) {
        const fileName = buildDataFileName(bucket.name);            debugLog?.push(`fileName: ${fileName}`);
        return common.saveDataAsync(
            bucket, descriptor, data, size, isReplace, isHit,
            async (data, debugLog) => {
                await appendFile(fileName, data);                         debugLog?.push(`append(${fileName}): ${data}`);
            },
            bucketMaxBytes, debugLog
        );
    }

    function debugDumpDecorators(bucket) {
        return Object.keys(bucket.descriptor).map(k => {
            const desc = bucket.descriptor[k];
            return `desc key=${desc.key} size=${desc.size} created=${desc.created} track=${desc.debugTrack}`; 
        });
    }

    async function garbageCollectionAsync(garbageBucketName, db, debugLog) {
        return common.garbageCollectionAsync(garbageBucketName, db,
            {
                rm, rename, writeFileAsync, loadDataAsync, saveDataAsync, buildDataFileName,
                buildBucketFileName, bucketMaxBytes, sortMs
            },
            debugLog
        );
    }
    //console.log('b bucket desc size', Object.keys(bucket.descriptor).map(k => bucket.descriptor[k]).reduce((a, d) => a + d.size, 0));

    return {
        stopBlocking,
        startAsync,
        clearDbAsync,
        dropDbAsync,
        deleteSafuFile,
        deleteBucketAsync,
        loadBucketAsync,
        saveBucketAsync,
        saveBucketBlocking,
        hasBucketAsync,
        loadDataAsync,
        saveDataAsync,
        garbageCollectionAsync,
        setExtraBlocking,
        getExtraAsync,
        delExtraAsync
    };
}

export async function createBucketTreeDbAsync(options) {
    let medium,
        bucketGarbageMaxBytes,
        bucketMaxBytes,
        bucketMaxCount,
        bucketLufo,
        dataLufo,           // cache pure data. does NOT store data tracking information (which is stored in bucket.descriptor)
        isProcessing,
        jobQueue = [],
        state = STATE_SLEEP,
        analytic = {
            time: {
                start: Date.now(),
                idle: {
                    time: 0,
                    start: Date.now(),
                    count: 0
                },
                tags: {}
            },
            item: {
                set: 0,
                get: 0,
                del: 0
            },
            bucket: {
                add: 0,
                del: 0,
                save: 0,
                load: 0,
                garb: 0,
                sort: 0,
                depth: 0
            },
            lufo: {
                bucket: {
                    add: 0,
                    get: 0,
                    del: 0,
                    length: null,
                    size: null,
                    overflow: 0
                },
                data: {
                    add: 0,
                    get: 0,
                    length: null,
                    size: null,
                    overflow: 0
                }
            }
        };

    function stopwatchIdle(isWork, tag) {
        //function stopwatchIdle(isWork, tag) {
        let o = analytic.time.idle;
        // debug utils, so ensure that all stopwatches closes
        //  stopwatchIdle[tag] = stopwatchIdle[tag] || 0;
        //  let s = ''; for(let i = 0; i < o.count; i++, s += ' '); console.log(s, isWork ? 'begin' : 'end', tag, o.count);
        if(isWork) {
            //stopwatchIdle[tag] += 1;
            if(o.count === 0) o.time = Date.now() - o.start;
            o.count++;
        } else {
            //stopwatchIdle[tag] -= 1; console.log(stopwatchIdle);
            o.count--;
            if(o.count === 0) o.start = Date.now();
        }
    }

    function stopwatch(tag) {
        stopwatchIdle(true);
        const start = Date.now();
        if(!analytic.time.tags[tag]) analytic.time.tags[tag] = 0; // lazy
        return () => {
            analytic.time.tags[tag] += (Date.now() - start);
            stopwatchIdle(false);
        };
    }

    async function hasBucketAsync(name) {
        if(bucketLufo) return bucketLufo.has(name);
        else return medium.hasBucketAsync(name);
    }

    async function saveBucketAsync(bucket) {
        const stop = stopwatch('busave');
        if(CHECKS) checkBucketIntegrity(bucket, true);
        const name = bucket.name;
        if(bucketLufo) {
            bucket.saved = false;       // save bucket to medium if it overflow
            await addToBucketLufoAsync(bucket);
        } else {
            analytic.bucket.save++;
            await medium.saveBucketAsync(name, bucket);
        }
        stop();
        return bucket;
    }

    async function addToBucketLufoAsync(bucket) {
        analytic.lufo.bucket.add++;
        const overflows = bucketLufo.add(bucket.name, bucket, 'bubble');
        if(!overflows) return;

        analytic.lufo.bucket.overflow += overflows.length;
        return Promise.all(overflows.map((o) => {
            analytic.lufo.bucket.save++;
            const b = o.value;
            if(!b.saved) {
                // bucket have not been saved since it was mutated,
                // hence it should be saved.
                return medium.saveBucketAsync(b.name, b); // returns promise
            }
        }));
    }

    async function stopAsync(options={}) {
        if(options.force) {
            stopBlocking();
        } else {
            return addJob(stopBlocking, options);
        }
    }

    function stopBlocking() {
        jobQueue = [];

        if(bucketLufo) {
            const step = bucketLufo.stepValue();
            while(step.hasMore()) {
                let bucket = step.next();
                if(!bucket.saved) {
                    medium.saveBucketBlocking(bucket.name, bucket);
                }
            }
        }

        medium.stopBlocking();

        state = STATE_SLEEP;
    }

    async function getBucketAsync(name) {
        const stop = stopwatch('buget');
        let bucket,
            isStopped;
        if(bucketLufo) {
            const cached = bucketLufo.use(name);
            if(cached) {
                analytic.lufo.bucket.get++;
                bucket = cached.value;                         // console.log('   from cache', deepClone(cached.value).children);
            } else if(await medium.hasBucketAsync(name)) {
                analytic.bucket.load++;
                bucket = await medium.loadBucketAsync(name);    //console.log(' not in cache load it', bucket.name);
                await addToBucketLufoAsync(bucket);
            }
        } else {
            analytic.bucket.load++;
            try {
                bucket = await medium.loadBucketAsync(name)
            } catch(e) {
                throw new Error(e);
            } finally {
                stop();
                isStopped = true;
            }
        }
        if(CHECKS && bucket) checkBucketIntegrity(bucket, true);
        if(!isStopped) stop();
        return bucket;
    }

    async function deleteBucketAsync(name) {            //console.log('delete bucket -', name);
        const stop = stopwatch('budel');
        const bucket = await getBucketAsync(name); // if lucky, bucket was cached in lufo
        if(bucket) {
            if(CHECKS) checkBucketIntegrity(bucket, true);
            const len = Object.keys(bucket.children).length;
            if(len) throw new Error(`bucket has ${len} children`);
            const parentName = name.slice(0, name.length-1);
            if(!!parentName) {
                const parentBucket = await getBucketAsync(parentName);
                const digit = name.charAt(parentName.length, 1);
                //console.log('will delete',name,'bucket. removing ',digit,'from parent bucket',parentName,deepClone(parentBucket));
                delete parentBucket.children[digit];
                await saveBucketAsync(parentBucket);
                //console.log('2 parentBucekt in lufo -', parentBucket.name, deepClone(bucketLufo.getValue(parentBucket.name)));
             //console.log('2 parentBucekt on disc -', parentBucket.name, deepClone(await medium.loadBucketAsync(parentBucket.name)));
            }
            analytic.bucket.del++;
            await medium.deleteBucketAsync(name);
        }
        if(bucketLufo) {
            // do this at the end to ensure bucket is not re-added to lufo
            analytic.lufo.bucket.del++;
            bucketLufo.remove(name);              //console.log('   deleted buket from lufo -', name, 'has:',bucketLufo.has(name));
        }
        stop();
    }

    async function createBucketAsync(name) { //console.log('createBucketAsync', name);
        const bucket = {
            created: Date.now(),    // nice to have
            saved: false,           // false or millis
            name,                   // name of bucket
            size: {
                virtual: 0,         // bytes, size only of tracked stored data
                real: 0             // bytes, size of stored data including garbage
            },
            count: 0,               // number of descriptors
            descriptor: {},         // meta data describing stored data
            children: {}            // child buckets
        }; //console.log('*** createBucket ***', bucket);
        analytic.bucket.add++;
        const savedBucket = await saveBucketAsync(bucket); //console.log('created bucket was saved', savedBucket.name);
        return savedBucket;
    }

    async function deleteDescriptorAsync(bucket, key) {         //console.log('deleteDescriptorAsync', {bucket, key});
        const stop = stopwatch('dedel');
        const descriptor = bucket.descriptor[key];
        if(descriptor) {
            common.deleteDescriptor(bucket, descriptor);
            if(bucket.count > 0) {
                stop();
                return saveBucketAsync(bucket);
            } else {
                const nbrChildren = Object.keys(bucket.children).length; //console.log('deleted d?', bucket.name, {nbrChildren})
                if(nbrChildren === 0) {
                    await deleteBucketAsync(bucket.name);
                } else {
                    stop();
                    return saveBucketAsync(bucket);
                }
            }
        }
        stop();
    }

    function createDescriptor(key, size) {
        const descriptor = {
            created: Date.now(),    // nice to have TODO
            key,                    // used to identify this descriptor
            size,                   // bytes, size of stored data
            hits: 0,                // count storage read
            type: null,             // data type
            pos: null
            // TODO lock: null,             // TODO set a random number when locked, unlock by submitting this number
            // TODO when everything else works, add this external: null          // stored alongside bucket file
            // TODO position in file
        }; //console.log('createDescriptor', descriptor);
        return descriptor;
    }


    function hasBucketGarbage(bucket) {
        const
            garbageSize = bucket.size.real - bucket.size.virtual,
            isGarbageFound = garbageSize > bucketGarbageMaxBytes;
        //console.log('hasBucketGarbage', {garbageSize, bucketGarbageMaxBytes, isGarbageFound}, deepClone(bucket));
        return isGarbageFound;
    }

    async function garbageCollectionAsync(name, options={prioritized:true}, debugLog) {
        return addJob(async () => {
            const stop = stopwatch('garb');
            // note: the bucket might have been updated,
            // in between this job being posted and processed
            // hence the name of the bucket is used instead of
            // the bucket instance.
            const result = await medium.garbageCollectionAsync(name, {getBucketAsync, hasBucketGarbage, saveBucketAsync}, debugLog);
            switch(result) {
                case 2: analytic.bucket.sort++;
                case 1: analytic.bucket.garb++;
            }
            stop();
            return result;
        }, options);
    }

    async function getOrAddDescriptorAsync(key, type, value, size, debugLog) {
        const stop = stopwatch('search');

        const
            hash = hashcode(key),
            isAdd = !!value;                                         debugLog?.push(`looking for key=${key} add=${isAdd}`);

        if(isAdd && size === undefined) {
            size = getSize(value);
        }

        if(isAdd && size > bucketMaxBytes) {
            throw new Error(`item(${key}) is to large(${size}). bucket capacity(${bucketMaxBytes})`);
        }

        let name, bucket, descriptor, isBucketUpdated, emptyBucket, parentBucket, childName, isGarbageFound,
            i = 0,
            isFound = false;

        while(i < hash.length) {
            i++;
            if(analytic.bucket.depth < i) {
                analytic.bucket.depth = i;
            }
            name = hash.slice(0, i);                                debugLog?.push(`${i}) name=${name}`);
            childName = name.charAt(name.length-1); // single digit is enough
            // optmzd by checking if loading file is neccessary
            if(i === 1 || (parentBucket && parentBucket.children[childName]) || isAdd) {
                try {
                    bucket = await getBucketAsync(name);
                } catch(e) {
                    //console.log('hello', e);
                    if(parentBucket && Object.keys(parentBucket.children).length > 0) {
                        debugLog?.push(`bucket not found. will need to create it if adding. name=${name}`);
                    // TODO } else if(cached) { debugLog
                    } else {
                        debugLog?.push(`bucket not found (this was expected) name=${name}`);
                    }
                } finally {
                }
            }
            if(bucket) {                                            debugLog?.push(`bucket found ${bucket.name}`);
                descriptor = bucket.descriptor[key];
                let isSpace = common.hasSpace(bucket, size, true, bucketMaxCount, bucketMaxBytes, debugLog); 
                if(isAdd && !isGarbageFound) {
                    if(hasBucketGarbage(bucket)) {
                        // first bucket filled with garbage,
                        // should be cleaned but not the rest.
                        isGarbageFound = true;
                       /* do not await*/ garbageCollectionAsync(bucket.name, undefined, debugLog);
                    }
                }
                if(descriptor) {
                    if(isAdd && !isSpace) {           debugLog?.push(`deleteDesc ${key} in bucket ${bucket.name}`);
                        await deleteDescriptorAsync(bucket, key);
                        bucket = null;
                        continue;
                    } else {                          debugLog?.push(`found desc ${key} in bucket ${bucket.name} isSpace:${isSpace}`);
                        isFound = true;
                        break;
                    }
                } else {
                    if(!emptyBucket && common.hasSpace(bucket, size, false, bucketMaxCount, bucketMaxBytes)) {
                        emptyBucket = bucket; // first found empty bucket
                    }
                }
                parentBucket = bucket;
                bucket = null;
            } else {                                debugLog?.push('no more child buckets', deepClone({bucket, parentBucket}));
                bucket = emptyBucket;
                break;
            }
        }

        if(bucket) {
            name = bucket.name;
        }

        if(isFound) {
            descriptor.hits++;
            isBucketUpdated = true;
        } else if(isAdd) {
            descriptor = createDescriptor(key, size);         debugLog?.push(`created desc ${key} in bucket ${name}`);
            if(!bucket) {
                bucket = await createBucketAsync(name);             debugLog?.push(`needed to create bucket ${bucket.name}`);
                if(parentBucket) {
                    const childMetaData = true; // XXX reserver for future use, could be used to store data about child file,
                                                // so that it does not have to be loaded. simply "true" for now.
                    parentBucket.children[childName] = childMetaData;
                    await saveBucketAsync(parentBucket);
                }
            }
            bucket.descriptor[key] = descriptor;                    debugLog?.push('update bucket', deepClone(bucket));
            isBucketUpdated = true;
        } else {                                                    debugLog?.push(`not found and not added key=${key}`);
            // not found and not added
            bucket = null;
        }

        if(isBucketUpdated/*falsy only if item not found and not added*/) { //console.log('save', bucket, descriptor);
            if(type) {
                bucket.descriptor[key].type = type;
            }
            if(isAdd) {                                             debugLog?.push(`saveData ${key} in bucket ${bucket.name}`);
                await medium.saveDataAsync(bucket, descriptor, value, size, isFound, undefined, debugLog);
            }
            bucket = await saveBucketAsync(bucket);                 debugLog?.push(`saveBucket ${bucket.name}`);
        }

        stop();
        return {
            descriptor,     // descriptor (of stored value), or falsy if not found
            bucket          // descriptor container
        };
    }

    async function addJob(f, options={}, job={}) {
        //options.track = Math.random();                          //console.log('-- addJob -- (queue:'+jobQueue.length+')', options);
        job.options = options;
        job.promise = new Promise((resolve, reject) => {
            job.process = async () => {                         //console.log('do job', options);
                try {
                    //setTimeout(async () => {
                    const result = await f(options);            //console.log('     +  process resolved', options);
                    resolve(result);
                    //}, 100);
                } catch(e) {                                    //console.log('    -    process rejected', options);
                    reject(e);
                }
            };
        });
        if(isProcessing) {
          if(options.prioritized) jobQueue.push(job);
          else jobQueue.unshift(job);
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

    async function setAsync(key, value, options={}, debugLog) {
        let data;
        const type = typeof value;
        if(type !== 'string') data = JSON.stringify(value);
        else data = value;
        //console.log('setAsync', {hash, key, value});
        return addJob(async () => {
            const stop = stopwatch('set');
            analytic.item.set++;
            const
                {bucket, descriptor} = await getOrAddDescriptorAsync(key, type, data, options.size, debugLog);

            if(descriptor) {
                if(dataLufo) {
                    analytic.lufo.data.add++;
                    dataLufo.add(key, value, 'bubble', descriptor.size); debugLog?.push(`setAsync(${key}) added to dataLufo`);
                }
            }

            if(CHECKS && bucket) checkBucketIntegrity(bucket, true);

            stop();
            return {
                bucket,
                descriptor,
                key,
                value
            };
        }, options);
    }

    async function hasAsync(key, options={}, debugLog) {
        return getAsync(key, {...options, has:true});
    }

    async function getAsync(key, options={}, debugLog) {
        if(!key) return;
        return addJob(async () => {
            const stop = stopwatch('get');
            if(dataLufo) {
                const cached = dataLufo.use(key);
                if(cached) {                                                debugLog?.push(`getAsync(${key}) found in dataLufo`);
                    stop();
                    if(options.has) {
                        return true;
                    }
                    analytic.lufo.data.get++;
                    return cached.value;
                }
            }
            analytic.item.get++;
            const {bucket, descriptor, log} = await getOrAddDescriptorAsync(key, undefined, undefined, undefined, debugLog);

            if(CHECKS && bucket) checkBucketIntegrity(bucket, true);

            stop();
            if(descriptor) {
                if(options.has) {
                    return true;
                }
                let data = await medium.loadDataAsync(bucket, descriptor);
                if(descriptor.type !== 'string') {
                    data = JSON.parse(data);
                }
                if(dataLufo) {
                    analytic.lufo.data.add++;
                    dataLufo.add(descriptor.key, data, 'bubble', descriptor.size);
                }
                return data;
            }
        }, options);
    }

    async function removeAsync(key, options) {
        return deleteAsync(key, {...options, remove:true});
    }

    async function deleteAsync(key, options={}, debugLog) {
        return addJob(async () => {
            const stop = stopwatch('del');
            const {bucket, descriptor} = await getOrAddDescriptorAsync(key, undefined, undefined, undefined, debugLog);
            if(bucket) { //console.log('deleteAsync', {bucket, descriptor});
                let data;

                if(CHECKS) checkBucketIntegrity(bucket, true);

                if(dataLufo) {
                    const cached = dataLufo.remove(key);
                    if(cached) {
                        debugLog?.push(`deleteAsync(${key}) removed from lufo`);
                        data = options.remove && cached.value;
                    } else if(descriptor && options.remove){
                        data = await medium.loadDataAsync(bucket, descriptor);
                        if(descriptor.type !== 'string') data = JSON.parse(data);
                    }
                }
                analytic.item.del++;
                stop();
                await deleteDescriptorAsync(bucket, key);

                return data;
            }// else console.log('not found', key);
            stop();
        }, options);
    }

    async function clearDbAsync(options) {
        return addJob(async () => {
            await medium.clearDbAsync();
            bucketLufo.clear();
            dataLufo.clear();
        }, options);
    }

    async function dropDbAsync() {
        await medium.dropDbAsync();
    }

    function setExtraBlocking(key, value) {
        if(typeof value !== 'string') throw new Error(`bad format. value must be a "string"`);
        medium.setExtraBlocking(key, value);
    }

    async function getExtraAsync(key) {
        return medium.getExtraAsync(key);
    }

    async function delExtraAsync(key) {
        await medium.delExtraAsync(key);
    }

    function setBucketLufo(o) {
        bucketLufo = o;
    }

    function setDataLufo(o) {
        dataLufo = o;
        dataLufo.setOnOverflow(arr => {
            analytic.lufo.data.overflow += arr.length;
        });
    }

    async function startAsync(options) {
        if(state !== STATE_SLEEP) throw new Error(`bad state(${state})`);
        state = STATE_STARTING;

        const
            {
                count=100100,               // max number of paths (descriptors) in a bucket
                mb=100, bytes,              // data file max size
                garbageMb, garbageBytes,    // automatic data file garbage collection threshold
                index=1000,                 // max number of buckets to store in bucketLufo
                cache=(10*MBFactor),        // byte size to store in dataLufo
                sortMs=200,                 // max time spent on sorting
                path,                       // storage path
                log
            } = options;

        // calc bucket capacity in megabytes.
        // by design a bucket will overtime fill up with garbage (data stored that the bucket
        // haven forgotten). the reason for this, is that data with the same hash can change
        // in size and its more efficient to just append data to the end of a physical file.
        // as data overflow the capacitity limit, the db will clean itself from garbage
        // count
        bucketMaxCount = count;
        // size
        bucketMaxBytes = bytes || mb * 1000000/*bytes per mb*/;
        bucketGarbageMaxBytes = garbageMb ? garbageMb * 1000000/*bytes per mb*/ : garbageBytes;
        if(bucketGarbageMaxBytes !== 0 && !bucketGarbageMaxBytes) {
            bucketGarbageMaxBytes = Math.ceil(bucketMaxBytes * 0.15);
        }
        // storage
        if(!options.createMedium) options.createMedium = await createFileMediumAsync;
        medium = await options.createMedium({bucketMaxCount, bucketMaxBytes, sortMs, path});
        // init
        if(index > 1) setBucketLufo( createLufo({maxKeys:index}) );
        if(cache > 1) setDataLufo( createLufo({maxSize:cache}) );
        log?.('startAsync', {version, sortMs, bytes, bucketMaxBytes, bucketGarbageMaxBytes, bucketMaxCount});

        await medium.startAsync();

        // since this function it using async functions,
        // state might have changed during startup process
        // and such state change needs to be handled.
        if(state === STATE_STARTING) {
            state = STATE_RUNNING;
        } else if(state === STATE_SLEEP) {
            // the database was stopped in the middle of starting.
            stop({force:true});
        }
    }

    if(options) {
        await startAsync(options);
    }

    const reveal = {
        clearDbAsync,
        dropDbAsync,
        setAsync,
        getAsync,
        hasAsync,
        removeAsync,
        deleteAsync,
        getBucketAsync,
        hasBucketAsync,
        getBucketAsync,
        deleteBucketAsync,
        garbageCollectionAsync,
        startAsync,
        stopAsync,
        stopBlocking,
        setExtraBlocking,
        getExtraAsync,
        delExtraAsync,
        setBucketLufo,
        setDataLufo,
        getQueue: () => jobQueue,
        getMedium: () => medium,
        getStats: () => {
            stopwatchIdle(true);
            const
                o = deepClone(analytic),
                timeEnd = Date.now(),
                timeAlive = timeEnd - o.time.start,
                timeWork = timeAlive - o.time.idle.time;
            if(bucketLufo) {
                o.lufo.bucket.length = bucketLufo.length();
                o.lufo.bucket.size = bucketLufo.size();
            }
            if(dataLufo) {
                o.lufo.data.length = dataLufo.length();
                o.lufo.data.size = dataLufo.size();
            }
            o.time.snapshot = timeEnd;
            o.time.alive = timeAlive;
            o.time.work = timeWork;
            o.time.percent = {
                idle: `${(o.time.idle.time / timeAlive)*100} %`,
                work: `${(timeWork / timeAlive)*100} %`
            };
            Object.keys(o.time.tags).map(k => {
                const p = (analytic.time.tags[k] / timeWork) * 100;
                o.time.percent[k] = Math.floor(p) ? `ca ${Math.floor(p)} %` : `${p} %`;
            });
            stopwatchIdle(false);
            return o;
        }
    };
    // offer an interface where you do not have to type Async
    return Object.keys(reveal).reduce((o, k) => {
        o[k] = reveal[k];
        o[k.replace('Async', '')] = reveal[k];
        return o;
    }, {});
    //return ret;
};

// --------------------- TEST --------------------
(async function runTest({TEST_REGRESSION=true, TEST_SPEED=true, TEST_RANDOM=true, testBasePath, isTestFile=false}) {

    let DEBUG = true, // <----- TRUE FOR LOG
        L = DEBUG ? console.log : () => {},
        E = function() {console.error('test failed', ...arguments); console.trace(); },
        cntDb = 1,
        db, bucket, cnt;

    try {
        if(process) {
            if(nodejs === undefined) {
                nodejs = {runTest};
                return;
            }
            if(isTestFile) {
                try {
                    await nodejs.fsPromises.stat(testBasePath);
                    //L('Found: ', testBasePath);
                    await nodejs.fsPromises.rm(testBasePath, {recursive:true});
                    //L('Deleted: ', testBasePath);
                } catch(e) {
                }
                finally {
                    await nodejs.fsPromises.mkdir(testBasePath);
                    //L('Created: ', testBasePath);
                }
            }
        } else {
        }
    } catch(e) {
        TEST_REGRESSION=true;
        TEST_SPEED=false; // TODO impl this
        TEST_RANDOM=false; // TODO impl this
    }
    const memory = true;
    console.log(`test bucket-db memory(${!!memory}) file(${isTestFile}) regregssion(${TEST_REGRESSION}) speed(${TEST_SPEED}) random(${TEST_RANDOM})`);

    let testMediumFiles = {},
        extraFiles = {};
    function createTestMedium({bucketMaxCount, bucketMaxBytes, sortMs, path}, file) {
        file = testMediumFiles[path] || {SAFE:null};
        testMediumFiles[path] = file;
        const appendFile = (name) => {
            let o = file[name] || {str:''};
            file[name] = o;
            return {
                write: (data) => {
                    o.str += data;
                },
                close: () => {}
            };
        };
        const self = {
            startAsync: () => {
                if(file.SAFU === null) return;
                else if(file.SAFU === false) throw new Error('re-index required');
            },
            stopBlocking: () => {
                file.SAFU = true;
            },
            deleteSafuFile: () => {
                file.SAFU = false;
            },
            clearDbAsync: () => {
                testMediumFiles[path] = {SAFE:null};
                file = testMediumFiles[path];
            },
            setExtraBlocking: (k, v) => {
                extraFiles[k] = v;
            },
            getExtraAsync: (k) => {
                return extraFiles[k];
            },
            delExtraAsync: (k) => {
                delete extraFiles[k];
            },
            dropDbAsync: () => {
                delete testMediumFiles[path];
            },
            loadDataAsync: ({name}, descriptor) => {
                const o = file[name+'_dat'];
                if(o) {
                    const
                        s = o.str.slice(descriptor.pos, descriptor.pos + descriptor.size);
                    return s;
                }
            },
            saveDataAsync: (bucket, descriptor, data, size, isReplace, isHit) => {
                return common.saveDataAsync(bucket, descriptor, data, size, isReplace, isHit, (data) => {
                    appendFile(bucket.name+'_dat').write(data);
                }, bucketMaxBytes);
            },
            //deleteDataAsync: (bucket, descriptor) => {
            //    const
            //        {floor:bucketName,pos,len} = bucket,
            //        o = storage[bucketName];
            //    if(o) {
            //        let v = o.str.split(''); L('1', v);
            //        v.splice(pos, len); L('2', v);
            //        o.str = v.join(''); L('3', v);
            //        bucket.size'. = getSize(o.str);
            //    }
            //},
            deleteBucketAsync: (name) => {
                delete file[name+'_bck'];
                delete file[name+'_dat'];
            },
            garbageCollectionAsync: (garbageBucketName, db, debugLog) => {
                const
                    loadDataAsync = self.loadDataAsync,
                    saveDataAsync = self.saveDataAsync,
                    buildBucketFileName = (name) => name+'_bck',
                    buildDataFileName = (name) => name+'_dat',
                    writeFileAsync = appendFile,
                    rm = (name) => {
                        delete file[name];
                    },
                    rename = (from, to) => {
                        file[to] = file[from];
                        delete file[from];
                    };
                return common.garbageCollectionAsync(garbageBucketName, db, {rm, rename, writeFileAsync, loadDataAsync, saveDataAsync, buildDataFileName, buildBucketFileName, bucketMaxBytes, sortMs}, debugLog);
            },
            loadBucketAsync: (name) => {
                const o = file[name+'_bck'];
                if(!o) throw new Error('(loadBucketAsync) simulating file not found');
                return o;
            },
            saveBucketAsync: (name, o) => {
                o.saved = Date.now();
                file[name+'_bck'] = o;
            },
            saveBucketBlocking: (name, o) => {
                self.saveBucketAsync(name, o);
            },
            hasBucketAsync: (name) => { return !!file[name+'_bck']; }
        };
        return self;
    }

    try {
        async function createDbAsync(dbOptions, log) {
            cntDb++;
            const
                db = await createBucketTreeDbAsync(),
                path = testBasePath + '/' + cntDb;
            dbOptions.path = path;
            dbOptions.log = log;
            await db.startAsync(dbOptions);
            return db;
        }
        async function del(key) {
            const delId = Math.random();
            const options = {delId, key, method:'del'};
            return db.deleteAsync(key, options);
        }
        async function add(key, o={}, expectFail, log) {
            log = !log ? undefined : (log === true ? [] : log);
            cnt++;
            o.key = key;
            o.cnt = cnt;
            //const options = {size:getSize(JSON.stringify(o))};
            const options = {};
            let result;
            try {
                const p = await db.setAsync(key, o, options, log);
                result = p.bucket;
                if(expectFail) E('add expected to fail', {result});
            } catch(e) {
                if(!expectFail) E('add not expected to fail', {o, e});
            } finally {
                return result;
            }
        }
        async function addWithLog(key) {
            const log = [];
            const p = await add(key, undefined, undefined, log);
            L('addWithLog. key:', key, 'result:', p, 'log:', log);
            return p;
        }
        async function getWithLog(key) {
            const log = [];
            const p = await db.getAsync(key, undefined, log);
            L('getWithLog. key:', key, 'result:', p, 'log:', log);
            return p;
        }
        async function gbWithLog(name) {
            const log = [];
            const p = await db.garbageCollectionAsync(name, undefined, log);
            L('gbWithLog. bucket:', name, 'result:', p, 'log:', log);
            return p;
        }
        async function delBucket(name, expectedError) {
            try {
                await db.deleteBucketAsync(name);
            } catch(e) {
                if(!expectedError) E('deleteBucket failed', e);
            }
        }
        async function hasBucket(name, expected=true) {
            const found = await db.hasBucketAsync(name);
            if(expected !== found) E('assetBucketExists failed', {name, found, expected});
        }
        async function assertValue(key, expected, log) {
            log = !log ? undefined : (log === true ? [] : log);
            const assertId = Math.random();
            const options = {assertId, key, method:'get'};
            const o = await db.getAsync(key, options, log);
            let found = o;
            //try {
            //    found = JSON.parse(o);
            //} catch(e) {
            //    console.log(e);
            //    console.error('ERROR PARSING');
            //    console.log({key, expected, o}, log);
            //    process.exit(1);
            //}
            if(found.cnt !== expected.cnt) {
                E('*** assertValue failed ***', {assertId, key, found, expected});
            }
        }
        async function assertBucket(bucket, keys, values, expectedName, expectedVirtual, expectedReal, isDebug) {
            if(typeof bucket === 'string') bucket = await db.getBucketAsync(bucket);
            else bucket = await db.getBucketAsync(bucket.name);
            if(bucket.name !== expectedName) E('assertBucket failed name', bucket.name, {expectedName});
            if(expectedVirtual !== undefined && bucket.size.virtual !== expectedVirtual) E('assertBucket failed size', bucket.size.virtual, {expectedVirtual});
            if(expectedReal !== undefined && bucket.size.real !== expectedReal) E('assertBucket failed size', bucket.size.real, {expectedReal});
            const keysCount = Object.keys(bucket.descriptor).length;
            if(bucket.count !== keys.length || bucket.count !== keysCount) {
                E('assertBucket failed key/count', 'count:', bucket.count, 'found', keysCount, 'expected:', keys.length);
            }
            for(let i = 0, key; i < keys.length; i++) {
                key = keys[i];
                const descriptor = bucket.descriptor[key];
                if(descriptor) {
                    await assertValue(key, values[i], isDebug);
                } else {
                    E(`assertBucket failed key(${key}) not found`, bucket);
                }
            }
        }
        function assertSize(bucket, expectedSize) { L('bucket size='+bucket.size);
            if(bucket.size.virtual !== expectedSize) E('assertSize failed', bucket.size.virtual, {expectedSize});
        }
        async function testStartStopDrop(createMedium, log) {
            cnt = 1;
            let isSuccess;
            const
                path = testBasePath + '/lifecycle',
                options = {path, createMedium};

            db = await createBucketTreeDbAsync(); // create totally new database
            await db.startAsync(options);
            await add('foo');
            await assertValue('foo', {cnt:2});

            try {
                await db.startAsync(options);
                isSuccess = false;
            } catch(e) {
                isSuccess = true;
            }
            if(!isSuccess) E('assert failed, database should not be able to start without being stopped first');

            await assertValue('foo', {cnt:2});
            await db.stopAsync(); // stop

            db = await createBucketTreeDbAsync(); // open existing database
            await db.startAsync(options); // start database
            await assertValue('foo', {cnt:2}); // ensure values are retained between stop and re-open

            await db.stopAsync();
            await db.startAsync(options);

            await db.stopAsync();
            await add('bar');
            await assertValue('foo', {cnt:2});
            await assertValue('bar', {cnt:3});

            //try {
            //    await db.stopAsync();
            //    isSuccess = false;
            //} catch(e) {
            //    isSuccess = true;
            //}
            //if(!isSuccess) E('assert failed, database should not be able to stop without being started first');

            await db.getMedium().deleteSafuFile();
            try {
                await db.startAsync(options);
                isSuccess = false;
            } catch(e) {
                isSuccess = true;
            }
            if(!isSuccess) E('assert failed, database should not start if SAFU file is missing');

            await db.dropDbAsync();
            db = await createBucketTreeDbAsync(options);
            isSuccess = await db.getAsync('foo') === undefined;
            if(!isSuccess) E('assert failed, values from an old database was found');

            bucket = await add('beforeclear');
            await db.clearDbAsync();
            await hasBucket(bucket.name, false);
            bucket = await add('after');
            await assertValue('after', {foo:'after', cnt:5});

            db.stopBlocking(); // make sure stopping like this also works
            await db.dropDbAsync();
        }
        async function testWithCountAsLimit(dbOptions, createMedium, bucketLufo, dataLufo, log) {
            log = DEBUG ? log : undefined;
            //const l = [];
            cnt = 0;
            dbOptions.count = 5;
            dbOptions.bytes = Number.MAX_SAFE_INTEGER;
            dbOptions.createMedium = createMedium;
            db = await createDbAsync(dbOptions, log);
            if(bucketLufo) db.setBucketLufo(bucketLufo);
            if(dataLufo) db.setDataLufo(dataLufo);

            // add
                // 9
            await add('a45');
            await assertValue('a45', {cnt:1});
            await add('a46');
            await add('a47');
            await add('a48');
            bucket = await add('a90');
            await assertBucket(bucket,
                ['a45','a46','a47','a48','a90'],
                [{cnt:1},{cnt:2},{cnt:3},{cnt:4},{cnt:5}],
                '9'
            );
            ////    // 94
            await add('a50');
            await add('a51');
            await add('a52');
            await add('a53');
            bucket = await add('a54');
            await assertBucket(bucket,
                ['a50','a51','a52','a53','a54'],
                [{cnt:6},{cnt:7},{cnt:8},{cnt:9},{cnt:10}],
                '94'
            );
                // 949
            bucket = await add('a55');
            await assertBucket(bucket,
                ['a55'],
                [{cnt:11}],
                '949'
            );
                // 95
            await add('a91');
            await add('a92');
            bucket = await add('a93');
            await assertBucket(bucket,
                ['a91', 'a92', 'a93'],
                [{cnt:12},{cnt:13},{cnt:14}],
                '95'
            );
            // update
            cnt = 995;
            bucket = await add('a45', {foo:'bar'});
            await assertValue('a45', {cnt:996});
            await assertBucket(bucket,
                ['a45','a46','a47','a48','a90'],
                [{cnt:996},{cnt:2},{cnt:3},{cnt:4},{cnt:5}],
                '9'
            );
            cnt = 1000;
            bucket = await add('a91', {foo:'bar'});
            await assertBucket(bucket,
                ['a91','a92','a93'],
                [{cnt:1001},{cnt:13},{cnt:14}],
                '95'
            );
            // delete
            await del('a47');
            await del('a45');
            await del('a48');
            await del('a46');
            await assertBucket('9',
                ['a90'],
                [{cnt:5}],
                '9'
            );
            bucket = await add('a46');
            await assertBucket(bucket,
                ['a46', 'a90'],
                [{cnt:1002}, {cnt:5}],
                '9'
            );
            await del('a46'); await del('a46'); // delete same item twice
            await del('a90');
            await assertBucket('9',
                [],
                [],
                '9'
            );
            await hasBucket('9');
            await del('a55'); // should empty and delete bucket
            await hasBucket('949', false);
            await delBucket('94');
            await hasBucket('94', false);
            await delBucket('9', true);
            await del('a91');
            await del('a92');
            await del('a93');
            await delBucket('9');
            await hasBucket('9', false);
            cnt = 2000;
            bucket = await add('a45', {foo:'bar'});
            await assertValue('a45', {cnt:2001});

            //log?.('bucket:', db.getMedium().dump().bucket);
            //log?.('storage:', db.getMedium().dump().storage);
            await db.stopAsync();
            await db.dropDbAsync();
            //if(log) log(l);
        }

        async function testWithSizeAsLimit(dbOptions, createMedium, bucketLufo, dataLufo, log) {
            log = DEBUG ? log : undefined;
            cnt = 0;
            dbOptions.count = 5;
            dbOptions.sortMs = false;
            dbOptions.createMedium = createMedium;
            db = await createDbAsync(dbOptions, log);
            if(bucketLufo) db.setBucketLufo(bucketLufo);
            if(dataLufo) db.setDataLufo(dataLufo);

            //L('add');
            await add('a45');
            bucket = await add('a46');
            await assertBucket(bucket,
                ['a45', 'a46'],
                [{cnt:1},{cnt:2}],
                '9', 42, 42
            );
            await add('a47');
            await add('a48');
            await del('a48');
            await assertBucket('94',
                ['a47'],
                [{cnt:3}],
                '94', 21, 42
            );
            //L('update');
            await add('a45', {foo:'b45'}); // to big to fit in bucket9 so it will be moved
            await assertBucket('9',
                ['a46'],
                [{cnt:2}],
                '9', 21, 42
            );
            await db.garbageCollectionAsync('9');
            await assertBucket('9',
                ['a46'],
                [{cnt:2}],
                '9', 21, 21
            );
            await del('a46');
            await db.garbageCollectionAsync('9');
            bucket = await add('a40', {foo:'b40'}); // garbage collection will release spaced so that it can fit into bucket9
            await assertBucket(bucket,
                ['a40'],
                [{cnt:6}],
                '9', 33, 33
            );
            await del('a45');
            await hasBucket('948', false);

            //log?.('jobQueue:', db.getQueue());
            //log?.('bucket:', db.getMedium().dump().bucket);
            //log?.('storage:', db.getMedium().dump().storage);
            await db.stopAsync();
            await db.dropDbAsync();
        }

        async function testSort(dbOptions, createMedium, bucketLufo, dataLufo, log) {
            log = DEBUG ? log : undefined;
            cnt = 0;
            dbOptions.count = 4;
            dbOptions.bytes = 100;
            dbOptions.garbageBytes = 10;
            dbOptions.sortMs = Number.MAX_SAFE_INTEGER; // sort as much as possible
            dbOptions.createMedium = createMedium;
            db = await createDbAsync(dbOptions, log);
            // note: lufo might affect the sorting order,
            // because getAsync triggers garbage collection
            // note: data stored in lufo will not get hits,
            // because bucket would have been have to be loaded
            // updated and saved, which renders the whole point
            // of using lufos mute. also hits only helps sorting
            // the database so its not that important

            await add('a41'); await db.getAsync('a42'); // this will be replaced because is before 42 and thats how sorting works
            await add('a42'); // this is never retrieved, hence gets low hits
            await add('a43'); await db.getAsync('a43'); await db.getAsync('a43'); // gets most hits
            await add('a44'); // will be deleted later so no need to give it hits

            await add('a45'); await db.getAsync('a45'); await db.getAsync('a45'); // create 94

            await add('a46'); 

            await del('a44'); // create garbage in 9
            await db.garbageCollectionAsync('9'); // 45 should replace 41
            await assertBucket('9',
                ['a42', 'a43','a45'],
                [{cnt:2},{cnt:3},{cnt:5}],
                '9', 63, 63
            );
            await add('a47');
            await add('a30');
            await add('a31');
            await assertBucket('9',
                ['a42', 'a43','a45','a47'],
                [{cnt:2},{cnt:3},{cnt:5},{cnt:7}],
                '9', 84, 84
            );
            await assertBucket('94',
                ['a41', 'a46','a30','a31'],
                [{cnt:1},{cnt:6},{cnt:8},{cnt:9}],
                '94', 84, 84
            );
            await del('a41');
            await del('a42');
            await del('a43');
            await del('a45');
            await del('a47');
            await db.garbageCollectionAsync('9'); // sort should work also with empty buckets
            await db.dropDbAsync();
        }

        const
            endTest = async (label, countOperations, db, isDrop, log) => {
                const
                    analytic = db.getStats(),
                    worktime = analytic.time.work,
                    workPerOps = worktime / countOperations;
                await db.stopAsync();
                if(isDrop) await db.dropDbAsync();
                if(log) {
                    log(`- Test: ${label} -
Operations: ${countOperations}   Worktime: ${worktime} ms
Avg operation duration: ${workPerOps} ms
Analytic:`);
                    log(analytic);
                    log(label + ':');
                    log('   Mem cache Bucket:', !!bucketLufo, ' Data:', !!dataLufo);
                    log('   Operations per second:', (1000/workPerOps));
                    log('done');
                }
            },
            createData = (minDataBytes, maxDataBytes, s='+') => {
                if(minDataBytes < 2 || maxDataBytes < 2) throw new Error(`${minDataBytes}/${maxDataBytes}`); 
                const size = minDataBytes + Math.floor(Math.random()*(maxDataBytes-minDataBytes));
                for(let i = 1, r; i < size-1; i++) {
                    r = Math.random();
                    if(r >= 0 && r < 0.3) s += 'a'
                    else if(r >= 0.3 && r < 0.6) s += 'b'
                    else if(r >= 0.6 && r <= 1) s += 'c'
                }
                s +='-'
                //console.log(size, getSize(s), s);
                return s;
            },
            populate = async (nbrItems, prefix='a', weight=2) => {
                const
                    gets = [],
                    g = (k) => {
                        gets.push(async () => {
                            await db.getAsync(k);
                        });
                    };
                for(let i = 0, v, k; i < nbrItems; i++) {
                    //v = {d:createData(weight)}; //console.log(v);
                    k = `${prefix}${i}`;
                    //await add(k, v);
                    await add(k);
                    g(k);
                }
                return gets;
            };

        async function testSpeedAdd(nbrItems, dbOptions, bucketLufo, dataLufo, log) {
            log = DEBUG ? log : undefined;
            cnt = 0;
            db = await createDbAsync(dbOptions, log);
            if(bucketLufo) db.setBucketLufo(bucketLufo);
            if(dataLufo) db.setDataLufo(dataLufo);
            const startTime = Date.now();
            await populate(nbrItems);
            await endTest('SET', nbrItems, db, true, log);
        }

        async function testSpeedGet(nbrItems, dbOptions, bucketLufo, dataLufo, log) {
            log = DEBUG ? log : undefined;
            cnt = 0;
            db = await createDbAsync(dbOptions, log);
            if(bucketLufo) db.setBucketLufo(bucketLufo);
            if(dataLufo) db.setDataLufo(dataLufo);
            const gets = await populate(nbrItems); //L(gets);

            while(gets.length) {
                await gets.pop()();
            }
            await endTest('GET', nbrItems, db, true, log);
        }
        async function testSpeedSetGet(nbrItems, dbOptions, bucketLufo, dataLufo, log) {
            log = DEBUG ? log : undefined;
            cnt = 0;
            db = await createDbAsync(dbOptions, log);
            if(bucketLufo) db.setBucketLufo(bucketLufo);
            if(dataLufo) db.setDataLufo(dataLufo);
            const items = [];
            for(let i = 0, key, val; i < nbrItems; i++) {
                key = 'key' + i; val = 'val';
                for(let j = 0; j < 100; j++) {
                    val += i;
                }
                items.push({key:val});
            }
            for(let i = 0, o; i < items.length; i++) {
                o = items[i];
                await db.setAsync(o.key, o);
            }
            for(let i = 0, o; i < items.length; i++) {
                o = items[i];
                await db.getAsync(o.key);
            }
            await endTest('SET,GET', nbrItems, db, true, log);
        }

        async function testRandom(label, nbrItems, minDataBytes, maxDataBytes, dbOptions, bucketLufo, dataLufo, drop=true, log) {
            log = DEBUG ? log : undefined;
            cnt = 0;
            dbOptions.createMedium = createFileMediumAsync;
            db = await createDbAsync(dbOptions, log);
            if(bucketLufo) db.setBucketLufo(bucketLufo);
            if(dataLufo) db.setDataLufo(dataLufo);

            let
                operations = 0,
                arr = [];

           //const sleep = async () => {return new Promise((r) => {setTimeout(r, 1000);});};
           for(let i = 0, k, pos, key, action, data; i < nbrItems; i++) {
                k = 'r_' + i + '_' + Math.random();
                await add(k, {d:createData(minDataBytes, maxDataBytes)});
                operations++;
                arr.push(k);
                pos = Math.floor(Math.random() * arr.length);
                key = arr[pos];
                action = Math.random();
                if(action >= 0 && action < 0.3) {
                    data = createData(minDataBytes, maxDataBytes);
                    await db.setAsync(key, data, {size:getSize(data)});
                    operations++;
                } else if(action >= 0.3 && action < 0.6) {
                    await db.getAsync(key);
                    operations++;
                } else if(action >= 0.6 && action < 1) {
                    await db.deleteAsync(key);
                    operations++;
                }
                //await sleep(); // to test that idle/work analytic works
            }
            await endTest(label, operations, db, drop, log);
        }

        // the capacity of the lufo should not matter at all.
        // the biggest danger of using a lufo,
        // is that stored items are never written to disc and/or
        // distribute stale items.
        const
            percent = (v, p) => Math.floor(v*(p/100));

        let nbrItems,
            dbOptions = {
                count: null,
                bytes: null,
                garbageBytes: null,
                sortMs: false,
                index: null,
                cache: null,
                createMedium: null
            },
            bucketLufo = {
                maxKeys: 1,
                maxSize: false
            },
            dataLufo = {
                maxKeys: 1,
                maxSize: false
            };

        if(TEST_REGRESSION) {
            // lifecycle
            if(memory) await testStartStopDrop(createTestMedium);
            if(isTestFile) await testStartStopDrop(createFileMediumAsync);

            // count
            if(memory) await testWithCountAsLimit(dbOptions, createTestMedium);
            if(isTestFile) await testWithCountAsLimit(dbOptions, createFileMediumAsync);

            // size
            dbOptions.bytes = 43;
            if(memory) await testWithSizeAsLimit(dbOptions, createTestMedium);
            if(memory) await testWithSizeAsLimit(dbOptions, createTestMedium, createLufo(bucketLufo));
            if(memory) await testWithSizeAsLimit(dbOptions, createTestMedium, undefined, createLufo(dataLufo));
            if(memory) await testWithSizeAsLimit(dbOptions, createTestMedium, createLufo(bucketLufo), createLufo(dataLufo));
            if(isTestFile) await testWithSizeAsLimit(dbOptions, createFileMediumAsync);
            if(isTestFile) await testWithSizeAsLimit(dbOptions, createFileMediumAsync, createLufo(bucketLufo));
            if(isTestFile) await testWithSizeAsLimit(dbOptions, createFileMediumAsync, undefined, createLufo(dataLufo));
            if(isTestFile) await testWithSizeAsLimit(dbOptions, createFileMediumAsync, createLufo(bucketLufo), createLufo(dataLufo));

            // sort
            dbOptions.sortMs = 1000*60;
            if(memory) await testSort(dbOptions, createTestMedium);
            if(isTestFile) await testSort(dbOptions, createFileMediumAsync);
        }

        // speed
        if(TEST_SPEED && isTestFile) {
            nbrItems = 1000;
            dbOptions.createMedium = createFileMediumAsync;
            dbOptions.count = 100100;
            dbOptions.bytes = (50*MBFactor);
            dbOptions.garbageBytes = percent(dbOptions.bytes, 20);
            dbOptions.sortMs = 100;
                                // undefined = no limit
            //bucketLufo.maxKeys = undefined;
            //bucketLufo.maxSize = (500*MBFactor);
            //dataLufo.maxKeys = undefined;
            //dataLufo.maxSize = (250*MBFactor);
            bucketLufo.maxKeys = undefined;
            bucketLufo.maxSize = undefined;
            dataLufo.maxKeys = undefined;
            dataLufo.maxSize = undefined;


            // add
            await testSpeedAdd(nbrItems, dbOptions, undefined, undefined, L);
            await testSpeedAdd(nbrItems, dbOptions, createLufo(bucketLufo), undefined, L);
            await testSpeedAdd(nbrItems, dbOptions, undefined, createLufo(dataLufo), L);
            await testSpeedAdd(nbrItems, dbOptions, createLufo(bucketLufo), createLufo(dataLufo), L);

            // get
            await testSpeedGet(nbrItems, dbOptions, undefined, undefined, L);
            await testSpeedGet(nbrItems, dbOptions, createLufo(bucketLufo), undefined, L);
            await testSpeedGet(nbrItems, dbOptions, undefined, createLufo(dataLufo), L);
            await testSpeedGet(nbrItems, dbOptions, createLufo(bucketLufo), createLufo(dataLufo), L);

            // set and get
            await testSpeedSetGet(nbrItems, dbOptions, createLufo(bucketLufo), createLufo(dataLufo), L);
        }

        if(TEST_RANDOM && isTestFile) {
            const runRandom = async ({
                label, count, mb, bytes,
                bucketSizeInPercent, garbageSizeInPercent,
                bucketLufoCountInPercent, dataLufoCountInPercent,
                minDataBytes, maxDataBytes,
                lufo=false, sortMs=400, drop=true,
                log
            }) => {
                // random
                nbrItems = count;
                dbOptions.count = percent(nbrItems, bucketSizeInPercent);
                dbOptions.bytes = bytes || mb * 1000000/*bytes per mb*/;
                dbOptions.sortMs = sortMs;
                dbOptions.garbageBytes = percent(dbOptions.bytes, garbageSizeInPercent); // TODO 0.2
                bucketLufo.maxKeys = percent(nbrItems, bucketLufoCountInPercent);
                bucketLufo.maxSize = undefined;
                dataLufo.maxKeys = percent(nbrItems, dataLufoCountInPercent);
                dataLufo.maxSize = undefined;
                const args = [label, nbrItems, minDataBytes, maxDataBytes, dbOptions];
                if(lufo) {
                    args.push( createLufo(bucketLufo) );
                    args.push( createLufo(dataLufo) );
                } else {
                    args.push(undefined);
                    args.push(undefined);
                }
                args.push(drop);
                args.push(log);
                await testRandom(...args);
            }

            await runRandom({
                label: 'many small items with big enough bucket to fit all',
                count:900, mb:10,
                minDataBytes:2, maxDataBytes:1000,
                bucketSizeInPercent:1000, garbageSizeInPercent:20,
                bucketLufoCountInPercent:10, dataLufoCountInPercent:10,
                lufo:true,
                drop:true,
                log: L
            });

            await runRandom({
                label: 'small items in small buckets',
                count:900, bytes:500,
                minDataBytes:2, maxDataBytes:100,
                bucketSizeInPercent:100, garbageSizeInPercent:20,
                bucketLufoCountInPercent:10, dataLufoCountInPercent:10,
                lufo:true,
                drop:true,
                log: L
            });

            await runRandom({
                label: 'big items in bucket big enough to fit them all',
                count:10, mb:50,
                minDataBytes:(1*MBFactor), maxDataBytes:(2*MBFactor),
                bucketSizeInPercent:100, garbageSizeInPercent:20,
                bucketLufoCountInPercent:10, dataLufoCountInPercent:10,
                lufo:true,
                drop:true,
                log: L
            });

            await runRandom({
                label: 'big items in buckets that can hold a few',
                count:10, mb:5,
                minDataBytes:(1*MBFactor), maxDataBytes:(2*MBFactor),
                bucketSizeInPercent:100, garbageSizeInPercent:20,
                bucketLufoCountInPercent:10, dataLufoCountInPercent:10,
                lufo:true,
                drop:true,
                log: L
            });

            //await runRandom({
            //    label: 'dev: try to crash it',
            //    count:10200, mb:undefined,
            //    minDataBytes:100, maxDataBytes:200,
            //    bucketSizeInPercent:2, garbageSizeInPercent:20,
            //    bucketLufoCountInPercent:2, dataLufoCountInPercent:10,
            //    lufo:true,
            //    drop:true,
            //    log: L
            //});
       }
    } catch(e) {
        E(e);
    } finally {
        //if(DEBUG) L('test done', {cnt});
    }
})({});


