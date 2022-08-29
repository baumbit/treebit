/**
 * Feeds are downloaded progressively from server as the user scroll.
 * Items can be prepended and appended to the scrolling list.
 * Downloaded data is merged into a existing list stored in store.
 *
 * TODO
 *          create a max size for array.
 */
import {NoteCard} from './note.js';
import {HomeTopbar} from './topbar.js';
import {HomeBar} from './bar.js';
import {BigShareIcon} from './share.js';
import {createList} from './infinite-list.js';
import * as H from './help-texts.js';
import OO from '../../oo/oo.js';
import {Modal, Icon, errorToast, infoToast, EditableText, RefreshIcon} from './tugs.js';
import {feeds} from '../feed-manager.js';

export function Home({oo, $, res}, {active}) { //console.log('active:', active);
    oo.css(`z-index: var(--zhome);`);
    const ACTIVE = 'gui/page/home/active';
    if(!active) active = $(ACTIVE);        //console.log('loaded:', active);
    if(!active) active = '0';
    $.set(ACTIVE, active);                  //console.log('saved:', $(ACTIVE));
    const list = createFeedList(oo, active);
    const topbar = oo(HomeTopbar, {active, text: feeds[active].text});
    const bar = oo(HomeBar, {active}); // TODO
    const {height:topHeight} = topbar.getBounds();
    const {height:bottomHeight} = bar.getBounds();
    list.setOffset(topHeight, bottomHeight);
    oo(BigShareIcon);
};


export function addFeedArr(srcArr=[], addArr, reverse) {
    console.log('addFeedArr being', {srcArr, addArr, reverse});
    const key = addArr[0];
    const srcIndex = srcArr.indexOf(key);
    if(srcIndex === -1) {
        srcArr = [];
    } else if(reverse) {
        addArr.reverse();
        srcArr = srcArr.slice(srcIndex+1);
    } else {
        if(srcIndex >= 0) {
            srcArr = srcArr.slice(0, srcIndex);
        }
    }
    const arr = reverse ? addArr.concat(srcArr) : srcArr.concat(addArr); //console.log(arr);
    console.log('addFeedArr end', {srcArr, addArr, arr});
    return arr;
};
// TEST: begin
//addFeedArr(['e', 'f', 'g'], ['f', 'g', 'h']);
//addFeedArr(['e', 'f', 'g', 'A'], ['g', 'h', 'i']);
//addFeedArr(['e', 'f', 'g'], ['h', 'i', 'j']);
//addFeedArr(['e', 'f', 'g'], ['e', 'd', 'c'], true);
//addFeedArr(['e', 'f', 'g'], ['f', 'e', 'd'], true);
//addFeedArr(['e', 'f', 'g'], ['d', 'c', 'b'], true);
// TEST: end

function createFeedList({oo, css, go, $, res, setres}, activeIndex) {
    activeIndex = parseInt(activeIndex, 10);

    const
        feed = feeds[activeIndex],
        resPath = 'res/feed/' + feed.path,
        feedPath = 'gui/page/home/feed/' + activeIndex;

    let buildItem;
    if(feed.type === 'note') {
        buildItem = (oo, noteId) => {
            return oo(NoteCard, {noteId});
        };
    } else {
        throw new Error(`unknown feed type=${feed.type}`);
    }

    const ARR = feedPath + '/arr';

    let arr = $(ARR) || [];
    let isDownloadingTop, isDownloadingBottom;
    let list;

    const downloadFeed = (index=0, forceDownload) => { //console.log({index, forceDownload});
        const reverse = index < 0;
        if(reverse) {
            if(isDownloadingTop || !forceDownload) return;
            isDownloadingTop = true;
        } else {
            if(isDownloadingBottom || !forceDownload) return;
            isDownloadingBottom = true;
        }

        const key = reverse ? arr[0] : arr[arr.length-1]; console.log({index, key, reverse, arr});
        const path = resPath + `?key=${key}&reverse=${reverse}`;
        console.log('download res', path);
        oo.res(path, {save:false}, ({error, data}) => {   //console.log('downloaded data', data);
            if(!error) {
                arr = addFeedArr(arr, data.list, data.reverse);
                $.set(ARR, arr); console.log({ARR, arr});
                arr = $(ARR);
                if(list) list.requestRender();
            }
            oo.timer(3000, () => { // prevent spam
                if(reverse) isDownloadingTop = false;
                else isDownloadingBottom = false;
            });
         });
    };

    oo.timer(1000, () => {
        downloadFeed(0, true);
    });

    list = createList(oo,
        (index) => { //getItem,
            const item = arr[index];
            //console.log('getItem:', index, arr, '->', !!item);
            if(!item) { // optmzd: faster to check if item is falsy, instead of index within bounds.
                //console.log('download more data', arr.length, index, !!item);
                downloadFeed(index);
            }
            return item;
        },
        buildItem,
        (noteId) =>  { //buildGo
            return '/note/' + noteId;
        },
        undefined,
        undefined, //zname,
        undefined, //buildHeader
    );
    return list;
}

