#!/usr/bin/env node
import process from 'process';
const basePath = process.argv[2];
const nodeArgs = process.argv.slice(3);
//console.log({basePath, nodeArgs});//process.exit();
if(!nodeArgs.length) {
    console.log('Example:');
    console.log('$ ./launch-nodejs-watch.js <./basePath> <--trace-uncaught --expose-gc ./file.js>');
    process.exit(0);
}
const importPath = nodeArgs[0];
//const obeservePath = nodeArgs[1] || process.argv[1].split('/').reverse()[0];
//console.log('Observering mutations on path', obeservePath);

import fs from 'fs';
import {resolve} from 'path';
const {readdir, open, stat} = fs.promises;
let index = {};
async function updateIndex(dir='.') {
    const dirents = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map(async (dirent) => {
        let res = resolve(dir, dirent.name);
        if(!index[res]) {
            index[res] = {path:res};
        }
        if(dirent.isDirectory()) await updateIndex(res);
    }));
}

//import util from 'util';
import { spawn } from 'child_process';
let child;
async function startChildProcess() {
    if(child) child.kill("SIGTERM");
    console.log('node', nodeArgs);
    child = spawn('node', nodeArgs, {
        cwd: process.cwd(),
        detached: true,
        stdio: "inherit"
    });
}

async function watch() {
    for(let o in index) {
        o = index[o]; //console.log(o);
        fs.watch(o.path, async (eventType, filename) => {
            await startChildProcess();
        });
    }
}

process.on('SIGINT', () => {
    if(child) child.kill("SIGINT");
    console.log('stopped watching platform events');
    process.exit(1);
});

(async () => {
    await startChildProcess();
    await updateIndex(basePath);
    await watch();
    console.log('started watching platform events');
})();

