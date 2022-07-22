import {SESSION_CHANGED_EVENT} from '../../../oo/snatch-client.js';

function AddUser({oo}, {snatch}) {
    oo('span', 'Description').oo('input')
        //.on(descPath, (desc, o) => o.elm.value = desc)
        .oninput(({value}) => {
            console.log(value);
        });

}


/////function SignIn({oo}, {snatch}) {
/////    //const unsubscribe = snatch.on(SESSION_CHANGED_EVENT, () => {
/////    //});
/////
/////    oo('button', 'Sign-In').style({color:'#000'}).onclick(async () => {
/////        const userName = prompt('user name:', 'admin');
/////        const password = prompt('password:', 'dragon');
/////        const result = await snatch.signInAsync({userName, password});
/////        console.log(result);
/////    });
/////
/////    //oo.onDestroy(() => {
/////    //    unsubscribe();
/////    //});
/////}
/////
/////function SignOut({oo}, {snatch}) {
/////    //          should listen to snatch and signed in status,
/////    //          on destroy remove listener from it
/////    panel('button', 'Sign-Out').style({color:'#000'}).onclick(async () => {
/////        const result = await snatch.signOutAsync();
/////        console.log(result);
/////    });
/////}

