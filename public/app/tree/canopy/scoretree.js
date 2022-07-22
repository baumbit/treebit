/*
 * TODO
 *          optmiz
 *              add(etc) batch jobs. so heightScore and topmost only have to bubble once
 * v0.0.1-1
 * Scoretree - Treenet
 */
import {isGreaterThan, eachAsync} from '../../oo/utils.js';

export async function createScoretreeAsync(ß, {topmostLufo, descendantLufo}) {

    const
        log = ß?.log.log('scoretree', 10),
        getLufoAsync = ß?.storage.createBuilder(`/scoretree/`, {persistent:true, lufo:true});
    topmostLufo = topmostLufo || await getLufoAsync('topmost');
    descendantLufo = descendantLufo || await getLufoAsync('descendant');

    //const
    //    LUFO_PREFIX = 'scoretree:',
    //    getOrCreateLufo = (name, o={}) => ß.storage.getOrCreateLufo({...o, name: LUFO_PREFIX + name, type: ß.storage.PERMANENT});

    //topmostLufo = topmostLufo || getOrCreateLufo('topmost');
    //descendantLufo = descendantLufo || getOrCreateLufo('descendant');

    async function eachTopmostAsync(cb) {
        await topmostLufo.eachValueAsync(cb);
    }

    async function eachDescendantAsync(cb) {
        await descendantLufo.eachValueAsync(cb);
    }

    function createNode({noteId, prev}) { //console.log({noteId, prev});
        // since this node is a mirror of a note,
        // it should use the same noteId as identifier.
        return {
            noteId,         // id
            prev,           // parent
            children: [],   // children
            topmost: null,  // referens to a root or orphan node
            score: null,
            heightScore: null
        };
    }

    async function useAsync(noteId) {
        return await descendantLufo.useValueAsync(noteId) || await topmostLufo.useValueAsync(noteId);
    }

    async function getAsync(noteId) {
        return await descendantLufo.getValueAsync(noteId) || await topmostLufo.getValueAsync(noteId);
    }

    async function hasAsync(noteId) {
        return await descendantLufo.hasAsync(noteId) || await topmostLufo.hasAsync(noteId);
    }

    async function isTopmostAsync(noteId) {
        return topmostLufo.hasAsync(noteId);
    }

    async function addNoteNodeAsync(noteNode, score) {         log?.n(2, 'addNoteNode', {noteNode, topmostLufo, descendantLufo});
        const
            children = noteNode.children,
            {noteId, data} = noteNode.note,
            {prev} = data;
        return addAsync(children, noteId, prev, score);
    }

    async function addAsync(children, noteId, prev, score=0) { //console.log('add', {children, noteId, prev, score});
        if(children.note) throw 'replace call with addNoteNode' // TODO remove this check
        let prevSha384 = prev;
        /*
         * will create a mirror of the note, used for scoring purposes.
         * root/orphan notes will be tracked in a topmost lufo.
         * when a note is added, any existing copy will be overwritten.
         * the structure is self-healing, in the sense that an orphan will
         * become child as the missing parent note is added (deorphaned).
         *
         * when an orphan is deorphaned it cease being a topmost note,
         * structurally dependent data is recaalcuated/propagated througout
         * the new subtree. the structurally dependent are:
         *      all nodes should have a referece to its current topmost node
         *      all branch nodes should have the proper path score weighting
         *          and the score reflected in the proper scoring of children array
         *          with the greatest weighted path at index zero.
         *
         */
        // get or create
        let o = await topmostLufo.getValueAsync(noteId);
        if(!o) o = await descendantLufo.getValueAsync(noteId);
        if(!o) {
            o = createNode({noteId, prev: prevSha384});             log?.n(2, 'create', {noteId});
        }
        log?.n(2, 'current node', o);
        // children and scoring
        // When node.score and/or childrens are updated, re-calculate node.heightScore and children
        // set branchScores. Then bubble up the branchScore of the winning path.
        //      node.score          -   nodes own score
        //      node.heightScore    -   sum of all node scores from leaf to current node
        //      child.branchScore   -   heightScore at branching point
        const
            childrenIds = o.children.map(o => o.noteId), // note: this is children in scoretree
            removeChildrenIds = childrenIds.filter(noteId => !children.includes(noteId)),
            addChildrenIds = children.filter(noteId => !childrenIds.includes(noteId)),
            isChildrenUpdated = removeChildrenIds.length || addChildrenIds.length;
        removeChildrenIds.forEach(noteId => {
            const i = o.children.findIndex(o => noteId === o.noteId);
            if(i >= 0) o.children.splice(i, 1);
        });
        await eachAsync(addChildrenIds, async (noteId) => {
            const child = await descendantLufo.getValueAsync(noteId) || await topmostLufo.getValueAsync(noteId),
                  branchScore = child ? child.heightScore : 0;
            o.children.push({noteId, branchScore});             //log?.n(2, 'add child', {noteId, child, addChildrenIds});
        });
        if(isChildrenUpdated) o.children.sort((a, b) => isGreaterThan(a.branchScore, b.branchScore));
        const branchScore = o.children.length > 0 && o.children[0].branchScore; // best at zero
        if(score >= 0) o.score = score;
        o.heightScore = o.score + (branchScore || 0);           //console.log('best branchScore', {branchScore, o});
        // topmost
        prev = await topmostLufo.getValueAsync(prevSha384);
        const isPrevTopmost = !!prev;                           //log?.n(2, `is prev(${prevSha384}) topmost`, {isPrevTopmost, prev});
        if(!prev) prev = await descendantLufo.getValueAsync(prevSha384);
        let isTopmost = !prev;                                  //log?.n(2, 'is topmost', isTopmost);
        if(prev) {                                              //log?.n(2, 'parent', prevSha384);
            if(isTopmost) {
                await topmostLufo.removeAsync(noteId);
                isTopmost = false;
            }
        }
        await eachAsync(o.children, async ({noteId}) => {
            const o = await topmostLufo.getValueAsync(noteId);
            if(o) {
                await topmostLufo.removeAsync(noteId);                    log?.n(2, 'child was topmost', {noteId, o});
                await descendantLufo.addAsync(noteId, o);
            }
        });
        // set topmost
        let topmost;
        if(isTopmost) topmost = noteId;
        else topmost = prev.topmost;
        o.topmost = topmost;                                   //log?.n(2, {o});
        await eachAsync(o.children, async ({noteId}) => cascadeTopmostAsync(noteId, topmost));
        // save changes
        if(isTopmost) await topmostLufo.addAsync(noteId, o);
        else await descendantLufo.addAsync(noteId, o);
        if(prev) await bubbleScoreAsync(prevSha384, noteId, o.heightScore); // bubble up
        //log?.n(2, `add ${noteId} done. children=`, o.children);
        return o;
    }

    async function bubbleScoreAsync(noteId, childSha384, childHeightScore) {   //log?.n(2, 'bubbleScore', {noteId, childSha384, childHeightScore});
        let o = await descendantLufo.getValueAsync(noteId),
            isTopmost = !o;
        if(!o) o = await topmostLufo.getValueAsync(noteId);
        if(o) {
            let isUpdated; 
            // prepare
            const
                child = {noteId: childSha384, branchScore: childHeightScore},
                index = o.children.findIndex(o => childSha384 === o.noteId);
            if(index === -1) {
                o.children.push(child);
                isUpdated = true;
            }
            else if(o.children[index].branchScore !== childHeightScore) {
                o.children[index] = child;
                isUpdated = true;
            }
            if(!isUpdated) return; // no update needed
            // update
            o.children.sort((a, b) => isGreaterThan(a.branchScore, b.branchScore));
            const
                branchScore = o.children.length > 0 && o.children[0].branchScore; // best at zero
            const
                heightScore = o.score + branchScore;
            if(heightScore > o.heightScore) o.heightScore = heightScore;
            // save
            if(isTopmost) await topmostLufo.addAsync(noteId, o);
            else {
                await descendantLufo.addAsync(noteId, o);
                await bubbleScoreAsync(o.prev, noteId, o.heightScore);
            }
        }
    }

    async function cascadeTopmostAsync(noteId, topmost) {
        let o = await descendantLufo.getValueAsync(noteId);                        log?.n(2, 'cascadeTopmost', {noteId, topmost, o});
        if(o) {
            if(o.topmost !== topmost) {
                o.topmost = topmost;
                await descendantLufo.addAsync(noteId, o);
                await eachAsync(o.children, async (o) => cascadeTopmostAsync(o.noteId, topmost));
            }
        }
    }

    //function flat(cb) {
    //    const f = (o) => {
    //        cb(o);
    //        for(let i = 0; i < o.children.length; i++) {
    //            cb(o.children[i]);
    //        }
    //    };
    //    topmostLufo.lufo.forEachValue(0, o => f(o));
    //}

    return {
        useAsync,
        addAsync,
        addNoteNodeAsync,
        getAsync,
        hasAsync,
        isTopmostAsync,
        eachTopmostAsync,
        eachDescendantAsync,
        //flat,
        //debug: {
        //    topmostLufo,
        //    descendantLufo
        //}
    };
};

(async () => { // ASSSERT
    const L = console.log;
    //const L = () => {};
    L('test scoretree');
    let scoretree;
    const
        setup = async (topmost={}, descendant={}) => {
            //scoretree = createScoretree({topmostLufo, descendantLufo, log:{n:console.log}});
            scoretree = await createScoretreeAsync(null, {topmostLufo:mockupLufo(topmost), descendantLufo:mockupLufo(descendant)});
            return {topmost, descendant}
        },
        add = async (noteNode, score) => { //L({noteNode});
            await scoretree.addNoteNodeAsync(noteNode, score);
        };
    const
        mockupLufo = (lufo={}) => {
            return {
                lufo,
                getValueAsync: k => lufo[k],
                addAsync: (k, o) => lufo[k] = o,
                removeAsync: k => delete lufo[k],
                hasAsync: k => !!lufo[k]
            };
        },
        mockupNote = (noteId, prev, children) => {
            const note = {
                children,
                note: {
                    noteId,
                    data: {
                        prev
                    }
                }
            };
            //L({note});
            return note;
        };
    const
        assertScore = async (noteId, expectedScore, expectedHeightScore) => {
            const o = await scoretree.getAsync(noteId);// || descendantLufo.getValue(noteId); //console.log({o});
            //L(noteId, 'score', o.score, 'heightScore', o.heightScore, 'expectedScore', expectedScore, 'expectedHeightScore', expectedHeightScore);
            if(o.score !== expectedScore) throw `bad score for ${noteId}. found=${o.score} expectedScore=${expectedScore}`;
            if(o.heightScore !== expectedHeightScore) throw `bad score for ${noteId}. found=${o.heightScore} expected heightScore=${expectedHeightScore}`;
            return assertScore;
        },
        assertTopmost = async (arr, expected) => {
            //L('assertTopmost', {lufo});
            await eachAsync(arr, async (o) => { //console.log({o});
                const noteId = o.note.noteId,
                      isTopmost = expected === noteId;
                //L({noteId, expected, isTopmost});
                const topmost = (await scoretree.getAsync(noteId))?.topmost;
                if(topmost !== expected) throw `bad topmost for ${noteId}. topmost=${topmost} expected=${expected}`;
            });
        },
        assertLufo = async (noteId, expectedTopmost) => {
            //L('assertLufo', {noteId, expectedTopmost}, 'isTopmost=' + scoretree.isTopmost(noteId), scoretree.debug);
            if(expectedTopmost && !await scoretree.isTopmostAsync(noteId))
                throw `bad assert noteId=${noteId} expectedTopmost=${expectedTopmost}`;
            if(!expectedTopmost && await scoretree.isTopmostAsync(noteId))
                throw `bad assert noteId=${noteId} expectedTopmost=${expectedTopmost}`;
            if(!await scoretree.hasAsync(noteId))
                throw `bad assert did not find noteId=${noteId}`;
        },
        print = (data) => {for(let p in data) L(p, data[p].score, data[p].heightScore)};
   const
        a = mockupNote('a', null,   ['b', 'c']             ),
        b = mockupNote('b',  'a',   ['d']                  ),
        d = mockupNote('d',  'b',   []                     ),
        c = mockupNote('c',  'a',   ['e']                  ),
        e = mockupNote('e',  'c',   ['f', 'g', 'h']        ),
        f = mockupNote('f',  'e',   []                     ),
        g = mockupNote('g',  'e',   []                     ),
        h = mockupNote('h',  'e',   ['i']                  ),
        i = mockupNote('i',  'h',   ['j']                  ),
        j = mockupNote('j',  'i',   ['k']                  ),
        k = mockupNote('k',  'j',   []                     );

    let {topmost, descendant} = await setup();
    await add(j, 80); // j is a topmost orphan
    await assertLufo('j', true);
    await assertTopmost([j], 'j');
    await assertScore('j', 80, 80);
    await add(k, 100); // k is Not an orphan
    await assertLufo('k', false);
    await assertTopmost([j, k], 'j');
    await assertScore('j', 80, 180);
    await assertScore('k', 100, 100);
    await add(e, 105); // e is a topmost orphan
    await assertLufo('e', true);
    await assertTopmost([e], 'e')
    await assertTopmost([j, k], 'j');
    await assertScore('e', 105, 105);
    await assertScore('j', 80, 180);
    await assertScore('k', 100, 100);
    await add(f, 10); // f is Not an orphan
    await assertLufo('f', false);
    await assertLufo('e', true);
    await assertTopmost([e, f], 'e');
    await assertTopmost([j, k], 'j');
    await assertScore('e', 105, 115);
    await add(i, 100); // i is a topmost orphan, and deorphans j
    await assertLufo('i', true);
    await assertLufo('j', false);
    await assertTopmost([i, j, k], 'i');
    await assertScore('e', 105, 115);
    await assertScore('i', 100, 280);
    await assertScore('j', 80, 180);
    await assertScore('k', 100, 100);
    await add(h, 100); // h is Not an orphan, and deorphans i
    await assertLufo('h', false);
    await assertTopmost([k, j, i, h, e], 'e');
    await assertScore('e', 105, 485);
    await add(g, 500);
    await assertScore('e', 105, 605);
    await add(a, 100);
    await add(b, 101);
    await add(c, 100);
    await add(d, 100);
    await assertScore('a', 100, 805);
    await assertTopmost([a, b, c, d, e, f, g, h, i, j, k], 'a');
    await add(k, 900); // re-add
    await assertScore('a', 100, 1485);
    await add(d, 1500); // re-add
    await assertScore('a', 100, 1701);
    await assertTopmost([a, b, c, d, e, f, g, h, i, j, k], 'a');
    await add(g, 2000); // re-add
    await assertScore('a', 100, 2305);
    //console.log('SCORETREE END', {topmost, descendant});
})();


