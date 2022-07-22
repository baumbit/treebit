/**
 * Peers Retrievers about notes with oneanother.
 * This is NOT a gossip protocol where they blabbber about everything to everyone.
 * On the contrary the whole idea is that a peer should filter out what itself percieves as noise,
 * and forward that which it thinks (accordingly to its own standards) have the greatest value.
 * Basically a peer is a reducing function, that removes that which it believes have the least value.
 * This is achieved by scoring every note and sharing those with the highest score.
 * While nothing stops a peer from making up its own scoring rules,
 * the scoring mechanism here takes the peers scoring into account and
 * then weighting that score by some additional metrics such as use.
 * Since the delta between the data set of two peers can not be known for certain,
 * the protocol is implemented in such a way that two peers will first exchange a docket containing
 * a list of note identifiers along with the note scores.
 *
 * The Retriever goes like this: TODO re-write
 *
//when doing all of these....
//            peer should always first check: did I already send you this?
//            then save that it sent it
//                this instead of telling peer what I already have... 
//
//
 * A node first initiates a Retriever about notes by creating an offer based on previous interaction with the same peer.
 * The peer replies with either accepting fully, rejecting partially or rejecting fully.
 * Once the node receives the response to the offer, it requesting new notes along with sending a docket with
 * notes that it already has. This is the first step of the retrieval process.
 * The responding peer make a note of what notes the retrieving peer have and then dispense a docket
 * containing suitable notes that the retrieving peer may not have (since it already got some notes,
 * it at least knows not to include those).
 * The retriever makes a note of what notes the dispenser provided it with and attempts to download
 * those it did not already have. The procedure it then complete.
 * In the process the dispensing peer might have found out that its peer had some notes wich it did not,
 * and the dispenser may now become a retriever itself.
 * However, this time both of the peers knows a lot more of one anothers data sets, so the starting point
 * is different.
 * When the process is repeated enough times, enough notes will have been exchanged.
 *
 * Game strategy considerations:
 * While tit-for-tat is usually a great strategy for data sharing networks, in its naive form (byte for a byte) it
 * is probably not so good here. Because a node can create basically new unlimited amount of notes,
 * punishing those peers that do not upload/share notes is at best pointless and at worst it creates an incentive to
 * create new spam notes instead of downloading these, whenever the bandwidth is more expencive compared compared to CPU power.
 * Perhaps even worse, if a new node on the network have not yet downloaded any content, it will not be able to upload anything
 * either, hence a node might instead create new spam notes just to build up its quota.
 * To help with the bootstrapping issue and to promote sharing of non-spam content, the following strategy is used.
 * Keep in mind that there is no rule that says that all nodes must use this strategy, nor is it possible to force anyone to do so.
 * On the contrary it is advocated that if a better strategy is found, the following one should be replaced.
 *
 * The upload strategy:
 * A node first creates the duration of a _time slot_, lets say 10 minutes.
 * Then the node allocates a _quota for how many notes to upload_ during this time slot, lets say 40 notes.
 * All the peers a node have, are _scored in order of importance_.
 * The importance of a peer is based on the _objective amount and the subjective quality of the uploaded notes_.
 * The more important a peer is, the bigger chunk of the total quota the peer alloted.
 * Peers are encouraged to make use of its whole alloted quota during the time slot.
 * A node will attempt top serve the notes that are deemed the best for the specific peer is is uploading to.
 * It will do so by trying to figure out what kind of notes is the most suitable for the peer.
 * Basically all nodes will alwayes be competing with one another for being the best at serving the most best notes.
 * The penalty for leeching notes (donwload only never upload), is that peers are more likely to drop the connection when they find
 * better behaving peers.
 * This strategy creates a stratitifcation, where peers that are able to share eachother the most best notes will tend
 * to group together and create strong bonds, at the detriment of those peers that are not as good at sharing content.
 * In the worst case a node will upload all its quota and not get anything in return. If this happens the node will seek out
 * new peers and replace the old non beneficial relationships with relatively speaking better ones.
 * A node which have good relationship with a peer, is incentiviced to keep it. Also since it is impossible for a node to know
 * for sure what kind of relationship its peer may have with other peers, a node should always try to do its best to please its nodes.
 * A hub that have basically unlimited upload quota and never demand notes from its peers, is the perfect peer for a low bandwidth
 * node. However, since the hub does not demand downloads, the low-bandiwdth node is incentiviced to share notes with its other peers.
 * A hub does not need to fear not getting new content, because note creators are incentiviced to upload their notes to hubs because
 * they have the greatest reach. Hence a great hub will not download much from low bandwidth nodes.
*
 * The implications of this are:
 *      both participants benefits from storing each others hishscore notes
 *      both participants also benefits from storing the highscore notes they have already sent
 *           because that increase the more information they both share, the more likely they find out new information they beneift from
 *      use "score sorted lufo" to score highscore list assocaited with a peer
 *           should a thin client (mobile) Retriever to a hub (huge aws server) - only the highest scored notes will be saved 
 * * v0.0.1-1
 * NoteRetriever - Middleware - Treenet
 * Note sync.
 */
export const
    NOTES                           = 'treeRetriever:NOTES',
    //SUBTREE_SCORES                = 'treeRetriever:SUBTREE_SCORES',
    BEST_FOLLOWED_SCORES            = 'treeRetriever:BEST_FOLLOWED_SCORES',
    SCORES_FOLLOWED_NOTES_WANTED    = 'treeRetriever:SCORES_FOLLOWED_NOTES_WANTED',
    ANCESTOR_SCORES                 = 'treeRetriever:ANCESTOR_SCORES',
    BEST_BRANCH_SCORES              = 'treeRetriever:BEST_BRANCH_SCORES',
    BEST_SIBLINGS_SCORES            = 'treeRetriever:BEST_SIBLINGS_SCORES',
    BEST_SCORES                     = 'treeRetriever:BEST_SCORES';

import {CANOPY_UPDATED} from '../canopy/canopy.js';
import {NOT_ENOUGH_QUOTA} from './replier.js';
import {addScoresAsync, hasPeerNoteAsync} from './common-retriever.js';
import {isZero, isGreaterThan, everyAsync, mapAsync, eachAsync} from '../../oo/utils.js';

export function createTreeRetriever({ß, log}) {

    //
    // ß.grapevine
    //
    function addMessage({peerProxy, message}) {                              //log?.n(0, 'addMessage', ...arguments);
        // TODO check integrity and signature
        const
            replier = peerProxy.getReplier(),
            reply = replier.createReply(message),
            o = {peerProxy, reply, message};

        if(isZero(replier.getAvailableQuota())) {
            reply.consumeQuota(ß.config.UPLOAD_QUOTA_FACTOR_ERROR); // prudently superflous
            reply.send({error: NOT_ENOUGH_QUOTA, friendly: 'available quota is zero'});
        }
        else if(message.type === NOTES) replyNotesAsync(o);
        else if(message.type === ANCESTOR_SCORES) replyAncestorScoresAsync(o);
        else if(message.type === SCORES_FOLLOWED_NOTES_WANTED) replyTrackedNoteScoresAsync(o);
        //else if(message.type === SUBTREE_SCORES) replySubtreeScores(o);
        else if(message.type === BEST_SCORES) replyByPeerBestScoresAsync(o);
        else if(message.type === BEST_FOLLOWED_SCORES) replyByPeerBestFollowedScoresAsync(o);
        else if(message.type === BEST_BRANCH_SCORES) replyByPeerBestBranchScoresAsync(o);
        else if(message.type === BEST_SIBLINGS_SCORES) replyByPeerBestSiblingsScoresAsync(o)
        else log?.e('unknown message type', message);
    }

    //function quotaError(peerProxy, reply, consumeQuota) {
    //     if(!peerProxy.getReplier().isQuotaEnough(consumeQuota)) {
    //        reply({error: NOT_ENOUGH_QUOTA,
    //            friendly: `retrieval would consume: ${consumeQuota} available: ${peerProxy.getReplier().getAvailableQuota()}`},
    //            ß.config.UPLOAD_QUOTA_FACTOR_ERROR);
    //        return true;
    //    }
    //}

    async function retrieveByPeerBestScoresAsync({peerProxy, limit, controller}) {
        const data = {limit};
        log?.n(5, `retrieveByPeerBestScoresAsync from ${peerProxy.getPublicProfile().name}`, {'retrieve scores limit': limit} );
        const reply = await peerProxy.getRetriever().retrieveAsync({type: BEST_SCORES, data, controller});
        if(!reply.error) {
            await addScoresAsync(peerProxy, reply.scores);
            //L(reply.scores);
            return true;
        }
    }

    async function replyByPeerBestScoresAsync({peerProxy, reply, message}) {
        const
            scores = [],
            {limit} = message.data;

        await reply.buildAsync(ß.config.QUOTA_FACTOR_SCORES, async (consumeQuota) => {
            await ß.canopy.eachBestAsync(async ({noteNode, score}, i) => {
                const
                    {noteId} = noteNode.note;
                if(!await hasPeerNoteAsync(peerProxy, noteId)) {
                    scores.push({noteId, score/*, ms*/});
                }
                return consumeQuota() && !(scores.length === limit);
            });
        });
        sendScoresHelper('replyByPeerBestScoresAsync', peerProxy, reply, scores, limit);
    }

    //
    // notes
    //
    async function retrieveByPeerBestNotesAsync({peerProxy, limit, controller}) {
        // TODO optmz. keep a list of scores of notes that have not yet been downloaded.
        const noteIds = [];
        await peerProxy.eachBestNoteScoreAsync(async ({noteId}) => {
            if(noteIds.length >= limit) return false; // stop
            if(!await ß.canopy.hasNoteAsync(noteId)) return noteId; // note not found in storage
        }, noteIds);
        if(noteIds.length) return retrieveNotesAsync({peerProxy, noteIds, controller}).catch(log?.c);
    }

    async function retrieveNotesAsync({peerProxy, noteIds, controller}) {
        if(!noteIds.length) log?.w('empty arr');
        const
            data = noteIds, // TODO refactor data to noteIds
            result = [];
        log?.n(5, `retrieveNotesAsync from ${peerProxy.getPublicProfile().name}`, {'number of notes': data.length, 'retrieve these notes': data});
        const reply = await peerProxy.getRetriever().retrieveAsync({type: NOTES, data, controller});
        if(!reply.error) {
            await mapAsync(reply.notes, async (o) => {
                const peerId = peerProxy.getPublicProfile().id; //L('peerId', peerId);
                const noteNode = await ß.canopy.addNoteAsync(o, undefined, peerId);//.catch(log?.c);
                result.push(noteNode.note.noteId);
                return noteNode;
            });
            log?.n(6, reply.notes.length ? '#00ff00' : '#ffff00', 'Notes downloaded: '+ reply.notes.length);
            ß.canopy.notify(CANOPY_UPDATED);
        }
        return result;
    }

    async function replyNotesAsync({peerProxy, reply, message}) { //log?.n(0, 'replyNotes', noteIds);
        const
            noteIds = message.data,
            notes = [];

        await reply.buildAsync(ß.config.UPLOAD_QUOTA_FACTOR_NOTE, async (consumeQuota) => {
            await everyAsync(noteIds, async (noteId) => {
                const o = await ß.canopy.getNoteAsync(noteId);
                if(o) {
                    notes.push(o.note);
                    return consumeQuota();
                }
                return consumeQuota();
             });
        });

        log?.n(1, `replyNotesAsync to ${peerProxy.getPublicProfile().name}`,
            {
                'number of notes': notes.length,
                'notes': notes

            }
        );

        reply.send({notes}, async (err) => {
            if(!err) {
                // no error, so lets presume the recipient peer got the notes sent to it.
                // lets make sure the replying node remembers that it has already sent the
                // note, so that it wont send it more then once. notice, that peers that
                // are sharing less relevant data, will be of less value to its peers.
                // hence it is in the interest of a node to remember what it has sent to
                // a peer. this way the data retrieving peer does not have to send any
                // information about what it has already received, which will serve to lower the
                // bandwith.
                //
                // a bond between two peers will increase in value over time, since they
                // will learn more about eachother and hence can provide better value to eachother.
                await addScoresAsync(peerProxy, notes.map(note => {
                        return {noteId: note.noteId, score: 0};
                }));
            }
        });
    }

    //
    // helpers
    //
    async function retrieveNotesByScoresHelper({noteId, limit, controller}, retrieveByPeerBestScoresFunction) {
        log?.n(6, {'retrieveByPeerBestScoresFunction':{noteId, limit, controller}});
        const
            allPeers = ß.grapevine.getPeerProxies(),
            peers = [],
            result = [];
        let noteIds = [];

        await eachAsync(allPeers, async (peerProxy) => {
            if(await hasPeerNoteAsync(peerProxy, noteId)) peers.unshift(peerProxy);
            else peers.push(peerProxy); // ask those who we dont know if they have it or not last 
        });

        for(let i = 0, scoresIn; i < peers.length; i++) {
            if(controller.isAbort) return;
            if(noteIds.length >= limit) return;
            scoresIn = await retrieveByPeerBestScoresFunction(peers[i]);
            await eachAsync(scoresIn, async ({noteId}) => {
                if(!await ß.canopy.hasNoteAsync(noteId) && !noteIds.includes(noteId)) noteIds.push(noteId);
            });
        }

        for(let i = 0, missing; i < peers.length; i++) {
            if(controller.isAbort) return;
            if(noteIds.length) {
                const retrieved = await retrieveNotesAsync({peerProxy: peers[i], noteIds, globalController: controller}).catch(log?.c);
                missing = [];
                noteIds.forEach(noteId => {
                    if(retrieved.includes(noteId)) result.push(noteId);
                    else missing.push(noteId);
                });
                noteIds = missing;
            }
        }
        return result;
    }

    function sendScoresHelper(logName, peerProxy, reply, scores, limit, isAddScores=true) {
        log?.n(1, `${logName} to ${peerProxy.getPublicProfile().name}`,
            {
                'reply scores': scores.sort(({score:a}, {score:b}) => isGreaterThan(b, a)),
                'unfilled reply scores': scores.length - limit
            }
        );
        reply.send({scores}, async (err) => {
            if(!err) {
                if(isAddScores) {
                    // note: if retriever got the scores from the replier,
                    // the retriever will never upload those scores (it knows it got it from the replier)
                    // hence the replier needs to remember that it has shared these scores with the retriever already.
                    // TODO
                    //          because of this the replier will not be able to find out what score the retriever,
                    //          but this is not super important as long as replier have several peers.
                    await addScoresAsync(peerProxy, scores.map(({noteId}) => {
                        return {noteId, score: 0};
                    }));
                }
            }
        });
    }

    //
    //ancestors
    //
    async function retrieveByPeerBestAncestorNotesAsync({noteId, limit, controller}, cb) {
        const result = await retrieveNotesByScoresHelper({noteId, limit, controller}, async (peerProxy) => {
            const scoresIn = await retrieveAncestorScoresAsync({peerProxy, noteId, limit, globalController: controller});
            return scoresIn;
        });
        if(cb) cb(result);
        return result;
    }

    async function retrieveAncestorScoresAsync({peerProxy, noteId, limit, controller}) {
        const data = {noteId, limit};
        log?.n(5, `retrieveAncestorScoresAsync from ${peerProxy.getPublicProfile().name}`, {limit});
        const reply = await peerProxy.getRetriever().retrieveAsync({type: ANCESTOR_SCORES, data, controller});
        if(!reply.error) {
            await addScoresAsync(peerProxy, reply.scores);
            return reply.scores;
        }
        return [];
    }

    async function replyAncestorScoresAsync({peerProxy, reply, message}) {
        const
            {noteId, limit} = message.data,
            scores = [];

        await reply.buildAsync(ß.config.QUOTA_FACTOR_SCORES, async (consumeQuota) => {
            let noteNode = await ß.canopy.grabNodeAsync(undefined, noteId); // branch point is NOT included
            for(let i = 0, score; i < limit && noteNode; i++) {
                noteNode = await ß.canopy.grabParentAsync(noteNode);
                if(noteNode) {
                    score = await ß.canopy.getNoteScoreAsync(noteNode);
                    if(score !== undefined) scores.push({noteId: noteNode.note.noteId, score});
                }
                if(!consumeQuota(cost)) break;
            }
        });

        sendScoresHelper('replyAncestorScores', peerProxy, reply, scores, limit);
    }

    //
    // branch (best child child...)
    //
    async function retrieveByPeerBestBranchNotesAsync({noteId, limit, controller}, cb) {
        const result = await retrieveNotesByScoresHelper({noteId, limit, controller}, async (peerProxy) => {
            const scoresIn = await retrieveByPeerBestBranchScoresAsync({peerProxy, noteId, limit, globalController: controller});
            return scoresIn;
        });
        if(cb) cb(result);
        return result;
    }

    async function retrieveByPeerBestBranchScoresAsync({peerProxy, noteId, limit, controller}) {
        const data = {noteId, limit};
        log?.n(5, `retrieveByPeerBestBranchScoresAsync from ${peerProxy.getPublicProfile().name}`, {limit});
        const reply = await peerProxy.getRetriever().retrieveAsync({type: BEST_BRANCH_SCORES, data, controller});
        if(!reply.error) {
            await addScoresAsync(peerProxy, reply.scores);
            return reply.scores;
        }
        return [];
    }

    async function replyByPeerBestBranchScoresAsync({peerProxy, reply, message}) {
        const
            {noteId, limit} = message.data,
            scores = [];

        await reply.buildAsync(ß.config.QUOTA_FACTOR_SCORES, async (consumeQuota) => {
            let noteNode = await ß.canopy.grabNodeAsync(undefined, noteId); // branch point is NOT included
            for(let i = 0, score; i < limit && noteNode; i++) {
                noteNode = await ß.canopy.grabBestChildAsync(noteNode);
                if(noteNode) {
                    score = await ß.canopy.getNoteScoreAsync(noteNode);
                    if(score !== undefined) scores.push({noteId: noteNode.note.noteId, score});
                }
                if(!consumeQuota(cost)) break;
            }
        });

        sendScoresHelper('replyByPeerBestBranchScores', peerProxy, reply, scores, limit);
    }

    //
    // siblings
    //
    async function retrieveByPeerBestSiblingNotesAsync({noteId, limit, controller}, cb) { //log({noteId, limit, controller});
        const result = await retrieveNotesByScoresHelper({noteId, limit, controller}, async (peerProxy) => {
            const scoresIn = await retrieveByPeerBestSiblingsScoresAsync({peerProxy, noteId, limit, globalController: controller});
            return scoresIn;
        }).catch(log?.c);
        if(cb) cb(result);
        return result;
    }

    async function retrieveByPeerBestSiblingsScoresAsync({peerProxy, noteId, limit, controller}) {
        const data = {noteId, limit};
        log?.n(5, `retrieveByPeerBestSiblingsScoresAsync from ${peerProxy.getPublicProfile().name}`, {limit});
        const reply = await peerProxy.getRetriever().retrieveAsync({type: BEST_SIBLINGS_SCORES, data, controller});
        if(!reply.error) {
            const scores = await eachAsync(reply.scores, async (o) => {
                return await hasPeerNoteAsync(peerProxy, o.noteId) ? undefined : o; // add only those peer do not have
            }, []);
            await addScoresAsync(peerProxy, scores);
            return scores;
        }
        return [];
    }

    async function replyByPeerBestSiblingsScoresAsync({peerProxy, reply, message}) {
        const
            {noteId:branchSha256, limit} = message.data,
            scores = [];

        await reply.buildAsync(ß.config.QUOTA_FACTOR_SCORES, async (consumeQuota) => {
            const parentNode = await ß.canopy.grabParentAsync(undefined, undefined, branchSha256);
            if(parentNode) {
                const children = await ß.canopy.grabSortedChildrenAsync(parentNode);
                for(let i = 0, noteId; i < children.length && i < limit; i++) {
                    noteId = children[i].noteId;
                    if(!await hasPeerNoteAsync(peerProxy, noteId)) {
                        if(noteId !== branchSha256) {
                            const score = await ß.canopy.getNoteScoreAsync(null, noteId)
                            scores.push({noteId, score});
                            reply.consumeQuota(cost);
                        }
                    }
                    if(!consumeQuota()) break;
                }
            }
        });
        sendScoresHelper('replyByPeerBestSiblingsScores', peerProxy, reply, scores, limit);
    }

    ////
    //// subtree
    //  TODO optmized downloading of a whole subtree.
    //          probably this should be done very late stage in the project,
    //          because its mainly a usability improvement (and network load)
    //          but not needed in a proof of concept
    ////
    //async function retrieveByPeerBestSubtreeNotesAsync({noteId, limitDepth, limitWidth, controller}, cb) { log({noteId, limit, controller});
    //    const result = await retrieveNotesByScoresHelper({noteId, limitDepth, limitWidth, controller}, async (peer) => {
    //        const scoresIn = await retrieveByPeerBestSubtreeScoresAsync({peer, noteId, limit, controller});
    //        return scoresIn;
    //    }).catch(log?.c);
    //    if(cb) cb(result);
    //    return result;
    //}

    //async function retrieveByPeerBestSubtreeScoresAsync({peer, noteId, limitDepth, limitWidth, controller}) {
    //    const data = {noteId, limit};
    //    log?.n(5, `retrieveByPeerBestSubtreeScoresAsync from ${peer.name}`, {limitDepth, limitWidth});
    //    const reply = await peer.getRetriever().retrieveAsync({type: SUBTREE_SCORES, data, controller});
    //    if(!reply.error) {
    //        await addScoresAsync(peer, reply.scores);
    //        return reply.scores;
    //    }
    //    return [];
    //}

    //function replySubtreeScores({peer, reply, message}) {
    //    const
    //        cost = ß.config.QUOTA_FACTOR_SCORES,
    //        {noteId:branchSha256, limitDepth, limitWidth} = message.data,
    //        scores = [];

    //    function replyByPeerBestSiblingsScores({peer, reply, message}) {

    //    sendScoresHelper('replySubtreeScores', peer, reply, scores, limit);
    //}

    //
    // following
    //
    async function retrieveByPeerBestTrackedNotesAsync({peerProxy, limit=10, controller}) {
        const
            scoresIn = await retrieveByPeerBestFollowedNoteScoresAsync({peerProxy, limit, controller}),
            noteIds = [];

        await eachAsync(scoresIn, async ({noteId}) => {
            if(!await ß.canopy.hasNoteAsync(noteId)) noteIds.push(noteId);
        });

        if(noteIds.length) return retrieveNotesAsync({peerProxy, noteIds, controller}).catch(log?.c);
    }

    async function retrieveByPeerBestFollowedNoteScoresAsync({peerProxy, limit=10, controller}) {
        const data = limit;
        log?.n(5, `retrieveByPeerBestFollowedNoteScoresAsync from ${peerProxy.getPublicProfile().name}`, {limit});
        const reply = await peerProxy.getRetriever().retrieveAsync({type: BEST_FOLLOWED_SCORES, data, controller});
        if(!reply.error) {
            await addScoresAsync(peerProxy, reply.scores);
            return reply.scores;
        }
        return [];
    }

    async function replyByPeerBestFollowedScoresAsync({peerProxy, reply, message}) { //log?.n(0, 'replyNotes', noteIds);
        const
            limit = message.data,
            scores = [];

        await reply.buildAsync(ß.config.QUOTA_FACTOR_SCORES, async (consumeQuota) => {
            await ß.canopy.eachFollowedNoteAsync(async (noteId) => {                // the replier loops through its note scores
                if(!await hasPeerNoteAsync(peerProxy, noteId)) {                    // and check if the retriever has is already
                    const score = await ß.canopy.getNoteScoreAsync(null, noteId)    // and if not
                    scores.push({noteId, score});                                   // it then adds it to the reply
                    return consumeQuota() && !(scores.length === limit);              // and continue loop if retriever has quota left
                }
                // TODO consume a little quota even if there was not hit
            });
        });

        sendScoresHelper('replyByPeerBestFollowedScoresAsync', peerProxy, reply, scores, limit);
    }

    //
    // tracked
    //
    async function retrieveTrackedNoteScoresAsync({peerProxy, limit=2, width=5, controller}) {
        // node asks peer if previously uploaded followed notes have children that is wanted,
        // and when doing so also adds freshly followed notes.
        // peer will reply with as many spotted items as it is able to offer for download,
        // node downloads all the spotted notes it has not yet downloaded.

        const data = {
            limit, // limit number of spotted node will be able to download TODO should be configurable in settings
            width,
            noteIds: []
        };

        // upload new followed notes.
        await ß.grapevine.getTrackedNotesBillboard().eachAsync(limit, data.noteIds, async (noteId) => {
            // reduce sending redundant data (those that have previously already been sent)
            // more importantly also avoid sending older wanted (which  would thereby erasing fresher wanted on peer)
            if(await peerProxy.getTrackedNotes().retreiveStorage.isSentAsync(noteId)) {
                //log(0, `count as a hit but do not add: ${noteId}`);
                return null;
            }
            else {
                //log(0, `retrieveTrackedNotesAsync add: ${noteId}`);
                return noteId;
            }
        });
        const reply = await peerProxy.getRetriever().retrieveAsync({type: SCORES_FOLLOWED_NOTES_WANTED, data, controller});
        if(reply.error) {
            return false;
        }
        await eachAsync(data.noteIds, peerProxy.getTrackedNotes().retreiveStorage.addSentAsync)

        const scores = [];
        await eachAsync(reply.scores, async ({noteId, score}, i) => {
            if(!await ß.canopy.hasNoteAsync(noteId)) {
                // the followed note has a child which does not exist locally,
                // so lets add it to the download list so that it can be donwloaded
                // at a later point in time.
                // the reason the note is not downloaded at once, it because node
                // might not have enough quota to download it and since the peer
                // most likely will remember that it has sent the score it will
                // never send the score again, hence by adding it to a download queue
                // the note will not be forgotten.
                await peerProxy.getTrackedNotes().retreiveStorage.addDownloadAsync(noteId);
                scores.push(noteId);
            }
            if(!await peerProxy.hasNoteScoreAsync(noteId)) {
                await peerProxy.addNoteScoreAsync(noteId, score); // remember that peer has this score
            }
        });

        return scores;
    }

    async function retrieveTrackedNotesAsync({peerProxy, limit=2, controller}) {
        const noteIds = [];

        // download spotted notes...
        const {eachDownloadAsync, removeDownloadAsync} = peerProxy.getTrackedNotes().retreiveStorage;
        await eachDownloadAsync(limit, noteIds, async (noteId) => {
            // a note in the download queue might have already be downloaded,
            // and if so do not download it again and also remove it from the
            // queue.
            if(!await ß.canopy.hasNoteAsync(noteId)) return noteId; // note not found in storage
            else await removeDownloadAsync(noteId); // note already found in storage, hence no need to download it again
        });

        let result = [];
        if(noteIds.length) {
            result = await retrieveNotesAsync({peerProxy, noteIds, controller}).catch(log?.c);
            await eachAsync(result, async (noteId) => {
                await removeDownloadAsync(noteId);
            });
        }
        return result;
    }

    async function replyTrackedNoteScoresAsync({peerProxy, reply, message}) {  log(0, 'replyTrackedNoteScoresAsync', {reply, message});
        const
            {width, limit, noteIds} = message.data,
            {addWantedAsync, eachWantedAsync} = peerProxy.getTrackedNotes().replyStorage,
            scores = [];

        // first add that which is wanted
        // item at 0 is most wanted, so add last
        await eachAsync(noteIds.reverse(), addWantedAsync); // TODO add limit for how big noteIds may be, and consume QUOTA

        // then reply with that which is wanted and is servable
        //log(10, 'replyFollowedNotesWanted isQuotaEnough', reply.isQuotaEnough(cost))
        await reply.buildAsync(ß.config.QUOTA_FACTOR_SCORES, async (consumeQuota) => {
            //log(10, 'replyFollowedNotesWanted', {limit, width})
            await eachWantedAsync(limit, width, (noteId, score) => {
                scores.push({noteId, score});
                //log(0, 'replyTrackedNoteScores consume', {noteId, score, isQuotaEnough, limit, width});
                return consumeQuota();
            });
        });

        sendScoresHelper('replyTrackedNoteScoresAsync', peerProxy, reply, scores, limit);
    }

    return {
        // retrieve from parameterized peer
        retrieveByPeerBestTrackedNotesAsync,
        retrieveByPeerBestNotesAsync,
        retrieveNotesAsync,
        retrieveByPeerBestScoresAsync,
        retrieveTrackedNoteScoresAsync,
        retrieveTrackedNotesAsync,
        // retrieve from all peers
        retrieveByPeerBestBranchNotesAsync,
        retrieveByPeerBestSiblingNotesAsync,
        retrieveByPeerBestAncestorNotesAsync,
        // grapevine
        addMessage
    };
};

