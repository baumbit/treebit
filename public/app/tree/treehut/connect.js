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
import {TreenetBar} from './bar.js';
import {PageHeading, PageSection, SectionPanel, SectionGroup} from './page-tugs.js';
import * as H from './help-texts.js';
import OO from '../../oo/oo.js';
import {Modal, Icon, errorToast, infoToast, EditableText} from './tugs.js';

const TIMEOUT_COUNT = 30; // 1 count eq. 1 sec


export function Connect({oo, css}, {nodeAddress}) { console.log({nodeAddress});
    nodeAddress = nodeAddress && decodeURIComponent(nodeAddress);
    css(`z-index: var(--zconnect);`);
    oo(ScrollablePage)(Page, {nodeAddress});
    oo(TreenetBar, {active:'connect'});
};

function Page({oo, css, go, $, res, setres}, {nodeAddress}) {
    if(nodeAddress === 'blank') nodeAddress = null;

    oo(PageHeading, {i:'add_circle', title:'Connect'})
           .onclick(() => {
                oo(Modal)
                    .add('Connect', 'Provides the means to connect to a new node.\nWhen a new node is connected, it is referred to as peer.')
                ;
            })
    ;

    const connectButton = oo(PageSection, {help:true})
        .onHelpClicked(() => {
            oo(Modal)
                // TODO
                //.add(...H.star)
                //.add(...H.score)
            ;
        })
        (SectionPanel)
            (SectionGroup)
                (ConnectControl, {nodeAddress})
                    .onUpdated((address, id) => {
                        connectButton.setAddress(address);
                        if(id) connectButton.setId(id);
                    })
                ._
                ('div', {style:{textAlign:'right'}})(ConnectButton)
                    .onSuccess((id) => {
                        infoToast(oo, 'Peer added');
                        oo.timer(2000, () => {
                            oo.go('/peer/' + id);
                        });
                    })
                    .onError((s) => {
                        errorToast(oo, s);
                    })
    ;
}

export function ConnectButton({oo, sendResAsync}, {url, nrl, id}) {
    oo.css(`
    ConnectButton Icon {
        display: inline-block;
        color: var(--grayspace);
    }
    `);
    const
        onUpdated = oo.xx('onUpdated'),
        onSuccess = oo.xx('onSuccess'),
        onError = oo.xx('onError');
    let deleteTracker;

    const reset = () => {
        if(deleteTracker) deleteTracker();
        deleteTracker = null;
        if(nrl || url) icon.classList({add:'fgreen'});
        else icon.classList({remove:'fgreen'});
        icon.html('add_circle')
        icon.style({transform: 'rotate(0deg)', transition:'all 0s'});
    };

    const notifyError = (s='Failed to connect') => {                            //console.log('------notifyError');
        reset();
        onError(s, oo);
    };

    const notifySuccess = (peerId) => {                                         //console.log('-------notifySuccess', peerId);
        reset();
        onSuccess(peerId, oo);
    };

    const stopProgress = async () => {                                          //console.log('--------stopProgress', {id});
        if(id) {
            try {
                const {publicKey} = await oo.resAsync('res/peer/identity/' + id);
                if(publicKey) {
                    onSuccess(id);
                    return;
                }
            } catch(e) {
                console.log(e);
            }
        }
        notifyError('Unable to connect');
    };

    const updateProgress = (trackerId, cnt=0) => {
        icon.style({transform: 'rotate(360deg)', transition:'all 1s'});
        cnt++;
        if(cnt >= TIMEOUT_COUNT) {
            stopProgress();
            return;
        }
        deleteTracker = oo.timer(1000, async () => {
            icon.style({transform: 'rotate(0deg)', transition:'all 0s'});
            const
                {data} = await sendResAsync('res/network/connect/tracker/' + trackerId),
                {isExists, isSuccess, isError, updated, profile} = data;
            if(!isExists) stopProgress(trackerId);
            else if(isError) notifyError();
            else if(isSuccess) notifySuccess(profile.id);
            else if(onUpdated(data, oo) !== false) updateProgress(trackerId, cnt);
        });
    };

    const icon = oo(Icon, 'add_circle')
        .onclick(async () => {
            if(!nrl && !url) return false;
            reset();

            icon.classList({remove:'fgreen'})
            icon.html('rotate_right')

            let data;
            try {
                data = (await sendResAsync('res/network/connect/to', {url, nrl, id})).data;  //console.log({data});
            } catch(e) {
                console.error(e);
            }
            const  {trackerId, isExists, isError} = data;
            if(!isExists || isError || !trackerId) {
                notifyError();
                return;
            }
            updateProgress(trackerId);
        });

    oo.x([
        function setNrl(o) {
            nrl = o;
            reset();
        },
        function setAddress(s) {
            url = s;
            reset();
        },
        function setId(s) {
            id = s;
        }
    ]);

    reset();
};

function ConnectControl({oo}, {nodeAddress, nodeId}) {
    oo.css(`
    AddressControl {
    }

    AddressControl Icon {
        vertical-align: middle;
        margin: 5px;
    }
    `);

    const onUpdated = oo.xx('onUpdated');

    const notifyUpdated = () => {
        return onUpdated(nodeAddress, nodeId, oo);
    };

    oo('div')(EditableText, {text:nodeAddress, edit:!nodeAddress, hint:'Enter address', clipboard:true, qrcode:true})
        .onUpdated((s, oo) => {
            nodeAddress = s;
            return notifyUpdated();
        })
    ;

    oo('div')(EditableText, {text:nodeId, edit:!nodeId, hint:'Node id (optional)', clipboard:true, qrcode:true})
        .onUpdated((s, oo) => {
            nodeId = s;
        })
    ;
}

export async function handleInvitesAsync(oo, µ) {
    let url = await popInviteAsync(µ);
    if(url) {

        const updateProgress = (trackerId, cnt=0) => {
            cnt++;
            if(cnt >= TIMEOUT_COUNT) {
                return;
            }
            oo.timer(1000, async () => {
                const
                    {data} = await oo.sendResAsync('res/network/connect/tracker/' + trackerId),
                    {isExists, isSuccess, isError, updated, profile} = data;
                if(!isExists || isError) {
                    errorToast(oo, 'Invitation handling failed. You must add node manually!');
                } else if(isSuccess) {
                    infoToast(oo, 'Invite handled and peer added');
                } else {
                    updateProgress(trackerId, cnt);
                }
            });
        };

        oo.timer(2000, async () => {
            let data = {};
            try {
                data = (await oo.sendResAsync('res/network/connect/to', {url})).data;  //console.log({data});
            } catch(e) {
                console.error(e);
            }
            const {trackerId, isExists, isError} = data;
            if(!isExists || isError || !trackerId) {
                errorToast(oo, 'Invitation handling failed. You must add node manually!');
                return;
            }

            updateProgress(trackerId, 10);
        });
    }
};

export async function addInviteAsync(µ, invite) {
    if(invite) {
        const store = µ.clientStorage.get('invite');
        const arr = await store.getAsync('invites') || [];
        arr.push(invite); //console.log({invite, arr});
        store.setAsync('invites', arr);
    }
};

export async function popInviteAsync(µ) {
    const store = µ.clientStorage.get('invite');
    const arr = await store.getAsync('invites') || [];
    const invite = arr.pop(); //console.log({invite});
    store.setAsync('invites', arr); //console.log('after set', store.getAsync('invites')); alert('asd');
    return invite;
};

