import {Modal, Icon} from './tugs.js';

export function BigShareIcon({oo}) {
    oo.css(`
    BigShareIcon {
        border-radius: 25px;
        position: absolute;
        display: block;
        background: var(--whitelight);
        color: var(--blackbright);
        top: calc(var(--heightfull) - (var(--barthick)*2.5));
        right: 20px;
        height: 50px;
        width: 50px;
    }

    BigShareIcon Icon {
        position: absolute;
        top: 7px;
        left: 5px;
    }

    BigShareIcon Icon:hover {
        color: var(--whitemedium);
    }
    `);
    oo(Icon, 'share').onclick(() => {
        oo(Share);
    });

};

async function createDeepLinkAsync({resAsync, $}, type, address) {
    const INFO = 'res/hotel/public/info';
    await resAsync(INFO, console.log);
    const {hotelOrl} = $(INFO);
    let deepLink = type === 'onion' && hotelOrl.onion ? hotelOrl.onion : hotelOrl.cn;
    deepLink += '/?invite=' + encodeURIComponent(address);
    return deepLink;
}

export function Share({oo, $, resAsync}) {
    oo.css(`
    Modal textarea {
        height: calc(var(--heightfull) * 0.5);
    }
    `);

    const NODE_PROFILE = 'res/node/profile';
    const PROTOCOLS = 'res/node/preferences/protocols';

    const update = async () => {
        await resAsync(NODE_PROFILE, console.log);
        await resAsync(PROTOCOLS);
        let {cn, onion} = $(NODE_PROFILE);
        const list = $(PROTOCOLS) || [];

        if(cn && !list.find(o => (o && o.name === 'cn'))) cn = null;
        if(onion && !list.find(o => (o && o.name === 'onion'))) onion = null;

        const modal = oo(Modal);

        modal('h1','Share').onclick(({oo}) => {
            oo._.close();
        });

        modal('br');

        const textarea = modal('div')('textarea');

        // TODO improve on share node message: add how to download treebit client and add deep link invitation
        // so that node can know that peer was invited, example: https://treehotel.com/node123?invite=f343v4534bbbbwqsds2234
        // and save invite in database with an expiration period
        // when node connects, indicate it was on an invitation and show the invitation
        // // TODO add share node, share buttons
        let message = 'Hello\r\n';
        message += `\r\n`;
        message += 'I hope you join me on Treebit!\r\n';

        message += `\r\n`;
        message += 'It is easy to join, just click the link:\r\n';
        if(onion) message += `TOR link:\r\n${await createDeepLinkAsync(oo, 'onion', onion)}\r\n`;
        if(cn) message += `Clearnet link:\r\n${await createDeepLinkAsync(oo, 'cn', cn)}\r\n`;

        message += `\r\n`;
        message += 'Already have a Treebit node?\r\nGreat, connect to my node on:\r\n';
        if(onion) message += `My TOR address:\r\n${onion}\r\n`;
        if(cn) message += `My clearnet addess:\r\n${cn}\r\n`;

        textarea.html(message);

        modal(Icon, 'send')
            .style({position:'absolute', right: 0, margin:'10px'})
            .onclick(() => {
                const msg = textarea.elm.textContent; console.log({msg});
                window.open('mailto:?subject=Treebit&body='+msg);
                console.log('TODO: close');
            });
    };

    update();
};

