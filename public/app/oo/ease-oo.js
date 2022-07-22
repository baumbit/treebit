const FACTOR = 10000;

export function createEase(F, isStep) {
    let s, t, d, offset, dir, now, last, v;
    return {
        tick: () => {
            now = Date.now();
            v = F(s, t, now - offset, d); //console.log(now-offset, v * dir);
            if(isStep) {
                const change = last - v;
                last = v;
                return Math.round((change * dir) / FACTOR);
            }
            return Math.round((v * dir) / FACTOR);
        },
        timeLeft: () =>  {
            return d - (now - offset);
        },
        distanceLeft: () => {
            return Math.round((t - v) / FACTOR);
        },
        init: (startValue, targetValue, duration, direction) => {
            s = Math.round(startValue * FACTOR);
            t = Math.round(targetValue * FACTOR);
            d = duration;
            now = offset = Date.now();
            dir = direction;
            last = 0;
            v = 0;
            //console.log({s, t, d, offset, dir});
        }
    };
};

export function easeOutQuad(s, t, c, d) {
    c /= d;
    return -t*c*(c-2)+s;
};

export function linearTween(s, t, c, d) {
    return c*t/d+s;
};

