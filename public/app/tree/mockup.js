import {CANOPY_UPDATED} from './canopy/canopy.js';
import {generateSignerAndPrivAsync, generateNoteAsync} from './crypto-tree.js';

export async function mockupSigners({ß, log, count=2}) {
    log('Mocking ' + count + ' signers.');
    for(let i = 0; i < 2; i++) {
        let {signer, priv} = await generateSignerAndPrivAsync('mockup-'+1).catch(console.error); //console.log({signer, priv});
        let signerProxy = await ß.cabinet.addSignerAsync(signer).catch(console.error); //console.log({signer, signerProxy});
        let signerId = signerProxy.getSignerId();
        await ß.cabinet.setSignerPrivAsync(signerId, priv);
        if(signerProxy) await ß.cabinet.setDefaultSignerIdAsync(signerId);
    }
};

export function createMockupSentence() {
    const pronouns = ['I','we','he','she','they'], we = pronouns;

    const verbs = ['report','place','lock','kiss','knot','stitch','ask','scribble','kill','thaw','decorate','jam','hand','play','develop','bless','puncture','whistle','influence','battle','terrify','prick','fetch','mend','present','permit','attend','ban','ski','bake','disagree','cross','itch','obey','coil','list','trip','explain','compare','decorate','regret'
,'blush','reign'
,'untidy'], explain = verbs;

    const adjectives = [,'poor','horrible','somber','woozy','hypnotic','curved','rude','sophisticated','regular','gaudy','sedate','wanting','observant','piquant','reminiscent','ill','brown','imminent','eager','drab','common','pointless','lopsided','safe','standing','smelly','unkempt','dirty','furtive','warm','cowardly','instinctive','greedy','able','bitter','shiny','trite','supreme','spiteful','wild','rich','abandoned','cheap','quarrelsome','efficient'], rich = adjectives;

    const adverbs = [,'frankly','justly','judgementally','lazily','abnormally','obnoxiously','vivaciously','kindly','simply','patiently','scarily','bravely','absentmindedly','zestily','again','worriedly','acidly','accidentally','daintily','deftly','painfully','broadly','rather','frenetically','blindly','intently','elsewhere','brightly','noisily','merely','almost','previously','solidly','vaguely'], frankly = adverbs;

    const prepositions = ['at','as','onto','over','for','unlike','toward','plus','anti','below','down','above','upon','under','before','minus','underneath','beneath','following','round','with','concerning','on','against','since','versus','in','amid','near','off','aboar'], unlike = prepositions;

    const nouns = ['playground','chance','berry','spy','nut','tail','leg','friends','play','hospital','slip','dinosaurs','hat','hose','arm','doll','daughter','zoo','lamp','snakes','wool','sun','government','airport','market','division','tax','crowd','texture','door','birds','sack','thread','lace','bite','flag','line','observation','low','bone','store','letters','title','current','selection','team','iron','bird','stamp','head'], birds = nouns;

    const _ = (arr, suffix=' ') => {
        const i = Math.floor(arr.length * Math.random());
        return arr[i] + suffix;
    };

    //let s = _(frankly) + _(we) + _(explain) + _(birds) + _(unlike) + _(rich) + _(birds, '.');
    let s = _(frankly) + _(we) + _(explain) /*+ _(birds) + _(unlike)*/ + _(rich) + _(birds, '.');
    s = s.replace(/^\w/, c => c.toUpperCase());
    return s;
};

export async function mockupForest({ß, µ, countTrees=3, countNotes=3, options={gotoNote:false}}) {
    //console.warn('mockupForest returning without doing work'); return;

    const
       getRandomItem = (items) => {
           const i = Math.floor(items.length * Math.random());
           return items[i];
       };

    const
        signersAndPrivs = {},
        newSignerAsync = async ({add=true}) => {
            const {signer, priv} = await  generateSignerAndPrivAsync();
            //L('createSignerAsync', {signer, priv});
            if(add) await ß.canopy.addSignerAsync(signer);
            signersAndPrivs[signer.signerId] = {signer, priv};
            return signer;
        };
    //L(await newSignerAsync({add:true}), signersAndPrivs);

    const
        notes = {},
        newNoteAsync = async ({text, parentId, signerId, add=true}) => { //L('newNoteAsync', {parentId, signerId});
            const parentNote = notes[parentId];
            let prev, lvl;
            if(parentNote) {
                prev = parentNote.noteId;
                lvl = parentNote.data.lvl + 1;
            }
            const {signer, priv} = signersAndPrivs[signerId];
            const {pub} = signer.data;
            const signedNote = await generateNoteAsync({text, priv, signerId, pub, prev, lvl}).catch(console.error);
            //L({signedNote}, signedNote.noteId);
            if(add) await ß.canopy.addNoteAsync(signedNote, 'top', undefined, 1).catch(console.error);
            notes[signedNote.noteId] = signedNote;
            return signedNote;
        };
    //await (async () => {
    //    const parentNote = await newNoteAsync({text:'foo', signerId: (await newSignerAsync({})).signerId});
    //    const parentId = parentNote.noteId;
    //    const childNote = await newNoteAsync({text:'bar', parentId, signerId: (await newSignerAsync({})).signerId});
    //})();

    const
        tree = [],
        newForestAsync = async (nbrTrees, nbrNotes, add) => {
            for(let i = 1; i <= nbrTrees; i++) {
                let text = `root:${i} placeholder:${!add}`;
                let note = await newNoteAsync({text, signerId: (await newSignerAsync({})).signerId, add});
                if(add) tree.push(note);
                await newBranchAsync(note, nbrNotes, 'first child of ' + text);
            }
        },
        newBranchAsync = async (parent, nbrNotes, text) => { //L({branch});
            for(let i = 1; i < nbrNotes; i++) {
                let parentId = parent.noteId;
                text = text || createMockupSentence();
                let child = await newNoteAsync({text, parentId, signerId: (await newSignerAsync({})).signerId});
                tree.push(child);
                text = false;
                parent = getRandomItem(tree);
            }
        };


    console.log({countTrees, countNotes});
    //await newForestAsync(countTrees, countNotes, true);
    //await newForestAsync(1, 4, true);
    await newForestAsync(1, 100, true);
    //await newForestAsync(1, 2, false);
    //await newForestAsync(2, 20);

    if(options.gotoNote) {
        µ.dev.oo.go(`/note/${getRandomItem(tree).noteId}`);
    }
};
