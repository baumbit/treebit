import {SignerName} from './signer.js';
import {createStoreList} from './infinite-list.js';
import {Bar} from './bar.js';

export function Signers({oo, res}) {
    const path = 'res/topmost/signers';
    createStoreList(oo, path,
        (oo, signerId) => { // item
            return oo(SignerName, {signerId});
        },
        undefined,
        'Signers',
        'zsigners'
    );
    oo(Bar, {isBack:true});
    res(path);
};

