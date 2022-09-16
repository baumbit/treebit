#!/usr/bin/env node
import fs from 'fs';
import fsPromises from 'fs/promises';
import buffer from 'buffer';
import { setupInNodeJsAsync, createBucketTreeDbAsync } from './buckettree-db.js'
await setupInNodeJsAsync({buffer, fsPromises, fs});
const basePath = './test-buckettree-db-artifacts';

    //  *** create and start database ***
const db = await createBucketTreeDbAsync({
    count: 2,                       // max nbr items in an index file (i.e. a bucket)
    index: 1000,                    // number of indices (buckets) to store in a memory cache
    cache: 50000,                   // max size in bytes to store in dataLufo
    path: basePath + '/example'
});
await db.setAsync('foo', {hello:'world'});      // set
console.log('get',  await db.getAsync('foo'));  // get
await db.deleteAsync('foo');                    // delete
console.log('stats:', db.getStats());           // debug
await db.stopAsync();                           // stop database
await db.dropDbAsync();                         // remove physical files

