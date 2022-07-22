// TODO
//      fix
//          if note is removed, update children[] to reflect that note is no longer there
//              note that note can get removed inside of Lugo and using external remove
//              preferably DO NOT use listners, instead use self-healing code that patches
//                  the bad array or similar of note is not found
//      refactor
//          note wrapper is called "Node" but change to "Envelope" to make things less confusing
//      refactor
//          ?! child.children[] turn into a lufo?
/*
 * v0.0.1-1
 * Tree - Treenet
 * Note data node tree and utils.
 * A note has data signed by a signer.
 * A root is a note that has no parent (it may or may not have children).
 * An orphan is a note that has a parent, but the note is missing.
 * A branch is the set of notes that share parent (root can not be parth of
 * a branch, but an orphan can).
 * Notes may be added at random.
 * A tree starts of as a acylic rooted tree, by creating a root signed note.
 * At this point it is not known whether the root will become a parent to
 * children or not and the same is true also for all other notes.
 * The tree may be extended with a child, by signing a note that include
 * reference to a parent, such as the root or another note.
 * Since parts of the tree might go missing when the network is propagating
 * the notes, notes may get orphaned.
 * The combination of notes going missing and notes not knowing if they are
 * parents or not, is so far an un-solveable problem.
 * But as missing notes are eventually aggregated, the tree can be composed.
 * As the tree is built, parent-child relationships are for optimizaiton purpsoes
 * saved locally as nodes.
 *
 * The process of note propagation and localy scoring will result in un-sorted
 * total global set of nodes, ending up as an ordered (not unlikely un-complete) local tree.
 * Note that while the global tree consists of a finite set of nodes, as time
 * progress new notes are added and therefor the tree should finally the ordered tree
 * is presented to the end-user, in such a way that the path with the greatest weight
 * is the most accessible.
 * User-epxerience of the sorted tree:
 *
 *      (root) note
 *              |
 *    (branch) note - note - note - note          (orphan) note        (branch, orphan) note - note - note 
 *              |      |      |      |                      |                            |
 *             note   note   note   note          (branch) note - note         (branch) note - note
 *              |                    |                      |                            |
 *             note        (branch) note - note            note                         note
 *                                   |
 *                                  note
 *
 * This makes is possible to source notes from many different sources at
 * different time. Note that a note knows about its parent, but not about
 * possible children. When a note is first created children are not
 * possible because the note did not exist. Because anyone at anytime can
 * create a child but it may or may not be propagated by the network,
 * it is never possible to know whether a note has a child or not.
 * Also note that a network node may receive a child before a parent and that a
 * child per definition has a parent (otherwise its a root note of a tree).
 * For optimization purposes when orphans are added, a parent node
 * is created. When parent is added, a link between parent and child can
 * be created without having to traverse the database looking for orphans.
 *
 * Example:
 *  Initial:
 *      P(ost)1 - P2 | not yet added P3-P4  | P5 - P6
 *          Itterating using prev/children beginning at P1 will end at P2.
 *  Add P3:
 *      P(ost)1 - P2 - P3 | not yet added P4 | P5 - P6
 *          When P3 is added P2.children will be updated in the storage.
 *
 */
import {generateNoteIdAsync, verifyNoteAsync} from '../crypto-tree.js';
import {normNoteLevel} from '../norm.js';

export async function createTreeStorageAsync(ß) {

    const
        log = ß.log.log('treeStorage', 11),
        lufo = await ß.storage.getAsync({name: `/treestorage`, persistent:true, lufo:true});

    async function addAsync({note, signerId, sort}) {          log?.n(2, 'ADD NOTE', note.noteId, {note});

        // add
        const noteId = note.noteId;
        let o = await lufo.getAsync(noteId);                    log?.n(10, `-note ${!await lufo.hasAsync(noteId)?'is new':'exists'}`,o);
        if(!o) {
            o = await createNodeAsync({note, signerId});             log?.n(10, '--create new note');
            await lufo.addAsync(noteId, o);
        } else if(o.value.isPlaceholder) {                      log?.n(10, '--replace placeholder', o.children); 
            o = await createNodeAsync({note, children: o.value.children, signerId});   log?.n(10, '--after replace', o.children);
            await lufo.addAsync(noteId, o);
        } else {
            // duplicate
            o = o.value;
        }

        // link
        const prev = note.data.prev;
        if(prev) {                                                          log&&log.n(10, '-note node has a parent', prev);
            const prevObj = await lufo.getAsync(prev);
            let prevNode;
            if(prevObj) {
                prevNode = prevObj.value;                                   log&&log.n(10, '--parent is', prevObj);
                if(!prevNode.isPlaceholder) {
                    if(!normNoteLevel(prevNode.note, note)) { log&&log.w('bad consensus lvl', prevNode, note);
                        throw 'TODO';
                    }
                }
            }
            if(!prevNode) {                                                 log?.n(10, '---no parent nodefound', {note});
                // note: while the note indicates that it is a child of a note with noteId eq to prev,
                // this note might never have existed, dropped by the network or not existing in close proximity
                // on the network. but, this does not matter. if a note with prev id is never found, note will simply
                // be treated as a root note.
                prevNode = await createNodeAsync({note:{noteId: prev}, isPlaceholder: true, signerId}); log?.n(10, ' ---add placeholder');
            }
            if(!prevNode.children.includes(noteId)) {                       log?.n(10, '----add child to parent');
                // TODO limit how large cihldren array can be (should be device/storage size/config dependent)
                prevNode.children.push(noteId);                             log?.n(10, '----', prevNode);
                await lufo.addAsync(prev, prevNode);
            }
        }
        return o;
    }

    async function getAsync(noteId) {
        const o = await lufo.getValueAsync(noteId); //console.log('get', noteId, o);
        if(o && !o.isPlaceholder) { //console.log('return o', o);
            return o;
        }
    }

    async function useAsync(noteId, sort) {
        return lufo.useValueAsync(noteId, sort);
    }

    async function eachAsync(index, cb) {  //console.log('forEach', lufo.debugName, lufo.length(), length());
        await lufo.eachValueAsync({index}, async (o, i) => { //log(value);
            return cb(o, i);
        });
    }

    async function removeAsync(noteId) {
        return lufo.removeAsync(noteId);
    }

    async function clearAsync() { //console.log('clear', lufo.debugName, lufo.length());
        await lufo.clearAsync();
    }

    async function hasAsync(noteId) {
        // ned to get value from lufo,
        // because need to check if it
        // is a placeholder.
        return !!await getAsync(noteId); // TODO optmz, lufo have to know about placeholders and non-placeholders
    }

    async function lengthAsync() {
        return lufo.lengthAsync();
    }

    async function randomAsync(cb) {
        const length = await lengthAsync();
        let index = 0;//Math.floor(Math.random() * length);
        await lufo.eachValueAsync({index}, async (o, i) => {
            //if(i === index) {
                index = index + Math.floor( Math.random() * (length - i) ) + 1;
                return cb(o);
            //}
        });
    }

    return {
        randomAsync,       // node
        hasAsync,        // returns false if only placeholder
        addAsync,        // note
        getAsync,        // node
        useAsync,        // node
        removeAsync,     // node
        eachAsync,       // node
        lengthAsync,     // nodes
        clearAsync       // storages
    };
};

async function createNodeAsync({note, children=[], isPlaceholder, signerId}) { //console.log('IN', ...arguments);
    const node = {
        isPlaceholder,                  // this is placeholder for the parent, that a child is pointing to using prev
        children,
        note: {
            signerId,                   // uniquely identifies the signer who created the signature of this note
            noteId: note.noteId,        // uniquely identifies this note on the network
            data: {},                   // this object is shared on the network
            signature: note.signature   // data signed by signer priv, verifyable using note.data.pub
        }
    };
    //console.log('node', node, note);

    if(!isPlaceholder) {
        const data = note.data;
        const d = node.note.data;
        // TODO verify norms
        // TODO add comments to each prop
        if(data.prev) {
            d.prev = data.prev;
        }

        if(data.lvl >= 0) {
            d.lvl = data.lvl;
        }

        if(data.pub) {
            d.pub = data.pub;
        }

        if(data.type) {
            d.type = data.type;
        }

        if(data.text) {
            d.text = data.text;
        }

        if(data.ms) {
            d.ms = data.ms;
        }

        if(data.tag) {
            d.tag = data.tag;
        }

        // TODO if(data.blob) {
        //    node.data.blob = data.blob;
        //}
    }

    // ensure there is a noteId.
    // note: a bad peer might create a noteId collision,
    // and notes created by owner might be running bad code,
    // so always verify that signature matches the noteId.
    if(!node.note.noteId && note) node.note.noteId = note.noteId;
    if(!node.note.noteId) node.note.noteId = await generateNoteIdAsync(node.note);

    if(!isPlaceholder) {
        const isVerified = await verifyNoteAsync(node.note).catch(console.error); 
        if(!isVerified) console.error('TODO handle bad note'); // TODO harden by possibly verifying signer again?!

        //console.log(window.__SIMSHIM__.debug.deterministicScoring);
        try {
            if(window.__SIMSHIM__.debug.deterministicScoring && d.text) {
                node.note.debug = {deterministicScoring: (d.text.length*1000)+99};
                //console.log(o.note.debug.deterministicScoring);
            }
        } catch(e) {
            console.log('TODO deterministicScoring');
        }
    }

    //console.log('createNote', {node, isVerified});
    return node;
}

//(function() {
//    console.log('todo: test');
//    let LOG;
//    //let lufo = createNodeStorage();
//    //let forum = createNote({topicStorage, lufo});
////  TODO refactor createNote to createConversatinStorage (depends on present topicStorage to be re-named)
////function createNodeStorage() {
////    // TODO const lufo = createLocalStorageLufo({maxKeys: 20, prefix: 'crowd'}),
////    const lufo = createCachedStorageLufo({maxKeys: 5, lufo: createRamStorageLufo({maxKeys: 10, prefix: 'clp'})});
////          os = createCachedStorageLufo({maxKeys: 10, lufo});
////    return os;
//}
//
//})();
//function allTopicsByPoster({forum, limit, sort}) {
//    const topics = [];
//    forum.all((topic) => {
//        const noteId = topic.noteId,
//              o = forum.get(topic.noteId);
//        if(o) {
//            if(sort === 'ms') {
//                let i = 0,
//                    ms = o.note.ms;
//                while(i < topic.length-1) {
//                    let o = forum.get(topics[i].noteId);
//                    if(o.)
//                    i++;
//                }
//                arr.splice(i, 0, noteId);
//            } else {
//                topics.push(o.noteId);
//            }
//        }
//    });
//    return topics;
//}

