import OO from '../../oo/oo.js';
import {copyToClipboard, getFromClipboard} from '../../oo/utils.js';
import {ScrollablePage} from './infinite-list.js';

export const
    TOAST = 'gui/toast'; // singelton widget. a toast displays information temporarily

export function errorToast(oo, text, ms=2000) { oo.$.set(TOAST, {text, ms, error:true}, true); };
export function warningToast(oo, text, ms=1000, clickable, clear) { oo.$.set(TOAST, {text, ms, warning:true, clickable, clear}, true); };
export function infoToast(oo, text, ms=2000, clickable, clear) { oo.$.set(TOAST, {text, ms, clickable, clear}, true); };
export function clickToast(oo, text) { oo.$.set(TOAST, {text, clickable:true}, true); };
export function Toast({oo, css, on}, props) {
    css(`
    Toast {
        height: var(--barthick);
        bottom: calc(var(--barthick) * 1.25);
        position: absolute;
        display:block;
        width: 100%;
        text-align: center;
        /*background: #f0f;*/
        pointer-events: none;
   }

   Toast Text {
        opacity: 0;
        display: inline-block;
        padding: 8px;
        padding-left: 15px;
        padding-right: 15px;
        border-radius: 20px;
        transition: var(--transitionFast) linear;
        top: 15px;
        font-variant: normal;
        letter-spacing: 1px;
    }

    Toast Icon {
        margin-left: 10px;
        vertical-align: middle;
    }
    `);

    const
        root = oo;
    let queue = [],
        isShowing,
        toast;

    const stopShowing = (o) => {
        //root.style({opacity: 0, zIndex: 0});
        o.destroy();
        isShowing = false;
        if(o === toast) toast = null;
        update();
    };

    const update = () => {
        //if(isShowing) return;
        const args = queue.pop();
        if(!args) return;

        isShowing = true;
        root.style({opacity: 1, zIndex: 'var(--ztoast)'});
        const o = root(Text, {text: args.text});
        o.style({position: 'absolute'});
        o.style({position: 'block'});
        const top = (queue.length * 2);
        o.style({top:  top + 'px'});
        o.classList({clear:true});
        o.classList({add:'fadeIn'});
        if(args.error) {
            o.classList({add:'fwhite'});
            o.classList({add:'bred'});
        } else if(args.warning) {
            o.classList({add:'fwhite'});
            o.classList({add:'borange'});
        } /*else if(args.clickable) {
            o.classList({add:'fwhite'});
            o.classList({add:'bspace'});
        } */else { // info
            o.classList({add:'fspace'});
            o.classList({add:'bwhite'});
        }

        if(args.clickable) {
            o(Icon, 'close', {md:18})
                .style({pointerEvents:'all'})
                .onclick(() => stopShowing(o));
        } else {
            //o.timer(args.ms || 1000, () => {
            //    o.classList({remove:'fadeIn', add:'fadeOut'});
            //    o.timer(200, () => stopShowing(o));
            //});
        }

        toast = o;
    };

    function Text(oo, {text}) {
        oo('span', text);
    }

    on(TOAST, (args) => { //console.log('TOAST', args);
        if(args.clear) {
            queue = [];
            isShowing = false;
            if(toast) toast.destroy();
        }
        queue.unshift(args);
        update();
    });
};

//export function Share({oo, css, createCue, on}, props) {
//    css(`
//    Share {
//        z-index: var(--ztoast);
//        width: 50px;
//        height: 50px;
//        position: absolute;
//        display:block;
//        right: 50px;
//        bottom: 90px;
//        border-radius: 50%;
//        color: var(--blackbright);
//        background: var(--whitebright);
//        /*border: 1px solid #000;*/
//    }
//    `);
//    oo(Icon, 'share').style({fontSize: '44px'});
//};

export function RadioList({oo}, {selected=-1}) {
    oo.css('vertical-align: middle;');
    const
        onSelect = oo.xx('onSelect');

    const list = [];

    oo.onchild = (oo) => {
        if(oo.elementName === 'radiobutton') {
            list.push(oo);
            update();
        }
    };

    const update = () => {
        list.forEach((o, index) => {
            if(index !== selected) {
                o.deselect();
            }
        });
    };

    oo.x([
        function select(v) { // v can be Numer or a (tug) function. invoked by RadioButton
            if(typeof v === 'function') v = list.findIndex(o => o === v);
            const b = onSelect(list[v], v);
            if(b !== false) {
                selected = v;
                update();
            }
            return b;
        },
        function getSelected() {
            return list[selected];
        },
        function getSelectedIndex() {
            return selected;
        }
    ]);
};

export function RadioButton({oo, css}, {md=22, selected, enable}) {
    css(`
    RadioButton {
        display: block;
    }

    RadioButton Icon.disable {
        color: var(--grayspace); /* remove highlight on mouse over, but keeps click pointer */
    }
    `);

    const icon = oo(Icon, {md}).onclick(() => {
        if(!enable) return;
        oo.select();
    });

    oo.x([
        function select() { // invoked onclick
            if(oo.parent().select(oo)) {
                selected = true;
                icon.html('radio_button_checked');
            }
        },
        function deselect() { // invoked by RadioList
            selected = false;
            icon.html('radio_button_unchecked');
        },
        function isSelected() {
            return selected;
        },
        function setEnable(b) {
            enable = b === undefined || b;
            if(enable) icon.classList({remove:'disable'});
            else icon.classList({add:'disable'});
        }
    ]);
};

export function Expander({oo, css}, props) {
    return oo(Toggle, {icons:['expand_less', 'expand_more'], classNames:['',''], ...props});
};

export function Toggle({oo, css}, {enable=true, on=false, icons=['toggle_on', 'toggle_off'], classNames=['fgreen','fred']}) {
    css(`
    Toggle {
        display: inline-block;
        vertical-align: middle;
        margin: 6px;
    }

    Toggle Icon.disable {
        color: var(--grayspace); /* remove highlight on mouse over, but keeps click pointer */
    }
    `);
    const
        onToggle = oo.xx('onToggle');

    let icon;
    const update = () => {
        icon.classList({remove:'disable'});
        icon.classList(classNames[0], {remove:true});
        icon.classList(classNames[1], {remove:true});
        if(!enable) {
            icon.classList({add:'disable'});
            icon.html(icons[1]);
        } else if(on) {
            icon.classList(classNames[0], {add:true});
            icon.html(icons[0]);
        } else {
            icon.classList(classNames[1], {add:true});
            icon.html(icons[1]);
        }
    };

    icon = oo(Icon).onclick(() => {
        if(!enable) return;

        on = !on;
        if(onToggle(on, oo) !== false) {
            update();
        }
        else on = !on;
    });

    oo.x([
        function setText(s) {
            oo.elm.html(s);
        },
        function setToggle(b) {
            on = b === undefined ? !on : b;
            update();
        },
        function setEnable(b) {
            enable = b === undefined || b;
            update();
        }
    ]);

    update();
};

export function Secret({oo, css}, {text}) {
    css(`
    Secret {
        display: inline-block;
    }

    Secret Span {
        font-size: var(--fontn);
        font-variant: normal;
        margin-right: 6px;
    }
    `);
    const onReveal = oo.xx('onReveal');

    oo(Icon, 'visibility', {md:18, middle:true});
    if(text) oo('span', text);

    const reveal = () => {
        if(oo.isDestroyed) return;
        if(onReveal(oo) !== false) oo.destroy();
    };

    oo.onclick(() => {
        reveal();
    });

    oo.x([
        function setReveal() {
            reveal();
        }
    ]);
};

export function CopyableText({oo, css, $}, {text, enable=true, expanded, size, suffix='...'}) {
    css(`
    CopyableText:hover {
        cursor: pointer;
        color: var(--whitebright);
    }

    CopyableText {
        font-size: var(--fontn);
        font-variant: normal;
        margin-right: 6px;
        user-select: text;
        -moz-user-select: text;
        -webkit-user-select: text;
        -ms-user-select: text;
    }

    CopyableText.disable {
        color: var(--grayspace);
    }

    `);

    const handleClick = () => {
        if(enable) {
            copyToClipboard(oo.getText());
            infoToast(oo, 'Copied');
        }
    };

    const revealSpan = oo('span');
    const span = oo('span', text);
    const icon = oo._(Icon, 'content_copy', {md:18}).onclick(handleClick);

    let revealIcon;
    const update = () => {
        // reveal
        if(size && text) {
            if(!revealIcon) {
                revealIcon = revealSpan(Icon, 'expand_more', {md:18, middle:true}).onclick(() => {
                    oo.toggle();
                });
            }

            if(expanded) {
                revealIcon.html('expand_less');
                span.text(text);
            } else {
                revealIcon.html('expand_more');
                if(text.length > size) span.text(text.substring(0, size)+suffix);
                else span.text(text);
            }

            if(enable) revealIcon.classList({remove:'disable'});
            else revealIcon.classList({add:'disable'});
        }

        // copy
        if(enable) {
            oo.classList({remove:'disable'});
            icon.style({visibility:'visible'});
        } else {
            oo.classList({add:'disable'});
            icon.style({visibility:'hidden'});
        }
    };

    update();

    oo.x([
        function setEnable(b) {
            enable = b === undefined || b;
            update();
        },
        function setText(s) {
            text = s;
            span.text(s);
            update();
        },
        function getText() {
            return text || oo.elm.innerText;
        },
        function setExpand(b) {
            expanded = b === undefined || b;
            update();
        },
        function toggle() {
            expanded = !expanded;
            update();
        }
    ]);
};

export function Icon({oo, css}, {i, md='36', middle, enable=true}) {
    const onClicked = oo.xx('onClicked');

    if(!i) {
        md = ' md-' + md;
    } else {
        oo.html(i);
    }
    oo.onclick(() => {
        if(enable) onClicked(oo);
    });
    oo.x([
        function setClassName(className) {
            oo.classList({clear:true}); // reset
            if(!i) oo.className('material-icons' + md);
            if(middle) oo.classList({add:'icon-middle'});
            if(className) oo.classList({add: className});
        },
        function setEnable(b, className='fgreen') {
            enable = b;
            if(enable) oo.setClassName(className); // reset to default
            else oo.setClassName('fspace');
        }
    ]);
    oo.setClassName('');
};

export function NumberInput({oo}, {number=0, add, subtract, floor, ceil}) {
    oo.css(`
    NumberInput Icon {
        vertical-align: middle;
        background: var(--whitemedium);
        color: var(--graydark);
        margin-left: 15px;
        margin-right: 15px;
    }
    `);

    const onUpdated = oo.xx('onUpdated');

    const more = oo(Icon, 'add', {md:18}).onclick(() => {
        oo.setNumber(number + (add || 1), true);
    });
    const span = oo('span');
    const less = oo(Icon, 'remove', {md:18}).onclick(() => {
        oo.setNumber(number - (subtract || 1), true);
    });

    oo.x([
        function setNumber(n, isNotify) {
            if(typeof floor === 'number' && n < floor) return;
            if(typeof ceil === 'number' && n > ceil) return;
            if(isNotify === true && onUpdated(n, oo) === false) return;
            number = n;
            span.html(n);

            if(typeof floor === 'number' && (number - (subtract || 1)) < floor) less.classList({add: 'bgray'});
            else less.classList({remove:'bgray'});
            if(typeof ceil === 'number' && (number + (add || 1)) > ceil) more.classList({add: 'bgray'});
            else more.classList({remove:'bgray'});
        }
    ]);

    oo.setNumber(number);
};

export function TextAreaInput({oo}, {text}) {

    const onUpdated = oo.xx('onUpdated');

    oo.css(`
    TextAreaInput textarea {
        border: 0;
        width: calc(var(--widthfull) - (var(--m)*2));
        height: calc(var(--heightfull) * 0.5);
        color: var(--whitesun);
        font-size: 20px;
        background-color: var(--blackbright);
        border-radius: 5px;
        padding: 4px;
    }
    `);

    const input = oo('textarea');
    input.onevent('focusout', ({oo:o}) => {
        if(text !== o.elm.value) {
            text = o.elm.value;
            onUpdated(text, oo);
        }
    });

    oo.x([
        function setText(s) {
            text = s;
            input.elm.value = text;
        },
        function getText() {
            return text || '';
        }
    ]);
};

export function TextInput({oo}, {path, text, size, hint, type='text'}) {
    const onUpdated = oo.xx('onUpdated');
    let value;
    const input = oo('input', {type});
    input.onclick(() => {
        if(input.elm.value === hint) input.elm.value = '';
    });
    input.onevent('focusout', ({oo:o}) => {
        if(value !== o.elm.value) {
            value = o.elm.value;
            onUpdated(value, oo);
        }
    });

    // TODO make sure setting value is secure and that escaping using > is not possible
    if(hint) input.elm.value = hint;
    if(text) input.elm.value = text;
    if(path) {
        input.on(path, (v, oo) => {
            value = v;
            oo.elm.value = v;
        })
    }

    oo.x([
        function setText(s) {
            if(!s) s = hint;
            input.elm.value = s;
        },
        function getText() {
            return input.elm.value;
        },
        function clearText() {
            input.elm.value = '';
            oo.setError(false);
        },
        function setError(b) {
            if(b) input.style({borderStyle: 'solid'});
            else input.style({borderStyle: 'none'});
        }
    ]);
};

export function TextButton({oo, xx}, {enable=true, countdown}) {
    console.log('TODO replace TextButton with TextPlunger');
    const
        onClicked = xx('onClicked'),
        onStart = xx('onStart'),
        onAbort = xx('onAbort'),
        onDone = xx('onDone');
    let clearTimer,
        text;

    oo.onclick(() => {
        if(enable) {
            onClicked({oo});
            if(countdown) {
                if(clearTimer) {
                    clearTimer();
                    clearTimer = null;
                    onAbort({oo});
                } else {
                    onStart({oo});
                    oo.text(text + countdown.interval);
                    clearTimer = oo.timer(countdown.ms, countdown, ({delta}) => {
                        oo.text(text + delta);
                        if(delta === 0) {
                            oo.setEnable(defaultEnable);
                            onDone({oo});
                        }
                    });
                }
            }
        }
    });

    oo.x([
        function setEnable(b) {
            enable = b;
        },
        function setText(s) {
            text = s;
            oo.text(text);
        },
        function setClassName(s) {
            if(!s) oo.classList({clear:true});
            else oo.className(s);

        },
        function setVisible(b) {
            if(b) oo.style({visibility: 'visible'});
            else oo.style({visibility: 'hidden'});
        }
    ]);

    oo.setEnable(enable);
};

export function TextPlunger(oo, props) { Plunger(oo, {...props}); }; // TODO make sure it works
export function Plunger({oo, xx, timer, classList, css}, {icons=[], md, enable, countdown, className, classNames}) {
    if(icons) {
        oo.classList(`material-icons md-${md ? md : '36'}`, {add:true});
    }
    if(countdown) {
        css(`
        .plungerFade {
             transition-property: color;
             transition: ${countdown.ms}ms ease-in;
        }
        `);
    }

    const
        onClickedAsync = xx('onClickedAsync'),
        onStart = xx('onStart'),
        onAbort = xx('onAbort'),
        onDone = xx('onDone');
    let defaultEnable = enable,
        clearTimer,
        text;

    oo.onclick(async () => {
        if(enable) {
            await onClickedAsync(oo);
            if(classNames) {
                classList('plungerFade', {remove:true});
                oo.setClassName(classNames[2]);
            }
            timer(0, () => {
                classList('plungerFade', {add:true});
                if(classNames) oo.setClassName(classNames[3]);
                if(countdown) {
                    if(clearTimer) {
                        clearTimer();
                        clearTimer = null;
                        if(icons.length) oo.html(icons[0]);
                        if(classNames) classList('plungerFade', {remove:true});
                        oo.setEnable(defaultEnable);
                        onAbort(oo);
                    } else {
                        onStart(oo);
                        if(icons.length) {
                            oo.html(icons[1]);
                        } else {
                            oo.text(text + countdown.interval);
                        }
                        clearTimer = timer(countdown.ms, countdown, ({delta}) => {
                            if(icons.length) {
                                oo.html(icons[0]);
                            } else {
                                oo.text(text + countdown.interval);
                            }
                            if(classNames) classList('plungerFade', {remove:true});
                            oo.setEnable(defaultEnable);
                            if(!delta) {
                                clearTimer();
                                clearTimer = null;
                                onDone(oo);
                            }
                        });
                    }
                }
            });
        }
    });

    oo.x([
        function setEnable(b) {
            enable = b;
            if(classNames) {
                if(b) oo.setClassName(classNames[1]);
                else oo.setClassName(classNames[0]);
            }
        },
        function setText(s) {
            text = s;
            oo.text(text);
        },
        function setClassName(s) {
            if(!s) {
                oo.classList({remove:className});
                className = null;
            } else if(className) {
                oo.classList(s, {replace:className});
                className = s;
            } else {
                oo.classList(s, {add:true});
                className = s;
            }
        },
        function setVisible(b) {
            if(b) oo.style({visibility: 'visible'});
            else oo.style({visibility: 'hidden'});
        }
    ]);

    oo.setEnable(defaultEnable);
    if(icons.length > 0) oo.html(icons[0]);
    if(classNames) oo.setClassName(classNames[0]);
};

export function SavePlunger({oo, xx}, {ms=2000, okIcon='cloud_upload', abortIcon='cancel', disabledClass='fgray'}) {
    const
        onAbort = xx('onAbort'),
        onClickedAsync = xx('onClickedAsync'),
        onDone = xx('onDone');

    let data = null;

    const plunger = oo(Plunger, {countdown:{ms}, icons:[okIcon, abortIcon], classNames:[disabledClass, 'fgreen', 'forange', 'fgray']})
        .onClickedAsync(async () => {
            return await onClickedAsync(data, oo);
        })
        .onAbort(async (oo) => {
            if((await onAbort(oo)) !== false) warningToast(oo, 'Aborted');
        })
        .onDone(async ({oo}) => {
            const msg = await onDone(data, oo);
            if(msg !== false) infoToast(oo, msg || 'Saved');
        });

    oo.x([
        function setEnable() {
            plunger.setEnable(...arguments);
        },
        function getData() {
            return data;
        },
        function add(k, v) {
            if(!data) data = {};
            data[k] = v;
            oo.setData(data);
            return oo;
        },
        function setData(d) {
            data = d === undefined ? null : d;
            if(data) oo.setEnable(true);
        }
    ]);
};

export function DeletePlunger({oo, xx}, {ms=3000, enable=true, okIcon='delete', abortIcon='cancel', infoMessage='Deleted'}) {
    const
        onAbort = xx('onAbort'),
        onDone = xx('onDone');

    const plunger = oo(Plunger, {countdown:{ms}, enable, icons:[okIcon, abortIcon], classNames:['fgray', 'fred', 'forange', 'fred']})
        .onAbort((oo) => {
            if(onAbort(oo) !== false) warningToast(oo, 'Aborted');
        })
        .onDone(({oo}) => {
            if(onDone(oo) !== false) infoToast(oo, infoMessage);
        });

    oo.x([
        function setEnable() {
            plunger.setEnable(...arguments);
        }
    ]);

    oo.setEnable(enable);
};

export function Close({oo, css}) {
    css(`
    position: absolute;
    right: 0;
    top: 0;
    `);
    oo(Icon, 'close');
};

export function Modal({oo, css, createCue, on}, {/*abort, accept,*/ µ}) {
    const modal = µ.treehutrOOt('Modal');

    css(`
    Modal {
        z-index: var(--zmodal);
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
    }

    Modal Backdrop {
        display: block;
        background: var(--whitesun);
        width: 100%;
        height: 100%;
    }

    Modal Pane {
       z-index: 1;
       position: absolute;
       display: block;
       left: 0;
       top: 0;
       margin-left: 20px;
       margin-right: 40px;
       color: var(--blackbright);
       width: 85%;
    }

    Modal Modalbar {
       display: block;
       position: relative;
       height: 50px;
       margin-top: 10px;
    }

    Modal Content {
       display: block;
       background: unset;
       position: relative;
    }

    Modal H1 {
       font-size: 20px;
       font-variant: small-caps;
       color: var(--blackbright);
       margin-top: 30px;
       margin-bottom: -10px;
    }

    Modal Paragraph {
       display: block;
       font-variant: small-caps;
       margin-top: 15px;
    }

    Modal Textarea {
       border: 0;
       width: 100%;
       font-size: 15px;
       color: var(--blackbright);
       background: var(--whitelight);
    }

/*
    Modal Icon.abort {
       position: absolute;
       left: 50px;
       color: var(--blackbright);
    }

    Modal Icon.abort:hover {
       color: var(--redlight);
       text-shadow: unset;
    }

    Modal Icon.accept {
        position: absolute;
        right: 50px;
        color: var(--blackbright);
    }

    Modal Icon.accept:hover {
        color: var(--greenlight);
        text-shadow: unset;
    }
*/

    Modal Close {
        z-index: calc(var(--zmodal) + 1);
        color: var(--graymedium);
    }

    Modal Close Icon:hover {
        color: var(--whitemedium);
    }

    Modal Row {
        height: 100%;
    }

    Modal Icon:hover {
        color: var(--whitemedium);
    }

    `);

    const row = modal(ScrollablePage);

    modal('Backdrop');

    const
        pane = row('Pane'),
        content = pane('Content');
        //bar = pane('Modalbar');

    const
         onAbort = content.xx('onAbort');
    //     onAccept = content.xx('onAccept');

    const destroy = () => {
        modal.destroy();
        oo.destroy();
    };

    //if(abort === undefined) {
    //    modal.onclick(() => {
    //        onAbort();
    //        destroy();
    //    });
    //}

    //if(abort === true) {
    //    const abortButton = bar('span').onclick(() => {
    //        if(onAbort() !== false) destroy();
    //    });
    //    /*if(abort === true)*/ abortButton(Icon, 'cancel').classList({add:'abort'});
    //    //else abortButton('span', abort);
    //}

    //if(accept === true) {
    //    const acceptButton = bar('span').onclick(() => {
    //        if(onAccept() !== false) destroy();
    //    });
    //    /*if(accept === true)*/ acceptButton(Icon, 'check_circle').classList({add:'accept'});
    //    //else acceptButton('span', accept);
    //}

    content.x([
        function close() {
            destroy();
        },
        function add(header, text, options) {
            content.h(header, options);
            const arr = text.split('\n'); //console.log(text, arr);
            arr.forEach(s => content.p(s, options));
            return content;
        },
        function h(s, options={}) {
            const oo = content('div')('h1');
            if(options.noescape) oo.noescapeHtml(s);
            else oo.html(s);
            return content;
        },
        function p(s, options={}) {
            const oo = content('paragraph')('span');
            if(options.noescape) oo.noescapeHtml(s);
            else oo.html(s);
            return content;
        }
    ]);

    modal(Close).onclick(() => {
        if(!onAbort || onAbort() !== false) destroy();
    });


    return content;
};

export function EditableText({oo}, {text, edit, hint, clipboard, qrcode}) {
    oo.css(`
    EditableText {
        display: inline-block;
        margin-top: 12px;
    }

    EditableText Input {
        width: 75%
    }

    EditableText Icon {
        vertical-align: middle;
        margin-left: 5px;
        margin-right: 5px;
    }
    `);

    let toolSpan;
    if(clipboard || qrcode) {
        toolSpan = oo('span');
        toolSpan(Icon, 'qr_code_scanner', {md:18}).onclick(() => {
            alert('TODO');
        });
        toolSpan(Icon, 'content_paste', {md:18}).onclick(() => {
            const s = getFromClipboard(oo);
            if(onUpdated(s, oo) === false) return;
            text = s;
            showDisplay();
        });
    }

    const
        onEdit = oo.xx('onEdit'),
        onUpdated = oo.xx('onUpdated');

    let div = oo('span'),
        o;

    const showDisplay = () => {
        div = oo('span', {replace:div});
        o = div('span', text);
        div(Icon, 'edit', {md:18}).onclick(() => {
            showEdit();
        });
        if(toolSpan) toolSpan.classList({add:'hide'});
    };

    const showEdit = () => {
        div = oo('span', {replace:div});
        o = div(TextInput, {hint})
            .onUpdated((s) => {
                if(onUpdated(s, oo) === false) return;
                oo.setText(s || hint);
                if(s) showDisplay();
                else showEdit();
            });
        o.setText(text);
        if(toolSpan) toolSpan.classList({remove:'hide'});
        onEdit(oo);
    };

    oo.x([
        function setText(s) {
            text = s;
            if(o.setText) o.setText(text);
            else o.html(text);
        }
    ]);

    if(edit) showEdit();
    else if(text !== undefined) showDisplay();
    else showEdit();
};

export function RefreshIcon({oo}, {run}) {
    oo.css(`
    RefreshIcon Icon {
        display: inline-block;
    }

    RefreshIcon Icon.rotate {
        animation: refreshrotation 2s infinite linear;
    }

    @keyframes refreshrotation {
        from {
            transform: rotate(0deg);
        }
        to {
             transform: rotate(359deg);
        }
    }
    `);

    const onClick = oo.xx('onClick');

    const icon = oo(Icon, 'refresh')
        .onclick(() => {
            if(run) return;
            console.log('run');
            if(onClick(oo) === false) return;
            icon.classList({add:'rotate'});
            run = true;
        });

    oo.x([
        function setStop() {
            icon.classList({remove:'rotate'});
            run = false;
        }
    ]);

};

