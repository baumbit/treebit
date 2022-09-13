# Install

The source code in this project has zero package dependencies, so there is no neeed to install any packages.
It does however depend on some third-party softwares: NodeJs (required), TOR (optional) and OpenSSL (optional).

When you have installed the dependencies, run this command to launch the Treebit Hotel and follow the instructions:
$ ./launch.sh

* NodeJs (https://nodejs.org)
Always required to serve Treehut Hotel.

* TOR (https://www.torproject.org): Optional but required for Tor network
Tor is optional, but if you want to publish the Treehut Node on the Tor network.

* OpenSSL
Optional but required to develope on mobile phone and/or make the Treehut Hotel available on internet.


## MacOS
To install Tor and OpenSSL on MacOS you first need to install brew: https://brew.sh
$ /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

### Tor on MacOS
Install Tor using brew:
$ brew install tor

Optional: you can limit which clients can connect to your tor onion service, but Openssl on MacOS does not support algorithm x25519 so do this:
$ brew install openssl@3
Then see: https://community.torproject.org/onion-services/advanced/client-auth/ 

### OpenSSL on MacOS
$ brew install openssl@3


## Raspberry PI 4
To install NodeJs;
$ ./bin/install-nodejs-on-raspberrypi4.sh

To install Tor:
$ sudo apt-get install -y tor

