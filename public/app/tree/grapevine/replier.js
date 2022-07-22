/**
 * TODO
 * Depending on incentive - restrictions for uploading content, set upper limit for upload quota.
 * Score all peers for which has the best and most quality content
 *   best:           quality = total own scores of these notes / amount of dowloaded notes
 *   most:           amount of downloaded content from peer / total downloaded notes (my) score from all peers
 *   peer score:     (best + most) / 2
 *   example:
 *           A   20 score / 120 total score downloaded = 0.16
 *               80 notes / 90 total                   = 0.88 most
 *               0.16+0.88 / 2                         = 0.52 score <
 *           B   100 / 120                             = 0.83 best
 *               10 / 90                               = 0.1
 *               0.83+0.1/2                            = 0.47
 *           A better score then B
 * Calc upload quota per peer: peer score / total peer scores = peer upload quota for time slot
 *           example:
 *               0.52 / (0.52+0.47) -> 0.5252525252525253 quoate for A
 *
 */
// TODO de/serialize with Peer
export const
    NOT_ENOUGH_QUOTA  = 'NOT_ENOUGH_QUOTA';

export function createReplier(ß, peerProxy, log) {                      //log?.n(0, 'createReplier');
    let weight = null,
        sumScore = 0,
        topup = 0,
        earned = 0,
        grace = ß.config.UPLOAD_QUOTA_DEFAULT_GRACE,
        lastResetGrace = 0,
        lastResetEarned = 0,
        isResetGrace = false,
        quotaRatio;
    const resetEarnedMs = (ß.config.UPLOAD_QUOTA_RESET_EARNED_SECONDS * 1000/*ms*/);

    function init(weightArg, score) {
        weight = weightArg;
        sumScore = score;
    }

    function addNoteScore(score, oldScore) { //console.log({score, oldScore, sumScore});
        // NOTE: this is the score set by this node.)
        if(score === null || score === undefined) throw `bad score. score=${score}`;
        if(oldScore === null || oldScore === undefined) {
            weight++;
        } else {
            sumScore -= oldScore;
        }
        sumScore += score; //console.log({weight, sumScore, score, oldScore});
    }

    function getWeight() {
        return weight;
    }

    function totalNoteScore() {
        return sumScore;
    }

    function refill(totalWeight, totalShared, totalGrace) {
        if(weight) {
            const
                qualityRatio = sumScore / weight,
                quantityRatio = weight / totalWeight;
            quotaRatio = (qualityRatio + quantityRatio) / 2;
            topup = quotaRatio * totalShared; // overwrite
            grace += (quotaRatio * totalGrace); // add
        }
    }

    function getEarned() {
        const
            now = Date.now(),
            isTopup = lastResetEarned + resetEarnedMs < now;
        if(isTopup) {
            const leftover = earned;
            ß.grapevine.getUploadManager().addGrace(leftover);
            earned = topup;
            topup = 0;
            lastResetEarned = now;
            if(lastResetGrace + (ß.config.UPLOAD_QUOTA_RESET_GRACE_SECONDS * 1000/*ms*/) < now) {
                // enough time has passed since last reset,
                // when next reply has occured reset extra (grace) quota,
                // to prevent growing to infinity, and incentivice
                // earning quota instead of leaching on other not using theirs.
                // note that we do this after next reply, to make querying
                // more predictable for peer.
                isResetGrace = true;
                lastResetGrace = now;
            }
        }
        return earned;
    }

    function addGrace(v) {
        grace += v;
    }

    function consumeQuota(v) {
        if(v < 0) throw `bad arg: ${v}`;
        // we want to incentivice peers to increase how much they can download,
        // hence create incentive to increase how much they have earned.
        // the more grace they can accumulate, the less they have to depend on earned.
        // hence consume the grace first, secondarily the earned.
        // earned is always reset, so they can not store earned either. this implies
        // they simply have to earn more to predictably increase how much they can download.
        grace -= v;
        if(grace < 0) {
            earned = getEarned() + grace; // note grace is negative, so the + is negated
            grace = 0;
            if(earned < 0) {
                earned = 0;
            }
        }
    }

    function getAvailableQuota() {
        const available = getEarned() + grace;
        return available > ß.config.UPLOAD_QUOTA_MAX_AVAILABLE ? ß.config.UPLOAD_QUOTA_MAX_AVAILABLE : available;
    }

    function isQuotaEnough(v=0) {
        return getAvailableQuota() - v >= 0;
    }

    function getQuota() {
        // total and available quota might have a delta,
        // so return an adjusted quota so as to not confuse
        // peer.
        let earned = getEarned(),
            total = earned + grace,
            available = getAvailableQuota(),
            overflow = total - available;
        const quota = {
            earned,
            grace,
            available,
            start: lastResetEarned,
            duration: resetEarnedMs,
            share: quotaRatio
        };
        if(overflow > 0) {
            quota.grace -= overflow;
            if(quota.grace < 0) {
                quota.earned += quota.grace;
                quota.grace = 0;
                if(quota.earned < 0) {
                    quota.earned = 0;
                }
            }
        } else if(overflow < 0) {
            throw `this can not happen. but it did. quota: ${JSON.stringify(quota)}`;
        }
        return quota;
    }

    function isUnitialized() { //log({weight, sumScore});
        return !weight || !sumScore;
    }

    function createReply({nonce, protocol}) { //function createReply({nonce, respond}) {
        const
            send = (data, cb) => {
                if(isResetGrace) {
                    grace = ß.config.UPLOAD_QUOTA_DEFAULT_GRACE;
                    isResetGrace = false;
                }
                const header = {nonce, protocol};
                peerProxy.createReplyAndSendMessageAsync({...data, quota: getQuota()}, header, err => {
                    if(err && err !== 'offline') {
                        console.log(err);
                        alert('Sending message failed.\r\n\r\nError:' + err);
                    }
                    if(cb) cb(err);
                });
            },
            buildAsync = async (cost, cb) => {
                const consume = (isConsume=true) => {
                    if(isConsume) consumeQuota(cost);
                    return isQuotaEnough(cost); 
                };
                if(isQuotaEnough(cost)) {
                    await cb(consume);
                }
            };

        return {
            send,
            peerProxy,
            isQuotaEnough,
            consumeQuota,
            buildAsync
        };
    }

    function getShare() {
        return quotaRatio;
    }

    return {
        init,
        refill,
        getShare,
        getQuota,
        getAvailableQuota,
        isUnitialized,
        isQuotaEnough,
        getWeight,
        totalNoteScore,
        addNoteScore,
        createReply
    };
}

