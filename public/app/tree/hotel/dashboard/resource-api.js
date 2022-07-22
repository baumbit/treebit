export function createResourceApi(/*{ondemand=true},*/ addRoute) {
    const
        res = (s,cb,options) => {
            if(s.indexOf(':GET') > 0 || s.indexOf(':DROP') > 0 || s.indexOf(':SET') > 0  || s.indexOf(':SEND') > 0)  {
                log.e('malformed resource route. using reserved keywords as path names', s);
                return;
            }
            addRoute('res' + s, cb, options);
        };

    res('/manager/create', async ({session, manager, log}, done, {SET}, {}, {userName, password}) => {              //log({signedNote});
        console.log('TODO add some sort of proof of work to create multiple accounts, since there no session is required');
        console.log('TODO add double cookie pattern to protect password');
        try {
            const id = await manager.createAppProfileAsync({userName, password}); //console.log('created', id);
            done(id);
        } catch(e) {
            console.error(e);
            done(null, 'failed to create app profile');
        }
    }, {overrideSession:true});

    res('/debug/:action', async ({manager, log}, done, {action}) => {
        if(action === 'crash') {
            throw new Error('manually induced crash')
        } else if(action === 'spawn') {
            await manager.debugSpawnAsync();
            done('spawn');
        }
    });

    res('/hotel/:action', async ({manager, log}, done, {action}) => {
        if(action === 'shutdown') {
            process.exit();
        }
        done(false, 'no such action');
    });

    res('/manager/stats', async ({manager, log}, done) => {
        const stats = await manager.getStatsAsync();
        done(stats);
    });

    res('/manager/list', async ({manager, log}, done) => {  // TODO refactor /list to /apps also in gui
        const list = await manager.listAppsAsync(); // TODO change func signature to apps
        done(list);
    });

    res('/app/:id', async ({manager, log}, done, {DROP, id}, {sleep}) => {       log('app', {id, DROP});
        if(DROP) {
            await manager.destroyAppAsync(id);
            done('dropped');
        } else if(sleep){
            await manager.sleepAppAsync(id);
            done('sleep');
        } else {
            await manager.awakeAppAsync(id);
            done('awake');
        }
    });

    res('/network/nodes', async ({manager, log}, done, {}, {index, count}) => {
        const page = await manager.getNetworkNodesAsync(parseInt(index, 10), parseInt(count, 10));
        done(page);
    });

};
