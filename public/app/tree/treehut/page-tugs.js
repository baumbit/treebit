import {Icon} from './tugs.js';

export function PageHeading({oo, css}, {i, title}) {
    css(`
    PageHeading {
        margin: var(--m);
        display: block;
        color: var(--blackbright);
   }

    PageHeading span {
        margin: var(--m);
        font-variant: small-caps;
        letter-spacing: 2px;
        vertical-align: top;
        font-size: var(--fontxl);
    }
    `);
    oo(Icon, i);
    const span = oo('span', title);
    oo.x([
        function setTitle(s) {
            title = s;
            span.html(title);
        }
    ]);
};

export function PageSection({oo, css}, {text, help}) {
    css(`
    PageSection {
        margin: var(--m);
        margin-top: 20px;
        display: block;
        font-variant: normal;
        font-variant: small-caps;
        letter-spacing: 2px;
        font-size: var(--fontn);
    }

    PageSection Icon.help {
        position: absolute;
        right: 10px;
        color: var(--whitemedium);
    }

    PageSection Icon.help:hover {
        color: var(--whitesun);
    }

    PageSection Div {
        min-height: 20px;
    }

    `);

    const div = oo('div');
    const span = div('span', text);

    if(help) {
        div(Icon, 'help', {md:18}).classList({add:'help'}).onclick(oo.xx('onHelpClicked'));
    }

    oo.x([
        function setText(s) {
            span.html(s);
        }
    ]);
};

export function SectionPanel({oo, css}) {
    css(`
    SectionPanel {
        display: block;
        padding: 10px;
        margin-top: 10px;
        overflow-wrap: break-word;
        border-radius: 7px;
        background-color: var(--whitespace);
        font-variant: normal;
        letter-spacing: normal;
        font-size: 24px;
        font-size: var(--fontn);
    }

    SectionPanel Input {
        width: 100%;
    }

    SectionPanel Icon {
        color: var(--whitemedium);
    }
    `);
};

export function SectionGroup({oo, css}) {
    css(`
    SectionGroup {
        display: block;
        margin-top: 4px;
        min-height: 60px;
    }

    SectionGroup H1 {
        margin-bottom: 4px;
        display: block;
        font-weight: normal;
        font-variant: normal;
        font-variant: small-caps;
        font-size: var(--fontn);
    }

    SectionGroup input {
        width: calc(100% - 10px);
    }

    SectionGroup Span {
        font-weight: normal;
        font-variant: normal;
        font-variant: normal;
        margin-top: 5px;
    }
    `);
};


export function SectionIcon({oo, css}) {
    css(`
    SectionIcon {
        display: block;
        margin-top: 10px;
        text-align: center;
        color: var(--whitemedium);
    }
    `);
};

