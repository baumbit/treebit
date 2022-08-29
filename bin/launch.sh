#!/bin/bash
DIR="`dirname \"$0\"`"
if [ -z "$1" ] ; then
    echo Options: [--help, --simshim, --prod, --dev, --clear]
    echo "--help         Display help pages for Hotel server."
    echo "--prod         Launch Hotel in production mode."
    echo "--dev          Launch Hotel in developer mode."
    echo "--simshim      Launch Hotel in a browser simulated environment."
    echo "--clear-secret Clear default (./_secret) data storage."
    echo "--clear-dev    Clear development (./_dev) environment files."
    echo "--clear-all    Clear all data storages."
    echo ""
    echo "Examples:"
    echo "Launch Hotel in dev mode, with SSL and TOR onion service both disabled: $ ./bin/launch.sh --dev --clearnet=http --tor-port=false"
    echo "Launch Hotel in dev mode, at port 9002 and TOR onion service at default port: $ ./bin/launch.sh --dev --port=9002"
    echo "Launch Hotel in dev mode, at default port and disable TOR: $ ./bin/launch.sh --dev --tor-port=false"
    echo "Launch a simulated environment: $ ./bin/launch.sh --simshim"
    exit
fi

if [ "$1" == "--clear-secret" ] || [ "$1" == "--clear-all" ]; then
    rm -r $DIR/../_secret
    echo Cleared secret files
fi

if [ "$1" == "--clear-dev" ] || [ "$1" == "--clear-all" ]; then
    rm -r $DIR/../_dev
    echo Cleared dev files
fi

if [ "$1" == "--simshim" ] ; then
    cd $DIR/../public
    echo Open Simshim in browser at: http://localhost:9000/app/tree/simshim/
    #python -m SimpleHTTPServer 9000
    # switch depending on python version
    python3 -m http.server 9000
fi

if [ "$1" == "--dev" ] || [ "$1" == "--dev=true" ]; then

    if [ -f "$DIR/../_dev/cert/server.cert" ] && [ -f "$DIR/../_dev/cert/server.key" ]; then
        echo "dev server cert found"
    else
        echo "dev server cert not found. generating one now..."
        bash $DIR/create-server-cert-dev.sh
    fi

    cd $DIR/../public
    echo Server will restart when files in this dir or subdirs are mutated.
    ./app/oo/launch-nodejs-watch.js ./app --trace-uncaught --expose-gc ./app/tree/hotel/server.js "$@"
fi

if [ "$1" == "--help" ] ; then
    cd $DIR/../public
    node ./app/tree/hotel/server.js --help
fi

if [ "$1" == "--prod" ] ; then
    cd $DIR/../public
    echo TODO
fi

