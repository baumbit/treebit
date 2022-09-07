//const oldLog = console.log; console.log = function() { oldLog(...arguments); console.trace() };
// setup environment
const
    log = console.log;
log('*** Starting Treebit Hotel ***');
// app options
let serverArgv = process.argv.slice(2); //console.log({serverArgv});
const
    arg = (s, d) => {
        let a = serverArgv.find((a, i) => a.toLowerCase().startsWith('--'+s.toLowerCase()));
        if(d === undefined && a) return true;
        if(!a) return ''+d;
        a = a.split('=');
        if(a.length === 1) return d;
        if(a.length === 2) return a[1]
        return undefined;
    },
    isShowHelp = arg('help') === true;

const
    DEV = arg('dev') === true,

    isDbTestFile = arg('dbtest', 'false') === 'true',
    newTorrc = arg('tor-new', 'false') === 'true',
    torNetEnabled = arg('tor-network', 'true') === 'true',
    torPublish = arg('tor-publish', 'true') === 'true',

    BASE_PATH_SERVER = arg('basepath', process.cwd()),
    // since its possible to run several hotels on the same machine,
    // a hotel is internally identified by which port it is listening on.
    // a hotel can easily be moved/cloned by copying the ./_secret/<hotel port number>
    // folder and moving it to a new location.
    PORT_CN = arg('port', 9002), // port on clearnet
    HOST_CN = arg('host', 'localhost'),
    PROTOCOL_CN = arg('clearnet', 'http'),
    ORIGIN_CN = PORT_CN === '80' ? `${PROTOCOL_CN}://${HOST_CN}` : `${PROTOCOL_CN}://${HOST_CN}:${PORT_CN}`,

    // tor=<port number> | tor=false (to disable tor) | or defaults to 9020 if undefined
    PORT_TOR = arg('tor-port', 9020),
    PORT_TOR_ONION_SERVICE = arg('onion-service', 9021),
    // each hotel gets a dedicated tor folder and is served by a dedicated tor instance
    PATH_TOR = `${BASE_PATH_SERVER.split('/').splice(0, BASE_PATH_SERVER.split('/').length-1).join('/')}/_secret/${PORT_CN}/tor`,

    // app data is stored in storage
    BASE_PATH_DB = arg('dbpath', `../_secret/${PORT_CN}/storage`);

if(isShowHelp) {
    log(`Hotel options: [--port=string] [--host=string] [--clearnet=string] [--tor=string] [--onion-service=string] [--dbpath=string] [--basepath=string] [--dbtest=string] [--tor-new=string] [--tor-publish=string] [--tor-network=string]

Hosting
    --port              Port for server listening to clearnet. (default: ${PORT_CN})
    --host              Server hosting address. (default: ${HOST_CN})
    --clearnet          Server clearnet protocol. (default: ${PROTOCOL_CN})
    --tor-port          Port number or "=false" to fully disable TOR. (default: ${PORT_TOR})
    --onion-service     TOR onion service communication port. (default: ${PORT_TOR_ONION_SERVICE})

Internals
    --basepath          Server will serve files from this file path. (default: <project root>/public)
    --dbpath            Server file path data storage, relative to basepath. (default: ${BASE_PATH_DB})

Development
    --dev               Run in a development environment.
    --tor-new           If "=true" the current torrc will be deleted and a fresh one created. (default: ${newTorrc})
    --tor-publish       If "=true" the onion service will be published. (default: ${torPublish})
    --tor-network       If "=false" TOR will be started, but network communication will be turned off. (default: ${torNetEnabled})
    --dbtest            If "=true" then run bucketdb test suite also on file ssytem (slow). (default: ${isDbTestFile})

Note that it is possible to run many hotel instances at the same time. The different instances are uniquely identified using the clearnet host port (also when only accessible through TOR for the outside world). Each instance will store the hosted node data, TOR resources, etc, on the file system in a folder named by the host port. A hotel instance gets its own TOR instance, and all the nodes hosted by a hotel share the same TOR instance.`);
    process.exit();
}

export function getBasePathDb() { return BASE_PATH_DB; };

// setup all (even those not used in this file) platform specific dependencies
import {setupInNodeJs as setupInNodeJsUtils, onPlatformEvent, createOrl, EXIT_EVENT} from '../../oo/utils.js';
import * as crypto from 'crypto';
import {Buffer} from 'buffer';
setupInNodeJsUtils({crypto, Buffer});

import {setupInNodeJsAsync as setupInNodeJsBucketTreeDbAsync} from '../../oo/buckettree-db.js';
import fsPromises from 'fs/promises';
import fs from 'fs';
import buffer from 'buffer';
console.log('Run bucketdb test:', isDbTestFile);
await setupInNodeJsBucketTreeDbAsync({buffer, fsPromises, fs}, {testBasePath:`${BASE_PATH_DB}/test-buckettree-db`, isTestFile:isDbTestFile});

import {setupInNodeJs as setupInNodeJsStorage} from '../storage.js';
setupInNodeJsStorage({basePath:`${BASE_PATH_DB}/app`});

// hotel internals
import {createSnatchAsync, createUserDbAsync} from '../../oo/snatch-session.js';
const userDb = await createUserDbAsync(`${BASE_PATH_DB}/dashboard/users`);
const snatch = await createSnatchAsync({db:userDb, log});
const manager = await createManagerAsync(BASE_PATH_DB, snatch, log);
export function getSnatch() { return snatch; };
export function getManager() { return manager; };

import OO from '../../oo/oo.js';
import * as http from 'http';
import * as https from 'https';
import {homeServer} from './home/home.js';
import {dashboardServer} from './dashboard/dashboard.js';
import {webTreehutServer} from './webtreehut/webtreehut.js';
import {createStaticFileServer} from './static-file-server.js';
const staticFileServer = createStaticFileServer(BASE_PATH_SERVER);
import {createManagerAsync} from './manager.js';

function router(req, res, protocol) { log(`Server request: "${req.url}"`);                        //console.log(res);
    if(req.url.endsWith('.js') || req.url.endsWith('.otf') || req.url.endsWith('.css')) {
        // serve static files
        // meant as a fallback should a more efficient static filer
        // server such as Nginx not be present
        staticFileServer(req, res, protocol);
    } else if(req.url.startsWith('/node')) {
        webTreehutServer(req, res, protocol);
    } else if(req.url.startsWith('/dashboard')) {
        dashboardServer(req, res, protocol);
    } else if(req.url === '/' || req.url.startsWith('/?')) {
        homeServer(req, res, protocol);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.write(`404: not found`);
        res.end();
    }
}

// web server
let clearnetServer;
if(PROTOCOL_CN === 'http') {
    clearnetServer = http.createServer(function(req, res) {
        const protocol = {isOnion: false, isClearnet: true};
        router(req, res, protocol);
    });
} else {
    let certPath;
    if(DEV) certPath = '../_dev/cert';
    else throw new Error('TODO: Feature not implemented uet. Add certificate for production SSL environment');
    clearnetServer = https.createServer({key: fs.readFileSync(certPath + '/server.key'), cert: fs.readFileSync(certPath+'/server.cert')}, function(req, res) {
        const protocol = {isOnion: false, isClearnet: true};
        router(req, res, protocol);
    });
}
clearnetServer.listen(PORT_CN);
log('Servering to clearnet from path', BASE_PATH_SERVER, 'on port', clearnetServer.address().port);

// tor
import {createOnionServiceAsync} from './tor.js';
const tor = PORT_TOR.toLowerCase() !== 'false' && await createOnionServiceAsync(PATH_TOR, PORT_TOR, PORT_TOR_ONION_SERVICE, router, {newTorrc, torNetEnabled, torPublish});
if(tor) console.log('tor onion service hostname:', tor.hostname);
else console.log('tor is disabled');

// exit
onPlatformEvent(EXIT_EVENT, ({hard}) => {
    if(tor) {
        if(hard) tor.close();
        else console.log('intentionally did not close tor');
    }
    clearnetServer.close();
    log('Clearnet server stopped');
});

// hotel helpers
export function getHotelOrl(options={onion:true, cn:true}) {
    if(options.onion && options.cn) {
        return {
            cn: ORIGIN_CN,
            onion: tor ? tor.hostname : null
        };
    } else if(options.cn) {
        return ORIGIN_CN;
    }
    if(tor) return tor.hostname;
    //throw new Error(`bad state. asking for an Onion address but Tor is disabled.`);
};

export function isSameHotel(url) {
    const
        orl = createOrl(url),
        onion = orl.isOnion,
        hotelOrl = getHotelOrl({onion, cn:!onion}),
        is = orl.origin === hotelOrl; //console.log('isSameHotel', is, {orl, hotelOrl});
    return is;
};
log('\r\n')
if(DEV) log('Running in development environment.');
log('Hotel is now listening on');
log(`Clearnet ${PROTOCOL_CN === 'https' ? '(SSL) ' : ''}- ${PROTOCOL_CN}://${HOST_CN}:${clearnetServer.address().port}`);
if(tor) log(`Tor - ${tor.hostname}${torNetEnabled ? '' : ' (network is disabled)'}${torPublish ? '' : ' (onion service publishing is disabled)'}`);
