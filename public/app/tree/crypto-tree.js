import {clone} from './../oo/utils.js';
import * as CRYPTO from './../oo/crypto-common.js';

function noteDataToString(note) {
    let s = '';
    // TODO  TODO move this to norm.js, because it is consensus critical
    // XXX the order is important. everyone in the network must do this in the same order.
    s += note.data.pub; // is what ties this note to signer
    s += note.data.ms; // separates this message from all other possible children of prev
    if(note.data.prev) s += note.data.prev; // is what ties this note to a branch
    // note: by NOT including the actual note text/content there is less of data to work with (mutate)
    // in order for an attacker to succeed with a hash collission which would crowd out the real message.
    // reason it could crowd out real message, is that while the signer would be different, the message hash
    // could still be the same of a collision was successfully created.
    return s;
}

function signerDataToString(signer) {
    let s = '';
    // XXX the order is important. everyone in the network must do this in the same order.
    // note: if new props are added to signer, these should be added here
    // required
    // TODO TODO move this to norm.js, because it is consensus critical
    if(!signer.data.pub) console.error('missing pub', signer);
    s += signer.data.pub;
    s += signer.data.ms;
    //s += signer.data.desc; probabably not needed, right?!
    return s;
}

async function generateSha384(message, isHex) {
    return CRYPTO.getHash(message, isHex, 'SHA-384');
}

export async function generateNoteIdAsync(note) {                       //console.log('generateNoteIdAsync', note.data.pub);
    // XXX note that a bad signer could create same noteId several times,
    // hence the retrieving node have to verify if the note is a duplicate or not.
    // the id generated here is only ment to protect against accidental collisions.
    const message = noteDataToString(note);
    const result = await generateSha384(message); //console.log('->', {message, result});
    return result;
};

export async function createSignerIdAsync({pub, signer}) { // TODO refactor to generateSignerIdAsync
    if(!pub) {
        pub = signer.data.pub;
    }
    return await generateSha384(pub, true);
};

export async function generateSignerAndPrivAsync(desc='nodesc', nrls) {
    let {priv, pub} = await CRYPTO.generateKeyPair();
    console.log('C2', {priv, pub});
    priv = await CRYPTO.exportPrivateKey(priv);
    console.log('C3');
    pub = await CRYPTO.exportPublicKey(pub);
    console.log('C4');
    //console.log({priv,pub});

    const signerId = await createSignerIdAsync({pub});
    const signer = await updateSignerAsync({priv, signer:{signerId}, data:{pub}, desc, nrls})

    return {
        signer,
        priv
    };
};

export async function updateSignerAsync({priv, signer={}, data, name, desc, ms, urls, nrls}) {
    // TODO harden by running properties through: norm.js... make this check also before adding to store server-side
    //console.log('updateSignerAsynci BEFORE', priv, data, '*****>', JSON.stringify(signer));
    signer = {
        ...signer,
        data: {
            ...signer.data,
            ms: ms || Date.now(),
            ...data
        }
    };
    if(desc) signer.data.desc = desc;

    if(nrls) signer.data.nrls = nrls; // node urls
    if(!signer.data.nrls) signer.data.nrls = []; // TODO harden by letting norm.js cap amount
    //if(!signer.data.nrls) signer.data.nrls = ['node://1', 'node://2', 'node://3']; // TODO harden by letting norm.js cap amount
    if(urls) signer.data.urls = urls; // other urls
    if(!signer.data.urls) signer.data.urls = []; // TODO harden by letting norm.js cap amount
    //if(!signer.data.urls) signer.data.urls = ['todo://tree.bit', '2asdf://sf', '3wer://asdd']; // TODO harden by letting norm.js cap amount

    if(name) signer.data.name = name;
    if(!signer.data.name) signer.data.name = 'Incognito';

    //console.log('updateSignerAsync AFTER', {priv, data, signer}, '--->', JSON.stringify(signer));
    if(!signer.signerId) throw 'internal err. missing id.' // TODO handle
    if(!signer.data.pub) throw 'internal err. missing pub.' // TODO handle

    priv = await CRYPTO.importPrivateKey(priv);
    const message = signerDataToString(signer);
    const signature = await CRYPTO.signMessage(priv, message); // TODO refactor signature to sig in signer
    signer.signature = signature.base64;
    //console.log('signature', {signature});
    //console.log('signed', {signer});
    return await verifySignerAsync(signer) ? signer : undefined; // better safe then sorry
};

export async function verifySignerAsync(signer) { //console.log('verifySignerAsync', signer);
    const message = signerDataToString(signer);
    const cryptoKey = await CRYPTO.importPublicKey(signer.data.pub);
    return await CRYPTO.verifyMessage(cryptoKey, signer.signature, message);
};

export async function verifyNoteSignatureAsync(note) {
    const pub = note.data.pub;
    const message = noteDataToString(note);
    const cryptoKey = await CRYPTO.importPublicKey(pub);            //console.log('verifyNoteAsync', {cryptoKey});
    const result = await CRYPTO.verifyMessage(cryptoKey, note.signature, message); //console.log('OUT verifyNoteAsync', {result});
    return result;
};

export async function verifyNoteAsync(note, signer) {               //console.log('IN verifyNoteAsync', {note, signer});
    const pub = note.data.pub;
    if(!pub) {                                                      //console.log('missing pub', {note, pub});
        return false;
    }
    if(!note.signature) {                   //console.log('missing signature TODO change prop from signature to sig for short');
        return false;
    }
    if(signer) {
        if(!await verifySignerAsync(signer)) {                            //console.log('bad signer, so note does not belong to it');
            return false;
        }
        if(pub !== signer.data.pub) {                               //console.log('public keys should match');
            return false;
        }
    }

    console.log('TODO verifyNoteAsync should not have to verify noteId, instead generate it when adding');
    const noteId = await generateNoteIdAsync(note).catch(console.log);                 //console.log('verifyNoteAsync', {noteId});
    if(note.noteId !== noteId) {                               console.error('TODO handle note is mismatch', {noteId, note});
        return false; // should match
    }
    const result = await verifyNoteSignatureAsync(note);            //console.log('hello no error');
    return result;
};

export async function generateNoteAsync({prev, text, ms=Date.now(), signerId, pub, tag, lvl=0, priv}) { //console.log('IN', ...arguments);
    if(!priv) throw 'no text. priv=' + priv;
    if(!signerId) throw 'no text. signerId=' + signerId;
    if(!text) throw 'no text. text=' + text;

    //TODO if(prev && !lvl) throw 'bad arg';
    const content = {
        pub,
        prev,
        lvl,
        text,
        ms,
        tag
    };
    const note = {
        data: {
            ...content
        },
        signerId
    };

    // add noteID
    note.noteId = await generateNoteIdAsync(note);

    // add signature
    const cryptoKey = await CRYPTO.importPrivateKey(priv);
    const message = noteDataToString(note);
    const signature = await CRYPTO.signMessage(cryptoKey, message);
    note.signature = signature.base64;

    const isVerified = await verifyNoteAsync(note);
    if(!isVerified) console.error('TODO handle unable to verify');

    //console.log('OUT', clone(note));
    return note;
};

export async function generateNodeIdAsync(pub) {
    if(!pub) T('FIX no pub. this should not be able to happen');
    const id = await generateSha384(pub, true); //L({id, pub});
    return id;
};

export async function generateNodeCredentialsAsync(tag='notag') {
    // because signers also have priv/pub key pairs,
    // the names are written in full for the node,
    // to make it easier for the eyes of the programmer.
    const {priv, pub} = await CRYPTO.generateKeyPair();
    const privateKey = await CRYPTO.exportPrivateKey(priv);
    const publicKey = await CRYPTO.exportPublicKey(pub);
    const id = await generateNodeIdAsync(publicKey);
    let {encryptKey, decryptKey} = await CRYPTO.generateEncryptionKeyPairAsync();
    decryptKey = await CRYPTO.exportPrivateKeyEncryption(decryptKey);
    encryptKey = await CRYPTO.exportPublicKeyEncryption(encryptKey);
    return {
        decryptKey,
        encryptKey,
        publicKey,
        privateKey,
        id,
        tag
    };
};

export async function createGrapevineEnvelopeAsync({privateKey, encryptKey, api, to, type, message}) {
    privateKey = await CRYPTO.importPrivateKey(privateKey); //L('createGrapevineEnvelopeAsync', message);
    const signature = await CRYPTO.signMessage(privateKey, JSON.stringify(message)); // TODO refactor signature to sig in signer
    if(encryptKey) {
        message = await CRYPTO.encryptAsync(encryptKey, JSON.stringify(message));
    }
    const envelope = {
        api,
        to,
        type,
        message,
        encrypted: !!encryptKey,
        signature: signature.base64
    };
    return envelope;
};

export async function openGrapevineEnvelopeAsync({decryptKey, envelope}) { //L('openGrapevineEnvelopeAsync', decryptKey, envelope);
    if(envelope.encrypted) {
        envelope.message = await CRYPTO.decryptAsync(decryptKey, envelope.message).catch(console.log);
        envelope.message = JSON.parse(envelope.message);
    }
    return envelope;
};

export async function verifyGrapevineEnvelopeAsync({publicKey, envelope}) { //L('verifyGrapevineEnvelopeAsync', {publicKey, envelope});
    publicKey = await CRYPTO.importPublicKey(publicKey);
    //const result = await CRYPTO.verifyMessage(cryptoKey, envelope.signature, JSON.stringify(envelope.message));
    const result = await CRYPTO.verifyMessage(publicKey, envelope.signature, JSON.stringify(envelope.message)); //L({result});
    return result;
};


/////
/////export function verifyUserMessageAsync(user, message) {
/////    const pub = user.pub;
/////    const message = message;
/////    const cryptoKey = await CRYPTO.importPublicKey(pub);            //console.log('verifyNoteAsync', {cryptoKey});
/////    const result = await CRYPTO.verifyMessage(cryptoKey, note.signature, message); //console.log('OUT verifyNoteAsync', {result});
/////    return result;
/////};
/////
/////
/////}
/////function userToString(user) {
/////    return user.
/////}
/////
/////export async function updateUserAsync({user, name, description, ms=Date.now()}) {
/////    user = clone(user);
/////
/////    // update
/////    user.pub.name = name;
/////    user.pub.description = description;
/////    user.pub.ms = ms;
/////    user.pub.userId = await generateSha384(user.pub.pub, true);
/////
/////    const cryptoKey = await CRYPTO.importPrivateKey(user.priv);
/////    const message = userToString(user);
/////    const signature = await CRYPTO.signMessage(cryptoKey, message);
/////    user.signature = signature.base64;
/////    return user;
/////};
/////
/////export async function generateUserAsync({name, description}) {
/////    // TODO add network address with format, such as onion etc
/////    let {priv, pub} = await CRYPTO.generateKeyPair();
/////    priv = await CRYPTO.exportPrivateKey(priv); 
/////    pub = await CRYPTO.exportPublicKey(pub);
/////    const user = {
/////        priv,
/////        pub: {
/////            pub
/////        }
/////    };
/////    return await updateUserAsync({user, name, description});
/////};

