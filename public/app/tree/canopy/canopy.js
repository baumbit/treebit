/*
 *
 * TODO
 *      do this when everything else is done
 *          the view of the data may depend on the session and so forth and so on.
 *              at some point, decide whether to spin up different canopies / server instances per user
 *                  OR have same instance manage data using the concept of sessions
 *                      more simple to spin up many servers, but less optmz
 *
 * v0.0.1-1
 * Canopy - Middleware - Treenet
 * Treenet is a message passing and reducing network, where the messages are ecapsulated in notes.
 * All notes may have parents, siblings and children, hence a set of notes can be composed into a tree.
 * Treenet is able to discern which notes to propagate and store by each treenet node creating its own
 * internal scoring of the notes and giving greater value to those deemed relatively more valuable in
 * relative to all the other by the node, known notes. A tree derives its score value based partly
 * on the value of the notes.
 *
 * An important scoring design decision is that there is never any penalties. The score is always
 * based on the value of the data. It is a positive reinforcement where data compete to become valuable
 * by adding intrinsic value. Data should not be able to compete by decreasing value of other data.
 * This design decision has been made because the reference (note that all nodes can have their own)
 * scoring mechanism is open source and hence both readable and possilby gameable by all participants.
 * Note the difference between this way of valuing data and how big search engines and other social networks,
 * does it. Treenet is transparent and the idea is that by keeping the protocol transparent, everyone
 * will have to compete on adding value to the network instead of trying to game the system.
 * Or worded differently, instead of creating a "smart" scoring mechanism, the idea is to create a
 * network where the incentives are such that the data with the most value is distributed the most wildly,
 * hence has the most redundant copies, greatest reach and so forth and so on.
 * Note how this also contributes to the load balancing of the network. More popular data shoud be easier
 * accessible with less latency.
 */
import {createForestAsync, FOREST_UPDATED} from './forest.js';
import {createSignerStorageAsync} from './signer-storage.js';
import {createFollowStorageAsync} from './follow-storage.js';
import {createOnNotify} from '../../oo/utils.js';

export const // "canopy:" prefix is some events are routed through other modules (such as grapevine) to canopy.
    CANOPY_ADD_NOTE         = 'canopy:CANOPY_ADD_NOTE',
    CANOPY_ADD_SIGNER       = 'canopy:CANOPY_ADD_SIGNER',
    CANOPY_FOLLOW_SIGNER    = 'canopy:CANOPY_FOLLOW_SIGNER',
    CANOPY_FOLLOW_NOTE      = 'canopy:CANOPY_FOLLOW_NOTE',
    CANOPY_UPDATED          = 'canopy:CANOPY_UPDATED'; // TODO refeactor into many different updates
    //ALL_NOTES_RESPONSE_DEV  = 'canopy:ALL_NOTES_RESPONSE_DEV',  // DEBUG
    //ALL_NOTES_DEV           = 'canopy:ALL_NOTES_DEV'; // DEBUG

export async function createCanopyAsync(ß) {
    const
        log = ß.log.log('CANOPY', 1),
        {on, notify} = createOnNotify(log),
        signerStorage = await createSignerStorageAsync(ß),
        followStorage = await createFollowStorageAsync(ß),
        forest = await createForestAsync(ß, signerStorage);
    forest.on(FOREST_UPDATED, () => notify(CANOPY_UPDATED));


    async function addNoteAsync() { //L(...arguments);
        const noteNode = await forest.addNoteAsync(...arguments);//.catch(console.log);
        if(noteNode) {
            await ß.feedManager.addNoteNodeAsync(noteNode);
            notify(CANOPY_ADD_NOTE + '/' + noteNode.note.noteId, noteNode);
        }
        notify(CANOPY_ADD_NOTE, noteNode);
        return noteNode;
    }

    async function addSignerAsync() {
        const signerProxy = await signerStorage.addSignerAsync(...arguments);
        if(signerProxy) {
            notify(CANOPY_ADD_SIGNER + '/' + signerProxy.getPublicKey(), signerProxy);
        }
        notify(CANOPY_ADD_SIGNER, signerProxy);
        return signerProxy;
    }

    async function followSignerAsync() {
        const signerId = await followStorage.addSignerAsync(...arguments);
        if(signerId) {
            await ß.grapevine.getTrackedSignersBillboard().addAsync(signerId);
            notify(CANOPY_FOLLOW_SIGNER + '/' + signerId, signerId);
        }
    }

    async function unfollowSignerAsync() {
        const signerId = await followStorage.removeSignerAsync(...arguments);
        if(signerId) {
            await ß.grapevine.getTrackedSignersBillboard().removeAsync(signerId);
            notify(CANOPY_FOLLOW_SIGNER + '/' + signerId, signerId);
        }
    }

    //function prioritizeSigner() {
    //   // TODO ß.grapevine.getFollowedSignerWantedBillboard().add(signerId);
    //   // const signerId = followStorage.addSigner(...arguments, 'top');
    //}

    async function followNoteAsync(noteId, isFollow) {
        if(isFollow) {
            await followStorage.addNoteAsync({noteId});
            await ß.grapevine.getTrackedNotesBillboard().addAsync(noteId);
        } else {
            await followStorage.removeNoteAsync({noteId});
            await ß.grapevine.getTrackedNotesBillboard().removeAsync(noteId);
        }
        notify(CANOPY_FOLLOW_NOTE + '/' + noteId, noteId);
    }

    //
    // DBBUG
    //
    function dump(cb) {
        forest.debug.dump(cb);
    }

    return {
        // module
        on,
        notify,

        // follow
        //getFollowStorage: () => followStorage,

        // signer
        addSignerAsync,
        eachSignerProxyAsync: signerStorage.eachProxyAsync,
        getSignerAsync: signerStorage.getSignerAsync,
        grabSignerProxyAsync: signerStorage.grabProxyAsync,
        followSignerAsync: followSignerAsync,
        unfollowSignerAsync: unfollowSignerAsync,
        isFollowingSignerAsync: followStorage.hasSignerAsync,
        eachFollowedSignerAsync: followStorage.eachSignerAsync,

        followNoteAsync: followNoteAsync,
        isFollowingNoteAsync: followStorage.hasNoteAsync,
        eachFollowedNoteAsync: followStorage.eachNoteAsync,


        // network
        //addMessage,
//        networkSync,
        //  TODO refactor below
        //rootNotes: () => forest.rootNotes(),

        // forest
        getNoteScoreAsync: forest.getNoteScoreAsync,
        addNoteAsync,
        getNoteAsync: forest.getNoteAsync,
        hasNoteAsync: forest.hasNoteAsync,
        children: forest.children,
        grabNodeAsync: forest.grabNodeAsync,
        grabParentAsync: forest.grabParentAsync,
        grabBestChildAsync: forest.grabBestChildAsync,
        grabSortedChildrenAsync: forest.grabSortedChildrenAsync,
        eachBestAsync: forest.eachBestAsync,
        eachTopmostAsync: forest.eachTopmostAsync,
        getForest: () => forest,

        // debug
        debug: {
            dump,
            getScore:               function(){return forest.debug.getScore(...arguments);},
            createMockupSentence:   function(){return forest.debug.createMockupSentence;  },
            createMockupTree:       function(){return forest.debug.createMockupTree;      }
            ///toggleScoretree:        function(b){return forest.debug.toggleScoretree(b);   }
        }
    };
};
