/**
 * TODO
 *      optimization:
 *          updateBound in InfiniteList can probably be limited to
 */
import {createScrollHandler} from './scroll.js';

export function InfiniteList(oo, type, startOffset=0, endOffset=0, Y_MARGIN=0) {
    let isRendering = false,
        BOUNCE_TOP = startOffset - Y_MARGIN,
        //scrollAnchorY = 0,
        isResized = true,
        head = null,
        viewSize,
        viewHalf,
        createItem,
        startBound,
        endBound,
        posType,
        isScrolling;

    const scrollHandler = createScrollHandler(oo, function(stateX, stateY) { //console.log(stateY.drag);
        if(stateY.idle) isScrolling = false;
        else if(stateY.drag) isScrolling = true;
        render(stateY.easeValue, stateY);
    });

    function getBounds(oo) {
        const rect = oo.getBoundingClientRect(); //console.log({rect}, oo.elm);
        let start, end, size;
        if(type === 'vertical') {
            posType = 'top';
            start = rect.top;
            end = rect.bottom;
            size = rect.height; //console.log({start, end, size});
        } else {
            posType = 'left';
            start = rect.left;
            end = rect.right;
            size = rect.width;
        }
            //if(oo.__size) console.log(size, '->', oo.__size, oo.elm);
            //oo.__size = size;
        return {start, end, size};
    }

    function init(f, isForceRender) { //console.log('init');
        clear();
        createItem = f;
        const bounds = getBounds(oo); //console.log({bounds}, type);
        startBound = bounds.start;
        endBound = bounds.end; //console.log({startBound, endBound});
        viewSize = bounds.size;
        viewHalf = Math.floor(viewSize * 0.5);
        if(isForceRender) render(0);
        //console.log('bounds', {bounds});
    }

    let dragOffsetY = null;
    function render(scrollPos=0, drag) {                                 //console.log('render', oo.isDestroyed, oo);
        if(oo.isDestroyed) return; // render may be invoked via requestAnimationFrame or similar.
        if(typeof scrollPos !== 'number') throw new Error('bad scrollPos:' + scrollPos);
        let pos = 0;
        if(!head) {
            head = obtainItem(oo, 0);
            pos = startOffset;                      //console.log({startOffset});
        } else {                                    //console.log(head.pos, head.sizeBound);
            //if(isResized) updateBound(head);
            updateBound(head);
            if(drag.drag) {
                 if(!dragOffsetY) {
                    dragOffsetY = Math.floor(head.pos - drag.y);
                }
                pos = drag.y + dragOffsetY;
            } else {
                dragOffsetY = null;
                pos = head.pos + scrollPos;
            }
            const headBottom = pos + head.sizeBound; //console.log({headBottom}, head.sizeBound);

            if(!head.next) {
                if(headBottom < viewHalf && scrollPos < 0) {
                    if(head.pos < BOUNCE_TOP || pos + head.sizeBound < BOUNCE_TOP) { //console.log('above BOUNCE_TOP has no next');
                        scrollHandler.bounce();
                        return;
                    }
                }
            }

            if(pos > viewHalf) {
                if(headBottom > endBound - endOffset) {
                    scrollHandler.bounce();
                    return;
                }
            }

            if(headBottom < BOUNCE_TOP) {
                if(!head.next && drag.drag) {
                    scrollHandler.bounce();
                    return;
                }
                //pos = head.next.pos + scrollPos; console.log('remove', headBottom, startOffset);
                if(dragOffsetY !== null) dragOffsetY += head.sizeBound;
                removeItem(head);
                return;
            } else if(pos > startOffset) {
                //if(head.index > 0) {
                    let item = obtainItem(oo, head.index - 1, null, head);
                    if(item) {
                        head = item;
                        pos = pos - head.sizeBound - Y_MARGIN;
                        //if(dragOffsetY !== null) dragOffsetY += head.sizeBound;
                    }
                    //else console.log('nothing', head.index-1);
                //}
            }
        }
        let o = head;

        let isOutsideRight = false; //console.log({pos, isOutsideRight});
        while(o/* && i < 100*/) { //log({i, o, x}); i++;
            //o.oo.elm.style.right = scrollY + 'px';
            //o.oo.elm.style.left = x + 'px';
            if(o.oo.elm) {
                if(isResized) updateBound(o);
                //if(o.dirtyBound) {
                //    //console.log('dirtyBound, child');
                //updateBound(o);
                //}
                const elm = o.oo.elm;
                if(elm.style) {
                    //console.log(pos);
                    //elm.style.transform = "translateY(" + pos + "px)";
                    //elm.style.transform = "translateY(" + Math.floor(pos) + "px)";
                    elm.style[posType] = pos + 'px';
                    //elm.style[posType] = pos + 'px';
                    elm.style.opacity = 1; //console.log(elm);
                }
            }
            o.pos = pos;
            //pos = pos + o.sizeBound + 50;                                    //console.log(pos > endBound, endBound);
            //pos = pos + o.sizeBound; // TODO delim + 50;                                    //console.log(pos > endBound, endBound);
            pos = pos + o.sizeBound + Y_MARGIN;                                    //console.log(pos > endBound, endBound);
            if(pos > endBound) {
                isOutsideRight = true;
                if(o.next) {                                            //console.log('remove from end of list');
                    removeItem(o.next);
                }
                break;
            } else if(o.next) {
                o = o.next;
            } else {
                o = obtainItem(oo, o.index + 1, o);                         //if(o) console.log('add to end of list', pos);
            }
        }
        isResized = true;
    }

    function removeItem(o) {
        if(o) {                                                          //console.log('REMOVE', o.index, o);
            if(o === head) head = o.next;
            if(o.next) o.next.prev = o.prev;
            if(o.prev) o.prev.next = o.next;
            o.next = null;
            o.prev = null;
            o.oo.destroy();
        }
    }

    function clear() {
        let o = head;
        while(o) {
            o.oo.destroy(); // TODO return to pool?
            o = o.next;
        }
        head = null;
    }

    function updateBound(o) {
        //const rect = oo.getBoundingClientRect(); console.log({rect});
        const {start, end} = getBounds(o.oo); //console.log(start, end);
        const startBound = Math.floor(start);
        const endBound = Math.floor(end);
        const sizeBound = Math.floor(end - start); //console.log(o.sizeBound, '->', sizeBound, o.oo);
        //if(o.sizeBound < sizeBound) o.sizeBound = sizeBound;
        o.sizeBound = sizeBound;
        //o.dirtyBound = false;
        //console.log('updateBound', o.sizeBound);
    }

    function obtainItem(oo, index, prev, next) {
        //console.log('obtainItem', index, prev, next);
        oo = createItem(oo, index, list);
        if(oo) {
            //console.trace();
            const o = {oo};
            oo.elm.style.opacity = 0;
            o.index = index;
            o.prev = prev;
            o.next = next;
            if(prev) prev.next = o;
            if(next) next.prev = o;
            o.sizeBound = 0;
            updateBound(o);
            return o;
        }
    };

    function getHead() {
        return head;
    }

    function setOffset(start, end) {
        startOffset = start; // can be used to create a virtual bottom, making space for a nav bar or similar at the bottom
        endOffset = end; // can be used to create a virtual bottom, making space for a nav bar or similar at the bottom
    }

    function requestRender() { //console.log('requestRender');
        scrollHandler.requestRender();
    }

    oo.onbubble((event, sourceoo) => {
        if(event === 'resized') { //console.log('onbubble resized triggered by' , sourceoo, isResized);
            isResized = true;
            requestRender();
        }
    });


    const list = {
        init,
        requestRender,
        clear,
        getHead,
        setOffset,
        isScrolling: () => isScrolling
    };

    return list;
};

export function createVerticalList(oo, log) {                                           //log(0, 'createVerticalList');
    const verticalList = new InfiniteList(oo, 'vertical');
    return verticalList;
    //    init: verticalList.init,
    //    clear: verticalList.clear,
    //    setOffset: verticalList.setOffset,
    //    //scrollTop,
    //    scrollY: verticalList.scrollY,
    //    render: verticalList.render
    //};
}

//export function createHorizontalList(oo, duration) {  //console.log(oo.elm, duration);
//    const
//        {width:VIEW_WIDTH} = oo.getBoundingClientRect(), //, // note: this will also force layout
//        horizontalList = new InfiniteList(oo, 'horizontal'),
//        easeX = createEase(easeOutQuad, false);
//    let isRequesting;
//
//    // render
//    function render() {
//        let x = 0;
//        if(easeX.timeLeft() >= 0) {
//            x =  easeX.tick();
//            isRequesting = true;
//        } else {
//            isRequesting = false;
//        }
//        horizontalList.render(parseInt(x, 10));
//        if(isRequesting) window.requestAnimationFrame(render);
//    }
//
//    function scrollX(direction) {
//        if(isRequesting) return;
//        easeX.init(5, 10, duration, direction);
//        render();
//    }
//
//    return {
//        init: horizontalList.init,
//        scrollLeft: () => scrollX(1),
//        scrollRight: () => scrollX(-1)
//    };
//}

export function VerticalListTug({oo, css, go}, {tag, createRow, display='flex' /*TODO flex needed?*/, height='10%', startY}) {
    css(`
    ${tag} {
        display: block;
        overflow: hidden;
        position: absolute;
        width: calc(var(--widthfull) - calc(var(--m)));
        height: var(--heightfull);
    }

    ${tag} Row {
        -webkit-transform: rotateZ(360deg);
        -webkit-font-smoothing: antialiased;
        will-change: auto;
        position: absolute;
        display: ${display};
        transition: opacity var(--transitionSlow) linear;
        align-items: center;
        margin: var(--m);
        width: calc(var(--widthfull) - calc(var(--m)));
        /*height: ${height};     REMOVE THIS AND MAKE CONTIONUSLY UPDATED */
    }

    ${tag} StoreItem {
        display: ${display};
        align-items: center;
        width: 100%;
        /*height: ${height};     REMOVE THIS AND MAKE CONTIONUSLY UPDATED */
        /*background-color: #f0f;*/
     }
    `);
    const verticalList = createVerticalList(oo);
    oo.x('refresh', () => verticalList.init(createRow, true));
    oo.x('init', verticalList.init);
    //oo.x('render', verticalList.render);
    oo.x('requestRender', verticalList.requestRender);
    oo.x('scrollTop', verticalList.scrollTop);
    oo.x('setOffset', verticalList.setOffset);
    verticalList.init(createRow, true); // example: createRow = (oo, index) => oo(MyTug, `index ${index}`, {tag:'Row'});
};

export function ScrollablePage({oo, css}) {
    let page;
    const list = oo(VerticalListTug, {display:'block', height:'100%', tag: 'ScrollablePageList', createRow: (oo, index) => {
        if(index < 0) return;
        if(!page) {
            page = oo('Row');
            return page;
        } else {
            //const rect = page.getBoundingClientRect(); console.log(rect);
        }
    }});
    return page;
};

export function createList({oo, css, res, go}, getItem, buildItem, buildGo, name, zname, buildHeader, startY) {
    if(zname) css(`z-index: var(--${zname.toLowerCase()});`);
    const list = oo(VerticalListTug, {tag: 'VerticalList', startY, createRow: (oo, index, list) => { //console.log('render', list, index);
        if(index === 0) {
            if(name || buildHeader) return createHeader(oo, name, buildHeader);
        }
        if(name || buildHeader) index--;
        const o = getItem(index); //console.log('getItem', index, o, getItem);
        if(o) { //console.log({oo, o, buildItem, buildGo});
            const row = createStoreItem(oo, o, buildItem, buildGo, list); // TODO refactor to createListItem
            return row;
        }
    }});
    return list;
};

export function createPagedList(oo, getPath, buildItem, zname, buildHeader, count, isKeyLookup) {
    if(!count) count = 10; // TODO use screen-height x 2, to set count
    let isDownloading;
    let next = 0;
    let arr = [];
    const nextPage = async () => {
        if(isDownloading || next === null) return;
        isDownloading = true;
        const query = isKeyLookup ? getPath(count, arr) : getPath(next, count, arr);
        // fetch data from server, but do not save it to store because scrollable list
        // is unable to handle paged list and files will be stored temporarily in cache
        // anyway.
        await oo.res(query, {save:false}, (data) => {
            if(isDownloading) {
                next = data.data.next; // null indicates end of list
                arr = arr.concat(data.data.list); //console.log('list after update', arr);
                list.requestRender(); //console.log('render', {data, isDownloading});
            }
            isDownloading = false;
        });
    };
    nextPage();

    const getItem = (index) => { //console.log({index, isDownloading}, arr.length);
        if(!isDownloading && index >= arr.length) nextPage();   //console.log('getItem', {index, arr}, arr[index]);
        return arr[index];
    };

    const list = createList(oo,
        getItem,
        buildItem,
        undefined,
        undefined,
        zname,
        buildHeader
    );

    return {
        refresh: function(isClear=true) { console.log('refresh');
            if(isClear) arr = [];
            next = 0;
            nextPage();
        },
        nextPage: function() {
            nextPage();
        },
        requestRender: function() {
            list.requestRender();
        },
        setOffset: function() {
            list.setOffset(...arguments);
        }
    }
};

export function createArrayList({oo, css, res, go}, arr, buildItem, buildGo, name, zname, buildHeader) {
    const list = createList(oo, (index) => arr[index], buildItem, buildGo, name, zname, buildHeader);
    return {
        setArray: (v) => {
            arr = v;
            list.refresh();
        },
        list
    };
};

export function createStoreList({oo, css, res, go}, storePath, buildItem, buildGo, name, zname, buildHeader) {
    let arr = [];
    const arrayList = createArrayList(oo, arr, buildItem, buildGo, name, zname, buildHeader);
    oo.on(storePath, (v=[]) => {                     //console.log({storePath, v});
        if(Object.prototype.toString.call(v) === '[object Object]') {
            arr = [];
            for(let p in v) {
                if(v.hasOwnProperty(p)) arr.push(v[p]);
            }
        } else {
            arr = v;
        }
        arrayList.setArray(arr);
    });
    return arrayList;
};

function createStoreItem(oo, data, buildItem, buildGo, list) {
    const row = oo('Row');

    const item = buildItem(row(StoreItem), data);
    if(item.onClick) {
        // store items may expose (oo.xx) their own onClick,
        // which makes it possible for an item to have dedicated
        // elements in the item area to trigger go
        item.onClick((data) => {
            if(!list.isScrolling()) { //console.log('is scrolling', list.isScrolling());
                oo.go(buildGo(data));
            } //else console.log('no go, is scirlling');
        });
    } else if(buildGo){
        // if store item did not expose an onClick,
        // add a default one that makes the whole are clickable.
        row.onclick((event) => {
            oo.go(buildGo(data, event));
        });
    }

    return row;
}

export function StoreItem({css}) {};
export function createHeader(oo, s, buildHeader) {
    oo = oo('Row');
    if(buildHeader) {
        buildHeader(oo);
        return oo;
    }
    else return oo('h1', s)._;
};

