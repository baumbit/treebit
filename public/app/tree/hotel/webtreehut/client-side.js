import {createResourceClient} from '../../../oo/resource-oo.js';
import {createLog} from '../../../oo/utils.js';
import {config} from './config.js';
import {Treehut, createResource} from '../../treehut/treehut.js';
import {createPlatformstyle} from '../../style.js';
import OO from '../../../oo/oo.js';
import {createSnatchClient} from '../../../oo/snatch-oo.js';

export function createTreehut(oo, µ) {
    const
        html = oo('html'),
        head = html('head'),
        body = html('body');
    body.css(`
        body {
            background-color: #1d1d1d;
        }
    `, 'App');

    head('meta')
        .attr('name', 'viewport')
        .attr('content', 'width=device-width');

    // note: this script tag will be rendered on server,
    // but only be executed in browser. it is used to
    // re-create the app client-side.
    head('script')
        .attr('type', 'module')
        .attr('defer', undefined)
        .noescapeHtml(`
            import {createTreehutClientInBrowser} from "/app/tree/hotel/webtreehut/client-side.js";
            window.onload = createTreehutClientInBrowser;
        `);

    // DEBUG: start
    //setInterval(() => {
    //    console.log(oo.context.store);
    //}, 1000*4);
    // DBEUG: end

    createPlatformstyle(oo);

    if(!OO.isNodeJs || !config.SERVER_RENDERING_DISABLED) {
        if(config.SERVER_RENDERING_DISABLED !== undefined) console.log('Server rendering:', !config.SERVER_RENDERING_DISABLED);
        //body('table')('tr')('td')(Treehut);
        body(App)(Treehut);

        // dev: begin
        if(µ.app.DEV) {
            window.__TREEHUT__ = {
                context: oo.context,
                oo,
                µ,
            };
            body('span', 'dev').style({position:'fixed', top:'5px', left: '5px', color: '#09F'}).onclick(() => {
                alert('Treehut is running in developer mode.\r\nTo access dev tools open browser developer console and type: __TREEHUT__');
            });
        }
        // dev: end

    }

    return oo;
};

function App({oo, css}) {
}

export function createTreehutClientInBrowser() {
    // timeout to give a chance to see how page look,
    // when rendered on server before client is created locally.
    setTimeout(() => { // TODO remove timeout
        const
            snatch = createSnatchClient(),
            log = createLog('HUT', 0),
            µ = {config, log};
        µ.µ = µ;
        µ.resourceClient = createResourceClient({
            cache: config.CLIENT_CACHE_ENABLED,
            timeToLive: config.CACHE_TTL,
            maxTimeToLive: config.CACHE_MAX_TTL,
            snatch
        });
        const
            ooptions = {
                // overide ooptions downloaded from server
                globalProps: { µ, log },
                ooFunction: {
                    ...createResource(µ.resourceClient, !config.CLIENT_CONTINOUS_POLLING_DISABLED, log)
                }
            };

        const oo = window.__OO__(ooptions, (oo, done, options) => {
            µ.app = options.app; console.log(options);
            snatch.setBasename(options.ooptions.routerBasename);
            createTreehut(oo, µ);
            done();
            log(µ);
        });
    }, 800);
};

