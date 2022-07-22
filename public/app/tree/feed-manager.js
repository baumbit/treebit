import {eachAsync, isTrue} from '../oo/utils.js';
/**
 * Feeds are lists created progressively over time and items in lists are persistantly stored,
 * in the order the are added to the list. They are used to create lists that an end-user of
 * content can scroll throuh in a GUI, and when visiting later the list should remain the same.
 */
export const feeds = [
    // note:
    // type indicates how data should be display in client gui
    // path is used to access data
    // text is used in client gui
     { stored: true,  type: 'note', path: 'last_added_note',                        text: 'Latest'}
    ,{ stored: false, type: 'note', path: 'best_score',                             text: 'Top scored' }
    ,{ stored: true,  type: 'note', path: 'random_note',                            text: 'Surprise me' }
    ,{ stored: true,  type: 'note', path: 'last_added_note_by_followed_signer',     text: 'Followed signers' }
    ,{ stored: true,  type: 'note', path: 'last_added_note_by_not_followed_signer', text: 'Not followed signers' }
    ,{ stored: true,  type: 'note', path: 'last_added_root',                        text: 'Roots' }
    ,{ stored: true,  type: 'note', path: 'last_added_orphan',                      text: 'Orphans' }
    ,{ stored: true,  type: 'note', path: 'last_added_reply',                       text: 'Replies' }
];

export async function createFeedManagerAsync(ß) {

    const
        log = ß.log.log('FEED', 10),
        store = await ß.storage.getAsync({name: '/feed/store', persistent:true}),
        feedLufos = {};

    await eachAsync(feeds, async ({stored, path}) => {
        // TODO max size of lufos
        if(stored) feedLufos[path] = await ß.storage.getAsync({name: `/feed/${path}`, persistent:true, lufo:true});
    });

    async function addNoteNodeAsync(noteNode) { //console.log(...arguments);
        const
            noteId = noteNode.note.noteId,
            signerId = noteNode.note.signerId;

        const
            isFollowingSigner = await ß.canopy.isFollowingSignerAsync({signerId}),
            isRoot = await ß.canopy.getForest().isRootNoteAsync(noteNode),
            isOrphan = await ß.canopy.getForest().isOrphanNoteAsync(noteNode);

        await feedLufos['last_added_note'].addAsync(noteId, noteId);
        if(isFollowingSigner) await feedLufos['last_added_note_by_followed_signer'].addAsync(noteId, noteId);
        if(!isFollowingSigner) await feedLufos['last_added_note_by_not_followed_signer'].addAsync(noteId, noteId);
        if(isRoot) await feedLufos['last_added_root'].addAsync(noteId, noteId);
        if(isOrphan) await feedLufos['last_added_orphan'].addAsync(noteId, noteId);
        if(!isRoot && !isOrphan) await feedLufos['last_added_reply'].addAsync(noteId, noteId);
    }

    async function addRandomNoteNodeAsync(limit) {                                  //console.log('==== addRandomNoteNodeAsync', {limit});
        await ß.canopy.getForest().allTrees().randomAsync(async (noteNode) => {
            const noteId = noteNode.note.noteId;                                    //console.log('add random', {noteId, noteNode, limit});
            await feedLufos['random_note'].addAsync(noteId, noteId);
            limit--;
            return limit >= 0;
        });
    }

    async function getBestScoreListAsync(feedPath, limit, reverse) {
        limit = parseInt(limit, 10);
        let list = [];
        await ß.canopy.eachBestAsync(async ({noteNode}) => {
            list.push(noteNode.note.noteId);
        });
        //reverse = isTrue(reverse);
        const feedLength = list.length;
        return {
            feedPath,   // name of feed
            feedLength, // number items in feed
            reverse,    // if false aggregating from point of most recently added (lufo first/heaad) if true starting with oldest added item (tail/last)
            //key,      // key for item at index 0 in list and from which point in feed list that data was copied
            list        // aggregated data
        };
    }

    async function getListAsync(feedPath, key, limit, reverse) {
        switch(feedPath) {
            case 'best_score': return getBestScoreListAsync(feedPath, limit, reverse);
            case 'random_note': await addRandomNoteNodeAsync(limit);
        }

        if(key === 'undefined' || key === 'null') key = undefined;
        limit = parseInt(limit, 10);
        reverse = isTrue(reverse);
        const lufo = feedLufos[feedPath];
        const feedLength = await lufo.lengthAsync();
        let list = [];
        if(feedLength > 0) {
            if(!key) {
                const first = await lufo.firstAsync();
                if(first) {
                    key = first.key;
                }
            }
            list = await lufo.eachValueAsync({key, limit, reverse});
            //console.log(list);
        }
        return {
            feedPath,   // name of feed
            feedLength, // number items in feed
            reverse,    // if false aggregating from point of most recently added (lufo first/heaad) if true starting with oldest added item (tail/last)
            //key,        // key for item at index 0 in list and from which point in feed list that data was copied
            list        // aggregated data
        };
    }

    return {
        addNoteNodeAsync,
        getListAsync
    };
};

