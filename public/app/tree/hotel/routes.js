// TODO route to nodejs/pushpull

/*
 * TODO
 *          something like this can be used to hadle routes for treehut pages/images/etc,
 *          instead of express in nodejs.
 *          that way not having to rely on 3d party dependencies (and possible attack vectors)
 */
//
//
//      >    create OO api that responds to stuff
//const ooServer = OO(null, null, null, {globalProps: {ß}}); // TODO verify that it is headless now... if issues, use globalProps
//ooServer.context.history = (function() {
//    return {
//         onpopstate: () => {},
//         replaceState: () => {},
//         pushState: () => {},
//         back: () => {}
//     };
//})();
//    const {route, go} = serverRouter(ß);
///    route('/api/1', () => {}, r => {
///        r('/hello', (data) => { console.log('------------------>world', data);
///       }, (r2) => {
///            r2('/mars', (data) => { console.log('------------------>space', data) });
///        });
///
///        r('/la', () => {
///        });
///    });
///    go('/api/1/hello', {message:'in-message'});
///    go('/api/1/hello/mars', {message:'mars-in-message'});
///
///    route('/images/flower.jpg', async (done) => {
///        // note: no message handling here
///        done(flowerjpg.blob someting);
///    });
///
///    route('/api/2/grapevine/getnote/:noteId', async (done, {noteId}, {message}) => {
///        await ß.grapevine.getNoteRetriever().getXXXX
///        done(); // response will be pused at a later point (even quota error will arrive later)
///    });
///
///    route('/api/2/canopy/getnote', () => {
///        // TODO verify that client has credentials to access endpoint
///        //      otherwise foreign nodes could exploit this
///        //      public facing nodes are exploitable by this anyway, so some kinf of throttling is needed
///        return isGoodCredentials ? true : false; // will prevent further processing
///    }, r => {
///        r('/note/:noteId', (done, {noteId}) => { 
///            const data = ß.canopy.getNote(noteId);
///            done(data); // emmidiate reponse
///        }, (r2) => {
///            r2('/mars', (data) => { console.log('------------------>space', data) });
///        });
///
///        r('/la', () => {
///        });
///    });
//function serverRouter(ß, parceling) {
//    const
//        {oo, route, go} = OO(null, null, null, {globalProps: {ß}});
//        go = (path, parcel) => {
//            go(path, null, null, {reply, message})
//        };
//
//    oo.context.history = (function() {
//        return {
//             onpopstate: () => {},
//             replaceState: () => {},
//             pushState: () => {},
//             back: () => {}
//         };
//    })();
//
//    parceling.on((parcel, done) => {
//        const {path, message} = parcel;
//        go(path, null, {message}, done);
//    });
//
//    return {
//        route,
//        go
//    };
//}

