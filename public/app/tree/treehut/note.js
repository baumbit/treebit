import {friendlySignerName} from './signer.js';
import {Icon, Expander, Modal} from './tugs.js';
import {friendlyDate} from '../../oo/utils.js';

function transformNode(node) {
    //binder.node = node; // TODO ???????????
    //console.log('ipdate', noteId, node);
    const
        {siblings, note} = node,
        nbrSiblings = siblings.length,
        index = siblings.findIndex(o => note.noteId === o.noteId);

    return {
        leftNoteId: siblings[index-1]?.noteId,
        rightNoteId: siblings[index+1]?.noteId,
        leftCount: index,
        rightCount: nbrSiblings - index - 1,
        //text: node.note.data.text,
        prev: node.note.data.prev
    };
}

export function NoteCard({oo, go, res, setres, $}, {noteId, swipe, binder, render, showSignerName}) {
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
        height: 20px;
    }
    `);

    const onClick = oo.xx('onClick');

    const CARD = res(`res/card/note/${noteId}?sort=bubble`);//, console.log);
    const cardHeader = oo(CardHeader, {noteId, binder, swipe, showSignerName});

    const noteBody = oo('Notebody')
        .on(CARD + '/text', (text, o) => {
            o.text(text);
            //oo._._.style({opacity: 1});
            oo.bubble('resized');
        })
        .onclick(() => {
            onClick(noteId)
        })
        .style(swipe ? {} : {cursor: 'pointer'})
    ;

    oo(NoteControls, {noteId});

    oo('Notefooter');

    oo.on(CARD, (card) => {
        // bit of hack, but tree.js uses a binder to find out if the card has a parent or not.
        // lists could of course query for this info, but this hack actually lowers the complexity,
        // and makes it easier to read the code.
        if(binder) {
            //console.log('download children', card.children, 'for', noteId);
            binder.children = card.children;
            binder.prevId = card.prev;
            //render(0); // TODO remove and test if it works (should not be needed because we got resize event)
        }
    });

    oo.x([
        function getLeftNoteId() {
            return cardHeader.getLeftNoteId();
        },
        function getRightNoteId() {
            return cardHeader.getRightNoteId();
        }
    ]);
};

function CardHeader({oo, $}, {noteId, swipe, showSignerName=true}) {
    oo.css(`
    CardHeader {
        display: grid;
        grid-template-columns: 25px 1fr fit-content(100%)  1fr fit-content(100%) 1fr 25px 5px;
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

    CardHeader Line {
        display: block;
        width: 100%;
        height: 49%;
        border-bottom: 2px solid var(--background-cardheader);
    }
    `);

    const CARD = oo.res(`res/card/note/${noteId}`);

    const swipeTo = (direction) => {                                //console.log('swipeTo', direction, {swipe});
        if(swipe) {
            return swipe(direction);
        }
    };

    const left = {
        nav: oo('button').onclick(() => {
            return swipeTo('left');
        })
    };

    const leftLine = oo('Line');

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
    const signerNameLine = oo('Line');
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

    const rightLine = oo('Line');

    const right = {
        nav: oo('button').onclick(() => {
            return swipeTo('right')
        })
    };

    oo.on(CARD, (card) => {
        const
            {siblings} = card,
            nbrSiblings = siblings.length,
            index = siblings.findIndex(o => noteId === o.noteId),
            leftNbrSiblings = index > 0 ? index : 0,
            rightNbrSiblings = nbrSiblings - index - 1;

        left.id = siblings[index-1]?.noteId;
        right.id = siblings[index+1]?.noteId;

        if(swipe) {
            left.nav.text(leftNbrSiblings < 99 ? leftNbrSiblings : 99);
            right.nav.text(rightNbrSiblings < 99 ? rightNbrSiblings : 99);
        }

        //right.id = noteId;
        //right.nav.text('dbg');

     });

     if(!swipe) {
        left.nav.style({visibility: 'hidden'});
        leftLine.style({visibility: 'hidden'});
        right.nav.style({visibility: 'hidden'});
        rightLine.style({visibility: 'hidden'});
     }

     oo.x([
        function getLeftNoteId() {
            return left.id || null;
        },
        function getRightNoteId() {
            return right.id || null;
        }
    ]);
}

function NoteControls({oo, go}, {noteId}) { // reply, boost, block, share, information
    oo.css(`
    NoteControls {
        margin-top: 15px;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        column-gap: 5px;
        text-align: center;
        width: 100%;
        height: 40px;
    }
    `);

    oo(Icon, 'add_comment', {md:24}).onclick(() => {
        go('/compose/' + noteId);
    });

    oo(Icon, 'offline_bolt', {md:24}).onclick(() => {
        alert('TODO');
    });

    oo(Icon, 'block', {md:24}).onclick(() => {
        alert('TODO');
    });

    oo(Icon, 'stars', {md:24}).onclick(() => {
        alert('TODO');
    });

    // TODO create grid and display icons
    // TODO add res listener to update buttons
    //const NODE = res(`res/tree/node/${noteId}?sort=bubble`, console.log);

    //const render = () => {
    //};

    //oo.on(NODE, (node) => {
    //    render(transformNode(node));
    //});
}


