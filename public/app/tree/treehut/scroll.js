/**
 * TODO
 *      inverse scrolling direction param (should be stored in preferences)
 */

import {createEase, easeOutQuad, linearTween} from '../../oo/ease-oo.js'

export function createScrollHandler(oo, cb) {
    let running;

    let stateY, scrollY;
    let stateX, scrollX;

    let speedFactorX = 4,
        speedFactorY = 10,
        dragThresholdX = 3,
        dragThresholdY = 3,
        controllerY = {},
        controllerX = {};

    //let isEndDrag;

    function resetX(b=true) {                                      //console.log('resetX', b);
        stateX = { x: 0, speed: 0, easeValue: 0, idle: true };
        if(b) scrollX = createScrollX(oo, requestRender);
        else scrollX = null;
    }

    function resetY(b=true) {                                      //console.log('resetY', b);
        stateY = { y: 0, speed: 0, easeValue: 0, idle: true };
        if(b) scrollY = createScrollY(oo, requestRender);
        else scrollY = null;
    }

    function isEnabledX() {
        return !!scrollX;
    }

    function isEnabledY() {
        return !!scrollY;
    }

    function run() {
        running = false;
        if(scrollY) {
            if(stateX.drag) {
                resetY(false);
            } else {
                stateY = scrollY.run();
                if(scrollY.isEasing()) requestRender();
            }
        }

        if(scrollX) {
            if(stateY.drag) {
                resetX(false);
            } else {
                stateX = scrollX.run();
                if(scrollX.isEasing()) requestRender();
            }
        }

        //console.log(stateY);
        cb(stateX, stateY);

        if(stateY.idle && !scrollX) resetX(true);
        if(stateX.idle && !scrollY) resetY(true);

        if(debugFps) debugFps++;
    }

    let debugFps;
    function debugFramerate(startTime, count) {
        debugFps = 1;
        startTime = Date.now();
        oo.timer(5000, () => {
            const currentTime = Date.now();
            const deltaTime = currentTime - startTime;
            const runsPerTime = debugFps / (deltaTime/1000);
            if(runsPerTime > 5) console.log('FPS', runsPerTime);
            debugFramerate();
        });
    }
    debugFramerate();

    function requestRender(isForce) {                                       //console.log('requestRender', {running, isForce});
        if(running && !isForce) return;
        running = true;
        window.requestAnimationFrame(run);                                  //console.log('render requested');
    }

    function bounce() {
        if(scrollY) scrollY.bounce();
    }

    function snap(x) {                                                       //console.log('snap', scrollX);
        resetY(false);
        if(scrollX) scrollX.snap(x);
    }

    function flingX(x) {                                                    //console.log('flingX', {x, scrollX});
        if(scrollX) scrollX.fling(x);
    }

    //function endDrag() {
    //    console.log('end drag');
    //    //resetX();
    //    //resetY();
    //    isEndDrag = true;
    //}

    resetX();
    resetY();

    oo.onscroll(event => {
        if(scrollY) scrollY.update({delta:0,distance:event.deltaY*-1,start:0,screen:0,fling:true});
    });
    oo.onswipe((swipeX, swipeY) => {                                            //console.log('swipeY', {...swipeY});
        //if(isEndDrag) {
        //    if(swipeY.end) isEndDrag = false;
        //    return;
        //}
        if(scrollX) scrollX.update(swipeX);
        if(scrollY) scrollY.update(swipeY);
    }, controllerX, controllerY, {dragThresholdX, dragThresholdY, speedFactorX, speedFactorY});

    return {
        flingX,
        snap,
        bounce,
        resetY,
        resetX,
        isEnabledX,
        isEnabledY,
        //endDrag,
        requestRender
    };
};

function createScrollY(oo, requestRender) {

    const
        {height:VIEW_HEIGHT} = oo.getBoundingClientRect(),
        Y_DURATION = 3000,
        Y_BOUNCE = Math.ceil(VIEW_HEIGHT / 4),
        DOWN = -1,
        UP = 1,
        state = { y: 0, speed: 0, easeValue: 0, idle: true };

    function update({delta, distance, fling, screen, drag, begin, end}) { //console.log({delta, distance, fling, screen, drag, begin, end});
        distance = distance * -1; // inverse
        state.fling = fling;
        state.delta = delta;
        state.y = screen;
        state.drag = drag;
        state.begin = begin;
        state.end = end;

        if(begin) state.ease = null;
        else if(end && !fling) {
            state.ease = null;
        }

        if(fling) {
            distance = distance / VIEW_HEIGHT;
            if(state.bounce) state.speed = 0;
            if(state.up && distance < 0) state.speed = 0;
            if(state.down && distance > 0) state.speed = 0;
            state.speed += distance;
            let easeSpeed = state.speed;
            if(easeSpeed > 0) {
                state.up = true;
                state.down = false;
            } else {
                state.up = false;
                state.down = true;
            }
            easeSpeed = easeSpeed * VIEW_HEIGHT;
            if(!state.ease) state.ease = createEase(easeOutQuad, true);       //console.log('updateStateY', {fling, easeSpeed});
            state.ease.init(0, Math.ceil(Math.abs(easeSpeed)), Y_DURATION, state.up ? UP : DOWN);
            state.bounce = false;
        } else if(drag) {
            if(state.delta > 0) {
                state.up = true;
                state.down = false;
            } else {
                state.up = false;
                state.down = true;
            }
            state.bounce = false;
        }
        requestRender();
    }

    function run() {
        state.idle = false;
        let delta = 0;
        if(state.drag) {                                                           //console.log('renderY drag', stateX.drag);
            delta = Math.floor(state.delta);
        } else if(state.ease) {
            if(state.ease.timeLeft() >= 0) {
                delta = state.ease.tick();                                         //console.log('renderY tick', delta);
            } else {
                state.ease = null;
                state.idle = true;
            }
        } else if(state.end) {
            state.idle = true;
        }
        state.easeValue = Math.abs(delta) >= 0.1 /* ensures smoother scrolling */ ? delta : 0;
        return state;
    }

    function bounce() {
        if(state.bounce) return;                                               // console.log('bounce');
        state.bounce = true;
        if(!state.ease) state.ease = createEase(easeOutQuad, true);
        let y = state.ease.distanceLeft()*0.22;
        if(y > Y_BOUNCE) y = Y_BOUNCE;
        state.ease.init(0, Math.ceil(y), Math.ceil(state.ease.timeLeft() * 0.5), state.up ? DOWN : UP);
        state.up = !state.up;
        state.down = !state.down;
    }

    function isEasing() {
        return !!state.ease;
    }

    return {
        update,
        run,
        bounce,
        isEasing
    };
}

function createScrollX(oo, requestRender) {
    const
        {width:VIEW_WIDTH} = oo.getBoundingClientRect(),
        X_DURATION = 1000,
        X_SNAP_DURATION = 500,
        //X_DURATION = 2000,
        LEFT = 1,
        RIGHT = -1,
        state = { x: 0, speed: 0, easeValue: 0, idle: true };

    function update(x) { //console.log({...x});
        if(state.snap) return; // if snapping ignore swipe actions
        if(state.fling && x.end) return;

        state.fling = x.fling;
        state.delta = x.delta;
        state.x = x.screen;
        state.drag = x.drag;
        state.begin = x.begin;
        state.end = x.end;

        if(x.begin) {
            state.ease = null;
        } else if(x.end && !x.fling) {
            state.ease = null;
        }

        if(x.fling) {
            fling(x.distance);
            return;
       } else if(x.drag) {                                                       //console.log('x drag', screen);
            state.flingFinished = false;
            state.ease = null;
            if(state.delta > 0) {
                state.left = null;
                state.right = 'right';
            } else {
                state.left = 'left';
                state.right = null;
            }
        }
        requestRender();
    }

    function run() {                                                                //console.log({...state});
        state.idle = false;
        let delta = 0;
        if(state.drag) {                                                           //console.log('render drag', stateX.drag, state.delta);
            delta = Math.floor(state.delta);
        } else if(state.ease) {
            if(state.ease.timeLeft() >= 0) {
                delta = state.ease.tick();                                         //console.log('render tick', delta);
            } else {
                state.ease = null;
                state.idle = true;
                if(state.snap) state.snapFinished = true;
                if(state.fling) state.flingFinished = true;
                else state.flingFinished = false;
                state.snap = false;
                state.fling = false;
            }
        } else if(state.end) {
            state.idle = true;
        }
        state.easeValue = Math.abs(delta) >= 0.1 /* ensures smoother scrolling */ ? delta : 0;
        return state;
    }

    function snap(x) {
        if(state.snap) return;
        state.snap = true;
        state.snapFinished = false;
        state.idle = false;
        // state.ease = createEase(easeOutQuad, true);
        let duration = X_SNAP_DURATION;
        //if(state.ease) {
        //    let timeLeft = state.ease.timeLeft();
        //    if(timeLeft > 100) duration = timeLeft;
        //} else {
        //    state.ease = createEase(linearTween, true);
        //}
        state.ease = createEase(easeOutQuad, true);
        state.ease.init(0, Math.abs(Math.ceil(x)), duration, x >= 0 ? LEFT : RIGHT);
        requestRender();                                                            //console.log('snap', x);
    }

    function fling(distance) {                                                       //console.log('fling', distance);
        state.snap = false;
        state.snapFinished = false;
        state.fling = true;
        state.flingFinished = false;
        state.idle = false;
        distance = distance / VIEW_WIDTH;
        if(state.left && distance < 0) state.speed = 0;
        if(state.right && distance > 0) state.speed = 0;
        state.speed += distance;
        let easeSpeed = state.speed;
        if(easeSpeed > 0) {
            state.left = null;
            state.right = 'right';
        } else {
            state.left = 'left';
            state.right = null;
        }
        easeSpeed = easeSpeed * VIEW_WIDTH;
        /*if(!state.ease)*/ state.ease = createEase(easeOutQuad, true);
        state.ease.init(0, Math.ceil(Math.abs(easeSpeed)), X_DURATION, state.left ? LEFT : RIGHT); 
        requestRender();                                                                //console.log('render');
     }

    function isEasing() {
        return !!state.ease;
    }

    return {
        run,
        update,
        isEasing,
        snap,
        fling
    };
}
