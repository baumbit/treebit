function TreeRetrieverLog() {
    let cntRun = 0;
    const arr = [];

    function add({ß}) { //console.log(name, log);
        arr.push({ß});
        // TODO filter level
        return function treeRetriever() {
            const arr = Array.prototype.slice.call(arguments),
                  log = arr.shift();
            cntRun++;
            log('#898989', 'run: ' + cntRun + '\n', ...arr, run());
        };
    }

    function run() {
        try {
            let s = '\n';
            arr.forEach(({ß}) => {            //console.log('-------------->', ß);
                const treeRetriever = ß.grapevine.getTreeRetriever(),
                      peers = ß.grapevine.getPeerProxies();
                peers.each(o => {
                    s += '\tPeer: ' + o.id + ' \n';
                    const
                        rp = o.getReplier(),
                        {earned, grace, available, share, start, duration} = rp.getQuota(),
                        refill = start + duration;
                    s += `\t\t\tQuota ${Math.floor(rp.getShare() * 1000)/10}%% Available: ${rp.getAvailableQuota()}/${available}, Weight: ${rp.getWeight()} Note score: ${rp.totalNoteScore()} Initialized: ${!rp.isUnitialized()} \n`;
                    s += `\t\t\tRefill in: ${refill - Date.now()}ms : ${new Date(refill)} \n`;
                });
            });
            return s;
        } catch(e) {
            console.error(e);
        }
    }

    return {
        add
    };
}

const singleton = new TreeRetrieverLog();

export function createTreeRetrieverLog({ß}) {
    return singleton.add({ß});
}

