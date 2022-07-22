import {Signin} from '../../oo/snatch-oo.js';
import {Bar} from './bar.js';
import {Logo} from '../logo.js';

const DEV = false;
//import {Icon} from './icon.js';
//import {createArrayList} from './infinite-list.js';
//import {eachAsync} from '../../oo/utils.js';

export function TreehutSignin({oo, go, sendRes}, {µ}) {              //console.log(µ);

    oo.css(`
    TreehutSignin button {
        background-color: var(--graybright);
        color: #fff;
        font-variant: small-caps;
        margin-top: 10px;
    }

    TreehutSignin input {
        margin-top: 10px;
    }
    `);

    oo(Logo).style({marginTop: '50px', transform: 'scale(0.5, 0.5)', height: '260px'});
    oo('center')('h1', 'Treehut');

    oo = oo('center')('div').style({marginTop: '50px'});

    const snatch = µ.resourceClient.snatch;

    oo(Signin, {snatch, showAdd:false, autoRedirect:true});
    oo(SigninRefresh);
    //oo(Bar);
};

export function SigninRefresh(oo, {µ}) {
    try {
        oo(µ.resourceClient.snatch.SigninRefreshTug);
    } catch(e) {
        console.error(e);
        go('/signin');
    }
};
//import OO from '../../../oo/oo.js';
//import {createSnatchClient, Signin} from '../../../oo/snatch-oo.js';
//import {createLog, eachAsync, setBrowserExitWarn} from '../../../oo/utils.js';
//import {createResourceClient, createResource} from '../../../oo/resource-oo.js';
//import {CREATE} from '../dashboard/client-side.js';
//import {createAppstyle} from '../../style.js';
//import {Logo} from '../../logo.js';
//    oo(Logo).style({marginTop: '50px', transform: 'scale(0.5, 0.5)', height: '260px'});
//    oo('center')('h3', 'welcome to');
//    oo('center')('h1', 'Treehut Hotel');
//
//    oo = oo('center')('div').style({marginTop: '50px'});
//
//    const snatch = µ.resourceClient.snatch;
//
//    oo(Signin, {snatch})
//        .setAdd({text:'Create new'})
//        .onAddAsync(async ({userName, password}) => {
//            let {data, error} = await sendResourceAsync(CREATE, {userName, password});
//            if(!error) {
//                await snatch.signInAsync({userName, password});
//            }
//            return true;
//        })
//        .onSigninFailedAsync((result) => {
//            // TODO errorToast(oo, 'Failed');
//        })
//        .onProfile(({oo:o, profile}) => {
//            o.destroy();
//            //const domain = profile.domains[0];
//            //// reload page completely to load treehut beacause treehut hotel is a different single-page app then treehut
//            //window.location = `/node/${domain}`;
//            //oo('span', `Signed in as: <b>${profile.userName}</b>`);             console.log(profile);
//            //oo('br');
//            //oo('span', 'Open');
//            //oo.timer(500, () => {
//                //oo('br');
//                if(profile.domains.length === 0) {
//                    oo('button', 'dashboard').onclick(() => {
//                        window.location = '/dashboard';
//                    });
//                } else if(profile.domains.length === 1) {
//                    window.location = `/node/${profile.domains[0]}`;
//                } else {
//                    profile.domains.forEach((domain) => {
//                        oo('button', `node: ${domain}`).onclick(() => {
//                            window.location = `/node/${domain}`;
//                        });
//                    });
//                }
//            //});
//        });
//
