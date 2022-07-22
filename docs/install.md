# Install

The source code in this project has zero package dependencies, so there is no neeed to install any packages.
It does however depend these third-party softwares: NodeJs and TOR (optional).

When you have installed the dependencies, run this command for more information on how to start the app:
$ ./bin/launch.sh --help

## NodeJs
Node is required to serve Treehut Hotel.

To run the Treehut Hotel you first need to install:
https://nodejs.org


## Tor
Tor is optional, but if you want to publish the Treehut Node on the Tor network, you need to install:
https://www.torproject.org

TODO Its optional, but possible limit connections to the onion service to athorized clients only.

(Optional) Monitor TOR:
https://nyx.torproject.org/#download

## MacOS
To install Tor on MacOS you first need to install brew: https://brew.sh
$ /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

Install Tor using brew:
$ brew install openssl@3

TODO (Optional: client authorization) Openssl on MacOS does not support algorithm x25519, install:
TODO $ brew install openssl
TODO do this in nodejs script (tor.js): https://community.torproject.org/onion-services/advanced/client-auth/ 

## Raspberry PI 4
To install NodeJs;
@see tree/bin/install-nodejs-on-raspberrypi4.sh

To install Tor:
$ sudo apt-get install -y tor

