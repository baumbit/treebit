/**
 * common functions which can not easily be grouped with a specific category of retrievers.
 */
import {eachAsync} from '../../oo/utils.js';

export async function addScoresAsync(peerProxy, scores, isZerorizeScore=false, isCheckDuplicate=true) {
    const freshScores = await eachAsync(scores, async (o) => {
        const isDuplicate = isCheckDuplicate && await peerProxy.hasNoteScoreAsync(o.noteId);
        if(!isDuplicate) {
            await peerProxy.addNoteScoreAsync(o.noteId, isZerorizeScore ? 0 : o.score);
            return o;
        }
    }, []);
    const cntDuplicates = scores.length - freshScores.length;
    if(isCheckDuplicate && cntDuplicates) {
        // TODO
        console.log('TODO peer forgot it already sent this score, so punish the bad behaviour', {cntDuplicates});
    }
    return freshScores;
};


export async function hasPeerNoteAsync(peerProxy, noteId) {
    // note important: _presume_ that recipient has note,
    // if sender already knows the recipient has the score.
    return peerProxy.hasNoteScoreAsync(noteId);
};

