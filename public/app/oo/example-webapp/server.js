import {webcrypto} from 'crypto';
process.__SHIM__ = {};
process.__SHIM__.subtle = webcrypto;

import OO from '../oo.js';
import * as http from 'http';
import fs from 'fs';
import {client} from './client.js';
import {createResourceRouter} from '../resource-oo.js';

const PORT = 9001;

function createApp() {
    const deflatedContext = undefined;//window.deflatedcOOntextFromServer;
    const store = {
        serverData: {
            hardcoded: true,
            runtime: false,
            promised: false,
            hello: 'from-server'
        },
        res: {
            planet: 'birted-on-server'
        }
    };
    const options = {
        renderVirtual: true,
        debug: 1
    }
    const oo = OO(undefined, store, deflatedContext, options);
    oo.context.setHeadlessHistory(console.log);
    // create client. notice how the same file is used client side,
    // and the same JavaScript code is used client side, to create the client.
    // the only difference is the addition of this script.
    // Note: since the ref tag 
    client(oo);
    return oo;
}

// create a router to handle client resource requests
// note: since no OO instance is sent as an argument to createResourceRouter,
// it will create one itself which is thus NOT tied to a specific OO instance.
const {addRoute, router} = createResourceRouter();
addRoute('res/planet', ({randomValue}, done, {}, {/* params i.e. url?k=v&x=y */}, {data}) => {
    done(data + ' is this many miles away: '+ randomValue);
});

const server = http.createServer(async function (req, res) { //console.log('url', req.url);
    const stopwatchStart = Date.now();
    if(req.url.endsWith('.js')) {
        fs.readFile('./' + req.url, function(err, data){
            if(err){
                res.statusCode = 500;
                res.end('Internal server error:' + err);
            } else {
                res.writeHead(200, { 'Content-Type': 'text/javascript' });
                console.log(`Url "${req.url}" read from file in ${Date.now() - stopwatchStart} millis.`);
                res.end(data);
            }
        });
    } else if(req.url.startsWith('/api')) {
        console.log('API request: ', req.url);
        let json = '';
        req.on('data', v => {
            json += v;
        });
        req.on('end', async () => {
            const data = JSON.parse(json);
            // hand over to resource router
            const parcel = await router(req.url.substring(4), data, function(routeHandler, done, props, params, data) {
                console.log('runing route pre-processing');
                routeHandler({randomValue:Math.random()}, done, props, params, data);
            }); // console.log('parcel', {parcel});
            res.writeHead(200, { 'Content-Type':  'application/json' });
            res.write(JSON.stringify(parcel));
            res.end();
        });
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' }); 
        // creating the App and wait for possible Promises registered in OO,
        // to resolve before rendering to HTML.
        const oo = await createApp();
        // let client router take over from here on,
        // it will render 404 if no route found
        oo.go(req.url);
        await oo.resolvePromisesAsync(() => {
            // all promises now resolved,
            // so now HTML can be rendered
            // note: when bootstrcliented, store will be serialized and OO import etc be inserted as a script
            const html = oo.context.asHtml({path: '../oo.js', bootstrap:true});
            console.log(`Url "${req.url}" rendered to HTML in ${Date.now() - stopwatchStart} millis.`);
            res.write(html);
            res.end();
        });
    }
});
server.listen(PORT);
console.log('running on port', PORT);
