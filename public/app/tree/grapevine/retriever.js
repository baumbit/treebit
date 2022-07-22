/**
 * there are two types of strategies for donwloading data: poll and ondemand.
 * when a user is scrolling around and clicking on stuff, this typically triggers ondemand download.
 * when a user does nothing and app is idling and data is downloaded in the background, this is called polling.
 * since both strategies consume quota and its impossible to know when an ondemand action will need to consume data,
 * the polling is streched out so that it tries to leaves a little bit of quota left for ondemand, untill the download
 * window closes. when the download window closes, all the quota is refilled (its impossible to carry quota forward to the
 * next window). the peer decides when the download window opens and closes.
 */

// TODO handle clock drift
const
    DBEUG_AUTOMATIC_RETRIEVAL = true;

const
    RETRIEVE_RETRY_SECOND = 1000 * 3,
    CONSUME_ALL_MS = 2,
    ERROR_ATTEMPTS = 'ERROR_ATTEMPTS';

import {NOT_ENOUGH_QUOTA} from './replier.js';


export function createRetriever(ß, peerProxy, log) {
    let queue = [],
        clearTimeout,
        quota;

    const MAX_ATTEMPT = 3; // TODO refecator to ß.config

    function zero(a) {
        return !(a > 0);
    }

    async function createAndExchangeMessageAsync({type, data:outData, attempt=1, controller, cb}) {
        // XXX
        // only retrieval attempts with a controller attatched,
        // will retry if there is an error. this because if a
        // controller can not abort, the quotaa is not enough
        // and the refill is far between an un-userfriendly
        // latency might be result
        let inData = {error: ERROR_ATTEMPTS},
            isRetry;
        while(attempt > 0) {
            let now = Date.now(),
                delayMs, refill;
            if(controller) {
                if(quota) {
                    refill = quota.start + quota.duration;
                    let {earned, grace, available} = quota;
                    if(inData.error === NOT_ENOUGH_QUOTA || zero(available)) {
                        //log('wait: not enough quota', {isRetry});
                        // not enough quota,
                        // try sending message after next refill
                        if(zero(refill)) delayMs = RETRIEVE_RETRY_SECOND;
                        else delayMs = refill - now;
                    }
                }
                if(controller.isAbort) break; // no need to wait if aborted
                if(delayMs > 0) {
                    log?.n(2, '#696969', `Wait ${delayMs}, ${new Date(Date.now()+delayMs)}. refill: ${new Date(refill)}`);
                    await ß.oo.timer(delayMs, {promise:true}); //await new Promise(r => setTimeout(r, delayMs));
                }
                if(controller.isAbort) break; // no need to retrieve if aborted
            }
            const
                outMessage = await peerProxy.createMessageAsync(type, outData),
                inMessage = await peerProxy.exchangeMessageAsync(outMessage).catch(log?.c);
            inData = inMessage.data;
            if(!inData) {
                console.error({inMessage});
                throw 'bad reply. inData missing';
                break;
            }
            quota = inData.quota;
            if(!controller) break;

            isRetry = inData.error === NOT_ENOUGH_QUOTA;
            if(!isRetry) {
                break;
            }
            attempt--; // loop
            if(attempt > 0) log?.n(2, '#696969', `Retry: ${MAX_ATTEMPT-attempt}/${MAX_ATTEMPT} ${type}`, inData);
        }
        if(controller) controller.isDone = true;
        if(cb) cb(inData);
        return inData;
    }

    async function processQueueAsync() { //console.trace();
        // will loop until queue is empty
        const o = queue.pop();
        if(o) {
            await createAndExchangeMessageAsync({...o}).catch(log?.c);
            ß.oo.timer(0, processQueueAsync); //setTimeout(processQueueAsync, 0);
        }
    }

    async function retrieveAsync({type, data, attempt, controller}) { //console.trace();
        return await new Promise(r => retrieve({type, data, attempt, controller}, r));
    }

    function createController(controller={}) {
       return o;
    }

    function retrieve({type, data, attempt, controller, globalController}, cb) {
        if(controller || globalController) {
            if(!controller) controller = {};
            if(controller.abort) log.e('abort function exists', {controller});
            if(controller.onAbort) log.e('onAbort function exists', {controller});
            if(globalController && globalController.ondemand !== controller.ondemand) log.e('mismatching controllers', {controller, globalController});
            if(globalController) controller.ondemand = globalController.ondemand;
            if(!controller.stack) controller.stack = [];
            if(globalController) globalController.stack.push(controller);
            controller.onAbort = () => {
                controller.stack.forEach(controller => controller.abort());
            };
            controller.abort = () => {
                controller.onAbort?.();
                if(!controller.isDone) log.w('aborted', {type, data, attempt, controller});
                controller.isAbort = true;
                const i = queue.findIndex(elm => elm === o);
                if(i >= 0) {
                    queue.splice(i, 1);
                }
            };
        }
        const o = {type, data, controller, cb};
        queue.push(o);
        // ondemand is always implicit, explicit set to false will queue retrieval
        if(!controller || (controller.ondemand === undefined || controller.ondemand)) processQueueAsync();
        else log.w('enqueue retrieval', {type, data, attempt, controller});
    }

    function startPolling(delayMs=500) {
        if(!DBEUG_AUTOMATIC_RETRIEVAL) return;
        if(isPolling) return;
        let lastStart = 0,
            consumeQuota,
            isConsumeAll;
        const f = async () => {
            log?.n(1, '#797979', 'poll');
            //log?.n(4, 'download...', {intervalMs});
            // every itteration do this
            // note: to fully consume all available quota
            // consumeQuotaFactor have to be adjusted upwards for every call,
            // to ensure an even distribution, so that last retrieval
            // has a consumeQuotaFactor: 1
            const quotaRetriever = ß.grapevine.getQuotaRetriever();

            if(!quota) await quotaRetriever.retrieveQuotaAsync({peerProxy});
            let nextMs = ß.config.POLL_INTERVAL_SECONDS * 1000/*ms*/;
            if(quota && quota.available > 0) {
                let {start, duration, available} = quota,
                    refill = start + duration;
                if(lastStart !== start) {
                    lastStart = start;
                    log?.w(0, 'presume that quota have been refilled.');
                    // retain a lot of quota so there is something
                    // left for ondemand use.
                    const nbrOfWaits = duration / (ß.config.POLL_INTERVAL_SECONDS * 1000/*ms*/);
                    if(nbrOfWaits < 0) consumeQuota = available * 0.5;
                    else consumeQuota = available / nbrOfWaits;
                 } else if(isConsumeAll) {
                    // time is running out, even if user have to
                    // wait for ondemand rerieval the latency
                    // wont be that long. so lets consume everything
                    // thats left instead.
                    consumeQuota = available;
                }

                let timeleftMs = refill - Date.now();
                log?.n(0, `consume: ${consumeQuota} / ${available} ( ${Math.ceil((consumeQuota/available)*100)}% ) seconds left: ${Math.floor(timeleftMs/1000)}`);

                await poll(consumeQuota).catch(log.e);

                // schedule next poll
                if(quota.available > 0 && timeleftMs > 0 && timeleftMs < CONSUME_ALL_MS && !isConsumeAll) {
                    log?.w(0, 'only X millis left, consume all of the quota left as fast as possible');
                    nextMs = 0;
                    isConsumeAll = true;
                } else {
                    isConsumeAll = false;
                    if(zero(quota.available) && timeleftMs > 0) {
                        log?.w(0, 'no more quota left, so wait for it to be refilled');
                        nextMs = timeleftMs;
                    }
                }
                log?.n(0, `next poll: ${nextMs}`);
            }
            clearTimeout = ß.oo.timer(nextMs, f); // idPolling = setTimeout(f, nextMs);
        };
        clearTimeout = ß.oo.timer(delayMs, f); //setTimeout(f, delayMs);
        log?.n(1, 'started polling');
    }

    function stopPolling() {
        if(clearTimeout) clearTimeout();
        clearTimeout = null;
        log?.n(1, 'stopped polling');
    }

    function isPolling() {
        return !!clearTimeout;
    }

    function quotaToUnits(quota, factor) {
        let units = Math.floor(quota / factor);
        if(units >= 1) return units;
        return 0;
    }

    function getDuration() {
        // returns falsy if peer is un-responsive.
        if(quota) {
            const
                now = Date.now(),
                refill = quota.start + quota.duration;
            return quota.start < now && now < refill ? quota.duration : 0;
        }
    }

    async function poll(quota) {
        // distribute even amount of quota to consume,
        // for different retrieval jobs.
        quota = quota / 8;

        // jobs
        // note: in some cases, the order is important
        let max, max2;
        const
            signerRetriever = ß.grapevine.getSignerRetriever(),
            treeRetriever = ß.grapevine.getTreeRetriever(),
            config = ß.config;


        //
        // jobs retrieving data, that the peer think you should have.
        //
        // these job messages are simple because retrieving node only have to specify
        // how much data peer should reply with.
        //

        // retrieve (note) scores from your peer
        max = quotaToUnits(quota, config.QUOTA_FACTOR_SCORES);
        if(max) await treeRetriever.retrieveScoresAsync({peerProxy, max}).catch(log?.e);

        // retrieve notes based on your peers (note) scores
        max = quotaToUnits(quota, config.UPLOAD_QUOTA_FACTOR_NOTE);
        if(max) await treeRetriever.retrieveBestNotesAsync({peerProxy, max}).catch(log?.e);

        // retrieve notes the peer is following
        max = quotaToUnits(quota, config.UPLOAD_QUOTA_FACTOR_NOTE);
        if(max) await treeRetriever.retrieveBestFollowedNotesAsync({peerProxy, max}).catch(log?.e);

        // retrieve notes that node is tracking (such as notes it is following itself)
        max = quotaToUnits(quota, config.QUOTA_FACTOR_SCORES);
        if(max) await treeRetriever.retrieveTrackedNoteScoresAsync({peerProxy}).catch(log.e);
        max = quotaToUnits(quota, config.UPLOAD_QUOTA_FACTOR_NOTE);
        await treeRetriever.retrieveTrackedNotesAsync({peerProxy}).catch(log.e);

        // retrieve signers that node is tracking (such as signers it it following itself)
        max = quotaToUnits(quota, config.UPLOAD_QUOTA_FACTOR_SIGNER);
        await signerRetriever.retrieveTrackedSignersAsync({peerProxy}).catch(log.e);

        // retrieve notes posted by signers that node is tracking
        max = quotaToUnits(quota, config.UPLOAD_QUOTA_FACTOR_NOTE);
        await signerRetriever.retrieveTrackedSignersNotesAsync({peerProxy}).catch(log.e);
    }

    return {
        startPolling,
        stopPolling,
        isPolling,
        retrieve,
        retrieveAsync,
        createController,
        getDuration
    };
}
