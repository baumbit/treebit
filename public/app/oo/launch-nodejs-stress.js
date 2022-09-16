#!/usr/bin/env node
import process from 'process';
const basePath = process.argv[2];
const nodeArgs = process.argv.slice(2);
//console.log({basePath, nodeArgs});//process.exit();
if(!nodeArgs.length) {
    console.log('Will randomly spawn and kill process, stressing it to the max.');
    console.log('Example:');
    console.log('$ ./launch-nodejs-stress.js <./file.js> <number of itterations> <--trace-uncaught --expose-gc');
    process.exit(0);
}

import fs from 'fs';
import { spawn } from 'child_process';
let child;
let stresserId = Math.floor((Math.random() * 1000)) + '-' + new Date();

async function startChildProcess() {
    console.log(...arguments);
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

async function waitAsync(v) {
    const ms = Math.floor(Math.random() * v);
    //console.log('Waiting', ms, 'ms.');
    return new Promise( res => setTimeout(res, ms) );
}

(async () => {
    const ITTERATIONS = parseInt(nodeArgs[1], 10); console.log('Stressing', {ITTERATIONS, nodeArgs});
    for(let i = 0; i < ITTERATIONS; i++) {
        //await waitAsync(Math.random() > 0.5 ? 10 : 200);
        await startChildProcess('\r\n[ S P A W N ] :', i, stresserId, nodeArgs);
        await waitAsync(Math.random() > 0.5 ? 1000 : 3000);
        if(child) {
            console.log('[ T E R M I N A T E ] ' + stresserId);
            //child.kill("SIGTERM");
            child.kill(9);
        }
    }
})();

