import {Icon} from './tugs.js';

export function addCss(name, repeat, {css}) {
    css(`
    ${name} {
        position: absolute;
        width: 100%;
        display: grid;
        background: var(--graylight);
        grid-template-columns: repeat(${repeat}, 1fr);
        column-gap: 5px;
        color: var(--whitemedium);
        box-shadow: 0px 0px 15px 0px rgba(0,0,0,0.4);
    }

    ${name} Button {
        font-variant: small-caps;
        background: var(--graylight);
        color: var(--whitemedium);
    }

    ${name} Button:hover {
        color: var(--whitesun);
    }
    `);
};

function addButton(name, path, active, oo, text) {
    active = active.toLowerCase() === name.toLowerCase();
    const button = oo('button', text || name).onclick(() => {
        oo.go(path);
    });//.style({color: active ? 'var(--blackbright)': null, background: active ? 'var(--whitespace) ': 'null'});
}

function addEmpty(oo, cnt=1) {
    for(let i = 0; i < cnt; i++) oo('span');
};

export function HomeTopbar({oo, go}, {active, text}) { //console.log({active, text});
    addCss('HomeTopbar', 1, oo);
    //addButton('Latest', '/latest', active, oo);
    addButton(active, '/feeds', active, oo, text);
};


export function TreenetTopbar({oo, go}, {active}) {
    addCss('TreenetTopbar', 3, oo);
    addButton('Hotel', '/network/nodes/hotel', active, oo);
    addButton('Tor', '/network/nodes/tor', active, oo);
    addButton('Clearnet', '/network/nodes/clearnet', active, oo);
};

//export function BackBar({oo, go, css}) {
//    addCss('BackBar', oo);
//    if(go.isBack()) {
//        oo(Icon, 'arrow_back_ios').onclick(() => {
//            go.back();
//        });
//    } else oo('div');
//    addEmpty(oo, 3);
//    addIcon('dashboard', 'home', '/', null, oo);
//};
//
//export function DashboardBar({oo, go, css}) {
//    addCss('DashboardBar', oo);
//    addIcon('settings', 'menu', '/settings', null, oo);
//    addEmpty(oo, 1);
//    addIcon('compose', 'add_comment', '/compose', null, oo);
//    addIcon('node', 'hub', '/node/profile', null, oo);
//    addIcon('cabinet', 'manage_accounts', '/cabinet', null, oo);
//};
//
//export function TreenetBar({oo, go, css}, {dashboard=true, active}) {
//    addCss('TreenetBar', oo);
//    addIcon('connect', 'add_circle', '/network/connect/blank', active, oo);
//    addIcon('net', 'public', '/network/nodes', active, oo);
//    addIcon('peers', 'account_tree', '/peers', active, oo);
//    addIcon('node', 'hub', '/node/profile', active, oo);
//    addIcon('dashboard', 'home', '/', active, oo);
//};
//
//function UpDownIcon({oo, css}, {isDown}) { // TODO remove?!
//    css(`
//    UpDownIcon {
//        font-family: Times New Roman;
//    }
//
//    UpDownIcon .down {
//        position: absolute;
//        transform: rotate(-180deg) translate(50%, 85%);
//    }
//    `);
//    //console.log({isDown});
//    oo(Icon, {i:'^', className: isDown ? 'down' : undefined});
//}
//
