/*
 * remove
 *      code related to rootNotes
 * add
 *      replace "treeStorage" with favourite nodes, following nodes, etc
 * fix
 * refactor
 *
 * v0.0.1-1
 * Forest - Middleware - Treenet
 * The forest consists of one scoretree, and one or more treeStorage containing unique notes.
 * The scoretree is used to for sorting out which tree and which path in a tree,
 * contains the most relevant notes. Hence the scoretree storage must be so large that
 * it may contain the score of all of the notes in all of the treeStorage. Note that while it
 * should be possible to rebuild the scoretree from the tree of notes, notes might appear
 * missing for the rest of the system if they are not included in the scoretree.
 */
const SORT_BUBBLE = 'bubble'; // TODO import from LUFO
const SORT_TOP = 'top'; // TODO import from LUFO
import {createTreeStorageAsync} from './tree-storage.js';
import {createScoretreeAsync} from './scoretree.js';
import {normNoteScore} from '../norm.js';
import {createOnNotify} from '../../oo/utils.js';
//import {createNoteAsync} from './note.js';


export const FOREST_UPDATED = 'forest:FOREST_UPDATED';

export async function createForestAsync(ß, signerStorage) {

   const
        log = ß.log.log('forest', 10),
        {on, notify} = createOnNotify(log),
        getLufoAsync = ß.storage.createBuilder(`/forest/`, {persistent:true, lufo:true}),
        scorelist = await getLufoAsync('scorelist'), // all note scores in a descending list
        //sessionLufo = null,
        //sessionLufo = await getLufoAsync('session'),
        scoretree = await createScoretreeAsync(ß, {}),
        treeStorage = await createTreeStorageAsync(ß);

    async function hasNoteAsync(noteId) {
        return treeStorage.hasAsync(noteId);
    }

    async function getNoteAsync(noteId) {
        return treeStorage.getAsync(noteId);
    }

    async function addNoteAsync(note, sort, peerId, score) { //console.log(...arguments);
        //if(!note.data.prev) {
        //    rootNotes.add({note, sort, count: debugNoteCount?.rootNotes}); //log('adding root note');
        //}
        console.log('TODO harden by verifying note');

        if(!note.data.pub) console.error('TODO handle note have no pub');
        const pub = note.data.pub;
        let signerId = note.signerId;
        if(!signerId) signerId = await createSignerIdAsync({pub});
        const noteNode = await treeStorage.addAsync({note, signerId, sort/*TODO, count ??*/}); //L({noteNode});
        score = score === undefined ? Math.floor(Math.random() * 123) : 1; // TODO random number.. replace with
        const scoretreeNode = await addScoreAsync({noteNode, score, peerId});
        await signerStorage.addNoteAsync(note, signerId);//((.catch(console.log); // TODO HARDEN move this to top of function, because if it fails do not add to treeStorage

        // add note to session
        //const prev = noteNode.note.data.prev;
        //if(prev) {
        //    const value = sessionLufo && await sessionLufo.getValueAsync(prev);
        //    if(value && value.children) {
        //        const children = await scoretree.useAsync(prev).children.map(({noteId, branchScore}) => { return {noteId, branchScore}; });
        //        if(sessionLufo) await sessionLufo.addAsync(prev, {children});
        //    }
        //}

        return noteNode;
        //console.log('noteNode:', noteNode, 'parent:', grabParent(noteNode));
    }

    async function addScoreAsync({noteNode, score=0, peerId}) {
        //if(noteNode.note?.debug.deterministicScoring) score = noteNode.note.debug.deterministicScoring;

        const noteId = noteNode.note.noteId; //console.log('adding score for', noteId);
        const peerScores = await ß.grapevine.allNoteScoresAsync(noteId);
        score = normNoteScore({note:noteNode.note, peerScores, score});

        // TODO imporve on debug 
        if(noteNode.note.debug && noteNode.note.debug.deterministicScoring) score = noteNode.note.debug.deterministicScoring;

        //if(sessionLufo) sessionLufo.addAsync(noteNode.note.noteId, null);
        const scoretreeNode = await scoretree.addNoteNodeAsync(noteNode, score);

        // scorelist
        const o = await scorelist.getAsync(noteId);
        let oldScore;
        if(o) {
            if(!peerId) peerId = o.peerId;
            oldScore = o.score;
        }
        await scorelist.addDescendingAsync(noteId, {noteId, score, peerId}, 'score');
        const peerProxy = ß.grapevine.getPeerProxy(peerId); //console.log({peer, peerId});
        if(peerProxy) peerProxy.getReplier().addNoteScore(score, oldScore);

        // debug. ugly as hawk
        let debugText = noteNode.note.data.text;
        noteNode.note.data.text = debugText;
        //treeStorage.add({note});
        return scoretreeNode;
    }

    async function grabNodeAsync(sort, noteId) {
        let o;
        if(sort) {
            o = await treeStorage.useAsync(noteId, sort);
        } else {
            o = await treeStorage.getAsync(noteId);
        }
        return o;
    }

    //function grabSibling(node, index, sort, noteId) {
    //    const arr = siblings(node, noteId),
    //          v = arr[index];
    //    if(v) {
    //        return grabNode(sort, v);
    //    }
    //}

    async function grabBestChildAsync(noteNode, sort, noteId) {        log?.n(2, `grabBestChild`, {noteNode, sort, noteId});
        const children = await grabSortedChildrenAsync(noteNode, noteId);
        if(children.length > 0) {
            const child = await grabNodeAsync(sort, children[0].noteId);
            if(!child) {
                throw `TODO len=${children.length}, zero=${children[0]}`;
            }
            return child;
        }
    }

    async function grabSortedChildrenAsync(noteNode, noteId) {         log?.n(5, `grabSortedChildren noteId=${noteId}`, noteNode);
        let children;
        if(noteNode) {
            noteId = noteNode.note.noteId;
        } else if(!noteId) {
            return [];
        }
        //let session;
        //if(sessionLufo) {
        //    session = await sessionLufo.useAsync(noteId);              //console.log('session found', {session, noteId});
        //}
        //if(session && session.value) {
        //    children = session.value.children;                          log?.n(5, 'session found', {noteId, session, children});
        //    noteNode = await grabNodeAsync(undefined, noteId);
        //    if(noteNode.children.length !== children.length) {
        //        console.log('session children', children, 'server children', noteNode.children);
        //        throw 'TODO: verify 1) scoretree matches node children (if not rebuild scoretree) 2) if OK rebuild session';
        //    }
        //} else { //} else if(noteId){
        const scoreNode = await scoretree.useAsync(noteId); //console.log('HAD ALL OF THIS', {noteNode, noteId, scoreNode});
        if(scoreNode) {
            children = scoreNode.children.map(({noteId, branchScore}) => { return {noteId, branchScore}; }); // deep clone
            //if(sessionLufo) {
            //    await sessionLufo.addAsync(noteId, {children});           //log?.n(3, 'session added', {noteId, children});
            //}
        }
        //}
        return children || [];
    }

    async function grabParentAsync(node, sort, noteId) { //console.log(noteId);
        if(!node) {
            node = await grabNodeAsync(sort, noteId);
        }
        if(node) {
            return grabNodeAsync(sort, node.note.data.prev);
        }
    }

    async function isRootNoteAsync(node, noteId) {  //console.log('isRootNote', {node, noteId});
        if(!node) {
            node = await grabNodeAsync(undefined, noteId);
        }
        return !node.note.data.prev;
    }

    async function isOrphanNoteAsync(node, noteId) {
        if(!node) {
            node = await grabNodeAsync(undefined, noteId);
        }
        return node.isPlaceholder;
    }

    async function grabChildrenAsync(node, noteId) {
        if(!node && noteId) {
            node = await grabNodeAsync(undefined, noteId);
        }
        if(node) {
            return node.children;
        }
        return [];
    }

    //function siblings(node, noteId) {
    //    if(!node) {
    //        node = grabNode(undefined, noteId);
    //    }
    //    if(node) {
    //        const o = grabParent(node);
    //       children(o); slice away current node... mighy be to inefficent
    //    }
    //    return [];
    //}

    //function countSiblings(node, noteId) {
    //    const arr = siblings(node, noteId);
    //    if(arr) {
    //        return arr.length;
    //    }
    //    return 0;
    //}

    //async function printAllBestChildrenAsync(noteId) {
    //    console.log('print all children ========== begin with ' + noteId);
    //    let node = await grabNodeAsync(undefined, noteId);
    //    while(node) {
    //        //let cntSiblings = countSiblings(node),
    //        let cntChildren = children(node).length;
    //        console.log(node.note.noteId, {node, cntChildren});
    //        node = await grabBestChildAsync(null, null, node.note.noteId);
    //    }
    //    console.log('print all children ========== end');
    //}

    //function getScore(noteId) { // TODO use this to show stuff inb GUI
    //    let peerScore = 0;
    //    ß.grapevine.allNoteScores(noteId).forEach(v => peerScore += v);
    //    let {score, heightScore} = scoretree.get(noteId);
    //    return {peerScore, score, heightScore};
    //}

    async function getNoteScoreAsync(noteNode, noteId) {
        if(!noteId) {
            noteId = noteNode.note.noteId;
        }
        const o = await scorelist.getAsync(noteId); //console.log({noteId, o});
        if(o) return o.value.score;
    }

    async function eachRootAsync(cb) {
        // TODO optmz. store noteId of roots in its own lufo.
        await scoretree.eachTopmostAsync(async ({noteId, score}, i) => { //console.log({noteId});
            const noteNode = await grabNodeAsync(undefined, noteId);
            if(noteNode && noteNode.note.data.prev) return cb({noteNode, score}, i);
        });
    }

    async function eachTopmostAsync(cb) {
        await scoretree.eachTopmostAsync(async ({noteId, score}, i) => { //log({noteId});
            const noteNode = await grabNodeAsync(undefined, noteId);
            if(noteNode) return cb({noteNode, score}, i);
        });
    }

    async function eachDescendantAsync(cb) {
       await scoretree.eachDescendantAsync(async ({noteId, score}, i) => {
            const noteNode = await grabNodeAsync(undefined, noteId);
            if(noteNode) return cb({noteNode, score}, i);
        });
    }

    async function eachBestAsync(cb, arr) { //console.log({scorelist});
        //return scorelist.eachValueAsync({debug:true}, async ({noteId, score}, i) => {
        return scorelist.eachValueAsync(async ({noteId, score}, i) => {
            const noteNode = await grabNodeAsync(undefined, noteId); //console.log('noteId, score', noteNode);
            if(noteNode) return cb({noteNode, score}, i);
        }, arr);
    }

    //
    // DEBUG
    //
    //function dump(cb) {
    //    log('--- DUMP ---');
    //    let cntTopmosts;
    //    cb('= topmost =');
    //    eachTopmost((o, i) => {
    //        cb(i, o.noteNode.note.noteId, o)
    //        cntTopmosts = i + 1;
    //    });
    //    log('Nbr of topmosts: ' + cntTopmosts);
    //    cb('= descendant =');
    //    let cntDescendants;
    //    eachDescendant((o, i) => {
    //        cb(i, o.noteNode.note.noteId, o);
    //        cntDescendants = i + 1;
    //    });
    //    log('Nbr of descendants: ' + cntDescendants);
    //    cb('= node =');
    //    eachBest((o, i) => cb(i, o.noteNode.note.noteId, o));
    //}

    return {
        // module
        on,
        // set
        addNoteAsync,
        // get
        getNoteAsync,
        hasNoteAsync,
        isRootNoteAsync,
        isOrphanNoteAsync,
        allTrees: () => treeStorage,
        getNoteScoreAsync,
        // grab (get and sort)
        grabChildrenAsync,
        grabNodeAsync,
        //grabSibling,
        grabBestChildAsync,
        grabSortedChildrenAsync,
        grabParentAsync,
        // itterate
        eachRootAsync,
        eachTopmostAsync, // root or orphan
        eachDescendantAsync,
        eachBestAsync,
    };
};

