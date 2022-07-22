import {generateSignerAndPrivAsync, generateNoteAsync} from './crypto-tree.js';
import {eachAsync} from '../oo/utils.js';

export function createTutorial(ß) {

    let signer; // a unique signer of tutorial. never saved to storage.

    async function getSignerAsync() {
        if(!signer) signer = await generateSignerAndPrivAsync();
        return signer;
    }

    async function createNoteAsync(text, parentId) {
        const parent = await ß.canopy.getNoteAsync(parentId);
        let prev, lvl;
        if(parent) {                                                            //console.log(parent);
            prev = parent.note.noteId;
            lvl = parent.note.data.lvl + 1;
        }
        const {signer, priv} = await getSignerAsync();
        const {pub} = signer.data;
        const signerId = signer.signerId;
        const signedNote = await generateNoteAsync({text, priv, signerId, pub, prev, lvl}).catch(console.error);
        await ß.canopy.addNoteAsync(signedNote, 'top', undefined, 1).catch(console.error);
        return signedNote.noteId;
    };

    async function createNotesAsync(arr, parentId) {
        await eachAsync(arr.reverse(), async (textOrArr) => {                    //console.log(text);
            if(typeof textOrArr === 'object') {
                await createNotesAsync(textOrArr, parentId);
            } else {
                parentId = await createNoteAsync(textOrArr, parentId);
            }
        });
        return parentId;
    }

    async function createWelcomeAsync() {
        // TODO
        //await createNotesAsync([
        //    'An orphan note, is a message which is a reply to a message which have not yet been downloaded to your app. This message is such an Orphan note. Click the Feeds button in the navigation bar and select Orphans and you will see it listed there.'
        //], '1');

        await createNotesAsync([
            ['A new Note (message) that is not a reply, is called a Root. When people post replies to it, the conversation notees out into something that looks like a Tree.', 'To browse the whole conversation Tree you need to scroll horizontally.'],
            ['Do you see any small circle shaped icons with numbers in them? If so try swiping the screen horizontally or click on the number. If no, then just keep on reading. Hint: the first time you read this, there are no circle shaped icons!'],
            'Click -- HERE -- to discover what a conversation Tree looks like!'
        ]);

        await createNotesAsync([
            'Welcome to Treehut',
            'This app connects you to a social network called Treebit.',
            'You can read, write and reply to messages (a message is called a Note here).',
            'This page is the home screen, displaying the Latest posted Notees (messages). Now try to scroll vertically...',
            '...and look, now you can read more Notees!'
        ]);
    }

    return {
        createWelcomeAsync
    };
};

