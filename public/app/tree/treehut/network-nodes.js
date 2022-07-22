import {createPagedList} from './infinite-list.js';
import {TreenetBar} from './bar.js';
import {TreenetTopbar} from './topbar.js';
import * as H from './help-texts.js';
import OO from '../../oo/oo.js';
import {Modal, Icon, errorToast, infoToast, EditableText, RefreshIcon} from './tugs.js';
import {ConnectButton} from './connect.js';

export function NetworkNodes({oo, $, res}, {active}) {
    const ACTIVE = 'gui/page/networknodes/active';
    if(active === 'last') active = $(ACTIVE);
    if(!active) active = 'hotel';
    $.set(ACTIVE, active);
    let Tug;
    if(active === 'hotel') {
        Tug = Hotel;
    } else if(active === 'clearnet'){
        Tug = Clearnet;
    } else if(active === 'tor'){
        Tug = Tor;
    }
    oo.css(`z-index: var(--znetworknodes);`);
    const list = oo(Tug);
    const topbar = oo(TreenetTopbar, {active});
    const bar = oo(TreenetBar, {active:'net'});
    const {height:topHeight} = topbar.getBounds();
    const {height:bottomHeight} = bar.getBounds();
    list.setOffset(topHeight, bottomHeight);
};


function Hotel({oo, css, go, $, res, setres}) {
    const path = 'res/hotel/network/nodes';
    const list = createPagedList(oo, (next, count) => {
            return `${path}?filter=unconnected&index=${next}&count=${count}`;
        }, (oo, data) => {
            return oo(HotelNodeListeItem, data);
        },
        'znetworknodes',
        (oo) => oo(UnconnectedListHeader)('h1', 'Hotel')
    );
    oo.x([
        function render() {
            list.render(...arguments);
        },
        function setOffset() {
            list.setOffset(...arguments);
        }
    ]);
}

function HotelNodeListeItem({oo, res}, {id, nrl, url, localId}) { console.log(...arguments);
    oo.css(`
    HotelNodeListeItem {
        padding: 10px;
        margin: 5px;
        width: calc(var(--widthfull) - 40px);
        background: var(--whitespace);
    }

    HotelNodeListeItem Panel {
        display: grid;
        margin-top: 20px;
        display: grid;
        grid-template-columns: 65% 35%;
        column-gap: 10px;
    }
    `);

    const path = res(`res/hotel/network/node/${localId}/profile`);//, console.log);

    oo('div')
            ('b', `$${path}/publicProfile/name`).style({fontVariant: 'small-caps', fontSize:'20px'})
            ._
            ('span').style({position: 'absolute', right:'30px'})('i', localId || (id.substring(0, 20) + '...'));

    oo('Panel')
        ('div')('i', `$${path}/publicProfile/description`)
        ._._
        ('div').style({marginTop:'5px', textAlign:'center'})(ConnectButton, {nrl, id})
                    .onUpdated((data) => {
                        console.log('data updated', data);
                    })
                    .onSuccess((id) => {
                        infoToast(oo, 'Peer added');
                        oo.timer(2000, () => {
                            oo.go('/peer/' + id);
                        });
                    })
                    .onError((s) => {
                        errorToast(oo, s);
                    })
    ;
}

function UnconnectedListHeader({oo}) {
    oo.css(`
    UnconnectedListHeader {
        margin-top: 10px;
        margin-bottom: 20px;
    }

    UnconnectedListHeader H1 {
        color: var(--blackbright);
    }

    UnconnectedListHeader Icon {
        position: absolute;
        color: var(--whitemedium);
        right: 10px;
    }
    `);
}

function Clearnet({oo, res}) {
    const path = 'res/network/nodes';
    const list = createPagedList(oo, (next, count) => {
            return `${path}?protocol=cn&index=${next}&count=${count}`;
        }, (oo, data) => {
            return oo(NetworkNodeListeItem, data);
        },
        'znetworknodes',
        (oo) => oo(UnconnectedListHeader)('h1', 'Clearnet')(RefreshPeerList).onUpdated(() => list.refresh())
    );
    oo.x([
        function render() {
            list.render(...arguments);
        },
        function setOffset() {
            list.setOffset(...arguments);
        }
    ]);
}

function Tor({oo, res}) {
    const path = 'res/network/nodes';
    const list = createPagedList(oo, (next, count) => {
            return `${path}?protocol=onion&index=${next}&count=${count}`;
        }, (oo, data) => {
            return oo(NetworkNodeListeItem, data);
        },
        'znetworknodes',
        (oo) => oo(UnconnectedListHeader)('h1', 'Tor')(RefreshPeerList).onUpdated(() => list.refresh())
    );
    oo.x([
        function render() {
            list.render(...arguments);
        },
        function setOffset() {
            list.setOffset(...arguments);
        }
    ]);
}

function NetworkNodeListeItem({oo, res}, {url, name, description, id}) {
    oo.css(`
    NetworkNodeListeItem {
        padding: 10px;
        margin: 5px;
        width: calc(var(--widthfull) - 40px);
        background: var(--whitespace);
    }

    NetworkNodeListeItem Panel {
        display: grid;
        margin-top: 20px;
        display: grid;
        grid-template-columns: 65% 35%;
        column-gap: 10px;
    }
    `);

    //const path = res(`res/hotel/network/node/${localId}/profile`);//, console.log);


    oo('div')
            ('b', name).style({fontVariant: 'small-caps', fontSize:'20px'})
            ._
            ('span').style({position: 'absolute', right:'30px'})('i', id && id.substring(0, 20) + '...');

    oo('Panel')
        ('div')('i', description)
        ._._
        ('div').style({marginTop:'5px', textAlign:'center'})(ConnectButton, {url, id})
                    .onUpdated((data) => {
                        console.log('data updated', data);
                    })
                    .onSuccess((id) => {
                        infoToast(oo, 'Peer added');
                        oo.timer(2000, () => {
                            oo.go('/peer/' + id);
                        });
                    })
                    .onError((s) => {
                        errorToast(oo, s);
                    })
    ;
}

function RefreshPeerList({oo}) {
    const onUpdated = oo.xx('onUpdated');
    oo(RefreshIcon)
        .onClick(async (oo) => {
            await oo.sendRes('res/network/refresh');
            // give some time if server answers fast
            oo.timer(2000, () => {
                oo.setStop();
                onUpdated(oo);
            });
        });
}

