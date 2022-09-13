import {createResponseObject} from '../../../oo/resource-oo.js';
import {createResource} from '../../treehut/treehut.js';
import {resourceServer} from './webtreehut.js';
import {createTreehut} from './client-side.js';
import {getDEV} from '../server.js';
import {mockupSigners, mockupForest} from '../../mockup.js';
import OO from '../../../oo/oo.js';

export async function createTreehutClientForServer({ß, config, routerBasename}) {
    // note: treehut is rendered also on server,
    // hence it depends on a resourceRouter also on the server.
    // TODO while the interface be the exact same as the
    // resourceClient running in the browser, it can be optimized
    // for server environment since this is where it runs.
    const
        log = ß.log.log('HUT', 0),
        µ = {config, log};
    µ.µ = µ;
    µ.resourceClient = createResourceClientForServer(ß);
    µ.app = {DEV:getDEV()};
    const
        isPollEnabled = false, // if this was true treehut instance on server would contiously query api.
        ooptions = {
            routerBasename,
            renderVirtual: true,
            globalProps: { µ, log },
            ooFunction: {
                // make resource available and linkable to Tugs,
                // so that resources can tried to Tug life-cycle and
                // garbage collected (resources are saved to store).
                ...createResource(µ.resourceClient, isPollEnabled, log)
            }
        };

    const {oo, on, $:{$, set, drop, prepend, push}} = OO(undefined, undefined, undefined, ooptions);
    oo.context.setHeadlessHistory();
    createTreehut(oo);
    // bootloader
    const optionsClientSide = {
        // these will be serialized and downloaded by browser client
        app: µ.app,
        ooptions: {
            routerBasename,
            renderVirtual: false
        }
    };
    oo.context.addBootloader({path: '/app/oo/oo.js', options: optionsClientSide});

    // mockup content
    await mockupSigners({ß, log});
    await mockupForest({ß, µ, log});

    return oo;
};

function createResourceClientForServer(ß) {
    // when Treehut is being server rendered,
    // it can/should bypass caching/sockets/etc.
    // instead it invokes the resource server directly,
    // which reduces load on system and speeds up
    // response time. theoretically it could access
    // node internals such as canopy, grapevine, ect
    // directly, but this would make development/maintenance
    // more error prone and cumbersome.

    async function resourceClient(path, data, cacheOptions={}) {
        const parcel = await resourceServer(ß, '/' + path, data).catch(console.error);
        return createResponseObject({...parcel, cacheOptions, from:'external'});
    }

    return resourceClient;
};

