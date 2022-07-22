export const
    PEERS    = 'networkRetriever:PEERS';

import {NOT_ENOUGH_QUOTA} from './replier.js';
import {everyAsync} from '../../oo/utils.js';

function zero(a) { // TODO refactor to a  utils.js
    return !(a > 0);
}

export function createNetworkRetriever({ß, log}) {

    function addMessage({peerProxy, message}) {
        // TODO check integrity and signature
        const
            replier = peerProxy.getReplier(),
            reply = replier.createReply(message),
            o = {peerProxy, reply, message};

        if(zero(replier.getAvailableQuota())) {
            reply.consumeQuota(ß.config.UPLOAD_QUOTA_FACTOR_ERROR); // prudently superflous
            reply.send({error: NOT_ENOUGH_QUOTA, friendly: 'available quota is zero'});
        }
        else if(message.type === PEERS) replyPeersAsync(o);
        else log?.e('unknown message type', message);
    }

    async function retrievePeers({peerProxy, max=10, controller}) {
        const data = {max};
        log?.(5, `retrievePeers from ${peerProxy.id}`, {'retrieve peers max': max} );
        const reply = await peerProxy.getRetriever().retrieveAsync({type: PEERS, data, controller});
        if(!reply.error) {
            const
                nodeId = ß.id,
                networkNodes = [];
            reply.peers.forEach(o => {
                const id = o.id;
                if(id !== nodeId && !ß.grapevine.hasPeer(id)) {
                    networkNodes.push(o);
                }
            });
            await everyAsync(networkNodes, ß.grapevine.addNodeBannerAsync);
        }
    }

    async function replyPeersAsync({peerProxy, reply, message}) {
        const
            cost = ß.config.QUOTA_FACTOR_SCORES,
            peers = [],
            {max} = message.data,
            {id} = peerProxy.getPublicProfile();

        await ß.grapevine.getPeerProxies().eachAsync(peerProxy => {
            if(!reply.isQuotaEnough(cost)) return false;
            if(max && peers.length >= max) return false;
            const profile = peerProxy.getPublicProfile();
            if(profile.id !== id) {
                peers.push(profile);
                reply.consumeQuota(cost);
            }
            //else L('dont add retrieving peer as a peer');
        });

        reply.send({peers}, 0);/*err => {
            if(!err) {
            }
        });*/
   }

    return {
        retrievePeers,
        addMessage
    };
};

