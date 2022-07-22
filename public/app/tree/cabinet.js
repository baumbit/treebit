/*
 * A ccollection of controlled Signers.
 * May store Signers private keys, but signing is always done in Treehut.
 * TODO
 *      a signature should be able to have many private keys and derivatives of a master key,
*/

//import {normNoteLevel} from '../norm.js';
//import {createUid} from '../utils.js';

import {clone} from './../oo/utils.js';

export async function createCabinetAsync(ß) {

    const
        log = ß.log.log('CABINET', 10),
        store = await ß.storage.getAsync({name: '/cabinet', persistent:true});

    async function getDefaultSignerIdAsync() {
        return store.getAsync('defaultSignerId');
    }

    async function setDefaultSignerIdAsync(signerId) {
        await store.setAsync('defaultSignerId', signerId);
    }

    async function getSignersAsync(isExcludeDefaultSigner) {
        const signers = clone(await store.getAsync('signers'));
        const defaultSignerId = await getDefaultSignerIdAsync();
        if(isExcludeDefaultSigner && defaultSignerId) {
            delete signers[defaultSignerId];
        }
        return signers;
    }

    async function addSignerAsync(signer) {                                     log('addSigner', {signer});
        // TODO impl limit for how many signers a user can store
        const signerProxy = await ß.canopy.addSignerAsync(signer);
        if(signerProxy) {
            const signers = await getSignersAsync();
            const id = signerProxy.getSignerId();
            const o = signerProxy.getSigner();
            signers[id] = o;
            await store.setAsync('signers', signers);
        }
        return signerProxy;
    }

    async function getSignerAsync(signerId) {
        // cloning to prevent accidental side-effects of object mutation.
        // explicitly use userProxy.addSigner(signer).save(); to make changes.
        const signers = await getSignersAsync();
        return clone(signers[signerId]);
    }

    async function getSignerPrivsAsync() {
        const signerPrivs = clone(await store.getAsync('signerPrivs'));
        return signerPrivs;
    }

    async function setSignerPrivAsync(signerId, priv) {
        let signerPrivs = await getSignerPrivsAsync();
        signerPrivs[signerId] = priv;
        await store.setAsync('signerPrivs', signerPrivs);
    }

    async function getSignerPrivAsync(signerId) {
        const signerPrivs = await getSignerPrivsAsync();
        return signerPrivs[signerId];
    }

    async function deleteSignerPrivAsync(signerId) {
        const signerPrivs = await getSignerPrivsAsync();
        delete signerPrivs[signerId];
        await store.setAsync('signerPrivs', signerPrivs);
    }

    async function deleteSignerAsync(signerId) {
        // priv
        await deleteSignerPrivAsync(signerId);

        // signer
        const signers = await getSignersAsync();
        delete signers[signerId];
        await store.setAsync('signers', signers);

        // default
        const defaultSignerId = await getDefaultSignerIdAsync();
        if(defaultSignerId === signerId) {
            await store.setAsync('defaultSignerId', null);
        }
    }

    return {
        getDefaultSignerIdAsync,
        setDefaultSignerIdAsync,
        addSignerAsync,
        getSignersAsync,
        getSignerAsync,
        setSignerPrivAsync,
        getSignerPrivAsync,
        deleteSignerAsync,
        deleteSignerPrivAsync
    };
};

