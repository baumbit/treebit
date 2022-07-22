/**
 * Consider the fact that a new Note can be added to a Signer at any point in time,
 * and that the Notes are likely to arrive in a random order (as opposed to chronological order).
 * This implies that it is non-trivial operation to efficiently relay both the chronologically most recent Notes to Peers
 * while also ensuring that older Notes are sent. The solution to this problem here is to alternate (using twoStep) between
 * trying to relay the most chronologically recent Notes while at the same time also itterating through the list in its entirely.
 * This way even if the quota runs out once in a while, sooner or later the whole list will be read.
 */
export async function createSignerNotesAsync(ß, peerProxy, log) {

    const
        replyStorage = await createReplyStorageAsync({ß, log, peerProxy}),
        clearAsync = async () => {
            return replyStorage.clearAsync();
        },
        destroyAsync = async () => {
            return replyStorage.destroyAsync();
        };

    return {
        //retreiveStorage: createRetreiveStorage({ß, log, peerProxy}),
        replyStorage,
        clearAsync,
        destroyAsync
    };
};

async function createReplyStorageAsync({ß, log, peerProxy}) {

    const
        metadataLufo = await peerProxy.getLufoStoreAsync('signernotes_retreive_metadata');

    async function destroyAsync() {
        await metadataLufo.destroyAsync();
    }

    async function eachNoteAsync(signerId, limit=1, cb) {
        let {index1=0, index2=0, notesUpdatedMs=0} = await metadataLufo.getValueAsync(signerId) || {};
        const signerProxy = await ß.canopy.grabSignerProxyAsync(signerId, 'bubble');
        if(signerProxy) { //console.log(signerProxy);
            const ms = signerProxy.getNotesUpdatedMillis();
            if(ms > notesUpdatedMs) {
                // must reset starting point,
                // because notes list has been updated since last itteration
                index1 = 0;
                notesUpdatedMs = ms;
            }
            const step = await signerProxy.twoStepNoteAsync({index1, index2});
            let count = 0;
            while(count < limit && step.hasMore()) {
                let {noteId} = await step.nextAsync();
                if(!await peerProxy.hasNoteScoreAsync(noteId)) {
                    count++;
                    if(cb(noteId) === false) break;
                } else {
                    // TODO consume some quota even if nothing was found... because work required even when no result yieleded
                    // TODO possibly do this using callback
                }
            };
            const indices = step.getIndices();
            await metadataLufo.addAsync(signerId, {index1: indices[0], index2: indices[1], notesUpdatedMs});
        }
    }

    async function clearAsync() {
        return metadataLufo.clearAsync();
    }

    return {
        eachNoteAsync,
        clearAsync,
        destroyAsync
    };
}

