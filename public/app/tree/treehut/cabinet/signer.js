import {PageHeading, PageSection, SectionPanel, SectionGroup, SectionIcon} from './../page-tugs.js';
import {createStoreList, ScrollablePage} from './../infinite-list.js';
import {BackBar} from './../bar.js';
import {toArr, friendlyDate, arrDel} from '../../../oo/utils.js';
import {generateSignerAndPrivAsync, updateSignerAsync} from '../../crypto-tree.js';
import {warningToast, TextAreaInput, DeletePlunger, TextButton, TextInput, CopyableText, Icon, SavePlunger, Toggle, RadioList, RadioButton, infoToast, errorToast, Modal, Secret, NumberInput} from './../tugs.js';
import {sortEnabledProtocols} from '../../common.js';
import {getPrivateKeyAsync, setPrivateKey} from './private-key.js';

export function CabinetSigner({oo}, props) {
    oo.css(`z-index: var(--zcabinetsigner);`);
    oo(ScrollablePage)(Page, props);
    oo(BackBar, {active:'node'});
};


function Page({oo, res}, {signerId}) {
    const SIGNER = res(`res/cabinet/signer/${signerId}`);

    const DEFAULT_SIGNER_ID = res('res/cabinet/defaultsignerid');
    let isDefaultSigner;

    oo(PageHeading, {i:'person', title:'Signer'}).onclick(showSignerHelp);

    const selectText = 'Set as selected signer';
    const selectedText = 'This is your selected signer';
    oo(PageSection, {text: selectText, help:true})
        .onHelpClicked(showSignerHelp)
        (SectionIcon)(Icon, 'star')
            .on(DEFAULT_SIGNER_ID, (defaultSignerId, oo) => {
                isDefaultSigner = defaultSignerId === signerId;
                if(isDefaultSigner) {
                    oo._._.setText(selectedText);
                    oo.classList({add:'fyellow'});
                } else {
                    oo._._.setText(selectText);
                    oo.classList({remove:'fyellow'});
                }
            })
            .onclick(async () => {
                if(isDefaultSigner) {
                    oo.setres(DEFAULT_SIGNER_ID, false);
                } else {
                    oo.setres(DEFAULT_SIGNER_ID, signerId);
                }
             })
    ;

    createPublicProfileSection(oo, signerId);

    createNrlSection(oo, signerId);

    createUrlSection(oo, signerId);

    oo(PageSection, {text: 'Identity', help:true})
        .onHelpClicked(showSignerHelp)
        (SectionPanel)
           (SectionGroup)('H1', 'Signer id')('br')._._
                (CopyableText, {size:20}).on(SIGNER + '/signerId', (id, oo) => oo.setText(id))._._
           (SectionGroup)('H1', 'Public  key')('br')._._
                (CopyableText, {size:20}).on(SIGNER + '/data/pub', (key, oo) => oo.setText(key))
            ._._
            (SectionGroup)('H1', 'Private key')('span', 'secret').style({marginLeft: '10px'}).style({color:'var(--orangelight)'})('br')._._._
                (Secret, {text: 'Click to reveal'})
                    .onReveal(({oo}) => {
                        // downloading priv key is delayed here untill actively choosing to do so
                        // TODO ensure it it not cached in store
                        const SIGNERPRIV = oo.res(`res/cabinet/signerpriv/${signerId}`);
                        oo._(CopyableText, {size:20, secret:true}).on(SIGNERPRIV, (key, oo) => oo.setText(key));
                    })
            ._._
    ;

    createUpdatedSection(oo, SIGNER);

    createDeleteSignerSection(oo, SIGNER);
}

function createUpdatedSection({oo}, SIGNER) {
    oo(PageSection, {text: 'Last updated', help:true})
        .onHelpClicked(showSignerHelp)
        (SectionPanel)
            (SectionGroup)('H1', 'Date')('br')._._
                ('span').on(SIGNER + '/data/ms', (ms, oo) => oo.html(friendlyDate(ms)))
            ._._
            (SectionGroup)('H1', 'Signature')('br')._._
                (CopyableText, {size:20}).on(SIGNER + '/signature', (key, oo) => oo.setText(key))
   ;
}

function createUrlSection({oo}, signerId) {
    const SIGNER = oo.res(`res/cabinet/signer/${signerId}`);
    const SIGNER_URLS = oo.res(`${SIGNER}/data/urls`);
    let signerUrls;

    const renderUrls = (urls) => {
        urlsDiv.clear();
        signerUrls = urlsDiv(SignerUrls, {urls});
        signerUrls.onUpdated((urls) => {
            updateAddIcon(urls);
            savePlunger.setData(urls);
        });
    };

    const updateAddIcon = (urls) => {
        // TODO pick max elngth from norm.js
        if(urls.length > 3) addIcon.setEnable(false);
        else addIcon.setEnable(true, 'fgreen');
     };

    const urlsDiv = oo(PageSection, {text: 'Urls', help:true})
        .onHelpClicked(showSignerUrlsHelp)
        (SectionPanel)('div');

    const controlsDiv = urlsDiv._('div').classList({add:'cols2'}).style({marginTop: '15px'});
    const addIcon = controlsDiv('span')(Icon, 'add')
                .onClicked(() => {
                    signerUrls.addUrl('');
                });
    const savePlunger = controlsDiv('span').style({textAlign: 'right'})(SavePlunger, {ms:1000})
              .onDone(async () => {
                  const urls = savePlunger.getData();
                  return handleSignerUpdateAsync({oo, signerId, urls});
              })
    ;

    urlsDiv.on(SIGNER_URLS, true, ({each}, oo) => {
        if(!savePlunger.getData()) { // only update if data has not been edited
            const urls = [];
            each(url => urls.push(url));
            renderUrls(urls);
            updateAddIcon(urls);
        }
    });
}

function createNrlSection({oo}, signerId) {
    const SIGNER = oo.res(`res/cabinet/signer/${signerId}`);
    const SIGNER_NRLS = oo.res(`${SIGNER}/data/nrls`);
    let signerNrls;

    const renderNrls = (nrls) => {
        nrlsDiv.clear();
        signerNrls = nrlsDiv(SignerUrls, {urls:nrls});
        signerNrls.onUpdated((nrls) => {
            updateAddIcon(nrls);
            savePlunger.setData(nrls);
        });
    };

    const updateAddIcon = (nrls) => {
        // TODO pick max elngth from norm.js
        if(nrls.length > 3) addIcon.setEnable(false);
        else addIcon.setEnable(true, 'fgreen');
     };

    const nrlsDiv = oo(PageSection, {text: 'Node nrls', help:true})
        .onHelpClicked(showSignerNrlsHelp)
        (SectionPanel)('div');

    const controlsDiv = nrlsDiv._('div').classList({add:'cols2'}).style({marginTop: '15px'});
    const addIcon = controlsDiv('span')(Icon, 'add')
                .onClicked(() => {
                    signerNrls.addUrl('');
                });
    const savePlunger = controlsDiv('span').style({textAlign: 'right'})(SavePlunger, {ms:1000})
              .onDone(async () => {
                  const nrls = savePlunger.getData();
                  return handleSignerUpdateAsync({oo, signerId, nrls});
              })
    ;

    nrlsDiv.on(SIGNER_NRLS, true, ({each}, oo) => {
        if(!savePlunger.getData()) { // only update if data has not been edited
            const nrls = [];
            each(nrl => nrls.push(nrl));
            renderNrls(nrls);
            updateAddIcon(nrls);
        }
    });
}

function SignerUrls({oo}, {urls}) {
    const onUpdated = oo.xx('onUpdated');

    const render = () => {
        oo.clear();
        urls.forEach((url, index) => {
            oo(SignerUrl, {url})
                .onDeleted(() => {
                    urls.splice(index, 1);
                    render();
                    onUpdated(urls);
                })
                .onUpdated((url) => {
                    urls[index] = url;
                    onUpdated(urls, oo);
                });
        });
    };

    oo.x([
        function addUrl(s) {
            urls.push(s);
            render();
            onUpdated(urls, oo);
        }
    ]);

    render();
}

function SignerUrl({oo}, {url}) {
    oo.css(`
    SignerUrl Input {
        width: 85%;
        margin-right: 15px;
    }

    SignerUrl Icon {
        vertical-align: middle;
        color: var(--redlight);
    }
    `);
    const onDeleted = oo.xx('onDeleted');
    const onUpdated = oo.xx('onUpdated');
    oo(TextInput, {text:url})
        .onUpdated((text) => {
            if(!text) onDeleted(oo);
            else onUpdated(text);
        });
    oo(Icon, 'delete_forever', {md:18})
        .onclick(() => {
            onDeleted(url, oo);
        });
}

async function handleSignerUpdateAsync({oo, signerId, data, urls, nrls}) {
    let priv = await oo.resAsync(`res/cabinet/signerpriv/${signerId}`);
    if(!priv) priv = await getPrivateKeyAsync(oo, signerId);
    if(!priv) {
        errorToast(oo, 'Aborted. No private key.', 2000);
        return false;
    }
    const SIGNER = oo.res(`res/cabinet/signer/${signerId}`);
    let signer = oo.$(SIGNER);
    signer = await updateSignerAsync({priv, signer, data, urls, nrls}).catch(console.error);
    if(!signer) {
        setPrivateKey(oo, null, signerId);
        errorToast(oo, 'Failed to save. Bad key!');
        return false;
    }
    setPrivateKey(oo, priv, signerId);
    await oo.setres(SIGNER, signer);
}

function createPublicProfileSection({oo}, signerId) {
    const SIGNER = oo.res(`res/cabinet/signer/${signerId}`);

    const savePlunger = oo(PageSection, {text:'Public profile', help:true})
        .onHelpClicked(showSignerHelp)
        (SectionPanel)
            //(SectionGroup)('span', 'Last updated')('span', `$${SIGNER + '/data/ms'}`)
            (SectionGroup)('H1', 'Name')(TextInput, {path: SIGNER + '/data/name'})
                .onUpdated((v) => savePlunger.add('name', v))._._._
             (SectionGroup)('H1', 'Description')(TextInput, {path: SIGNER + '/data/desc'})
                .onUpdated((v) => savePlunger.add('desc', v))._._._
            //(SectionGroup)('H1', 'Tag')(TextInput, {path: 'res/node/profile/tag'})
            //    .onUpdated((tag) => info.set({tag}))._._._
            ('div', {style:{textAlign:'right'}})(SavePlunger, {ms:1000})
                .onDone(async (data) => handleSignerUpdateAsync({oo, signerId, data}))
    ;
}

function createDeleteSignerSection(oo, signerPath) {
    oo(PageSection, {text: 'Delete signer', help:true})
        .onHelpClicked(() => {
            oo(Modal)
                .add('Delete', '<span class="fred">Warning: This is an un-recoverable action</span>', {noescape:true});
        })
        //(SectionIcon)(DeletePlunger, {ms:10000})
        (SectionIcon)(DeletePlunger, {ms:10000})
            .onevent('click', () => {
                warningToast(oo, 'Deleting signer in 10 seconds');
            })
            .onDone(async ({oo}) => {
                const result = await oo.dropResAsync(signerPath);
                // reflect changes in gui
                await oo.resAsync(`res/cabinet/defaultsignerid`);
                await oo.resAsync('res/cabinet/signers');
                // nav back
                oo.setEnable(false);
                oo.timer(1000, () => {
                    oo.go.back();
                });
            });
    ;
}

export function showSignerHelp({oo}) {
    oo(Modal)
        .add('Signer', 'To create a note, a signer must be selected.\nTo be propagated on the Treebit, a note needs to be signed by a signer.\nWhile its possible for a signer to sign any type of text, you can think of the signer as an author or creator of a note. This means that even if someone signs a note, it does not mean that they own or created the content of the note. Also it does not prevent someone from copying the text, pasting it into a new note and sign it.')
        .add('Signature', 'Using the note signature it is possible to prove that several different notes are signed by the same signer.\nThis makes it possible to create a links between notes and signers. This is also how you can know that someone you follow created a note. Even if there is no central server keeping track of everyone, this signature proves that it was this particular signed who signed the note.')
       ;
};

function showSignerNrlsHelp({oo}) {
    oo(Modal)
        .add('Signer node urls', 'A signer may provide a set of node urls, on which content from the signer can be downloaded.')
       ;
}

function showSignerUrlsHelp({oo}) {
    oo(Modal)
        .add('Signer Urls', 'A signer may provide a set of endpoints and thereby announce computer resources to the world.')
        .add('What is an endpoint?', 'An endpoint is a remote computing device that communicates back and forth with a network to which it is connected. An example could be an application programming interface (API) to an online store.')
        .add('What protocols are supported?', 'You can write any string that you want. The only limit is length (and number of different) endpoints.')
       ;
}

