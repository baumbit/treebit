import OO from '../../../oo/oo.js';
import {createHome} from './client-side.js';
import {sendSnatchResponse} from '../../../oo/snatch-session.js';

export async function homeServer(req, res) {
    const {html} = await createHomeOOAsync();
    sendSnatchResponse(res, {html});
};

async function createHomeOOAsync() {
    const
        ooptions = { renderVirtual: true },
        {oo} = OO(undefined, undefined, undefined, ooptions);

    oo.context.setHeadlessHistory();
    createHome(oo);
    const optionsClientSide = {
        app: {},
        ooptions: {
            snatchBasename: '/dashboard', // let dashboard handle resource request (i.e. snatch)
            // TODO remove routerBasename: '/dashboard',
            renderVirtual: false
        }
    };

    oo.context.addBootloader({path: '/app/oo/oo.js', options: optionsClientSide});
    oo.go('/');
    await oo.resolvePromisesAsync();
    const html = oo.context.asHtml();
    return {oo, html};
}

