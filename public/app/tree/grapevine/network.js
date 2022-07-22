/**
 * a network node is a node that exists on the treebit but which is unconnected.
 * when a connection has been created, the node is referred to as a peer.
 * because there the is (likely) no prior knowledge of the identity of a network node,
 * the only thing that can be known for certain is its URL (clearnet or onion).
 * from the viewpoint of the handshake mechanism here, no specific identity is
 * expected behind the URL, hence there can be no man-in-the-middle. once a connection
 * has been established communication between the two connected peers are signed,
 * to protect against identity spoofing. while a incredible amount of friction would
 * be created it is theoretically possible to use this procedure to create a connection
 * and exchange securely, even transferring messages on an un-secure channel such as
 * USB-sticks. since its impossible to verify that a specific onion and clearnet URL is
 * controlled by same identity, the two are separated into two groups. once a conneciton
 * has been created, its possible to tie these to together.
 * note: a node should NEVER be identified by its URL. a bad node may change its URL
 * after nodes become friends.
 */
import OO from '../../oo/oo.js';
import {verifyGrapevineEnvelopeAsync, generateNodeIdAsync} from '../crypto-tree.js';

const DEBUG = false;

export const
    HANDSHAKE = 'grapevine:HANDSHAKE';

const
    INIT = 2,
    RESPOND = 3;

export async function createNetworkAsync(ß, log) {

    const
        // memory
        connectionTrackers = {},
        // network nodes
        onionBannerLufo = await ß.storage.getAsync({name: `/grapevine/network/onionbanner`, persistent:true, lufo:true}), // TODO max size
        clearnetBannerLufo = await ß.storage.getAsync({name: `/grapevine/network/clearnetbanner`, persistent:true, lufo:true}); // TODO max size
    // === begin connection - a 3 step procedure ===

    // step 1 - setup and initiate handshake
    // first step is invoked by the node itself and results in a message being sent...
    async function createConnectionAsync(nrlUrl, expectedId) {
        const
            profile = await ß.grapevine.getPublicProfileAsync(),
            {to, from} = ß.grapevine.toFrom(nrlUrl, profile);

        const
            tracker = await createConnectionTracker(expectedId),   // handshake: RESPOND
            {trackerId} = tracker;
        const data = {
            privateKey: await ß.grapevine.getProfileAsync('privateKey'), // used for signing envelope
            encryptKey: null, // the foreign node encryption key is not yet known
            message: {
                to,
                type: HANDSHAKE,
                data: {
                    step: INIT,
                    // note: trackerId is susceptible to a MITM attack because channel might be insecure,
                    // but it does not matter much because this is mostly for tracking/progress
                    // purposes and worst case a new connection attempt have to be made (which
                    // could happen anyway because of other errors).
                    trackerId,
                    profile
                },
                from,
                created: Date.now()
            }
        }; //console.log({profile, envelopeData});
        try {
            ß.grapevine.createEnvelopeAndSendAsync(data);
        } catch (e) {
            log?.w('createConnection failed', e.message);
            tracker.isError = true;
        }
        //console.log('step1Async done');
        return getConnectingNodeProgress(trackerId);
    }

    // ...and the rest of the steps are invoked as messages arrives
    async function handleEnvelopeHandshakeAsync(envelope, protocol) { // TODO add protocol{onion,clearnet} to server to progate futher
        await tryHandshakeIntegrityAsync(envelope);
        const message = envelope.message;
        message.protocol = protocol;
        if(message.data.step === INIT) await step2Async(message);
        else if(message.data.step === RESPOND) await step3Async(message);
    }

    async function tryHandshakeIntegrityAsync(envelope) {
        const {message} = envelope;
        if(!message) {
            throw new Error('envelope contained no message');
        }
        // TODO harden verify all of the expected properties
        const profile = message.data.profile;
        if(!await verifyGrapevineEnvelopeAsync({publicKey: profile.publicKey, envelope})) {
            log?.w('Handshake envelope verification failed.', {message, envelope});
            throw new Error('failed verification');
        }
        const
            expectedId = await generateNodeIdAsync(profile.publicKey),
            id = profile.id;
        if(expectedId !== id) {
            log?.w('Handshake id mismatch', {message, id, expectedId});
            throw new Error('id mismatch');
        }
        return true;
    }

    // step 2
    async function step2Async(inMessage) {
        // TODO harden against peer request flooding
        //          ask in client
        //          have a few slots where new can be added and reject when full
        //          this will impact how createConnection timeout
        const
            profile = await ß.grapevine.getPublicProfileAsync(),
            {data:inn, protocol} = inMessage;
        if(inn.profile.id === profile.id) {
            log?.w('bad message. network node told node to add itself as a peer', {inMessage});
            return; // just ignore message
        }

        const {to, from} = ß.grapevine.toFrom(inn.profile, profile, protocol);
        const data = {
            privateKey: await ß.grapevine.getProfileAsync('privateKey'),
            encryptKey: inMessage.data.profile.encryptKey,
            message: {
                to,
                type: HANDSHAKE,
                data: {
                    step: RESPOND,
                    trackerId: inn.trackerId, // if not answering truthfully, connection can not be established
                    profile
                },
                from,
                created: Date.now()
            }
        };

        const peerProxy = await addAsPeer(inn.profile);

        if(DEBUG) {
            console.log('DEBUG: create artificial latency');
            await new Promise((res)=> { setTimeout(() => { console.log('******* delay done *********'); res(); }, 1000*10)});
        }

        ß.grapevine.createEnvelopeAndSendAsync(data).catch((e) => {
            log?.w('Handshake failed at step 1', e.message);
            throw e;
        });

        //console.log('step2Async done: response to handshake initiation was sent successfully');
        return peerProxy;
    }

    async function addAsPeer(profile) {
        const id = profile.id;
        let peerProxy = ß.grapevine.getPeerManager().getPeerProxy(id);
        if(peerProxy) {
            // peer already existed. this might happen if a node destroys its relationship with a peer without
            // annonuncing it (perhaps due to a computer crash) and then initiates a new handshake.
            // if so there is no need to destroy permanent storage associated with peer, but since the url
            // and or other profile data might have changed, a new peer can be created (it will use the same stores
            // because those are created using the peer id).
            log?.n(0, 're-adding peer', id);
            await peerProxy.destroyAsync({destroyStores:false});
        }
        // add
        peerProxy = await ß.grapevine.getPeerManager().createPeerAsync(profile); //peerProxies[id] = peerProxy;
        return peerProxy;
    }

    // step 3
    async function step3Async(inMessage) {
        const
            profile = await ß.grapevine.getPublicProfileAsync(),
            {data:inn, protocol} = inMessage;
        if(inn.profile.id === profile.id) {
            log?.w('bad message', {inMessage});
            throw new Error(`network node told node to add itself as a peer.`);
        }

        // verify that local node initiated the handshake by verifying that
        // the remote peer knew the trackerId. while the trackerId is susceptible
        // to a MITM, the MITM can not inpersonate the real node identity.
        // at most MITM can only outcompete the real target and become a peer instead.
        // however, if the MITM turns out to not be well-behaving peer, it will
        // be kicked off anyway. also a new attempt at connecting to the
        // peer is always possible.
        const {trackerId} = inn;
        if(!trackerId) throw new Error(`missing trackerId(${inn})`);
        const tracker = connectionTrackers[trackerId];
        if(!tracker) throw new Error(`missing tracker(${trackerId})`);
        tracker.updated = Date.now();
        if(tracker.expectedId && tracker.expectedId !== inn.profile.id) throw new Error(`expected id(${tracker.expectedId}) did not match received id(${inn.profile.id})`);
        tracker.isSuccess = true;
        tracker.profile = inn.profile;

        //console.log('step3Async done');
        await addAsPeer(inn.profile);
    }

    function createConnectionTracker(expectedId, timeoutMs=1000*30) {
        let trackerId = Date.now() + '_' + Math.floor(Math.random()*1000000);
        if(connectionTrackers[trackerId]) throw new Error(`random fluke`);
        // a timeout is created that destroys this tracker autamatically,
        // to ensure that if messages are lost and connection failed,
        // it will clean itself up
        let timeoutId;
        const destroy = () => {
            if(trackerId) delete connectionTrackers[trackerId];
            if(timeoutId) OO.timeout.clear(timeoutId);
            trackerId = null;
            timeoutId = null;
        };
        timeoutId = OO.timeout(timeoutMs, destroy);
        const o = {
            updated: Date.now(),
            expectedId,
            trackerId,
            destroy
        };
        connectionTrackers[trackerId] = o;
        return o;
    }

    function getConnectingNodeProgress(trackerId) {
        //console.log('getConnectingNodeProgress', trackerId);
        const tracker = connectionTrackers[trackerId];
        return {
            ...tracker,
            isExists: !!tracker,
            trackerId
        };
    }

    // === end connection - a 3 step procedure ===

    function createNetworkNodeId(url) {
        if(!url) throw new Error(`url(${url}) was falsy`);
        // network nodes are nodes, not yet connect to (at which point the become peers).
        // even though its theoretically possible to remember network nodes using their ID,
        // this would introduce an attack vector, where evil peers announce bad ID/ADDRESS pairs,
        // which could introduce issues when conneting. since it should be possible to connect
        // to a network node without knowing its ID in advance, it makes sense to store it using
        // an id derived from the url.
        return 'id' + OO.hashcode(url); // TODO harden: make sure bad URLS, will not break hashcode somehow
    }

    async function addOnionBannerAsync(banner) { //console.log('banner', {banner});
        const id = createNetworkNodeId(banner.url);
        await onionBannerLufo.addAsync(id, banner);
    }

    async function addClearnetBannerAsync(banner) {
        const id = createNetworkNodeId(banner.url);
        await clearnetBannerLufo.addAsync(id, banner);
    }

    async function eachOnionBannerAsync(index, cb) {
        return onionBannerLufo.eachValueAsync({index}, async (o) => {
            return cb(o);
        });
    }

    async function eachClearnetBannerAsync(index, cb) {
        return clearnetBannerLufo.eachValueAsync({index}, async (o) => {
            return cb(o);
        });
    }

    async function addNodeBannerAsync(banner) {
        if(!banner.name) banner.name = 'node';
        if(banner.onion) await addOnionBannerAsync({name: banner.name, description: banner.description, url: banner.onion});
        if(banner.cn) await addClearnetBannerAsync({name: banner.name, description: banner.description, url: banner.cn});
    }

    return {
        createConnectionAsync,
        handleEnvelopeHandshakeAsync,
        addClearnetBannerAsync,
        addNodeBannerAsync,
        addOnionBannerAsync,
        eachOnionBannerAsync,
        eachClearnetBannerAsync,
        getConnectingNodeProgress
    };
};

