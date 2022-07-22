/*
 * v0.0.1-1
 * Norm - Lib - Treenet
 * Data will only be propagated among nodes that adhere to the same normative rules.
 * A node that speaks to different rule sets, could in some cases and to some extent transform messages from one norm to another.
 **/

export function normNoteLevel(parentNote, childNote) {
    return childNote.data.lvl === parentNote.data.lvl + 1;
};

export function normNoteScore({note, peerScores, score=0}) {
    // TODO add if following author etc
    let avgPeerScore = 0, // notes with a higher peer score gets a higher score
        sumScore = 0,
        cntScores;
    peerScores.forEach(v => {
            // note:
            // when a node uploads a note or score to a peer,
            // the peer is unlikely to share its score back to the peer.
            // actually it might be that it never create a score for note,
            // so it will not even share it. hence it makes sense to use 
            // zero is a default score for this note.
            //
            // because a node is using the peer scores to find out if a peer
            // is likely to have a note or not, score with zero should be
            // excluded. otherwise sharing a score to many peers, will drive
            // down the avg score of the note.
        if(v > 0) {
            // sum valid (greater than zero) scores.
            sumScore += v;
            cntScores++;
        }
    });
    if(cntScores > 0) avgPeerScore = sumScore / cntScores;

    const timeScore = note.data.ms / Date.now(); // recently created notes gets a higher score
         // useScore =, // TODO notes used often gets a higher score
        // TODO notes that belong to a long chain of notes, should also get a higher score
    score = (score + timeScore + avgPeerScore) / 3;
    return Math.floor(score); // TODO value between 0-1
};

//function validateNoteScore(score) {
//    // note scores not out of bounds
//    return score >= 1 || score <= 10
//}
//
//function validateNoteCreated(ms) {
//    // notes that not created in the future
//    return Date.now
//}

