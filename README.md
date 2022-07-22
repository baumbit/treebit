Together we are distributed.
Please fork the project now!

# Treebit
Welcome to Treebit, a user-centric peer-to-peer social network, based on voluntary co-operation.
This project is written in vanilla JavaScript, but developers are encouraged to implement Treebit in other languages.

## How do I start the app?
First read [./docs/install.md](./docs/install.md) then run ./bin/launch.sh.

## How do I start developing?
See [./docs/development.md](./docs/development.md).

## What is Treebit?
Treebit is an open protocol, with the purpose of fascilitating information sharing between users.
When users of Treebit share information, they create a social network.
Such a network participant is referred to as a node and its connected nodes are referred to as its peers.
The network is a peer-to-peer network.
Put Twitter, Git, Bitcoin, Lighning Network, Patreon and Torrent in a blender, mix it and you got Treebit.
Treebit is one hundred percent based around incentive models.

### What makes Treebit different from other peer-to-peer networks?
Treebit is designed to put the individual user first and above all else.
Hence a Treebit user is encouraged to run what ever Treebit application is to her/his/its own liking.
A Treebit user is encouraged to build, change and contribute their own code.
Users are even encouraged to make changes to the Treebit protocol.
It needs to be emphasized, Treebit is incentive driven.
If a node wants to interface with another node, they have to speak the same protocol to be able to share information.
If a node wants to propagate certain information as wide as possible in the network, the messaging format must match the rest of the network.

### Where is the information stored?
The Treebit network is a true peer-to-peer network.
This implies that there is no central server or other central place where all the information is stored.
Hence only the information retained by the network itself, will be available to its peers.
A node is unlikely to have all the information that is created by all the network participants for at least two reasons.
First, a node is unlikely to be able to store that much data. Secondly, is unlikely that a node will receive all the data.

### How is information created?
All that is needed to post new information to the network, is a private key.
The information is encapsulated, submitted and propagated in the network in the form of a unqiue message.
When the message is created, its is saved locally as a "note".
A note contains the actual content and some meta data.
Most importantly the note is signed by the private key.
This way it is mathematically provable which content is created by the same signer.
Content creaters are therefor referred to as signers.
You do not neeed to ask for permission to create a new user/signer on the network.
You do not depend on the goodwill of a server to create new content.
However, if you want the network to propagate your message to as wide an audience as possible.
The network will store as many copies of the note, as the network finds it valuable to do so.
Highly valuable content will hence be more likely to be discovered, propagated and stored.
Since value is subjective, not everyone will store everything.

### How is the information propagated?
A note can be created by any means.
A note can even be created on an air-gapped/offline computer, copied to a USB-stick and then be passed on to the network via an online computer.
An application running the Treebit protocol and connected to the network is referred to as a node.
A node is connected to those peers on the network, that it knows about and derives the maximum value from being connected to.
A node is hence incentivized to supply its connected peers with the information that it think its peers will value the most.
Think of a node as a continously updating filtering function, that reduce its information set and pass on only that which it think its peers will find valuable.
A node therefor has a self-interest in actively seeking out novel information.
Treebit encourages this behaviour and provides the means of letting signers publish information that makes it easier to find their content.

### What about network and information partitioning?
The network can be partioned in two ways.
Since there is no list of the nodes on the network, there is no real upper-bound to how many different networks can exist separate from one another.
And even if there was only one network, where all nodes at least indirecly were connected to eachother, since nodes reduces the available information, content may be "locked up" in sub-networks.
Both of these issues are resolved by public nodes that serve as massive information respositories, referred to as hubs.
A hub serve as a bridge between partioned networks and "locked up" information.
An entity may run a hub because it has an economic, ideologic or other incentive to do so.
A hub may also decide expose its content to search engine crawlers and/or offer deep linking.
There is no restriction on who can decide to turn their node into a hub.

### How do I create a profile?
In Treebit there are not user accounts, only signers and a signer is that which have signed a note with its private key.
A signer can also sign a message containing meta-data about itself, this is referred to as a signer profile.
The signer profile is timestamped and be propagated on the network.
The profile may contain onion/IP-address.
These adddresses may (or may not) point to resources that the signer is in control of.
It could for instance point to a Treebit node, Lightning Node or a homepage.
It is likely that a signer wants to propagate her/his/its content and hence point to a node with this content.
It is also possible that these addresses points to servers offering non-Treebit APIs.

## Technology
The project is written in vanilla JavaScript.
To reduce attack surtface, it uses as few third-party dependencies as possible.
It is written in JS, primarily because that is what baumbit knows the best, hence can produce a proof-of-concept/prototype with the least effort.
Another reason for selecting JavaScript is also that there is a lot of people that knows how to program JavaScript.
People that prefer to program in other languages and think JavaScript suck, never the less often understands JavaScript.
If someone forks this project and creates a better implementation, I will consider that a huge win and success.
Treebit is not "about me", so please make something better then what I can do!

### The stack
Treebit is the protocol.
A node implements the protocol and connect to other nodes, referred to as its peers.
Typically a node runs in the cloud, a personal computer or similar.
A node exposes only an API, through which it may communicate with its peers and clients.
A client offers a human-friendly interface to browse information stored in a node, which is acting as a server to the client through its API.
Since a node is a headless server, an application is needed for humans and typically this is an App on your smart phone.
A node that handles many connections and stores massive amount of data is called a hub.

### Note
A note may contain a light text and/or an attachment.
Treebit only propagate notes and signer profiles, it does NOT propagate attachments.
Attachments are posted as magnetic-links and shared using the Torrent protocol.

### Comparisons to other peer-to-peer networks

Maybe its easier to understand what Treebit is, by comparing it to similar technologies.

#### Twitter
Treebit is similar to Twitter, because a note contains a light text and a binary can be attached.
It is different, because there is no central server trying to figure out what kind of content you should see.
There is no centralized mechanism for censoring, instead each participant choose what information to reveal to its peers.

#### Git
It is similar to Git, because a note is either a root note, or a branch of a parent note.
Another similarity is that a note can have an un-limited number of children.

#### Bitcoin
It is different because Bitcoin has a token called BTC and Treebit has NO token.
They are the same in that both are open source projects and non of them are scams.
It is very different from Bitcoin, because in Bitcoin the full blockchain has value, whereas in Treebit the information is distributed and some information will be dropped and forgotten when no node finds if valuable any longer.

#### Lightning Network
It is similar in that different nodes may be running (slightly) different protocols.
It is different, because the purpose of Treebit is not to be moving money around.
However users may very well be using Treebit in combination with Lightning Network, to monetize content, etc.

## Attacks

### DDoS
While peer-to-peer networks are notoriously hard to shutdown, the individual nodes less so.
Especially publicly facing hubs and signers running publically known hubs, are at great risk of DDoS-attacks.
However a node can always update its profile and point to new addresses, not yet under attack.
A user can also be running duplicate nodes connected to the network, but choose to reveal only a subset of them in a signer profile.
This way the content may be propagated using this hidden nodes, rendering the DDoS-attack less effective and hence more costly.

### SPAM
In Treebit there is no such thing as spam, only more or less valuable information.
If a user configures her/his/its node to only propagate pictures of cats, this node will become attractive to users who love cats.
Those who do not like cats, are less likely to propgate this to its peers (if they dont happen to be obbesive intrested in it).
Basically, the value of information is subjective and hence users who share common values will tend to group.
Note that a user that have many interests, is likely to belong to many groups.

### Privacy
Signers are pseudonymous, untill they can provable tie their private key to their true identity.
The later can be done by signing a message and posting it on Treebit Hub specializing on KYC, Twitter, Facebook or similar.
A user concerned with privacy should expose her/his/its node only on the TOR network.
Note: a signer does NOT need to run a node. It is possible to create and sign a note offline and publish it using someone elses node.

## License
MIT License

