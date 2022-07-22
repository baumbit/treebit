const //dev
    DELAY_MESSAGE_DURATION = 2000,
    SHOW_DURATION = 100,
    FADEOUT_DURATION = 0.5;


//const // production
//    SHOW_DURATION = 3000,
//    DELAY_MESSAGE_DURATION = 2000,
//    FADEOUT_DURATION = 1;

import {Logo} from '../logo.js';
import {infoToast} from './tugs.js';

export function Splash({oo}) {
    oo.css(`
    Splash {
        display: block;
        width: 100%;
        height: 100%;
        position: absolute;
        transition: ${FADEOUT_DURATION}s linear;
        opacity: 1;
    }

    @media (max-height: 2000px) {
        Splash {
            margin-top: 20px;
        }
    }

    /*@media (min-height: 201px) {
        Splash {
            margin-top: 80px;
            background-color: #ff0000;
        }
    }*/

    `);

    const
        onDone = oo.xx('onDone');

    oo(Logo);
    oo('center')('span', 'Treehut').style({fontSize: '80px'});

    oo.timer(SHOW_DURATION, () => {
        oo.classList({add:'fadeOut'});
        oo.timer(FADEOUT_DURATION * 1000, () => {
            onDone();
            oo.destroy();
        });
    });

    oo.timer(DELAY_MESSAGE_DURATION, () => {
        infoToast(oo, 'Welcome');
    });

    oo.onclick(() => {
        onDone();
        oo.destroy();
    });
};

