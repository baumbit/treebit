const oldArrayMap = Array.prototype.map;
Array.prototype.map = function() {
    const callbackFn = arguments[0];
    arguments[0] = function() {
        const result = callbackFn(...arguments);
        if(Object.prototype.toString.call(result) === '[object Promise]') {
            console.error('replace with util.js:mapAsync');
        }
        return result;
    };
    return oldArrayMap.call(this, ...arguments);
};

