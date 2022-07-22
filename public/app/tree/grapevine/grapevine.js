/*
 * TODO
 *      fix:
 *      fr:
 *      roadmap:
 *                  add peer signature validation for all messages
 *
 * v0.0.1-1
 * Grapvine - Middleware - Treenet
 * Communication layer between Treenet nodes.
 */
let DEBUG_NBR_OF_RETRIEVERS = 0; // turn off auto polling
//let DEBUG_NBR_OF_RETRIEVERS = 1; // one auto polling instance

import OO from '../../oo/oo.js';
import {createPeerManagerAsync, PROFILE_UPDATED} from './peer/manager.js';
import {createTrackedBillboardAsync} from './peer/tracked/billboard.js';
import {createNetworkRetriever} from './network-retriever.js';
import {createQuotaRetriever} from './quota-retriever.js';
import {createTreeRetriever} from './note-retriever.js';
import {createSignerRetriever} from './signer-retriever.js';
import {createUploadManager} from './upload-manager.js';
import {createNetworkAsync, HANDSHAKE} from './network.js';
import {clone, createOnNotify, mapAsync, createOrl, copyProps} from '../../oo/utils.js';
import {createGrapevineEnvelopeAsync, openGrapevineEnvelopeAsync} from '../crypto-tree.js';
import {sortEnabledProtocols} from '../common.js';

export const
    API                 = '1/grapevine',
    ENVELOPE            = 'grapevine:ENVELOPE';

const DEV = true; // TODO read from config or something

export async function createGrapevineAsync(ß) {

    const
        NODE_PROFILE = 'node_profile',
        PREFERENCES = 'preferences',
        log = ß.log.log('GRAPEVINE', 10),
        createLog = log.log,
        {on, notify} = createOnNotify(log),
        peerManager = await createPeerManagerAsync(ß),
        networkRetriever = createNetworkRetriever(ß, createLog('networkRetriever',3)),
        quotaRetriever = createQuotaRetriever(ß, createLog('quotaRetriever',3)),
        treeRetriever = createTreeRetriever(ß, createLog('treeRetriever',3)),
        signerRetriever = createSignerRetriever(ß, createLog('signerRetriever', 3)),
        uploadManager = createUploadManager(ß, createLog('uploadManager', 3)),
        trackedNotesBillboard = await createTrackedBillboardAsync(ß, '/grapevine/notes', createLog('trackedNotesBillboard', 3)),
        trackedSignersBillboard = await createTrackedBillboardAsync(ß, '/grapevine/signers', createLog('trackedSignersBillboard', 3)),
        grapevineStore = await ß.storage.getAsync({name: `/grapevine/grapevine`, persistent:true}),
        network = await createNetworkAsync(ß, createLog('net', 10)),
        preferences = (await grapevineStore.getAsync(PREFERENCES)) || {
            // default grapevine preferences
            protocols: DEV ?
                [{name: 'cn', priority: 1, enabled: true}, {name: 'onion', priority: 2, enabled: true}] :
                [{name: 'cn', priority: 2, enabled: true}, {name: 'onion', priority: 1, enabled: true}],
            uploadManager: {
                timeslotDurationMs: ß.config.UPLOAD_INTERVAL_SECONDS * 1000,
                delayStartMs: 1000,
                uploadQuota: ß.config.UPLOAD_QUOTA,
                autoStart: true
            }
        };

    function restartUploadManager() {
        if(uploadManager.isRunning()) uploadManager.stop();
        uploadManager.start(preferences.uploadManager);
    }

    async function createNodeAsync(profile) {
        await updateProfileAsync(profile);
    }

    function processEnvelopeProduct(f) {
        if(f) {
            ß.oo.timer(1, async () => {
                try {
                    await f();
                } catch(e) {
                    log.e('processEnvelopeProduct:' + e.message, e);
                    //console.log(f);
                }
            });
        }
    }

    async function handleEnvelopeAsync(envelope, protocol) {                  //console.log('addMessage', envelope);
        // if there is an error processing the message,
        // the sending peer should be notified that message
        // was not properly received.
        // however, errors may arise when there is a reaction function
        // resulting in a node is sending message itself which in return and something goes wrong
        // those errors should not propagate back to the initiating peer sending the first message,
        // hence the process of adding a message is split into two informal steps.
        // in the first step the message is verified etc (accepted), if there are errors these should be thrown
        // and if there are no errors, the function should return a function (commit) that will be processed
        // after the initial message have been responded to.
        envelope = await openGrapevineEnvelopeAsync({decryptKey:(await getProfileAsync()).decryptKey, envelope});
        if(envelope.type === HANDSHAKE) {
            processEnvelopeProduct(await network.handleEnvelopeHandshakeAsync(envelope, protocol));
        } else {
            const peerProxy = peerManager.getPeerProxy(envelope.message.id); //coneole.log('found', {peerProxy});
            processEnvelopeProduct(await peerProxy.handleEnvelopePeerAsync(envelope, protocol));
        }
    }

    async function createEnvelopeAndSendAsync({privateKey, encryptKey, message}) { //L(encryptKey);
        let envelope;
        try {
            const
                {to, type} = message;
            envelope = await createGrapevineEnvelopeAsync({privateKey, encryptKey, api:API, to, type, message});
            await ß.messenger.sendAsync(envelope);
            return envelope;
        } catch(e) {
            log?.w('createEnvelopeAndSendAsync', e.message, envelope);
            throw e;
        }
    }

    async function updateProfileAsync(profile) { //T();
        let o = await grapevineStore.getAsync(NODE_PROFILE);
        if(!o) {
            o = {
                decryptKey: null,           // key used for decrypting  - must NOT be shared with peers
                encryptKey: null,           // key used for encrypting  - may be shared with peers
                privateKey: null,           // signing key              - must NOT be shared with peers, keep secret
                publicKey: null,            // verification key         - may be shared with peers
                id: null,                   // hash of signing key
                name: 'n-' + profile.tag,   // local node name          - non-unique, may be shared with peers
                description: 'nodesc',      // node description         - human-friendly, may be shared with peers
                cn: null,                   // clearnet URL to node     - may be shared with peers
                onion: null                 // onion address to node    - may be shared with peers
            };
        }
        o = {...o, ...profile};
        await grapevineStore.setAsync(NODE_PROFILE, o);

        // internal
        notify(PROFILE_UPDATED, o);
        //console.log('profile', profile, '->', o);

        // external
        const publicProfile = await getPublicProfileAsync();
        await ß.grapevine.getPeerProxies().eachAsync(async (peerProxy) => {
            peerProxy.createAndSendMessageAsync(PROFILE_UPDATED, publicProfile, function() {
                // TODO try sending again if it failed, and log to GUI (last profile change successfullt accepted at time)
                // console.log('return from peer', ...arguments);
            });
        });
    }

    async function getProfileAsync(key) {
        const profile = await grapevineStore.getAsync(NODE_PROFILE) || {}; //log('getProfile', profile);
        if(key) return profile[key];
        return profile;
    }

    async function getPublicProfileAsync() {
        const profile = clone(await getProfileAsync());
        // TODO when everything is done and we know what profile should include, then whitelist instead of blacklist
        delete profile.decryptKey;
        delete profile.privateKey;
        delete profile.tag;
        return profile;
    }

    async function getNodeIdAsync() {
        return (await getProfileAsync()).id;
    }

    // data
    async function allNoteScoresAsync(noteId) {
        return mapAsync(peerManager.getPeerProxies(), async (peerProxy) => {
            return peerProxy.getNoteScoreAsync(noteId);
        });
    }

    function toFrom(remote/*an url, public node profile or nrl*/, local/*local node profile*/, protocol) { //console.log('->', protocol)
        // note: while this might just look like a simply util function (which it is),
        // it also ensures that nodes speak to eachother using the most secure protocol
        // layer.
        // XXX while a node have to trust its peer to provide a valid location to
        // where messages can be sent, a node should protect itself from exposing its
        // clearness address to a peer that only knows it by its onion address.
        // therefor a node should _always_ pick the protocol protcol itself prefer to use
        // when creating a new message, and when replying to a message always use the
        // same protocol protocol it received the message from.
        if(!protocol) {
            // since protocol arg is missing the protocol layer is picked automatically...
            const type = typeof remote;
            if(type === 'string') {
                // ...because remote is specified using an URL,
                // its possible to select procotol by looking at the URL type.
                const
                    url = remote,
                    toOrl = createOrl(url);
                remote = {};
                if(toOrl.isClearnet) remote.cn = url;
                else if(toOrl.isOnion) remote.onion = url;
                protocol = {isOnion: toOrl.isOnion, isClearnet: toOrl.isClearnet};
            } else if(type === 'object') {
                // ...because remote is not dictating protocol its possible to pick
                // the most suitable protocol. the most suitable protocol is one
                // which both nodes speaks but the local node user prefers
                const sortedProtocols = sortEnabledProtocols(preferences.protocols);
                for(let i = 0, p; i < sortedProtocols.length; i++) {
                    p = sortedProtocols[i].name;
                    if(remote[p] && local[p]) {
                        if(p === 'onion') protocol = {isOnion:true, isClearnet: false};
                        else if(p === 'cn') protocol = {isOnion:false, isClearnet: true};
                        else throw new Error(`unknown protocol(${p})`);
                        break;
                    }
                }
            }
        }

        if(!protocol) throw new Error(`unable to find common protocol for remote(${remote}) and local(${local}) node`);

        let to, from;
        if(protocol.isOnion) {
            to = remote.onion;
            from = local.onion;
        } else if(protocol.isClearnet) {
            to = remote.cn;
            from = local.cn;
        }

        //console.log({remote, local, protocol});
        if(!to) throw new Error(`protocol layer mismatch. falsy To address`);
        if(!from) throw new Error(`protocol layer mismatch. falsy From address.`);

        return {to, from};
    };

    async function protocolPreferenceAsync(list) {
        if(list) {
            copyProps(list, preferences.protocols, {maxSize:10100});
            await grapevineStore.setAsync(PREFERENCES, preferences);
        }
        return preferences.protocols;
    }

    async function uploadManagerPreferenceAsync(o) {
        if(o) {
            copyProps(o, preferences.uploadManager, {maxSize:10100});
            await grapevineStore.setAsync(PREFERENCES, preferences);
            restartUploadManager();
        }
        return preferences.uploadManager;
    }

    return {
        on,
        getNetworkRetriever: () => networkRetriever,
        getQuotaRetriever: () => quotaRetriever,
        getTreeRetriever: () => treeRetriever,
        getSignerRetriever: () => signerRetriever,
        getUploadManager: () => uploadManager,
        getTrackedNotesBillboard: () => trackedNotesBillboard,
        getTrackedSignersBillboard: () => trackedSignersBillboard,
        // node
        getNodeIdAsync,
        createNodeAsync,
        updateProfileAsync,
        getProfileAsync,
        getPublicProfileAsync,
        // network
        getNetwork: () => network,
        toFrom,
        protocolPreferenceAsync,
        uploadManagerPreferenceAsync,
        connectNodeAsync: network.createConnectionAsync,
        connectNodeProgress: network.getConnectingNodeProgress,
        addNodeBannerAsync: network.addNodeBannerAsync,
         // peer
        getPeerManager: () => peerManager,
        hasPeer: peerManager.hasPeer,
        destroyPeerAsync: peerManager.destroyPeerAsync,
        getPeerProxies: peerManager.getPeerProxies,
        getPeerProxy: peerManager.getPeerProxy,
        // messaging
        restartUploadManager,
        createEnvelopeAndSendAsync,
        handleEnvelopeAsync,
        // note
        allNoteScoresAsync,
        // TODO
        // debug
        debug: {
            debugId: log?.name
        }
    };
};

