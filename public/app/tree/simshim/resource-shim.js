import {createResourceRouter, createResourceClient, createSessionAwareResourceRoutePreprocessor as preprocessor} from '../../oo/resource-oo.js';
import {createResourceApi} from '../resource-api.js';
//import {timeout} from '../timers.js';

const DEBUG = false;

const MOCKUP_NETWORK_LATENCY = 100;

export function createResourceApiAndClient({ß, log}) {            //console.log({oo, ß});

    const {router, addRoute} = createResourceRouter();

    //addRoute({block:false}, '/*', (o) => {
    //    will catch everything... good place to check signatures etc
    //});
    const route = function(path, cb) { //console.log('resourceRouter', ...arguments);
        return addRoute(path, function(injectedByShim, done, props, searchparams, data) {
            if(data) {
                // in a real network the object will be serialized in transfer,
                // so lets clone it here to simulate that here.
                // note: when oo store cleans the route on navigation,
                // it will clean the data object prior to detaching it,
                // and cloning it here will prevent objects stored in the
                // server which would otherwise point to the same object to
                // be damaged (naturally this could never occur on a real network).
                data = JSON.parse(JSON.stringify(data));
            }
            cb(injectedByShim, function(o, err) {
                done(o, err);
            }, props, searchparams, data);
        });
    };
    createResourceApi(route);

    const resourceClient = createResourceClient({
        snatch: createSnatchClientShim(ß, router),
        cache: ß.config.CLIENT_CACHE_ENABLED,
        timeToLive: ß.config.CACHE_TTL,
        maxTimeToLive: ß.config.CACHE_MAX_TTL,
        baseResourcePath: '/'
    });

    return resourceClient;
};


function handleSnatchSessionShim() {
    return {
        isAdmin: true,
        isDomain: true,
        isReadAccess: true,
        isReadWriteAccess: true
    };
}


function createSnatchClientShim(ß, resourceRouter) {

    async function postAsync(path, data) { //console.log('postAsync', path, data);
        // XXX insert timoeut mockup here to simulate time it takes for network
        const session = handleSnatchSessionShim();
        const parcel = await resourceRouter(path, data, preprocessor({...ß, session}));  //console.log('done', JSON.stringify(parcel));
        // clone to simulate message passsing on a network,
        // which will ensure that manipulation of objects
        // client side wont affect server-side.
        return JSON.parse(JSON.stringify(parcel));
    }

    return {
        postAsync,
        getProfile: () => {
            console.error('TODO: impl simshim support');
        }
    };
}
