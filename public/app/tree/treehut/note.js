import {friendlySignerName} from './signer.js';
import {Icon, Expander, Modal} from './tugs.js';
import {friendlyDate} from '../../oo/utils.js';

//function transformNode(node) {
//    //binder.node = node; // TODO ???????????
//    //console.log('ipdate', noteId, node);
//    const
//        {siblings, note} = node,
//        nbrSiblings = siblings.length,
//        index = siblings.findIndex(o => note.noteId === o.noteId);
//
//    return {
//        leftNoteId: siblings[index-1]?.noteId,
//        rightNoteId: siblings[index+1]?.noteId,
//        leftCount: index,
//        rightCount: nbrSiblings - index - 1,
//        //text: node.note.data.text,
//        prev: node.note.data.prev
//    };
//}

export function NoteCard({oo, go, res, setres, $}, {noteId, swipe, binder, onBinderUpdated}) {
    oo.css(`
    NoteCard {
        -webkit-transform: rotateZ(360deg);
        -webkit-font-smoothing: antialiased;
        will-change: auto;
        display: block;
        /*padding-top: 30px;*/
        /*opacity: 0;*/
        transition: opacity var(--transitionSlow) linear;
        width: 100%;
        /*color: #f0f0f0;*/
        /*overflow: hidden;*/
    }

    NoteCard Icon {
        color: var(--whitedark);
        font-size: var(--fontl);
    }

    NoteCard Notebody {
        display: block;
        margin-top: 15px;
        margin-right: 3px;
    }

    Notefooter {
        display: block;
        height: 25px;
    }


    `);

    const onClick = oo.xx('onClick');

    const CARD = res(`res/card/note/${noteId}?sort=bubble`);//, console.log);
    const cardHeader = oo(CardHeader);

    const noteBody = oo('Notebody')
        .on(CARD + '/text', (text, o) => {
            o.text(text + ' ' + noteId.substring(0, 6));
            //oo._._.style({opacity: 1});
            oo.bubble('resized');
        })
        .onclick(() => {
            onClick(noteId);
        })
        .style(swipe ? {} : {cursor: 'pointer'})
    ;

    const noteControls = oo(NoteControls);

    oo('Notefooter');

    oo.on(CARD, (card) => {
        // bit of hack, but tree.js uses a binder to find out if the card has a parent or not.
        // lists could of course query for this info, but this hack actually lowers the complexity,
        // and makes it easier to read the code.
        if(binder) {
            //console.log('download children', card.children, 'for', noteId);
            binder.children = card.children;
            binder.prevId = card.prev;
            onBinderUpdated(binder);
        }
    });

    oo.onDestroy(() => {
        //console.log('destroying note', noteId);
        //console.log('card:', oo.$(`res/card/note/${noteId}?sort=bubble`));
    });

    oo.x([
        //function getSelectedChildId() {
        //    return noteControls.getSelectedChildId()
        //},
        function setSelectedChildId(id) {
            return noteControls.setSelectedChildId(id)
        },
        function getLeftChildId() {
            return noteControls.getLeftChildId();
        },
        function getRightChildId() {
            return noteControls.getRightChildId();
        }
    ]);
};

function CardHeader({oo, $}) {
    const {noteId, showSignerName=true} = oo.prop('noteId', 'showSignerName');

    oo.css(`
    CardHeader {
        display: grid;
        grid-template-columns: fit-content(100%)  1fr fit-content(100%);
        width: 100%;
        text-align: center;
        font-size: var(--fonts);
    }

    CardHeader Button Signername {
        padding-left: 12px;
        padding-right: 12px;
    }

    CardHeader Button Signdate {
        padding-left: 5px;
        padding-right: 5px;
    }

    CardHeader Button:hover {
        background: var(--whitesun);
        color: var(--grayspace);
        cursor: pointer;
    }

    CardHeader Button {
        font-size: var(--fonts);
        border-radius: 12px;
        background: var(--background-cardheader);
        color: var(--whitemedium);
        margin: 0;
    }

    /*CardHeader Line {
        display: block;
        width: 100%;
        height: 49%;
        border-bottom: 2px solid var(--background-cardheader);
    }*/
    `);

    const CARD = oo.res(`res/card/note/${noteId}`);

    const signerName = oo('button')('Signername')
            .on(CARD, (card, oo) => {
                oo.text(friendlySignerName(card.signerName, card.signerId));
                if(card.isFollowing) oo.classList({add:'fyellow'});
                else oo.classList({remove:'fgreen'});
            })
            .onclick(({event}) => {
                oo.go('/signer/' + $(CARD).signerId);
            })._
    ;

    const signerNameLine = oo('span');

    if(!showSignerName) {
        signerNameLine.style({visibility: 'hidden'});
        signerName.style({visibility: 'hidden'});
    }

    oo('button')('Signdate')
            .on(CARD + '/ms', (ms, o) => {
                 o.text(friendlyDate(ms));
            })
            .onclick(() => {
                const score = Math.floor($(CARD+'/score') * 100);
                oo(Modal)
                    .add('Branch', 'This is a note signed by a signer.')
                    .add('Score', 'A score ranges between 0 - 100. A high value indicates that the Branch should be propagated wildly on the network. The score is partly derived from how you feel about it, partly how your peers think about it. This partcular Branch has this score: ' + score)
                    .add('Meta data', `Branch id: ${noteId}`)
                ;
             })
    ;

    //oo.x([
    //    function foo() {
    //    }
    //]);
}

function NoteControls({oo, $, go}) { // reply, boost, block, share, information
    const {swipe, noteId, binder} = oo.prop('swipe', 'noteId', 'binder');
    oo.css(`
    NoteControls {
        margin-top: 15px;
        display: grid;
        /*grid-template-columns: 25px 1fr fit-content(100%)  1fr fit-content(100%) 1fr 25px 5px;*/
        grid-template-columns: repeat(6, 1fr);
        column-gap: 5px;
        text-align: center;
        width: 100%;
        height: 40px;
    }

    NoteControls Button:hover {
        background: var(--whitesun);
        color: var(--grayspace);
        cursor: pointer;
    }

    NoteControls Button {
        font-size: var(--fonts);
        border-radius: 12px;
        background: var(--background-cardheader);
        color: var(--whitemedium);
        margin: 0;
        max-height: 24px;
        margin-top: 12px;
    }

    NoteControls Button.off {
        color: var(--whitedark);
    }
     `);

    let childId,
        childIndex;

    const swipeTo = (direction) => {                                //console.log('swipeTo', direction, {swipe});
        if(swipe) {
            return swipe(direction, binder);
        }
    };

    const CARD = oo.res(`res/card/note/${noteId}`);

    const left = {
        button: oo('button').onevent('down', () => {
            return swipeTo('left');
        }),
        index: -1,
        id: null
    };

    oo(Icon, 'add_comment', {md:24}).onclick(() => {
        go('/compose/' + noteId);
    });

    oo(Icon, 'offline_bolt', {md:24}).onclick(() => {
        alert('TODO');
    });

    oo(Icon, 'block', {md:24}).onclick(() => {
        alert('TODO');
    });

    oo(Icon, 'stars', {md:24}).onevent('click', () => {
        alert('stars clicked');
    });

    const right = {
        button: oo('button').onevent('click', () => {
            return swipeTo('right');
        }),
        index: -1,
        id: null
    };

    if(!swipe) {
        left.button.style({visibility: 'hidden'});
        right.button.style({visibility: 'hidden'});
    }

    const update = () => {

        if(!swipe) return;

        const card = $(CARD) || {children:[]};
        const children = card.children;
        if(!childId && children[0]) childId = children[0].noteId; // init
        childIndex = children.findIndex(o => childId === o.noteId);

        const leftNbrChildren = childIndex > 0 ? childIndex : 0;
        if(swipe && leftNbrChildren > 0) {
            left.button.text(leftNbrChildren < 99 ? leftNbrChildren : 99);
            left.button.style({visibility: 'visible'});
            left.index = childIndex - 1;
            left.id = children[left.index] ? children[left.index].noteId : null;
            left.button.classList({clear:true});
        } else {
            //left.button.style({visibility: 'hidden'});
            left.button.classList({add:'off'});
            left.button.text('0');
            left.index = -1;
            left.id = null
        }

        const rightNbrChildren = children.length - childIndex - 1;
        if(swipe && rightNbrChildren > 0) {
            right.button.text(rightNbrChildren < 99 ? rightNbrChildren : 99);
            right.button.style({visibility: 'visible'});
            right.index = childIndex + 1;
            right.id = children[right.index] ? children[right.index].noteId : null;
            right.button.classList({clear:true});
        } else {
            //right.button.style({visibility: 'hidden'});
            right.button.classList({add:'off'});
            right.button.text('0');
            right.index = -1;
            right.id = null
        }

        //console.log(noteId, {childId, childIndex, leftNbrChildren, rightNbrChildren, 'childLength:':children.length, left, right}, children.map(o => o.noteId) );
        //console.log({noteId, children, childId, left, right});
    };

    oo.x([
        function setSelectedChildId(id) {
            childId = id;
            update(true);
            return childId;
        },
        //function getSelectedChildId() {
        //    return childId;
        //},
        function getLeftChildId() {
            return left.id;
        },
        function getRightChildId() {
            return right.id;
        }
    ]);

    oo.on(CARD, update);
}

