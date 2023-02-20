import crypto from 'node:crypto';
import { promisify } from 'node:util';

const
    generateKeyPair = promisify(crypto.generateKeyPair),
    b32alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base64Decode(encoded) {
  return new Buffer(encoded, 'base64')
}

function base32Encode(data) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    let
        bits = 0,
        value = 0,
        output = ''

    for (let i = 0; i < view.byteLength; i++) {
        value = (value << 8) | view.getUint8(i);
        bits += 8;
        while (bits >= 5) {
            output += b32alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if(bits > 0) output += b32alphabet[(value << (5 - bits)) & 31];

    return output;
}

function base32EncodeKey(s) {
    const lines = [];
    let instances = -1;
    for(const line of s.split('\n')) {
        if(line.indexOf(' KEY-') > -1) {
            if(instances++ > 1) {
                throw "Only one key in data is supported";
            }
            continue;
        }
        lines.push(line)
    }
    const data = base64Decode(lines.join(''));
    return base32Encode(data.slice(-32));
}

export async function generateTorAuth(hostname) {
    const { privateKey, publicKey } = await generateKeyPair('x25519', {
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        }
    });

    const
        auth = `descriptor:x25519:${base32EncodeKey(publicKey)}`,
        authPriv = `${hostname}:descriptor:x25519:${base32EncodeKey(privateKey)}`;

    return {
        auth,
        authPriv
    };
}

