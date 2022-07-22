//import {PageHeading, PageSection, SectionPanel, SectionGroup} from './page-tugs.js';
//import {Modal, Icon, errorToast, infoToast, EditableText, RefreshIcon} from './tugs.js';
import {NoteCard} from './note.js';
import {PageHeading, PageSection, SectionPanel, SectionGroup, SectionIcon} from './page-tugs.js';
import {createStoreList, createPagedList, ScrollablePage} from './infinite-list.js';
import {BackBar} from './bar.js';
import {toArr, friendlyDate, arrDel} from '../../oo/utils.js';
import {generateSignerAndPrivAsync, updateSignerAsync} from '../crypto-tree.js';
import {Expander, RefreshIcon, TextButton, TextInput, CopyableText, Icon, SavePlunger, Toggle, RadioList, RadioButton, infoToast, Modal, Secret, NumberInput} from './tugs.js';

export function Signer({oo, css, go, $:{$, set}, res, setres}, {signerId}) {
    const path = `res/signer/${signerId}/notes`;
    const list = createPagedList(oo, (count, arr) => { //console.log(next, count, ...arr);
            let s = `${path}?`;
            const noteId = arr[arr.length-1]; //console.log(next, arr.length);
            if(noteId) s += `noteId=${noteId}&`; //count = 1;
            s += `limit=${count}`;
            return s;
        }, (oo, noteId) => {
            return oo(NoteCard, {noteId, showSignerName:false});
        },
        'zsigner',
        (oo) => { // buildHeader
            oo(SignerHeader, {signerId})
            ;
        },
        undefined,  // nbr items to downlaod. let the function set it
        true        // accessing data by note id (and not index)
    );
    //list.refresh();
    oo(BackBar); // TODO replace with signerbar
};

function SignerHeader({oo, css, go, $, res, setres, store}, {signerId}) {
    css(`
    SignerHeader {
        width: 100%;
    }

    SignerHeader SectionIcon Icon {
        color: var(--greenlight);
    }

    SignerHeader PageSection SectionIcon {
        height: 35px;
    }

    RefreshSigner {
        position: absolute;
        right: 0;
        color: var(--whitemedium);
    }

    SignerFooter {
        display: block;
        height: 20px;
    }
    `);


    oo('div')
        (PageHeading, {i:'person', title:'Signer'}).onclick(() => {
            //showCabinetHelp(oo);
        })
        (RefreshSigner)
            .onUpdated(() => list.refresh())

    oo(PageSection, {text:'', help:true})
        .onHelpClicked(() => {
            //showCabinetHelp(oo);
        })
        (SectionPanel)(SingerSection, {signerId});
    ;

    oo('SignerFooter');


//
//    oo(PageSection, {text:'Create new signer', help:true})
//        .onHelpClicked(() => {
//            showCabinetHelp(oo);
//        })
//        (SectionIcon)
//            (Icon, 'person_add').onclick(async () => {
//                const {signer, priv} = await generateSignerAndPrivAsync();
//                const signerId = signer.signerId;
//                await setres(`res/cabinet/signer/${signerId}`, signer);
//                await setres(`res/cabinet/signerpriv/${signerId}`, priv);
//                if($.size('res/cabinet/signer') === 1) {
//                     // this was the first signer, so set as default
//                    await setres(`res/cabinet/defaultsignerid`, signerId);
//                }
//                await res('res/cabinet/signers'); // update list
//            })
//    ;
//
//    oo(PageSection, {text:'Signers you can select'});
}

function SingerSection({oo}, {signerId}) {
    oo.css(`
    Controls {
        /*background: #f0f;*/
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        column-gap: 5px;
        text-align: center;
        width: 100%;
    }

    SingerDesc {
        display: block;
        margin-top: 15px;
        margin-bottom: 15px;
    }

    CollapsedSignerDetails {
        height: 0px;
    }
    `);

    const SIGNER = oo.res(`res/card/signer/${signerId}`);//, console.log);
    //const SIGNER = oo.res('res/signer/' + signerId + '/profile');

    oo('div')
        ('b')(SignerName, {signerId}).style({fontSize: 'var(--fontn)'})
        //.on(SIGNER + '/data/name', (name, o) => {
        //    o.html(name);
        //})
        ._._
        ('i', signerId.substring(0, 10) + '...').style({position:'absolute', right:0})
    ;

    oo('SingerDesc')
        ('i').on(SIGNER + '/data/desc', (desc, o) => {
            o.html(desc);
        })
    ;

    oo('Controls')
        (Follow, {signerId})
        ._
        (Block, {signerId})
    ;

    oo('div').classList({add:'line'});

    let signerDetails = oo('CollapsedSignerDetails');
    oo('center')(Expander)
        .onToggle((isExpanded, oo) => {
            //signerDetails = oo(SignerDetails, {signerId, replace:signerDetails});
            if(isExpanded) signerDetails = oo(SignerDetails, {signerId, replace:signerDetails});
            //else signerDetails = oo('CollapsedSignerDetails', {replace:signerDetails});
            console.log(oo);
            oo.style({visibility: 'hidden', height: '0px'});
            oo.bubble('resized');
        })
    ;
}

function Follow({oo, res, setres, $}, {signerId}) {
    const FOLLOW = res('res/follow/signer/' + signerId);
    //res(FOLLOW, {ms:1000*10});
    //res(followSignerPath, {ms:1000*10}, (followSignerPathFirstRes) => console.log({followSignerPathFirstRes}));

    const icon =  oo(Icon, 'person_add')
        .classList({add: 'fgreen', remove:'fred'})
        .on(FOLLOW, (isFollowing, o) => {
            console.log({isFollowing});
            if(isFollowing) {
                o.html('person_remove');
                o.classList({remove: 'fgreen', add:'fred'});
                infoToast(oo, 'Started following signer')
            } else {
                o.html('person_add');
                o.classList({add: 'fgreen', remove:'fred'});
                infoToast(oo, 'Unfollowed')
            }
        })
        .onclick(() => {
            setres(FOLLOW, !$(FOLLOW), {delayMs: 200});
        })
    ;
}

function Block({oo}) {
    oo(Icon, 'block')
        .classList({add:'fred'})
        .onclick(() => {
            alert('TODO: impl backend and frontend');
        });
}

function SignerDetails({oo}, {signerId}) {
    const SIGNER = oo.res('res/card/signer/' + signerId);  //oo.on(SIGNER, console.log);

    oo(SectionPanel)
           (SectionGroup)('H1', 'Last updated')('br')._._(CopyableText).on(`${SIGNER}/data/ms`, (ms, oo) => oo.html(friendlyDate(ms)))
           ._._
           (SectionGroup)('H1', 'Url')._('div').on(`${SIGNER}/data/urls`, (urls, oo) => {
                   oo.clear();
                   urls.forEach((nrl) => {
                       oo('div')(CopyableText, {size:25}).setText(nrl);
                   });
               })
           ._._
           (SectionGroup)('H1', 'Nrl')._('div').on(`${SIGNER}/data/nrls`, (nrls, oo) => {
                   oo.clear();
                   nrls.forEach((nrl, i) => {
                       oo('div')(CopyableText, {size:25}).setText(nrl);
                   });
               })
           ._._
           (SectionGroup)('H1', 'Unique ID')('br')._._(CopyableText, {size:20}).on(`${SIGNER}/signerId`, (ms, oo) => oo.setText(signerId))
           ._._
           (SectionGroup)('H1', 'Public key')._
               (CopyableText, {size:20}).on(`${SIGNER}/data/pub`, (pub, oo) => oo.setText(pub))
           ._._
           (SectionGroup)('H1', 'Signature')._
               (CopyableText, {size:20}).on(`${SIGNER}/signature`, (signature, oo) => oo.setText(signature))
   ;

 }

function RefreshSigner({oo}) {
    const onUpdated = oo.xx('onUpdated');
    oo(RefreshIcon)
        .onClick(async (oo) => {
            console.log('TODO load signer data from peers, if signer was last updated XXX time ago');
            /////await oo.sendRes('res/network/refresh');
            /////// give some time if server answers fast
            /////oo.timer(2000, () => {
            /////    oo.setStop();
            /////    onUpdated(oo);
            /////});
        });
}

function SignerListItem({oo, css, res, setres}, {signerId}) {
    css(`
    SignerListItem {
        display: grid;
        grid-template-columns: 70% 30%;
        column-gap: 5px;
        padding: 10px;
        margin: 5px;
        width: 100%;
        height: 60px;
        background: var(--whitespace);
    }
   `);
//    const SIGNER = oo.res(`res/cabinet/signer/${signerId}`);
//
//    const
//        left = oo('div'),
//        right = oo('div');
//    left('div')
//        ('div')('span', `$${SIGNER}/data/name`)
//    ;
//    left('div')('i', signerId.substring(0, 15) + '...')
//    ;
//
//    right('span').on(`${SIGNER}/data/ms`, (ms, oo) => {
//        oo.html(friendlyDate(ms));
//    })
//
}





/////////// TODO
///////////
///////////          Add
///////////                  then add an option to resource-api whether to ask peers for new notes or not
///////////                      add a refresh button that triggers server to ask peers for the new notes
///////////                          when doing the response from server will be longer so possible change how resource-api returns information
///////////                              or possibly set a onceMs update or something...
///////////                                  maybe a res({job}) that launches a "poll for this untill there is
///////////                                              a response from server that job is finished"
///////////                                                      even though the job itself turned up empty
///////////                                                              this is typical stuff to do at very end
///////////
///////////                  add an "refresh" button to signer... (scroll profile down will refresh list"
///////////                      which is better then the continous update, since that will trigger a peer request thing....
///////////                          possibly add an option flag whether to ask peers for data or not....
///////////                        
///////////
///////////
///////////          2 issues:
///////////                  1) prevent req spam while waiting for resp on prev req
///////////                              wait for response.... easy enough, but how to handle error?! or unresponsive requests?!
///////////                  2) how to append data to array
///////////                              maybe some sort of merge algo callback thing before setting
///////////                                      not possible to do on OO because merge may always be different
///////////          add horizontal scrolling of notes
/////////
/////////    //    verticalList.init(createRowItem, true);
/////////
/////////   // oo.x('init', (signerId) => {                 //log?.n(0, 'init', {noteId, swipeDirection});
/////////   //     signerProxy = ß.canopy.grabSignerProxy(signerId, 'bubble');
/////////   //     signerPub = signerProxy.getPublicKey();
/////////   //     let noteNode = signerProxy.getFirstNote(); console.log({signerProxy, noteNode});
/////////   //     if(head) remove(head);                          //log('clearing list');
/////////   //     head = create(noteNode);                        log({noteNode});
/////////   //     head.topY = 0;
/////////   //     render();
/////////   // });
///////////
/////////import {VerticalListTug} from './infinite-list.js';
/////////import {NoteFull} from './note.js';
/////////import {Bar} from './bar.js';
///////// 
/////////function createController(controller) {
/////////    controller?.abort?.();
/////////    controller = {
/////////        ondemand: true
/////////    };
/////////    return controller;
/////////}
/////////
/////////export function Signer({oo, css, go, $:{$, set}, res, setres}, {signerId, log}) {    log?.n(0, 'create Signer', oo.ref, {signerId});
/////////    css(`
/////////    Signer {
/////////        z-index: var(--zsigner);
/////////        position: absolute;
/////////        width: 100%;
/////////        transition: 0.1s linear;
/////////        /*background-color: #0f0;*/
/////////        background-color: var(--graylight);
/////////    }
/////////
/////////    Signer VerticalList Item {
/////////        display: block;
/////////        position: absolute;
/////////        min-height: 150px; /* TODO refactor MAGIC VALUE */ 
/////////        max-height: var(--heightballoon);
/////////        width: 100%;
/////////    }
/////////    `);
/////////
/////////    const notesPath = `res/signer/${signerId}/notes`;
/////////    let isDownloading = false,
/////////        notes = []; // optmz avoiding store lookup
/////////    function downloadNotes(noteId) {                             //console.log('downloadNotes', {noteId, isDownloading});
/////////        if(isDownloading) return;
/////////        isDownloading = true;
/////////        let path = notesPath + '?limit=100';
/////////        if(noteId) path += '&noteId=' + noteId;
/////////        // note: this resource request is designed to not work with store automatically,
/////////        // instead mutations are set manually.
/////////        res(path, {force:true, save:false, observe:false}, function(res) { //console.log('asd');
/////////            if(!res.error) {
/////////                const arr = $(notesPath) || [];
/////////                // TODO
/////////                //          if sorting order has changed on server,
/////////                //              or if a new item has been discovered and added,
/////////                //              the way data is downloaded to the client is not sophisticated enough
/////////                //              to handle this and hence data presented in GUI will not be a true reflection
/////////                //              of server state
/////////                //                      a possible solution would be to create a "last updated timestamp"
/////////                //                          on server or something similar, so we can now to refresh everything
/////////                //                          or/and make sure to sort data locally before presenting it here
/////////                //                              but this will require downloading of timestamp before downloading note
/////////                //                                  which should also be possible to add easily
/////////                //          when downloading new data, the scroll position is lost...
/////////                //              fix this after having added horizontal scrolling
/////////                //                      solutio  should be generic, because its needed throuth the treehut app
/////////                res.data.forEach(o => {
/////////                    if(!arr.includes(o)) arr.push(o);
/////////                });
/////////                set(notesPath, arr);
/////////            }
/////////            isDownloading = false;
/////////        });
/////////    }
/////////
/////////    const list = oo(VerticalListTug, {tag: 'VerticalList', createRow: (oo, index) => {
/////////        if(index === 0) {
/////////            return /*oo(function Row(){})*/oo(Profile, {signerId, log});
/////////            //return oo(function Row(){});
/////////        }
/////////        index--;                                                //console.log({isDownloading, index, notes});
/////////        if(index < notes.length) {
/////////            const noteId = notes[index]; //console.log({noteId});
/////////            return oo(Item, {noteId});
/////////            //return oo(function Row(){});
/////////        } else {
/////////            if(!isDownloading && notes.length && index === notes.length) {
/////////                downloadNotes(notes[index-1]);
/////////            }
/////////        }
/////////    }}).on(notesPath, (arr, list) => { //console.log(list);
/////////        // react to store mutations, no matter the origin of them.
/////////        notes = arr;
/////////        list.refresh();
/////////    });
/////////
/////////
/////////
/////////    //downloadNotes(notes[index-1]);
/////////    //res(notesPath+'?debug=hello', {force:true}, ({data}) => {
/////////    //    notes = data;
/////////    //    list.refresh();
/////////    //});
/////////
/////////    oo(Bar, {isBack:true, isCompose:false});
/////////    downloadNotes();
/////////};
/////////
/////////function Item(oo, {noteId, render}) {
/////////    oo(NoteFull, {noteId, binder:{}, render:()=>{}, signerNameProps:{style:{visibility:'hidden'}}});
/////////}
/////////
/////////function Profile({oo, css, go, $, res, setres}, {signerId, log}) {  //console.log('Profile');
/////////    css(`
/////////    Profile {
/////////        position: absolute;
/////////        /*display: block;*/
/////////    }
/////////
/////////    Profile SignerName {
/////////        font-size: 30px;
/////////    }
/////////    `);
/////////    oo(SignerName, {signerId});
/////////    const
/////////        followSignerPath = 'res/follow/signer/' + signerId,
/////////        signerPath = 'res/signer/' + signerId + '/profile',
/////////        signerDescPath = signerPath + '/data/desc';
/////////    //res(followSignerPath, {ms:1000*10}, (followSignerPathFirstRes) => console.log({followSignerPathFirstRes}));
/////////    res(followSignerPath, {ms:1000*10});
/////////    //res(signerPath);
/////////    res(signerPath, {force:true, ms:1000*10}); // TODO make continkios updates?!
///////// 
/////////    oo('br')._('br');
/////////    oo('b', `$${signerDescPath}`);
/////////    oo('br')._('br');
/////////    oo('button', 'FOLLOW').on(followSignerPath, (isFollowing, o) => o.style({color: isFollowing ? '#0f0' : '#f00'})).onclick(async () => {
/////////        setres(followSignerPath, !$(followSignerPath), {delayMs: 200});
/////////    });
/////////    //oo.onDestroy(() => {
/////////    //    console.trace();
/////////    //});
/////////}
/////////
export function SignerLight({oo}, {signerId}) {
    const path = `res/signer/${signerId}/profile`;
    oo('div', {className: 'side'})('div', {style:{width:'100%'}});
    const o = oo('div', {className: 'middle'});
    oo('div', {className: 'side'})('div', {style:{width:'100%'}});
    o('b')(SignerName, {signerId});
    o('br');
    o('br');
    o('i', '$'+path+'/data/desc');
};

export function friendlySignerName(text='Incognito', signerId) {
    //if(text.toLowerCase() === 'incognito') text = signerId;
    text = text.substring(0, 10);
    return text;
};

export function SignerName({oo, $, on, go, res}, {signerId, noteId}) { //    console.log({signerId});
    oo.text('...');
    const init = () => {
        oo.style({cursor: 'pointer'});
        //const SIGNER = res(`res/signer/${signerId}/profile`); // TODO res('res/signer/' + signerId + '/profile', {ms:1000*10})
        const SIGNER = res(`res/card/signer/${signerId}`); // TODO res('res/signer/' + signerId + '/profile', {ms:1000*10})
        on(SIGNER, (card, o) => { //console.log({card});
                let text = card.data.name;
                if(text && text.toLowerCase() === 'incognito') text = signerId;
                o.text(text.substring(0, 10)); // TODO human-friendly text
        });
        const FOLLOW = res('res/follow/signer/' + signerId);
        on(FOLLOW, (isFollowing, o) => o.style({color: isFollowing ? 'var(--yellowlight)' : 'var(--whitesun)'}))
    };

    if(signerId) {
        init();
    } else if(noteId) {
        oo.resAsync(`res/card/note/${noteId}?sort=bubble`, {delayMs: 100}, ({data}) => {
            if(!signerId && data.signerId) { // prevent store spam. signerId is immutable so this should work.
                signerId = data.signerId;
                init();
            }
        });
    }

    oo.onclick(() => {
        if(signerId) go('/signer/' + signerId);
    });
};

