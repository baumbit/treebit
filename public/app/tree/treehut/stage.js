/**
 * TODO
 *      usability
 *              use cue to create transitions between pages
 *
 */
export const
      //NOTE_SCROLL = NOTE + '/scroll',
      STAGE_NOTE = 'stage/note',
      STAGE_NOTE_NAV = STAGE_NOTE + '/nav',
      STAGE_NOTE_HISTORY = STAGE_NOTE + '/history',
      STAGE_NOTE_ROUTE = STAGE_NOTE + '/route';

import {Icon} from './tugs.js';
import {Tree} from './tree.js';
import {Signer} from './signer.js';
import {Signers} from './signers.js';
import {Cabinet} from './cabinet/cabinet.js';
import {CabinetSigner} from './cabinet/signer.js';
import {CabinetAdd} from './cabinet/add.js';
import {Feeds} from './feeds.js';
import {Peers} from './peers.js';
import {NetworkNodes} from './network-nodes.js';
import {Connect} from './connect.js';
import {NodeProfile} from './node-profile.js';
import {Peer} from './peer.js';
//import {FollowingSigners} from './following-signers.js';
//import {FollowingNotes} from './following-notes.js';
import {Home} from './home.js';
import {Compose} from './compose.js';
import {TreehutSignin, SigninRefresh} from './signin.js';
import {Account} from './account.js';
import {Dev} from './dev.js';
import {Splash} from './splash.js';
import {feeds} from '../feed-manager.js';

export function createStage({oo, on, route, go, $:{$, set}, createCue}, log) {
    /*
     * A stage is created by fusing intentions (routes, gestures, etc)
     * and presentation (transition between views).
     */
    oo.css(`
    .teleportLeft {
        transition: 0.00001s linear;
        transform: translateX(100%);
    }

    .teleportRight {
        transition: 0.00001s linear;
        transform: translateX(-100%);
     }

    .teleportAbove {
        transition: 0.00001s linear;
        transform: translateY(-100%);
    }

    .teleportBelow {
        transition: 0.00001s linear;
        transform: translateY(100%);
    }

    .exitLeft {
        transition: var(--transitionSlow) linear;
        transform: translateX(100%);
    }

    .exitRight {
        transition: var(--transitionSlow) linear;
        transform: translateX(-100%);
    }

    .exitAbove {
        transition: var(--transitionSlow) linear;
        transform: translateY(-100%);
    }

    .exitBelow {
        transition: var(--transitionSlow) linear;
        transform: translateY(100%);
    }

    .enter {
        transition: var(--transitionSlow) linear;
        transform: translateX(0%);
        transform: translateY(0%);
    }

    .fadeIn {
        opacity: 1;
    }

    .fadeOut {
        opacity: 0;
    }

    `, 'Stage');

    //const
    //    cue = createCue(oo);

    let currPage;
    const
        open = (Tug, props) => {
            if(currPage) currPage.destroy(); // TODO add nice cue
            currPage = oo(Tug, props);
            return currPage;
        },
        close = () => {
            if(currPage) currPage.destroy();
        };

        //fadein = (page, props) => {
        //    cue({...page, replace: true, className: 'fadeIn', props:{...props, className:'page'}});
        //},
        //fadeout = (pages) => {
        //    pages.forEach(page => cue({...page, regenerate:false, className:'fadeOut'})({destroy:true}));
        //};

    //
    // intercept
    // must be addPageed as first route. will catch all paths, but will not block any.
    //
    //let popstateAction, pushstateAction;
    //route({block:false}, '/*', ({hints}) => {                                       console.log({hints});
    //    if(hints.popstate) {
    //        //if(popstateAction && popstateAction())
    //        cue('all', {destroy:true});
    //    }
    //    //else if(pushstateAction) {
    //    //    pushstateAction();
    //   // }
    //    //popstateAction = null;
    //    //pushstateAction = null;
    //});

    //
    // generic pages
    //
    // :pathParams will be propagated to Tug props,
    // and should be readily available in the Tug.
    //
    // all generic pages have more or less same behvaiour,
    // and look and feel.
    //const
    //    addPage = (page, arr=[]) => {
    //        arr.forEach(arr => arr.push(page));
    //        return page;
    //    };
    //    // pages that might be sub-page of given page.
    //    //dashboardPages = [],
    //    //settingPages = [],
    //    //treenetPages = [];

    //const signin = addPage({Signin});
    route('/signin', () => {
        open(TreehutSignin);
        //fadeout([]);
        //fadein(signin);
    });

    //const signinRefresh = addPage({SigninRefresh});
    route('/signin/refresh', () => {
        //fadeout([]);
        //fadein(signinRefresh);
        open(SigninRefresh);
    });

    ////const followingSigners = addPage({FollowingSigners}, [dashboardPages, settingPages]);
    //route('/following/signers', () => {
    //    //fadeout([signer]);
    //    //fadein(followingSigners);
    //    open(FollowingSigners);
    //});

    ////const followingNotes = addPage({FollowingNotes}, [dashboardPages, settingPages]);
    //route('/following/notes', () => {
    //    //fadeout([signer]);
    //    //fadein(followingNotes);
    //    open(FollowingNotes);
    //});

    //const signers = addPage({Signers}, [dashboardPages, settingPages]);
    route('/signers', () => {
        //fadeout([signer]);
        //fadein(signers);
        open(Signers);
    });

    route('/signer/:signerId', ({props}) => {
        open(Signer, props);
    });


    //const settings = addPage({Settings}, [dashboardPages]);
    route('/feeds', () => {
        //fadeout(settingPages);
        //fadein(settings);
        open(Feeds);
    });

    //const connect = addPage({Connect}, [treenetPages, dashboardPages]);
    route('/network/connect/:nodeAddress', ({props}) => {
        //fadeout(treenetPages);
        //fadein(connect, props);
        open(Connect, props);
    });

    //const nodeProfile = addPage({NodeProfile}, [treenetPages, dashboardPages]);
    route('/node/profile', () => {
        //fadeout(treenetPages);
        //fadein(nodeProfile);
        open(NodeProfile);
    });

    route('/account', () => {
        //fadeout(treenetPages);
        //fadein(nodeProfile);
        open(Account);
    });

    //const peers = addPage({Peers}, [treenetPages, dashboardPages]);
    route('/peers', () => {
        //fadeout(treenetPages);
        //fadeout([peer]);
        //fadein(peers);
        open(Peers);
    });

    //const networkNodes = addPage({NetworkNodes}, [dashboardPages, treenetPages]);
    route('/network/nodes/:active', ({props}) => {
        //fadeout([networkNode]);
        //fadein(networkNodes, props);
        open(NetworkNodes, props);
    });

    //const compose = addPage({Compose}, [dashboardPages, settingPages]);
    route('/compose', ({props}) => {
        //fadeout([signer]);
        //fadein(compose, props);
        open(Compose, props);
    });
    route('/compose/:parentNoteId', ({props}) => {
        //fadeout([signer]);
        //fadein(compose, props);
        open(Compose, props);
    });

    //const peer = addPage({Peer}, [dashboardPages]);
    route('/peer/:peerId', ({props}) => {
        //fadein(peer, props);
        open(Peer, props);
    });

    //const cabinet = addPage({Cabinet}, [dashboardPages, settingPages]);
    route('/cabinet', () => {
        //fadein(cabinet)
        open(Cabinet);
    });

    //const signer = addPage({Signer}, [dashboardPages, settingPages]);
    route('/cabinet/add', () => {
        //fadein(signer, props)
        open(CabinetAdd);
    });

    route('/cabinet/signer/:signerId', ({props}) => {
        //fadein(signer, props)
        open(CabinetSigner, props);
    });

    //
    //  tree
    //
    set('stage/note', {
        history: [],
        index: 0,
        nav: null,
        route: null   // last routed to note id
        //scroll: null    // last scrolled to note id
    });
    route('/note/:noteId', ({props, hints}) => { //console.log({props, hints});
        if(!hints.silent) {
            open(Tree);
            currPage.jumpTo(props.noteId);
        }
        ////fadeout([settings, ...settingPages]);
        ////cue({...compose, className: 'exitAbove', regenerate: false});
        //const noteId = props.noteId,
        //      noteStage = $(STAGE_NOTE),
        //      replace = $(STAGE_NOTE_ROUTE) !== noteId;
        //if(!hints.dontPushHistory && noteStage.route != noteId) { //  && !hints.popstate
        //    const index = noteStage.index; //console.log(index, noteStage.history.length);
        //    let history = noteStage.history.slice(0, index+1);
        //    history.push(noteId);
        //    if(history.length > 4200 /* magic: remember no more history */) history.shift();
        //    noteStage.index = history.length-1;
        //    set(STAGE_NOTE_HISTORY, history);
        //}
        //set(STAGE_NOTE_ROUTE, noteId); //console.log('------>', $(STAGE_NOTE_HISTORY));
        //if(currPage && currPage.elementName !== 'tree') {
        //    open(Tree);
        //}
        //currPage.init(noteId, hints.swipe);
        //if(hints.swipe || ) { console.log(currPage.elementName);
        //    //cue({Tree, className: 'enter', props:{noteId}}, ({oo}) => {
        //    //    oo.init(noteId, hints.swipe);
        //    //});
        //} else {
        //    open(Tree, {noteId});
        //    //cue({...dashboard, className: 'exitBelow'});
        //    //cue({Tree, className: 'enter', replace: true, props:{noteId}}, ({oo}) => {
        //    //    oo.init(noteId, null);
        //    //});
        //}
        //} else {
        //    cue({Tree, className: 'enter', replace, props:{noteId, canopy, log}}, ({oo}) => {
        //        oo.init(noteId, hints.swipe, replace);
        //    });
        //}
    });

    //
    // dev pages
    //
    //const dev = {Dev};
    route('/dev', () => {
        open(Dev);
        ///cue({...dashboard, destroy:true});
        ///const cueClose = () => cue({...dev, destroy:true});
        ///fadein(dev, {cueClose});
    });

    //
    //  dashboard
    //
    //const home = {Home, props:{}};
    let isShowSplash = true;
    const openFeed = (props) => {
        //cue({...admin, destroy:true});
        //fadeout(homePages);
        //cue({...home, className: 'enter', replace: hints.debugReplace});
        if(isShowSplash) {
            isShowSplash = false;
            const splash = oo(Splash);
            splash.onDone(() => {
                open(Home, props);
            });
        } else {
            open(Home, props);
        }
    };
    route('/feed/:active', ({props}) => {
        openFeed(props);
    });
    route('/', ({props}) => {
        openFeed(props);
    });


    route('/*', () => {
        open(NotFound404);
        //cue('all', {destroy:true}, () => {
        //    cue({NotFound404});
        //});
    });
};

function NotFound404(oo) {
    oo('h2', '404: Not Found');
}
