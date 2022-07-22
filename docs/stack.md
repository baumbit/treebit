Architecture:
    Node; typically implented in NodeJS or Simshim (aka SimshimNode):
        Contains:
            One instance of Canopy (lufo/API for data).
            One instance of Grapevine
                Exchanges data (Tree content etc) with other Nodes (aka Peers) using a node-api
            One "Profile"
                A profile is tied to a unique server instance.
                Contains:
                    Treehut server credentials (login, network protocol/address).
                    Hub/Visibility (clearnet, TOR, indexable by search engines etc).
                    Journal
                        Datastructure used to keep track of "what and which order" profile have looked at notes
                        hence it is a browsing history (but these concepts are to easily confused with browser terminology)
                        it does NOT know about note content, or which notes are connected to which.
            One cabinet
                    Controlled signers (signers with private keys).
                        Private keys may be stored only on client and never uploaded to server
                        (hence a Hotel will not be able to control signers)
    Treehut; graphical user interface only, typically implemented as a WebTreehut.
        Contains:
            One instance of a Graphical user interface
    WebTreehut; a node and a Treehut implementation
        Contains:
            One instance of a Node.
                Includees a grapevine-api for Treenet content (Signers, Notes, etc)  sharing.
            One or several instances of a Treehut web browser client,
                    typically singlepage web app, pre-rendered on server and assets served by server to browser client.
                Includes a client-side resource-client for talking to the resource-api on server,
                    and used for serving both app data and Treenet content (Signers, Notes, etc.), to the client.
    Hub:
        A publically available/discoverable Node, hence likely indexable by search engines (i.e. offers a webpage).
        Likely an archive run by a special interest entity and a hub in a sub-network of special interest group.
        Contains:
            One instance of a WebTreehut (or equivalent) with server-side rendering.
                Visitors of WebTreehut are likely to not have login credentials (hence only read access).
    Hotel:
        Offers WebTreehut as a service.
        Contains:
            Zero or more Hubs.
            Zero or more (private) WebTreehuts.
    Tronhut:
        Electron desktop client.
        Contains:
            WebTreehut
    Simshim (Browser JS shiming: network communication
        Browser virtualization of zero or more WebTreehut.
        Simulate network communication.

Nomenclature:
    "new"(post) | grow(post) / echo(repost)
    Card
        a server composed object.
        client could potentially create the card itself, but having the server do it limits roundtrips.
    Network node
        a foregin/unkown network node. even if its online, it is considered "disconnected"
        (note, do not confuse with a tree node)
    Note TODO REFACTOR TO BRANCH
        consists of data and metadata
        may or may not be signed by a signer
        a note which has not been signed, should be rejetcted by the network consensus
    (Note) Node
        consists of a signed note and tree metadata
        (note, do not confuse with a network node)
    nrl
        node resource locator. container object for cn (clearnet) and onion (tor) addresses.

    Peers
        a network node which has been added to list of peers.
        note, a peer that is offline is still considered "connected"
    "res/"
        a client resource that can be downloaded from server and oftentimes stored/cached on client.
        a resource is typically data from server, either composed (such as a Card) or raw wrapped data.
    Tree
        asyclic tree graph datastructure of note nodes.
        requres at least one node
        it may or may not have a parent (because even if there is a parent, it may not have been downloaded/discovered yet.
        it may or many not have one or several child parents

