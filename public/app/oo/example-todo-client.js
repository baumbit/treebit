/**
 * This ToDo example is packaging 2 different examples,
 * a simple client side and a client server example.
 * the purpose of using the same code to demonstrate two
 * different use-cases, is to show how small the difference
 * is between the two. there is nearly no difference between
 * using data stored only localy and data that is awalys synced
 * with server.
 */
import OO from './oo.js';

export function createClient(ooptions) {
    const store = {show: {value:'All'}}; // default store data
    OO('app' /* body id */,store, undefined, ooptions)(App);
}

function App({oo, $, setresAsync}, {log, isServer}) {
    // add input field and button,
    // the name of the task will be used
    // as indentifier in the store,
    // for the particular task and related data.
    const input = oo('input');
    oo('button', 'Add Todo').onclick(() => {
        const text = input.elm.value;
        if(text) {
            log('add', text); // log is user-defined global prop in OO.
            const args = ['todos/'+text, {text, active:true}, true];
            if(setresAsync) {
                log('client-server example');
                setresAsync(...args);
            } else {
                log('simple example');
                $.set(...args);
            }
            input.elm.value = '';
        }
    });
    oo('br');

    // observe mutations on all paths that should result in redrawing of task list
    oo('div').on('$todos $show/: $todos/:', 'ul', true, (values, o) => {
        const todos = values[0];
        const show = $('show/value');
        todos.each(todo => {
            if(show === 'All' || (todo.active && show === 'Active') || (!todo.active && show === 'Completed')) {
                const path = 'todos/' + todo.text;
                o('li')(Task, {path});
            }
        });
    });
    oo('br');
    oo('span', 'Show:');
    oo(Knob, {value:'All'});
    oo(Knob, {value:'Active'});
    oo(Knob, {value:'Completed'});

    if(setresAsync) {
        // client-server example
        // this will fetch a hardcoded todo from server.
        oo('span').res('todos/first', true);
    }
}

// this is called a "Tug",
// and is a function which name,
// will appear as a tag in the HTML
// when viewing page source.
function Knob(oo, {value}) {
    oo('button', value)
        .on('show/value', (v, {elm}) => {
            if(v === value) elm.disabled = true;
            else elm.disabled = false;
        })
        .onclick(() => {
            oo.$.set('show/value', value /* write this value to store and notify .on observers */, true);
        });
}

function Task({oo, $, set, setresAsync}, {path, log}) {
    // the data inside the object stored at the path,
    // may be directly read/write when expliciting pointing
    // out the data field.
    const activePath = path + '/active';
    // .on is used for observing mutations of the data on
    // the path.
    oo('span', '$'+path+'/text').on(activePath, (isActive, o) => {
        // the second argument of the callback is always an instance
        // of the tug which .on is invoked from.
        o.style({textDecoration: isActive ? 'none' : 'line-through'});
    });
    oo('button').on(activePath, (isActive, o) => o.html(isActive ? 'Done' : 'Undo')).onclick(async () => {
        // inverting the value on the specified path,
        // and writing it to store.
        const args = [activePath, !$(path+'/active'), true /* also notify observers of parent path */]; 

        if(setresAsync) {
            // client-server example, using awaitable set resource function
            const result = await setresAsync(...args);
            log('awaited setresAsync finised wih result:', result);
        } else {
            // simple example (note: its the exact same arguments as when using client-server example)
            $.set(...args);
        }

    });
}

