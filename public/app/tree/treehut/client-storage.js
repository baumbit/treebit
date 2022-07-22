export function createClientStorage() {
    const localStorage = {};
    return {
        get: (name) => {
            let o = localStorage[name];
            if(!o) {
                o = createLocalStorage(name);
                localStorage[name] = o;
            }
            return o;
        }
    };
};

export function createLocalStorage(name) {
    const k = (k) => { return name + '/' + k; };
    const db = {
        dropAsync: () => {
            for(let i = 0, k; localStorage.length; i++) {
                k = localStorage.key(i);
                if(k.startsWith(name)) {
                    localStorage.removeItem(k);
                }
            }
        },
        setAsync: (key, value) => {
            localStorage.setItem(k(key), JSON.stringify(value));
        },
        getAsync: (key) => {
            let s = localStorage.getItem(k(key));
            try {
                if(s) {
                    s = JSON.parse(s);  //L(k(key), s);
                    return s;
                }
            } catch(e) {
            }
        },
        hasAsync: (key) => {
            return !!localStorage.getItem(k(key));
        },
        removeAsync: (key) => {
            return localStorage.removeItem(k(key));
        },
        deleteAsync: (key) => {
            db.removeAsync(key);
        },
        stopAsync: () => {
            // nothing to stop
        }

        ,debugDump: () => { console.log('=== STORAGE DUMP - LOCAL STORAGE DB ===');
            console.error('TODO impl');
        }
    };
    return db;
};

