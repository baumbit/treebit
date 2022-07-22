import {PageHeading, PageSection, SectionPanel, SectionGroup, SectionIcon} from './../page-tugs.js';
import {createStoreList, ScrollablePage} from './../infinite-list.js';
import {BackBar} from './../bar.js';
import {toArr, friendlyDate, arrDel} from '../../../oo/utils.js';
import {generateSignerAndPrivAsync, updateSignerAsync} from '../../crypto-tree.js';
import {TextButton, TextInput, CopyableText, Icon, SavePlunger, Toggle, RadioList, RadioButton, infoToast, Modal, Secret, NumberInput} from './../tugs.js';
import {sortEnabledProtocols} from '../../common.js';
import {CabinetSigner, showSignerHelp} from './signer.js';

export function Cabinet({oo, css, go, $:{$, set}, res, setres}, {signerId, log}) {
    const SIGNERS =  res('res/cabinet/signers');
    const list = createStoreList(oo, SIGNERS,
        (oo, {signerId}) => {
            return oo(CabinetListItem, {signerId});
        },
        (data) => {
            return `/cabinet/signer/${data.signerId}`;
        },
        undefined,
        'zcabinet',
        (oo) => { // buildHeader
            oo(CabinetHeader)
            ;
        }
    );
    oo(BackBar);
};

function showCabinetHelp(oo) {
        oo(Modal)
            .add('Cabinet', 'The cabinet is a collection of signers that you can use.\nWhen a new note is created, it must be signed by a signer in order for the note to be accepted by the treebit network.\nYou may create new signers at any point in time and use any of these signers, to sign the message you create.\nThere is no public linkage between signers, hence it may be difficult for your audience to know that different notes are created by the same entity using different signers.\n')
            .add('Signer is not a user', 'On social networks it is common to conflict the user and the signer, making them one and the same entity.\nOn treebit a user is someone with access control of a node.\nA single person can run several nodes and thereby users.\nA person can create a signer and store the signer credentials on many different nodes. While the notes signed by the signer may not be present on all nodes, the user controlling the node will be able to use the signer to sign new notes.\n')
            .add('Signer', 'There is no password associated with a signer. But in order to sign a note, the signers <i>private key</i> must be used.\nThe default behaviour is to store this key on the node or on the client.')
           ;
}

function CabinetHeader({oo, css, go, $, res, setres, store}) {
    css(`
    CabinetHeader {
        width: 100%;
    }

    CabinetHeader SectionIcon Icon {
        color: var(--greenlight);
    }

    CabinetHeader PageSection SectionIcon {
        height: 35px;
    }
    `);


    oo(PageHeading, {i:'manage_accounts', title:'Cabinet'}).onclick(() => {
        showCabinetHelp(oo);
    });

    oo(PageSection, {text:'Your selected signer', help:true})
        .onHelpClicked(() => {
            showCabinetHelp(oo);
        })
        (SectionPanel)(DefaultSignerPanel)
    ;

    oo(PageSection, {text:'Create new signer', help:true})
        .onHelpClicked(() => {
            showCabinetHelp(oo);
        })
        (SectionIcon)
            (Icon, 'person_add').onclick(async () => {
                //const desc = 'No description yet.'
                //const nrls = [];
                //const profile = await oo.resAsync('res/node/profile');
                //const protocols = await oo.resAsync('res/node/preferences/protocols');
                //sortEnabledProtocols(protocols).forEach(protocol => {
                //    protocol = profile[protocol.name];
                //    if(protocol) nrls.push(protocol);
                //});

                //const {signer, priv} = await generateSignerAndPrivAsync(desc, nrls);
                //const signerId = signer.signerId;
                //await setres(`res/cabinet/signer/${signerId}`, signer);
                //await setres(`res/cabinet/signerpriv/${signerId}`, priv);
                //if($.size('res/cabinet/signer') === 1) {
                //     // this was the first signer, so set as default
                //    await setres(`res/cabinet/defaultsignerid`, signerId);
                //}
                //await res('res/cabinet/signers'); // update list
                //oo.go(`/cabinet/add/${signerId}`);
                oo.go(`/cabinet/add`);
            })
    ;

    oo(PageSection, {text:'Signers you can select'});
}

function DefaultSignerPanel({oo}) {
    oo.css(`
    DefaultSigner {
        display: grid;
        grid-template-columns: 70% 30%;
        column-gap: 5px;
        /*padding: 10px;*/
        margin: 5px;
    }

    DefaultSigner Div Center Icon {
        color: var(--whitemedium);
    }
    `);

    const onUpdated = oo.xx('onUpdated');

    let div;

    const renderSelected = (signerId) => {
        const SIGNER = oo.res(`res/cabinet/signer/${signerId}`);
        div('div')
            ('div')('b', `$${SIGNER}/data/name`)
            ._._
             ('div').style({marginTop:'25px'})('i', `$${SIGNER}/data/desc`)
        ;

        div('div')('center')
            ('div')(Icon, 'edit').onclick(() => {
                oo.go('/cabinet/signer/' + signerId);
            })
            ._._
            ('div').style({marginTop:'10px'})('span').on(`${SIGNER}/data/ms`, (ms, oo) => {
                oo.html(friendlyDate(ms));
            })
        ;
    };

    const renderNoSelected = () => {
        div('div').style({height: '40px', textAlign: 'center'})(Icon, 'error').classList({add:'fred'}).onclick(showSignerHelp);
    };

    const DEFAULT_SIGNER_ID = oo.res(`res/cabinet/defaultsignerid`);
    oo.on(DEFAULT_SIGNER_ID, (signerId) => {
        if(signerId) {
            div = oo('DefaultSigner', {replace:div});
            renderSelected(signerId);
        }
        else {
            div = oo('div', {replace:div});
            renderNoSelected();
        }
        onUpdated();
    });

}

function CabinetListItem({oo, css, res, setres}, {signerId}) {
    css(`
    CabinetListItem {
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

    const SIGNER = oo.res(`res/cabinet/signer/${signerId}`);

    const
        left = oo('div'),
        right = oo('div');
    left('div')
        ('div')('span', `$${SIGNER}/data/name`)
    ;
    left('div')('i', signerId.substring(0, 15) + '...')
    ;

    right('span').on(`${SIGNER}/data/ms`, (ms, oo) => {
        oo.html(friendlyDate(ms));
    })

}

