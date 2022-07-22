/* v0.0.1-1
 * SignerRetriever - Middleware - Treenet
 * Note sync.
 */
//const DEBUG_DISABLE_UPLOAD_QUOATA = false; // TODO improve on this debug

export const
    TRACKED_SIGNERS         = 'signerRetriever:TRACKED_SIGNERS',
    TRACKED_SIGNERS_NOTES   = 'signerRetriever:TRACKED_SIGNERS_NOTES',
    NOTE_SCORES             = 'signerRetriever:NOTE_SCORES',
    //SIGNER_NOTES            = 'signerRetriever:SIGNER_NOTES',
    SIGNER_TRADE            = 'signerRetriever:SIGNER_TRADE'; // TODO refactor variable name

import {CANOPY_UPDATED} from '../canopy/canopy.js';
import {NOT_ENOUGH_QUOTA} from './replier.js';
import {addScoresAsync, hasPeerNoteAsync} from './common-retriever.js';
import {isZero, clone, everyAsync, mapAsync, eachAsync} from '../../oo/utils.js';

export function createSignerRetriever({ß, log}) {

    //
    // ß.grapevine
    //
    function addMessage({peerProxy, message}) {                              //log?.n(11, 'addMessage', ...arguments);
        // TODO check integrity and signature
        const
            replier = peerProxy.getReplier(),
            reply = replier.createReply(message),
            o = {peerProxy, replier, reply, message};

        if(isZero(replier.getAvailableQuota())) reply.send({error: NOT_ENOUGH_QUOTA, friendly: 'available quota is zero'});
        else if(message.type === SIGNER_TRADE) replySignersAsync(o);
        else if(message.type === TRACKED_SIGNERS) replyTrackedSignersAsync(o);
        else if(message.type === TRACKED_SIGNERS_NOTES) replyTrackedSignersNotesAsync(o);
        else if(message.type === NOTE_SCORES) replyNoteScoresAsync(o);
        //else if(message.type === SIGNER_NOTES) replySignerNotes(o);
        else log?.e('unknown message type', message);
    }

    //function quotaError(peerProxy, reply, consumeQuota) {
    //     if(!peerProxy.getReplier().isQuotaEnough(consumeQuota)) {
    //        reply.send({error: NOT_ENOUGH_QUOTA, friendly: `retrieval would consume: ${consumeQuota} available: ${peerProxy.getReplier().getAvailableQuota()}`});
    //        return true;
    //    }
    //}

    //
    // signer
    //
    async function retrieveSignersAsync({peerProxy, signerIds, controller}) {       console.log({signerIds});
        const data = signerIds;
        log?.n(5, `retrieveSignersAsync from ${peerProxy.getPublicProfile().name}`, {'number of signers': data.length, 'retrieve these signers': data});
        const reply = await peerProxy.getRetriever().retrieveAsync({type: SIGNER_TRADE, data, controller});
        if(!reply.error) {
            await mapAsync(reply.signers, async (o) => {    //log('add signer', {o});
                return ß.canopy.addSignerAsync(o);
            });
            log?.n(6, reply.signers.length ? '#00ff00' : '#ffff00', 'Signers downloaded: '+ reply.signers.length);
            ß.canopy.notify(CANOPY_UPDATED);
            return true;
        }
    }

    async function replySignersAsync({peerProxy, reply, message}) { //log?.n(0, 'replySigners', signerIds);
        const
            signerIds = message.data,
            signers = [];

        await reply.buildAsync(ß.config.UPLOAD_QUOTA_FACTOR_SIGNER, async (consumeQuota) => {
            return everyAsync(signerIds, async (signerId) => {
                let o = await ß.canopy.getSignerAsync(signerId);
                if(o) {
                    o = clone(o);
                    // XXX
                    // the retriever should not blindly trust the replier, hence on arrival the
                    // cryptographic integrity of the signer should be validated AND also that the
                    // signer conforms to the norms. since the signerId can be re-created from the
                    // signer.data.pub value at fairly low CPU cost and probably also will be re-created,
                    // we might as well just delete it here before sending it, to save some bandwidth.
                    // note: the signerId _MUST_ is a cryptohraphically generated token and MUST be
                    // created deterministically. if not, a retriever asking for a signer might never receive it
                    // which is bad for the retriever (do not get the signer) and the replier (lowers node reputation).
                    // note: while the signerId should be re-created on arrival, trying to attack the receivers
                    // database by creating a collision will probably not be worth the CPU work that goes into
                    // spoofing it.
                    delete o.signerId;
                    signers.push(o);
                }
                return consumeQuota();
             });
        });

        log?.n(5, `replySigners to ${peerProxy.getPublicProfile().name}`, {'number of signers': signers.length, 'reply with these signers': signers})
        reply.send({signers}, err => {
            // TODO
            //          1. add to a lufo that this peer have already been sent this signer
            //          2. when signer is updated, remove from all peer lufos that they have received this signer
            console.log('TODO add that we have once sent a signer');
            //addScores(peerProxy, out.signers.map(signer => {
            //        return {signerId: signer.data.signerId, score: 0};
            //}));
        });
    }

    //
    // notes
    //

    async function retrieveSignerNoteScoresAsync({peerProxy, limit, signerId, controller}) {
        const data = {limit, signerId};
        log?.n(5, `retrieveSignerNoteScoresAsync from ${peerProxy.getPublicProfile().name}`, {'retrieve scores limit': limit} );
        const reply = await peerProxy.getRetriever().retrieveAsync({type: NOTE_SCORES, data, controller});
        if(!reply.error) {
            await addScoresAsync(peerProxy, reply.scores);
            return reply.scores;
        }
        return [];
    }

    async function replyNoteScoresAsync({peerProxy, reply, message}) {
        const
            scores = [],
            {limit, signerId} = message.data;

        await reply.buildAsync(ß.config.QUOTA_FACTOR_SCORES, async (consumeQuota) => {
            await peerProxy.eachSignerNoteAsync(signerId, limit, async (noteId) => {
                const score = await ß.canopy.getNoteScoreAsync(null, noteId);
                scores.push({noteId, score/*, ms*/});
                return consumeQuota();
            });
        });

        //signerProxy = ß.canopy.grabSignerProxy(signerId);
        //if(signerProxy) {
        //    let noteNode = signerProxy.getFirstNote();
        //    for(let i = 0; noteNode && (!limit || i < limit) && reply.isQuotaEnough(cost); i++) {
        //        let {noteId/*, ms*/} = noteNode.note.data;
        //        if(!peerProxy.hasNoteScore(noteId)) { // TODO add retrieve flag to ignore this check (if retriever was wiped or similar)
        //            let score = ß.canopy.getNoteScore(null, noteId);
        //            scores.push({noteId, score/*, ms*/});
        //            reply.consumeQuota(cost);
        //        }
        //        noteNode = signerProxy.getNextNote(noteId);
        //    }
        //}

        reply.send({scores}, async (err) => {
            if(!err) {
                await addScoresAsync(peerProxy, scores, true)
            }
        });
    }

    async function retrieveSignerNotesAsync({peerProxy, signerId, limit, controller={}}) {
        const data = {signerId, limit};
        log?.n(5, `retrieveSignerNotesAsync from ${peerProxy.getPublicProfile().name}`, {'limit:': data.limit, 'data': data});
        const scores = await retrieveSignerNoteScoresAsync({peerProxy, limit, signerId, controller});
        if(scores.length) {
            const noteIds = scores.map(({noteId}) => noteId);
            if(!controller.isAbort)
                return await ß.grapevine.getTreeRetriever().retrieveNotesAsync({peerProxy, noteIds, globalController: controller});
        }
        return [];
    }

    //
    //  tracked
    //
    async function retrieveTrackedSignersAsync({peerProxy, limit=10 /* TODO magic default value, move to a setting*/, controller}) {
        const data = {
            limit, // limit number of spotted node will be able to download TODO should be configurable in settings
            arr: []
        };
        log?.n(5, `retrieveTrackedSignersAsync from ${peerProxy.getPublicProfile().name}`, {'limit:': data.limit, 'data': data});

        // upload new followed signers.
        await ß.grapevine.getTrackedSignersBillboard().eachAsync(limit, data.arr, async (signerId) => {
            // reduce sending redundant data that have already been sent previously to this peer,
            // more importantly also avoid sending older wanted and thereby erasing fresher wanted on peer!
            const signer = await ß.canopy.getSignerAsync(signerId);
            if(signer) {
                const o = {signerId, ms: signer.data.ms};
                if(await peerProxy.getTrackedSigners().retreiveStorage.isSentAsync(o)) {
                    log(0, `count as a hit but do not add: ${signerId}`);
                    return null;
                }
                else {
                    log(0, `retrieveTrackedSignersAsync add: ${signerId}`);
                    return o;
                }
            }
        });
        const reply = await peerProxy.getRetriever().retrieveAsync({type: TRACKED_SIGNERS, data, controller});
        if(reply.error) {
            return false;
        }
        await eachAsync(data.arr, async (o) => await peerProxy.getTrackedSigners().retreiveStorage.addSentAsync(o));

        log?.n(6, reply.signers.length ? '#00ff00' : '#ffff00', 'Followed signers downloaded: '+ reply.signers.length);
        if(!reply.error) {
            await mapAsync(reply.signers, async (o) => {            log('add signer', o);
                return ß.canopy.addSignerAsync(o);
            });
            ß.canopy.notify(CANOPY_UPDATED);
            return reply.signers;
        }
    }

    async function replyTrackedSignersAsync({peerProxy, reply, message}) {
        const
            {addTrackedSignerAsync, eachTrackedSignerAsync} = peerProxy.getTrackedSigners().replyStorage,
            limit = message.data.limit, // TODO check message
            signers = [];

        // first add that which is wanted
        // item at 0 is most wanted, so add last
        // note: if we have sent a later version (millis) to peer,
        // but the peer responds with an older version its ok to forget we sent a more fresh copy,
        // because obviously the retreiving peer forgot it.
        await eachAsync(message.data.arr.reverse(), addTrackedSignerAsync); // TODO add limit for how big noteIds may be, and consume QUOTA

        // then reply with that which is wanted and is servable
        await reply.buildAsync(ß.config.UPLOAD_QUOTA_FACTOR_SIGNER, async (consumeQuota) => {
            await eachTrackedSignerAsync(limit, (signer) => { log(signer);
                if(signer) {
                    signers.push(signer);
                }
                return consumeQuota();
            });
        });

        log?.n(5, `replyTrackedSignersAsync to ${peerProxy.getPublicProfile().name}`, {'number of signers': signers.length, 'reply with these signers': signers})
        reply.send({signers}, async (err) => {
            if(!err) {
                // re-add to remember what we have sent to peer
                await eachAsync(signers, async (signer) => {
                    return addTrackedSignerAsync({signerId:signer.signerId, ms:signer.data.ms});
                });
            }
        });
    }

    //
    // tracked signer notes
    //
    async function retrieveTrackedSignersNotesAsync({peerProxy, limit=10 /* TODO magic default value, move to a setting*/, controller={}}) {
        const data = {
            limit, // limit number of spotted node will be able to download TODO should be configurable in settings
            arr: []
        };
        log?.n(5, `retrieveTrackedSignersNotesAsync from ${peerProxy.getPublicProfile().name}`, {'limit:': data.limit});

        const reply = await peerProxy.getRetriever().retrieveAsync({type: TRACKED_SIGNERS_NOTES, data, controller});
        if(reply.error) {
            return false;
        }
        let scores = [];
        for(let p in reply.signersNoteScores) {
             if(reply.signersNoteScores.hasOwnProperty(p)) {
                 scores = scores.concat(reply.signersNoteScores[p]);
             }
        }
        await addScoresAsync(peerProxy, scores);
        if(scores.length) {
            const noteIds = scores.map(({noteId}) => noteId);
            if(!controller.isAbort)
                return ß.grapevine.getTreeRetriever().retrieveNotesAsync({peerProxy, noteIds, globalController: controller});
        }
        return [];
    }

    async function replyTrackedSignersNotesAsync({peerProxy, reply, message}) {
        const
            limit = message.data.limit, // TODO check message
            signersNoteScores = {};

        await reply.buildAsync(ß.config.QUOTA_FACTOR_SCORES, async (consumeQuota) => {
            await peerProxy.getTrackedSigners().replyStorage.eachTrackedSignersNotesAsync(limit, async ({signerId, noteId}) => {
                const
                    scores = signersNoteScores[signerId] || [],
                    score = await ß.canopy.getNoteScoreAsync(null, noteId);
                scores.push({noteId, score/*, ms*/});
                signersNoteScores[signerId] = scores;
                return consumeQuota();
            });
        });

        reply.send({signersNoteScores}, async (err) => {
            if(!err) {
               for(let p in signersNoteScores) { // TODO replace with better itteraturo
                    if(signersNoteScores.hasOwnProperty(p)) { // TODO remove this check
                        await addScoresAsync(peerProxy, signersNoteScores[p], true);
                    }
                }
            }
        });
    }

    return {
        retrieveSignerNotesAsync,
        retrieveSignerNoteScoresAsync,
        retrieveSignersAsync,
        retrieveTrackedSignersAsync,
        retrieveTrackedSignersNotesAsync,
        addMessage
    };
}

