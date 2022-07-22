#!/bin/bash
DIR="`dirname \"$0\"`"
cd $DIR
mkdir -p ../_dev/cert
cd ../_dev/cert
#pwd
echo "You machine hostname: $HOSTNAME"
openssl req -nodes -new -x509 -keyout server.key -out server.cert
##echo "Enter an unsafe passphrase such as 'dragon' when promted."
##echo $0
##echo $DIR
#openssl genrsa -aes256 -out servername.pass.key 4096
#openssl req -nodes -new -key servername.pass.key -out servername.csr
#openssl x509 -req -sha256 -days 365 -in servername.csr -signkey servername.pass.key -out servername.crt


