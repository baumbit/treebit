# CHANGELOG
Semantic versioning - Date

## v - date
### Added
- oo.onchild. Will be invoked when new child is added, but  depends on function being set manually (example: "oo.onchild = function({oo}){};").
- snatch. Session (user sign-in/refresh, CSRF, BAM) handling for server/client.
- utils. Generic utilities.
- buckettree-db.js A simple key-value database (v0.0.26) (@see example-buckettree-db.js).
- OO.count. Number of root OO created and never destroyed.
- oo.context.destroyAsync(cb) and oo.context.onDestroy.
- oo.$.remove.
- oo.expose. Accepts an array of named functions. (@see example-1.html).
- Tug.tugtag. Overides function name, for setting tag name (@see example-1.html).
- resource router route pre-processing using shim (@see example-webapp/server.js).
- ooptions.baseUrl:string. Enables relative HREF in links, to be routed correctly internally.
- oo.context.router.reload, will reload the current route.
- oo.context.setHeadlessHistory to primarily fasclitate server-side routing.
- oo.context.asHtml. Support server-side HTML rendering.
- oo.context.addBootloader. (@see example-nodejs-1.js).
- VirtualElement.asHtml in OO to create virtual DOM tree in NodeJS and HTML rendering of element and child elements.
- ooptions.renderVirtual:boolean. When true bind to VirtualElement.
- OO(..., {refPrefix: 'rFoo'}) to support multiple instances of OO in same browser window.
- oo.attr(k, v). Use instead of oo.elm.setAttribute to ensure proper server-side rendering.
- oo.timer (@see example-1.html)
- resource-oo.js, added a response object to resource callbacks.
- oo.on((on)=>on(path, ...)). DOM is preserved but expression is replaceable which is suitable for variabel paths. (@see example-1.html)
- oo.oninputed. triggers on input losing focus with changed value.
- oo.onevent(eventType, vb)
- oo.context.deep. Deep clone object. (example: oo.context.deep({a:1, b:2}, {c:3, b:4}) result: {a:1,b:4,c:3})
### Changed
- resolvePromisesAsync (deprecated resolvePromises).

## v0.0.1-0.34 - Thu Apr  8 12:15:54 CEST 2021
### Added
- example-todo.js
- resource-oo.js (@see example-10.html)
- Tug return value. If not undefined it will escape OO chaining (example: const Mytug = () => return 'hello';)
- OO options now takes a globalProps that can be override. (@see example-1.html for demonstration)
- oo.route now support non-blocking routes (@see example-5.html). Blocking is default.
- oo.route hints now includes synthetic flag, inidcating whether browesr buttons were used or oo.go/oo.back).
- oo.$.shake added. Invoking shake will delete object and listeners from store, if and only if there is no listeners on the path.
- cue actuator options. Enables interactive transitions (@see example-5.html).
### Changed
- oo.onResolved replaced with oo.addPromise added, supporting external Promises and ability to be notified when Promises are resolved (oo.resolvePromises(cb)).

## v0.0.1-0.24 - Thu Oct 15 09:32:43 CEST 2020
### Added
- example-7.html demonstrating the power of "when" option in .on.
### Fixed
- missing return values on multi-parameterized expressions.

## v0.0.1-0.23 - Tue Oct 13 12:36:34 CEST 2020
### Added
- oo.className and oo.classList when support.
- oo.className signature (supports: oo.classList({add:'myclass'}); oo.classList({remove:'myclass'});).
- act signature changed (supports: regenerate, autoId).
- oo.on when options now allow transforms (see example-1.html) (example: .on('foo/bar', {when:{true:{Tug, props:{....).
### Changed
- createAct renamed to createCue.
### Fixed
- oo.go hints route handler propagation.
- oo.on same value propagation (note: object always propagate).
### Removed

## v0.0.1-0.21-15 - Thu Oct  8 08:26:20 CEST 2020
### Added
- oo.go.back
- oo.go hints argument (example: go('my/path', 'Thetitle', {swipe:'left'});).
- oo.on option argument accepts when (.on(PATH, {when:[Boolean,String,'hello',42]}.... .on(PATH, {when:'world'}....).
- oo.on invoked on a path with no data attached to it (use: .on(PATH, {when:undefined}....).
### Changed
- oo.classList, oo.className signatures.
- oo.transition signature.
### Fixed
### Removed

## v0.0.1-0.21-14 - Sat Oct  3 16:02:12 CEST 2020
### Added
- oo.classList.
### Changed
- OO createAct function deprecations.
- OO createStage changed to createAct.
### Fixed
- oo.className now behaves more like className.
### Removed

## v0.0.1-0.21-13 - Fri Oct  2 13:24:21 CEST 2020
### Added
- OO createStage (create/destroy/transition utility).
- oo.children.
- oo.transition (css transition utility).
- oo.store (store listener similar to oo.on, but does not support expressions and listener have to be removed manually).
- Stop onclick bubble event (return false stop bubble, return undefined does not).
- File test-3.html (test speed of store set/listener).
### Changed
- OO route handling is re-written (changes reflected in: example-app-1.html, example-5.html).
- OO onclick signature (favour destructoring).
- OO className signature (supports toggle).
### Fixed
- OO html ref attribute creation.
### Removed
- OO element re-use.

##  v0.0.1-0.21-10 - Thu Sep 24 15:26:54 CEST 2020
### Added
- Browse back, forward handling.
- Prefixed push/replace history state (enables page reload also from file://).
- File example-app-1.html.
- File TODO.md
### Changed
- OO signature, to support OO options.
- Updated test-2.html to reflect broken object tree fix.
### Fixed
- Broken store object tree.
- oo.html, oo.text breaks chain.
### Removed

## v0.0.1-0.21-8 - Thu Sep 24 08:27:14 CEST 2020
### Added
- File CHANGELOG.md

