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

import fs from 'fs';
import { spawn } from 'child_process';
let child;
let watcherId = Math.floor((Math.random() * 1000)) + '-' + new Date();

async function startChildProcess() {
    if(child) {
        console.log(watcherId + ' terminating current node');
        child.kill("SIGTERM");
    }
    console.log(watcherId + ' spwaning new node', nodeArgs);
    child = spawn('node', nodeArgs, {
        cwd: process.cwd(),
        detached: true,
        stdio: "inherit"
    });
}

process.on('SIGINT', () => {
    if(child) child.kill("SIGINT");
    console.log('stopped watching platform events');
    process.exit(1);
});

const timer = ms => new Promise( res => setTimeout(res, ms));

(async () => {
    await startChildProcess();
    let timeout, arr = [];
    fs.watch(basePath, {recursive:true}, (eventType, filename) => {
        arr.push(eventType + ' ' + filename);
        if(!timeout) { // wait for other changes to happen.
            timeout = setTimeout(async () => {
                console.log(watcherId + ' watched', arr);
                await startChildProcess();
                timeout = null;
                arr = [];
            }, 500);
        }
    });
})();

