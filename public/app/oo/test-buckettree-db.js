#!/usr/bin/env node
// $ ./launch-nodejs-stress.js test-buckettree-db.js 100
import fs from 'fs';
import fsPromises from 'fs/promises';
import buffer from 'buffer';
import {setupInNodeJs as setupInNodeJsUtils, onPlatformEvent, createOrl, EXIT_EVENT} from './utils.js';
import * as crypto from 'crypto';
import {Buffer} from 'buffer';
setupInNodeJsUtils({crypto, Buffer});

//await setupInNodeJsBucketTreeDbAsync({buffer, fsPromises, fs}, {testBasePath:`${BASE_PATH_DB}/_test-buckettree-db`, isTestFile:isDbTestFile});¶
//await setupInNodeJsBucketTreeDbAsync({buffer, fsPromises, fs}, {isTestFile:false});
import {setupInNodeJsAsync, createBucketTreeDbAsync} from './buckettree-db.js';
await setupInNodeJsAsync({buffer, fsPromises, fs}, {isTestFile:false});

const basePath = './_stress-test-buckettree-db-artifacts';

async function waitAsync(v) {
    const ms = Math.floor(Math.random() * v);
    //console.log('Waiting', ms, 'ms.');
    return new Promise( res => setTimeout(res, ms) );
}

function createValue(v, s='') {
    const limit = Math.ceil(Math.random() * v);
    for(let i = 0; i < limit; i++) {
        s += 's-' + i;
    }
    return s;
}

async function createDb() {
    const db = await createBucketTreeDbAsync({
        count: 10,                       // max nbr items in an index file (i.e. a bucket)
        index: 2,                        // number of indices (buckets) to store in a memory cache
        cache: 5000,                     // max size in bytes to store in dataLufo
        path: basePath + '/example'
    });
    return db;
}

//console.log('>>>>>> Opening database');
const oldDb = await createDb();
//console.log('Stats:', oldDb.getStats());
for(let i = 0; i < 1000; i++) {
    let oldKey = 'foo-' + i;
    let oldRead = await oldDb.getAsync(oldKey);
    if(oldRead) {
        let oldObj = JSON.parse(oldRead);
        if(!oldObj.hello) throw new Error('hello not found. ');
        //else console.log('parsed old data successfully', i);
        //console.log('parsed this', {oldObj});
    }
    //console.log(oldRead);

}
await oldDb.dropDbAsync();

async function verifyValue(db, key, writeValue, keys) {
    let readValue = JSON.parse(await db.getAsync(key));
    if(writeValue !== readValue.hello) {
        console.error('Write and read value does not match!');
        console.log(readValue);
    }
    let keyList = Object.keys(keys)
    let keysNbr = Math.floor(Math.random()*keyList.length);
    let expectedRandomObj = keys[keyList[keysNbr]]; //console.log(keyList, keys, keysNbr, );
    let readRandomObj;
    let readRandomObjParsed;
    try {
        readRandomObj = await db.getAsync(expectedRandomObj.key);
        readRandomObjParsed = JSON.parse(readRandomObj);
        if(expectedRandomObj.writeValue !== readRandomObjParsed.hello) {
            throw new Error('Random Write and read value does not match!');
        }
    } catch(e) {
        console.log({expectedRandomObj, readRandomObj, keysNbr, keysLen:keys.length});
        console.log('ERROR ON  R A N D O M   KEY', i, keys.length);
        throw e;
    }
}

let db;
async function runTestAsync() {
    let keys;
    for(let i = 0; i < 1000; i++) {
        // create database
        if(!db) {
            //console.log('Create new db', i);
            db = await createDb();
            keys = {};
        } else {
            await waitAsync(Math.random() > 0.5 ? 10 : 50);
        }

        // mutate
        let key = 'foo-' + i;
        let writeValue = createValue(Math.random() > 0.5 ? 100 : 10000);
        keys[key] = {key, writeValue};
        await db.setAsync(key, JSON.stringify({hello:writeValue}));      // set
        await verifyValue(db, key, writeValue, keys);
        if(Math.random() > 0.5) { //console.log('delete');
            await db.deleteAsync(key);
            delete keys[key]
        }

        if(Math.random() > 0.6) {
            //console.log('reset value');
            writeValue = createValue(Math.random() > 0.5 ? 100 : 10000);
            await db.setAsync(key, JSON.stringify({hello:writeValue}));      // set
            keys[key] = {key, writeValue};
            await verifyValue(db, key, writeValue, keys);
        }

        // drop database
        let rnd = Math.random();
        if(rnd > 0.75) {
            await db.stopAsync();                           // stop database
            db = null;
        }
    }
    //if(db) {
    //    let rnd = Math.random();
    //    if(rnd > 0.6) {
    //        //console.log('stopping db');
    //        await db.stopAsync();                           // stop database
    //        db = null;
    //    } else if(rnd > 0.3) {
    //        //console.log('dropping database');
    //        await db.dropDbAsync();                         // remove physical files
    //        db = null;
    //    } else {
    //        //console.log('do nothing');
    //    }
    //}
    //console.log('++++++++ bucketdb ran to completion ++++++++++++++++');
}
onPlatformEvent(EXIT_EVENT, async (sig) => {
    if(db) {
        let rnd = Math.random();
        if(rnd > 0.5) {
            console.log('EXIT: stopping db');
            await db.stopAsync();                           // stop database
            db = null;
        } else if(rnd > 0.3) {
            console.log('EXIT: dropping database');
            await db.dropDbAsync();                         // remove physical files
            db = null;
        } else {
            console.log('EXIT: do nothing');
            //console.log('do nothing');
        }
    }
});

await runTestAsync();
