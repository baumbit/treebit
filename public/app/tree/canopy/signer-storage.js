/*
 * Store note signers.
 * Does _not_ store signers with privkeys.
 */
//import {normNoteLevel} from '../norm.js';
import {createSignerIdAsync, verifySignerAsync} from '../crypto-tree.js';
export async function createSignerStorageAsync(ß) {
    const
        log = ß.log.log('signerStorage', 2),
        getLufoAsync = ß.storage.createBuilder(`/signerstorage/notes/`, {persistent:true, lufo:true}),
        signersLufo = await ß.storage.getAsync({name: `/signerstorage/signers`, persistent:true, lufo:true});

    async function addNoteAsync(note, signerId) {                  // L(...arguments);
        const {noteId, data:{pub, ms}} = note;                        //og?.n(0, '---->', {pub, noteId, ms});
        // this is a simple verification of data
        // TODO harden verify signerId prior to using it
        const id = await createSignerIdAsync({pub}); //console.log('addNoteAsync', id);
        if(signerId && signerId !== id) console.error(`TODO handle bad ipnut data ${signerId} ${id}`); 
        signerId = id;

        let node = await signersLufo.getValueAsync(signerId);
        if(!node) { //console.log('signerNode did not exist, creating it', pub);
            node = await createSignerNodeAsync({pub, isPlaceholder: true});
        }
        //else console.log('signerNode existed');
        node.notesUpdatedMs = Date.now(); //console.log('adding', node);
        await addSignerNodeAsync(node); // TODO bubble sort this?! probably should !!! implicit in lufo?!
        const lufo = await getLufoAsync(signerId); // note: if not found, will create lufo dedicated to signer
        await lufo.addDescendingAsync(noteId, {noteId, ms}, 'ms');
    }

    function SignerProxy(node) {
        // TODO maybe verify node integrity for dev purpsoes
        this.node = node;
    }
    SignerProxy.prototype.initAsync = async function() {
        this.lufo = await getLufoAsync(this.node.signer.signerId);
    }
    SignerProxy.prototype.destroy = function() {
        remove(this.node.signer.signerId);
    };
    //SignerProxy.prototype.save = function() {
    //    this.node = createSignerNode({node: this.node});
    //    addSignerNode(null, this.node);
    //};
    SignerProxy.prototype.getSigner = function() {
        return this.node.signer;
    };
    SignerProxy.prototype.getSignerId = function() {
        return this.node.signer.signerId;
    };
    SignerProxy.prototype.getPublicKey = function() {
        return this.node.signer.data.pub;
    };
    SignerProxy.prototype.getDescription = function() {
        return this.node.signer.data.desc;
    };
    SignerProxy.prototype.getSignedMillis = function() {
        return this.node.signer.data.ms;
    };
    SignerProxy.prototype.getNotesUpdatedMillis = function() {
        return this.node.notesUpdatedMs;
    }
    SignerProxy.prototype.getNoteListAsync = async function(noteId, limit=1) {
        if(noteId) limit += 1; // exclude starting point if provided
        const arr = [];
        await this.lufo.eachValueAsync({key:noteId, limit}, (note, i) => {
            if(note.noteId !== noteId) arr.push(note.noteId);
        }); //log({limit, noteId, arr});
        return arr;
    };
    SignerProxy.prototype.getFirstNoteAsync = async function() {
        const first = await this.lufo.firstAsync();
        if(first) { console.log({first})
            return ß.canopy.getNoteAsync(first.value.noteId);
        }
    };
    SignerProxy.prototype.getPrevNoteAsync = async function(noteId) {
        const prev = await this.lufo.prevAsync(noteId);
        if(prev) {
            return ß.canopy.getNoteAsync(prev.value.noteId);
        }
    };
    SignerProxy.prototype.getNextNoteAsync = async function(noteId) {
        const next = await this.lufo.nextAsync(noteId);
        if(next) {
            return ß.canopy.getNoteAsync(next.value.noteId);
        }
    };
    SignerProxy.prototype.getNoteLengthAsync = async function() {
        return this.lufo.lengthAsync();
    };
    SignerProxy.prototype.twoStepNoteAsync = async function({index1, index2}) {
        return this.lufo.twoStepValueAsync({index1, index2});
    };
    //SignerProxy.prototype.asJson = function() {
    //    return JSON.stringify(this.node.signer);
    //};

    async function addSignerAsync(signer, sort) {                                   log?.n(1, 'addSigner', signer);
        //signer = JSON.parse(JSON.stringify(signer));
        if(signer.priv || signer.data.priv) throw `not allowed. signer has privkey`;
        const {pub, ms} = signer.data;
        const signerId = await createSignerIdAsync({pub});
        let node = await signersLufo.getValueAsync(signerId);      log?.n(1,`-signer ${signerId} does ${!await signersLufo.hasAsync(signerId)?'NOT':''} exists`,node);
        if(node) { //console.log('->', node, ms, signer);
            if(ms < node.signer.data.ms) {                          log?.n(1, `signer ${signerId} is to old`);
                return;
            }
        }
        node = await createSignerNodeAsync({node, signer});
        await addSignerNodeAsync(node, sort);
        return grabProxyAsync(signerId, undefined, node);
    }

    async function addSignerNodeAsync(node, sort='bubble') {                                   log?.n(1, 'addSignerNode', node);
        if(!node.signer.signerId) throw 'TODO missing signerID;';
        await signersLufo.addAsync(node.signer.signerId, node, sort);                          //console.log(signersLufo.get(node.signer.signerId));
    }

    async function getSignerAsync(signerId) {
        const node = await signersLufo.getValueAsync(signerId);
        if(node) return node.signer;
    }

    async function grabNodeAsync(signerId, sort) {
        const o = await signersLufo.getValueAsync(signerId);
        //console.log('getSigner', o);
        return o; // TODO add sort
    }

    async function grabProxyAsync(signerId, sort, node) {
        if(!node) {
            if(sort) {
                node = await signersLufo.useValueAsync(signerId, sort);
            } else {
                node = await signersLufo.getValueAsync(signerId);
            }
        }
        if(!node) return null;
        const signerProxy = new SignerProxy(node);
        await signerProxy.initAsync();
        return signerProxy;
    }

    async function eachProxyAsync(index, cb) {
        return signersLufo.eachValueAsync({index}, async (o, i) => {
            const signerProxy = await grabProxyAsync(o.signer.signerId);
            await cb(signerProxy, i);
        });
    }

    //function eachNode(startIndex, cb) {  //console.log('forEach', signersLufo.debugName, signersLufo.length(), length());
    //    signersLufo.forEach(startIndex, ({value}, i) => { //log(value);
    //        return cb(value, i);
    //    });
    //}

    async function removeAsync(signerId) {
        await signersLufo.deleteAsync(signerId);
        const lufo = await getLufoAsync(signerId);
        await lufo.destroyAsync();
    }

    //function clear() { //console.log('clear', signersLufo.debugName, signersLufo.length());
    //    each(0, ({pub}) => {
    //        const lufo = await getLufoAsync(pub);
    //        lufo.clear();
    //    });
    //    signersLufo.clear();
    //}

    //function has(pub) {
    //    return !!get(pub); // TODO optmz, signersLufo have to know about placeholders and non-placeholders
    //}

    async function lengthAsync() {
        return signersLufo.lengthAsync();
    }

    return {
        // note
        addNoteAsync,
        // signer
        addSignerAsync,
        getSignerAsync,
        //grabNodeAsync,
        grabProxyAsync,
        eachProxyAsync,
        //eachNode,
        removeAsync,
        lengthAsync,
        debug: {
            signersLufo
        }
    };
}

async function createSignerNodeAsync({node={}, signer={}, pub, desc, ms, signature, isPlaceholder=false}) {
    //console.log('IN', {node, signer, pub, desc, ms, signature});
    // TODO harden verify data integrety and norms
    const data = {
        ...node?.signer?.data,
        ...signer?.data
    };
    if(pub) data.pub = pub; // TODO remove ?
    if(desc) data.desc = desc; // TODO remove ?
    if(ms) data.ms = ms; // TODO remove ?
    const n = {
        isPlaceholder,
        notesUpdatedMs: 0,
        signer: {
            data
        }
    };
    if(signer) n.signer.signature = signer.signature;
    else if(signature) n.signer.signature = signature;

    // TODO 
    //      verify props
    //      verify consensus
 
    // verify that signature matches signer
    if(!isPlaceholder) {
        if(!await verifySignerAsync(n.signer)) {
            console.error('TODO handle non placeholder signature does not match');
            return null;
        }
    }

    // add signerId if it does not allready exist
    n.signer.signerId = await createSignerIdAsync({pub: n.signer.data.pub}); //console.log('createSignerNodeAsync', n.signer.signerId);
    //console.log('OUT', {n});

    return n;
};

