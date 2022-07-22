#!/usr/local/bin/node
import { access, rm, open, appendFile, rename, stat, mkdir, readFile, writeFile } from 'fs/promises';
import { Buffer } from 'buffer';
import * as childProcess from 'child_process';
import * as http from 'http';

// in dev mode the hidden onion service will not be published to the rendezvous directory,
// and network is disabled.
const LOG = false; // log stuff

function promisfy(f) {
    return (cmd, opts) => {
        return new Promise((resolve, reject) => {                                       //console.log({cmd, opts});
            f(cmd, opts, function(error) {
                if(error) {
                    //console.log({error});
                    reject(arguments[1]);
                } else {
                    resolve(arguments[1].trim());
                }
            });
        });
    };
}

const execAsync = promisfy(childProcess.exec);

async function existsPath(path) {
    try {
        await stat(path);                                                               //console.log({path});
        return true;
    } catch(e) {                                                                        //console.error(e);
        return false;
    }
}

async function psAsync(name) {
    const arr = [];
    const data = await execAsync(`ps -x -o pid -o command | grep "${name}"`);             //console.log({name, data});
    data.split(/\r?\n/).forEach((s) => {
        if(!(s.indexOf('grep') >= 0)) {
            arr.push({
                text: s,
                pid: s.split(' ')[0]
            });
        }
    });
    return arr;
}

async function dirPath(path) {
    if(!await existsPath(path)) {
        await mkdir(path, {recursive: true});
    }
    await execAsync(`chmod 700 ${path}`);
    return path;
}

async function addOnionServiceAsync({dataPath, torPort, servicePort, newTorrc, torNetEnabled, torPublish}) {
    const tor = await execAsync('which tor');
    if(!tor) throw new Error('tor not found. is it installed?');

    const
        torrcPath = (await dirPath(dataPath)) + '/torrc',
        dataDirectoryPath = await dirPath(`${dataPath}/data`),
        hiddenServiceDirPath = await dirPath(`${dataPath}/onion-service/${servicePort}`);

    console.log('torrc path:', torrcPath);

    let isExists = await existsPath(torrcPath);
    let srcData = '';
    if(isExists && !newTorrc) {
        srcData = await readFile(torrcPath, 'utf8');
        if(LOG) console.log('read existing torrc', srcData);
    } else {
        srcData = `# File generated and updated automatically by tor.js\r\n`;
        await writeFile(torrcPath, new Uint8Array(Buffer.from(srcData)));
        if(LOG) console.log('torrc not found');
    }
    const torrcObj = {};
    srcData.split(/\r?\n/).map(v => {
        if(v && !v.startsWith('#')) {
            v = v.split(' ');
            torrcObj[v[0]] = v.slice(1).join(' ').replace(/\r?\n/, '');
        }
    });

    let isUpdated;
    const updateTorrcObj = (key, value) => {
        if(torrcObj[key] !== value) {
            torrcObj[key] = value;
            isUpdated = true;
            if(LOG) console.log('!!! updating torrc', key, value);
        } //else console.log('do not updated torrc', key, value, torrcObj[key]);
    };
    if(torPort) updateTorrcObj('SocksPort', torPort);                               // the port Tor is listening on for connections
    if(dataDirectoryPath) updateTorrcObj('DataDirectory', dataDirectoryPath);       // where Tor save data
    updateTorrcObj('PublishHidServDescriptors', torPublish ? '1' : '0');            // default is 1. when set service is published
    updateTorrcObj('DisableNetwork', torNetEnabled ? '0' : '1');                    // default is 1. when set service is published
    updateTorrcObj('HiddenServiceDir', hiddenServiceDirPath);                       // the hidden service file storage path
    const virtualPort = 80;                                                         // the port that people visiting your Onion Service will be using
    const portName = `${virtualPort} 127.0.0.1:${servicePort}`;                    // your web server is listening to the servicePort
    updateTorrcObj('HiddenServicePort', portName);                                  // default is 1. when set service is published

    const torWithTorrc = `${tor} -f ${torrcPath}`;                  //console.log({torWithTorrc});
    let ps = await psAsync(torWithTorrc);
    let torPid = false;
    if(ps.length > 1) throw new Error(`too many tor ps(${torWithTorrc}) are running`);
    else if(ps.length === 1) torPid = ps[0].pid;

    //isUpdated = true;
    if(isUpdated) {
        let outData = `# File generated and updated automatically by tor.js\r\n`;
        Object.keys(torrcObj).forEach(k => {
            outData += k + ' ' + torrcObj[k] + '\r\n';
        });
        if(LOG) console.log('writing new torrc', outData);
        await writeFile(torrcPath, outData);
        if(torPid !== false) {
            console.log('torrc updated. re-starting tor.');
            await execAsync(`kill ${torPid}`);
            torPid = false;
        }
    }

    let controller;
    if(!torPid) {
        try {
            controller = new AbortController();
            const { signal } = controller;
            execAsync(torWithTorrc, {signal}); // intentionally NOT awaiting
            console.log('started tor, listening port:', torPort);
        } catch(e) {
            if(e.indexOf('Address already in use') >= 0) {
                throw new Error(`unable to start Tor. address is already in use. port(${torPort})`);
            } else {
                throw e;
            }
        }
    }

    ps = await psAsync(torWithTorrc);
    if(ps.length !== 1) throw new Error(`bad number of tor ps(${torPort}) are running`);
    torPid = ps[0].pid;
    console.log('tor is running. PID', torPid);
    ps = ps[0].text.split(' ');
    ps = ps.splice(1, ps.length).join(' ');            //console.log(ps, ps === torWithTorrc);
    if(ps !== torWithTorrc) {
        console.log(`Warning! Expected Tor to be running like this(${torWithTorrc}) but found ${ps}`);
    }

    return {
        torPid,
        stop: () => {
            if(controller) {
                controller.abort();
            } else {
                // tor might have allready been running
                // and/or it was not possible to obtain a
                // controller.
                childProcess.exec(`kill ${torPid}`);
            }
        }
    };
}

async function getHostnameAsync(dataPath, servicePort, attempts) {
    if(attempts > 3) console.log('getHostnameAsync is slow', {attempts});
    if(attempts < 10) {
        const hostnamePath = `${dataPath}/onion-service/${servicePort}/hostname`;
        let hostname;
        if(await existsPath(hostnamePath)) {
            hostname = await readFile(hostnamePath, 'utf8'); //console.log({hostname});
        }
        if(hostname && hostname.indexOf('.onion') >= 0) {
            return hostname.trim(); // success
        } else {
            attempts++;
            return new Promise((resolve) => {
                setTimeout(async ()=> {
                    resolve(await getHostnameAsync(dataPath, servicePort, attempts));
                }, 1000*attempts);
            });
        }
    } else {
        throw new Error(`unable to read onion service address on path(${hostnamePath})`);
    }
}

export async function createOnionServiceAsync(dataPath, torPort, servicePort, cb, {newTorrc, torNetEnabled, torPublish}) {
    if(!cb) throw new Error(`bad server request handler cb(${cb})`);

    let onionService;

    switch(process.platform) {
        case 'darwin':
            onionService = await addOnionServiceAsync({dataPath, torPort, servicePort, newTorrc, torNetEnabled, torPublish});
            break;
        default:
            throw new Error(`un-supported platform(${process.platform})`);
    }

    const hostname = await getHostnameAsync(dataPath, servicePort, 1);

    const server = http.createServer(function (req, res) {
        const protocol = {isOnion: true, isClearnet: false};
        cb(req, res, protocol);
    });
    server.listen(servicePort, '127.0.0.1');
    console.log('Onion service web server listening port', servicePort);

    return {
        close: () => {
            console.log('closing tor PID', onionService.torPid);
            //server.close();
            onionService.stop();
        },
        hostname
    };
};

