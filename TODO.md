TODO
hints:
    auto polling: let DEBUG_NBR_OF_RETRIEVERS = 1; 

note: general idea: asking for an infinite of data is not possible
                    hence instead of a retriever asking for that which do not know if it exists,
                    instead the replying peer should figure out what the retrieving node could want the most
                        this also alignes with the incintive structure... give the customer what it wants!
                    the retriving node is always hinting... "this is what i follow, etc"
note: content of a post should be dimmed out until the author profile of that post has been donwliaded
        i.e. also those authors NOT trusted (followed etc) needs to be downloaded to authenticate contetnt
            or put else ... post without 

## Roadmap
Steps
    Proof of Concept
      //    //auto polling
      //    //signers
      //        //add ask network for more data about this, everytime we get this
      //    //notes
      //        //follow: ! (highlight)
      //        //list of notes you are following, so you can unfollow...
      //    signer
      //        // track signers updated 
      //        signers notes list updated....
      //          //add func to signer-retriever for fetching notes belonging to a signer
      //        //  tracked signer notes
      //          //      vi +257 grapevine/signer-retriever.js 
      //            add functions
      //                //signers (when visiting a page)... add this to menu when visiting signer there
      //                //tracked signers... add to dev
      //                //signer notes... when visiting a signer (which is not followed)
      //                //tracked signers notes...
      //                //        create peer post
      //                //        node download all posts
      //                //        node follow signer
      //                //        create peer post
      //                //        node dowload trackked stuff
      //                           //break because adding duplicates does not work?
      //                            //   1. fix adding duplicate
      //                             //       vi +114 canopy/forest.js
      //                           //      2. fix so there are no duplicates... probably twoStep
      //                           //         how to fix this?
      //                       //    add function to dev and    see if call works
      //     //retrieveBestFollowedNotesAsync
      //    //       broken. fix it
      //auto-poll (toggle this on and off in dev panel)
     //         test that it works 
     //profile
     //     //grapevine:
     //    //     (peer proxy should already be available from everywhere) ß.storage. makes sure its contained to node...))
     //     //    //pull name and set description from profile instead
     //     //set description propagation stuff.... the whole listening to grapevine/canopy changes stuff: add profile to this
     //     //    need to fix this otherwise setting profile descritption might not update properly in simshim gui
     //     page:
     //       //design:
     //        // name
     //        //description
     //       //signer
     //       //      //add button
     //       //      list
     //       //         item
     //       //             //paper design
     //      //              //fix update signer description
     //       //              //    fix console.log TODO print outs
     //       //              // show
     //       //              //    pub, not editable
     //       //              //    last signed
     //       //              //    displaying private key, not editable
     //       //              //the name goto signer page
     //       //              //    button set as default
     //add crypto to signer:
    //         //sign signer and note
    //         //local: ensure that creating notes and signers works
    //                //  fix: creawte note then hamburger - signers - signer page - expected; show notes, but nothing is shown
    //                  //    has to do with donwloading notes.....
    //                  //fix: callstack: create note then from tree - signer page - callstack exceeded
    //         //net: ensure that more then one peer and changes notes and signeres works
    //                      add a retrieveSigner to signer-retriever
    //                          //on dev page, add a button that appears when downloading bestnotes, that enables downloading the signer.
    //                              //verify that adding a signer 
    //                                      //works 
    //                                     // and checks the signature
    //                          //add an ondemand retrieveSigner also on the Signer page...
    //         replace sha385 with noteId
    //              //exception when creating two nodes in a row and then downloading 
    //              //noteId should NOT be stored in the data, instead store in in the note
    //              //        mostly to function the same way as signer does, making it easier to understand
    //              //    then let the client itself create the noteId... it have to do it anyway to know its not bad
    //             // local: ensure that creating notes and signers works
    //              //net: ensure that more then one peer and changes notes and signeres works
    //         //fix all TODO errors on init
    //        // make sure all menus works... remove those that dont
    //         //network nodes
    //         //setDescription
    //Profile   "has credentials for client accessing node server, network address, name, priv, pub key, etc"
    //          //refactor User to Cabinet
    //          //    move name and descirption to NodeProfile
    //          create a NodeProfile
    //          crypto when talking between nodes
    //              fix: sync NetworkNodes from peer.... 
    //                      manually adding signer
    //                          // create handshake
    //                          //display peer properly in peer page... right now names etc are missing
    //                          //reflect change in simshim gui with proper peer names etc
    //                          //networkNode page fix: "error adding as peer TODO handle" 
    //                      //refactor how messages work
    //                          //refactor treehutmessage to grapevinemessage
    //                             //fix ping
    //                      //turn handshake message into an envelope?
    //                      //    id mismatch.... this is strange because it SHOULD match.... 
    //                      //        add Peer and see crash log
    //                      //fix: grapevine.addMessage
    //                      //profile
    //                         //update profile on treehut profile page 
    //                              //simshim should also be updated
    //                              //    add PROFILE_UPDATED to reosurce-api
    //                              //peers should be updated
    //                              //refactor grapevine notify to on-notify.js... but move that one to utils
    //                      //simshim auto add peer after a timeout
    //                      when everything runs, refactor reurce paths from r('profile/name' to peer/profile/name
    //                          // resource.oo
    //                          //    impl sendResource 
    //                          //        impl in treehut network-node... addPeer
    //                         //auto add peer in simshim proper way
    //                         remove peer in simshim does not work... 
    //                                 //add destroy to ALL stores related to a peer (copy the way to do it from tracked -notes)
    //                                 add remove peer also on peer page
    //                                          //when removing peer, add as network node (do not do this from simshim however)
    //                                          //    create an option for this in the destoy function
    //                                          //"required (at least for) for simshim"
    //                                     //create Undo button for this... a timer that can be aborted before sending the request to ser
    //                                     //create POST;GET;DELETE;etc... 
    //                                     //     first do it in the resource request,
    //                                     // then do it in the framework.... if possible
    //                                 add destroy treehut which should wipe all stores on both server and client
    //                                      //fix: drop peer from peer page - expected simshim node to show peer 
    //                                      //fix: re-adding peer after drop - expeted PING to work
    //                                      //update test-2 
    //                                      //    shake should remove that which have no listeners
    //                                      //    drop should remove everything even if there are listners
    //                                      //refactor drop to ignoreListeners (default in resourceClient is to ignore listeners)
    //                                      //remove peer also from peers list in store when dropping
    //                          //fix devPage retrivePeeres
    //                          //change in resource and in treehut
    //                          //make sure it works to:
    //                              //changing description in simshim
    //                              //add / remove peer (should appear as network node when doing so)
    //                      //peer profile page should have some more data
    //                      //make retrieve peer note works again
    //re-create auto-create forest for dev purposes
       //install new computer
       //     set users and password
       //     install nodejs
       //     figure out backup...... in the future always work with github preferably using TOR... 
       //         probably backup against tower...
       //app
        //     //create nodejs wrapper for 1 to N nbr of nodes...
        //     //       //      //serve a webpage
        //     //       //      //turn OO into module along with the plugins...
        //     //       //      //       make sure simshim works
        //     //       //      //       make sure examples and tests works
        //     //       //      add OO router to server.js
        //     //       //         try to make client server work with the begining of a simply OO HOTEL app
        //     //       //                server render OO
        //     //       //                     //attach Virtual... to context. to save mem
        //     //       //              //how to catch errors when OO misses stufff.......
        //     //       // //OO attached in browser with value using scripts
        //     //       //        //html "r/0" is replaced with "r"... this should not happen.
        //     //       //        //make sure onclick works, because that should mean everything is attached well
        //     //       // impl webhotel
        //     //              //create script to launch-hotel-dev
        //     //                          //to wrap oo nodejs watch thing for loading hotel/server
        //     //                  //create templpate app example
        //     //                   //         //create an oo.context.attachToBrowser();
        //     //                   //         //                move the route code and stuff into OO
        //     //                   //         //        and do this inside wait for promises client side.
        //     //                   //         //add resource
        //     //                   //             //why is store not updatting??!?!
        //     //                   //             // how to send data using fetch to server
        //     //                   //             //how to receive data on server from fetch and give to router
        //     //                   //             //if router does not parse route... how to generate a NotFound
        //     //                   //         //add DOCtype thing
        //     //                   //          //   first: how to do this on browser side?
        //     //                   //          //   then: pretty easy on sercerside
        //     //                   //  start impl webtreehut to understand how routing / messaing stuff works
        //     //                   //         node should have /node/:nodeId route....
        //     //                   //              //reload first time is an issue...
        //     //                   //              //    what to use?
        //     //                   //              //issues is that router uses pathname... 
        //     //                   //              //        instead use relativeUrl
        //     //                   //              //make sure OO optiosn baseUrl in nodejs and client is the exakt same
        //     //                   //          //make sure following works with changes in router etc
        //     //                   //                     //refresh page1 in hotel
        //     //                   //                     //refresh page2 in hotel
        //     //                   //                     //resource in hotel
        //     //                   //                     //page2 refresh
        //     //                   //                     //page2/ refresh and load
        //     //                   //         //port resource-api on server
        //     //                   //                     //searchParams....
        //     //                   //          ensure examples and simshim still works
        //     //                   //                      right in the middle of getting resource stuff to work in simshim
        //     //                   //                                     simshim have a resourceCLient and so does the hotel
        //     //                   //                      //   need to amke grapevine etc available too in the shim
        //     //                       //     resource should work in
        //     //                       //             //preferably defaultRoute NOT exrra stuff
        //     //                       //             //        webapp example should also work
        //     //                       //             //        //simshim
        //     //                       //             //     need to set baseUrl i think???
        //     //                       //             hotel
        //     //                       //                 WITHOUTH resource-client
        //     //                       //           &&fix destroy kills $ on root path.... check exmepla-webapp
        //     //                       //                     //create Treehut server side and make it work
        //     //                       //                    //             fix crypto on nodejs
        //     //                       //                     //                add window to nodejs... think i got itt
        //     //                       //                     //                                now boat and that stuff....
        //     //                       //                 //then create Treehut client side and make it work with server
        //     //                       //                         // run hotel and fix issues that comes up
        //     //                       //                                 //consolidate the ß things and possible the µ
        //     //                       //                                   //to the same file... to make it easier to mainain
        //     //                       //                                  //       make sure nodeId to identify node
        //     //                       //                                  //        how to get the address???
        //     //                       //                                  //        where to store the address???
        //     //                       //             //make server-side rendering work
        //     //                       //               // bad URL in client     
        //     //                       //             //then impl resource-client so it works in hotel....
        //     //                       //                     //for nodejs
        //     //                       //                     //        figure out what is difference between setting up routes
        //     //                       //                     //        and creating clients... there is a difference, BECAUSE
        //     //                       //                     //        there might be many different nodes using 
        //     //                       //                     //        also, routes can be directly quested.....
        //     //                       //                    //    api requests does not work
        //     //                       //                     //         http://localhost:9002/node/123/api/res/topmost/signers
        //     //                       //                     //            does not work            
        //     //                       //                     //make client-sider rendering work
        //     //                        //  now it should be possible to create many nodes on hotel and list them
        //     //                        //           //render hotel
        //     //                        //          simple hotel app
        //     //                        //                 create api
        //     //                        //                    client render monitor report
        //     //                        //                        //create report as a data object
        //     //                        //                          //          add the arr.length, added, remove etc to a report object
        //     //                        //                          //          render to terminal nice (with tabs etc)
        //     //                        //                          //          render as HTML nice (but to this in client)
        //     //                        //               create
        //     //                        //                    //getOrCreate is done in webtreehut server
        //     //                        //                    //               add: commmit = addToMemory()
        //     //                        //                    //                        only when not reading from permanent
        //     //                        //                    //                    add rmove allsp
        //     //                        //                    //                setup server stuff is typical webtreehut stuff...
        //     //                        //                    //                but creating the instance is hotel stuff
        //     //                        //                    //                and storng is manager
        //     //                        //                    //        webTreehutServer should probably be moved to as a func
        //     //                        //                    make hut runnable from server
        //     //                        //                            //fix layout
        //     //                        //                          //open stored instance
        //     //                        //                        //  press GUI buttons
        //     //                        //                          //          first fix in simshim
        //     //                        //                          //          then make sure it works on hotel
        //     //                        //                           //        show under instances
        //     //                        //                           //            Active: true, Stored: false
        //     //                        //                           //            Treehuts: 23, Timeouts: 546, Intervals: 34
        //     //                        //                           //            Promises not done yet
        //     //                        //                          //  render scroll 
        //     //                        //                          //  disabled server rendering
        //     //                        //                  //enabled server rendering
        //     //                        //                   //        //add to config
        //     //                        //                   //        graceful of errors related to screen.
        //     //                        //                 //get tries to get from lufo first, then permanent
        //     //                        //                  //      if not found THROW ERROR... webtreehut should not be able to c
        //     //                        //                  //              "hotel should create totally new"
        //     //                        //                  //          hence probably the manager should create huts...
        //     //                        //                  //                  hence probably client stuff should also be mov
        //     //                        //   connect to nodes on the hotel
        //     //                        //      //fix simshim: make it possible to retrieve peers and notes etc
        //     //                        //      //                      //network nodes and
        //     //                        //      //                      //get peers from Dev panel
        //     //                        //      //                      //fix the log stuff that break stuff
        //     //                        //      //                      //retrieveScoresAsync, retrieveBestNotesAsync
        //     //                        //      //  node should ask hotel for the list and hotel API should provide it
        //     //                        //          //treehut/hotel-network-nodes.js
        //     //                        //            //            list nodes.... 
        //     //                        //            //            try to re-use node page from network nodes
        //     //                        //            //   how to separate between peers, peers AND hotel peers
        //     //                        //            //            maybe a new menu item:
        //     //                        //            //                    Network nodes
        //     //                        //            //                            "add explination what this is in item header"
        //     //                        //            //              ? do i have that already? create some sort of paging mechanism?
        //     //                        //            //                  Hotel nodes
        //     //                        //            //                            "add explination what this is in item header"
        //     //                        //            //                        create some sort of paging mechanism
        //     //                        //            //     add the hotel concept to simshim
        //     //                        //        //sync message and stuff should work
        //     //                        //         //           crewate messenger in hotel
        //     //                        //         //           reactor simshim/treehut-client to simshim/treehut-client-shim.js
        //     //                        //         //           make sure still  work in simshim
        //     //                          //clean-up error handling when messaging
        //     //                          //          //addMessage
        //     //                          //          //fix app destroy etc in hotel/manager
        //     //                          //          addPeer in resource-api should work... (do no wait for it to complete
        //     //                          //fix a treehut that is destroyed, my still operate because of timers etc
        //     //                          //          how to make sure it is destroyed for real?!
        //     //                          //          grapevine.addMessageFinish use a setTimeout
        //     //                          //              it should use something in B... so we can now 
        //     //permanent storage
        //     //        steps:
        //     //                //impl a peristent database
        //     //               //create permanent db storage for hotel
        //     //                    // archive.sh should not include it...
        //     //                    //permanent storage path in storage.js
        //     //                    //    try to create a simple DB in nodejs
        //     //               refactor everything store dependent into async
        //     //                         //run the two stores in parrallell
        //     //                        figure out how to create a sorted bucketdb thing where least used should be deleted....
        //     //                                  //  possibly use a lufo for this?
        //     //                                  //      there is a localstorage based one for this?!
        //     //                                  //      how would these items be cached in the bucketdb list?!
        //     //                                  //      should the list itself be stored in a bucketdb?
        //     //                                  //          probably not...
        //     //                                  //turn lufo into async.
        //     //                                  //run tests to make sure it works
        //     //                                  //  create timer and compare with non-async and create sed based stripper if needed
        //     //                                 //in buckettreedb.js
        //     //                                    //createBucketTreeDbLufo to use a storageLufo..
        //     //                                    //then createCachedStorageLufoAsync, look at LocalStorage example
        //     //                                    //earach what it is the best existing use of itterors to use
        //     //                                    //    what is the difference and which to preserve=?
        //     //                                    //      ? each
        //     //                                    //     ?  step
        //     //                                    //select best itterator to impl in cachedbucekt db thing    bucketdb interface
        //     //                                    //impl the itterator in bucketdb and expose it to storage.js
        //     //                        create test for each, step and twoStep
        //     //                                //lufo
        //     //                                //        twoStep lufo
        //     //                                //        enable all tests for lcaol etc
        //     //                               // cached bucketree lufo
        //     //                                //   use lufo as template, but change it
        //     //                make sure storage.stopAll is invoked when browser window is closed or nodejs is terminated
        //     //                        //utils.j should have a function that can be invoked to listen to shutdowns
        //     //                        //        //storage.js should make use of this function
        //     //                        //        //    and run stop on all its stores
        //     //                        //        //browser
        //     //                        //        //       //in simshim destroy all on exit
        //     //                        //        //       //fix bugs
        //     //                        //        //       // make sure it works with a few simple a.js and in browese
        //     //                        //        //       //     "try to reload page but dont... now you can debug"
        //     //                        //                //impl
        //     //                        //             //add a STATE{success:true} file to bucketdb on "stop" so that
        //     //                        //             //       simple file save in same folder
        //     //                        //             //           creawte test case for creating and re-opening same db
        //     //                        //             //                       test-bucket that uses file...
        //     //                        //             //                                   test fails on restart
        //     //                        //             //                       test memory medium
        //     //                        //             //                           for memory fake what happens when SAFU is removed
        //     //                        //             //               create file on stop
        //     //                        //             //               delete file on success reload
        //     //                        //             //               rebuild if required
        //     //                        //             //                   process.exit with a conso.log IMPL rebuild function
        //     //                        //             //                       should be run stand alone in a console NOT part of hotel
        //     //                        //             //   "make sure this works, by also investigating how process.on works."
        //     //                        //             //       create copy of test-bucket in tree/ and use utils.js to listen to quit,
        //     //                        //             //           invoke buckjet stop and use time out to see if there is time to quit it
        //     //                        //             //            may 
        //     //                        //        nodejs
        //     //                        //            process.on shoudl stop all databases
        //     //                        //                //"main problem here is that stack might not  be async
        //     //                        //                // first look into whther process.on can handle async,
        //     //                        //                // if it can then utils.js:onNotify should be asyncified"
        //     //                        //                    add stopBlocking
        //     //                        //                            "use a.js to test feature
        //     //                        //                        write files blocking function
        //     //                        //                        use it to write
        //     //                        //                            buckets
        //     //                        //                            SAFU
        //     //                        //                    make sure test is implemented
        //     //                        //start changing one file after the other to use the new storage.js interface
        //     //                        //            1) test to make sure thing you change alreadu works
        //     //                        //            2) replace with new storage
        //     //                        //                    replace itterators
        //     //                        //            3) test again with the new
        //     //                        //    "search for "
        //     //                        //          crete note, sync note from peer, follow signer,
        //     //                        //          dev menu download followed signer - should works "
        //     //                        //            //cabinet
        //     //                        //            //grapevine.js
        //     //                        //            //canopy/signer-storage.js the interface
        //     //                        //            //grapevine/peer-proxy/signer-notes 
        //     //                        //            //    run through all treehut dev menu to verify+fix if needed
        //     //                        //            //grapevine/peer-proxy/tracked/billboard.js
        //     //                        //            //grapevine/peer-proxy/note-scores.js
        //     //                        //            //grapevine/peer-proxy/tracked/signers.js 
        //     //                        //            //grapevine/peer-proxy/tracked/notes.js
        //     //                        //            //canopy/...
        //     //                        //            //    //treestorage
        //     //                        //            //   //scoretree
        //     //                        //            //    //forest
        //     //                        //            //    //follow-storage
        //     //                        //run through all treehut dev menu to verify+fix if needed
        //     //                        //           best notes
        //     //                       //add signer-retriver stuff to dev.js
        //     //                       //     add to dev
        //     //                       //     then prefix with ByPeer
        //     //                       //forest uses old notify thing
        //     //                       //     is notify even used by forest?
        //     //                       //     if so, then replace with utils on notify (async can more easily be supported)
        //     //                       //ensure data.arr.forEach is replaced with eachAsync in retriever.js
        //     //                       //make sure all eachAsync signatures operates the same way
        //     //                       //     grep -r 'each' // utils.js should be how it works
        //     //                       //grep -r eachAsync // and verify that everything have an await
        //     //                       //remove old database code
        //     //                       //test everything in the app
        //     //                       // vi +45 mockup.js
        //     //                       //run through all treehut dev menu to verify+fix if needed
        //     //                       //refactor lufo into eachValue - each etc
        //     //                       //     refactor so that lufo funcs get Async suffix
        //     //                       //          the remove the object Async suffixers in storage
        //     //                       //          now user has to know self what type of object is created by storage
        //     //                       //     refactor forEach to each in lufo (nothing else should be using it now)
        //     //                       // make storage more dev friendly
        //     //                       //     //destroy
        //     //                       //     //    note: should not be consolidated
        //     //                       //     create
        //     //                       //         ß.grapevine.getStorageLufoAsync('');
        //     //                       //         peerProxy.getStorageLufoAsync('name');
        //     //                       //         peerProxy.buildetStorageLufo(prefix);
        //     //                       //refactor peer proxy to own file
        //     //                       //   fix broken messages....
        //     //                      // ensure that this kind of stuff is saved as permanent
        //     //                      //        create peerproxy storage
        //     //                      //                 storage for all storages used by peer
        //     //                      //         vi +51 grapevine/peer-proxy/tracked/signers.js
        //     //                      //run through all treehut dev menu to verify+fix if needed
        //     //                      //enabke creawt mockup notes
        //     //                      //    run through all treehut dev menu to verify+fix if needed
        //     // destroy storage for an app in hotel on removal
        //     //        //make sure hotel can start gainst after all the changes
        //     //        //        // create full path bucketdb
        //     //        //        asyncifyn database is confusing
        //     //        //          fix storage.. createLufoBucketAsync
        //     //        //              ensure persistant db also works
        //     //        //  storage.js: add scope cache of Meta in bucket to get rid off meta lookup
        //     //        //bucket: parse json if it was not stringified when submitted
        //     //        //ensure the databases are stored in the node folder
        //     //        //        //ß.storage should be created with the nodeId provided by hotel
        //     //        fix: opening a node from hotel page
        //     //            //             re-index error.... from signerStorage
        //     //            hotel app life cycle
        //     //                //bucketdb stores type of whats added and retusn that which is added
        //     //                //  check if sleep/awake results in database not being able to close
        //     //                //            create crash by pressing
        //     //                //                            1 close server button in hotel
        //     //                //                            2 crash button in hotel
        //     //                //                investitagte if all storages clears as they should
        //     //                //fix: reload app on save.... fix re-indexing stuff
        //     //                //        verify that if NO error, reload works
        //     //                //        if error, then re-start with wiping runttime storage on reload
        //     //                //sleep,
        //     //                //awake
        //     //                //destroy
        //     //                //    ensure everything with storage gets desstroued when deleting a node
        //     //                //    verify that folder is empty (before also the node folder is deleted)
        //     //                //          canopy/signer-storage.js    add destroyAsync 
        //     //                //          ...what more?
        //     //                //fix: create new app, destroy all - error
        //     //opening hotel should load last session using hotel config data
        //     //    save automatically on start (TODO comment in termninal)
        //     //    add button to clear storage folder on hotel page
        //     //shorten internal node id... can use hotel node Id
        //     //ensure hotel and simshim both works
        //     //        probably has to do with localId or something like that.....
        //login
        //        //double cookie pattern for login
        //        //    //server-side
        //        //    //cookie expiration
        //        //    //client-side: login-oo (read cookie and set header)...
        //        //    //   login-oo
        //        //csurf protection (resourece-oo)
        //        //       cookie expiration
        //        //       server
        //        //       client
        //        // secure cookie attribute to ensure session id exchanged only through encrypted channel
        //        //HttpOnly cookie attribute
        //        //SameSite attribute
        //        //integrate with the client making the requests.... ie. NOT resource-oo
        //        //            //figure out if it is the messegner... or something else....  <--- probably is... how to integrate this??!!
        //        //            //all users of hotel use the same hotel....
        //        //          //when hotel request is made, figure out what user is it and load that session, this session should then be fed
        //        //          //              to the sessionHandler
        //        //        impl TODO stuff
        //        //          add user / passowrd to hotel gui.
        //        //add login GUI stuff to hotel
        //        //  make very simple and ugly GUI
        //        //        //  create account
        //        //        //        onevent focus out,,,, fix in cabinet... probably make oninputed or something like that
        //        //        //        then imple Sigin in hotel
        //        //        //sign in
        //        //        //sign out
        //        //        //listen to changes
        //        //        //make simply GUI that works with hotel
        //        //        //list and delete existing users
        //        //        //enable/disable create new users (META_UPDATE_PATH)
        //        //        //           creawte checkboxes...
        //        //        /fix session not deleted on signout
        //        //        ///    delete cookie
        //        //        //update password (input)
        //        //        //    use updateUser
        //        //        /verify: refactor seppuku 
        //        //        //and set password gor a user
        //        //        //make sure only admin can log in and create new users... should be of no users at all has been added, then first user i
        //        //        //set admin privledge for a user
        //        //        // add cookie HTTP ONLY etc
        //        //        //sessionId expiration etc
        //        //        //refresh session
        //        //tie a session to manager for webtreehut
        //        //        //add domain prop to users
        //        //        //fix sign-out console error
        //        //        //        oninputed (domains) will catch exit and output something... trace and fix
        //        //        //fix domain split of values
        //        //        //clear domain should wok
        //        //        //only admins should be allowed in hotel mananager
        //        //        //        in hotel.js specify which domains are OK to continue to be routed
        //        //        //        ensure that created users can not access manager by trying to sign them int
        //        //        //hotel REFACTOR in client-side: isReadWriteAccess...
        //        //        //    should only render the SignIn if proper domain and stuff,
        //        //        //        return isDomain instead of ReadWrite and attach session (but lets call it priveledge)
        //        //        //            and attach it tp the µ and make it so that client renders only that which it should be able to render
        //        //        //            isDomain is probably wrong... probably set domain it havve access to or something like that.
        //        //        // make manager node sessions use snatch sessions (users should _never_ be admin, i.e. there is no webterhut user admin)
        //        //        //fix: create many nodes
        //        //        //fix: create, destoy, create new with same user name again
        //        add santch sessonH to webtreehut, add allowed domain
        //            //create dedicated sign-in / create (results in new user AND new app) page (prefilled, with dbg1 user)
        //            //            redirect goes to hotel/sign-in  (ie. NOT the /nodeID/page)
        //            //         add url to treehut stage
        //            //            copy sign-in from manager
        //            //        make sign.in of existing work
        //            //        then add new user
        //            //fix broken node API url (double /api)
        //            //add session to server-side page router, so it can render proper page if no access
        //            //    on server...
        //            //        //if no user, redirect to (redirect code) to signin page (somehow send the target path somehow, to be forwarded on sign
        //            //        if user, but read access only.
        //            //       //             if ReadAccess but no WriteAccess
        //            //        //    then its possible to sign-in the user on server AND since session is already created, WriteAccess will be de
        //            //        //    santch-session.refreshSessionAsync
        //            //        //        creawte the SESSION_REFRESH_PATH- sessionRefresh access using API and the refreshSession direct access
        //            //        //                        BUT what kind of params?!
        //            //       clean-up.. move code and comments
        //            //    on client...
        //            //        add sign-out. if clicking sign-out, manually go to signin page. add page to stage.
        //            //verify treehut in simshim works
        //            //verify webtrehut works
        //            //clean-up webtrehut req handling with tools from snatch... just like dashboard
        //            //make sure treehut works in simshim
        //        //remove preporcessoer in tree/resource-api.js
        //        //webtreehut
        //        // harden: when everything works, try to break it by submitting bad data that makes crypto functions crash etc (also bad secret)
        //        //     libs:
        //        //         // signin with salt
        //        //         working on both veriyfing sessionID    AND    xoring it with a CSRF token that is generated everytime
        //        //            is is possibl to do this??? 
        //        //                 idea right now: server generate a salt, sends it to client through headers,
        //        //                 (session id is once when sent back on logig)
        //        //                 any salt (with variable length) should be possible to use?
        //        //                     if ????????????
        //        //         when submitting login on signin, send password in a POST request
        //        //     creawte login flow
        //        //         dialog
        //        //         add the login checks to router
        //        // @see other computer notes
        //        //                 https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/security/SecureRandom.html
        //        //                     //user send username and pwd to server
        //        //                     //hash pwd + freshly generated salt, and store hash and salt
        //        //                     //on next login, user send pwd and server checks of the
        //        //                     //              stored salt and the recieved pwd, when hashed, matches the stored hash
        //        //                     //    new salt for every credentials stored/updated
        //        //                 be aware that Basic Authentication sessions are also vulnerable to CSRF attacks.
        //        //                         //use custom headers (they are not sent from other websites)
        //        //                         store csrf on server.. do not use coolie
        //        //                         breach
        //        //                             random length in response
        //        //                             XOR the crsf token on server with a salt and send the salted token plus the mask to the cli
        //        //                             client unmask the token and send it back to the server
        //        //                             the server checks if the unmasked token matches the unmasked stored on server
        //        //                             communicate using the customer header
        //        //                                         how to make sure you can many requests at the same time?
        //        //                                                easiets is just to retry the request
        //        //                 https://owasp.org/www-community/attacks/
        //        //                             1.
        //        //                                 auth
        //        //                                     instead of salting and doing stuff use WebAuthn
        //        //                                     https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API
        //        //                                             https://github.com/duo-labs/webauthn.io
        //        //                                         //does this protect against XSS or csrf?
        //        //                                         //                answer: no
        //        //                                         is it possible to use password as source of entropy or is auth device needed?
        //        //                              2. csrf protection
        //        //                                 first set http-cookie on server protects against XSS
        //        //                                         secure permsission strict 
        //        //                                 secondarily crete csrf token on server, download by client and resource-oo 
        //        //                                           then sets this in all headers manuallt
        //        //                              3. save all tokens in sessionStorage, so page can be reloaded
        //        //                              4. think about whether its possible to open same session in more tabs
        //        //                                     using session storage and some sort of refresh token etc...
        //        //                              5. save re-login token in local storage, to preserve login after
        //        //                                                   browser closed (opens up for XSS)
        //        //                             on server
        //        //                                 store credentials in hotel/apps[shotId] { permanent: login: {}...
        //        //                                 save encrypted to harddisk...
        //        //                                       when starting hotel, require auth to open up all node credentials etc...
        //        //                             login to hotel
        //        //                             login to webtreehut
        //simplify dev login to a node
        //    check if user exists, if not create it
        //    when user exists, login user and open dbg1 node
        //treehuts should be able to talk
        //    //between 2 huts in simshim
        //    //between 2 huts on different hotels (same machine, different browsers)
        //    //   //add connect page
        //    //   connect to peer
        //    //       ß.messenger: study URL and make rquest to it
        //    //between 2 huts on same hotel
        //    //    //using two different browers on same machine
        //    //    //    preferably they should communicate internally to be optimized
        //    //    //setup machine
        //    //    //          //setyp ssh keys
        //    //    //          //harden device script
        //    //    //          //install nodejs
        //    //    //          //update all
        //    //    //          //create setup script for treepi (copy existing)
        //    //    //          //    copy files (the whole folder... use existing script) to target script
        //    //    //          //  copy sdcard image
        //    //    //          //  save to folder setup-forest
        //    //    //          try tree t in chrome on pi
        //    //    //on the same machine: separate by using 2 different ports
        //    //    //          read nodeArgs (in server) and put them into the CONST
        //add tor
        //    //add tor
        //    //listen to tor in tree server
        //    // create automatizatio scripts
        //    //    install tor on machine script
        //    //    figure out how to make tree server know about tor identifier (and show it)
        //    //create socket listening to Tor and relay the data
        //    //DoD: on different machine: laptop + raspberry pi
        //    // fix two nodes communicating on same hotel: isSameHotel
        //    //two nodes communicating on separate hotels
        //     //sanitize stuff in OO html rendering
        //ensure
        //    //two hotels two nodes works
        //   fix: one hotel two nodes works... bad URL in peer page
        //persistence: ensure peerproxies get saved to database
        //   //refactor signatures... figure out different between getProxy and getPeerProxy. etc
        //   re-load profiles (peer persist after re-save asd)
        //url - nrl  (node resource locator) 
        //        //add transport to all peer retrieval stuff... replier, peerManager messages creawtions etc
        //        //when it works, change from transport to protocol
        //       //fix simshim
        //       // change url to nrl in dashboard and manager
        //        add protocol toggle to treehut
        polish features
            improve TreenetPages
                //Node profile
                //        //make page scrollable list
                //        // move modal text outside pagesection thing..
                //        //    create a Help tug that can be appended to
                //        //rest of data
                //        //probably turn it into a scrollable thing with only one div to scroll
                //        //probably turn all of this into a "Page"
                //        //  add share dialo
                //remove priv/pub key from grapevine node profile... use encryp devrypt messages instead
                peers list
                   //Icon in black just as the node
                   //list of peers... details if they are online or not, etc
                   //finish first draft on peer item list... add
                   //         toggle sharing
                   //         pinned
                   //             green and if pinned, otherwise gray
                   //         score should say Math.random()
                   //move uploadmanager and stuff:  vi +158 grapevine/network.js to peerproxy
                   //         connect to toggle on peer list page (this way it could also be tested that it works)
                   //     the upload manager timer and stuff should also be part of peer proxy: settin?profile?
                   //         and viewable in client peer information and node profile
                //peer
                //   //gui mockup
                //   //computer icon in top corner
                //   //name and stuff section
                //   // sections
                //node-profile
                //   //add toggle on/off upload manager
                //   //set duration
                //   // restart upload manager when preferences updated
                //connect
                //   //add
                //   //blocking: hotel list
                //   // hotel peer node page
                //   // goto peer when added
                //   //toast
                //   // fade connect button to gray as long as it is polling
                //   //when tracking stopped, see if peer was added anyway b
                //unconnect
                //    ////topbar:
                //    //        //hotel and the world (i.e. disconnected)
                //    //        //page title below topbar... offfset it a little using values from somewhere or something.
                //    //hotel
                //    //    ////blocked by: hotel server not woring and simshim not providing list of nodes
                //    //    //         //fix "hotel server not woring" gso that hotel works
                //    //    //            //        fix dashboard: looks like HTML is escaped!!! remove that!!!
                //    //    //            //make sure unconnected hotel now works
                //    //    //             //fix hotel list
                //    //    //            //    style item.
                //    //    //            //    buttons: connect (tor and onion), information
                //    clearneA
                //    oniont
                //ensure save node information and make sure it gets broadcasted
                //unconnected nodes
                //delet nodes pages not used
                //add new node the (bar plus icon)
                //refactor poll for peers to res api own end point
                //         vi +169 resource-api.js
                //        create a header on global stuff that has a button "asks all your peers for new peer"
            //fix
            //    changing node profile friendly data doesnt reverests to old when going back to page after upload
            //            destroy all pages and make them reload when navigating... no fade
            cabinet signers
                //impl CabinetSigner
                //    public profile (mutable data)
                //    identity (immutalbe).. including last updated
                //        copy from node profile
                //make it possible to start with no signers
                //vi +9 mockup.js
                //replace SavePliugner with SavePliugner2 and update node_profile
                //impl add signer
                //impl selected signer not included in list
            compose: @blocked by how signers works
               // create new
               //     //display signer name default signer
               //     //open cabinet so other can be selected
               //     //add save plunger
               ////      cache note. gui/compose/draft/create | <noteParentId>
               // //reply to
               // //make page nice
            //in tree view improve look-n-feel of card
           improve dashboard
                //impl feed manager
                //    //update lufo.js each with a reverse=true
                //    //    goes upwards in list
                //    //    when scrolling ask for head when going to page first time, if no key provided
                //    //    then when scrolling up/down, take the direction and ask for items reverse=false and reverse=true,
                //    //    then add those in the internal temporary storage saved in the Tug.
                //    //    only store references in feed, that way not as important to cache the feed.
                //    //    res/feed/latest?key=<k>&reverse=<true is prev | false is next>&limit=<number items to aggregate>
                //    //    when data is downloaded, add the data to the internal temporary list (hash and linkedlist combo) used for scrolling
                //    //add items to feeds
                //        // probably an observer pattern, listening to what happens in the app and add items progressively
                //        //      note, should only store references and NOT clone data
                //        //      this also solves the "cachings pages does not cache items" problem in store, because separate items will be cached
                //    //ensure res is saved in cache
                ////when scroll top, bottom, or delayed timer then download
                ////merge downloaded data with temporary existing data
                //// ensure re-set what index is (ask list for top visible item and look for key) and if key not present, scroll to top
                ////card (differnt types): composes all data needed for stuff in GUI (for a note: note and signername to be displayed in gui)
                ////resource-api feed
                ////design
                ////    //probably verticall scrolling only
                ////    tabs
                ////        bar at the top (click or swipe to scroll to next)
                ////            tabs to scroll to other kinds of lists
                ////                ? Home (mix of: latest, replies, visited, following), Replies, Latest, Following, Unread, Random
                ////        Latest
                ////        Following (latest from those you follow)
                ////  once visited, should never change
                ////        populate server-side when queried for next page and save to persistent storage
                //onSizeChanged callback should be items.dirty instead... some sort of listController object passed along
             //list sizeChanged does not work either on Homer or in Signer
             //           // when scrolling the items are re-positoned
             //      home: try with continious checking size when redndering, if that do not work then investitate onSizeChanged
             //      fix signer.js onSizeChanged, set some sort of dirty flag???
             //signer (non cabinet)
             //   //make page look nice!
             //   //information about a signer. links to homepage? api? ln node? etc
             //   // render note cards
             //   // impl signercards
           //fix toast: re-using toast element makes cue behave buggy when displaying many in row
            tree view
                //vertical scroll
                        //fix add note should appear in list
                        //    missing head
                        //    probably scrolling related
                        //        remove UP,DOWN from tree
                        //scroll up/down (probably bounce thing)
                        //if card has parent, show parent also on screen when selecting card
                        //    just start the Y positiuon a little bit down on the screen
                        //fix comment
                        //    //blocked by @tree card design
                //add mouseexit area to send fling (instead of up)
                swipe left/right
                        //impl scrollX in oo.swipe... package in reusable object y:{} x{}, time
                        //scroll.js handle both X and Y from OO.swipe
                        //on first dragX () old school find element and if found element , creawtwe branch point
                        //stop listenint to vertical scroll gandler
                        //figure out left (up) / right (down) direction, hence which branch
                        //    print to console
                        //set branchpoint
                        //    see old code
                        //    load items on new branch
                       //impl animation using scroll.js:ease
                        //        drag item and move visible during dragging
                        //        when _fling_ and _dragged far enough or forcefull enough_ animate to center position.
                        //            lock horizontal and vertical scroll during this centering animation
                      //head.x should be replaced with selectedBinder.x to ensure proper animation
                       //impl right swiping
                        //ensure vertical and horizontal works
                       //    fix: when starting to swipe but before flip (which locks interaction), quickly trying to swipe can create a bug
                        //            quick fix: prevent aborting movement untill it runs to completion
                        //            real fix: how? print stateX and branchPoint to invesitage
                        //fix: if scroll not completed and trying to scorll item above, it locks
                        //        when trying to click an item check if it has the same parent as current select, if not ignore
                        //if dragging, then flip
                        //prevent scrolling x if there is no sibling
                        //    snap
                        // add swipeTo (go with silent) and make sure buttons does a flip
                        //when scrolling to top, page loose knowledge of selected branch path
                        //speedFactorX and Y in scroll and OO.swipe
                       //clicling nav bubblees should jhave same behvaour as dragging.... 
                        //        NoteCard should send itself noteid and direction
            //toast
            //    toast background blocks clikcing send new note
            //add feeds
            //    //latest notes
            //    //latest notes from followed signers
            //    //random notes
            //    //lufo
            //    //     impl lock so that lufo external async options have lock
            //    //            create testcase in lufo.js to create erros
            //    //            impl locks to fix it
            //    //                lock should be dynamically added to functions, so internally they are ciromvented
            //    //    fix: each curr.next is null to early? (discovered when making "surpsei notes" features)
            //    //    fix: null when loading latest feed
            //    //welcome notes (help list)
            //    // followed signers list
            //    //latest tree root
            //    //orphans
            //    //latest not orphans
            //    //highest score notes
            //      add onbubble  and oo.bubble('updated')    (type) ... dirty/onsizechanged/added/removed/content/size to oo.js
            //when adding/removing element, propagate this to all parents.
            //    oo could listen to this and do stuff.... and possibly consume event
            //    oo maybe an object has to be configured to spawn these kinds of events
            //    oo should also be able to invoke this event: manual
            //use this for onresize / content added
        //finishing touch tree.js
        //   //fix: mouse down on item sometimtes genrates flickers items in "background"
        //   //        opacity/visible thing before fixing this (because it might not need fixing then)
        //   //fix: first click in list redraw everything with slightly less y margin
        //   stress test
        //   //refeactor NoteFeed to NoteFull {swipe:false}
        //   //    ensure swipe works
        //   //    delete NoteFull and renoame notefull2 to notefull
        // //when mouse dragging, do not broadcast click events
        //        issue is:
        //            if click icon supress bubble, drag might lock up
        //            if click icon do not supress bubble, clicks might be generated during scroll
        //        expected: icon clicks should bubble, but not be generated if dragging
        //        fix:
        //            dragging is always generated before click, because mouse is not up
        //            hence if dragging, disable all click events.
        //       add:
        //           // OO.js synthetic events
        //           //     all onclicks should be feeded to a context.onclick and if it allows for it, click should propagated, bubble etc
        //           //  fix updating text in node-profile
        //           //add support for all events
        //        make swipe/scroll override eventManager propagation
        // draggin on Latest when there are many items will make it bug
        //         this happens during drag and remove/add new items, add an dragOffset that is increment/decrement by item size
        //create new signer
        //        ask to store private key on client or on server
        //            CabinetSigner has  an add propery, if shown it should display a brief help text and propt with
        //                Checkbox with store private key on server or not
        //                SAVE or ABORT
        //            create a store GUI path with current selected signer
        //            create a link between store GUI and res, so that data gets ported
        //            this way private key can be saved or not  
        //fix: only one note visible in signer page, even if there are more created, stack them up or somethinh
        //manual signer priv
        //    //add abort button
        //    update cabinet signer
        //        //fix: if unable to sign then show error message
        //        search for all updates
        //fix: when opening privat key view, the cabeing signer page is broken when returned
        //compose
        //    move auto store private key to store it later if it worked
        //    if private key fails to sign, clear that one stored.
        //    if private key fails to sign, do not store it in memoty
        //fix: linked notes in should be display as the second item in the tree view and be highlighted
        //fix: private key expand does not work
        //fix: when opening new pages, previous scroll tends to lock up
        //  add account page
        //        //add export user and node section
        //        //add delete user and treehut node button.
        //        //add link to dashboard from treehut (open new tab)
        //        //add change password to accotun page.
        //        //    fix wrong password can be supplied when changing password
        //        //    logout user when pwd changed, i.e. clear session cooklie
        //        //will-change
        //        //transliate Z
        //        //add button to bar
        //        //remove the "Leaving page" from hotel
        //        //when creating first user (admin) create note also
        //        //when created a new node (user) then log into that node   (dasgboard shoudl set profile.domain = 
        //        //  fix broken styling in simshim
        //        //App is bad name for wrapper, becaues there alredy is an app?!
        //        //create folder treehut/hotel/hotel.js 
        //        //    that has all the files for rendering the hotel login / dashboard stuff
        //        //        when creating new User, always redirect to the node.
        //        //           IF user is admin, show the ADMIN button in the treehut bar   "admin_panel_settings"
        //        //           Welcome to Treehut Hotel --- same Logo but with green colors
        //        //           User
        //        //           Pwd
        //        //           Sign In | Create new user
        //        //add proper graphics (use color scheme from treehut) with logo and stuff...
        //        //fix: broken login
        //        //launch in stealth mode PublishHidServDescriptors 0
        //        //launch in public mode PublishHidServDescriptors 1
        //        //launch turned of tor=false (see DEV)
        //        //update launch.md
        //        //if password is bad format, show toast
        //make node sign in as nice looking as treehut hotel
        // if going to location that does not exists /asdad it will look for a feed but should be a NotFound
        //        // simshimn can be used to easily reproduce issue
        // fix tree nav:
        //    flip to right, then down on item creates a new left item instead of re-using existing one
        //   //bubble fling + y drag = aborts bubble flint
        //task that depends on testing on phone:
        //    //setup debug on device
        //   // make ihpone friendly
        //   //     //css normalize
        //   //     //viewport meta tag
        //   //     //   fix: position of login fields
        //   //     //    fix: simshim
        //   //     //    box sizing
        //   //     //create dev cert
        //   //     hide safari nav bar
        //   //         fullscreen?!
        //   //impl touch scroll
        //   //     stop body scrolling on iPhone
        //   //     fake with mousemove
        //peer
        //     //peer poll
        //     //      toggle on/off nodes
        //     //           create lights indicating off/idle/on/ondemand lights for each followed peer, on its own page
        //     //                   under the PING button or something
        //     //               also show information here about the peer... quota and stuff like that
        //     //treehut/peer page
        //     //       disconnect
        //     //       reset
        //     //       remove
        //    // remote reset
        //     //       add rest button from Peer page in menu, i.e. reset relation with this peer
        //     //       a node should be able to tell peer that it should reset lists like tracked, sent notes etc)
        //     //           this way a node can recover locally lost data by recynking from start
        //add share node dialog
        //    //fix: fix protocol empty see console todo
        //    // add deep link to auto-connect node that is sharing
        //    //    how to pass on url params to the refresh session thing and stuff
        //    //        where is it setting the node url after the refresh???
        //    //add link to hotel
        //add TREEBIT.md and link to from README.md
        //make sure everything works in TOR Browser
        //     //fix: crypto (console.log to trace what goes wrong)
        //    replace pkcs8 with jwk
        //        create new functions using JWK and test on module loading
        //            base64 to json, json to base64
        //        when the functions work, invoke these instead of the old ones
        small fixes:
            //  add: delete cabinet signer button
            //      if its default, this will require update of the cabinet.js page.
            //            easiest is to just update all res (using force) on client when delete action is done, to reflect changes
            //add: proper node urls in signer detail (when creawting new signer)
            //fix: note header displays incognito even when signer has a name
            //fix: auto re-index database
            //    //add parcel
            //    //    //fix: tests related to size
            //    //    //fix: testSpeed does not appear to work when launching first time
            //    //    //fix: testRandom
            //    //add testRebuild
            //    //    add: rebuild feature to bucketdb mediums
            //    //        "loop through folder and rename all .bck files to .bck_old
            //    //        "then maybe build some index of hits?!
            //    //verify all tests enabled
            //fix: use of array maps etc in bucketdb (enable debug in utils.js)
            //fix: scroll wheel in TOR browser
            //fix: tree page: widen the size of window for when downloading new comments, to improve scrolling experience
            //fix: infinte page: increase number of items to download at once
            //            // its impossible to know if there are more items below, so always asking to extend the array
            //            // using the index at the end of array. same is kind of true for items above (-1 or lower)
            //            // however:
            //            //      the data downloaded from server is binded to the graphical item so when the graphical
            //            //              items is destroyed the res will be removed
            //            //       for some reason the home.js arr is emptied
            //            //fix: home.js addFeedArr somehwere when scrolling and no content is downlpoaded arr is emptied for some reason
            //            //          also for some reason when 2 items remains, for some reason getItem index 3 is never queried...
            //            //              maybe because item 2 was never in array
            //            fix: tail bounce top
            //fix: infinte list: widen the size of indow for when downloading new comments, to improve scrolling experience
            // update: TREEBIT.md, de-emphasize spam and emphasize GUI navigation
            //        TREEBIT: decentralized, anonymous AND public. negatives of decenralizastion used to filter which is positive
            //        owning data is NOT being able to prevent other people from reading it, it is preventing other people from being able to take it from you
            //        privact / anonymoity is NOT same as not being public
            //        nothing can prevent you from leaking data, therefor it will never be protected against getting public
            //add: gitignore 
            // change: move tree left/right bubbles to parent
                    //draggable
                    //line should be at bottom
                    //make sure nav history (scrolling away items then scrolling them back) works
                    //selected binder makes it impossible to select other
                    //select new binder when pressing down on a binder not arleadt actve
                    //fix: new elements are created when clicking on previously clicked branchpoint
                    //fix: one frame randering of left side branch rendered off screen
                    //add: clickable bubbles (scroll the child)
                    //fix: history when swiping left and right
                    //        "when binder leaves screen and binder is destroyed, the selected child gets missing
                    //fix: need to scroll to show items
                    //add: crete destroy window threshold so as to keep more in cache
                    //add: preload vertically
                    //fix: main items are hidden?! make default visible
                    i//fix: when items above are loaded, they push down head
            //fix: horizontal scrolling of wrong row
            //add tree.js: batch download of cards
            //            temporarily change REMOVE values to 0
            //            increase download nbr items
            //            enable REMOVE valies again:wq
            //fix: buttons in node profile "node can be reached on" does not respond
            //    fix: propagate event down to children
            //Fix note card controls clickable during drag. Press down on control icon and then drag, should abort icon click.
            //Fix node profile screen top bounce.
            //fix: cabinet; add signer; does not show up first time opening cabinet, "hidden" behind signer list items
            //Fix note card hidden in tree when scrolling horizontally.
            //fix: missing ":" on node nrls on node profile page
            //fix: if auto-sign in takes you to the account poage or similar, BACK will take you to signin page. take yo home instead
            //        add: goAppBack goBrowserBack (internal hisyory)
            //fix: scroll x while clicking bubble buttons to scroll other row     (maybe a simple flag if animation is running to prevent all clicks)
            //add: DEV mode on page, to make sure that shows
            //update: install.md
            //    fix: "Install TOR": brew install TOR not openssl
            //    //add: TOR will start automatically comment
            //    //add: how to start in install.md but make sure information is not duplicated in readme.md
        //fix: launch dev starts several instances of node
        //add: when clearnet, disable topenssl (this way less to install etc)
        //bin/launch.sh
        //    update: add a "simple startup" that autofills everything and startsyp
        //tree.js: Fix hidden card notes when swiping.
        Add TOR client auth.
                //add openssl via brew: https://stackoverflow.com/questions/43546712/how-to-generate-a-curve25519-key-pair-in-terminal
                //make sure auth works with Tor Browser
                //test with none-openssl generate
>>>             make sure tree nodes can connect with auth disabled
                make sure tree nodes can conncet with auth enabled
        Fix started following signer toast spam.
>>        data integrity:
            //create script that starts and stops bucketdb FAST to try to crash it and make sure it can recover. use oo/test-bucket
            //run treehut hotel and try yo crash it
            run treehut and fix errors that occurs
        scrolling:
            fix: scrolling on home page (and other pages too) locks on mobile
            fix: scrolling in share modal locks scrolling
            fix: run bucketdb test and see that it works. then fix the async complaints... OR ??!!?!!!
        production:
            launch.sh create prod openssl certs
        make sure µ.config has correct values
                resource continous polling should be enabled
                make sure this works:
                        "all kinds of polling should work"
                            ondemand polling
                            when scrolling in tree
                                ondemand new notes
                            when entering a signer
                                ondemand new notes
                                ondemand signer data
                             everything in the app, network nodes (discovering), peers (finding/adding/removing) etc, should work
        VERIFY THAT IT WORKS + LOOK N FEEL:
            gui
                all pages should look nice
                zero known annoying(!) GUI bugs
                    navigation. forth and back between pages
                    spamming with random clicks
            //add peer
            //    progress bar for when adding a peer... create some sort of polling for state of adding new peer
            //    should be possible to add peer by inputing url somewhere...
            //    should be possible to add peer by visiting link in (followed) Signer profile
            download project from github and create clean project from start to verify that everything works
        DoD:
            able to run two different hotels (on different machines) and exchange data across peers on different hotels
    MVP (this list is un-ordered, order it before starting)
        add: tor selected clients auth (so that TOR can block incomming requests from unknown sources)
        fix: optimize rendering by NOT re-calculating size all of the time. instead set dirty flag and re-use html elements
        fix: sometimes you need to click twice on a button before click is registered
        add: feeds, topmost signer
        add: feed: topmost notes (already added?)
        add: zip script, API and download
        add: openssl wrapper to handle errors
        add: use input hint for "Enter password" when empty
        add: share wizard. hotel hosts a a share wizard that figures out if invited friends is browsing using an android or iphone, dekstop etc
                    and then shows the appropriate share information for that context (example if on andorid, try opening treebit app on device usong schema (PWA supports it too) 
                    on desktop ask user if they have a treebit node or if they want to create new hotel account
                    similar to how TOR browwser download page looks: big DOWNLOAD button at top, then the difference devices listed below
             also when sharing node, add signer= to node share link, so that invited user also starts following faovourite signer
        fix: the text is cut of on notes and on help screen. its probably the scroll list rendering it with a margin + maybe some more stuff
        fix: new infoToast not replacing old (reproduce in cabinetadd on priv storage selection)
        add: followed signers can be color tagged ("you" should also be color tagged)
        add: create signer wizard when starting app first time... pre-filled with node user name
                "You need to create a signer to post content"
                Show at least 2 pre-filled signers:
                    "First signer": <same as user name on node>
                    "Second:" Incognito-randomnumber"
                    + sign to add more
        move: node profile and cabinet to advanced
        fix: help pages are to white
        fix: prevent page drag when input fields have focus
        fix: save buttons  (and other confirms) should be (not be green) be WHITE but pulsating
        add: pre-populated app with content and connect to peers with content 
        add arrows pointing to horizontally scrollable comments the first time
            requires startup guide mode
        add destroy peers that under-perform (upload-manager.js)
                    // maybe if to little quota to many times, then destroy it or something like that
                ensure "pinned" peers are never destroyed
        add full reset peer feature (@see TODO comment in code)
        add media-query (ensure screen size works etc) for iPad, Android, etc
        add docs
                How to add development certificate on an iPhone
                    create bash script to turn _dev/cert/... and guide in docs/development.md for PEM files and airdrop on iPhone and add cert
      signer
                in signer.js add the Plus Icon to pick a random Nrl to conncet to and add that as a favourite node which can not be dropped.
                when following a signer, ask to follow also its signer node
                make sure notes that a signer creates is always added to the "never delete it" signer storages, also when it arrives externally
                make sure followed signer is never deleted
                    create max amount can be followed (otherwise it becomes a DDOS for hotel)
                impl paging for signer.js (res/signer/:signerId/notes)
                when following a signer
                    add its nodes to node list and bookmark them
                        show the node sharing state in signer.js or at least provide a link to the peer or something
        cabinet
                when a note is downloaded that is created by a signer in the cabinet, but the note is not presently stored on node, then store it
                make signer (previously offline) private key possible to backuo to server
        bucketdb
            add key, so that re-indexing / recovery can be implemented
        peer managment (auto connect, favourite nodes (ie. never drop friends etc)
                    notes
                     "favourite"/"bookmarked"/"friended" peers (make sure they are never dropped/kicked)
                             your own automatically gets marked as that
                    max number peers
                    a peer node gets a score for good behaviour and better peers are kicked in favour of better peers
                        stored in peerproxy stats.score
                        add score to peer list and peer page info
                    configure max downloads
                    "favourite"/"bookmarked"/"friended" peers (make sure they are never dropped/kicked)
                        stored in peerproxy settings.pinned
        export/import user:
                user gets to decide what to export and content exported as ZIP or TAR:
                    signers controlled by user
                    content created by users
                    favourited content
                node profile
                        can not be exported, because node is tied to a hotel,
                        howeever it should be possible to create a new node and inform peers they should migrate connection to the new node
        data integrity
                   make sure that signers in the user, never gets deleted from the signer lufo
                       do this by listening to what signers gets deleted from the lufo and prevent them from this
                           i.e. lufo should have a callback that filters stuff which can NOT be delted
                               removeItem() { if(listener.onRemove()) do remove...
                    make sure that notes users created self is not deleted
            torrc should be possible to use the user defined path one terminal startup...
                    ? prompt for it: ? install script?!
                    ? how to find out what is being used...
            using onion to connect on on different hotels
            toggle on/off if node want to expose its clearnet/onion address (sortable list on node profile page)
            improve error handling
                 ? standardize error format: utils.createError(message, log) { new Error(message);
               features:
                   grapevine API
                       connect node
                   resource API
        impl note button features
                bolt
                bookmarket
                block
            also add the feeds
                bookmarked notes
                bolted notes
                blocked notes
        share
            create proper share dialog (refactor the one from NodeProfile page and make standalone)
                make sure its available from many places
        scrollable page
            fix: slow scrolling in TOR browser. guessing its the interpolation because dragging with mouse on Node profile page is OK
            add: scroll indicator so you know you can scroll
        resource-api
                make a list of which endpints are never used and uncomment them (create an array where path are added on setyp, removed on invocation)
        harden
            make signer private key client side only
                        // signer still stored in cabinet
                add toggle for storing it on node or not.
                    prompt for user confirmation on toggle and inform of consequence
                ask for private key when updating signer data
                ask for private key when signing a message
            oo router takes location and propagates to what eventually is evaluated as variable... escape it by default
                example: route('/cabinet/signer/:signerId', ({props}) => { oo(Cabinet, props /* likely to use signerId in res call*/);
                probably possible to supply element will all kinds of properties and stuff?!!?!
            grep on elm.value = and html() and make sure its not used where it not supposed to use escape() on external data
            grep on "TODO harden"
            ensure that all input from client (even the "trusted") is parsed properly
                vector: bad user can create account and submit garbage data to example node preference and create trouble
                everything entering throuh resource-api _must_ be cleaned, i.e. pick values by key and ensure it matches critAIARS
                everything entering throuh grapevine api _must_ be cleaned, pick values and match against schema 
         small fixes
            signing in and out between different users and/or restaring node while client is running, messes up the state making might confuse user
            fix: so that admin can change password of other users from dashboard
         small refactorings
            modal to use context.µ.treehutrOOt just like toast
            toast to use context.µ.treehutrOOt just like toast
            refactor Note to Branch
         clean-up
            oo.onDestroy lowercase
            oo.onRemove lowercase
            make sure toFrom in grapevine works (also make sure it works when changing in client)
            make sure 200, 404 etc are set the proper way both for
                webtreehut
                hotel
            update simshim to reflect the possible architecual changes And nomenclature
            make sure it works
            update STACK.md with possible changes
            update example-webpage to work with bootloader

    PRE-ALPHA
        resarch keet.to and invsetigate if its easy to create a spaces of it
        password protect private key stored on server (prevent against leaks/hacking etc)
        ensure that all res/ are server rendered correctly
                signer-name.js is prime example
        dashboard:
              pre-populated with informative cards for how to use app
         treehut should store its OO.store app state in localstorage,
                add localstorage to OO for storing and re-storing store state
        finalize OO: HTML rendering, string sanization (copy from net. probably react and make it replaceable just like history)
        set sizes of storages
        tor proxy (tor must be run manually)
        desktop: electron. package server and treehut in a electron.js.
                    note: should be able to point to another server then the packaged one
        optmz: create a common storage for notes on same hotel to save space on hardddrive
                when no node is using data (lufo overflow) then delete the data in database
        harden:
                routes should use credentials
                        impl user.js password
                secure, integrity checks, actual signing (use browser built-in crypto?!)
                        create test-cases for this
                composing post and/or signning
                    make sure signer priv is stored locally, or on server, or typed in everytime
                ensure that the "peer name" can not be creating collisions, because its used to label storage etc.
                    probably create some kind of internal unique ID or hash or something... ?! do not use public name at least
                ensure node credentials are verified
                    publicId should also be verified so that a hotel can not lie about hosted nodes
                ensure cookie Secure in santch in production environment
                read and harden tor
                            tools: https://gitlab.torproject.org/legacy/trac/-/wikis/doc/TorChutneyGuide
                        add torrc: NoExec 0|1
                        https://github.com/nyxnor/onionjuggler
                        use socks instead: https://github.com/mattcg/socks5-http-client
                            https://riseup.net/en/security/network-security/tor/onionservices-best-practices#be-careful-of-localhost-bypasses
                        https://riseup.net/en/security/network-security/tor/onionservices-best-practices#leaking-the-real-server
                create Tor Client Auth: https://community.torproject.org/onion-services/advanced/client-auth/
                    how to generate x25519 in web crypto?! to PEM...
                            first use command line openssl and when that works generate in nodejs
                    btoa for baase64    OR     Buffer.from('Hélló wórld!!', 'binary').toString('base64')
                    base32 probably have to use external code
        attack
                sihpon of data from onion server such as IP atc, via TOR
                xss
                resource api
                url (example signerIds that is used to access store and do stuff like store (/../signerId) )
                store. store data, paths /../ or something?!
                snatch
                cookies
                headers
                backtick and variables from outside?!
                send huge amount of data when not expected
                fuzzing
        steahlaunch network
        verify that server rendering still works by enabling server rendering
                "run with server rendering disabled"
        DoD:
            make sure data flows securely between huts
     CLEAN CODE:
        refactor: depreacate forest.getNote and use forest.grabNode
        black box test
            crypto and notes + black box test suite
                someone can create a fake post using a colliding pub,
                    fix this by looking to see if signer is known and if so, verify pub
                        if signer does not exist, wait for signer to arrive and when it does THEN
                            walkthrough the notes and verify them. those that does not verify remove!
                                create a blackbox test for this
                                    add test suite to simshim menu
                                        should also be executable from nodejs enviroment
                 add crypto encryption to all messages sent (toggle this ON/OFF in config)
                        now all messges becomes private
                            impl: grapvine msg encryption
                            right now only stubs.... 
                                encrypyting grapevine messages fails with very long messages (short messages are fine, but when hadn)
                                    fix for long messages
                                        worst case: split up JSON.stringifyed messade into chunks / array, and encrypt them 
                                            make a test to see how many charachters are the most fast to encrypt
                server side create a blackbox test suite for canopy
                    take mockupForest and make it deterministic and test result
                client side create a blockbox test suite for camopy
     ALPHA:
        add "block signer" to block bad signers, should also affect scores of notes from this signer
        add a signer scoring, just as notes can be scored
        add a "i have changed my mind on this"/"still think so" flag/comment (since deletion not possible, possible to change oppinion)
        fix "all" TODOs in the code
        possible to UNDO before pubshing a new note
        polling, strategy for grapevine auto-discover network nodes and
                auto-add (perhaps N amount of worst peers are put on retainer and
                    add new network nodes trialed to see if new better ones can be discovered),
        client sessions
        add network propagation for
                followed signer AND followed notes (same solution) (NOTE: this should _not_ affect the note score)
                    a node should be able to ask its peers what signers are being followed and store the pub of these locally
                            a peer should remember what signers it have already sent to the peer, so as not to send it twice
                        which is then accessible from the treehut via resource-api
         design nice icons
         add note scoring... the more clicks, the higher the score (more clicks are tedious hence more clicks a PoW)
                    display as a number between 0 and 7?
         journal
                i.e. how navigation has been done... see canopy and see if there is more to be done
                impl orgainc sorting of lufos
                    example: prioritizeSigner: should result both in signer bubbling up in signer storage lufo, but also in tracking lufo
                               add to GUI to ensure that signer gets highest attention in 
                                follow queues, followNotes etc... ie. so it get updated
         quota
             now consume quota only happens when finding stuff... 
                make a "process quota" when CPU runs to find stuff, but generating no result
              auto-poll
                good distribution of quota
                    config.UPLOAD_QUOTA_ values should be downloaded from peer instead, so that it can be properly set locally
                ensure all invocations have proper quota in retriever poll
                a peer that finds notes/signers you are looking for should get a higher value
                    addNoteScore does not help with this...
                        because if you look for a note, you want to reward the peer, even if it turns out you dont like note
                    hence replier.js must also take into account:
                        how many cards you asked for / how many it gave
                            and bake this ratio into how much quota to give
                    now exakt same thing for Signers (do notes first, then see if notes can be re-used)
        hotel server rendering of lists
            since screen size is unknown
                    "using steps below bots can crawl, page is render quickly and will work on most devices"
                on server render only the first two notes
                    make sure there is a link in notes html elements, so that bots can visit the note link (this way all notes can be crawled even though the page is limited, as long as two notes is visible on screen)
                when rendering first time in client
                    worst soltion: clear container of items and re-draw
                    best solution: re-use elements and let item glide into proper position
        create shared db for webtreehut lufo notes and signers(signers versioned)
                probably the nodes lufo only stores the meta-data about the data and real data stored in shared
                if ZERO nodes stores the data, then remove it from DB
                    everytime a node removes data
                        check if other nodes still use it and if not delete it
                            probably have a counter of which nodes use it
                                when destroying a node, you need to remove all items too in order for DB to clean
                            also re-index db should be avaiable as an option
        public/indexable/browseable node:
                    i.e. "Kiosk Mode"
                webtreehut requires user to be signed in, even to server render app,
                add so that guest that are not signed-in, can browse the app, server render (for bots) and make API call from client
                    note: they should NOT be able to update what nodes are connnect to etc
    BETA:
        tags, search, mail pgp, TOR integration, torrent integration, multiple profiles in same app
        add signer / peer using QR code or email
        improve: "polling best" by figuring out smart strategies
        figure out if its possible to relay part of the trackedNotes trackedSigners list to other peers
    FINAL:
        PWA
            use localstorage to store stuff between sessions, because indexdb might loose data during shutdown.
        android and iphone app
    add/replace fetch with sockets
        how to do push
            first use NOTIFY in grapevine/canopy to observe changes
            then do socket push to client side resourceClient
            which then mutates storage, which in return will autoamtically notify all storage listeners in the app
    NEXT-GEN:
        hotel
            load balancing. spin up and down multitude of nodes allocating time / resources dynamically.
    viral features:    mastodon, NFT (RGB), 

## TODO

    refactor grapevine and canopy signatures, so thay they work with sha384, pubs etc instead if object literals
        object literals made sense when everything was working with canopy directly...
            but after impl the webclient it really does not and now its better to have a standardized way throughout the serverside
                also its more efficient and really "sha385" is the way its most invoked anyway

   add link to tree from notes in signer profile

   replace all listeners with on-notify.js 

   fix browsing tree swipe right/left seems to not destroy old views.

   when removing a peer, ad as network nodes

   refactor "note" to "post"
        then refactor app so that everthing displayed as a note, is named a Card.... example SignerCard, PostCard

   signer
        //mvp: simple note list... no horizontal scrolling
      //         make sure concating notes works nice... 


 style note node 
        //in tree
        // in dashboard
        //        added note in note.js... add this to dashboard
            fix transition note pop in out before exiting screen

   after mvp:
        signer note list
            create CardLarge(tree),CardMedium(dashboard),CardSmall
                should be wrapped in a Tree List Item or Singler List CardItem or similar
                    left right horizontal navigation should be created using a oo.x(xx()); (check example to see how its done)
                        this should do a go('signer/note/sha384/child/sha384') 
                            figure out how to implement an algo that does a  "find note and scroll to note"
                                    scroll to is easy, if only ever showing ONE note... because then its "always the next off screen"
                                    find note, should probably just locate note and out it at top of screen
                                            same kind of "cue" as with tree, to evaluate whether note is on screen already or not etc
                                        if its not already on screen....
                design it: matrix just as in explorer in dashboard
                        re-use MenuList somehow... because its very similar.. i..e
                            top item is Signer profile
                            the horiznotal list with CardLarge
                back goes to signer when doing composer

   //peers
        list
         //imporve infinit-list (keep it treehut dependent but should be possible to break otu) so that CSS can be re-used,
         //Discov er new peers: list item that takes you to list of unpaired nodes (simple ADD button on list)
         //        Peers: list item that takes you to list of peers 
         //         peerPage...
         //           //add route (how to get route path for peerName)
         //           // create a NEW "template" tug for a page... (just as I did with vertical list) 
         //           //            Page,       Bar     closePage       Stage (createPage)
         //           //settings     x           x       x                x
         //           //signers      x           x       x                x
         //           //following    x           x       x                x
         //           //peers.js     x           x       x                x
         //           //peer         x           x       x                x
         //           //dashboard                x
         //           //compose                                           x
         //Fix fadeOut when exiting pages.... might have something to do with missing transiotn linear in Container (Settings etc)
         //Peer page  "first step of figuring out the simshim as a server"
         //   //open from settings
         //Network nodes
         //   //download unconneected network nodes (those that could become peers). "i.e. discover new peers feature": todo
         //    //   ask for nodes. networknodes-retriever
         //    //create page and list nodes retrieved
         //   //       fix why nodes do not show up in list... they seems to be donwloaded from other peers?
         //    //           call back not woring?!
         //   create button addPeer
         //           NOTE!!!! dont forget to remove Peer manually otheriwse no network nodes will show up ;-)
         //               add as peer and remove from network node (both in treehut and in local store)

    USER(hub) epic
                    can be done do after treehut MVP is done
            while the source code only have to be loaded _once_ per nodejs instance,
            canopy/grapevine/resource router/etc, are all instances created per user
                 BUT the canopy notenode storage data should somehow preferably be shared across all users so minimize redundancy
                      this can be fixed when everything else have been programmed in the app
            the nodejs/nodejs (or the simshim/simshim.js equivalent) is the place where a router should pick the
                instance of the app (canopy/grapevine, etc) depending on which user is logged in,
                            (all calls to API should include credentials (somehow also protect against CSURF, which depends on cookies)
                    and pass on the appropriate router.
        hub admin
                this page will make API calls to the hub-router (located in the same layer as simshim.js routing for selecting user app)
                    i.e. the hub-router is NOT(!) part of the treehut server API
            when logged in as guest, bar as a:
                    has a SignUp button (ie create new peer) if button is enabled
                    or log out, if a user is signed in
           admin page:
                        user account settings:
                            public: _anyone can view_ the data, but you have to be logged in to make changes
                                                typical guest account settings. guest is default if not seigned it
                            private: you have to _login to view_ (and make changes)
                    turn on/off: "Sign In (ie create new peer)" button on frontend
                    turn on/off: "Log in" button on frontend
                    select guest: which (or none) of the public peers to serve as default peer when visiting tree.com
                        if none then data does not show in client and only SignUp Login is are visible (if enabled)

    add peer address....
        first change peer name to peer address: (prefixed with sim:... on internet this will be IP adress... or ONION address)
        then add a human friendly label field

    ///improve infinite-list
    ///         imporve infinit-list: where all items are the same and have the option to have buttons:

    polling
        ondemand: blocked by scheduled
            refactor the functions in foobar-retriever.js that depend on quering a lot of peers to "some other solution"
                but do the scheduled thing first, because then it will be easier to understand how to do this
        scheduled
           To download new notes to existing trees
                        basically collect/record what content the user is browsing/looing at and save that,
                        then when polling new content use this list to find out what to download.
                    first create a toBeDownloadedTrees(Signers/Tree)Lufo where the last visited notes in the tree (sorted by date) notes
                            are added by sha384, every peer should have its own list 
                    in the peerProxy polling function, walk down this Lufo and request sibling/ancestor/etc scores from branch points
                            and remove the item from the list (since other peers have its own list, those items will remain)
                        then add the downloaded scores to toBeDownloadedCards (all peers have their own of this one too)
                            but only if the sha384 is a note not already downloaded
                        then process toBeDownloadedCards
                                but only if the sha384 is not already downlaoded (another peer might have already downlaoded it)
                            and remove it from the list, but only locally (other peerProxy will not download it anyway)
                probable this disitrbution of "what to download" should be added to PeerProxy.prototype like so:
                    ß.grapevine.getRetrievePriority().visitTree(note.data.sha384)
                    ß.grapevine.getRetrievePriority().visitedSigner(note.data.sha384)

     dashboard
                Topbar becomes DashboardBar
            //Figure out what dashboard looks like using pen and paper
           Explore best content:
               //explorer impl: scroll row horizontally: notes from this category
               // Break out the InfiniteList
               //Refactor explorer to make it easy and generic to work with
                        //break out inifite list
                        //   different size of notes on same row
                                //measure width and height, store in o. and re-use that in render 
                        //different kinds of rows
                        poolable items
                //Title (category) of row (title should not scroll) 
                //Make balloons clickable
                // Fix vertical scroll 
                // Add topbar with links to: settings menu, my profile, possibly peers icon
                //        postion icons
                Proof-of-concept categories/rows:
                    Topmost notes
                    Last download aka new (should have its own lufo for added... dont care about remove, just skip if not found)
                Prototype:
                    Following: "best from what I follow"
                    New: "best from what is new"
                    Visited: "best from what I last visited"
                    Make note clickable and go to note in tree view
                mvp:
                    Replies to my own comments
                    Categories and their order saved to session
                    Random notes
            list best
                note from each
                    peer
                    tree
                tree from forest
        select roots notes
        select best notes
        //swiping should scroll note into focus and keep the old note where it is
        //        maybe its possible to preserve the old note place and use that.

    add follow notes

    add follwo trees

    add note download by following
            when clicking follow these notes should be downloaded and view updated

        add quota data sizing and multiply with factor
                    replier should estimate how much quota notes will take (and tell peers about this in quote)
                        and use that in note-talk.js
                        it is important that replier and retriever calc the same quota: server pays price if its wrong
                    copy sizing from lufo 


       change get/add note/signer so that items are always treated as Node...
                    everything with note should have sort _last_
            addSigner should also check if incoming signer is a node or not by using ({node, signer}) etc
            maybe get could have an option arg for what type to return    grabSigner(pub, sort)


        //refactor out of note-talk and make generic
        //       try to make GUI  not freeze up all of the time
                    start stop buttons 
                    maube the task with those small buttons?!
        should go through the canopy for the signers you follow (they should have their own lufo)
        should go through the conversatins you follow 

    add settings menu
        list connected nodes (remove)
        list unconnected nodes (add)
        button to ask for peer nodes


   improve notelistitem design
        impl new CardListItem @see paper design
        impl identicon (fake profile images always tricks people)


    note-talk:
          node should send back how many max scores it wants... 
                   right now its random... make it so that its configurable in client.
                   @depends on client "Preferences" dialog
          when everything seems to work fine and architecture seems to be stable THEN
                   make sure the peer quota is distributed in a proper manner
                   have a look at TODO in file
                   add error/message replies integrty checks
          //introduce debug level
          // ///expected: highest scored notes are downloaded from peer       fix: lufo.adDescending
          // ///              vi +129 canopy/forest.js    enable this again
          //    when scoring notes in forst, update peer upload gauge...
          //              ////replace scorelist with lufo
          //              ////     each impl everywhere
          //              //probably need to save peer in scoretree
          //              //     use the scoretree to save this data
          //              //        update peer totalScore based upon old score in scoretree and the new
          //             //          remove: now peer does not need a notes score lufo
          //    //ensure that new notes when downloaded are added to the tree
          //    //               if peer does not know node has scores it will send them
          //    //                   and it can not know node has these scores
          //    //                       because node will not upload scores it have received from a peer already
          //    //                             hence a peer SHOULD remember what scores it have already sent to node
          //    //enable download / upload in both clients and expect to see that they can clone eathother 100%
          //             ////add upload-quota verififcatiom everytime when client is suppoed to do a reply
          //              ////         make this exceptin/error handling generic 
          //              ////         this may result in server resestting quota while dialog has been created
          //              ////             to fix this:
          //              ////                     keep    the timeslot window where downloads are allowed
          //              ////                     keep    that peers are randomly provided time within this slot
          //              ////                add     a limit so that the time a peer can connect is a window within the open window
          //              ////          i.e
          //              ////   open for download       |----------------------------------------|  : downloadTimeslot
          //              ////   random time open        |------------------------------|            : initiateDownloadTimeslot
          //              ////                                   |--------|  : time to finish download dialog
          //              ////                                                               ^  note: this is not the actual
          //              ////                                                                  time it takes to download the notes
          //              ////                                         it is the time it takes to go through
          //              ////                                                                           the whole dialog
          //      //ensure that quota is changed properly when note are downloaded etc
       //automatic-download-manager
    //   download signers (not followed yet)
    //        //signer-storage, should make sure profile signer is never deleted
    //        //add signer information so I can debug if data is downloaded properly
    //        //update signer view:
    //       //     show description  so I can debug if data is downloaded properly
    //        //   update profile view:
    //        //        add fields that can be updated to existing signer
    //        add signer-talk to download signer information
    //                    when do I want more information about a signer?
    //                            order of importance:
    //                        required: when I am following a signer (updates as replace priv key, source urls, etc) @depend on following
    //                       required: when I look at the signer details - single request
    //                        nice to have: when I follow the signer ? 
    //                        pre-loading: when I like a note ? 
    //              //fetch single signer
    //              //      //add retrieve to note-talk
    //              //      //add reply to note-talk
    //              //      //add start poling when adding new peer
    //              //      //remove the unused files such as donwload manavger
    //              //      //refactor QUOTA to download manager....
    //              //      //    use downbloadManger call to retreive stuff....
    //              //      //        then downloadManger should save latest quota....
    //              //      //            if quota does not exist or have expired, download manager should ask for it
    //              //      //    update note-talk to reflect that cahnges
    //              //      //    then crewate signer-talk file that use this
    //              //      //add methods to download and upload manager
    //              // make sure polling works again
    //              //      //see if it is possible to break up get scores and get notes
    //              //          // refactor to loop
    //              //          //figure out if its possible to create a "projected open"
    //              //          //        this will save one call in some circumstances
    //              //      //add score 0 for peers... so that we know we sent rthe note
    //              // //when above is known, improve on
    //              //          logging: how much quota was needed and how much was used
    //              //          error handling
    //             when clicking face on a note:
    //                   change window and stuff.. remove all of that junk
    //                        //u manager: topup / addGrace <
    //                        //retrieve: no window
    //                   //turn off polling
    //                   //download signer ondemand
    //                   //fix zero delay polling... happens on demand
    //                   //ondemand using "Download once" <<<
    //                   //     add to retrieval whether its ondemand or not
    //                   //         then serving node should let in depending on wether there is quota or not etc....
    //                   //     retrieval exchange message should NOT wait for window to open IF there is ondemand quota left
    //                   //remove ondemand search for keyword() <<<<
    //                   //figure out how to make
    //                   //         polling consumes everything during its window (next refill)
    //                   //         but saves enough for "ondemand"
    //                   //                nbr downloads during window open    <<<<<
    //                   //                         more downloads less percent each time
    //                   //                         

   //show all root notes and orphan notes (orphans always has a placeholder which might be a fake)

   canopy should have access to many noteSets (following, peers, etc...)
        adding new note to canopy should check if note exists in any of the other noteSets
            then remove if its in the wrong dataset
            then add to the proper dataset
            IF a note is an orhpan note (there is a missing chain of notes between root and this one),
                        which should have same key size as ALL the datasets combined, because edge case is that all notes are roots
                    add hash (and the dataset name) to orphanCards lufo 
            IF it is a root note
                        which should have same key size as ALL the datasets combined, because edge case is that all notes are roots
                    add hash (and the dataset name) to rootCards lufo
                    check if there is an orphan note linking to the root AND if so, remove it as an orphan
        create an itterator of some sort for gettnig the root notes, so that they can be displaued in GUI

    swipe between tree views BUT fade when going forward / back
    improve button surfaces

    canopy (has the createCard, fascade to forest etc)
        //add highscore to forest
            //add note to highscore when adding to forest
              // note:   in GUI use trees to find out which notes / children to show and how many,
                        //but use highscore to sort them.
                       //     add score data to GUI (to ensure everything is sorted properly)
!                            this is also an opportunity to find out if there is highscore tree corruption
        //add highscore to peers
        //add scoring by peers mechanism
        add some sort of rebuild highscore mechanism

      Incoming peer score
            multiply the peers score, with 0-1 how much you usually agree with this peer
            those peers that send you score that are very not similar to yours, you give less of value
                this way those who tries to mess up your scoring will be punished.

    Add ghost notes, i.e. notes that are so old they are not used any longer AND should not be downloaded again
            these notes do not contain any data at all, only sha384.
            use a separte datastructure for this
            IMORTANT: this should be visited before downloading from net

    when there is a server:add canopy sessio to profile

    whenever canopy is used, sorting may have changed. this will make it confusing for the user.
        ? how to fix this?! notes may even have gone missing

    scoreboard.js
        when removing element, also remove from parent.children array
        add some sort of Max number of children in children array

    SCORE:
        peers should be scored in reference to how much you usually agree with them,
            to counteract bad behavingh peers
    DM:
        use public key to encrypt message and send using usualy email
        if has direct access send message there

- [ ] Tex kan en content creator ha ”crowd funding goals” ... när X antal Sats kommit in, så låses content upp för de som betalat 
- [ ] Text + torrent attachment

    authors (big part of infrastrucutre, so probably for the code arhictetcure to this early) * 
            // open Signer from post
            //        redesign post
           //create new Signer 
            //    add link to dashboard
            //in Signer page list notes by signer
               //"lufo of lufos"
               //     outer lufo contains references (signer pub key) to inside lufo (which contains sha384 of notes)
               //     when doing remove on a a lufo the referenced lufo also gets destroyed in the outher lufo vice versa
               //     do this in signer-storage, and do NOT turn this into a generic lufo thing
               //inner lufo i a descending lufo by date
               // keep notes in tree-storage, and save note sha156 in signer lufo
            compose message (select from availbable authors)
                //profile manager
                //    add
                //    signers under profile
                //growing tree by composing note
                //    should result in reloading tree with note
                //ensure that other clients gets the note after it has been created
 
## Fix

    canopy.networkSync needs to be restarted when new peers are added or peers are destroyed.
            make canopy listen to grapevine and do this automatically

    expect: connecting to new peer can download content instantly.
            error: needs to wait for an hour, if it takes that long for upload window to close
            fix: ?

    lufo.use seems to default to bubble... should support top or other kinds of sort too
            (only add seems to support both)

    Sha256 needs to be changed to sometingelse so that bitcoin workers have less change of hacking code

     //   rootnotes in forest should NOT contain duplicates... instead do as with scoretree... have two separATE
     //       always check the one with the most first..
     //           fix also this with checking bigone first in scoretree
     //make it so that notes sent to other nodes displays EXACTLY the same
     //           in a debug mode... 
     //                   first make sure ALL notes are sent and ingore deal (possible DEBUG or HUB mode for this two)
     //                                       probalby create a deal.js AND create a CONFIG.file with these debug optons
     //                        secondly verify if score is similar or not in GUI
     //                  preferably fix so that this happens in norm.js or something.
     //scorelist.js sort ordering behaviour
     //         figure out proper ordering
     //         and how to put it inside norm
     //cyclic dependencies:
     //examples:   note A says B is parent, and B says A is parent
     //            [C<-]D <-A <-B <-C <-D


## Change
    styling of darktheme... everything extended shoul instead be darker then background


## ---------------------------------------------------------------------------------------------------------------
## Backlog ----- When figuring out what to do next... pick from this list ----------------------------------------
## ---------------------------------------------------------------------------------------------------------------
     icons for indicating status  (maye easier when developing to see that node is online or not)
                    small colored dots in bottom right corner
             downloading         - green (bright)
             uploading           - green (dark)
             idle (but online)   - blue
             offline             - red 

    note design
        note backside: meta/details data
             what peer was is downloaded from
             time of arrival
             links to stuff its related to
             what more meta data is there?
        propely nice looking notes (@depends on [author, note backside], so correc text can be shown)

    add explicit retrieval of next note (in the tree you is reading , when scrolling) from peers * 

    settings/preferences menu
         add/remove nodes (not really needed since simshim can do it... do this when starting with hubs)
             what scores are there in the node?
             add nodes via link
                 depends on a server/hub/public nodes etc
        add public hubs
    hide a note (still there but not visible) * 
    delete a note (will delete its subtree too) *
    dashboard
            (explorer creates all the different scoreboards, then dashboard sub pages displays them)
                ß.explorer
         levels 3-4:
            0) watched history:
                    authors
                    trees
                    notes
            1) profile:
                    b) best note by followed author
                    c) best by prpofile
            2) discover new:
                    a) author
                            best authors by peer
                    b) tree
                            best tree by peers
                    c) best of best + random
            3) best of the best + random:
                    absolut top in all categories

         itterate... improve on dashboard when adding more features
         depends on having authors i guess
                 sketch what it should be like
                     main sections
                         how big
                         how many?
                         how should items in different sections look like?
                         Decide whether horizontal or vertical scrolling
                 what content is there?
             by most watched trees
             by bookmarked trees
             by following author
             what is new
             random
             by score (best to worst)
                 best of the best
                     biggest tree + topmosts
                 topmosts (roots+orphans)
                 biggest trees

## Grapevine & canopy
     canopy wants to be populated and ask the grapevine
         they talk all the time... whe canopy is updated, the treehut should listen
             treehur shoudl then be able to contrlol grapvine and canopy




--------------------------------------

     populate with canopy data (but mockup) (SHOUDL NOT NEED TO KNOW ABOUT GRAPEVINE HERE)
                      grapevine for retrieval of notes, hence you get all notes from grapevine (through its API)
                          canopy to store notes
                      any host can be used to get notes
                      only a server will store your journal
                      on lightwieght client treehut, the whole canopy can not be stored, hence only a journal is stored
                          the journal can also be stored on a server
                          local updated to journal is cynced on server

                          a while conversation is based on a unique note
                                  we always know the prev
                                  the next is not defined
                                          it is evaluated based on metrics
                                          the next one down (vertically) is the most popular one
                                          the next one right (horizontally) is the second most popular one
                                          the next one left (horizontally) is one you have already seen (essentially back)
                                          
              list topics
              browse conversation
      migrate code from note-talk with the proptype lufo code stuff
              refacetor this code into
                  canopy
                  grapevine
      menubar
          conncet nodes, etc
      search

//Create GUI tool
    //should be possible to have several clients in _same_ window.
    //    this way it will be quicker to do development, not having to launch servers and stuff
Create test-cases for note-talk in GUI
        these test-cases for retrieve and dispense can also be used for mocking GUI by virtual servers running in browser
    //create gui for three apps
    create t3t god like object encapsulation
    create messaging interface between the apps
        a message send/receiever
            basically a router
            but should be possible to replace WHAT is feeding the messages
                socket, rest, etc
                FIRST create something that works in the browser, lets call it
                    Messydev

