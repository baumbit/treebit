import {feeds} from './feed-manager.js';

// harden: ensure params are escaped, because they will be used as keys etc in code
export function createResourceApi(/*{ondemand=true},*/ addRoute) {
    //if(!ondemand) log?.n(0, '#ff5555', `Server ondemand resource api is disabled`);
    //const
    //    {addRoute, router:resourceRouter} = createResourceRouter(),
    const
        res = (s,cb,subRoute) => {
            if(s.indexOf(':GET') > 0 || s.indexOf(':DROP') > 0 || s.indexOf(':SET') > 0  || s.indexOf(':SEND') > 0)  {
                log.e('malformed resource route. using reserved keywords as path names', s);
                return;
            }
            addRoute('res' + s, cb, subRoute); //console.log('adding route', 'res'+s);
                    // TODO log is now in obj.log function(){log?.n(0,`[res/${s}]`.toUpperCase(),...arguments);});
        };

    // example:
    // res('path/:seg1/:seg2',({grapevine,log},done,{seg1,seg2,DROP},receivedUrlSearchParams,dataReceivedFromClient)=>{
    //     if(DROP) grapvine.remove(receivedUrlSearchParams.id, done);
    //     else if(!dataReceivedFromClient) done(undefined, 'error because no data received');
    //     else done(foo.getItem(seg1));
    // };

    res('/hotel/destroy/app', async ({ß, hotel}, done) => {
        await hotel.destroyAppAsync(ß.appId);
        done(true);
    });

    res('/hotel/public/info', async ({hotel}, done) => {
        const info = hotel.getPublicInfo();
        done(info);
    });

    res('/hotel/network/node/:id/profile', async ({hotel}, done, {id}, {}) => {
        const profile = await hotel.getNetworkNodeProfileAsync(id);
        if(profile) done(profile);
        else done(undefined, 'missing node');
    });

    res('/hotel/network/nodes', async ({hotel, grapevine}, done, {}, {filter/*connected|unconnected*/, index=0, count=10}) => {
        const nodeId = await grapevine.getNodeIdAsync(); // do not include the node itself.
        const page = await hotel.getNetworkNodesAsync(parseInt(index, 10), parseInt(count, 10), ({id}) => {
            if(nodeId === id) return false;
            else if(filter === 'connected') return grapevine.hasPeer(id);
            else if(filter === 'unconnected') return !grapevine.hasPeer(id);
            else return true;
        });
        done(page);
    });

    res('/compose', async ({canopy, log}, done, {}, {}, signedNote) => {              log({signedNote});
        const noteNode = await canopy.addNoteAsync(signedNote, 'top', undefined, 1).catch(console.error);
        const noteResource = await createNoteResourceAsync(canopy, noteNode); //console.log({noteRes});
        done(noteResource);
    });

    res('/tree/node/:noteId', async ({canopy}, done, {noteId}, {sort}) => { //log('tree/node/'+noteId);
        //setTimeout(()=>{
        const noteNode = await canopy.grabNodeAsync(sort, noteId);
        if(noteNode) done(await createNoteResourceAsync(canopy, noteNode));
        else done(true, 'note not found');
        //}, 2000);
    });

   res('/topmost/notes', async ({canopy}, done, {}, {max}) => {
        const arr = [];
        await canopy.eachTopmostAsync(({noteNode, score}, i) => {                      //console.log('----->', i, noteNode);
            arr.push(noteNode.note.noteId);
            if(max && i+1 >= max) return false;
        });                                                                 //console.log({arr});
        done(arr);
    });

    res('/topmost/signers', async ({canopy}, done) => {
        const arr = [];
        await canopy.eachSignerProxyAsync(0, (o) => {
            arr.push(o.getSignerId());
        });
        done(arr);
    });

    res('/signer/:signerId/profile', async ({ß, grapevine, canopy, log}, done, {signerId}) => {
        done(await canopy.getSignerAsync(signerId));

        if(ß.config.SERVER_RESOURCE_API_ONDEMAND_DISABLED) return;
        let controller;
        await grapevine.getPeerProxies().eachAsync(async peerProxy => {
            controller = createController(controller);
            await grapevine.getSignerRetriever().retrieveSignersAsync({peerProxy, signerIds:[signerId], controller}).catch(log.e);
        });
    });

    res('/signer/:signerId/notes', async ({ß, grapevine, canopy}, done, {signerId}, {noteId, limit}) => { //console.log({signerId, noteId, limit});
        if(!signerId) return done('missing signerId', true);

        const
            signerProxy = await canopy.grabSignerProxyAsync(signerId),
            list = signerProxy ? await signerProxy.getNoteListAsync(noteId/*start filling after this key*/, parseInt(limit, 10)) : [];

        const page = {
            next: list.length ? list.length : null /* loop to begin */,
            list
        }
        done(page);

        if(ß.config.SERVER_RESOURCE_API_ONDEMAND_DISABLED) return;
        let controller;
        await grapevine.getPeerProxies().eachAsync(async peerProxy => {
            controller = createController(controller);
            await grapevine.getSignerRetriever().retrieveSignerNotesAsync({peerProxy, signerId, controller});
        });
    });

    res('/follow/signer/:signerId', async ({canopy}, done, {signerId}, {}, follow, log) => {               //log('signerId:'+signerId);
        if(follow !== undefined) {
            if(follow === false) await canopy.unfollowSignerAsync({signerId});
            else if(follow === true) await canopy.followSignerAsync({signerId});
        }
        const isFollowing = await canopy.isFollowingSignerAsync({signerId}); //console.log({isFollowing, follow});
        done(isFollowing);
    });

    res('/follow/list/signers', async ({canopy}, done) => { // TODO add paging
        const arr = [];
        await canopy.eachFollowedSignerAsync(async (o) => {
            arr.push(o);
        });
        done(arr);
    });

    res('/follow/note/:noteId', async ({canopy}, done, {noteId}, {}, follow) => {
        if(follow !== undefined) await canopy.followNoteAsync(noteId, follow);
        const isFollowing = await canopy.isFollowingNoteAsync({noteId}); //console.log({isFollowing, follow});
        done(isFollowing);
    });

    res('/follow/list/notes', async ({canopy}, done) => { // TODO add paging
        const arr = [];
        await canopy.eachFollowedNoteAsync(async (o) => {
            arr.push(o); 
        });
        done(arr);
    });

    res('/node/profile', async ({grapevine}, done, {}, {}, profile) => {
        if(profile) await grapevine.updateProfileAsync(profile);
        done(await grapevine.getProfileAsync());
    });

    res('/node/preferences/protocols', async ({grapevine, log}, done, {}, {}, list) => {
        list = await grapevine.protocolPreferenceAsync(list);
        done(list);
    });

    res('/node/preferences/uploadmanager', async ({grapevine, log}, done, {}, {}, o) => {
        o = await grapevine.uploadManagerPreferenceAsync(o);
        done(o);
    });

    res('/node/uploadmanager', async ({grapevine, log}, done, {}, {}, o) => {
        const
            uploadManager = await grapevine.getUploadManager(),
            preferences = await grapevine.uploadManagerPreferenceAsync();
        if(o) {
            if(o.running) uploadManager.start(preferences);
            else if(!o.running) uploadManager.stop();
        }
        const running = uploadManager.isRunning();
        done({running});
    });

    res('/network/nodes', async ({grapevine, log}, done, {}, {protocol='onion'/*cn|onion*/,filter, index=0, count=10, max=8}) => {
        count = parseInt(count, 10);
        const list = [];
        const f = protocol.toLowerCase() === 'cn' ? grapevine.getNetwork().eachClearnetBannerAsync : grapevine.getNetwork().eachOnionBannerAsync;
        await f(parseInt(index, 10), (banner) => {
            list.push(banner);
            if(list.length >= count) return false;
        });
        const page = {
            next: list.length ? list.length + 1 : null /* loop to begin */,
            list
        }
        done(page);
    });

    res('/network/refresh', async ({grapevine, log}, done, {}, {max=8}) => {
        const id = await grapevine.getNodeIdAsync();
        let controller;
        await grapevine.getPeerProxies().eachAsync(async peerProxy => {
            if(id !== peerProxy.getPublicProfile().id) {
                controller = createController(controller);
                await grapevine.getNetworkRetriever().retrievePeers({peerProxy, max, controller}).catch(log.e);
            }
        });
        done();
    });

    res('/network/connect/to', async ({grapevine, log}, done, {SEND}, {}, {url, nrl, id}) => { //log({url});
        if(SEND) {
            try {
                const o = await grapevine.connectNodeAsync(nrl || url, id);
                done(o);
            } catch(e) {
                log(e.message);
                done(undefined, `error adding peer ${url}. check server logs`);
            }
        }
    });

    res('/network/connect/tracker/:trackerId', async ({grapevine, log}, done, {trackerId}) => {console.log(trackerId);
        done(await grapevine.connectNodeProgress(trackerId));
    });

    res('/peers', async ({grapevine, log}, done) => { //L('----', {GET, SET});
        const peers = {};
        await grapevine.getPeerProxies().eachAsync(peerProxy => {
            const profile = peerProxy.getPublicProfile();
            peers[profile.id] = profile;
        }); //console.log('->', peers);
        done(peers);
    });

    res('/peer/identity/:id', async ({grapevine}, done, {id, DROP, SEND}, {reset}, data) => { //L('--->', {id, peerProfile, DROP});
        const peerProxy = grapevine.getPeerProxy(id); //L(peerProxy.getPublicProfile());
        if(peerProxy) { console.log({SEND, reset});
            if(SEND) { // reset
                if(reset === 'true') {
                    await peerProxy.resetAsync(); // TODO refactor destroyStores to client
                    done(true);
                }
             } else if(DROP) { // destroy
                await peerProxy.destroyAsync({destroyStores:true, ...data}); // TODO refactor destroyStores to client
                done(true);
            } else {
                done(peerProxy.getPublicProfile());
            }
        } else {
            done(undefined, 'not found'); // TODO add a 404); // 
        }
    });

    res('/peer/setting/:id', async ({grapevine}, done, {id}, {}, setting) => {
        const peerProxy = grapevine.getPeerProxy(id);
        if(peerProxy) {
            if(setting) await peerProxy.updateSettingAsync(setting);
            done(peerProxy.getSetting());
        } else {
            done(undefined, 'not found'); // TODO add a 404); // 
        }
    });

    res('/peer/info/:id', ({grapevine}, done, {id}) => {
        const peerProxy = grapevine.getPeerProxy(id);
        if(peerProxy) {
            done(peerProxy.getInfo());
        } else {
            done(undefined, 'not found'); // TODO add a 404); // 
        }
    });

    res('/ping/peer/:id', async ({grapevine}, done, {id}, {}, data) => {
        const peerProxy = grapevine.getPeerProxy(id); //L(peerProxy);
        const inMessage = await peerProxy.pingAsync(data).catch(({err, msg}) => {
            alert(`Pong from ${peerProxy.id}\r\n\r\nError: ${err}\r\n${msg}`);
        });
        done(inMessage.data);
    });

    res('/cabinet/signers', async ({cabinet}, done) => {
        const signers = await cabinet.getSignersAsync(true);
        done(signers); // excluding the default signer
    });

    res('/cabinet/signer/:id', async ({cabinet}, done, {SET, DROP, id}, {}, signer) => { //console.log({signer});
        if(DROP) {
            await cabinet.deleteSignerAsync(id);
            done();
            return;
        }
        if(SET) await cabinet.addSignerAsync(signer); // add/update
        signer = await cabinet.getSignerAsync(id);
        done(signer);
    });

    res('/cabinet/signerpriv/:id', async ({cabinet}, done, {DROP, id}, {}, priv) => {             //console.log('signerpriv', {id, priv});
        if(DROP) {
            await cabinet.deleteSignerPrivAsync(id);
            done();
            return;
        }
        if(priv) await cabinet.setSignerPrivAsync(id, priv); // add/update
        else priv = await cabinet.getSignerPrivAsync(id);
        done(priv);
    });

    res('/cabinet/defaultsignerid', async ({cabinet}, done, {SET}, {}, id) => {
        if(SET) await cabinet.setDefaultSignerIdAsync(id);
        id = await cabinet.getDefaultSignerIdAsync();
        done(!id ? false : id);
    });

    res('/card/note/:noteId', async ({canopy}, done, {noteId}, {sort}) => {
        let noteNode = await canopy.grabNodeAsync(sort, noteId);
        if(noteNode) {
            const signerId = noteNode.note.signerId;
            let card = {signerId};
            card.noteId = noteNode.note.noteId;
            card.ms = noteNode.note.data.ms;
            card.text = noteNode.note.data.text;
            card.prev = noteNode.note.data.prev;
            card.children = await canopy.grabSortedChildrenAsync(null, card.noteId).catch(console.error);
            card.siblings = await canopy.grabSortedChildrenAsync(null, card.prev);
            card.score = await canopy.getNoteScoreAsync(noteNode);
            const signer = await canopy.getSignerAsync(card.signerId);
            card.signerName = signer.data.name; //console.log({card, signer});
            card.isFollowing = await canopy.isFollowingSignerAsync({signerId});
            done(card);
        }
        else done(true, 'note not found');
    });

    res('/card/signer/:signerId', async ({canopy}, done, {signerId}, {/*TODO ? sort*/}) => {
        const signer = await canopy.getSignerAsync(signerId); //console.log(signerId, signer);
        if(signer) {
            let card = {...signer};
            if(!card.data.name) card.data.name = 'incognito';
            card.isFollowing = await canopy.isFollowingSignerAsync({signerId});
            done(card);
        }
        else done(true, 'note not found');
    });

    feeds.forEach(({path}) => {
        res('/feed/' + path, async ({feedManager}, done, {}, {key, count=10, reverse}) => {  //console.log({feedManager, key, count, reverse});
            const o = await feedManager.getListAsync(path, key, count, reverse).catch(console.error);
            done(o);
        });
    });

    //res('/cabinet/defaultsignerid', async ({cabinet}, done, {SET}, {}, id) => {
    //    if(SET) {
    //        if(id === false) await cabinet.setDefaultSignerIdAsync(false);
    //        else await cabinet.setDefaultSignerIdAsync(id);
    //    }
    //    id = await cabinet.getDefaultSignerIdAsync();
    //    done(id);
    //});
};

function createController(controller) {
    controller?.abort?.();
    controller = {
        ondemand: true
    };
    return controller;
}

async function createNoteResourceAsync(canopy, noteNode) { //T({noteNode});
    const o = {...noteNode};
    //asd++; data.note.data.text = '*'+asd+'*' + data.note.data.text;
    // and it depends on wheter cabinet have "seen" the notes before or not, hence
    // it is also a question about cabinet-sessions.
    o.children = await canopy.grabSortedChildrenAsync(null, noteNode.note.noteId);
    o.siblings = await canopy.grabSortedChildrenAsync(null, noteNode.note.data.prev);
    return o;
}

