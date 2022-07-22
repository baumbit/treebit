import {Bar} from './bar.js';
import {Icon} from './tugs.js';
import {createArrayList} from './infinite-list.js';
import {eachAsync} from '../../oo/utils.js';

export function Dev({oo, css, go}, {ßdev, log, cueClose}) {
    let menu;

    const
        { grapevine, canopy, config } = ßdev,
        arr = [],
        add = (title, handleClick) => arr.push({title, handleClick: () => {
            console.log('DEV : ' + title);
            handleClick();
        }}),
        peerProxies = async (cb) => {
            await grapevine.getPeerProxies().eachAsync(async peerProxy => {
                await cb(peerProxy);
            });
        };

    const
        signerMap = {},
        addSigner = async (peerProxy, signerId) => {
            if(signerMap[signerId]) return;
            signerMap[signerId] = {}; // TODO impl re-create functions on refresh

            const id = signerId.substring(0, 7);

            add(`retrieveSignerAsync:${id}`, async () => {
                await grapevine.getSignerRetriever().retrieveSignersAsync({peerProxy, signerIds:[signerId]}).catch(log.e);
            });

            add(`retrieveSignerNoteScoresAsync:${id}`, async () => {
                const scores = await grapevine.getSignerRetriever().retrieveSignerNoteScoresAsync({peerProxy, signerId, limit:1}).catch(log.e);
                log(`retrieveSignerNoteScoresAsync:${id} result:`, {scores});
            });

            add(`retrieveSignerNotesAsync:${id}`, async () => {
                const notes = await grapevine.getSignerRetriever().retrieveSignerNotesAsync({peerProxy, signerId, limit:1}).catch(log.e);
                log(`retrieveSignerNotesAsync:${id} result:`, {notes});
            });
        };

    add('startPolling', () => {
        peerProxies(async peerProxy => {
            peerProxy.getRetriever().startPolling();
        });
    });


    add('retrievePeers', () => {
        peerProxies(async peerProxy => {
            await ßdev.grapevine.getNetworkRetriever().retrievePeers({peerProxy, limit:10}).catch(log.e);
        });
    });

    add('retrieveByPeerBestScoresAsync, retrieveByPeerBestNotesAsync', () => {
        peerProxies(async peerProxy => {
            await grapevine.getTreeRetriever().retrieveByPeerBestScoresAsync({peerProxy, limit:config.DOWNLOAD_MAX_SCORES}).catch(log.e);
            const notes = await grapevine.getTreeRetriever().retrieveByPeerBestNotesAsync({peerProxy, limit:config.DOWNLOAD_MAX_NOTES}).catch(log.e);
            if(notes) {
                await eachAsync(notes, async (noteId) => {
                    const {note:{signerId}} = await ßdev.canopy.grabNodeAsync(undefined, noteId); //console.log({note});
                    await addSigner(peerProxy, signerId);
                });
                menu.list.refresh();
            }
        });
    });

    add('retrieveTrackedNotesAsync', () => {
        peerProxies(async peerProxy => {
            await grapevine.getTreeRetriever().retrieveTrackedNoteScoresAsync({peerProxy}).catch(log.e);
            await grapevine.getTreeRetriever().retrieveTrackedNotesAsync({peerProxy}).catch(log.e);
        });
    });

    add('retrieveByPeerBestTrackedNotesAsync', () => {
        // the best of the notes, that the peer itself is following.
        peerProxies(async peerProxy => {
            await grapevine.getTreeRetriever().retrieveByPeerBestTrackedNotesAsync({peerProxy}).catch(log?.e);
        });
    });

    add('retrieveTrackedSignersAsync, retrieveTrackedSignersNotesAsync', () => {
        peerProxies(async peerProxy => {
            const singersResult = await ßdev.grapevine.getSignerRetriever().retrieveTrackedSignersAsync({peerProxy}).catch(log.e);
            const signersNotesResult = await grapevine.getSignerRetriever().retrieveTrackedSignersNotesAsync({peerProxy}).catch(log.e);
            log({singersResult, signersNotesResult});
        });
    });

    add('Create mockup tree', () => {
        canopy.debug.createMockupTree()();
    });

    menu = createArrayList(oo, arr, (oo, {title, handleClick}) => oo('span', title).onclick(handleClick), undefined, 'Development', 'zdev');

    oo(Icon, 'close').style({position:'absolute',right:0}).onclick(() => {
        cueClose();
        go('/');
    });
};

