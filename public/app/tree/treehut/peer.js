// TODO
//      paper mockup GUI before impl
//
//      fr:                                                         PROOF OF CONCEPT    MPV                 ADVANCED
//              text:       last message received, last sent        x
//              text:       description
//              button:     remove peer                             x
//              ping:       ping                                    x
//              input:      my own description of node                                 x
//              input:      toggle share peer or not with peers                        x
//              input:      add as a favourite (ie will alwayws get some quota)                             x
//              message:    send message to peer                                                            x
//              peers:      network nodes received from this node                                           x
//
//
import {ScrollablePage} from './infinite-list.js';
import {BackBar} from './bar.js';
import {PageHeading, PageSection, SectionPanel, SectionGroup, SectionIcon} from './page-tugs.js';
import * as H from './help-texts.js';
import OO from '../../oo/oo.js';
import {TextButton, TextInput, Modal, Icon, DeletePlunger, infoToast, clickToast, CopyableText, Toggle, EditableText} from './tugs.js';

export function Peer({oo, css}, {peerId}) { console.log(peerId);
    css(`z-index: var(--zpeer);`);
    oo(ScrollablePage)(Page, {id:peerId});
    oo(BackBar);
};

function Page({oo, css, go, $, res, setres}, {id, log}) {
    const peerPath = 'res/peer/identity/' + id;
    const infoPath = 'res/peer/info/' + id;
    const settingPath = `res/peer/setting/${id}`;
    res(peerPath, console.log);
    res(infoPath);
    res(settingPath);

    oo(PageHeading, {i:'computer', title:'Peer'})
           .onclick(() => {
                oo(Modal)
                    .add('Peer', 'This is a page detailing a node you have connected to.\nWhen two nodes connects, they become peers and begin to share data.\nSome settings can be changed and some can not.')
                ;
            })
    ;

    oo(PageSection, {help:true})
        .onHelpClicked(() => {
            console.log('TODO refactor help star text to a help-modal:star.js');
            oo(Modal)
                .add(...H.pin)
                .add(...H.score)
            ;
        })
        (SectionPanel)(InformationPanel, {id})
    ;

    oo(PageSection, {text: 'Connection', help:true})
        .onHelpClicked(() => {
            oo(Modal)
                .add(...H.shareData)
                .add(...H.sync)
                .add(...H.cn)
                .add(...H.onion)
                .add('Ping', 'You can test the connection by sending a message to the peer. You should get a message back from the peer if it is online and data sharing is on.');
            ;
        })
        (SectionPanel)
            (SectionGroup)
                ('div').classList({add:'cols2'})
                    ('div')
                    ('H1', 'Share data')
                            (Toggle)
                                .onToggle((on) => {
                                    setres(settingPath, {sync:on});
                                }).on(settingPath, ({sync}, oo) => {
                                    if(sync !== undefined) oo.setToggle(sync);
                                })
                    ._._._
                    ('div')
                         ('H1', 'Syncing')
                            (Icon, 'sync', {md:18}).on(infoPath, ({online}, oo) => {
                                oo.setClassName(online ? 'fgreen' : 'fred');
                                oo.html(online ? 'sync' : 'sync_problem');
                            }).onclick(() => {
                                console.log('TODO show error messages if there are issues');
                                return false;
                            }).style({margin: '10px', verticalAlign: 'middle'})
           ._._._._
            (SectionGroup)('H1', 'Clearnet address').on(peerPath, 'div', ({cn}, oo) => {
                if(cn) oo(CopyableText).setText(cn);
                else oo('span', '-');
            })
            ._._
            (SectionGroup)('H1', 'TOR network address').on(peerPath, 'div', ({onion}, oo) => {
                if(onion) oo(CopyableText).setText(onion);
                else oo('span', 'not available');
            })
            ._._
            (SectionGroup)('H1', 'Ping peer')(Ping, {id})
    ;

    oo(PageSection, {text: 'Peer identity', help:true})
        .onHelpClicked(() => {
            oo(Modal)
                .add('Unique identifier', 'This id is unique for this peer. It is derived from the peers public key and there should be no other peer on the Treebit network with the same id.')
                .add('Public key', 'This key is used to verify that the messages your node receives from a peer, originates from this peer.')
                .add('Encryption key', 'The encryption key is used to encrypt the messages your node sends to your peer.\nThis enables communication also on insecure channels.')
              ;
        })
        (SectionPanel)
            (SectionGroup)('H1', 'Name')('br')._._(CopyableText).on(peerPath, ({name}, oo) => oo.setText(name))
            ._._
            (SectionGroup)('H1', 'Unique identifier')('br')._._(CopyableText).on(peerPath, ({id}, oo) => oo.setText(id))
            ._._
            (SectionGroup)('H1', 'Public key')._
                (CopyableText, {size:20}).on(peerPath, ({publicKey}, oo) => oo.setText(publicKey))
            ._._
            (SectionGroup)('H1', 'Encryption key')._
                (CopyableText, {size:20}).on(peerPath, ({encryptKey}, oo) => oo.setText(encryptKey))
    ;

    createResetPeerSection(oo, peerPath);

    createDeletePeerSection(oo, peerPath);
}

function createResetPeerSection(oo, peerPath) {
    oo(PageSection, {text: 'Ask peer for a reset', help:true})
        .onHelpClicked(() => {
            oo(Modal)
                .add('Reset', 'To fascilitate proper communication between your node and the peer, the peer will do its best to remember what data it has already sent. However, if you for some reason want the peer to forget about this you can ask the peer to do a reset.\nWhen the peer does a reset, it will forget about all the data it has ever sent to you, but it will still remember all data is has received from you.')
                .add('Warning', '<span class="fred">This is an un-recoverable action</span>', {noescape:true});
        })
        (SectionIcon)(DeletePlunger, {ms:100, okIcon:'restart_alt', infoMessage:'Reset done'}).onDone(({oo}) => {
            oo.sendResAsync(peerPath+'?reset=true', {}, (result, isError) => { //L('done');
                if(isError) console.error(result);
                else {
                    oo.setEnable(false);
                    oo.timer(1000, () => {
                        oo.go.back();
                    });
                }
            });
        });
    ;
}

function createDeletePeerSection(oo, peerPath) {
    oo(PageSection, {text: 'Delete peer', help:true})
        .onHelpClicked(() => {
            oo(Modal)
                .add('Delete', '<span class="fred">Warning: This is an un-recoverable action</span>', {noescape:true});
        })
        (SectionIcon)(DeletePlunger, {ms:10000}).onDone(({oo}) => {
            oo.dropResAsync(peerPath, {addNetworkNode:true}, (result, isError) => { //L('done');
                if(isError) console.error(result);
                else {
                    oo.setEnable(false);
                    oo.timer(1000, () => {
                        oo.go.back();
                    });
                }
            });
        });
    ;
}

function InformationPanel({oo, css, res, setres}, {id}) {
    css(`
    InformationPanel {
        display: grid;
        grid-template-columns: 70% 30%;
        column-gap: 5px;
    }

    InformationPanel H1 {
        margin-bottom: 4px;
        display: block;
        font-weight: strong;
        font-variant: normal;
        font-variant: small-caps;
        font-size: var(--fontn);
    }

    InformationPanel DisplayName {
        display: block;
    }
    `);
    const infoPath = 'res/peer/info/' + id;
    const settingPath = `res/peer/setting/${id}`;

    const
        left = oo('div'),
        right = oo('div');

    left('div')('b')(DisplayName, {id})
        ._._('br')
        ._('i', `$${infoPath}/description`);


    right('div')('center')
        ('div').style({marginTop:'5px'})(Icon, 'push_pin').on(settingPath, ({pinned}, oo) => {
            if(pinned !== undefined) oo.setClassName(pinned ? 'fyellow' : 'fspace');
        }).onclick(({oo}) => {
            setres(settingPath, {pinned:!oo.$(settingPath).pinned});
            return false;
        })
        ._
        ('div').style({marginTop:'10px'})('span', `$${infoPath}/score`);
}

function Ping({oo, css}, {id}) {
    css(`
    Ping {
        display: block;
    }

    Ping Input {
        width: 80%
    }

    Ping Icon {
        vertical-align: middle;
        margin-left: 10px;
    }
    `);
    const input = oo(TextInput).onUpdated((s, oo) => {
        if(s) icon.classList({add:'fgreen'});
    });
    const icon = oo(Icon, 'send', {md:18}).onclick(() => {
        if(input.getText()) {
            oo.setres('res/ping/peer/' + id, input.getText(), {}, (data) => {
                clickToast(oo, OO.escapeHtml(data));
            });
            input.setText('');
            icon.classList({remove:'fgreen'});
        }
    });
}

function DisplayName({oo, $, css, res, setres}, {id}) {
    const peerPath = res('res/peer/identity/' + id);
    const namePath = res(`res/peer/info/${id}/displayName`);
    const settingPath = res(`res/peer/setting/${id}`);
    oo(EditableText, {text:''})
        .on(namePath, (s, oo) => {
            oo.setText(s);
        })
        .onUpdated((alias, oo) => {
            if(!alias) {
                alias = $(peerPath + '/name');
            }
            setres(settingPath, {alias}, {}, (data) => {
                infoToast(oo, 'Updated');
            });
        });
}

