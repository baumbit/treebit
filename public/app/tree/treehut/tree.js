// 
// a tree view is a view of an asyclic tree graph datastructure.
// because nodes in the tree might be downloaded out of order
// and root node might not even ever be found, its impossible
// to know in advance what the tree root is, hence impossible
// to correctly create a unique universal ID for a tree.
// because a tree lack a known identifier, the program design
// do not rely on one either. instead nodes in the GUI liten
// to changes of the node model on the server and if a node
// has been updated (say a knew simbiling has been found),
// the GUI node Item tells the tree list to render itself
// (instead of the tree list itself obseving changes to itself,
// because it can not know who it is, because it has no UID).
//
//
// TODO
//          optimize
//                  general optimization such as limiting creation, simpliyfin logic, etc
//                  run updateBound only on NoteCard.onSizeChanged
//                  preload content
//                  pool items so they can be re-used
import {createScrollHandler} from './scroll.js';
import {createEase, easeOutQuad} from '../../oo/ease-oo.js'
import {BackBar} from './bar.js';
import {NoteCard} from './note.js';
import {Icon} from './tugs.js';
import {STAGE_NOTE, STAGE_NOTE_NAV, STAGE_NOTE_ROUTE} from './stage.js';

export function Tree({oo, css}) {                                                   //console.log('new tre');
    css(`
    Tree List {
        z-index: var(--ztree);
        display: block;
        /*overflow: hidden;*/
        position: absolute;
        width: var(--widthfull);
        height: var(--heightfull);
    }

    Tree List NoteCard {
        width: 100%;
        position: absolute;
        /*padding-left: 3px;*/
    }

    Tree BackBar {
        z-index: var(--ztreebar);
    }

    `);
    oo(BackBar);
    const list = oo(List, {tag: 'List'});
    oo.x('jumpTo', list.jumpTo);
};

export function List({oo, css, go, resAsync, $}, {µ, log}) {                           //console.log('create List');
    //debug
    setInterval(() => {
       const count = (o, cnt=0) => {
           while(o) {
               cnt++;
               if(o.oldNext) cnt += count(o.oldNext);
               o = o.next;
            }
           return cnt;
       };
       log({head, nbrItems: count(head), branchPoint});
   }, 5000);
   const
        {height:VIEW_HEIGHT, width:VIEW_WIDTH} = oo.getBoundingClientRect(), // note: this will also force layout
        Y_MARGIN = 0,
        BOTTOM = VIEW_HEIGHT,
        TOP = 0,

        // XXX
        // these values defines the scrolling window of the items,
        // i.e. how many items should exist.
        // more means more smooth scrolling if user is switching a lot between scrolling up and down,
        // because items neither have to be added or removed.
        // but more items means more items to move and measure when scrolling, which when too much slows down rendering.
        // note: probably what creates most lag is fetching data from server, hence this values should probably be
        // changed before changing the scroll values.
        // if TOP_REMOVE_NOTE === TOP; means that only the items visible on screem should exist
        // if TOP_REMOVE_NOTE === Math.ceil(TOP - VIEW_HEIGHT / 2); twice at many items, as how many fits on screen

        TOP_REMOVE_NOTE = Math.ceil(TOP - (VIEW_HEIGHT/2)),
        BOTTOM_REMOVE_NOTE = Math.ceil(BOTTOM + (VIEW_HEIGHT/2)),
        //TOP_REMOVE_NOTE = TOP,            // DEBUG. good when debugging preloads etc.
        //BOTTOM_REMOVE_NOTE = BOTTOM,      // DEBUG

        LEFT_MARGIN_NOTE = 3,
        BOUNCE_BOTTOM = BOTTOM - 100, // TODO pick this value from size of last element instead
        BOUNCE_TOP = TOP + 50, // TODO pick this value from size top element instead
        HALF_WIDTH = VIEW_WIDTH * 0.5,

        MAX_PRELOAD_UP = 30,
        MAX_PRELOAD_DOWN = 30;
       //pools = {};
    let head,
        lastRenderedBinder,
        branchPoint = {},
        dragOffsetY,
        isPreloadDown = false,
        isPreloadUp = false;
         //stateXSwipe;

    oo.onDestroy(() => {                                                        //console.log('destroy list');
        // TODO deregister mouse input etc
        //removeNoteListener();
        head = null; // prevents possible rendering
    });

    oo.x('jumpTo', async (noteId) => {                                    //console.log('tree list init', {noteId, swipeDirection});
        const node = await resAsync(`res/tree/node/${noteId}?sort=bubble`); // TODO sort?
        head = createBinder(node.note.noteId);
        head.topY = BOUNCE_TOP;
        scrollHandler.requestRender();
    });

    const scrollHandler = createScrollHandler(oo, (stateX, stateY) => {         //console.log('scroll', {...stateX}, {...stateY});
        render(stateX, stateY);
    });

    function resetScrollY(b) { //console.log('resetScroll Y', b); console.trace();
        scrollHandler.resetY(b);
    }

    function resetScrollX(b) { //console.log('resetScroll X', b); console.trace();
        scrollHandler.resetX(b);
    }

    function render(stateX={x:0, easeValue:0}, stateY={y:0, easeValue:0}) {                 //console.log(branchPoint);
        //console.log('render', stateX, stateY, branchPoint);
        try {
            if(oo.isDestroyed) return; // render may be invoked via requestAnimationFrame or similar.
            if(head) {
                if(!branchPoint.isScrollAxis) {
                    if(stateX.drag && (branchPoint.leftBinder || branchPoint.rightBinder)) {    //console.log('scroll axis horizontal');
                        branchPoint.isScrollAxis = true;
                        resetScrollY(false);
                    } else if(stateX.fling || stateX.snap) {
                        branchPoint.isScrollAxis = true;
                        resetScrollY(false);
                    } else if(stateY.drag) {                                        //console.log('scroll axis vertical', {...stateX}, {...stateY});
                        branchPoint.isScrollAxis = true;
                        resetScrollX(false);
                    }
                }
                // vertical
                let y;
                if(stateY.drag) {
                    isClickEnabled = false;
                    clearBranchLeftRight(head); //console.log('dragging so clear');
                    if(!dragOffsetY) {
                        dragOffsetY = Math.floor(head.topY - stateY.y);
                    }
                    y = stateY.y + dragOffsetY;
                } else {
                    dragOffsetY = null;
                    y = head.topY - Y_MARGIN + stateY.easeValue;
                }
                // horizontal
                let x = 0; //console.log({branchPoint});
                if(branchPoint.selectedBinder) {                                  //console.log('selectedBinder', {...stateX}, {...branchPoint});
                    if(stateX.drag) {                                                    //console.log('drag', stateX, branchPoint.dragOffsetX);
                        isClickEnabled = false;
                        if(branchPoint.dirty) {                                         //console.log('drag', stateX, branchPoint.dragOffsetX);
                            resetScrollY(false);
                            branchPoint.dirty = false;
                            branchPoint.dragOffsetX = Math.floor(branchPoint.selectedBinder.x - stateX.x);
                            //console.log('dirty binder.x='+branchPoint.selectedBinder.x, 'stateX='+stateX.x, 'offset='+branchPoint.dragOffsetX);
                        }
                        //console.log('has rightBinder', !!branchPoint.rightBinder, 'parent', !!branchPoint.parentBinder);
                        x = stateX.x + branchPoint.dragOffsetX;                             //console.log('drag', x);
                        if(flipX()) return;
                    }
                    else if(stateX.ease) {                                                //console.log('ease', stateX.ease);
                        // fling or snap
                        x = stateX.easeValue;
                        if(flipX()) return;
                        if(isWall()) snapX(stateX);
                    }
                    else if(stateX.flingFinished) {                                             //console.log('flingFinished');
                        snapX();
                    }
                    else if(stateX.snapFinished) {                                             //console.log('snap finished');
                        x = LEFT_MARGIN_NOTE;
                        resetScrollY(true);
                        resetScrollX(true);
                        isClickEnabled = true;
                    }
                    else if(stateX.end) {                                                       //console.log('ended');
                        snapX();
                    }
                    else {
                        x = branchPoint.selectedBinder.x;
                    }
                    //else if(stateX.idle){
                    //    console.log('idle');
                    //}
                }
                lastRenderedBinder = renderList(head, y, x, !!stateX.ease, stateX, stateY, stateX.snappedToBinder, 'selected'); // TODO renderList(head, y, 0, 0);
                if(branchPoint.selectedBinder && stateX.snapFinished) {
                    // scrolling commpleted
                    clearBranchPoint();
                }
            }
        } catch(e) {
            console.log(branchPoint);
            console.error(e);
        }
    }

    function renderList(o, bottomY, x, isAddX, stateX, stateY, isHorizontal, debugTag) { //console.log('.');
        let isAboveBottomView = true,
            tail;
        while(o) {                                                      //log(`render=${o.noteId} next=${o.next}`);
            // vertical
            //updateBound(o);
            tail = o;
            o.topY = bottomY + Y_MARGIN; //console.log('head', o.topY, bottomY);
            o.oo.elm.style.top = o.topY + 'px'; // browser
            //o.oo.elm.style.transform = "translateY(" + Math.floor(o.topY) + "px)";
            //console.log(o.topY, o.oo.elm.style.top);
            let itemHeight = o.height;                                          //console.log('itemHeight', itemHeight, o.oo.elm.style.top, 0);
            bottomY = o.topY + itemHeight;                                      //console.log({bottomY, itemHeight});
            if(isHorizontal) {                                                  //console.log('render horizontal');
                if(isAddX) o.x += x;
                else o.x = x;
                //o.oo.elm.style.transform = "translateX" + Math.floor(o.x) + "px)";
                o.oo.elm.style.left = o.x + 'px';                               //console.log('x=', o.x);
                o.right = o.x + o.width; // instead of updateBound(o)
                if(o.right <= 0 || o.x > VIEW_WIDTH) {
                    o.oo.elm.style.visibility = 'hidden';
                } else if(o.oo.elm.style.visibility !== 'visible') {
                    o.oo.elm.style.visibility = 'visible';
                }
            } else if(o.oo.elm.style.visibility !== 'visible') {
                o.oo.elm.style.visibility = 'visible';
            }
            //console.log(o.left, o.right);
            if(stateY.down) {                                                   //console.log('items appear from ABOVE');
                 if(o === head && o.topY > BOUNCE_BOTTOM) {                     //console.log('head went to low. bounce');
                    o.topY = VIEW_HEIGHT;
                    scrollHandler.bounce();
                 } else if(o.topY > BOTTOM) {                                   //console.log('below bottom');
                    //console.log('note below bottom');
                    if(o.topY > BOTTOM_REMOVE_NOTE) {
                        //console.log('remove note below bottom');
                        //emptyBinder(o);
                        remove(o);
                        isAboveBottomView = false;
                    }
                 }
            } else {                                                            //log('items appear from BELOW. top=', o.noteId);
                if(!o.next && o.topY < BOUNCE_TOP) {                            //console.log('last item went to high. bounce');
                    o.topY = 0 - bottomY;
                    scrollHandler.bounce();
                    break;
                }
                if(bottomY < TOP) {                                             //log(`REMOVE head. next head=${head?.next.noteId}`);
                    //console.log('note above top');
                    if(bottomY < TOP_REMOVE_NOTE) {
                        //console.log('remove note at top');
                        let next = o.next;
                        remove(head);
                        o = head = next;
                        continue;
                    }
                }
            }
            // horizontal
            if(o === branchPoint.parentBinder) {                                //console.log('render old list');
                renderList(branchPoint.selectedBinder, bottomY, x, isAddX, stateX, stateY, true);

                if(branchPoint.leftBinder) {
                    //branchPoint.leftBinder.oo.elm.style.visibility = 'visible';
                    renderList(branchPoint.leftBinder, bottomY, branchPoint.selectedBinder.x - VIEW_WIDTH - LEFT_MARGIN_NOTE, false, stateX, stateY, true, 'left');
                }

                if(branchPoint.rightBinder) {
                    const rightX = branchPoint.selectedBinder.x + VIEW_WIDTH + LEFT_MARGIN_NOTE;
                    //branchPoint.rightBinder.oo.elm.style.visibility = 'visible';
                    renderList(branchPoint.rightBinder, bottomY, rightX, false, stateX, stateY, true, 'right');
                }

                isAboveBottomView = false;
                break;
            } else {    //console.log('');                     //console.log('head', head.noteId, 'tail', o.noteId, 'o.next', o.next);
                o = o.next; //console.log({o});
            }
        }
        //console.log('tail is head', head.noteId === tail.noteId);
        //console.log('topY after loop', head.topY);
        //log('tail=', tail?.noteId, 'head=', head?.noteId);

        if(head) {                                                              //console.log('prepend to head');
            while(head.topY > TOP) {                                            //console.log('head below top', head.topY-Y_MARGIN, TOP);
                bottomY = head.topY - Y_MARGIN; //console.log()
                let prevId = head.prevId;                                       //console.log({head});
                if(prevId) {                                                    //console.log('create new binder', head.noteId, node.note.data.prev);
                    o = createBinder(prevId);
                    o.next = head;
                    head.prev = o;
                    head = o; //console.log({bottomY});
                    head.topY = bottomY - o.height; //getItemHeight(head);//.height;
                    head.oo.elm.style.top = o.topY + 'px'; // browser
                    if( !getSelectedChild(head) ) selectChild(head.next, head);
                } else {
                    break;
                }
            }
        }

        // append to tail
        //console.log({tail, head});
        if(isAboveBottomView) {                                                 //console.log('isAboveBottomView');
            while(tail) {
                //let topY = tail.topY + getItemHeight(tail) + Y_MARGIN;          //log?.n(0, tail.noteId, branchPoint);
                let topY = tail.topY + tail.height + Y_MARGIN;          //log?.n(0, tail.noteId, branchPoint);
                let parentX = tail.x;
                if(topY < BOTTOM) {
                   let nextId = getSelectedChild(tail);                     //console.log('append. tail=', tail.noteId, 'next', nextId);
                   if(!nextId) {
                       let bestChild = tail.children && tail.children[0]; //console.log('TODO make sure this is renderer bestChikd', bestChild, tail);
                       if(bestChild) {
                           nextId = bestChild.noteId;
                       }
                   }
                   o = createBinder(nextId);
                   if(o) {                                                  //log('create tail', o.noteId);
                        o.topY = topY;
                        o.oo.elm.style.top = o.topY + 'px'; // browser
                        o.oo.elm.style.left = parentX + 'px'; // browser
                        //console.log(o.oo.elm.style.top, o.topY);
                        tail.next = o;
                        o.prev = tail;
                        tail = o;
                        selectChild(tail, tail.prev);
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        return tail;

        // bounce
        //if(!head.next) scrollHandler.bounce(); // TODO SCROLL
    } // renderList: end

    let navChildren = {}; // while binder.next also knows the selected child, binders may get destroyed, hence this needed

    function getSelectedChild(prev) {
        let selected = navChildren[prev.noteId];
        if(selected) return selected.noteId;
        //return selected;
        //if(!selected && prev.children && prev.children.length) {
        //    selected = prev.children[0];
        //}
        //if(selected) return selected.noteId;
    }

    function selectChild(selected, prev) {                                          //console.log('selectChild', head.children);
        if(prev) {
            prev.oo.setSelectedChildId(selected.noteId);
        }
        navChildren[prev.noteId] = selected;
    }

    function snapX() {                                                          //console.log('snapX', {...branchPoint});
        let dist = 0;
        const selectedX = branchPoint.selectedBinder.x;                         //console.log({selectedX});
        if(selectedX > LEFT_MARGIN_NOTE) {
            dist = Math.ceil(selectedX - LEFT_MARGIN_NOTE);
        } else if(selectedX < LEFT_MARGIN_NOTE) {
            if(selectedX >= 0) {
                dist = Math.ceil(selectedX + LEFT_MARGIN_NOTE);
            } else {
                dist = Math.floor(selectedX - LEFT_MARGIN_NOTE);
            }                                                                   //console.log('snap right', selectedX, LEFT_MARGIN_NOTE, dist);
        }
        branchPoint.isScrollAxis = true;
        resetScrollY(false);
        scrollHandler.snap(dist);
    }

    function flipX() {                                                          //console.log('flip');
        if(branchPoint.leftBinder) {
            if(branchPoint.leftBinder.x > 0 - HALF_WIDTH) {
                if(branchPoint.flip !== branchPoint.leftBinder) {               //console.log('flip left');
                    updateBranchPoint(branchPoint.leftBinder, 'left');
                    return true;
                }
            }
        }
        if(branchPoint.rightBinder) {
            if(branchPoint.rightBinder.x < HALF_WIDTH) {
                if(branchPoint.flip !== branchPoint.rightBinder) {                  //console.log('flip right');
                    updateBranchPoint(branchPoint.rightBinder, 'right');
                    return true;
                }
            }
        }
    }

    function isWall(move) {
        const selectedX = branchPoint.selectedBinder.x;
        if(!branchPoint.leftBinder && selectedX > HALF_WIDTH) {
            return true;
        }
        if(!branchPoint.rightBinder && selectedX < 0 - HALF_WIDTH) {
            return true;
        }
    }

    function swipe(direction, binder) {                                     //console.log('swipe', direction);
        if(binder.next) {
            updateBranchPoint(binder.next);
            if(direction === 'left') {
                if(branchPoint.leftId) {
                    scrollHandler.flingX(VIEW_WIDTH * 1);
                    return false;
                }
            }
            else {
                if(branchPoint.rightId) {
                    scrollHandler.flingX(VIEW_WIDTH * -1);                  //console.log('swipe dlinfg', {VIEW_WIDTH});
                    return false;
               }
            }
        }
     }

    function setLocation(noteId) {
        if(noteId) go(`/note/${noteId}`, undefined, {silent:true});
        //else console.log('no noteId', noteId);
    }

    let isClickEnabled = true;
    function addSelectHandler(binder) {
        binder.oo.onevent('down', (svnt) => {
            updateBranchPoint(binder);
        });
        binder.oo.onevent('click', [
            () => !!isClickEnabled, // clicks prevented on note when dragging
            () => {}
        ]);
    }

    function scrapeBranchPointBinder(branchPoint, findId) {
        let binder;
        if(branchPoint.leftId === findId) {
            binder = branchPoint.leftBinder;
        } else if(branchPoint.rightId === findId) {
            binder = branchPoint.rightBinder;
        } else if(branchPoint.selectedBinder && branchPoint.selectedBinder.noteId === findId) {
            binder = branchPoint.selectedBinder;
        }
        return binder;
    }

    function isBranchBinderRemoveable(binder) {
        return binder && branchPoint.selectedBinder !== binder && branchPoint.leftBinder !== binder && branchPoint.rightBinder !== binder;
    }

    function updateBranchPoint(binder, flip) {              //console.log('updateBranchPoint', binder);
        if(binder === head) return; // can not scroll head horizontall

        if(!binder.prev) console.error('no prev inder');

        if(branchPoint.selectedBinder) { //console.log('not possible to scroll items on different "rows" at the same time');
            if(branchPoint.parentBinder !== binder.prev) return;
        }

        if(branchPoint.selectedBinder !== binder) {
            setLocation(binder.noteId);
        }

        const old = branchPoint;

        // selected
        branchPoint = {
            dirty: true,
            isScrollAxis: false,
            selectedBinder: binder,
            parentBinder: binder.prev,
            leftId: binder.prev.oo.getLeftChildId(),
            rightId: binder.prev.oo.getRightChildId()
        };
        //console.log('parent', binder.prev, 'left:', branchPoint.leftId, 'right', branchPoint.rightId);

        if(flip) {
            branchPoint.flip = branchPoint.selectedBinder;
            branchPoint.isScrollAxis = true;
            selectChild(branchPoint.flip, branchPoint.flip.prev);
            branchPoint.leftId = branchPoint.parentBinder.oo.getLeftChildId();
            branchPoint.rightId = branchPoint.parentBinder.oo.getRightChildId();
            //console.log('flip', 'left:', branchPoint.leftId, 'right:', branchPoint.rightId);
        }

        //console.log('TODO are this the proper child ids?" get them now or later?!?!?!=');
        //console.log('branchPoint', branchPoint.selectedBinder.noteId, 'l', branchPoint.leftId, 'r', branchPoint.rightId);
        // leftId: binder.prev && binder.prev.oo && binder.prev.oo.getLeftChildId(),
        //rightId: binder.prev && binder.prev.oo && binder.prev.oo.getRightChildId()

        if(old) {
            //console.log('left:', branchPoint.leftId, 'right:', branchPoint.rightId);
            branchPoint.leftBinder = scrapeBranchPointBinder(old, branchPoint.leftId);
            branchPoint.rightBinder = scrapeBranchPointBinder(old, branchPoint.rightId);
            //console.log('reuse binders', 'left:', !!branchPoint.leftBinder, 'right:', !!branchPoint.rightBinder, 'old',{...old},'new',{...branchPoint});
            //console.trace();
        }

        //console.log('create missing binders', 'left:', !branchPoint.leftBinder, 'right:', !branchPoint.rightBinder);
        if(!branchPoint.leftBinder && branchPoint.leftId) branchPoint.leftBinder = createBinder(branchPoint.leftId, 'left');
        if(!branchPoint.rightBinder && branchPoint.rightId) branchPoint.rightBinder = createBinder(branchPoint.rightId, 'right');

        if(branchPoint.leftBinder) branchPoint.leftBinder.prev = binder.prev;
        if(branchPoint.rightBinder) branchPoint.rightBinder.prev = binder.prev;
        if(branchPoint.parentBinder) {
            branchPoint.parentId = branchPoint.parentBinder.noteId;
            branchPoint.parentBinder.next = binder;
            //const parentBinder = old.parentId && get(old.parentId);
            //if(parentBinder) {
            //    parentBinder.next = binder; console.log('parentBinder next updated');
            //}
        }

        if(old && old.selectedBinder !== branchPoint.selectedBinder) {
            if(isBranchBinderRemoveable(old.leftBinder)) remove(old.leftBinder, true, true);
            if(isBranchBinderRemoveable(old.rightBinder)) remove(old.rightBinder, true, true);
            if(isBranchBinderRemoveable(old.selectedBinder)) remove(old.selectedBinder, true, true);
        }

        //console.log('updated branch point', {...branchPoint});
    }

    function clearBranchPoint() {
        if(branchPoint) {
            clearBranchLeftRight();
        }
        branchPoint = {};
    }

    function clearBranchLeftRight() {                //console.log('clearBranchLeftRight'); console.trace();
        //console.log('clear binders', 'left:', !!branchPoint.leftBinder, 'right:', !!branchPoint.rightBinder);
        if(branchPoint.leftBinder) {
            branchPoint.leftId = null;
            branchPoint.leftBinder.prev = null;
            remove(branchPoint.leftBinder, true, true);
            branchPoint.leftBinder = null;
        }
        if(branchPoint.rightBinder) {
            branchPoint.rightId = null;
            branchPoint.rightBinder.prev = null;
            remove(branchPoint.rightBinder, true, true);
            branchPoint.rightBinder = null;
        }

        //console.log('   after cleared. binder exists', 'left:', !!branchPoint.leftBinder, 'right:', !!branchPoint.rightBinder, {...branchPoint});
    }

    //function getItemHeight(item) {
    //    /*if(!item.height)*/ item.height = item.oo.getBoundingClientRect().height; //console.log(item.height);
    //    return item.height;
    //}

    function updateBound(o) {                                               //console.log('updateBound', o);
        const rect = o.oo.getBoundingClientRect(); //console.log({rect}, oo.elm);
        o.height = Math.floor(rect.bottom - rect.top);
        o.left = rect.left;
        o.right = rect.right;
        o.width = rect.width;
    }

    function requestRender(){
        scrollHandler.requestRender();
    }

    function get(noteId) {
        let o = head;                                                               //log('get->', {head});
        while(o) {                                                                  //log(' while', {o}, o.noteId === noteId);
            if(o.noteId === noteId) return o;
            o = o.next;
        }
    }

    function remove(o, isRemoveAll, isIgnorePrev) {               ///cconsole.log('remove');
        if(branchPoint){
            if(branchPoint.selectedBinder === o) {
                clearBranchPoint();
            }
        }
        if(o.prev) {                                                //log('not at top', {o});
            if(!isIgnorePrev) o.prev.next = null;
            if(o.next) remove(o.next);
        } else {                                                    //log('head', {o, isOldBranch});
            if(o.next) o.next.prev = null;
        }
        if(isRemoveAll && o.next) remove(o.next, isRemoveAll);
        o.children = null;
        o.prevId = null;
        o.prev = null;
        o.next = null;
        o.nextEmpty = null; // garbage collector should be able to collect the rest of the empty binders in the linked list
        o.oo.destroy(); // o.push(o); // to pool
        o.oo = null;
    }

    //function emptyBinder(binder) {
    //    if(binder === head) throw new Error('head binder can not be emptied');
    //    while(binder) {                                                             console.log('emptyBinder', {...binder});
    //        // create linked list
    //        binder.prev.next = null;
    //        binder.prev.nextEmpty = binder;
    //        // clear that which can be reflated
    //        // which is everything besides noteId.
    //        binder.oo.destroy();
    //        binder.children = null;
    //        binder.oo = null;
    //        binder.topY = 0;
    //        binder.prevId = null;
    //        binder.prev = null;
    //        // clear rest of the linked list
    //        let next = binder.next;
    //        binder.next = null;
    //        binder = next;
    //    }
    //}

    function createBinder(noteId, position, binder) {
        if(!noteId && !binder) return;

        if(binder) noteId = binder.noteId;
        else binder = {noteId};

        binder.children = null;
        binder.oo = oo(NoteCard, {swipe, noteId, binder, onBinderUpdated}); //console.log('createBinder noteId', noteId); console.trace();
        binder.topY = 0;                                                 //log(o);
        binder.prevId = null;
        binder.prev = null;
        binder.next = null;
        if(!position) binder.x = LEFT_MARGIN_NOTE;
        else {
            if(position === 'left') binder.x = 0 - VIEW_WIDTH - LEFT_MARGIN_NOTE;
            else if(position === 'right') binder.x = VIEW_WIDTH + LEFT_MARGIN_NOTE;
        }
        binder.oo.elm.style.visibility = 'hidden'; // prevent one frame flickering
        binder.oo.elm.style.left = binder.x + 'px';
        addSelectHandler(binder);
        updateBound(binder);
        return binder;
    }

    function onBinderUpdated(binder) { //console.log('binder updated', binder.noteId);
        // the cards knows if they are updated and when they are,
        // they can notify this list that they have been updated.
        if(binder.oo) {
            //console.log(binder.topY);
            updateBound(binder);
        }
        requestRender(0);

        if(head === binder) {
            preloadUpAsync(binder);
        } else if(lastRenderedBinder === binder) {
            preloadDownAsync(binder);
        }
    }

    async function preloadUpAsync(binder) {
        if(isPreloadUp) return;
        isPreloadUp = true;
        let prevId = binder.prevId; //console.log('preload-UP-Async',prevId, binder);
        for(let i = 0; i < MAX_PRELOAD_UP && prevId; i++) { //console.log(i, prevId);
            let CARD = `res/card/note/${prevId}`;
            if(oo.$(CARD)) {
                //console.log('already have card', CARD);
                break;
            } //else console.log('preload UP card:', CARD);
            await oo.resAsync(CARD, ({data}) => {
                prevId = data.prev;
            });
        }
        isPreloadUp = false;
    }

    async function preloadDownAsync(binder) {
        if(isPreloadDown) return;
        isPreloadDown = true; //console.log('will isPreloadDown cards', binder);
        let children = binder.children;
        for(let i = 0; i < MAX_PRELOAD_DOWN && children; i++) {
            let o = children[0];
            if(!o) break;
            let CARD = `res/card/note/${o.noteId}`;
            if(oo.$(CARD)) {
                //console.log('already have card', CARD, o);
                break;
            } //else console.log('isPreload-Down- card:', CARD);
            await oo.resAsync(CARD, ({data}) => {
                //console.log(data);
                children = data.children;
            });
        }
        isPreloadDown = false;
    }


    //function refresh() {
    //    let o = head;
    //    while(o) {
    //        o.oo.refresh();
    //        o = o.next;
    //    }
    //}

    // TODO
    //          ensure unique ref
    //          detach from DOM
    //function obtainItem(Tug) {
    //    if(!pools[Tug.name]) {
    //        pools[Tug.name] = createPool(Tug);
    //    }
    //    return pools[Tug.name].pop();
    //};
    //function createPool(Tug, arr=[]) {
    //    const
    //        pool = {},
    //        createItem = () => {
    //            const o = oo(Tug);
    //            return {
    //                oo: o,
    //                push: pool.push,
    //                pop: pool.pop
    //            };
    //        };
    //    pool.push = o => arr.push(o || createItem());
    //    pool.pop = () => {
    //        return arr.pop() || createItem();
    //    };
    //    return pool;
    //}
};

//function Item(oo, {noteId, swipe, binder, render}) {
//    oo(NoteCard, {noteId, swipe, binder, render});
//}

//function Treebar({oo, css, on, go, x, $:{$, set}}) {
//    oo = oo(BackBar);
//    const backBtn = oo('div')(Icon, {i:'&#8592;'}).onclick(() => set(STAGE_NOTE_NAV, 'back'));
//    const forwardBtn = oo('div')(Icon, {i:'&#8594;'}).onclick(() => set(STAGE_NOTE_NAV, 'forward'));
//    oo('div')(Icon, {i:'&#9744;'}).onclick(() => go('/')); //.onclick(x('onBack'));
//    oo('div')(Icon, {i:''}); // 4
//    oo('div')(Icon, {i:''}); // 5
//
//    const updateNavHistory = () => {
//        const note = $(STAGE_NOTE),
//              history = note.history; //console.log(note.index, note.history.length);
//        if(!(note.index >= 1)) backBtn.classList({add:'disabled'});
//        else backBtn.classList({remove:'disabled'});
//        if(note.history.length > 0 && note.index+1 < note.history.length) forwardBtn.classList({remove:'disabled'});
//        else forwardBtn.classList({add:'disabled'});
//    };
//    on(STAGE_NOTE_ROUTE, (r) => updateNavHistory());
//    on(STAGE_NOTE_NAV, {when:['back','forward']}, nav => {
//        const note = $(STAGE_NOTE),
//              history = note.history,
//              noteId = history[note.index];
//        let isGo;
//        if(nav === 'back' && note.index > 0) {
//            note.index--;
//            isGo = true;
//        } else if(nav === 'forward' && note.index+1 < history.length) {
//            note.index++;
//            isGo = true;
//        }
//        if(isGo) {
//            go('/note/' + history[note.index], undefined, {dontPushHistory: true});
//        }
//    });
//
//}

