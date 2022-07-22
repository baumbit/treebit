import {createStoreList} from './infinite-list.js';
import {PageHeading} from './page-tugs.js';
import {TreenetBar} from './bar.js';
import {Modal, Toggle, Icon} from './tugs.js';
import * as H from './help-texts.js';

export function Peers({oo, res}) {
    const path = 'res/peers';
    res(path);
    createStoreList(oo, path,
        (oo, {id}) => { // item
            return oo(PeerListItem, {id});
        },
        (data) => { //console.log('go', data);
            return `/peer/${data.id}`;
        },
        'Peers',
        'zpeers',
        buildHeader
    );
    oo(TreenetBar, {active:'peers'});
};

function buildHeader(oo) {
    return oo(PageHeading, {i:'account_tree', title:'Peers'}).onclick(() => {
        oo(Modal)
            .add('Peers', 'This is a list of treebit nodes connected to your node.')
            .add(...H.score)
            .add(...H.star);
     });
}

function PeerListItem({oo, css, res, setres}, {id}) {
    const settingPath = `res/peer/setting/${id}`;
    const infoPath = `res/peer/info/${id}`;
    res(settingPath);
    res(infoPath); // TODO auto refresh


    css(`
    PeerListItem {
        display: grid;
        grid-template-columns: 70% 30%;
        column-gap: 5px;
        padding: 10px;
        margin: 5px;
        width: calc(var(--widthfull) - 40px);
        background: var(--whitespace);
    }
    `);
    const
        left = oo('div'),
        right = oo('div');

    left('div')('span')
        .on(infoPath, ({displayName}, oo) => {
            oo.html(displayName.substring(0, 20));
        })
        //._('i').style({marginLeft: '20px'}).html(id.substring(0, 6))
    ;
    left('span', 'Share data')(Toggle).onToggle((on) => {
            setres(settingPath, {sync:on});
        }).on(settingPath, ({sync}, oo) => {
            if(sync !== undefined) oo.setToggle(sync);
        })
        ._
        (Sync, {id});

    right('div')('center')
        ('div').style({marginTop:'5px'})(Icon, 'push_pin', {md:18}).on(settingPath, ({pinned}, oo) => {
            if(pinned !== undefined) oo.setClassName(pinned ? 'fyellow' : 'fspace');
        }).onclick(({oo}) => {
            setres(settingPath, {pinned:!oo.$(settingPath).pinned});
            return false;
        })
        ._
        ('div').style({marginTop:'10px'})('span', `$${infoPath}/score`);
}

function Sync({oo, css, res}, {id}) {
    const infoPath = `res/peer/info/${id}`;
    res(infoPath); // TODO auto refresh

    css(`
    Sync {
        margin-left: 10px;
        vertical-align: middle;
    }
    Sync Icon {
        margin: 6px;
        vertical-align: middle;
    }
    `);
    oo('span', 'Syncing');
    oo(Icon, 'sync', {md:18}).on(infoPath, ({online}, oo) => {
        oo.setClassName(online ? 'fgreen' : 'fred');
        oo.html(online ? 'sync' : 'sync_problem');
    }).onclick(() => {
        oo(Modal).add(...H.sync);
        return false;
    });
}

