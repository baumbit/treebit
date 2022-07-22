/**
 * this manager should keep track of whether a wanted datapoint have been shared with a unique peer or not.
 * if it has already been shared, the node should not ask for it again.
 *
 * note: a tracked note is known to the node, so what it wants is children of the tracked notes it does not yet have,
 * also note that children of children will not be discovered, hence this feature does NOT support following "subtrees" only children
 *
 * First A remote peer ask for an item, so it is wanted.
 * The peer will occasionally ask for what have been spotted, and node will run through the wanted list.
 * The node will return spotted items score to peer.
 * If the peer asks for the spotted itself later on, may depend on whether the peer already obtained the
 * item through other means or not.
 *
 * Most peers do not(!) want most notes, hence a lot of work would be wastefull if a popular
 * node would be receiving millions of new cards and having to check if maybe millions of
 * peers wants the card.
 *
 * Instead the fundamental design principle behind the "wanted" feature is this:
 * (1) a node keep tracks of what a peer wants, (2) but wait to see if it has it
 * untill the peer asks if there is something new found.
 *
 * 1. Since a datapoint may be added at any point in time (past and future),
 * redundant requests for the same datapoint is reduced, by the peer submitting
 * only a list of the N number of top most datapoints in the wanted list. This
 * results in the nodes internal list either adding a new point to watch OR bumping
 * an old one. This way wanted list will self sort and most wanted will always end-up
 * at the top.
 *
 * 2. The node waits to see if it has the data the peer asked for, untill the peer
 * asks for the actual data. Because then the scope of the search can be reduced to the
 * amount of quota the peer has available.
 *
 */

export async function createTrackedNotesAsync(ß, peerProxy, log) {

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
};

async function createRetreiveStorageAsync({ß, log, peerProxy}) {
    /**
     * the retreiving node is invoking theses functions
     */

    const
        // noteId that a node has sent to a peer (peer will add it as wanted)
        sent = await peerProxy.getLufoStoreAsync('trackednotes_retreive_sent'),
        // noteId that a node want and peer has acknoweledged that it has
        download = await peerProxy.getLufoStoreAsync('trackednotes_retreive_download');
        //consumed = await getLufoAsync('consumed'); // noteId that a peer has said it wants and have been delivered

    async function destroyAsync() {
        await sent.destroyAsync();
        await download.destroyAsync();
    }

    async function addSentAsync(noteId) {                                        log(10, ' addSent ' + noteId);
        await sent.addAsync(noteId);
    }

    async function isSentAsync(noteId) {
        const v = await sent.hasAsync(noteId);                                   log(10, ' isSent ' + noteId, v);
        return v;
    }

    async function addDownloadAsync(noteId) {
        await download.addAsync(noteId, noteId, 'bubble');                       log(10, ' addDownload ' + noteId);
    }

    async function removeDownloadAsync(noteId) {
        await download.removeAsync(noteId);                                      log(10, ' removeDownload ' + noteId);
    }

    async function eachDownloadAsync(limit, arr, filter) {
        // invoked by the retrieving node
        await download.eachValueAsync(async (k) => {
            //console.log('k=', k);
            const v = await filter(k);
            if(v === false) return false;  // end itteration
            if(v === undefined) return; // pretend key never existed and continue, i.e. dont affect limit
            limit--; // count as a hit
            if(v) arr.push(v); // add item if its truthy
            //log(0, LUFO_PREFIX + '     ', {limit, v, arr});
            return limit > 0; // if false, will end itteration
        });
        return arr;
    }

    return {
        isSentAsync,
        addSentAsync,
        eachDownloadAsync,
        addDownloadAsync,
        removeDownloadAsync,
        destroyAsync
    };
};

async function createReplyStorageAsync({ß, log, peerProxy}) {
    /**
     * keep track of the noteIds that a peer is looking for
     */
    let index2 = 0; /* TODO XXX this value must!!! be stored in permanent storage with Peer values */

    const
        wanted = await peerProxy.getLufoStoreAsync('trackednotes_reply');

    async function destroyAsync() {
        await wanted.destroyAsync();
    }

    async function addWantedAsync(noteId) {                                      log(10, ' addWanted ' + noteId);
        await wanted.addAsync(noteId, noteId, 'bubble');
    }

    async function eachWantedAsync(limit=1, width=1, cb) {
        //const peerProxy = ß.grapevine.getPeerProxy(name);             //log(10, ' eachWanted. peer=' + peerProxy.getName() + ' size=' + wanted.size());
        // walkthrough wanted, begining with the most wanted and ending with the least wanted.
        // the behaviour is such that last added (hence likely last wanted sumbited by retrieving node) is treated as more wanted
        // but older added will eventually also be checked because of twoStep function
        let count = 0;
        const step = await wanted.twoStepValueAsync({index1: 0, index2});
        while(count < limit && step.hasMore()) {
            let parentSha384 = await step.nextAsync();             //log(10, ' eachWanted. parentSha384= ' + parentSha384);
            const children = await ß.canopy.grabSortedChildrenAsync(undefined, parentSha384);
            // popular notes may get an infinite amount of children,
            // so limit horizontal/width search in tree graph.
            if(children.length) {
                for(let i = 0, w = width, noteId, hasNoteScore; w > 0 && i < children.length; i++) {
                    noteId = children[i].noteId;
                    hasNoteScore = await peerProxy.hasNoteScoreAsync(noteId);
                    if(!hasNoteScore) {
                        const score = await peerProxy.getNoteScoreAsync(noteId);
                        if(!score) {
                            // peer does not appear to know about this note so lets consume it.
                            //log(10, '***CONSUME', noteId);
                            if(await cb(noteId, score) === false) break;
                            count++;
                            w--;
                        }
                    } else {
                        // TODO consume some quota even if nothing was found... because work required even when no result yieleded¶
                        // TODO possibly do this using callback
                    }
                }
            }
        }
        //console.log('**** ', index2, step.getIndices());
        index2 = step.getIndices()[1]; // TODO TODO store permantently
    }

    return {
        addWantedAsync,
        eachWantedAsync,
        destroyAsync
    };
};

