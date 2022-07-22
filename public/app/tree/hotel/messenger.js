/**
 * Transport layer for sending messages between tree nodes.
 * TODO     this is a reverse proxy, make sure to prevent malicious entities to exploit this reverse proxy.
 */
import * as http from 'http';
import * as GRAPEVINE from '../grapevine/grapevine.js';
import {createOrl} from '../../oo/utils.js';
import {isSameHotel} from './server.js';
import {handleGrapevineApiAsync, parseWebTreehutUrl} from './webtreehut/webtreehut.js';

export const
    SEND = 'MESSENGER_SEND',
    REJECTED = 'MESSENGER_REJECTED',
    RECEIEVE = 'MESSENGER_RECEIEVE';

function requestAsync(url, data) {  //console.log('-------->', url, data); console.trace();
    return new Promise(async (resolve, reject) => {

        const orl = createOrl(url);

        if(isSameHotel(orl)) {
            // send request to same hotel
            url = orl.pathname + orl.search;
            const {nodeId, isGrapevineApi} = parseWebTreehutUrl(url);
            if(!isGrapevineApi) reject(new Error('not a grapevine request'));
            resolve(await handleGrapevineApiAsync(nodeId, data));
        } else {
            // send request to external hotel
            const postData = JSON.stringify(data);

            const options = {
                hostname: orl.hostname,
                port: orl.port,
                path: orl.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }; //console.log('requestAsync options', options);

            const req = http.request(options, (res) => {
                //console.log(`STATUS: ${res.statusCode}`);
                //console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
                let rawData = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => { rawData += chunk; });
                res.on('end', () => { //console.log('rawData', rawData);
                    resolve(rawData);
                });
            });

            req.on('error', reject);

            req.write(postData);
            req.end();
        }
    });
}

export function createMessenger(ß) {
    const
        log = ß.log.log('MESSENGER', 3);

    async function sendAsync(message) {                 log.n(2, 'sending', message); //console.log('sendAsync', {message});
        let url = message.to;

        if(!url) return log.e('bad message. unspecified destination', message);
        else if(!message.api) return log.e('bad message. unspecified api', message);

        if(message.api === GRAPEVINE.API) {
            if(url.endsWith('/')) {
                throw new Error(`bad url(${url}): trailing dash.`);
            }
            url += '/api/' + GRAPEVINE.API;
        }

        return requestAsync(url, message).catch(e => {
            if(e) log.e(e.message, message);
            throw new Error(e.message);
        });
    }

    async function receiveAsync(message) {              log.n(2, 'receive', message); //console.log('receiveAsync', {message});
        if(message.api === GRAPEVINE.API) {
            return await ß.grapevine.handleEnvelopeAsync(message);
        }

        log.e('rejected', message);
        throw new Error(REJECTED);
    }

    return {
        sendAsync,
        receiveAsync
    };
};

