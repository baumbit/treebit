// fix
// refactor
//
/*
 * v0.0.1-1
 * Treehut - App client (client(example: browser)+host(exampe:nodejs)) - Treenet
 * Light client that offers graphical cabinet interaction with content on Treenet.
 * Depends on a host running Grapevine for serving content.
 */
import OO from '../oo/oo.js';

export function createPlatformstyle(oo, platform) {
    // TODO add support for iPad, Android, etc
    const platformStyle = 'Platformstyle';
    if(OO.isNodeJs) {
        oo.stylesheet(`
        :root {
            --widthfull: 100%;
            --heightfull: 100vh;
        }
        `, platformStyle);
     } else if(platform === 'simshim') {
        oo.stylesheet(`
        :root {
            --widthfull: 380px;
            --heightfull: 650px;
        }
        `, platformStyle);
    } else if(OO.isiPhone) {
        // prevent page scrolling by setting app height to the height of the screen subtracted by the iphone navigation bar (window.innerHeight),
        // and setting html and body overflow to hidden.
        oo.stylesheet(`
        :root {
            --widthfull: 100%;
            --heightfull: ${window.innerHeight}px;
        }

        Html {
            height: var(--heightfull);
            overflow: hidden;
        }

        Body {
            height: var(--heightfull);
            overflow: hidden;
        }
        `, platformStyle);
        // when iPhone navigationbar/footer minimize/expand, it will trigger a resize
        window.addEventListener('resize', function() {  //console.log('window resize');
            document.documentElement.style.setProperty('--heightfull', `${window.innerHeight}px`);
        });
    } else {
        oo.stylesheet(`
        @media (max-width: 540px) {
            :root {
                --widthfull: 100%;
                --heightfull: 100vh;
            }
            /*div{background:#ff1100;}*/
        }

        @media (min-width: 541px) {
            :root {
                --widthfull: 550px;
                --heightfull: 100vh;
            }
            /*div{background:#1100ff;}*/
        }
        `, platformStyle);
    }
};

export function createAppstyle(oo) {
    oo.stylesheet(`
    /* @see https://github.com/necolas/normalize.css */
    @import url('/foreign/normalize.css');

    /* @see https://developers.google.com/fonts/docs/material_icons#icon_font_for_the_web */
    /* example: <span class="material-icons md-24">face</span> */
    /* example custom color: .material-icons.orange600 { color: #FB8C00; } |  <span class="material-icons orange600">face</span> */
    @import url('/foreign/fonts/MaterialIcons.css');

    :root {
        /* app */
        --m: 5px;
        --mleft: 5px;
        --mright: 5px;
        /*--transition: 2s;*/
        --transitionSlow: 0.15s;
        /*--transitionFast: 100ms;*/
        --transitionFast: 400ms;

        /* fonts */
        --fontxl: 32px;
        --fontl: 26px;
        --fontn: 17px;
        --fonts: 14px;
        --fontxs: 12px;

        /* colors */
        --blackbright: #151515;
        --grayspace: #202020;
        --graydark: #2e2e2eff;
        --graymedium: #323232;
        --graylight: #343434;
        --graybright: #373737;
        --whitespace: #404040;
        --whitedark: #505050;
        --whitemedium: #909090;
        --whitelight: #f0f0f0;
        --whitebright: #f8f8f8;
        --whitesun: #fff;
        --greenlight: #32fe00;
        --bluelight: #00d3ff;
        --yellowlight: #fffe00;
        --orangelight: #ff8700;

        /* tugs */
        --background-cardheader: #343434;
        --reddark: #550000;
        --redlight: #ff0000;
        --barthick: 50px;
        --barthin: 25px;

        /* layers */
        --ztree:              100;
        --ztreebar:           110;
        --zhome:              200;

        --zfeeds:            3000;

        --zpeers:            3500;
        --znetworknodes:     3500;
        --zsigners:          3500;

        --zcabinet:          5000;
        --zconnect:          5000;
        --znodeprofile:      5000;
        --znetworknodes:     5000;
        --zpeer:             5000;
        --znetworknode:      5000;

        --zsignersbar:       5003;

        --zcabinetsigner:    6000;
        --zfollowing:        6000;
        --zfollowingbar:     6001;

        --zcompose:          7000;

        --zsigner:           8000;

        --zadmin:          101000;

        --zdev:            901000;

        --zprivatekey:    1000500;

        --zmodal:         1002000;
        --ztoast:         1002001;

    }

    Body {
        background-color: #1d1d1d;
    }

    button, TextButton {
        cursor: pointer;
        border: 0;
        color: #000;
        background-color: #fff;
        border-radius: 5px;
        font-size: 16px;
        font-weight: bold;
        padding: 4px;
    }

    App {
        display: block;
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
        position: relative;
        overflow: hidden;
        height: var(--heightfull);
        color: #ffffec;
        background-color: var(--graydark);
        width: var(--widthfull);
        margin: auto;
        font-family: Arial;
     }

    App H1, H2, H3 {
        font-variant: normal;
        font-variant: small-caps;
        color: var(--whitebright);
    }


    App input {
        font-size: var(--fontn);
        border-style: none;
        border-radius: 3px;
        color: #fff;
        padding: 2px;
        padding-left: 10px;
        border-color: var(--redlight);
        background-color: var(--graylight);
    }

    App Icon {
    }

    App Icon:hover {
        color: var(--whitesun);
        cursor: pointer;
        /*text-shadow: 0px 0px 3px #585858;*/
    }

    Plunger, TextPlunger {
        cursor: pointer;
    }

    TextPlunger {
        border: 0;
        color: #000;
        background-color: #fff;
        border-radius: 5px;
        font-size: 16px;
        font-weight: bold;
        padding: 4px;
    }

    /*[class*="huticon-"] {
    }*/
    /*.huticon-small:hover {
        color: #f0f;
    }*/

    .icon-middle {
        margin: 10px;
        vertical-align: middle;
    }

    .fspace     { color: var(--grayspace);      }
    .fwhite     { color: var(--whitebright);    }
    .fgray      { color: var(--graymedium);     }
    .fyellow    { color: var(--yellowlight);    }
    .fgreen     { color: var(--greenlight);     }
    .fblue      { color: var(--bluelight);      }
    .forange    { color: var(--orangelight);    }
    .fred       { color: var(--redlight);       }

    .bspace     { background-color: var(--blackbright); }
    .bgray      { background-color: var(--graymedium);  }
    .bwhite     { background-color: var(--whitebright); }
    .bgreen     { background-color: var(--greenlight);  }
    .borange    { background-color: var(--orangelight); }
    .bred       { background-color: var(--redlight);    }

    .page {
        display: block;
        position: absolute;
        height: calc(var(--heightfull) + var(--barthin));
        width: 100%;
        transition: var(--transitionFast) linear;
        background-color: var(--graylight);
    }

    .cols2 {
        display: grid;
        grid-template-columns: repeat(2, 2fr);
        column-gap: 5px;
        align-items: baseline;
    }

    .line {
        display: block;
        width: 100%;
        height: 49%;
        border-bottom: 2px solid var(--whitedark);
    }

    .selectable {
       user-select: text;
        -moz-user-select: text;
        -webkit-user-select: text;
        -ms-user-select: text;
    }

    .show {
        visibility: visible;
    }

    .hide {
        visibility: hidden;
    }


    .pulsate {
        animation: pulsate-kf 1.5s infinite ease-out;
    }
    @keyframes pulsate-kf {
        0%   { transform: scale(0.5); }
        50%  { transform: scale(1.2); }
        70%  { transform: scale(0.65); }
        100% { transform: scale(0.5); }
    }

    `, 'Appstyle');
};

