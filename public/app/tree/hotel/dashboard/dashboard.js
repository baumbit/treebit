import {createDashboard} from './client-side.js';
import {getManager, getSnatch} from '../server.js';
import OO from '../../../oo/oo.js';
import {createResourceRouter, createSessionAwareResourceRoutePreprocessor as preprocessor} from '../../../oo/resource-oo.js';
import {createResourceApi} from './resource-api.js';
import {sendSnatchResponse, parseSnatchRequestAsync} from '../../../oo/snatch-session.js';

const {addRoute, router:resourceRouter} = createResourceRouter();
createResourceApi(addRoute);

export async function dashboardServer(req, res) { console.log('------------> dashboardServer raw:', req.url);
    const
        manager = getManager(),
        snatch = getSnatch(),
        url = new URL('foo://'+req.url),
        urlSegments = url.pathname.split('/'),
        routerBasename = '/dashboard',
        relativeUrl = req.url.substring(routerBasename.length),
        session = await snatch.handleSnatchSessionAsync(req, res, relativeUrl, 'dashboard'); //console.log({session});

    if(session.isRequestConsumed) {
        return;
    }

    const oo = await createDashboardOO(routerBasename);

    // handle request
    if(urlSegments[2] === 'api') {
        const data = await parseSnatchRequestAsync(req); //console.log('dashboardServer API', data);
        urlSegments.splice(0, 3);
        const path = '/' + urlSegments.join('/') + url.search; //console.log({path});
        const parcel = await resourceRouter(path, data, preprocessor({manager, session, log:console.log}));
        sendSnatchResponse(res, {json:parcel});
    } else {
        //if(handleSigninRedirect(res, basePath, session, {referrerPath:basePath, signinPath:`/`, errorPath:'/'})) return;
        oo.go(relativeUrl);
        await oo.resolvePromisesAsync(() => {
            const html = oo.context.asHtml();
            sendSnatchResponse(res, {html});
        });
    }

    await oo.context.destroyAsync();
};

async function createDashboardOO(routerBasename) {
    // note: there is no need (at this point) to server render dashboard dashboard pages,
    // hence to reduce maintenance cost and reduce complexity, it is only rendered
    // fully in the browser.

    const
        ooptions = { renderVirtual: true },
        {oo, on, $:{$, set, drop, prepend, push}} = OO(undefined, undefined, undefined, ooptions);

    oo.context.setHeadlessHistory();
    createDashboard(oo);

    // bootloader
    const optionsClientSide = {
        app: {},
        ooptions: {
            routerBasename,
            renderVirtual: false
        }
    };
    oo.context.addBootloader({path: '/app/oo/oo.js', options: optionsClientSide});

    return oo;
}
