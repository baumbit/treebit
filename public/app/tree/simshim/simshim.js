// TODO
//      fix:
//
//      fr:
//
//      roadmap:
//
/*
 * v0.0.1-2
 * Simshim - Development environment - Treenet
 */
window.__SIMSHIM__ = {
    debug: {
        deterministicScoring: true
    }
};
//////////////////window.global = {};
//////////////////window.global.__SHIM__ = {
//////////////////    subtle: window.crypto.subtle
//////////////////};

const AUTO_CREATE_NUMBER_OF_SERVERS = 1;
const AUTO_CREATE_NUMBER_OF_NODES = 2;
const AUTO_CREATE_SIGNERS_COUNT = 2;
const AUTO_CREATE_TREES_COUNT = 1;
const AUTO_CREATE_NOTES_COUNT = 4;

const DEBUG_AUTOGENERATE_THEN_GO = false;// TODO improve debug
const LOG_LEVEL_GRAPEVINE = 0;

let rootRefCount = 0;
const
    cn = ({url, isOnline}) => { return {url, isOnline}; },
    cm = (message) => { return JSON.parse(JSON.stringify(message)); },
    createRefPrefix = (r='r') => { return `${r}${rootRefCount++}`};

import {onPlatformEvent, EXIT_EVENT, createLog} from '../../oo/utils.js';
onPlatformEvent(EXIT_EVENT, () => {
    localStorage.clear();
});

import OO from '../../oo/oo.js';
import {} from '../../oo/buckettree-db.js'; // ensures test is run
import {createTreeRetrieverLog} from '../log/tree-retriever-log.js';
import {createSignerRetrieverLog} from '../log/signer-retriever-log.js';
import {config} from './config.js';
import {generateNodeCredentialsAsync} from '../crypto-tree.js';
import {createStorage} from '../storage.js';
import {CANOPY_UPDATED} from '../canopy/canopy.js';
import {PEER_CREATED, PEER_UPDATED, PEER_DESTROYED, PROFILE_UPDATED} from '../grapevine/peer/manager.js';
import {createResourceApiAndClient} from './resource-shim.js';
import * as MESSENGER from './messenger-shim.js';
import {mockupSigners, mockupForest} from '../mockup.js';
import {createTutorial} from '../tutorial.js';
import {createPlatformstyle} from '../style.js';
import {createTreehutClient} from './treehut-client.js';
import {createBAsync} from '../B.js';

export async function createSimshim(root) {
    const {oo, $:{$, set, drop}} = OO(root, undefined, undefined, {refPrefix: createRefPrefix()}),
          IS_MOCKUP_SCORING = 'simshimNode/isMockupScoring',
          manager = {
              NODE_REMOVED: 'NODE_REMOVED',
              NODE_UPDATED: 'NODE_UPDATED',
              MESSAGE: 'MESSAGE',
              //messaging: createMessaging(),
              listeners: [],
              on: (url, on) => { //L('on ' + url + ' as manager listener');
                  //manager.messaging.on(name, on);
                  const l = {url, on};
                  manager.listeners.push(l);
                  return () => {
                      const i = manager.listeners.findIndex(o => o === l);
                      if(i >= 0) manager.listeners.splice(i, 1);
                      else throw 'did not find listener';
                  };
              },
              sendMessage: (message, cb) => { //L('posting message to', message.to, message, manager.listeners);
                  if(message.respond) throw 'bad message format';
                  message.respond = cb;
                  const l = manager.listeners.find(l => { //L(l.url, message.to, l.url === message.to);
                      return l.url === message.to;
                  });
                  if(l) { //L('posting.....', message, l.on);
                      l.on(manager.MESSAGE, message);
                  }
                  else cb('not on simshim net');
              },
              updateNode: (node, isCreated) => { //L('updateNode', node);
                  set('node/'+node.url, node); //log('addNode=', node);
                  manager.listeners.forEach(l => { //console.log('notify '+l.name+' that '+node.name+' is updated');
                      l.on(manager.NODE_UPDATED, node);
                  });
                  if(isCreated) {
                      const l = manager.listeners.find(l => l.url === node.url).on;
                      $.each('node', node => l(manager.NODE_UPDATED, node));
                  }
              },
              removeNode: (url) => { //log('removepNode=', name);
                  drop('node/'+url);
                  manager.listeners.forEach(l => l.on(manager.NODE_REMOVED, url));
              },
              getListener: (url) => {
                  return manager.listeners[url];
              }
          };

    // the platform style defines stylesheet properties such as width and height,
    // which is depends on whether its desktop, handheld, simshim, etc.
    createPlatformstyle(oo, 'simshim');

    // manager view
    const managerView = oo('div'),
          hotelsView = oo('table')('tr'),
          nodesView = oo('table')('tr');
    //oo.timer(2000, () => {
    //    console.log(123);
    oo.stylesheet(`
        .clearBtn {
            margin-left: 7px;
        }
        .redBtn {
            background-color: red;
        }
        .orangeBtn {
            background-color: orange;
        }
        Span {
            font-variant: small-caps;
        }
        `, 'Manager'
     );
    //});
     const createHotel = async (options) => {
        const name = 'hotel-' + Date.now().toString().substring(9) + '-' +Math.random().toString().substring(2, 6);
        //if(name && !$('nodes/'+name)) {
        if(name && !manager.getListener(name)) {
            const hotelCol = hotelsView('td').style({verticalAlign:'top'});
            options = {...options};
            await createSimshimHotelAsync($, name, manager, hotelCol, nodesView, options).catch(console.error);
        }
     };
     managerView(SimshimButton, 'Create hotel').onclick(async () => await createHotel({addNetworkNodeCount:1}));

     managerView(SimshimButton).on(IS_MOCKUP_SCORING, (is, o) => is ? o.text('Disable mockup scoring') : o.text('Enable mockup scoring')).onclick(o => {
        const is = !window.__SIMSHIM__.debug.deterministicScoring
        window.__SIMSHIM__.debug.deterministicScoring = is;
        set(IS_MOCKUP_SCORING, is, true);
    }).className('$'+IS_MOCKUP_SCORING, {when:{false: 'noclass', true: 'orangeBtn'}})._;
    set(IS_MOCKUP_SCORING, window.__SIMSHIM__.debug.deterministicScoring, true);

    for(let i = 0; i < AUTO_CREATE_NUMBER_OF_SERVERS; i++) createHotel({autoAddPeersFactor:0.8});
};

async function createSimshimHotelAsync($, hotelName, manager, hotelCol, nodesView, options) {
    const createWebTreehut = async () => {
        const url = 'node-' + Date.now().toString().substring(9) + '-' +Math.random().toString().substring(2, 6);
        if(url && !manager.getListener(url)) {
            const col = nodesView('td').style({verticalAlign:'top'});
            await createSimshimWebTreehutAsync(hotelName, url, manager, col.elm, options, () => {
                col.destroy();
            });
        }
    };
    hotelCol(SimshimButton, 'Add WebTreehut to ' + hotelName).onclick(await createWebTreehut);
    for(let i = 0; i < AUTO_CREATE_NUMBER_OF_NODES; i++) await createWebTreehut();
}

async function createSimshimWebTreehutAsync(hotelName, url, manager, root, options, destroyCb) {
    // create node
    // a node is a node in the tree network.
    const
        log = createLog(url, 0), // instance trackable log
        tag = `t-${url}`,
        nodeCredentials = await generateNodeCredentialsAsync(tag),  // simshim always create new nodes
        appId = url,
        ß = await createBAsync({
            nrl: {cn:url},
            config,
            appId,
            nodeCredentials,
            tag,
            log
        });

    // create treehut
    // a treehut is a graphical user interface for interacting with the node.
    const
        µ = {config, log},
        ooServer = OO(root, null, null, {globalProps: {ß, µ}, refPrefix: createRefPrefix('s')});
    µ.µ = µ;

    ß.setMessenger(MESSENGER.createMessenger(ß));
    ß.setOO(ooServer);

    // simshim version of resourceClient.
    // hotel has a very similar and it makes content retrieval very fast server-side.
    // in the browser the resourceClient is different because it use fetch to download
    // data from server.
    µ.resourceClient = createResourceApiAndClient({ß, log}); // client depends on this

    // create client view first, so it appears above server in the GUI
    createSimshimTreehut(ß, µ, hotelName, url, manager, root, options, destroyCb, log);

    // now create view for server
    ooServer(SimshimNodeServer, {ß, µ, manager, hotelName, url, options, destroyCb, log});

    // create tutorial
    const tutorial = createTutorial(ß);
    tutorial.createWelcomeAsync();

    // mockup content
    //await mockupSigners({ß, log, count:AUTO_CREATE_SIGNERS_COUNT});
    //await mockupForest({ß, µ, log, countTrees:AUTO_CREATE_TREES_COUNT, countNotes:AUTO_CREATE_NOTES_COUNT});

    await ß.startAsync();
}

function SimshimNodeServer(oo, {ß, µ, manager, hotelName, url, treehutView, options, destroyCb, log}) {
    oo.onscroll(() => { return false; });
    const {on, go, $:{$, set, drop, prepend, push}} = oo,
          SIMSHIMNODE = 'simshimNode',
          SENT = 'simshimNode/message/sent',
          RECEIVED = 'simshimNode/message/received',
          IS_ONLINE = 'simshimNode/isOnline';
    // shim history. (all SimshimNode instances depend on having their own location)
    // store
    set(SIMSHIMNODE, {
        isOnline: Math.random() > 0.05,
        message: {
            received: [],
            sent: []
        },
        url
    });
    const WIDTH = '360px',
          HEIGHT = '640px';
    oo.stylesheet(
        `SimshimNodeServer {
            display: block;
            width: ${WIDTH};
            height: ${HEIGHT};
            color: #454545;
        }

        SimshimNodeServer span:hover {
            color: #fff;
        }

        SimshimNodeClient input {
            background-color: #232323;
            color: #fff;

        }
        `, 'SimshimNode'

    );
    oo('div', {style:{marginTop: '20px'}});
    oo(SimshimButton).on(IS_ONLINE, (isOnline, o) => isOnline ? o.text('Online on ' + hotelName) : o.text('Offline on ' + hotelName)).onclick(o => {
        set(IS_ONLINE, !$(IS_ONLINE), true);
        manager.updateNode($(SIMSHIMNODE));
    }).className('$'+IS_ONLINE, {when:{false: 'redBtn', true: 'noclass'}})._
    oo(SimshimButton, url).onclick(() => {
        if(confirm('Are you sure you want to delete this node?\r\n\r\n'+url)) {
            removeManagerListener();
            manager.removeNode(url);
            destroyCb();
        }
    }).elm.title = 'Grapevine ' + ß.grapevine.debug.debugId;
    oo('br');
    const descBtn = oo(SimshimButton, 'Set description').onclick(() => {
        const description = prompt('Enter description:');
        if(description) ß.grapevine.updateProfileAsync({description});
    });
    ß.grapevine.on(PROFILE_UPDATED, ({description}) => descBtn.text(description));

    oo('br')._('br');

    oo(SimshimButton, 'Dump canopy').onclick(() => {
        let o = [];
        ß.canopy.debug.dump(function(){ o.push({...arguments}); });
        log(o);
    });
    oo(SimshimButton, 'Dump store').onclick(() => {
        log('Dumping store', µ.dev.oo.context.store);
    });

    oo('br')._('br');

    oo(GrapevineView, {ß, manager, log});

    // list online nodes
    const addNetworkNodeAsync = async (url) => {
        await ß.grapevine.addNodeBannerAsync({name: 'sim:'+url, cn: url, description: `Some description with random(${Math.random()}) value`});
    };
    const addPeerAsync = async (url) => {
        await addNetworkNodeAsync(url);
        await ß.grapevine.connectNodeAsync(url).catch(e => log.e(e.message));
        //log('auto-added node', url);
    };
    oo('div')('span', 'Simshim nodes').on('$node $node/: $node/:/:', 'ul', true, ([nodes], o) => {
        nodes.each(({url, isPeer, isOnline}) => { // console.log({url, isPeer, isOnline});
            if(!isPeer && isOnline) o('li')(SimshimButton, url).onclick(() => addPeerAsync(url));
        });
    });
    oo.timer(200, () => {
        let {autoAddPeersFactor, addNetworkNodeCount} = options;
        oo.context.each($('node'), async ({url, isPeer}) => {
            if(!isPeer) { //L({options});
                if(autoAddPeersFactor > 0) {
                    if(Math.random() < autoAddPeersFactor) await addPeerAsync(url);
                    else await addNetworkNodeAsync(url);
                } else if(addNetworkNodeCount > 0) {
                    addNetworkNodeCount--;
                    await addNetworkNodeAsync(url);
                }
            }
        });
    });

    // message
    oo('div')('span', 'Received messages')._
        (SimshimButton, 'Clear', {className: 'clearBtn'}).onclick(() => set(RECEIVED, []))._
        ('div').on(RECEIVED, 'ul', true, (arr, o) => !arr.size() ? o('li')('i', 'empty') :
            arr.each(({from, created, type, data}) => {
                o('li')('span', from + ' ' + type).elm.title =
                    'From: ' + from + '\r\nCreated: ' +  new Date(created) + '\r\n\r\nType: ' +  type + '\r\n\r\n' + JSON.stringify(data);
            }));
    oo('div')('span', 'Sent messages')._
        (SimshimButton, 'Clear', {className: 'clearBtn'}).onclick(() => set(SENT, []))._
        ('div').on(SENT, 'ul', true, (arr, o) => !arr.size() ? o('li')('i', 'empty') :
            arr.each(({to, type, data, created}) => {
                o('li')('span', to + ' ' + type).elm.title =
                    'To: ' + to + '\r\nCreated: ' +  new Date(created) + '\r\n\r\nType: ' +  type + '\r\n\r\n' + JSON.stringify(data);
            }));
    ß.messenger.on(MESSENGER.SEND, (message, cb) => {
        prepend(SENT, cm(message));
        manager.sendMessage(message, cb);
    });

    // marry with manager
    const removeManagerListener = manager.on(url, async (event, data, cb) => { //L('event from manager', {event, data});
        switch(event) {
            case manager.NODE_REMOVED:
                if(data !== url) drop('node/'+data, true);
                break;
            case manager.NODE_UPDATED:
                if(data.url !== url) {
                    const {url, isOnline} = data,
                          NODE = 'node/'+url;
                    if(!$(NODE)) set(NODE, {url}, true);
                    set(NODE+'/isOnline', isOnline, true);
                }
                break;
            case manager.MESSAGE:
                // to simulate a real network (and possible issues ineherent to such) simulated peers should communicate
                // by sending messages, not using callbacks. hence, this respond callback should not be able to accessble internally
                // in grapevine. the respond function is instead used to inform peer that the message was successfully sent
                // and received by the receiving peer, i.e. that it was reachable on the network and that peer accepted the message.
                // if the message does not adhere to the protocol (example: quota exhaustion) or similar, peer should reply with 
                // a new message (@see grapevine/replier.js)
                const {respond} = data;
                delete data.respond;
                if($(IS_ONLINE)) {
                    try {
                        await ß.messenger.receiveAsync(data);
                        //console.log('success sending');
                        respond();
                    } catch(e) {
                        //console.log('error sending', e);
                        respond(e);
                    }
                } else respond('offline');
                break;
        }
    });
    manager.updateNode($(SIMSHIMNODE), true);
}

function GrapevineView(oo, {ß, manager, log}) {
    const {set, drop, push, $} = oo.$;
    oo('div')('span', 'Grapevine peers');

    // list peers, destroy peer
    const peerList = oo('ul');
    [PEER_CREATED, PEER_UPDATED, PEER_DESTROYED].forEach(event => {
        ß.grapevine.getPeerManager().on(event, (url) => {
            if(event === PEER_DESTROYED) set('node/'+url+'/isPeer', false);
            peerList.clear();
            ß.grapevine.getPeerProxies().eachAsync(peerProxy => {
                const {id, url, description} = peerProxy.getPublicProfile();
                set('node/'+url+'/isPeer', true);
                peerList('li')
                (SimshimButton, url + ' [' + description + ']').onclick(() => {
                    const s = prompt(`Ping ${peerProxy.url}\r\n\r\nSend message:`, 'ping');
                    (async () => {
                        const inMessage = await peerProxy.pingAsync(s)
                            .catch(({err, msg}) => {
                                alert(`Pong from ${peerProxy.getPublicProfile().url}\r\n\r\nError: ${err}\r\n${msg}`);
                            });
                        alert(`Pong from ${peerProxy.getPublicProfile().url}\r\n\r\n${JSON.stringify(inMessage)}`);
                    })();
                })._
                (SimshimButton, 'X', {className: 'clearBtn'}).onclick(() => {
                    ß.grapevine.destroyPeerAsync(id, {destroyStores:true, addNetworkNode:false});
                });
            });
        });
    });
}

function SimshimButton({oo, css}) {
    css(`
    SimshimButton {
        display: inline-block;
        margin: 2px;
        font: 15px "Fira Sans", sans-serif;
        border-radius: 5px;
        padding: 2px 5px 2px 5px;
        color: #000;
        background-color: #3b3b3b;
        border: 0;
        font-variant: petite-caps;
    }
    SimshimButton:hover {
        color: #fff;
    }
    SimshimButton:active {
        background-color: #000;
        transform: translateY(2px);
    }
    `);
}

function createSimshimTreehut(ßdev, µ, hotelName, url, manager, root, options, destroyCb, log) {
    const
        oo = OO(root, null, null, {globalProps: {}, refPrefix: createRefPrefix()})(function SimshimNodeClient(){});

    // treehut
    const
        ooptionsTreehut = {
            refPrefix: createRefPrefix(),
            debugRoute: 10,
            globalProps: {ßdev/*TODO remove*/, µ, log},
        },
        {oo: ooTreehut} = createTreehutClient(
            oo('App', {style:{boxShadow: '0px 0px 20px 2px rgba(0,0,0,0.69)'}}).elm, ooptionsTreehut);
    µ.dev = {oo: ooTreehut};
    ooTreehut.context.setHeadlessHistory(s => setHref(s));
    oo('br')._('br');
    const hints = {synthetic:false};
    oo(SimshimButton, 'Back').onclick(() => {
        ooTreehut.context.history.back();
    });
    const ooInput = oo('input'),
          setHref = s => {
              if(s.startsWith('http://')) {
                  s = s.substring(s.indexOf('/', 7), s.length);
              }
              ooInput.elm.value = s;
          };
    oo(SimshimButton, 'Go').onclick(() => {
        ooTreehut.go(ooInput.elm.value, null, hints);
    });
    oo(SimshimButton, 'Root').onclick(() => {
        ooTreehut.go('/', null, hints);
    });
    oo(SimshimButton, 'Admin').onclick(() => {
        ooTreehut.go('/admin', null, hints);
    });
    oo(SimshimButton, 'Dev').onclick(() => {
        ooTreehut.go('/dev', null, hints);
    });
    ooTreehut.go('/', null, hints); // ENTRY PAGE
}


