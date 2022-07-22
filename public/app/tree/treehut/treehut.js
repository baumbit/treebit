// fix
// refactor
//
/*
 * v0.0.1-1
 * Treehut - App client (client(example: browser)+host(exampe:nodejs)) - Treenet
 * Light client that offers graphical cabinet interaction with content on Treenet.
 * Depends on a host running Grapevine for serving content.
 */
import OO from '../../oo/oo.js';
import {createResource as ooCreateResource} from '../../oo/resource-oo.js';
import {Toast} from './tugs.js';
import {createAppstyle} from '../style.js';
import {createStage} from './stage.js';
import {createClientStorage} from './client-storage.js';
import {handleInvitesAsync} from './connect.js';

export function Treehut(oo, {log, µ}) {
    // dev: begin
    window.__TREEHUT__ = {
        context: oo.context
    }; //console.log(oo.context.store);
    // dev: end

    // used for putting tags in treehut root element etc.,
    // this is safe because this element is never destroyed.
    µ.treehutrOOt = oo;

    // storage
    µ.clientStorage = createClientStorage();

    // create container
    createAppstyle(oo);

    // toaster singleton
    oo(Toast);

    // the stage (router and transition between pages)
    createStage(oo, log);

    // invites
    handleInvitesAsync(oo, µ);
}

export function createResource(resourceClient, poll, log) {
    // this middleware makes it possible to intercept all use of
    // the resource. this is a great place to log use and manipulate
    // the resource server requests.

    if(!poll) log?.n(1, '#ff5555', `Client resource`, {poll});
    else log?.n(1, '#00ff00', `Client resource.`, {poll});

    const f = function(r, oo, url, isNotifyParent, options_cb, cb) {
        let options;
        if(typeof isNotifyParent !== 'boolean') options = isNotifyParent;
        else options = options_cb;
        return r(oo, url, isNotifyParent, options_cb, cb);
    };

    const {resource, resourceAsync, setResourceAsync, sendResourceAsync, dropResourceAsync}
        = ooCreateResource(resourceClient, poll);

    return {
        res: function() {
            //if(arguments[1].startsWith('res/')) throw new Error();
            f(resource, ...arguments);
            // return path
            let path = arguments[1];
            const index = path.indexOf('?');
            if(index > 0) path = path.substring(0, index); //console.log('path', path);
            return path;
        },
        resAsync: function() { //log(...arguments);
            return f(resourceAsync, ...arguments);
        },
        onres: function() { //log(...arguments);
            return f(resource, ...arguments);
        },
        setres: setResourceAsync,
        setresAsync: setResourceAsync,
        sendRes: sendResourceAsync,
        sendResAsync: sendResourceAsync,
        dropres: dropResourceAsync,
        dropResAsync: dropResourceAsync
        // TODO add buildPath if it becomes neccessary. should probably be avoided
    };
};

