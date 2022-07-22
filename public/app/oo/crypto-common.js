import {getSubtle, getBase64, getNodeJsCrypto} from './utils.js';

export async function getHash(message, isHex=true, type='SHA-384') {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await getSubtle().digest(type, data);
    if(!isHex) return hashBuffer;

    const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    //console.log({hashHex});
    return hashHex;
};

export function getMessageEncoding(message) {
    const enc = new TextEncoder();
    return enc.encode(message);
};

export async function signMessage(privateKey, message) {
    const
        encoded = getMessageEncoding(message),
        signature = await getSubtle().sign(
            {
                name: "ECDSA",
                hash: {name: "SHA-384"},
            },
            privateKey,
            encoded
        );
        //buffer = new Uint8Array(signature, 0, 5);
    const result = {
        base64: getBase64().btoa(ab2str(signature)),
        signature
        //buffer,
        //signatureBuffer: `${buffer}...[${signature.byteLength} bytes total]`
    }; //console.log('result', {result});
    return result;
};

export async function verifyMessage(publicKey, signature, message, isBase64=true) {
    //console.log('verifyMessage', publicKey, signature, message, isBase64);
    if(isBase64) {
        signature = getBase64().atob(signature);
    }
    signature = str2ab(signature);
    const
        encoded = getMessageEncoding(message),
        result = await getSubtle().verify(
            {
                name: "ECDSA",
                hash: {name: "SHA-384"}
            },
            publicKey,
            signature,
            encoded
        );
    //console.log('result', result);
    return result;
};

export async function generateKeyPair() {
    return getSubtle().generateKey(
        {
            // TODO possibly include this meta data in signer meta-data and/or make it user preferencable
            name: "ECDSA",
            namedCurve: "P-384"
        },
        true,
        ["sign", "verify"]
    ).then(async (keyPair) => {
        return {
            priv: keyPair.privateKey,
            pub: keyPair.publicKey
        };
    });
};

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

async function exportCryptoKey(format, key, isBase64=true) { //console.log('exportCryptoKey', format);
    const
        exported = await getSubtle().exportKey(format, key),
        exportedAsString = ab2str(exported);
    return isBase64 ? getBase64().btoa(exportedAsString) : exportedAsString;
}

export async function exportPrivateKey(priv, isPEM) {
    const base64 = exportCryptoKey('pkcs8', priv);
    return isPEM ? `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----` :  base64;
};

export async function exportPublicKey(pub, isPEM) {
    const base64 = exportCryptoKey('spki', pub);
    return isPEM ? `-----BEGIN PUBLIC KEY-----\n${base64}\n-----END PUBLIC KEY-----` : base64;
};

function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

async function importCryptoKey(format, key, arr, isBase64=true) {
    const binaryDerString = isBase64 ? getBase64().atob(key) : key;
    const binaryDer = str2ab(binaryDerString); //console.log('so far so good', s, binaryDerString);
    //console.log('asd', {format, key, arr, isBase64});
    const result = await getSubtle().importKey(
        format,
        binaryDer,
        {
            name: "ECDSA",
            namedCurve: 'P-384'
        },
        true,
        arr
    ); //console.log('result', result);
    return result;
}

export async function importPublicKey(pub) {
    // TODO
    //const pemHeader = "-----BEGIN PUBLIC KEY-----";
    //const pemFooter = "-----END PUBLIC KEY-----";
    //const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
    return importCryptoKey('spki', pub, ['verify']);
};

export async function importPrivateKey(priv) {
    // TODO
    //const pemHeader = "-----BEGIN PRIVATE KEY-----";
    //const pemFooter = "-----END PRIVATE KEY-----";
    //const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
    return importCryptoKey('pkcs8', priv, ['sign']);
};

export async function generateEncryptionKeyPairAsync() {
    return getSubtle().generateKey(
        {
           name: 'RSA-OAEP',
           //modulusLength: 4096,
           modulusLength: 2048,
           publicExponent: new Uint8Array([1, 0, 1]),
           hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
    ).then(async (keyPair) => {
        return {
            decryptKey: keyPair.privateKey,
            encryptKey: keyPair.publicKey
        };
    }).catch(console.error);
};


// --- ENCRYPTION ---
async function importCryptoKeyEncryption(format, key, arr, isBase64=true) {
    const binaryDerString = isBase64 ? getBase64().atob(key) : key;
    const binaryDer = str2ab(binaryDerString);
    const result = await getSubtle().importKey(
        format,
        binaryDer,
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256'
        },
        true,
        arr
    );
    return result;
}

export async function importPublicKeyEncryption(pub) {
    // TODO
    //const pemHeader = "-----BEGIN PUBLIC KEY-----";
    //const pemFooter = "-----END PUBLIC KEY-----";
    //const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
    return importCryptoKeyEncryption('spki', pub, ['encrypt']);
};

export async function exportPublicKeyEncryption(pub, isPEM) {
    const base64 = exportCryptoKey('spki', pub);
    return isPEM ? `-----BEGIN PUBLIC KEY-----\n${base64}\n-----END PUBLIC KEY-----` : base64;
};

export async function exportPrivateKeyEncryption(priv, isPEM) {
    const base64 = exportCryptoKey('pkcs8', priv);
    return isPEM ? `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----` :  base64;
};

export async function importPrivateKeyEncryption(priv) {
    // TODO
    //const pemHeader = "-----BEGIN PRIVATE KEY-----";
    //const pemFooter = "-----END PRIVATE KEY-----";
    //const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
    return importCryptoKeyEncryption('pkcs8', priv, ['decrypt']);
};


export async function encryptAsync(pub, message) { //message = JSON.stringify({hello:3})
    pub = await importPublicKeyEncryption(pub); //console.log(pub, message);
    const base64 = getBase64().btoa(message);
    return base64;
/////
/////    const enc = new TextEncoder();
/////    const data = enc.encode(base64); //console.log('prepare', data);
/////
/////    //const byteCharacters = getBase64().btoa(base64);
/////    //const byteNumbers = new Array(byteCharacters.length);
/////    //for (let i = 0; i < byteCharacters.length; i++) {
/////    //  byteNumbers[i] = byteCharacters.charCodeAt(i);
/////    //}
/////    //const byteArray = new Uint8Array(byteNumbers);
/////    //const blob = new Blob([byteArray], {type: 'plain/text'});
/////    //const data = await blob.arrayBuffer();
/////
/////    const arrayBuffer = await getSubtle().encrypt({name:'RSA-OAEP'}, pub, data); TODO XXX can not handle very long text?!
/////    console.log('--------->', arrayBuffer, base64, message);
/////    return ab2str(arrayBuffer);
/////
};

export async function decryptAsync(priv, ciphertext) { //console.log('decrypt', ciphertext);
    //const arrayBuffer = arr.buffer.slice(arr.byteOffset, arr.byteLength + arr.byteOffset); console.log(arrayBuffer);
    priv = await importPrivateKeyEncryption(priv); //console.log(priv);
/////    const arrayBuffer = str2ab(ciphertext); console.log('+++++++>', arrayBuffer);
/////    const decrypted = await getSubtle().decrypt({name: 'RSA-OAEP'}, priv, arrayBuffer);
/////    //const blob = new Blob([decrypted], {type: "text/plain"}); console.log('decrypted', blob);
/////    //const reader = new FileReader();
/////    ciphertext str = ab2str(decrypted);
    const result = getBase64().atob(ciphertext);
    //reader.readAsText(blob);
    //vindov.asd = reader;
    //const result = reader.result;
    //console.log('===', str, result);
    return result;
};

//(() => {
//    console.log('test crypto');
//    async function assertEncDec(s) {
//        let {decryptKey, encryptKey} = await generateEncryptionKeyPairAsync();
//        decryptKey = await exportPrivateKeyEncryption(decryptKey);
//        encryptKey = await exportPublicKeyEncryption(encryptKey);
//        const encrypted = await encryptAsync(encryptKey, s);
//        const decrypted = await decryptAsync(decryptKey, encrypted);
//        if(s !== decrypted) console.error('assertEncDec failed', {encrypted, decrypted});
//    }
//    assertEncDec('hello world');
//})();


