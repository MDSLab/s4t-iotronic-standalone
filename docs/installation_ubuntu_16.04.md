# Stack4Things IoTronic (standalone version) installation guide for Ubuntu 16.04

We tested this procedure on a Ubuntu 16.04 (within a LXD container also). Everything needs to be run as root.

## Install requirements

##### Install dependencies via apt-get
```
apt -y install python-dev libyaml-dev libpython2.7-dev mysql-server nmap apache2 unzip socat bridge-utils python-pip python-httplib2 libssl-dev
```

##### Install Crossbar.io router
```
pip install crossbar
```

##### Install latest NodeJS (and npm) distribution:
```
curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
apt-get install -y nodejs
node -v

npm install -g npm
npm config set python `which python2.7`
npm -v

echo "export NODE_PATH=/usr/lib/node_modules" | sudo tee -a /etc/profile
source /etc/profile > /dev/null
echo $NODE_PATH
```

## Install IoTronic-standalone

You can choose to install IoTronic via NPM or from source-code via Git.

#### Install via NPM
```
npm install -g --unsafe iotronic-standalone

npm install -g node-reverse-wstunnel

```
during the installation the procedure asks the following information:

* Enter network interface: e.g. "eth0", "enp3s0", etc.

* Enter MySQL password: in order to access to "s4t-iotronic" database.




#### Install from source-code

* ##### Install dependencies using npm
```
npm install -g log4js@1.1.1

npm install -g requestify mysql nconf ip express node-uuid autobahn q body-parser ps-node
```

* ##### Setup IoTronic environment
```
mkdir /var/lib/iotronic/
cd /var/lib/iotronic/

git clone git://github.com/MDSLab/s4t-iotronic-standalone.git
mv s4t-iotronic-standalone/ iotronic-standalone

cp /var/lib/iotronic/iotronic-standalone/etc/systemd/system/s4t-iotronic.service /etc/systemd/system/
chmod +x /etc/systemd/system/s4t-iotronic.service
systemctl daemon-reload
systemctl enable s4t-iotronic.service

mkdir /var/lib/iotronic/drivers/
mkdir /var/lib/iotronic/plugins/
mkdir /var/lib/iotronic/schemas/

echo "export IOTRONIC_HOME=/var/lib/iotronic" >> /etc/profile
source /etc/profile
```

* ##### Configure Crossbar.io router
```
mkdir /etc/crossbar
cp /var/lib/iotronic/iotronic-standalone/etc/crossbar/config.example.json /etc/crossbar/config.json
cp /var/lib/iotronic/iotronic-standalone/etc/systemd/system/crossbar.service /etc/systemd/system/
chmod +x /etc/systemd/system/crossbar.service
crossbar check --cbdir /etc/crossbar
systemctl daemon-reload
systemctl enable crossbar.service
```
Please, note that the config.example.json coming with the iotronic-standalone package sets the name of the WAMP realm to "s4t" and the Crossbar.io listening port to "8181". If you want to change such values, please consider that later on you will need to correctly change them in other configuration files.

* ##### Configure Websocket reverse tunnel (WSTT) server
```
cp /var/lib/iotronic/iotronic-standalone/etc/systemd/system/node-reverse-wstunnel.service /etc/systemd/system/
chmod +x /etc/systemd/system/node-reverse-wstunnel.service
systemctl daemon-reload
systemctl enable node-reverse-wstunnel.service
```

* ##### Configure IoTronic-standalone
First of all, you need to import the Iotronic database schema. During the installation of the MySQL package you should have been asked for a database root password. Please, substiture <DB_PASSWORD> with the one you chose. Also, please note that name of the database is set to "s4t-iotronic". If you want to change it, please consider that later on you will need to correctly change it in other configuration files.
```
mysql -u root -p<DB_PASSWORD> < /opt/stack4things/iotronic-standalone/utils/s4t-db.sql
```

Then, copy the example of IoTronic configuration file coming with the package in the correct path. 
```
cp /var/lib/iotronic/iotronic-standalone/lib/settings.example.json /var/lib/iotronic/settings.json
``` 
Please, note that the settings.example.json coming with the iotronic-standalone package sets the IoTronic listening port to "8888", the database name to "s4t-iotronic" (the database server is supposed to be running locally), the WAMP realm to "s4t" (the Crossbar.io WAMP router is supposed to be running locally on port 8181). If you want to change such values, please consider that later on you will need to correctly change them in other configuration files. 

Specify the network interface that IoTronic is supposed to use (e.g., change <INTERFACE> with "eth0").
```
sed -i "s/\"interface\": \"\"/\"interface\":\"<INTERFACE>\"/g" /var/lib/iotronic/settings.json
```

Specify the database password (use the same password you set while installing the MySQL package).
```
sed -i "s/\"password\": \"\"/\"password\":\"<DB_PASSWORD>\"/g" /var/lib/iotronic/settings.json
```



## Start IoTronic-standalone

##### Start services
```
systemctl start crossbar
systemctl start node-reverse-wstunnel

systemctl status crossbar
systemctl status node-reverse-wstunnel
```
Now you are ready to start Iotronic:
```
systemctl start s4t-iotronic

systemctl status s4t-iotronic
```
You can check logs by typing:
```
tail -f /var/log/iotronic/s4t-iotronic.log
```
