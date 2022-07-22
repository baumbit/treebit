/**
 * node         - a unique indentity on the bitree network [exists as an entity]
 * app          - a data container object, to glue a node and its stored resources (such as controlling user) together [exists permanently]
 * activity     - a container object, to glue an app and its webtreehut server instance together [exists runtime]
 * manager      - provides the means of manipulating activities
 *
 * The hotel manager has an index of all the app instances it is hosting.
 * An app instance can be created from an app profile (which can be saved to and loaded from disc).
 * When an app is instansiated the app profile (and some additional meta data) is added to a memory only based activity storage.
 * After having been added to activity storage, the app is referred to as an activity and is either "sleeping" or "awake".
 * When ever an activity is demanded to do work, it is awoken.
 * Hotel may put an activity to sleep, when it needs to free up memory.
 * An activity can be deleted withouth destroying the app.
 * An app can be destroyed, without deleting the node data, hence the node can be spun up on another server and retain its identity
 * on the network besides the URL which will have changed.
 * Note: an app retains its activity during sleep.
 */
import {createMem} from './mem.js';
import {createLufo as createDefaultLufo} from '../../oo/lufo.js';
import {config} from './webtreehut/config.js';
import {buildRouterBasename, buildNodeUrl} from './webtreehut/webtreehut.js';
import {createTreehutClientForServer} from './webtreehut/server-side.js';
import {generateNodeCredentialsAsync, generateNodeIdAsync} from '../crypto-tree.js';
import {createBAsync} from '../B.js';
import * as MESSENGER from './messenger.js';
import OO from '../../oo/oo.js';
import {createBucketTreeDbAsync} from '../../oo/buckettree-db.js';
import fsPromises from 'fs/promises';
import {eachAsync, createLog, onPlatformEvent, EXIT_EVENT} from '../../oo/utils.js';
import {PROFILE_UPDATED} from '../grapevine/peer/manager.js';
import {getHotelOrl} from './server.js';

const REPORT_INTERVAL_MS = 1000*60;
const DEBUG_AUTO_CREATE_NBR_APPS = 2;

export async function createManagerAsync(basePathDb, snatch, log) {
    const
        appDb = await createBucketTreeDbAsync({path:`${basePathDb}/hotel/app`});

    onPlatformEvent(EXIT_EVENT, () => {
        appDb.stopBlocking();
        log('hotel storage stopped');
    });

    let countOO = 0;

    const
        activities = {},
        memMonitor = createMemMonitor(),
        stopwatch = createStopwatch();

    async function getStatsAsync() {
        const
            index = await getIndexAsync(),
            countApps = Object.keys(index).length,
            {report} = memMonitor.getStats(),
            countSleep = countApps - report.alive;
        const stats = {
            stopwatch: stopwatch.getStats(),
            ...report,
            countApps,
            countSleep,
            countOO: OO.count,
            countTimeout: OO.timeout.count,
            countInterval: OO.interval.count
         }; //console.log(stats);
        return stats;
    }

    function createLocalId(index, id) {
        // make sure id is as short as possible to make tracking (logging etc) easier,
        // but protect against the pretty unlikely event of identical (shortened) ids.
        // this id is NOT local to the manager and will be used throughout everything
        // related to apps dependency on the hotel (such as but not limited to the storage).
        for(let i = 3, localId; i < id.length; i++) {
            localId = 'n' + id.substring(0, i);
            if(!index[localId]) return localId;
        }
    }

    async function createAppProfileAsync({userName, password}, debugId) {
        // an app is a container for a node and is made up of:
        //      an identifiter used to internally identify the app
        //      a permanent storage for the app data
        //      node data which can be used to re-create all other data not stored
        // sole purpose to refer to the node as an app here, is to make
        // it clear that its a container for the node and thus make it easier
        // to separate node related code, from app related code
        const
            nodeCredentials = await generateNodeCredentialsAsync(),
            index = await getIndexAsync(),
            localId = debugId || createLocalId(index, nodeCredentials.id);
        nodeCredentials.tag = localId;

        if(await snatch.loadUserAsync(userName)) throw new Error(`user(${userName}) already exists`);
        await snatch.createUserAsync({userName, password, domain:localId});

        const app = {
            localId,                // internal reference to app and used for external URL referencing
            created: Date.now(),
            userName,               // user who controls the app (there can be only one)
            nodeCredentials,        // node identity
            publicProfile: {}       // loaded from grapevine
        };
        //console.log('createAppProfileAsync', {app});

        await setAppProfileAsync(app);

        index[localId] = { localId };
        await appDb.setAsync('index', index);

        return localId;
    }

    async function getAppProfileAsync(localId) {
        const app = await appDb.getAsync(`app${localId}`);
        return app;
    }

    async function setAppProfileAsync(app) {
        await appDb.setAsync(`app${app.localId}`, app);
    }

    async function getIndexAsync() {
        let index = await appDb.getAsync(`index`);
        if(!index) index = {};
        return index;
    }

    async function destroyAppAsync(localId, isDestroyStorage=true, isDestroyUser=true) {
        const app = await getAppProfileAsync(localId);
        if(!app) throw new Error(`app(${localId}) does not exist`);
        const {userName} = app;
        //console.log('destroying app', localId, app);
        await sleepAppAsync(localId);               // should destroy oo
        delete activities[localId];                // delete memory reference to container
        await appDb.deleteAsync(`app${localId}`);      // delete data used to re-create app
        const index = await appDb.getAsync('index');   // delete app from index
        delete index[localId];
        await appDb.setAsync('index', index);
        if(isDestroyStorage) {                      // finally delete data created by app
            try {
                await snatch.deleteUserAsync(userName); console.log('deleted user', userName);
                await fsPromises.rm(`${basePathDb}/app/${localId}`, {recursive:true});
            } catch(e) {
                // path was going to be removed anyway, so no problem if it did not exist,
                // which could happen if app was never awake.
                if(e.errno != -2) {
                    throw e;
                }
            }
        }
    }

    async function sleepAppAsync(localId) {
        const activity = activities[localId];
        if(activity && activity.app) {
            return activity.app.ß.oo.context.destroyAsync();
        }
    }

    async function awakeAppAsync(localId) {
        // TODO i think there is a fair chance that not all objects are released here on destroy because they are stored on context!!!!

        // WebTreehut contains a node (living only server-side) and
        // a Treehut (GUI for interacting with node, which lives primarily
        // client-side such as browser, but may be server-rendered).

        let activity = activities[localId];
        if(activity && activity.app) {
            // app already awake, so return as fast as possible
            activity.lastAccess = Date.now();
            return activity.app.ß;
        }

        if(!activity) {
            // app profile has not been loaded yet
            const profile = await getAppProfileAsync(localId);
            if(!profile) {
                //throw new Error(`app profile(${localId}) not found`);
                return {ß:null, oo:null};
            }
            // create activity.
            const log = createLog(localId); // instance trackable log
            activity = {
                localId,
                profile,
                created: Date.now(),
                log
            };
            activities[localId] = activity;
        }

        // app is sleeping, so need to wake up
        const
            addToMonitor = memMonitor.createAdd(),
            routerBasename = buildRouterBasename(localId),
            nrl = buildNodeUrl(localId),
            tag = `t-${localId}`;

        //console.log({activity});
        const
            ß = await createBAsync({
                appId: localId,
                config,
                nrl,
                nodeCredentials: activity.profile.nodeCredentials,
                tag,
                log: activity.log
            });

        const
            oo = await createTreehutClientForServer({ß, config, routerBasename});

        ß.setMessenger(MESSENGER.createMessenger(ß));
        ß.setOO(oo);
        oo.context.onDestroy(() => {
            deleteOnGrapevine();
            ß.storage.stopAllBlocking();
            memMonitor.remove(localId);
            delete activity.app; // note: activity is preserved, while app is sleeping
        });

        activity.app = {
            ß
        };

        addToMonitor(localId);

        activity.lastAccess = Date.now();

        // everything should not be prepared and ready for start,
        // so lets run the start procedure.
        await ß.startAsync();

        await setMutableProfileProps(activity);
        const deleteOnGrapevine = ß.grapevine.on(PROFILE_UPDATED, () => setMutableProfileProps(activity));

        return activity.app.ß;
    }

    async function setMutableProfileProps(activity) {
        activity.profile.publicProfile = await activity.app.ß.grapevine.getPublicProfileAsync();
        await setAppProfileAsync(activity.profile);
    }

    async function listAppsAsync() {
        const index = await getIndexAsync('index');
        return eachAsync(Object.keys(index), async (localId, i) => {
            const
                profile = await getAppProfileAsync(localId);
            // profile might have been destroyed between enumerating index keys and itterating to it.
            if(profile) {
                const
                    {created} = profile,
                    {id} = profile.nodeCredentials,
                    elm = {
                        localId,
                        id,
                        nrl: buildNodeUrl(localId),
                        created,
                        activity: {}
                    };
                const activity = activities[localId];
                if(activity && activity.app) {
                    const {context} = activity.app.ß.oo;
                    elm.activity = {
                        created: activity.created,
                        lastAccess: activity.lastAccess,
                        countPromises: context.globalPromises.length,
                        countTimeouts: context.timer.countTimeout,
                        countIntervals: context.timer.countInterval
                    };
                }
                return elm;
            }
        }, []);
    }

    async function getNetworkNodesAsync(index/*read from this*/, count/*where to end reading*/, filter=()=>true) {
        let list = [],
            i = 0;
        for(let localId in await getIndexAsync()) {
            if(i >= index) {
                let profile = await getAppProfileAsync(localId); //console.log(profile);
                if(filter(profile.publicProfile)) {
                    let elm = {
                        id: profile.id,
                        localId,
                        nrl: buildNodeUrl(localId)
                    };
                    list.push(elm);
                    if(list.length === count) break;
                }
            }
            i++;
        }
        return {
            next: list.length ? i + 1 : null /* loop to begin */,
            list
        };
    }

    async function getNetworkNodeProfileAsync(localId) {
        const appProfile = await getAppProfileAsync(localId);
        if(appProfile) {
            const nodeProfile = {
                localId,
                id: appProfile.nodeCredentials.id,
                nrl: buildNodeUrl(localId),
                publicProfile: appProfile.publicProfile
            };
            return nodeProfile;
        }
    }

    async function debugSpawnAsync() {
        const password = 'dragonfirewillkeepsecretsafe';
        for(let i = 0, userName, password; i < DEBUG_AUTO_CREATE_NBR_APPS; i++) {
            userName = 'user' + i;
            let localId = await createAppProfileAsync({userName, password}, i === 0 ? 'dbg1' : undefined);
            await awakeAppAsync(localId);
        }
    }

    function getPublicInfo() {
        return {
            hotelOrl: getHotelOrl()
        };
    }

    return {
        getPublicInfo,
        listAppsAsync,
        createAppProfileAsync,
        destroyAppAsync,
        awakeAppAsync,
        sleepAppAsync,
        getNetworkNodesAsync,
        getNetworkNodeProfileAsync,
        memMonitor,
        startStopwatch: stopwatch.startStopwatch,
        getStatsAsync,
        //debug
        debugSpawnAsync
    };
};

function createStopwatch() {
    const stopwatch = {};

    function startStopwatch() {
        const start = Date.now();
        return (type) => {
            const
                v = Date.now() - start,
                o = stopwatch[type] || {};
            o.avg = (v + (o.avg || v)) / 2;
            if(!o.min || o.min > v) o.min = v;
            if(!o.max || o.max < v) o.max = v;
            stopwatch[type] = o;
            return v;
        };
    }

    return {
        startStopwatch,
        getStats: () => stopwatch
    };
}

function createMemMonitor() {

    const mem = createMem();

    let arr = [],
        cntAdded = 0,
        cntRemoved = 0,
        lifespan = {avg:null,min:null,max:null};

    function getStats() {
        const currMem = mem.run();

        const friendly = [
            `Alive: ${arr.length} (${Math.ceil(currMem.report.current / arr.length)} MB RSS/alive)`,
            `Added: ${cntAdded} Removed: ${cntRemoved}`,
            `Average lifespan: ${lifespan.avg} Max: ${lifespan.max} Min: ${lifespan.min}`
        ];

        const result = {
            report: {
                mem: currMem.report,
                alive: arr.length,
                cntAdded,
                cntRemoved,
                lifespan
            },
            asString: () => {
                return friendly.join('\r\n\t') + ' ' + currMem.asString();
            }
        };

        return result;
    }

    function createAdd() {
        const
            last = mem.run().report.current,
            o = {
                created: Date.now(),
            };
        return (id) => {
            o.mem = mem.run().report.current - last;
            o.id = id;
            arr.push(o);
            cntAdded++;
            return o;
        };
    }

    function remove(id) {
        let o;
        const i = arr.findIndex(o => o.id === id);
        if(i >= 0) {
            cntRemoved++;
            const v = Date.now() - arr[i].created;
            lifespan.avg = (v + (lifespan.avg || v)) / 2;
            if(!lifespan.min || lifespan.min > v) lifespan.min = v;
            if(!lifespan.max || lifespan.max < v) lifespan.max = v;
            o = arr[i];
            arr.splice(i, 1);
        }
        return o;
    }

    setInterval(() => {
        console.log(getStats().asString());
    }, REPORT_INTERVAL_MS);

    return {
        createAdd,
        remove,
        getStats
    };
}

