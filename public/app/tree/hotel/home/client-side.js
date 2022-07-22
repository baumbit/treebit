import OO from '../../../oo/oo.js';
import {createSnatchClient, Signin} from '../../../oo/snatch-oo.js';
import {createLog, eachAsync, setBrowserExitWarn, getParamsFromUrl} from '../../../oo/utils.js';
import {createResourceClient, createResource} from '../../../oo/resource-oo.js';
import {CREATE} from '../dashboard/client-side.js';
import {createPlatformstyle, createAppstyle} from '../../style.js';
import {Logo} from '../../logo.js';
import {createClientStorage} from '../../treehut/client-storage.js';
import {addInviteAsync} from '../../treehut/connect.js';

export function createHome(oo) {
    const
        html = oo('html'),
        head = html('head'),
        body = html('body');

    head('meta')
        .attr('name', 'viewport')
        .attr('content', 'width=device-width');

    head('script')
        .attr('type', 'module')
        .attr('defer', undefined)
        .noescapeHtml(`
            import {createHomeInBrowser} from "/app/tree/hotel/home/client-side.js";
            window.onload = createHomeInBrowser;
        `);

    if(!OO.isNodeJs) {
        body('App')(Home);
    }
    //else {
    //    console.log('\r\n * * *  h o t  e l   r e n d e r i n g   d i s a b l e d   * * * \r\n');
    //}

    return oo;
};

export async function createHomeInBrowser() {
    setBrowserExitWarn(false);
    const
        snatch = createSnatchClient(),
        log = createLog('HOME', 0),
        µ = {log};
    µ.µ = µ;
    µ.clientStorage = createClientStorage();
    µ.resourceClient = createResourceClient({
        cache: false,
        snatch
    });
    const
        CLIENT_CONTINOUS_POLLING_DISABLED = true,
        ooptions = {
            // overide ooptions downloaded from server
            globalProps: { µ, log },
            ooFunction: {
                ...createResource(µ.resourceClient, CLIENT_CONTINOUS_POLLING_DISABLED, log)
            }
        };
    const oo = window.__OO__(ooptions, (oo, done, options) => {
        µ.app = options.app; //console.log('options', options, ooptions, µ);
        snatch.setBasename(options.ooptions.snatchBasename); // set in home.js
        createHome(oo);
        done();                                                         log(µ);
    });
    window._u_ = µ;
    window._oo_ = oo; // not required but nice for dev purposes
};

async function Home({oo, go, sendResourceAsync}, {µ}) {
    oo.css(`
    Home Input {
        margin-top: 10px;
    }

    Home button {
        background-color: var(--graybright);
        color: #fff;
        font-variant: small-caps;
        margin-top: 10px;
    }

    @media (max-height: 700px) {
        Logo {
            margin-top: 30px;
            margin-bottom: 50px;
            /*background-color: #0000ff;*/
        }
    }

    @media (min-height: 701px) {
        Logo {
            margin-top: 80px;
            margin-bottom: 100px;
            /*background-color: #ff00ff;*/
        }
    }

    `);

    const urlParams = getParamsFromUrl(location.href);  console.log('urlParams', urlParams);
    await addInviteAsync(µ, urlParams.invite);

    window.__HOME__ = {
        context: oo.context
    }; //console.log(oo.context.store);
    µ.hOOme = oo;

    createPlatformstyle(oo);
    createAppstyle(oo);

    oo(Logo).style({transform: 'scale(0.5, 0.5)', height: '150px'});
    if(urlParams.invite) {
        oo('center')('h3', 'Welcome to Treehut Hotel');
        oo('center')('div').style({width:'50%',margin:'10px'})('span', 'Fill in the blanks, hit the button and your invitation will be handled!');
    } else {
        oo('center')('h3', 'welcome to');
        oo('center')('h1', 'Treehut Hotel');
    }

    oo = oo('center')('div');

    const snatch = µ.resourceClient.snatch;

    oo(µ.resourceClient.snatch.SigninRefreshTug);

    oo(Signin, {snatch})
        .setAdd({text:'Create new'})
        .onAddAsync(async ({userName, password}) => {
            let {data, error} = await sendResourceAsync(CREATE, {userName, password});
            if(!error) {
                await snatch.signInAsync({userName, password});
            }
            return true;
        })
        .onSigninFailedAsync((result) => {
            // TODO errorToast(oo, 'Failed');
        })
        .onProfile(({oo:o, profile}) => {
            o.destroy();
            //const domain = profile.domains[0];
            //// reload page completely to load treehut beacause treehut hotel is a different single-page app then treehut
            //window.location = `/node/${domain}`;
            //oo('span', `Signed in as: <b>${profile.userName}</b>`);             console.log(profile);
            //oo('br');
            //oo('span', 'Open');
            //oo.timer(500, () => {
                //oo('br');
                if(profile.domains.length === 0) {
                    oo('button', 'dashboard').onclick(() => {
                        window.location = '/dashboard';
                    });
                } else if(profile.domains.length === 1) {
                    window.location = `/node/${profile.domains[0]}`;
                } else {
                    profile.domains.forEach((domain) => {
                        oo('button', `node: ${domain}`).onclick(() => {
                            window.location = `/node/${domain}`;
                        });
                    });
                }
            //});
        });
}

