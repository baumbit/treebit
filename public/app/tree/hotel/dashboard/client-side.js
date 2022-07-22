import {createResourceClient, createResource} from '../../../oo/resource-oo.js';
import {createLog, eachAsync, copyToClipboard} from '../../../oo/utils.js';
import OO from '../../../oo/oo.js';
import {SESSION_CHANGED_EVENT} from '../../../oo/snatch-oo.js';
import {createSnatchClient, Signin} from '../../../oo/snatch-oo.js';

export const
    CREATE = 'res/manager/create';

const
    NETWORK_NODES = 'res/network/nodes',
    HOTEL_SHUTDOWN = 'res/hotel/shutdown',
    APP = 'res/app',
    LIST = 'res/manager/list',
    STATS = 'res/manager/stats',
    // debug
    DEBUG_CRASH = 'res/debug/crash',
    DEBUG_SPAWN = 'res/debug/spawn';

const
    PWD_DEBUG = 'dragonfirewillkeepsecretsafe'; // TODO XXX TODO remove when finished coding manager etc. XXX not in production

export function createDashboard(oo) {
    const
        html = oo('html'),
        head = html('head'),
        body = html('body');

    head('script')
        .attr('type', 'module')
        .attr('defer', undefined)
        .noescapeHtml(`
            import {createDashboardInBrowser} from "/app/tree/hotel/dashboard/client-side.js";
            window.onload = createDashboardInBrowser;
        `);

    body.css(`
        body {
            background-color: #353337;
            color: #fefefe;
        }

        button {
            font-weight: bold;
        }

        table {
            text-align: start;
        }
    `, 'App');

    if(!OO.isNodeJs) {
        body(Dashboard);
    }
    //else {
    //    console.log('\r\n * * *  h o t  e l   r e n d e r i n g   d i s a b l e d   * * * \r\n');
    //}

    return oo;
};

export function createDashboardInBrowser() {
    const
        snatch = createSnatchClient(),
        log = createLog('DASHBOARD', 0),
        µ = {log};
    µ.µ = µ;
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
        snatch.setBasename(options.ooptions.routerBasename);
        console.log(µ);
        createDashboard(oo);
        done();
        log(µ);
    });
    window._u_ = µ;
    window._oo_ = oo; // not required but nice for dev purposes
};

function Dashboard({oo, resourceAsync}, {µ}) {              //console.log(µ);
    const
        snatch = µ.resourceClient.snatch,
        ref = 'cur',
        render = () => {
            if(snatch.isSignedOut()) {
                oo('span', 'Sign in as admin, or create a new user.');
                oo(Signin, {ref, snatch})
                    .onProfile(render)
                    .setAdd({text: 'Create new dashboard user'});
            } else {
                const div = oo('div', {ref});
                div(Signout);
                div(Workbench);
            }
        };
    oo('h2', 'Dashboard');
    render();
}

function Checkbox({oo}, {text, checked=false}) {
    const onClicked = oo.xx('onClicked');
    const checkbox = oo('input', {type:'checkbox'}).onclick(({oo}) => onClicked(oo.elm.checked));
    checkbox.elm.checked = checked;
    const span = oo('span', text);
    oo.x([
        function setChecked(b) {
            checkbox.elm.checked = b;
            enable = b;
        },
        function setText(s) {
            span.text(text);
        }
    ]);
}

function Password({oo}, {µ, userName}) {
     const input = oo('input', {type:'password'}).oninputed(async ({value:password}) => {
        if(!password.length) return;
        try {
            await µ.resourceClient.snatch.setPasswordAsync({userName, password});
            alert('Password changed');
        } catch(e) {
            console.error(e);
            alert('error');
        } finally {
            input.elm.value = '';
        }
    });
}

function Signout({oo}, {µ}) {
    const
        snatch = µ.resourceClient.snatch,
        profile = snatch.getProfile();
    let configDiv;
    let usersDiv;
    const renderUsers = async () => {
        const list = await snatch.listUsersAsync();
        usersDiv.clear();
        list.map(({userName, admin, domain}) => { console.log({userName, admin, domain});
            const userDiv = usersDiv('div');
            userDiv('span', userName).style({margin:'10px'});
            userDiv(Checkbox, {text:'Admin', checked:admin}).onClicked(async (value) => {
                await snatch.setAdminEnabled({userName, value});
                renderUsers();
            }).style({margin:'10px'});
            userDiv('span', 'Domains:')('input', {value:domain}).oninputed(async ({value:domain}) => {
                await snatch.setDomainAsync({userName, domain});
                renderUsers();
            });
            userDiv('button', 'Delete').style({color:'#f00'}).onclick(async () => {
                await snatch.deleteUserAsync(userName);
                renderUsers();
            });
        });
    };
    const renderConfig = async () => {
        configDiv.clear();
        const config = await snatch.configAsync();
        configDiv(Checkbox, {text:'Add user API enabled', checked:config.isAddUserApiEnabled}).onClicked(async (checked) => {
            config.isAddUserApiEnabled = checked;
            await snatch.configAsync(config);
            renderConfig();
        });
    };
    oo('button', `Sign out ${profile.userName}${ profile.isAdmin ? ' (admin)' : ''}`).onclick(async () => {
        await snatch.signOutAsync();
    });
    if(profile.isAdmin) {
        // user is admin
        oo('button', 'List users').onclick(renderUsers);
        oo('button', 'Config').onclick(renderConfig);
    } else {
        // normal user
        oo('button', 'Delete').style({color:'#f00'}).onclick(async () => {
            await snatch.deleteUserAsync(profile.userName);
            await snatch.signOutAsync();
        });
    }
    oo('br');
    oo('span', 'Change password:')(Password, {userName:profile.userName});
    configDiv = oo('div');
    usersDiv = oo('div');
}

function Workbench({oo, resourceAsync}, {µ}) {
    const snatch = µ.resourceClient.snatch;
    //oo('h1', 'Dashboard for treehuts');
    const panel = oo('h2', 'Workbench');
    // TODO replace with timedout button
    panel('button', 'Shutdown').style({color:'#f00'}).onclick(() => {
        resourceAsync(HOTEL_SHUTDOWN);
    });
    panel('button', 'Crash').style({color:'#f00'}).onclick(() => {
        resourceAsync(DEBUG_CRASH);
    });
    panel('button', 'Spawn some apps').style({color:'#000'}).onclick(async () => {
        await resourceAsync(DEBUG_SPAWN);
        await snatch.setDomainAsync({userName:'user', domain:'dbg1'});
        resourceAsync(LIST);
    });
    // TODO add server side make sure client-side is notified before shutting down
    // .on(HOTEL_SHUTDOWN, 'div', (isSuccess, o) => {
    //    if(isSuccess) {
    //        o('b', 'HOTEL HAS BEEN SHUTDOWN');
    //    }
    //});

    oo(Stats);
    oo(Apps);
    oo(Network);
}

function fromMillis(ms) {
    return {
        hour: Math.floor(ms / (1000*60*60)) % 60,
        min: Math.floor(ms / (1000*60)) % 60,
        sec: Math.floor(ms / (1000)) % 60,
        ms: ms % 1000
    };
}

function Stats({oo, resourceAsync}) {
    resourceAsync(STATS); // TODO add polling

    oo('h2', 'Statistics')('button', 'Refresh').onclick(() => {
        resourceAsync(STATS);
    });

    oo('div').on(STATS, 'div', ({alive, cntAdded, cntRemoved, lifespan, mem, stopwatch, countApps, countSleep, countOO, countTimeout, countInterval, activity}, o) => {
        o('span', `Total: ${countApps} Sleep: <b>${countSleep}</b> OO: ${countOO}`)._('br');
//        //o('h3', `Mem`)._('br');
        o('span', `Awake: <b>${alive}</b> (Added: ${cntAdded} Removed: ${cntRemoved})`)._('br');
        o('span', `Timeouts: <b>${countTimeout}</b> Intervals: <b>${countInterval}</b>`)._('br');
        o('span', `Lifespan in memory. avg ${Math.ceil((lifespan.avg/1000)/60)} minutes, max ${Math.floor(((lifespan.max/1000)/60)/60)} hours, min ${Math.ceil((lifespan.min/1000))} seconds`)._('br');
        o('span', `<b>${Math.ceil(mem.current / alive)}</b> MB RSS/awake`)._('br');
        o('span', `Rss: <b>${mem.current} MB</b> Avg: ${mem.avg}`)._('br');
        o('span', `Div: <b>${Math.floor(mem.divergence * 100)}%</b>`)._('br');
        o('span', `Top: ${mem.top} - ${new Date(mem.topDate)}`)._('br');
        o('span', `Low: ${mem.low} - ${new Date(mem.lowDate)}`)._('br');
        for(let p in stopwatch) {
            if(stopwatch.hasOwnProperty(p)) {
                let {min, max, avg} = stopwatch[p];
                o('span', 'Stopwatch ')('b', p)._('span', `: min ${min}, max ${max}, avg ${avg}`);
                o('br');
            }
        }
    });
}

function Apps({oo, resourceAsync, dropResourceAsync, sendResourceAsync}, {µ}) {
    resourceAsync(LIST); // TODO add polling

    oo('h2', 'Apps')
        ('button', 'Destroy all').style({color:'#f00'}).onclick(async () => {
            if(confirm('Are you sure you want to destroy ALL the apps?')) {
                const list = await resourceAsync(LIST);
                await eachAsync(list, async ({localId}) => {
                    await dropResourceAsync(`${APP}/${localId}`);
                });
                await resourceAsync(LIST);
            }
        })._
        ('button', 'Refresh').onclick(() => {
            resourceAsync(LIST);
        })._
        ('button', 'Add new').onclick(async () => {
            const userName = prompt('username', 'user' + parseInt(Math.random()*10) );
            const password = PWD_DEBUG;
            const data = {userName, password};
            await sendResourceAsync(CREATE, data);
            resourceAsync(LIST);
            resourceAsync(STATS);
        });

    oo('div').on(LIST, 'ul', true, (arr, oo) => {
        arr.each(({localId, id, nrl, created, activity}) => {
            let li = oo('li');
            li('b', localId)('button', nrl.cn).onclick(() => {
                //copyToClipboard(nrl.onion)
                window.open(nrl.cn, '_blank');
            }).elm.disabled = !nrl.cn;
            li('b', localId)('button', '...' + nrl?.onion?.substring(nrl.onion.indexOf('.onion')-6) ).onclick(() => {
                copyToClipboard(nrl.onion)
                window.open(nrl.onion, '_blank');
            }).elm.disabled = !nrl.onion;
            const {hour, min, sec, ms} = fromMillis(Date.now() - created);
            li('br')._('span', `App age ${hour} hours ${min} minutes ${sec} seconds, created ${new Date(created)}`);
            if(activity.created) {
                const {created, countPromises, countTimeouts, countIntervals} = activity;
                const {hour, min, sec, ms} = fromMillis(Date.now() - created);
                li('br')._('span', `App awake for ${hour} hours ${min} minutes ${sec} seconds, since ${new Date(created)}`)
                    ._('button', 'sleep').onclick(() => {
                        resourceAsync(`${APP}/${localId}?sleep=true`, () => {
                            resourceAsync(LIST);
                            resourceAsync(STATS);
                        });
                    });
                li('br')._('span', `Unrsesolved promises ${countPromises}, Timeouts ${countTimeouts}, Intervals ${countIntervals}`);
            } else {
                li('br')._('span', `App is sleeping`)._('button', 'awake').onclick(() => {
                    resourceAsync(`${APP}/${localId}`, () => {
                        resourceAsync(LIST);
                        resourceAsync(STATS);
                    });
                });
            }
            li('br')._('span', 'Full id: '+ id)('button', 'destroy').style({color:'#f00'}).onclick(() => {
                dropResourceAsync(`${APP}/${localId}`);
                resourceAsync(LIST);
                resourceAsync(STATS);
            });
        });
    });
}

function Network({oo, resourceAsync}) {
    const count = 2;
    const nextPage = (index) => {
        if(index === null) index = 0;
        resourceAsync(`${NETWORK_NODES}?index=${index}&count=${count}`);
    };
    nextPage(0);

    oo('h2', 'Network nodes')
        ('button', 'Refresh').onclick(() => {
            nextPage(0);
        });

    oo('div').on(NETWORK_NODES, 'ul', ({next, list}, oo) => {
        list.forEach(({localId, url}) => {
            let li = oo('li');
            li('b', localId)('button', 'open: ' + url).onclick(() => {
                window.open(url, '_blank');
            });
        });
        if(list.length === 0) oo('button', 'First page').onclick(() => nextPage(null));
        else oo('button', 'Next page').onclick(() => nextPage(next));
    });
}

