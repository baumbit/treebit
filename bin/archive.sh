#!/bin/bash
if [ -z "$1" ] ; then
    echo "Error: you must supply a tag."
    exit
fi
DIR="`dirname \"$0\"`"
cd $DIR/..
ls -la
MILLIS=`date +%s`
FILENAME="treebit-$MILLIS-$1.zip"
mkdir -p ../archive-treebit

zip -rT ../archive-treebit/$FILENAME *

ls -la ../archive-treebit | grep $FILENAME

