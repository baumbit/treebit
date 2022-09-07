#!/bin/bash
DIR="`dirname \"$0\"`"
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
RESET='\033[0m'
if [ -z "$1" ] ; then
    echo -e "Will now start ${MAGENTA}Treebit Hotel${RESET} using a default setup..."
    sleep 1
    if ! [ -x "$(command -v tor)" ]; then
        echo -e "${RED}Error:${RESET} The default configuration depends on TOR, but TOR was not found!"
        echo -e "To install TOR, see: ${CYAN}./docs/install.md${RESET}"
        echo -e "To run without TOR (not recommended): $ ${CYAN}./launch.sh --tor-port=false${RESET}"
        echo -e "For more options, see help: $ ${CYAN}./launch.sh --help${RESET}"
        exit 1
    fi
    echo -e "Please see help for more options: $ ${CYAN}./launch.sh --help${RESET}"
    sleep 2
fi

if [ "$1" == "-h" ] ; then
    echo "Use --help"
    exit
fi

if [ "$1" == "--help" ] ; then
    echo -e "${MAGENTA}Treebit Hotel${RESET}"
    cd $DIR/public
    node ./app/tree/hotel/server.js --help
    echo ""
    echo -e "${MAGENTA}Launch script${RESET}"
    echo Launch script options: [--help, --simshim, --prod, --dev, --clear]
    echo "    --help         Display help pages for Hotel server and this launch script."
    echo "    --dev          Launch Hotel in developer mode (default mode it production)."
    echo "    --simshim      Launch Hotel in a browser simulated environment."
    echo "    --clear-secret Clear default (./_secret) data storage."
    echo "    --clear-dev    Clear development (./_dev) environment files."
    echo "    --clear-all    Clear all data storages."
    echo ""
    echo "Examples:"
    echo -e "Launch Hotel in dev mode, with SSL and TOR onion service both disabled: ${CYAN}$ ./launch.sh --dev --clearnet=http --tor-port=false${RESET}"
    echo -e "Launch Hotel in dev mode, at port 9002 and TOR onion service at default port: $ ${CYAN}./launch.sh --dev --port=9002${RESET}"
    echo -e "Launch Hotel in dev mode, at default port and disable TOR: $ ${CYAN}./launch.sh --dev --tor-port=false${RESET}"
    echo -e "Launch a simulated environment: $ ${CYAN}./launch.sh --simshim${RESET}"
    exit
fi

if [ "$1" == "--clear-secret" ] || [ "$1" == "--clear-all" ]; then
    rm -r $DIR/_secret
    echo Cleared secret files
fi

if [ "$1" == "--clear-dev" ] || [ "$1" == "--clear-all" ]; then
    rm -r $DIR/_dev
    echo Cleared dev files
fi

if [ "$1" == "--simshim" ] ; then
    cd $DIR/public
    echo Open Simshim in browser at: http://localhost:9000/app/tree/simshim/
    #python -m SimpleHTTPServer 9000
    # switch depending on python version
    python3 -m http.server 9000
fi

if [[ "$@" =~ "--clearnet=https" ]] ; then
    if [ "$1" == "--dev" ] || [ "$1" == "--dev=true" ]; then
        if [ -f "$DIR/_dev/cert/server.cert" ] && [ -f "$DIR/_dev/cert/server.key" ]; then
            echo "dev server cert found"
        else
            echo "dev server cert not found. generating one now..."
            bash $DIR/bin/create-server-cert-dev.sh
        fi
    else
        echo "TODO create cert for production env"
    fi
fi

if [[ "$@" =~ "--dev" ]] ; then
#if [ "$1" == "--dev" ] || [ "$1" == "--dev=true" ]; then
    cd $DIR/public
    echo Server will restart when files in this dir or subdirs are mutated.
    ./app/oo/launch-nodejs-watch.js ./app --trace-uncaught --expose-gc ./app/tree/hotel/server.js "$@"
    exit
fi

echo "TODO run production"
cd $DIR/public
node --expose-gc ./app/tree/hotel/server.js "$@"

