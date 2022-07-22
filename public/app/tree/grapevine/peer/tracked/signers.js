export async function createTrackedSignersAsync(ß, peerProxy, log) {

    const
        retreiveStorage = await createRetreiveStorageAsync({ß, log, peerProxy}),
        replyStorage = await createReplyStorageAsync({ß, log, peerProxy}),
        destroyAsync = async () => {
            await retreiveStorage.destroyAsync();
            await replyStorage.destroyAsync();
        };

     return {
        retreiveStorage,
        replyStorage,
        destroyAsync
    };
}

async function createRetreiveStorageAsync({ß, log, peerProxy}) {

    const
        sent = await peerProxy.getLufoStoreAsync('trackedsigners_retriever_sent'),
        download = await peerProxy.getLufoStoreAsync('trackedsigners_retriever_download');

    async function destroyAsync() {
        await sent.destroyAsync();
        await download.destroyAsync();
    }

    async function addSentAsync({signerId, ms}) {                                        log(10, ' addSent ' + signerId);
        return sent.addAsync(signerId, {signerId, ms});
    }

    async function isSentAsync({signerId, ms}) {
        const o = await sent.getValueAsync(signerId);
        if(o && o.ms <= ms) {
            log(10, ' isSent ' + signerId, ms);
            return true;
        }
        return false;
    }

    return {
        isSentAsync,
        addSentAsync,
        destroyAsync
    };
};

async function createReplyStorageAsync({ß, log, peerProxy}) {

    let index2 = 0; /* TODO XXX this value must!!! be stored in permanent storage to ensure all
    signers can be updated  XXX TODO  NOTE: this should be stored in some kind of Peer.data thing along with all other stuff that should hav permancen
    grapevine/peer-proxy/peer-proxy.js:createDb
    XXX */
    //
    // tracked signer notes
    //
    //  every time this is read, ONE signer will be processed,
    //  repeated queries is needed to process all signers
    let trackedSignersNotesIndex = 0; // TODO SAVE IN PERMANTE PEER PROXU DECIDECTATED STORAGE


    const
        signers = await peerProxy.getLufoStoreAsync(`trackedsigners_reply`);

    async function destroyAsync() {
        await signers.destroyAsync();
    }

    async function addTrackedSignerAsync({signerId, ms}) {                                      log(10, ' addWanted ' + signerId, {ms});
        await signers.addAsync(signerId, {signerId, ms}, 'bubble');
    }

    async function eachTrackedSignerAsync(limit=1, cb) {
        // walkthrough wanted in an order that will make sure to poll the most wanted (top of lufo) most often,
        // but will ensure to walktrough the entire list by twoStep through the lufo, by alternating between reading
        // from start in list and what is at index.
        // the reason this is needed, is because the overall design is such that when a node downloads new Signer data it would be costly
        // to walkthrough all possible peers that has once signaled that they are tracking this Signer (but might have stopped or even dropped the
        // connection entirely withouth tellig about its intention). so instead when a peer is asking for "do you have any new signer data for me",
        // the list the Peer have uploaded will be walkedthrough. However, this list might grow extremely large over time, hence the Peer might not
        // have enough quota for the Node to do a simple walkthrough of the list from the start to the end in one go.
        let count = 0;
        const step = await signers.twoStepValueAsync({index1: 0, index2});
        while(count < limit && step.hasMore()) {
            let
                {signerId, ms} = await step.nextAsync(),
                signer = await ß.canopy.getSignerAsync(signerId);                        //log(10, ' eachWanted. signerId= ' + signerId + ' ms=' + ms);
            if(signer) {    //log({signer, ms});
                if(!ms || signer.data.ms > ms) {
                    count++;
                    if((await cb(signer)) === false) break;
                } else {
                     // TODO consume some quota even if nothing was found... because work required even when no result yieleded¶
                      // TODO possibly do this using callback
                }
            }
        };
        index2 = step.getIndices()[1];
    }

    async function eachTrackedSignersNotesAsync(limit=1, cb) {
        // process ONE signer at the time
        const step = await signers.stepValueAsync({index1: trackedSignersNotesIndex});
        let isLoop = true;
        while(isLoop && step.hasMore()) {
            let {signerId} = await step.nextAsync();
            await peerProxy.eachSignerNoteAsync(signerId, limit, async (noteId) => {
                isLoop = await cb({signerId, noteId});
                return isLoop;
            });
        }
        trackedSignersNotesIndex = step.getIndex();
     }

    return {
        addTrackedSignerAsync,
        eachTrackedSignerAsync,
        eachTrackedSignersNotesAsync,
        destroyAsync
    };
};

