import OO from '../../oo/oo.js';
import {Treehut, createResource} from '../treehut/treehut.js';

export function createTreehutClient(root, ooptions) {    //log(0, 'createTreehut', {ß, µ});
    const {resourceClient, config, log} = ooptions.globalProps.µ;
    ooptions = {
        ...ooptions,
        ooFunction: {
            // make resource available and linkable to Tugs,
            // so that resources can tried to Tug life-cycle and
            // garbage collected (resources are saved to store).
            ...createResource(resourceClient, config.CLIENT_CONTINOUS_POLLING_DISABLED, log)
        }
    };

    const
        {oo, on, $:{$, set, drop, prepend, push}} = OO(root, undefined, undefined, ooptions),
        treehut = oo(Treehut);

    // DEBUG: start
    //setInterval(() => {
    //    console.log(oo.context.store);
    //}, 1000*4);
    // DBEUG: end

    return treehut;
};
