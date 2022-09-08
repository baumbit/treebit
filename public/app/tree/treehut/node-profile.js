import {ScrollablePage} from './infinite-list.js';
import {Bar, TreenetBar} from './bar.js';
import {Share} from './share.js';
import {PageHeading, PageSection, SectionPanel, SectionGroup} from './page-tugs.js';
import {TextButton, TextInput, CopyableText, Icon, SavePlunger, Toggle, RadioList, RadioButton, infoToast, Modal, Secret, NumberInput} from './tugs.js';

export function NodeProfile({oo, css}, {}) {
    css(`z-index: var(--znodeprofile);`);
    oo(ScrollablePage)(Page);
    oo(TreenetBar, {active:'node'});
};

function ShareNode({oo, css, $}, {}) {
    css(`
    Modal Textarea {
        height: 200px;
    }
    `);

    oo(Icon, 'share').onclick(() => {
        oo(Share);
    });
}

function ProtocolControl({oo, on, $, res, setres}, {text, path, protocol}) {
    //oo.css(`
    //ProtocolControl RadioButton {
    //    margin-right: 20px;
    //}
    //`);
    const PROTOCOLS = 'res/node/preferences/protocols';
    const onUpdated = oo.xx('onUpdated');

    oo('span', protocol === 'cn' ? 'Clearnet' : 'Tor').style({marginLeft: '10px', fontVariant: 'small-caps'});

    const div = oo('div').style({marginLeft:'20px'});
    const address = div(CopyableText, {size:24, expanded:false});
    div('br');

    const toggle = div('span', 'Share data with peer').style({marginLeft:'10px'})(Toggle)
        .onToggle((on) => {
            const
                list = $(PROTOCOLS) || [],
                p = list.find(o => o.name === protocol);
            if(!p) throw new Error(`protocol(${protocol}) not returned from server`);
            p.enabled = on;
            setres(PROTOCOLS, list);
        });


    const update = () => {
        const
            obj = $(path) || {},
            s = obj[protocol],
            isAddress = !!s,
            list = $(PROTOCOLS) || [],
            p = list.find(o => (o && o.name === protocol)),
            isEnabled = p && p.enabled;

        toggle.setToggle(isEnabled);
        toggle.setEnable(isAddress);

        address.setText(isAddress ? s : text);
        address.setEnable(isAddress);

        if(isAddress) oo.classList({remove:'disable'});
        else oo.classList({add:'disable'});

        onUpdated(isAddress);
    };

    res(PROTOCOLS);
    res(path);
    on(path, update);
    on(PROTOCOLS, update);
}

function ProtocolList({oo, css, $, res, setres}) {
    // XXX this list right now only handles 2 different options, but is written
    // in a way where it should be easy to re-write it to handle N-number of different protocols.
    // radioList would have to be changed to arrows up/down
    const PROTOCOLS = 'res/node/preferences/protocols';

    css(`
    ProtocolList Icon {
        vertical-align: middle;
        /*color: #f0f;*/
    }

    ProtocolList RadioList RadioButton {
        margin-top: 10px;
    }

    ProtocolList .disable {
        /*visibility: hidden;*/
        color: var(--grayspace);
    }
   `);

    const
        path = 'res/node/profile';

    const
        cn = {isEnabled:false, protocol:'cn'},
        onion = {isEnabled:false, protocol:'onion'},
        updateProtocol = ({isEnabled, protocol}) => {
            if(!isEnabled) return;
            let list = $(PROTOCOLS) || [];
            list = list.map(o => {
                if(o.name === protocol) o.priority = 1;
                else o.priority = 2;
                return o;
            });
            setres(PROTOCOLS, list); //console.log('setres', list);
        };

    const list = oo(RadioList);

    const
        cnRadio = list(RadioButton, {protocol:cn})
            .onclick(({oo}) => {
                updateProtocol(cn);
            }),
        cnCtrl = cnRadio(ProtocolControl, {text:'Clearnet not available', path, protocol:'cn'})
            .onUpdated((isEnabled) => {
                cnRadio.setEnable(isEnabled);
                cn.isEnabled = isEnabled;
            });
    const
        onionRadio = list(RadioButton, {protocol:onion})
            .onclick(({oo}) => {
                updateProtocol(onion);
            }),
        onionCtrl = onionRadio(ProtocolControl, {text:'not available', path, protocol: 'onion'})
            .onUpdated((isEnabled) => {
                onionRadio.setEnable(isEnabled);
                onion.isEnabled = isEnabled;
            });

    let preferredProtocol; // = null; // remove comment to test toast
    oo.on(PROTOCOLS, (protocols) => {
        protocols.forEach(({priority, name}) => {
            if(priority === 1) {
                if(name === 'cn') cnRadio.select();
                else if(name === 'onion') onionRadio.select();

                if(preferredProtocol !== undefined && preferredProtocol !== name) infoToast(oo, 'Preferred Procotol Updated');
                preferredProtocol = name;
            }
        });
    });
}
function Upload({oo, setres}) {
    oo.css(`
    `);
    const path = oo.res('res/node/uploadmanager');
    oo(SectionGroup)('span', 'Enabled')
        (Toggle)
            .on(path, ({running}, oo) => { oo.setToggle(running); })
            .onToggle(running => setres(path, {running}))
    ;

}

function Preferences({oo, css, res, setres}) {
    css(`
    Preferences Icon {
        vertical-align: middle;
        margin-left: 10px;
    }
    `);
    const uploadManagerPrefencePath = res('res/node/preferences/uploadmanager');

    let preferences = {};
    const set = (o) => {
        preferences = {
            ...preferences,
            ...o
        };
        savePlunger.setEnable(true);
    };
    ;

    oo(SectionGroup)('span', 'Total upload quota, shared by all peers')
        ('span')(NumberInput, {number:0, floor:0, add:1024, subtract:1024})
            .on(uploadManagerPrefencePath, ({uploadQuota}, oo) => {
                oo.setNumber(uploadQuota);
            })
            .classList({add: 'fgreen'})
            .onUpdated((uploadQuota) => {
                set({uploadQuota});
            })
            ._('span', 'bytes.')
    ;

    oo(SectionGroup)('span', 'Replenish download quota for all peers after')
        ('span')(NumberInput, {number:0, floor:0})
            .on(uploadManagerPrefencePath, ({timeslotDurationMs}, oo) => {
                oo.setNumber(Math.floor((timeslotDurationMs / 1000) / 60));
            })
            .classList({add: 'fgreen'})
            .onUpdated((number) => {
                set({timeslotDurationMs: number * 1000 * 60});
            })
            ._('span', 'minutes.')
    ;

    oo(SectionGroup)('span', 'Auto start when node starts')
        (Toggle)
            .on(uploadManagerPrefencePath, ({autoStart}, oo) => { oo.setToggle(autoStart); })
            .onToggle(autoStart => set({autoStart}))
    ;

    oo(SectionGroup)('span', 'Delay start by')
        ('span')(NumberInput, {number:0, floor:0})
            .on(uploadManagerPrefencePath, ({delayStartMs}, oo) => {
                oo.setNumber(delayStartMs / 1000);
            })
            .classList({add: 'fgreen'})
            .onUpdated((number) => {
                set({delayStartMs: number * 1000});
            })
            ._('span', 'seconds.')
    ;

    let savePlunger = oo('div', {style:{textAlign:'right'}})(SavePlunger, {ms:1000}).onDone(() => {
        setres(uploadManagerPrefencePath, preferences);
    });
}

function Page({oo, css, go, $, res, setres}, {log}) {
    const path = 'res/node/profile';
    res(path);

    oo(PageHeading, {i:'hub', title:'Node'}).onclick(() => {
        oo(Modal)
            .add('Node', 'This is the settings page for your node.\nWhen two nodes connects, they become peers and begin to share data.\nSome settings can be changed and some can not.')
           ;
    });

    oo(PageSection, {text:'Node can be reached on', help:true})
        .onHelpClicked(() => {
            oo(Modal)
                .add('Node address', 'To be able to share data with a peer, a node has to be online and reachable on the same network as its peer.')
                .add('TOR', 'The default behaviour of a node, is to use the TOR network.')
                .add('Clearnet', 'A node can also be made reachable on clearnet.')
                .add('Connecting to nodes', 'Share the network address with friends, so they can add you as a peer.')
              ;
        })
        (SectionPanel)(ProtocolList)._
            ('div', {style:{textAlign:'right'}})(ShareNode);

    oo(PageSection, {text:'Data sharing', help:true})
        .onHelpClicked(() => {
            oo(Modal)
                .add('Data sharing', 'Must be turned on to share data with peers.')
              ;
        })
        (SectionPanel)(Upload)
    ;

    const infoSavePlunger = oo(PageSection, {text: 'Human friendly information', help:true})
        .onHelpClicked(() => {
            oo(Modal)
                .add('Discretionary data', 'While this data is friendly for humans to read, it can also be used to spoof the identity of others.\nYou should NOT use this information for identifying the identity of a node.')
                .add('Name', 'Human readable name.')
                .add('Description', 'Brief description of the node.')
                .add('Tag', 'Separate tags with a blank space.')
              ;
        })
        (SectionPanel)
            (SectionGroup)('H1', 'Name of the node')(TextInput, {path: 'res/node/profile/name'})
                .onUpdated((name) => infoSavePlunger.add('name', name))._._._
            (SectionGroup)('H1', 'Node description')(TextInput, {path: 'res/node/profile/description'})
                .onUpdated((description) => infoSavePlunger.add('description', description))._._._
            (SectionGroup)('H1', 'Tag')(TextInput, {path: 'res/node/profile/tag'})
                .onUpdated((tag) => infoSavePlunger.add('add', tag))._._._
            ('div', {style:{textAlign:'right'}})(SavePlunger, {ms:1000})
                .onClickedAsync((data) => {
                    setres(path, data);
                });

    oo(PageSection, {text:'Settings', help:true})
        .onHelpClicked(() => {
            oo(Modal)
                //.add('Connecting to nodes', 'Share the network address with friends, so they can add you as a peer.')
              ;
        })
        (SectionPanel)
            (SectionGroup)
                (Preferences)
    ;

    oo(PageSection, {text: 'Node identity', help:true})
        .onHelpClicked(() => {
            oo(Modal)
                .add('Unique identifier', 'If the node moves to a new location (URL) it can be used to identify the node. The key is derived from the <i>public key</i>.')
                .add('Why keys?', 'The encrypt/decrypt keys makes it possible for nodes to talk using insecure channels. The public/private keys are used for verification that the node identity is still the same.')
                .add('Private key', 'Used for signing messages, to prove which node sent it.\n<span class="fred">Warning</span>: Do NOT share the private key with anyone. It can be used to be pretend to be you!', {noescape:true})
                .add('Public key', 'Used to verify that a specific node sent the message.')
                .add('Encryption key', 'Is sent to your peers, which use it to encrypt their messages to you.')
                .add('Decryption key', 'Used to decrypt messages that your peer sends to you.')
              ;
        })
        (SectionPanel)
            (SectionGroup)('H1', 'Unique identifier')('br')._._(CopyableText).on('res/node/profile/id', (id, oo) => oo.setText(id))._._
            (SectionGroup)('H1', 'Encryption key')('br')._._
                (CopyableText, {size:20}).on('res/node/profile/encryptKey', (key, oo) => oo.setText(key))
            ._._
            (SectionGroup)('H1', 'Decryption key')._
                (Secret, {text: 'Click to reveal'})
                    .onReveal(({oo}) => {
                        oo._(CopyableText, {size:20, secret:true}).on('res/node/profile/decryptKey', (key, oo) => oo.setText(key));

                    })
            ._._
            (SectionGroup)('H1', 'Public key')('br')._._
                (CopyableText, {size:20}).on('res/node/profile/privateKey', (key, oo) => oo.setText(key))
            ._._
            (SectionGroup)('H1', 'Private key')('span', 'secret').style({marginLeft: '10px'}).style({color:'var(--orangelight)'})('br')._._._
                (Secret, {text: 'Click to reveal'})
                    .onReveal(({oo}) => {
                        oo._(CopyableText, {size:20, secret:true}).on('res/node/profile/publicKey', (key, oo) => oo.setText(key));

                    });
};

