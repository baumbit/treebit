/**
 * pure functions with no side-effects that are used on both client and server,
 * and is expected to have the same behaviour on both.
 */

export function sortEnabledProtocols(protocols) {
    return protocols.reduce((arr, o) => {
        if(o.enabled) arr.push(o);
        return arr;
    }, []).sort((a, b) => a.priority > b.priority);
};

