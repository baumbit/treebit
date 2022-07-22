export async function createFollowStorageAsync(ß) {

    const
        log = ß.log.log('followstorage', 10),
        getLufoAsync = ß.storage.createBuilder(`/followstorage/`, {persistent:true, lufo:true}),
        noteLufo = await getLufoAsync('note'),
        signerLufo = await getLufoAsync('signer');

    async function addSignerAsync({signer, signerId}) {                 log?.n(0, {signer, signerId});
        if(!signerId) {
            signerId = signer.signerId;
        }
        await signerLufo.addAsync(signerId, signerId);
        return signerId;
    }

    async function hasSignerAsync({signer, signerId}) {
        if(!signerId) {
            signerId = signer.signerId;
        }
        return signerLufo.hasAsync(signerId);
    }

    async function eachSignerAsync(cb) {
        await signerLufo.eachValueAsync(cb);
    }

    //function iterateSigners() {
    //    return signerLufo.iterate(true);
    //}

    async function removeSignerAsync({signer, signerId}) {
        if(!signerId) {
            signerId = signer.signerId;
        }
        await signerLufo.removeAsync(signerId);
        return signerId;
    }

    async function addNoteAsync({note, noteId}) {                 log?.n(0, {note, noteId});
        if(!noteId) noteId = note.noteId;
        await noteLufo.addAsync(noteId, noteId); //console.log({noteId});
        return noteId;
    }

    async function hasNoteAsync({note, noteId}) {
        if(!noteId) {
            noteId = note.noteId;
        }
        return noteLufo.hasAsync(noteId);
    }

    async function eachNoteAsync(cb) {
        await noteLufo.stepValueAsync(undefined, cb);
    }

    //function iterateNotes() {
    //    return noteLufo.iterate(true);
    //}

    async function removeNoteAsync({note, noteId}) {
        if(!noteId) noteId = note.noteId;
        await noteLufo.removeAsync(noteId);
        return noteId;
    }


//    function getNote(noteId) {
//        const o = signerLufo.getValue(noteId); //console.log('get', noteId, o);
//        return o;
//    }
//
//    function useSigner(noteId, sort) {
//        return signerLufo.useValue(noteId, sort);
//    }
//
//    function eachSigner(startIndex, cb) {  //console.log('forEach', followsLufo.debugName, followsLufo.length(), length());
//        signerLufo.forEach(startIndex, ({value}, i) => { //log(value);
//            return cb(value, i);
//        });
//    }
//
//    //function clearSigners() { //console.log('clear', followsLufo.debugName, followsLufo.length());
//    //    signerLufo.clear();
//    //}
//
//    //function lengthSingers() {
//    //    return signerLufo.length();
//    //}
//
    return {
        addSignerAsync,
        hasSignerAsync,
        removeSignerAsync,
        eachSignerAsync,
        addNoteAsync,
        hasNoteAsync,
        removeNoteAsync,
        eachNoteAsync
    };
};

