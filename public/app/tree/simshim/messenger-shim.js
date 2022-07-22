import {clone, createOnNotify} from '../../oo/utils.js';
import * as GRAPEVINE from '../grapevine/grapevine.js';

export const
    SEND = 'MESSENGER_SEND',
    REJECTED = 'MESSENGER_REJECTED',
    RECEIEVE = 'MESSENGER_RECEIEVE';

const
    protocol = {isOnion: false, isClearnet: true, isSimshim: true};

export function createMessenger(ß) {
    const
        log = ß.log.log('MESSENGER', 10),
        {on, notify} = createOnNotify(log);

    async function sendAsync(message) {
        return new Promise((resolve, reject) => {
            notify(SEND, message, (e) => {
                if(e) {
                    log.e(e.message, message);
                    reject(e);
                }
                else resolve();
            });
        });
    }

    async function receiveAsync(message) {
        if(message.api === GRAPEVINE.API) {
            try {
                await ß.grapevine.handleEnvelopeAsync(message, protocol);
            } catch(e) {
                console.error(e);
                throw e;
            }
        } else {
            log.e('rejected', message);
            throw new Error(REJECTED);
        }
    }

    return {
        on,
        sendAsync,
        receiveAsync
    };
};

