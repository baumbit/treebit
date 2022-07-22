import OO from './oo.js';
import {createResourceRouter} from "./resource-oo.js";

function createDatabaseApi(route) {
    const db = {
        first: {text:'first', active:true}
    };

    route('todos/:text', (done, {text}, {/* params i.e. url?k=v&x=y */}, todo) => {
        if(todo) {
            db[text] = todo;
        }
        db[text].serverMs = Date.now();
        done(db[text]);
    });

    route('todos/:text/active', (done, {text}, {}, isActive) => {
        db[text].active = isActive;
        db[text].serverMs = Date.now();
        done(db[text].active);
    });
}

export function createServer() {

    const {router, addRoute} = createResourceRouter();
    createDatabaseApi(addRoute); // add api to router

    async function simulateFetch(path, data) {
        if(data && data.SET) {
            data = data.data;
        }
        const parcel = await router(path, data);
        // clone to simulate message passsing on a network,
        // which will ensure that manipulation of objects
        // client side wont affect server-side.
        return JSON.parse(JSON.stringify(parcel));
    }

    return {
        simulateFetch
    };

};

