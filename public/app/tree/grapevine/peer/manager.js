import {createReplier} from '../replier.js';
import {createRetriever} from '../retriever.js';
import {createSignerNotesAsync} from './signer-notes.js';
import {createNoteScoresAsync} from './note-scores.js';
import {createTrackedNotesAsync} from './tracked/notes.js';
import {createTrackedSignersAsync} from './tracked/signers.js';
import {verifyGrapevineEnvelopeAsync} from '../../crypto-tree.js';
import {createOnNotify, eachAsync, copyProps} from '../../../oo/utils.js';

export const
    ERR_SEND            = 'grapevine:err:SEND',
    ERR_NONCE           = 'grapevine:err:NONCE',
    ERR_TIMEOUT         = 'grapevine:err:TIMEOUT',
    PROFILE_UPDATED     = 'peer:PROFILE_UPDATED',
    PEER_CREATED        = 'peer:PEER_CREATED',
    PEER_UPDATED        = 'peer:PEER_UPDATED',
    PEER_DESTROYED      = 'peer:PEER_DESTROYED',
    RESET               = 'peer:RESET',
    PING                = 'peer:PING',
    MESSAGE_REPLY       = 'peer:MESSAGE_REPLY',
    MESSAGE_RECEIVED    = 'peer:MESSAGE_RECEIVED';

const
    PEER_DATA_SUFFIX    = 'DATA:',
    PEER_STATS          = 'PEER_STATS',
    PEER_SETTINGS       = 'PEER_SETTINGS',
    PEER_PROFILES       = 'PEER_PROFILES';

export async function createPeerManagerAsync(ß) {

    const
        {on, notify} = createOnNotify(),
        managerStore = await ß.storage.getAsync({name: `/grapevine/peermanager`, persistent:true});
        // peer profiles are stored in a persistent store and when peer manager is re-created,
        // the peer profiles are loaded and fed into peer proxy objects that handles all interaction
        // with the peer. these peer proxies are saved in memory and internally accessible through the
        // peerProxies object. externally a PeerProxies object is used to work with the peers as a collection.

    async function getProfiles() {
        return await managerStore.getAsync(PEER_PROFILES) || {};
    }

    async function saveProfilesAsync(profile) {
        const peerProfiles = await getProfiles();
        peerProfiles[profile.id] = profile;
        await managerStore.setAsync(PEER_PROFILES, peerProfiles);
    }

    async function getPeerDataAsync(key, peerId) {
        const data = await managerStore.getAsync(PEER_DATA_SUFFIX + peerId);
        return data || {};
    }

    async function savePeerDataAsync(key, peerId, data) {
        let o = await getPeerDataAsync(key, peerId);
        o = {
            ...o,
            ...data
        };
        await managerStore.setAsync(PEER_DATA_SUFFIX + peerId, o);
    }

    async function destroyPeerDataAsync(peerId) {
        await managerStore.deleteAsync(PEER_DATA_SUFFIX + peerId);
    }

    async function recreatePeerProxiesAsync() {
        return eachAsync(await getProfiles(), async (peerProfile, o) => {
            const settings = await getPeerDataAsync(PEER_SETTINGS, peerProfile.id);
            o[peerProfile.id] = new PeerProxy(peerProfile, settings[peerProfile.id]);
        }, {});
    }

    const peerProxies = await recreatePeerProxiesAsync(); // XXX populate peerProxies

    function PeerProxy(profile, setting, stats) {
        console.log('TODO verify thay profile id can be generated form profile.pub');

        // The design is such that there should only ever exist one instance of PeerProxy representing one peer on the network.
        //
        //log?.('new Peer', {profile}); // XXX if name changes, everything brakes. TODO  replace with an UID
        this.profile = profile;
        this.setting = setting || {
            alias: '',              // user-defined name of peer
            sync: true,             // if respond/retrieve is enabled
            pinned: false           // if true a peer can not be kicked in favour of other peer with higher score
        };
        this.stats = stats || {
            score: 0.5,             // good peers are rewared
            seen: 0                 // last seen
        };
        this.listeners = {};
        this.messageNonce = Math.floor(Math.random() * 123123);
        this.messageBox = {
            sent: [],
            received: []
        };

        this.log = ß.log.log(`@${profile.name}`, 10);
        this.createLog = this.log.log;

        this.replier = createReplier(ß, this, this.createLog('replier', 1));
        this.retriever = createRetriever(ß, this, this.createLog('retriever', 1));
    }
    PeerProxy.prototype.initAsync = async function() {
        // persistence
        await saveProfilesAsync(this.profile);
        await savePeerDataAsync(PEER_SETTINGS, this.profile.id, this.setting);
        await savePeerDataAsync(PEER_STATS, this.profile.id, this.stats);

        // XXX when adding new stores remember to also (if applicable) add it to:
        //      peerProxy.destroyAsync()
        //      peerProxy.resetAsync()
        // noteScores is a list of scores downloaded from peer.
        // it is presumed that if a peer has a note score, it also stores the associated note.
        // hence the list is used to find out if a peer has a card or not.
        // NOTE: the list contains the peers score of the note, _not_ the score set by this note.
        this.noteScores = await createNoteScoresAsync(ß, this, this.createLog('noteScores',10));
        this.trackedNotes = await createTrackedNotesAsync(ß, this, this.createLog('trackedNotes',10));
        this.trackedSigners = await createTrackedSignersAsync(ß, this, this.createLog('trackedSigners',10));
        this.signerNotes = await createSignerNotesAsync(ß, this, this.createLog('signerNotes',10));

        // start polling
        if(this.setting.sync) this.setPolling(true);
    };
    PeerProxy.prototype.resetAsync = async function(maxTimeoutSeconds=1, inMessage) {
        if(!inMessage) {
            // node asking peer to do a reset
            // note: nothing should be reseted locally, because the requesting node should
            // not be forgetting what it has sent. it is the peer being asked for reset, that should forget.
            const outMessage = await this.createMessageAsync(RESET);
            return this.exchangeMessageAsync(outMessage, maxTimeoutSeconds);
        } else {
            // the peer this is a proxy for, asked the node owning the proxy,
            // to do a reset.
            await this.noteScores.clearAsync();     // forget all notes sent to the peer
            await this.signerNotes.clearAsync();    // forget which signer notes have already been sent
            console.log('TODO add reset also of trackedNotes and trackedSigners');
            // reply
            const header = inMessage;
            const outMessage = await this.createMessageAsync(MESSAGE_REPLY, 'reset acknowledged', header);
            return this.signAndSendMessageAsync(outMessage, err => {
                if(err) alert('Sending Reset message failed.\r\n\r\nError:' + err);
            });
}
    },
    PeerProxy.prototype.destroyAsync = async function(options) { //L(options);
        if(!options) throw new Error('options arg is requred.');

        // proxy
        delete peerProxies[this.profile.id];

        // profile
        const peerProfiles = await getProfiles();
        delete peerProfiles[this.profile.id];
        await managerStore.setAsync(PEER_PROFILES, peerProfiles);

        // data
        await destroyPeerDataAsync(this.profile.id);

        //if(notifyPeer) TODO send message to peer that it has been removed as a peer (sheer curtesey)
        if(options.destroyStores) {
            await this.noteScores.destroyAsync();
            await this.trackedNotes.destroyAsync();
            await this.trackedSigners.destroyAsync();
            await this.signerNotes.destroyAsync();
        }
        const {id, url} = this.profile; console.log('TODO is url used? ensure URL is replaced with cn or something everywhere', {url});

        notify(PEER_DESTROYED, url); //L('WILL NOTIFY');
        if(options.addNetworkNode) { //L('adding as network node');
            await ß.grapevine.addNodeBannerAsync({name: this.profile.name, onion: this.profile.onion, cn: this.profile.cn});
        }
    };
    PeerProxy.prototype.getStoreAsync = async function(name, options) {
        const peerId = this.getPublicProfile().id;
        return ß.storage.getAsync({name: `/grapevine/peer/${peerId}/${name}`, persistent:true, lufo:false, ...options});
    };
    PeerProxy.prototype.getLufoStoreAsync = async function(name, options) {
        const peerId = this.getPublicProfile().id;
        return ß.storage.getAsync({name: `/grapevine/peer/${peerId}/${name}`, persistent:true, ...options, lufo:true});
    };
    PeerProxy.prototype.updateProfileAsync = async function(profile) {
        console.log('TODO check signature and integrity. check that id can be generated from public and that it matches existing');
        copyProps(profile, this.profile, {maxSize:10100});
        await saveProfilesAsync(this.profile);
        notify(PEER_UPDATED, this.name);
    };
    PeerProxy.prototype.getPublicProfile = function() {
        return this.profile;
    };
    PeerProxy.prototype.updateSettingAsync = async function(setting) {
        const isSyncUpdated = setting.sync !== undefined && this.setting.sync !== setting.sync;

        copyProps(setting, this.setting, {maxSize:10100});  //console.log(setting, this.setting);
        await savePeerDataAsync(PEER_SETTINGS, this.profile.id, this.setting);

        if(isSyncUpdated) this.setPolling(this.setting.sync);

        return this.getSetting();
    };
    PeerProxy.prototype.getSetting = function() {
        return this.setting;
    };
    PeerProxy.prototype.createMessageAsync = async function(type, data, header={}) { //, nonce, protocol) {
        let nonce = header.nonce;
        if(!nonce) {
            this.messageNonce++;
            nonce = this.messageNonce;
        }
        const
            peerProfile = this.getPublicProfile(),                          // recipient
            nodeProfile = await ß.grapevine.getProfileAsync(),              // sender
            {to, from} = ß.grapevine.toFrom(peerProfile, nodeProfile, header.protocol),       // always send back using same protocol layer
            message = {
                to,                             // the receiving peer url
                type,                           // message type
                data,                           // the actual content of the message
                from,                           // the sending node url
                id: nodeProfile.id,             // the sending node id, have to match up with the list of peers on receiving end
                created: Date.now(),            // for log purposes
                nonce                           // used for matching request message and response message
            };
        this.log?.n(1, 'createMessage', message);
        return message;
    };
    PeerProxy.prototype.createReplyAsync = async function(data, header) { //nonce) {
        return this.createMessageAsync(MESSAGE_REPLY, data, header);
    };
    PeerProxy.prototype.createReplyAndSendMessageAsync = async function(data, header, cb) {//, nonce, cb) {
        const message = await this.createReplyAsync(data, header);
        return this.signAndSendMessageAsync(message, cb);
    };
    PeerProxy.prototype.createAndSendMessageAsync = async function(type, data, cb) {
        const message = await this.createMessageAsync(type, data);
        return this.signAndSendMessageAsync(message, cb);
    };
    PeerProxy.prototype.signAndSendMessageAsync = async function(message, cb) {
        const {privateKey, encryptKey} = await ß.grapevine.getProfileAsync();
        this.log?.n(1, 'signAndSendMessageAsync', {message}, cb);
        let envelope;
        try {
            envelope = await ß.grapevine.createEnvelopeAndSendAsync({privateKey, encryptKey, message});
            cb(null, envelope);
        } catch(e) {
            // this function features both throw and error callback,
            // too support use of the two different programming styles in dependent code.
            cb(e);
            throw e();
        } finally {
            return envelope;
        }
    };
    PeerProxy.prototype.handleEnvelopePeerAsync = async function(envelope, protocol) { this.log('envelope', envelope);
        const {publicKey} = this.getPublicProfile();
        if(await verifyGrapevineEnvelopeAsync({publicKey, envelope})) {
            return () => {
                envelope.message.protocol = protocol;
                this.addMessage(envelope.message);
            };
        } else {
            log.e('Envelope verification failed.', {envelope});
            throw new Error('bad envelope');
        }
    };
    PeerProxy.prototype.notify = function(event, data) {
        const arr = this.listeners[event];
        this.log?.n(1, 'notify', event, data, arr);
        if(arr) for(let i = 0; i < arr.length; i++) if(arr[i](data, this) === false) return true;
    };
    PeerProxy.prototype.on = function(event, l) {
        this.log?.n(1, 'on', event, l);
        const listeners = this.listeners;
        if(!event) throw 'event is undefined';
        if(!listeners[event]) listeners[event] = [];
        listeners[event].push(l);
        const self = this;
        return () => {
            const i = self.listeners[event].findIndex(l => l === l);
            if(i >= 0) self.listeners[event].splice(i, 1);
        };
    };
    PeerProxy.prototype.addMessage = function(message) {
        console.log('TODO check signature and integrity. check that id can be generated from public and that it matches existing');
        this.log?.n(1, 'addMessage', {message});
        this.messageBox.received.push(message);
        const
            isConsumed = this.notify(MESSAGE_RECEIVED, message),
            peerProxy = this;

        this.stats.seen = Date.now();
        if(!this.setting.sync) return; // TODO send friendly "not sharing right now"

        else if(message.type === MESSAGE_REPLY && isConsumed) return; // TODO verify that isConsume can happen, doesnt look like it in code
        else if(message.type === PING) this.pingAsync(undefined, undefined, message);
        else if(message.type === RESET) this.resetAsync(undefined, message);
        else if(message.type === PROFILE_UPDATED) this.updateProfileAsync(message.data);
        else if(message.type.startsWith('quotaRetriever:')) ß.grapevine.getQuotaRetriever().addMessage({message, peerProxy});
        else if(message.type.startsWith('treeRetriever:')) ß.grapevine.getTreeRetriever().addMessage({message, peerProxy});
        else if(message.type.startsWith('signerRetriever:')) ß.grapevine.getSignerRetriever().addMessage({message, peerProxy});
        else if(message.type.startsWith('networkRetriever:')) ß.grapevine.getNetworkRetriever().addMessage({message, peerProxy});
        else throw 'unhandled message. message=' + JSON.stringify(message);
    };
    PeerProxy.prototype.exchangeMessageAsync = async function(outMessage, maxTimeoutSeconds=30) {
        this.log?.n(1, 'exchangeMessageAsync', {outMessage, maxTimeoutSeconds});
        const promise = new Promise((resolve, reject) => {
            let clearTimer = ß.oo.timer(1000 * 60 * maxTimeoutSeconds, () => {
                fail(ERR_TIMEOUT, `timeout. maxTimeoutSeconds=${maxTimeoutSeconds}`);
            });
            const clean = () => {
                if(remove) remove();
                if(clearTimer) {
                    clearTimer();
                    clearTimer = null;
                }
                remove = null;
            };
            let remove = this.on(MESSAGE_RECEIVED, inMessage => { // TODO "let remove" can be deleted?
                if(inMessage.nonce === outMessage.nonce) {
                    // TODO validate message integrity
                    if(inMessage.from !== outMessage.to) {
                        fail(ERR_NONCE, `bad msg. out=${JSON.stringify(outMessage)} in=${JSON.stringify(inMessage)}`);
                    } else {
                        this.log?.n(1, 'success exchanging messages', {outMessage, inMessage});
                        clean();
                        resolve(inMessage);
                        return false; // consume event
                    }
                }
            });
            const fail = (err, msg) => {
                this.log?.w('failed to exchange messages', {msg, outMessage});
                clean();
                reject({err, msg});
            };
            this.signAndSendMessageAsync(outMessage, err => {
                if(err) fail(ERR_SEND, err);
            });
        });
        return promise;
    };
    PeerProxy.prototype.setPolling = function(enabled) {
        if(enabled) this.getRetriever().startPolling();
        else this.getRetriever().stopPolling();
    };
    PeerProxy.prototype.getInfo = function() {
        // returns values that can not be changed by the user

        const now = Date.now();
        const duration = this.getRetriever().getDuration();
        let online = false;
        if(duration) {
            // if last received message from was older then start of the duration,
            // the peer can not be considered to be syncing.
            online = this.stats.seen > now - duration;
        }

        return {
            id: this.profile.id,
            displayName: this.setting.alias || this.profile.name,
            name: this.profile.name,
            description: this.profile.description || 'No description given by peer.',
            alias: this.setting.alias,
            score: Math.floor(this.stats.score * 100),
            online
        };
    };
    PeerProxy.prototype.pingAsync = async function(data, maxTimeoutSeconds=1, inMessage) {
        if(!inMessage) {
            this.log?.n(100, 'ping', data);
            const outMessage = await this.createMessageAsync(PING, data);
            return this.exchangeMessageAsync(outMessage, maxTimeoutSeconds);
        } else {
            this.log?.n(0, 'pong', inMessage)
            const header = inMessage;
            const outMessage = await this.createMessageAsync(MESSAGE_REPLY, 'pong to your ' + inMessage.data, header);
            return this.signAndSendMessageAsync(outMessage, err => {
                if(err) alert('Sending Pong message failed.\r\n\r\nError:' + err);
            });
        }
    };
    PeerProxy.prototype.getRetriever = function() {
        return this.retriever;
    };
    PeerProxy.prototype.getReplier = function() {
        return this.replier;
    };
    PeerProxy.prototype.addNoteScoreAsync = async function(noteId, score) { // the score set by the peer (_not_ this node)
        return this.noteScores.addDescendingAsync(noteId, {noteId, score}, 'score');
    };
    PeerProxy.prototype.eachBestNoteScoreAsync = async function(cb, arr) {
       return this.noteScores.eachValueAsync(undefined, cb, arr);
    };
    PeerProxy.prototype.hasNoteScoreAsync = async function(noteId) {
        return this.noteScores.hasAsync(noteId);
    };
    PeerProxy.prototype.getNoteScoreAsync = async function(noteId) {
        const o = await this.noteScores.getValueAsync(noteId);
        return o ? o.score : 0;
    };
    PeerProxy.prototype.getTrackedNotes = function() {
        return this.trackedNotes;
    };
    PeerProxy.prototype.getTrackedSigners = function() {
        return this.trackedSigners;
    };
    PeerProxy.prototype.eachSignerNoteAsync = async function() {
        return this.signerNotes.replyStorage.eachNoteAsync(...arguments);
    };

    async function createPeerAsync(profile) { // TODO verify profile integrity
        const {id, url} = profile;
        if(hasPeer(id)) throw new Error(`peer(${id}) already exists`);

        // save peer to database directly to ensure node does not forget about it
        // in case of an un-expected/abrupt shutdown. while slightly slower then
        // working directly with memory, it does not matter because peers are
        // only rarely manipulated.
        const peerProxy = new PeerProxy(profile);
        peerProxy.initAsync();
        peerProxies[id] = peerProxy;

        notify(PEER_CREATED, url); console.log('TODO probably can not use URL, replace with onoion or soethinh');
        return peerProxy;
    }

    async function destroyPeerAsync(id, options) {
        const peerProxy = getPeerProxy(id);
        if(peerProxy) {
            await peerProxy.destroyAsync(options);
        }
    }

    function PeerProxies() {
         // peerProxies are very likely to be used in async operations,
         // and peerProxies object may very well mutate, hence return
         // a shallow copy in the shape of an itteratable datastructure.
         this.arr = Object.keys(peerProxies).map(v => peerProxies[v]);
    }
    PeerProxies.prototype.size = function() { return this.arr.length; };
    PeerProxies.prototype.get = function(i) { return this.arr[i]; };
    PeerProxies.prototype.eachAsync = async function(cb, filter, result={}) {            //console.trace();
        for(let i = 0, j = 0, peerProxy, o; i < this.size(); i++) {
            peerProxy = this.get(i);
            if(!filter || filter?.(peerProxy)) {
                j++;                                                //L({size:this.size(), peerProxy, i, j, cb});
                o = await cb(peerProxy, j);
                if(o === false) break;
                result[peerProxy.name] = o;
            }
        }
        return result;
    };
    PeerProxies.prototype.find = function(cb) {
        return this.arr.find(o => cb(o));
    };
    PeerProxies.prototype.forEach = function(cb) {
        this.arr.forEach(o => cb(o));
    };
    PeerProxies.prototype.map = function(cb) {
        return this.arr.map(o => cb(o));
    };

    function getPeerProxies() {
        return new PeerProxies();
    }

    function getPeerProxy(id) {
        return peerProxies[id];
    }

    function hasPeer(id) {
        //return !!((await getProfiles)[id]);
        return !!peerProxies[id];
    }

    return {
        createPeerAsync,
        destroyPeerAsync,
        getPeerProxies,
        getPeerProxy,
        hasPeer,
        on
    };
};

