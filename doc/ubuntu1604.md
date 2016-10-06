#Ubuntu 16.04 Stack4Things IoTronic (standalone) installation guide.

We tested this procedure on a Kubuntu 16.04. Everything needs to be run as root.

####Install dependencies via apt-get:

```
# apt-get -y install nodejs nodejs-legacy npm python-dev libyaml-dev libpython2.7-dev mysql-server nmap apache2 unzip socat bridge-utils python-pip python-httplib2
```

####Install dependencies using npm:

```
# npm install -g npm
# npm install -g node-reverse-wstunnel requestify mysql nconf ip express uuid autobahn log4js q
```

####Configure npm NODE_PATH variable

```
# echo "export NODE_PATH=/usr/local/lib/node_modules" | sudo tee -a /etc/profile
# source /etc/profile > /dev/null
# echo $NODE_PATH
```

####Install Crossbar.io router

```
# apt-key adv --keyserver hkps.pool.sks-keyservers.net --recv D58C6920 && sh -c "echo 'deb http://package.crossbar.io/ubuntu xenial main' | sudo tee /etc/apt/sources.list.d/crossbar.list"
# apt-get update
# apt-get install crossbar
```

####Install IoTronic

```
# mkdir /opt/stack4things
# cd /opt/stack4things
# wget https://github.com/MDSLab/s4t-iotronic-standalone/archive/master.zip
# unzip master.zip && sudo rm master.zip
# mv s4t-iotronic-standalone-master/ iotronic-standalone
# cp /opt/stack4things/iotronic-standalone/etc/systemd/system/s4t-iotronic.service /etc/systemd/system/
# chmod +x /etc/systemd/system/s4t-iotronic.service
# systemctl daemon-reload
# systemctl enable s4t-iotronic.service
```

####Configure and start Crossbar.io router

```
# mkdir /etc/crossbar
# cp /opt/stack4things/iotronic-standalone/etc/crossbar/config.example.json /etc/crossbar/config.json
# cp /opt/stack4things/iotronic-standalone/etc/systemd/system/crossbar.service /etc/systemd/system/
# chmod +x /etc/systemd/system/crossbar.service
# /opt/crossbar/bin/crossbar check --cbdir /etc/crossbar
# systemctl daemon-reload
# systemctl enable crossbar.service
# systemctl start crossbar
```
Note that the config.example.json coming with the iotronic-standalone package set the name of the realm to "s4t" and the listening port to "8181". If you want to change such values please consider that later on you would need to correctly change them in other configuration files. 

####Configure and start Websocket reverse tunnel

```
# cp /opt/stack4things/iotronic-standalone/etc/systemd/system/node-reverse-wstunnel.service /etc/systemd/system/
# chmod +x /etc/systemd/system/node-reverse-wstunnel.service
# systemctl daemon-reload
# systemctl enable node-reverse-wstunnel.service
# systemctl start node-reverse-wstunnel
```

####Configure and start IoTronic
This is an example of a minimal configuration compliant with the above installation instructions, i.e., with the MySQL database and the Crossbar.io router installed locally.

```
Import the Iotronic DB schema:
# mysql -u root -p<DB_PASSWORD> < /opt/stack4things/iotronic-standalone/utils/s4t-db.sql

# cp /opt/stack4things/iotronic-standalone/lib/settings.example.json /opt/stack4things/iotronic-standalone/lib/settings.json

Specify the server's NIC used by Iotronic:
# sed -i "s/\"interface\": \"\"/\"interface\":\"<INTERFACE>\"/g" /opt/stack4things/iotronic-standalone/lib/settings.json

Specify DB references:
# sed -i "s/\"password\": \"\"/\"password\":\"<DB_PASSWORD>\"/g" /opt/stack4things/iotronic-standalone/lib/settings.json
# sed -i "s/\"db_name\": \"\"/\"db_name\":\"s4t-iotronic\"/g" /opt/stack4things/iotronic-standalone/lib/settings.json

Specify the WAMP realm (e.g. "s4t"):
# sed -i "s/\"realm\": \"\"/\"realm\":\"<WAMP_REALM>\"/g" /opt/stack4things/iotronic-standalone/lib/settings.json

Start Iotronic:
# systemctl start s4t-iotronic
# tail -f /var/log/s4t-iotronic.log
```
