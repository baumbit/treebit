export function InfiniteList(oo, {poolSize, startIndex, binderCb, ease}) {
    /**
     * TODO
     *      refactor to scrollTo
     *      prevent scrolling when all items fits on screen
     *      refeactor magic values
     */

    /*
        InfiniteList - v0.0.1

        Provide means of efficient scrolling through a nearly endless list,
        of items. This is achieved by recycling DOM elements from a pool.
        The list offerts support for different Tugs.

        window.onload = () => {
        const list = []; for(let i = 0; i < 50; i++) list.push(i);
        function TugA(oo){var o=oo('div')('span',{style:{color:'blue'}});oo.x('set',s=>o.html('A-'+s));}
        function TugB(oo){var o=oo('div',{style:{marginTop:'13px',color:'green'}})('i');oo.x('set',s=>o.html('B-'+s));}
        const infiniteList = OO('app')(OO.InfiniteList, {poolSize: 1, startIndex: 0,
            ease: OO.ease.easeOutQuad,
            binderCb: (getItem, index) => {
                if(index < 0 || index >= list.length) return;
                const item = getItem(index %3 === 1 ? TugA : TugB , index);
                item.oo.set(list[index]);
                return item;
            },
            style: {
                top: '31px',
                backgroundColor: '#888888',
                minHeight: '290px',
                height: '290px',
                minWidth: '300px',
                width: '300px',
                position: 'absolute',
                //overflow: 'hidden'
            }
        });
        window.onwheel = (event) => { event.preventDefault(); infiniteList.scrollY(event.deltaY, 0); };
        setInterval(infiniteList.render, 1); // or Window.requestAnimationFrame()
        };
    */

    let topItem, bottomItem,
        viewHeight, viewBottom, topScrollLimit,
        scrollDirection;
    ease = OO.ease.create(ease);
    const pools = {};

    const createPool = (Tug, arr=[]) => {
        const pool = {},
            createItem = (debugTag) => {
                const o = oo(Tug);
                o.elm.style.position = 'absolute';
                o.elm.style.visibility = 'hidden';
                return {
                    oo: o,
                    push: pool.push,
                    pop: pool.pop,
                    debugTag
                };
            };
        pool.push = o => arr.push(o || createItem());
        pool.pop = () => {
            return arr.pop() || createItem();
        };
        return pool;
    };

    const getItemHeight = (item) => {
        if(!item.height) {
            item.height = item.oo.getBoundingClientRect().height;
        }
        return item.height;
    };

    const prependY = (curr, add) => {
        const addHeight = getItemHeight(add);
        add.y = curr.y - addHeight;
    };

    const appendY = (curr, add) => {
        const currHeight = getItemHeight(curr);
        add.y = curr.y + currHeight;
    };

    const getItem = (Tug, index) => {
        if(!pools[Tug.name]) {
            pools[Tug.name] = createPool(Tug);
        }
        return pools[Tug.name].pop(index);
    };

    const addItem = (item, index, currItem, isPrepend) => {
        if(!item) return;
        // prev.prev takes you to the top
        // next.next takes you to the bottom
        // top is first in list, bottom is last
        item.index = index;
        item.oo.elm.style.visibility = 'visible';
        if(!topItem) { //console.log('prepend or append to empty list');
            topItem = item;
            topItem.y = 0;
        } else if(!bottomItem) { //console.log('prepend or append to list with only topItem');
            if(isPrepend) {
                prependY(topItem, item);
                bottomItem = topItem;
                topItem = item;
            } else {
                appendY(topItem, item);
                bottomItem = item;
            }
            topItem.next = bottomItem; //console.log('topItem.next='+topItem.next.debugTag);
            bottomItem.prev = topItem; //console.log('bottomItem.prev='+bottomItem.prev.debugTag);
        } else {
            const prevItem = currItem.prev,
                  nextItem = currItem.next;
            if(isPrepend) { //console.log('prepend to specified');
                prependY(currItem, item);
                if(topItem === currItem) {
                    topItem = item;
                } else {
                    prevItem.next = item;
                }
                currItem.prev = item;
                item.prev = prevItem;
                item.next = currItem;
            } else { // append to specified
                appendY(currItem, item);
                if(bottomItem === currItem) {
                    bottomItem = item;
                } else {
                    nextItem.prev = item;
                }
                currItem.next = item;
                item.prev = currItem;
                item.next = nextItem;
            }
        }
        return item;
    };

    const removeItem = (item) => {
        if(!item) return;
        const prevItem = item.prev,
            nextItem = item.next;
        if(prevItem) {
            prevItem.next = null;
        }
        if(nextItem) {
            nextItem.prev = null;
        }
        if(item === bottomItem) {
            bottomItem = item.prev;
        } else if(item === topItem) {
            topItem = nextItem;
        }
        item.prev = null;
        item.next = null;
        item.index = null;
        item.y = null;
        item.height = null; // caching optmz //TODO if elm expands or changes somehow, then this needs to be nullified again
        item.oo.elm.style.visibility = 'hidden';
        item.push(item);
    };

    const populate = () => {
        if(!viewHeight) {
            viewHeight = viewBottom = oo.getBoundingClientRect().height;
            topScrollLimit = viewBottom * 0.1;
            bottomScrollLimit = viewBottom * 0.90;
        }
        let height = viewHeight,
            index = startIndex,
            item;
        while(height > 0) {
            item = addItem(binderCb(getItem, index), index, item, false);
            if(!item) {
                break;
            }
            height -= getItemHeight(item);
            index++;
        }
    };

    const scrollY = (change, duration) => {
        scrollDirection = change > 0 ? 1 : -1;
        if(viewHeight) {
            change = Math.abs(change);
            if(change > viewHeight) {
                change = viewHeight;
            }
            ease.init(0, change * 0.9, duration || 500, scrollDirection);
        }
    };

    const createBounce = () => {
        const timeLeft = ease.timeLeft();
        if(timeLeft > 0) {
            const direction = scrollDirection*-1;
            scrollY((ease.distanceLeft()*0.12) * direction, timeLeft);
        }
    };

    const render = () => {
        if(!topItem) {
            populate();
            return;
        }
        const topY = topItem.y;
        if(ease.timeLeft() > 0) {
            topItem.y += ease.tick();
        }
        if(scrollDirection < 0) {
            if(topItem.y > 0) { // more items will be slide down into view from the above
                const index = topItem.index - 1;
                let item;
                if(bottomItem) {
                    if(bottomItem.y > viewBottom) { //console.log('bottomItem outside view, no need to keep it');
                        removeItem(bottomItem);
                    }
                    item = addItem(binderCb(getItem, index), index, topItem, true); //console.log('prepend to topItem');
                } else { // only topItem exists
                    item = addItem(binderCb(getItem, index), index, topItem, true);
                }
                if(!item && topItem.y > topScrollLimit) {
                    createBounce(topY);
                }
            }
        } else if(scrollDirection > 0) { // more items will slide up into view from below
            if(topItem.y + getItemHeight(topItem) < 0) {
                if(bottomItem) {
                    removeItem(topItem);
                } else {
                    createBounce(topY);
                }
            } else {
                const index = bottomItem ? bottomItem.index + 1 : topItem.index + 1;
                if(!bottomItem) {
                    addItem(binderCb(getItem, index), index, topItem, false); //console.log('append to topItem. index='+index, {topItem});
                } else if(bottomItem.y + getItemHeight(bottomItem) < viewBottom) {
                    const item = addItem(binderCb(getItem, index), index, bottomItem, false); // append to bottomItem
                    if(!item && (bottomItem.y + getItemHeight(bottomItem) < bottomScrollLimit)) {
                        createBounce(topY);
                    }
                }
            }
        }

        for(let item = topItem; item; item = item.next) {
            if(item.y > 1000) {throw 'asd'; break;}
            //console.log('item', item.debugTag);
            item.oo.elm.style.top = item.y;
            if(item.next) {
                //console.log('    item.next', item.next.debugTag);
                item.next.y = item.y + getItemHeight(item);
            }
        }
    };

    oo.x(populate);
    oo.x(scrollY)
    oo.x(render);
};


