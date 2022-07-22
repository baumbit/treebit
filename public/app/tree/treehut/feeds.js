import {createArrayList} from './infinite-list.js';
import {BackBar} from './bar.js';
import {PageHeading} from './page-tugs.js';
import {Modal, Toggle, Icon} from './tugs.js';
import {feeds} from '../feed-manager.js';

export function Feeds(oo) {
    const
        arr = [],
        add = (text, route) => arr.push({text, route});
    feeds.forEach(({text}, i) => {
        add(text, '/feed/' + i);
    });
    createArrayList(oo, arr,
        (oo, {text}) => oo(FeedListItem, {text}), // buildItem
        ({route}) => route, // buildRoute
        'Feeds',
        'zfeeds',
        buildHeader
    );
    oo(BackBar);
};

function buildHeader(oo) {
    const pageHeading = oo(PageHeading, {i:'stream', title:'Feeds'}).onclick(() => {
        oo(Modal)
            .add('Feeds', 'Feeds are created by your node and tailored to fit your personal taste.')
        ;
     });
}

function FeedListItem({oo}, {text}) {
    oo.css(`
    FeedListItem {
        display: block;
        padding: 10px;
        margin: 5px;
        width: calc(var(--widthfull) - 40px);
        background: var(--whitespace);
        font-size: var(--fontl);
    }
    `);
    oo('span', text);
}
