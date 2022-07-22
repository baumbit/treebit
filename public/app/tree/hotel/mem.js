export function createMem() {
    const getMem = (isSetup) => {
        if(global.gc) global.gc();
        let o = process.memoryUsage();
        for(let p in o) {
            let v = o[p];
            if(!isSetup) {
                v -= initial[p]; // subtract initial condition (such as the nodejs instance itself)
                v /= 1000000;
            }
            o[p] = v;
        }
        //console.log({isSetup, o});
        return o;
    };

    let initial, last, delta, low, top;

    function run() {
        if(!initial) {
            initial = getMem(true);
            last = getMem();
            delta = getMem();
            low = getMem();
            top = getMem();
        }

        let curr = getMem();
        let now = Date.now();
        for(let p in curr) {
            let l = last[p+'-avg'] || last[p]; 
            curr[p+'-avg'] = (l + curr[p]) / 2;

            let d = delta[p+'-avg'] || delta[p];
            delta[p] = curr[p] - last[p];
            delta[p+'-avg'] = (d + delta[p] + d) / 2;

            if(top[p] < curr[p]) {
                top[p] = curr[p];
                top[p+'-date'] = now;
            }
            if(low[p] > curr[p]) {
                low[p] = curr[p];
                low[p+'-date'] = now;
            }
        }
        let report = {
            last: last['rss'],
            current: curr['rss'],
            avg: curr['rss-avg'],
            divergence: (curr['rss'] - curr['rss-avg']) / curr['rss-avg'],
            low: low['rss'],
            lowDate: low['rss-date'],
            top: top['rss'],
            topDate: top['rss-date'],
            ms: Date.now()
        };
        last = curr;
        const friendly = [
            `Rss: ${report.current} MB Avg: ${report.avg}`,
            `Div: ${Math.floor(report.divergence * 100)}% - ${new Date()}`,
            `Top: ${report.top} - ${new Date(report.topDate)}`,
            `Low: ${report.low} - ${new Date(report.lowDate)}`
        ];
        const result = {
            report,
            last,
            delta,
            top,
            low,
            asString: () => friendly.join('\r\n\t')
        };
        return result;
    }
    run();

    return {
        run
    };
};
