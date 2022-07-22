/**
 * TODO
 *      optimize:
 *          create functions (such as preprocessor) lazily, but stash in app in manager to avoid re-creating them anew for every requests
 */
import {getSnatch, getManager, getHotelOrl} from '../server.js';
import {createLog} from '../../../oo/utils.js';
import {config} from './config.js';
import {createResourceRouter, createSessionAwareResourceRoutePreprocessor as preprocessor} from '../../../oo/resource-oo.js';
import {sendSnatchResponse, parseSnatchRequestAsync, handleSigninRedirect} from '../../../oo/snatch-session.js';
import {createResourceApi} from '../../resource-api.js';

const {addRoute, router:resourceRouter} = createResourceRouter();
createResourceApi(addRoute);

export function buildRouterBasename(nodeId) {
    // note: node identity on the treebit network is NOT defined by its URL.
    // this is perhaps most easily grokked if pondering what happens when a
    // node is exported from one hotel and imported to another hotel. if that
    // happens the base url will change to the new hotel url and the its even
    // possible that the node identifier will have to change, because of a
    // node with the same id already exists at the new hotel. if this is the
    // case the whole URL will be changed. however, if node communicate the new
    // url to its peers, they will be able to identifty the node through its
    // private key. thus there is zero risk of conflacting two nodes that
    // uses similar (ie. different hotel base url, but same node id) urls.
     return `/node/${nodeId}`;
};

export function buildNodeUrl(nodeId) {
    const basename = buildRouterBasename(nodeId);
    const hotelOrl = getHotelOrl();

    return {
        cn: `${hotelOrl.cn}${basename}`,
        onion: hotelOrl.onion ? `${hotelOrl.onion}${basename}` : null
    };
};

export async function handleGrapevineApiAsync(nodeId, data, protocol) {   //console.log('handleGrapevineApiAsync', {nodeId, data});
    const {ß} = await getManager().awakeAppAsync(nodeId);       //console.log('getManager got:', {ß});
    if(ß) {
        const result = await ß.messenger.receiveAsync(data, protocol); //console.log('handleGrapevineApiAsync result', {result});
        return result;
    } else {
        console.error('TODO create function to creawte these kinds of _standardized_ messages. should be same as in resource-api errors');
        return {error:'404'}; // TODO add message and set error true or something.
    }
};
export function parseWebTreehutUrl(url, search='', pathname) {
    let i = url.indexOf('?');
    if(i > 0) {
        search = url.substring(i);
        pathname = url.substring(0, i);
    } else {
        pathname = url;
    }

    const
        pathSegments = pathname.split('/'),
        nodeId = pathSegments[2],
        basename = buildRouterBasename(nodeId),
        relativeUrl = url.substring(basename.length),
        isApi = pathSegments[3] === 'api',
        isResourceApi = isApi && pathSegments[4] === 'res',
        isGrapevineApi = isApi && pathSegments[5] === 'grapevine',
        manager =  getManager(),
        snatch =  getSnatch(),
        r = { url, relativeUrl, basename, pathname, search, pathSegments, nodeId, isApi, isResourceApi, isGrapevineApi, manager, snatch };
    //console.log('parseWebTreehutUrl', r);
    return r;
};

export async function webTreehutServer(req, res, protocol) { //console.log('webTreehutServer url=', req.url);
    const
        {
            url, basename, relativeUrl, pathname, search, pathSegments, nodeId, isResourceApi, isGrapevineApi, manager, snatch
        } = parseWebTreehutUrl(req.url),
        stopStopwatch = manager.startStopwatch(),
        session = await snatch.handleSnatchSessionAsync(req, res, relativeUrl, nodeId);

    if(session.isRequestConsumed) {
        stopStopwatch('snatch');
        return;
    }
    let data;

    // handle grapevine requests
    if(isGrapevineApi) {
        data = await handleGrapevineApiAsync(nodeId, await parseSnatchRequestAsync(req), protocol);
        stopStopwatch('grapevine');
        sendSnatchResponse(res, {json: (data||{}) });
        return;
    }

    const {ß, oo} = await manager.awakeAppAsync(nodeId);    //console.log({ß, oo});
    if(!oo) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.write(`Node ${nodeId} not found.`);
        res.end();
        stopStopwatch('notfound404');
        return;
    }

    // handle resource requests
    if(isResourceApi) {
        data = await parseSnatchRequestAsync(req);
        pathSegments.splice(0, 4);
        const resPath = '/' + pathSegments.join('/') + search; //console.log('Webtreehut server resource request: ' + resPath, session);
        const out = await resourceServer(ß, resPath, data, session, manager);
        stopStopwatch('res');   //console.log(`Serving resource API request in ${stopStopwatch('res')} millis: "${url}"`, {data});
        sendSnatchResponse(res, {json: (out||{}) });
        return;
    }

    // handle webpage request
        // handle sign-in / refresh session
    //console.log('Webtreehut server html request: ' + url, session);
    const
        refreshPath = `${basename}/signin/refresh`,
        signinPath = `${basename}/signin`;
    if(handleSigninRedirect(res, url, session, {referrerPath: relativeUrl, signinPath, refreshPath, errorPath:'/'})) return;

        // render app
    // the client uses relative path internally so that URL origin and
    // basePathname (which changes with nodeId) does not have to be
    // hardcoded into routes.

    oo.go(relativeUrl);
    await oo.resolvePromisesAsync(() => {
        const html = oo.context.asHtml();
        const stopwatchTime = stopStopwatch('app');
        console.log(`Serving HTML in ${stopwatchTime} millis: "${req.url}"`);   //console.log(html);
        sendSnatchResponse(res, {html});
    });
}

export async function resourceServer(ß, path, data, session, hotel) { //console.log('+++ resourceServer +++', {path, data}); console.trace();
    // Note: there is only one instance of resourceRouter and different
    // WebTreehuts instances share the use of it. the route preprocessor
    // ensure the proper WebTreehut is accessible when responding to the request.
    // XXX be sure to not leak data between WebTreehut instances.
    const parcel = await resourceRouter(path, data, preprocessor({...ß, session, hotel}));
    //console.log('resourceServer', {path, data, parcel});
    return parcel;
};

