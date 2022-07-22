#!/bin/bash
DIR="`dirname \"$0\"`"
cd $DIR/../
git config --global http.proxy socks5h://127.0.0.1:9050
git config --list
/Applications/Tor\ Browser.app/Contents/MacOS/Tor/tor.real
