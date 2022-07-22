import OO from "../oo.js";
import {createResource} from "../resource-oo.js";

export function createClientInBrowser() {
    // timeout to give a chance to see how page look,
    // when rendered on server before client is created locally.
    setTimeout(() => {
         const ooptions = createOOptions();
         const oo = window.__OO__(ooptions, (oo, done) => {
             client(oo);
             done(); 
         });
         window.oo = oo; // not required but nice for dev purposes
    }, 800);
};

export function client({oo, route}) {
    // all the code in this function will be running
    // both on server and in browser...
    console.log('creating client');

    const html = oo('html');
    const head = html('head');
    const body = html('body');

    // ...but this script will only run in browser,
    // and is used for creating the app.
    head('script')
        .attr('type', 'module')
        .html(`
            import {createClientInBrowser} from "./example-webapp/client.js"
            window.onload = createClientInBrowser;
        `);

    // this is the client router that will take care of routing internal to the
    // app client. updates to the locationbar is purely cosmetical and no requests
    // will be sent to server for HTML. the following code instead decides how the
    // app should be rendered.
    // note: this code will also be runing on the server where the result can be
    // rendered as HTML. (@see server.js for an example)
    let currentPage = {destroy: () => {}};
    route('/', (o) => {
        console.log('[app route]', o);
        currentPage.destroy();
        currentPage = body(Page1);
    });

    route('/page2', (o) => {
        console.log('[app route]', o);
        currentPage.destroy();
        currentPage = body(Page2);
    });

    route('/*', () => {
        currentPage.destroy();
        currentPage = body(NotFound404);
    });

    // this code is used to create a resourceClient to fasciltate developer friendly
    // write/read to store.

};

function Page1({oo, $, go}) {
    console.log('creating page1');

    // demo of how store on server can be used to render to HTML on server...
    oo('span', OO.isNodeJs ? 'Server rendered HTML (wait a few seconds)' : 'OO is now attached')._('br');
    oo(RandomValue)._('br');
    oo('span', 'Time this text was created:' + new Date());
    oo('span', 'serverData hardcoded: $serverData/hardcoded')._('br');
    oo('span', 'serverData runtime: $serverData/runtime')._('br');
    oo('span', 'serverData promised: $serverData/promised')._('br');
    oo('span', 'serverData hello: $serverData/hello')._('br');
        // ...even if store is changed runtime
    $.set('serverData/runtime', true);
        // ...or done so using promises
        // note that there is no need to use await for the timer promise to resolve,
        // because OO will add it to an internal promise handler resolver which can be
        // observed from elsewhere.
    oo.timer(10, {promise:true}, () => {
        $.set('serverData/promised', true);
    });
    const button = oo('button', 'This button will work when OO attaches');
    button.onclick(() => { 
        console.log('clicked');
        button.html('serverData/hello is: ' + $('serverData/hello'));
    });
    oo('br');
    oo('span', 'res/planet: $res/planet')._('br');
    oo('button', 'Try resource feature').onclick(async () => {
        const v = prompt('Enter a planet:', 'pluto');
        await oo.setResourceAsync('res/planet', v);
        console.log($('res/planet'));
    })._('br');
    oo('button', 'Goto Page2').onclick(() => {go('/page2')})._('br');
    oo('button', 'Goto a non-existing URL').onclick(() => {go('/non-existing-route')})._('br');
    //setInterval(() => {
    //    console.log('->main', oo.context.store.$.apple, $('apple'));
    //}, 1000);
}

function RandomValue({oo}) {
    // compare with random value on server and notice that it is a different value.
    // this demonstrates that while the HTML rendered on server, created by the browser client as
    // HTML pure elements, when the OO is attached these elements are re-used but the app code is
    // executed and all values/data freshed.
    oo('span', 'Random value (will change when OO attaches):' + Math.random());
}

function Page2({oo, $, go}) {
    console.log('creating page2');

    // demo of how store on server can be used to render to HTML on server...
    oo('span', 'page2')._('br');
    oo('button', 'Goto Page1').onclick(() => {go('/')});
}

function NotFound404(oo) {
    oo('h2', '404: Not Found')._('br');
    oo('span', 'Refresh this page and notice that server will render this page too');
}

async function resourceClient(path, data, cacheOptions) {
    // this is an intermediate step executed in the client environment,
    // before request passed on to the server. its a good place to check
    // if resource is already stored in a cache or similar and/or manipulate
    // the request before asking the server.
    // when quering the server, you can select what ever protocol you want:
    // XMLRequest, sockets, fetch or what ever.
    console.log('resourceClient', {path, data, cacheOptions});
    const response = await fetch('./api/' + path, {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        method: "POST",
        body: JSON.stringify(data)
    });
    const parcel = await response.json(); console.log('response from server', parcel);
    return parcel;
};

export function createOOptions() {
    const
        {resource, resourceAsync, setResourceAsync} = createResource(resourceClient),
        ooptions = {
            ooFunction: {
                // make resource available and linkable to Tugs,
                // so that resources can be tied to Tug life-cycle and
                // garbage collected (resources are saved to store).
                resource, resourceAsync, setResourceAsync, setResourceAsync
            }
        };
    return ooptions;
};

