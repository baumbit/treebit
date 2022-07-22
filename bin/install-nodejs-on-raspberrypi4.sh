curl -O https://nodejs.org/dist/v16.14.2/SHASUMS256.txt.asc
curl -O https://nodejs.org/dist/v16.14.2/node-v16.14.2-linux-armv7l.tar.xz
shasum -c SHASUMS256.txt.asc
echo "press RETURN to continue (if signature is OK)"
read
sudo tar xvf node-v16.14.2-linux-armv7l.tar.xz -C /opt
sudo mv /opt/node-v16.14.2-linux-armv7l /opt/node
sudo ln -s /opt/node/bin/node /usr/bin/node
sudo ln -s /opt/node/bin/npm /usr/bin/npm
echo "press RETURN to reboot"
read
sudo reboot
