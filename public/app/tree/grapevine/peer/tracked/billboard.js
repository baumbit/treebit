/**
 * Content can be tracked for a multitude of reasons, such as but not limited to that which is being "followed".
 * A node must upload identifier for that which is tracks to its peers.
 * On receiving someting that is tracked, a peer will make best effort to relay the tracked information.
 */
export async function createTrackedBillboardAsync(ß, name, log) {
    // A node will post all items that it wants, to this storage.

    const
        lufo = await ß.storage.getAsync({name, persistent:true, lufo:true});

    async function destroyAsync() {
        await lufo.destroyAsync();
    }

    async function addAsync(key) {                                         log(0, ' add key: ' + key);
        await lufo.addAsync(key, key);
    }

    async function removeAsync(key) {                                      log(0, ' remove key: ' + key);
        await lufo.removeAsync(key);
    }

    async function eachAsync(limit=1, arr, filter) {
        //L(lufo);
        await lufo.eachValueAsync(async (k) => {                                       log(0, ' each. k= ' + k);
            //console.log('k=', k);
            const v = await filter(k);
            console.log({k, v});
            if(v === false) return false;  // end itteration
            if(v === undefined) return; // pretend key never existed and continue, i.e. dont affect limit
            limit--; // count as a hit
            if(v) arr.push(v); // add item if its truthy
            log(10, '  each', {limit, v, arr});
            return limit > 0; // if false, will end itteration
        });
        return arr;
    }

    return {
        addAsync,
        removeAsync, // TODO refecator to delete
        eachAsync,
        destroyAsync
    };
};

