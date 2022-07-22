import {createStorage} from './storage.js';
import {createCabinetAsync} from './cabinet.js';
import {createFeedManagerAsync} from './feed-manager.js';
import {createCanopyAsync} from './canopy/canopy.js';
import {createGrapevineAsync} from './grapevine/grapevine.js';

export async function createBAsync({
        nrl,                // internet reachable node specific addresses cn (clearnet), onion (tor)
        config,             // hardcoded generic node configuration
        nodeCredentials,    // unique cryptographic
        messenger,          // (a shimable) network communication interface/facade between server-side app and platform
        appId,              // identifier used by hotel to dentifty the node internally
        tag,                // arbitrary and user-friendly (non-techincal use)
        log                 // devops
    }) { //console.log('createBAsync', ...arguments);

    if(!nodeCredentials) throw new Error(`bad nodeCredentials(${nodeCredentials})`);

    // ß is a helper object that exists during runtime.
    // it is used to mitigate code cluttering and provide
    // a "singleton like" developer experience local to a
    // node instance.
    const ß = {appId, config, log};
    ß.ß = ß;

    ß.storage = createStorage(ß, appId);
    ß.feedManager = await createFeedManagerAsync(ß);
    ß.cabinet = await createCabinetAsync(ß);
    ß.canopy = await createCanopyAsync(ß);
    ß.grapevine = await createGrapevineAsync(ß);

    ß.setMessenger = (messenger) => { ß.messenger = messenger; };
    ß.setOO = (oo) => ß.oo = oo;

    await ß.grapevine.createNodeAsync({...nodeCredentials, ...nrl});

    ß.startAsync = async () => {
        const
            uploadManager = await ß.grapevine.getUploadManager(),
            {autoStart} = await ß.grapevine.uploadManagerPreferenceAsync();
        if(autoStart) ß.grapevine.restartUploadManager();
    };

    return ß;
};

