    /*
        tugtag - v0.0.1

        Purpose of this file is to make typing easier,
        this is achieved by storing stuff in global space.
    */

const B = 'b';
const Div = 'div';
const H1 = 'H1';
const H2 = 'H2';
const H3 = 'H3';
const Span = 'span';

const Text = (oo, props={}) => {
    const o = oo('span');
    oo.x('value', s => o.text(s));
};

