export const
    QUOTA           = 'quotaRetriever:QUOTA';

import {CANOPY_UPDATED} from '../canopy/canopy.js';

export function createQuotaRetriever({ß, log}) {

    //
    // ß.grapevine
    // 
    function addMessage({peerProxy, message}) {
        // TODO check integrity and signature
        const
            replier = peerProxy.getReplier(),
            reply = replier.createReply(message),
            o = {peerProxy, replier, reply/*, message*/};

        if(message.type === QUOTA) replyQuota(o);
        else {
            return 'bad message';
            log?.e('unknown message type', message);
        }
    }

    async function retrieveQuotaAsync({peerProxy}) { //log?.n(0, 'retrieveQuotaAsync');
        const data = {};
        const reply = await peerProxy.getRetriever().retrieveAsync({type: QUOTA, data});
        if(!reply.error) return reply.quota;
    }

    function replyQuota({peerProxy, reply/*, message*/}) {
        reply.send({}, 0);
    }

    return {
        retrieveQuotaAsync,
        addMessage
    };
};

