# Treebit

Cryptography is strongly associated with privacy, anonymity and secrecy.
While users of Treebit can remain anonymous the focus of Treebit is on creating a public, fully transparent and secure open network.
The intended purpose is to provide a communication utility for society, that enables a stream of high quality information and the substrate for a healthy public dialog.


## The problem
A major issue is plaguing internet based social networks: they are susceptible to spam.

Arguably many of the common solutions to this problem, births a whole range of problems and questionable practises.

But let's take if from the start.
The problem is: there is no objective definition of spam.
What to some is of importance, someone else will consider being off-topic or spam.
Yet, somehow we must create an arbitrary filter anyway, otherwise communication will not be possible due to the information overload.

The natural first defence against spam, is to demand that users create an accounts which the social network service provider then controls.
While the provider can not control a user, the account itself can be controlled and thus the action of the user on the network.
Hence the service is no longer only an enabler, but also a disabler.
Oftentimes the ability to block, restrict or otherwise control the actions of a user, is outsourced to moderators.
The moderators are then granted special privilege to uphold the rules governing the community.
And through these kinds of means, spam can be limited.

There are several downsides to this approach.
Some of these are:
The user is not longer in full control of the user account.
Messages can be spoofed by the provider.
A user can be shadow banned or be put in a digital prison.
Content moderation is arbitrary and subject for endless debates.
And much more.

To sum it up.
While everyone want the means to be able to post whatever content they themselves feel like, everyone prefers a moderated stream of high quality content. Basically the user wants to both have the cake and eat it too, because there is no solution to this paradox. Or is there?


## The solution
Treebit is just a protocol.
Since it's a protocol, anyone can implement it in code and thus nobody can own other users accounts.
Since no one can own the accounts, no one can control them or the network that is created by the participants.
Since no on can control the network, users are free to spam as much as they want.
However, the protocol is designed in such a way that the messages that most people find most valuable are retained the longest and spread the widest.
This is achieved by means of a crowd sourced scoring mechanism.
All messages gets a score that serves the purpose of being a subjective local source of truth.
Since value is subjective, one user might put a higher score on certain messages and another user might score differently.
The network participants (here on after referred to as peers) exchanges these scores with oneanother.
Those messages that all peers have given a high score, will be propagated first.
In one group of peers, certain messages will be the most favoured.
In another group of peers, other message will be those with the highest score.
A messages that receive very low score will not be propagated at all.
This way most of the spam is filtered out of existence, because it will never even be propagated.


### The filtering functions
There are three primary filtering functions at work in Treebit:
Peer graph, content scoring and following.
The basic proposition is that: a user can post what ever the user wants, but only if it's valuable will it be propagated.


#### Peer graph
The most important filtering function is the peers your node is connecting too, because these are the sources for content.
It's the most important filtering function, because the peers can only relay the conent they themselves have.
This implies that it is very important which peers your node is connected to.
The more peers a node have, the less of a limiting factor is has.
There is no protocol defined upper limit as to how many peers a node can connect to.


#### Content scoring
Content with a high score is prioritised.
There is no objective true score.
A node internally arrives at a score, by sourcing scores from its peers and doing some scoring of its own.
Note that peers may have different implementation of the Treebit protocol and thus calculate the score differently.
A badly behaving peer might even score content to intentionally filter out certain content.
This is however a feature and not a bug.
All peers are supreme rulers in their own domain and may set whatever score they want.
But equally so, nodes will favour conncetions with peers from whom they get the highest quality content.
Peers which are not propagating good content, will be dropped.


#### Following
Finally content which the user is more intrested in, will be favoured.
A user can follow other users, which further filters out what information a node will be downloading and then broadcasting.


### The two networks
There are two different kinds of networks at play.
There is the data exchange network, that is created when the nodes become peers and exchanging content.
And then there is the social network, that is created by users following each others.
Finally these two networks (data and social) can interleave, by users that follow eachother socially also connect their nodes.


## A protocol that rewards good behaviour
A feature of the protocol design, is that everyone is free, there are no set rules and basically anarchy can reign supreme.
However because of the natural incentives designed into the protocol, cooperation and good behaviour is rewarded.
Users creating highly valuable content will be rewarded, by getting followers.
There are no real punishments per se built into the protocol.
But because bad behaviour is not rewarded, badly behaving agents will be outcompeted by the good.
What is good and what is bad is subjective, the Treebit protocol version itself that attracts the most users, will create the biggest network.
And the biggest network, will achieve the greatest network effect.

