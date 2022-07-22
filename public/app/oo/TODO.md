# TODO
Tasks ordered by importance.
    Indentation signals
        breakdown of task
        and/or breakdown of problem space
        ? hints but dont provide certainty

## Bug report
Wed Jan  5 08:48:32 CET 2022
    Unconfirmed: if there is no catch-all in route handling, the promise never resolves.

Sun Jan  2 13:52:12 CET 2022
    Unconfirmed:    reload on a freshly downlaoded page does not push to state, hence back/forward does not work until there is a go
    hint.popstate triggers a replaceState with seems bad
    probably hint.popstate should be refactored to back and replaceState should trigger on replace.
        (make sure reload is not a replace)
    hint.back should be handlded too
    go should lead to push
    replace should also push??

Fri Dec 17 07:17:13 CET 2021
    Unconfirmed:    store listeners created inside a tug does not get removed if listening to ":" paths

## Refactor
refactor in DROP, SET, GET from routePreProcessor into router, because its so nice to work with and make it default standard

## Add
go(title)
    when going to a page title should be set
        add or change existing title to reflect the change
        title should always be in the head
            when parsing oo options on creation, check if tag is Title and if so set oo.context.setTitle

change: $.each(sortByKey)
    since arrays spells trouble in OO its better to use objects, hence $.each etc, to itterate over objects props as though
    they were arrays. however, sometimes its a good idea to have ordered arrays, hence $.each should support an options that
    will order the objects it itterates over. the prop should be a prop inside the object, such as a Number or a String
        example: $.sort('nbr').     { hello:{nbr:2}, yo:{nbr:1}}    renders: yo nbr1, hello nbr2


click-outside view listener
    add click listener att document root (should include also other OO instance)
        when observering event, save event to store: /event
            a pop-up dialog when created can listen: .on('event/onclick', ({event}) => event.isInside(/*oo implicit if not provided*))
                isInside, when invokes, checks the oo refs to see if the current (where the on listener was added)

store listener, should notify changes and include previous "state" (actually previous value)
    this feature might be implemented in a different way:
        history should be stored in the $/store (along with segments etc)
        the options says how much history to keep (10 in example, or true for inifite)
            example: .on(path, {history:true/10}, (history) => {
                const delta = history[0/*current*/] - history[1/*previous*/];
                console.log('change', delta);
            }); 
    this feature can be used for creating "Undo features"!!!
    should support deep cloning if its not a value but an object

serliazing context on server and download to client and used when creating OO, should work
    this feature might not be needed, since OO can hook into existing HTML document elements anyway
        basically this is a tradeof where less content needs to be downloaded to client saving some bandwidth
            with the cost of having to run querySelector everytime a new Tug is instantiated

silent URL
    exakt same thing as URL routing, with store, listening to store, parsing path with params etc.. configure same way with cues etc
        BUT
            hidden URL does _not_ change location bar, no back no forward...
                perfect for rendering a different path in app depending on state,
                    makes it possible to render a "contact form" differently, depending on the state... what to show or not etc
        implt by adding a flag in route....
            oo.route({hidden:true}, '/*', () => {

oo.merge('my/foo, {bar: true}); preserves old values, adds new, creates path if needed
                note:   nestled objectes should also be _merged_
                        original object should be preserved and new values added
        this is an alternative to set with notifyParent

Support for browser style editing
    OO should create style import based on Tug name
    Tug() { css('@./path/to/style/') // OO will add tugname.css;
    This will cause 404 if missing style
    Running application will reveal which styles are _actually used_ by the app, making maintenance so much easier (cleaning)


set a default path for ALL listners on a Tug instance using props:{defaultPath: 'asdasdad'}
    which is then used like this: oo.on('./playing'....    (notice the dot)

f.transtion does not support cancel (should remove class and or style)

add "Tag" feature. example: oo('div')(Foo)('Bar')
        div becomes native div, Foo is a Tug creating using a funciton and Tag becomes a html tag named 'bar'
            this can already be done, but a Tag misses some basic styling. default should be div-like styling

publish.js "script that you can run with nodejs."
    create folder out/
    adds all folders and files in target dir
    cache-busting: walkthrough the files, create HASH of file and save in map
                   look inside files for paths and if find "*.*" or '*.*' and see if they exist in path in map
                   if so update path with HASH 
                   rename files on target with appended hash
    zip dir

its not possible to set an array at root element in store: $.set('hello', []) 
    make it possible to do so

## Fix

see if its possible to attach event lsitener to className

fix broken test-1.html

isValue of undefined: listen to path with param, then $.drop property -> isValue of undefined
             in get     if(!is$ && isPreferValue && $.isValue) { 

oo.html(....) oo.clear() // err does not clear html content  only removes children()

$.assign notifierar inte prop lyssnare

since children is used to create ref, you get ref already exists: reproduce:
    (A) add: ref 0 -> 1  (B) add: ref 1 -> 2  (C)destroy first   (D) add: ref 1 -> 2 // err because 2 already created in B. 
    ? just increment counter? ? check for un-used ref ? random

if one adds a `x('hello')`  hence does not provide cbowner and its is NOT the parent adding the cb,
    program will fail to remove this listener (since its the removal of the parent that will remove the listener).
    ? fix   ask merlin to use his magic to somehow "know" which is the one doing making the listening.
                it can not be the child because it does not know, browser call does not work.
                    its nice to be able to do oo(Tug).yay(() => {}); so stuff like this is ugly: oo(Tug).yay(encapsulate(() => {}));

director enter/exit does not work on server rendering (easy to fix, see comments inside function)

refs are NOT unique, because root is not unique
    ? fix   make r/4/4/8 hidden and use hashcode (copied from internet) in DOM elem.
                even br needs a ref, because of server rendering
    ? fix   make every ref unique by converting to Integer (hash, random, or something... preferably something traceable)

nested elements
    ref
        while the delimiter (r/0/1) is kind of nice, the ref string do grow huge with many nested elements.
            ? fix:  unique integer instead... however, internally the / is used to locate and replace elements etc
    chain
        many nested elements created using chaining do bloat the callstack,
        resulting in increased latency and possibly callstack to big to handle.
            ? fix:  oo('div')(oo => oo('div')('span')) where arrow function is invoked in a setTimeout 
                    and introduced at suitable places. this must also be integrated with promises,
                    to keep the server-rendering featur

# Feature request
documentFragment
    f.oof (should always also be propgated with events etc when ever there is an oo
        oof = (cb) => { 1) elmFragment = document.createDocumentFragment.. cb(oo) appendFragment(elmFragment)

blocking AND non-blocking routes (so that topbar can be added on may different routes)

$.type(path.... // type of entity at path. object, string, boolean, undefined if does not exsist (Object.call)
    can be used to test if path exists

virtual DOM elem that is nameable not visible in HTML:
        oo(createStuff)  <- lower case means it should not create an element at all for this virtual DOM

support for setAttributeNS

# Refactor
-

# Investigate
-

