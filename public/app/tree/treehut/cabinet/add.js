import {PageHeading, PageSection, SectionPanel, SectionGroup, SectionIcon} from './../page-tugs.js';
import {createStoreList, ScrollablePage} from './../infinite-list.js';
import {BackBar} from './../bar.js';
import {toArr, friendlyDate, arrDel} from '../../../oo/utils.js';
import {generateSignerAndPrivAsync, updateSignerAsync} from '../../crypto-tree.js';
import {DeletePlunger, TextButton, TextInput, CopyableText, Icon, SavePlunger, Toggle, RadioList, RadioButton, infoToast, warningToast, Modal, Secret, NumberInput} from './../tugs.js';
import {sortEnabledProtocols} from '../../common.js';
import * as H from '../help-texts.js';
import {setPrivateKey} from './private-key.js';

export function CabinetAdd({oo}, props) {
    oo.css(`z-index: var(--zcabinetsigner);`);
    oo(ScrollablePage)(Page, props);
    oo(BackBar, {active:'node'});
};

async function generateSignerAsync(oo, cb) {
    const desc = 'No description yet.'
    const nrls = [];
    const profile = await oo.resAsync('res/node/profile');
    const protocols = await oo.resAsync('res/node/preferences/protocols');
    sortEnabledProtocols(protocols).forEach(protocol => {
        protocol = profile[protocol.name];
        if(protocol) nrls.push(protocol);
    });
    const o = await generateSignerAndPrivAsync(desc, nrls);
    cb(o);
}

function Page({oo, res, setres, $}, {}) {
    oo(PageHeading, {i:'person', title:'Add signer'});//.onclick(showSignerHelp);

    let data = {
        signer: null,
        priv: null,
        storePrivOnServer: null
    };

    const update = () => { //console.log('data', {...data});
        if(data.priv && data.storePrivOnServer === false) {
            privateKeySecret.setReveal();
        }

        if(data.signer && data.storePrivOnServer !== null) {
            savePlunger.setEnable(true);
        } else {
            savePlunger.setEnable(false);
        }
    };

    oo(PageSection, {text: 'Backup private key on server?', help:true})
        .onHelpClicked(showPrivKeyHelp)
        (ConfigurePrivStorage).onStoreOnServer((v) => {
            data.storePrivOnServer = v;
            update();
        })
    ;

    const privateKeySecret = oo(PageSection, {text:'Private key', help:true})
        .onHelpClicked(showPrivKeyHelp)
        (SectionPanel)
            (SectionGroup)
                (Secret, {text: 'Click to reveal'})
                .onReveal(({oo}) => {
                    const copyableText = oo._(CopyableText, {size:20, secret:true});
                    copyableText.setText(data.priv);
                })
    ;

    const savePlunger = oo(PageSection, {text: 'Save and upload signer', help:false})
        (SectionIcon)(SavePlunger, {ms:1000})
            .onDone(async () => {
                const {signer, priv} = data;
                const {signerId} = signer;
                await setres(`res/cabinet/signer/${signerId}`, signer);
                if(data.storePrivOnServer) {
                    await setres(`res/cabinet/signerpriv/${signerId}`, priv);
                } else {
                    setPrivateKey(oo, priv, signerId);
                }
                if($.size('res/cabinet/signer') === 1) {
                     // this was the first signer, so set as default
                    await setres(`res/cabinet/defaultsignerid`, signerId);
                }
                await res('res/cabinet/signers'); // update list
                oo.go(`/cabinet/signer/${signerId}`);
            })
    ;

    generateSignerAsync(oo, ({signer, priv}) => {
        data.signer = signer;
        data.priv = priv;
        update();
    });
}

function ConfigurePrivStorage({oo}) {
    const ms = 1000;
    oo.css(`
    ConfigurePrivStorage {
        margin-top: 15px;
        width: 100%;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        column-gap: 40px;
    }

    ConfigurePrivStorage Icon {
        text-align: center;
    }
    `);

    const onStoreOnServer = oo.xx('onStoreOnServer');

    let upClicked, downClicked;

    const
        select = (oo, colorClass, b) => {
            oo.classList({remove:'pulsate'});
            oo.classList({remove:'fspace'});
            oo.classList({remove:colorClass});
            onStoreOnServer(b);
        },
        deselect = (oo, colorClass) => {
            oo.classList({remove:'pulsate'});
            oo.classList({remove:colorClass, add:'fspace'});
        };

    const upIcon = oo(Icon, 'thumb_up')
        .classList({add: 'fgreen'})
        .classList({add: 'pulsate'})
        .onclick(() => {
            select(upIcon, 'fgreen', true);
            deselect(downIcon, 'fred');
            if(!upClicked) infoToast(oo, 'Will backup key to server', 3000);
            upClicked = true;
        })
    ;

    const downIcon = oo(Icon, 'thumb_down')
        .classList({add: 'fred'})
        .classList({add: 'pulsate'})
        .onclick(() => {
            select(downIcon, 'fred', false);
            deselect(upIcon, 'fgreen');
            if(!downClicked) warningToast(oo, 'Make backup of private key NOW', undefined, true);
            downClicked = true;
        })
    ;

}

export function showPrivKeyHelp({oo}) {
    oo(Modal)
        .add(...H.privKey)
        .add('Should I backup the private key on server?', 'If you decide to store the private key on the server, then whoever controls the server, can also obtain your private key and use it to impersonate you! However if you do not store it on the server, you have to write it down on a piece of paper and/or store it on another machine which might be just as unsafe and also introduces friction. If you are running your own server and it is secure, it should be safe to store it there.');
    ;
};



















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
              .onDone(async (data) => {
                  const priv = await oo.resAsync(`res/cabinet/signerpriv/${signerId}`);
                  let signer = oo.$(SIGNER);
                  let urls = savePlunger.getData();
                  signer = await updateSignerAsync({priv, signer, urls}).catch(console.error);
                  oo.setres(SIGNER, signer);
              });

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
              .onDone(async (data) => {
                  const priv = await oo.resAsync(`res/cabinet/signerpriv/${signerId}`);
                  let signer = oo.$(SIGNER);
                  let nrls = savePlunger.getData();
                  signer = await updateSignerAsync({priv, signer, nrls}).catch(console.error);
                  oo.setres(SIGNER, signer);
              });

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
                .onDone(async (data) => {
                    const priv = await oo.resAsync(`res/cabinet/signerpriv/${signerId}`);
                    let signer = oo.$(SIGNER);
                    signer = await updateSignerAsync({priv, signer, data}).catch(console.error);
                    oo.setres(SIGNER, signer);
                });
}

function createDeleteSignerSection(oo, signerPath) {
    oo(PageSection, {text: 'Delete signer', help:true})
        .onHelpClicked(() => {
            oo(Modal)
                .add('Delete', '<span class="fred">Warning: This is an un-recoverable action</span>', {noescape:true});
        })
        //(SectionIcon)(DeletePlunger, {ms:10000})
        (SectionIcon)(DeletePlunger, {ms:2000})
            .onevent('click', () => {
                infoToast(oo, 'Attention: deleting signer. Abort?');
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

