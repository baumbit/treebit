import {TextAreaInput, Modal, Icon, SavePlunger, infoToast} from './../tugs.js';
import {PageHeading, PageSection, SectionPanel, SectionGroup, SectionIcon} from './../page-tugs.js';
import {ScrollablePage} from './../infinite-list.js';
import * as H from './../help-texts.js';

const privateKeys = {}; // WARNING: these should ONLY be used client-side. NEVER in hotel because it could create leakage of secrets between clients.

function ScrollablePrivateKeyPage({oo, css}, {signerId, cb}) {
    css(`
        position: absolute;
        z-index: var(--zprivatekey);
        width: 100%;
        height: 100%;
        background: var(--graydark);
    `);
    oo(ScrollablePage)(PrivateKeyPage, {signerId, cb});
};

function PrivateKeyPage({oo}, {signerId, cb}) {
    oo.css(`
    PrivateKeyPage {
        display: block;
    }

    PrivateKeyInput {
        display: block;
        margin-bottom: 25px;
    }
    `);

    let privKey;

    oo(PageHeading, {i:'settings', title:'Private key'})
           .onclick(() => {showPrivKeyHelp(oo)})
    ;

    const SIGNER = oo.res(`res/cabinet/signer/${signerId}`)

    oo(PageSection, {text: '', help:true})
        .on(SIGNER, (signer, {oo}) => { console.log(signer, oo);
            oo.setText('Input private key of ' + signer.data.name);
        })
        .onHelpClicked(showPrivKeyHelp)
            (SectionGroup)
                (PrivateKeyInput, {signerId}).onDone((v) => {
                    privKey = v;
                    plunger.setEnable(true);
                })
    ;

    oo(Icon, 'cancel')
        .style({left: 0, position: 'absolute'})
        .classList({add: 'fred'})
        .onclick(() => {
            cb();
        })
    ;

    const plunger = oo(SavePlunger, {ms:500, okIcon:'send', disabledClass:'fspace'})
        .style({right: 0, position: 'absolute'})
        .onDone(() => {
            oo.timer(500, () => {
                cb(privKey);
            });
            return false;
        })
    ;
}

function showPrivKeyHelp({oo}) {
    oo(Modal)
        .add(...H.privKey)
    ;
}

function PrivateKeyInput({oo}, {signerId}) {
    const onDone = oo.xx('onDone');
    oo(TextAreaInput)
        .onUpdated((value) => {
            onDone(value);
        })
    ;
}

export function setPrivateKey(oo, privKey, signerId) {
    if(!privKey) {
        delete privateKeys[signerId];
    } else if(privateKeys[signerId] !== privKey) {
        privateKeys[signerId] = privKey;
        infoToast(oo, 'Temporarily stored private key in memory');
    }
};

export async function getPrivateKeyAsync(oo, signerId) {
    let privKey = privateKeys[signerId];
    if(!privKey) {
        let cb;
        const p = new Promise((resolve) => { cb = resolve; });
        oo = oo.context.globalProps.µ.treehutrOOt;
        const page = oo(ScrollablePrivateKeyPage, {signerId, cb});
        privKey = await p;
        page.destroy();
    }
    return privKey;
};


