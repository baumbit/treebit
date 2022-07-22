// TODO add a timeout, before posting so that posting can be UNDONE
import {ComposeBar} from './bar.js';
import {createMockupSentence} from '../mockup.js';
import {generateNoteAsync} from '../crypto-tree.js';
import {SignerName} from './signer.js';
import {ScrollablePage} from './infinite-list.js';
import {PageHeading, PageSection, SectionPanel, SectionGroup} from './page-tugs.js';
import {TextAreaInput, Modal, Icon, SavePlunger, errorToast} from './tugs.js';
import {getPrivateKeyAsync, setPrivateKey} from './cabinet/private-key.js';
//import {TextButton, TextInput, CopyableText, Icon, SavePlunger, Toggle, RadioList, RadioButton, infoToast, Modal, Secret, NumberInput} from './tugs.js';

const
    DRAFTS_PATH = 'gui/compose/drafts',
    MAX_CACHE_SIZE = 10;

export function Compose({oo, css}, props) {
    css(`z-index: var(--zcompose);`);
    oo(ScrollablePage)(ComposePage, props);
    oo(ComposeBar);
};

function createComposeHelp({oo}) {
    oo(Modal)
        .add('Compose', 'Write a new note and broadcast to the network. Broadcasting can not be undone.');
    ;
}

function addToCache(oo, id, text) {
    const arr = oo.$(DRAFTS_PATH) || [];
    let msg = getFromCache(oo, id);
    if(!msg.id) {
        if(id) id = 'p'+id;
        else id = 'r';
        msg = {id};
        arr.splice(0, 0, msg);
    }
    msg.text = text;
    if(arr.lengh > MAX_CACHE_SIZE) arr.pop();
    oo.$.set(DRAFTS_PATH, arr);
}

function getFromCache({$}, id) {
    if(id) id = 'p'+id;
    else id = 'r';
    const arr = $(DRAFTS_PATH) || [];
    let msg = arr.find(msg => msg.id === id);
    if(!msg) {
        msg = {text: ''};
        msg.text = createMockupSentence(); // DBEUG
    }
    return msg;
}

function delFromCache({$}, id) {
    if(id) id = 'p'+id;
    else id = 'r';
    const arr = $(DRAFTS_PATH) || [];
    const i = arr.findIndex(msg => msg.id === id);
    if(i >= 0) arr.splice(i, 1);
    $.set(DRAFTS_PATH, arr);
}

function ComposePage({oo, css, go, $, res, resAsync, setres}, props) {
    const prev = props.parentNoteId;
    css(`
    ComposeSigner {
        display: inline-block;
        font-variant: normal;
        margin: 10px;
        font-size: var(--fontl);
        vertical-align: middle;
    }

    ParentNote {
        display: inline-block;
        font-variant: normal;
        margin: 10px;
        font-size: var(--fontn);
        vertical-align: middle;
    }

    ComposeSigner Icon {
        color: var(--whitemedium);
    }

    ComposeSigner {
        vertical-align: super;
        color: var(--whitemedium);
    }

    ComposePage SavePlunger {
        position: absolute;
        right: 0;
        color: var(--whitemedium);
    }
   `);

    oo(PageHeading, {i:'add_comment', title:'Compose'}).onclick(() => {
        createComposeHelp(oo);
    });

    oo(PageSection, {text:'', help:true})
        .onHelpClicked(() => {
            createComposeHelp(oo);
        });

    if(prev) {
        oo('ParentNote')
            ('span', 'To: ')
            (SignerName, {noteId:prev});
        oo('br');
    }

    const textNote = oo(TextAreaInput)
        .onUpdated((value) => {
            addToCache(oo, prev, value);
            saveEnableDisable();
        });

    const DEFAULT_SIGNER_ID = oo.res(`res/cabinet/defaultsignerid`);
    const signerPanel = oo('span');
    const selectSignerIcon = signerPanel(Icon, 'manage_accounts').onclick(() => {
        oo.go('/cabinet');
    });
    const composeSigner = signerPanel('ComposeSigner');

    const saveEnableDisable = () => {
        if($(DEFAULT_SIGNER_ID) && textNote.getText()) {
            savePlunger.setEnable(true);
        } else {
            savePlunger.setEnable(false);
        }
    };
    const savePlunger = oo(SavePlunger, {ms:1000, okIcon:'send', disabledClass:'fspace'})
        .onDone(async () => {
            const
                signerId = $(DEFAULT_SIGNER_ID),
                text = textNote.getText();
            return handleSaveAsync({oo, signerId, text, prev});
        })
    ;

    composeSigner.on(DEFAULT_SIGNER_ID, async (signerId, oo) => {
            selectSignerIcon.classList({remove:'fgreen'});
            if(signerId) {
                const {data} = await oo.resAsync(`res/cabinet/signer/${signerId}`);
                oo.html(data.name);
                //renderSelected(signerId);
            } else {
                selectSignerIcon.classList({add:'fgreen'});
                oo('i', 'select a signer');
            }
            saveEnableDisable();
        });

    textNote.setText(getFromCache(oo, prev).text)
    //savePlunger.setEnable(true);
}

async function handleSaveAsync({oo, signerId, text, prev}) {
    const {res, resAsync, setres, go} = oo;
    const signer = await resAsync(`res/cabinet/signer/${signerId}`);
    let priv = await resAsync(`res/cabinet/signerpriv/${signerId}`);
    if(!priv) priv = await getPrivateKeyAsync(oo, signerId);
    if(!priv) {
        errorToast(oo, 'Aborted. No private key.', 2000);
        return false;
    }
    const pub = signer.data.pub;
    if(!pub) {
        errorToast(oo, 'Internal error', 2000);
        return false;
    }

    let lvl;
    if(prev) {
        const prevNote = await resAsync(`res/tree/node/${prev}?sort=bubble`);
        if(!prevNote) {
            console.log('TODO handle no prevNote... ');
            console.error();
            return;
        }
        lvl = prevNote.note.data.lvl + 1;
    }

    let signedNote;
    try {
        signedNote = await generateNoteAsync({text, priv, signerId, pub, prev, lvl}).catch(console.error);
        if(!signedNote) throw new Error('signedNote is falsy');
        setPrivateKey(oo, priv, signerId);
    } catch(e) {
        setPrivateKey(oo, null, signerId);
        errorToast(oo, 'Failed to send. Bad private key!', 2000);
        return false;
    }

    try {
        const noteResource = await setres('res/compose', signedNote, {save:false}).catch(console.error);
        if(!noteResource) throw new Error('noteResource is falsy');
    } catch(e) {
        errorToast(oo, 'Internal error', 2000);
        return false;
    }

    delFromCache(oo, prev);
    go('/note/' + signedNote.noteId);
}

