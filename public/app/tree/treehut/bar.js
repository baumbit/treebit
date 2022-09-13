import {STAGE_NOTE_ROUTE} from './stage.js';
import {Icon} from './tugs.js';

export function addCss(name, {oo, css}) {
    css(`
    ${name} {
        position: absolute;
        height: var(--barthick);
        width: 100%;
        background-color: var(--graylight);
        top: calc(var(--heightfull) - var(--barthick));
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        column-gap: 5px;
        color: var(--whitemedium);
    }

    ${name} Icon {
        margin: 7px;
        text-align: center;
    }

    ${name} Shadow {
        position: absolute;
        display: block;
        box-shadow: 0px -8px 10px -8px rgba(0,0,0,0.4);
        height: var(--barthick);
        width: calc(var(--widthfull) * 1.50);
        left: calc(var(--widthfull) * -0.25);
        pointer-events: none;
     }
    `);
    oo('Shadow');
};

function addIcon(name, i, path, active, oo) {
    active = active === name;
    oo(Icon, i).onclick(() => {
        if(active) return false;
        oo.go(path);
    }).style({color: active ? 'var(--grayspace)': null});
}

function addBackIcon({oo, go}, isHome=false) {
    if(go.isBack()) {
        oo(Icon, 'arrow_back_ios').onclick(() => {
            if(go.isBackRoot()) {
                go.root();
            } else {
                go.back();
            }
        });
        return !go.isBackRoot();
    }

    if(isHome) addIcon('home', 'home', '/', null, oo);
    else {
        oo('div');
        return true;
    }
}

function addEmpty(oo, cnt=1) {
    for(let i = 0; i < cnt; i++) oo('span');
};

export function Bar({oo, go}) {
    addCss('Bar', oo);
};

export function BackBar({oo, go, css}) {
    addCss('BackBar', oo);
    const isBack = addBackIcon(oo);
    addEmpty(oo, 3);
    if(isBack) addIcon('home', 'home', '/', null, oo);
};

//export function CabinetBar({oo, go, css}) {
//    addCss('CabinetBar', oo);
//    addEmpty(oo, 4);
//    addIcon('home', 'home', '/', null, oo);
//};

export function HomeBar({oo, go, css}) {
    addCss('HomeBar', oo);
    addIcon('feeds', 'stream', '/feeds', null, oo);
    addIcon('compose', 'add_comment', '/compose', null, oo);
    addIcon('cabinet', 'manage_accounts', '/cabinet', null, oo);
    addIcon('node', 'hub', '/node/profile', null, oo);
    addIcon('account', 'admin_panel_settings', '/account', null, oo);
    //addIcon('home', 'home', '/', 'home', oo);
};

export function ComposeBar({oo, go}) {
    addCss('ComposeBar', oo);
    const isBack = addBackIcon(oo);
    addEmpty(oo, 3);
    if(isBack) addIcon('home', 'home', '/', null, oo);
};

export function AccountBar({oo, go}) {
    addCss('AccountBar', oo);
    addBackIcon(oo, true);
    addEmpty(oo, 3);
    oo(Icon, 'settings_applications').onclick(() => {
        window.open('/dashboard', '_blank');
    });
};


export function TreenetBar({oo, go, css}, {active}) {
    addCss('TreenetBar', oo);
    //if(go.isBack()) {
    //    oo(Icon, 'arrow_back_ios').onclick(() => {
    //        go.back();
    //    });
    //} else {
    //}
    addIcon('net', 'public', '/network/nodes/last', active, oo);
    addIcon('connect', 'add_circle', '/network/connect/blank', active, oo);
    addIcon('peers', 'account_tree', '/peers', active, oo);
    addIcon('node', 'hub', '/node/profile', active, oo);
    addIcon('home', 'home', '/', null, oo);
    //addIcon('home', 'home', '/', active, oo);
};

function UpDownIcon({oo, css}, {isDown}) { // TODO remove?!
    css(`
    UpDownIcon {
        font-family: Times New Roman;
    }

    UpDownIcon .down {
        position: absolute;
        transform: rotate(-180deg) translate(50%, 85%);
    }
    `);
    //console.log({isDown});
    oo(Icon, {i:'^', className: isDown ? 'down' : undefined});
}

