#Stack4Things IoTronic (standalone version)

Stack4Things is an Internet of Things framework developed by the Mobile and Distributed Systems Lab (MDSLab) at the University of Messina, Italy. Stack4Things is an open source project that helps you in managing IoT device fleets without caring about their physical location, their network configuration, their underlying technology. It is a Cloud-oriented horizontal solution providing IoT object virtualization, customization, and orchestration. Stack4Things provides you with an out-of-the-box experience on several of the most popular embedded and mobile systems.

IoTronic is the Cloud-side component in the Stack4Things architecture. In this repository you find the standalone version of the IoTronic. It works with the version of the Lightining-rod probe that you can find [here] (https://github.com/MDSLab/s4t-lightning-rod).

##Installation instructions

###Ubuntu with systemd

We tested this procedure on a Kubuntu box version 16.04.

####Install dependencies via apt-get:

```
$ sudo apt-get -y install nodejs nodejs-legacy npm git python-dev libyaml-dev libpython2.7-dev mysql-server nmap apache2 unzip socat bridge-utils python-pip
```

####Install dependencies using pyp:

```
$ pip install httplib2
```

####Install dependencies using npm:

```
$ sudo npm install -g node-reverse-wstunnel requestify mysql nconf ip express uuid autobahn log4js q
```

####Configure npm NODE_PATH variable

```
$ echo "export NODE_PATH=/usr/local/lib/node_modules" | sudo tee -a /etc/profile
$ source /etc/profile > /dev/null
$ echo $NODE_PATH
```

####Install Crossbar.io router

```
$ sudo apt-key adv --keyserver hkps.pool.sks-keyservers.net --recv D58C6920 && sh -c "echo 'deb http://package.crossbar.io/ubuntu xenial main' | sudo tee /etc/apt/sources.list.d/crossbar.list"
$ sudo apt-get update
$ sudo apt-get install crossbar
```

####Install IoTronic

```
$ sudo mkdir /opt/stack4things
$ cd /opt/stack4things
$ sudo wget https://github.com/MDSLab/s4t-iotronic-standalone/archive/master.zip
$ sudo unzip master.zip && sudo rm master.zip
$ sudo mv s4t-iotronic-standalone-master/ iotronic-standalone
$ sudo cp /opt/stack4things/iotronic-standalone/etc/systemd/system/s4t-iotronic.service /etc/systemd/system/
$ sudo chmod +x /etc/systemd/system/s4t-iotronic.service
$ sudo systemctl daemon-reload
$ sudo systemctl enable s4t-iotronic.service
```

####Configure and start Crossbar.io router

```
$ sudo mkdir /etc/crossbar
$ sudo cp /opt/stack4things/iotronic-standalone/etc/crossbar/config.example.json /etc/crossbar/config.json
$ sudo cp /opt/stack4things/iotronic-standalone/etc/systemd/system/crossbar.service /etc/systemd/system/
$ sudo chmod +x /etc/systemd/system/crossbar.service
$ sudo /opt/crossbar/bin/crossbar check --cbdir /etc/crossbar
$ sudo systemctl daemon-reload
$ sudo systemctl enable crossbar.service
$ sudo systemctl start crossbar
```

####Configure and start Websocket reverse tunnel

```
$ sudo cp /opt/stack4things/iotronic-standalone/etc/systemd/system/node-reverse-wstunnel.service /etc/systemd/system/
$ sudo chmod +x /etc/systemd/system/node-reverse-wstunnel.service
$ sudo systemctl daemon-reload
$ sudo systemctl enable node-reverse-wstunnel.service
$ sudo systemctl start node-reverse-wstunnel
```

####Configure and start IoTronic
This is an example of a minimal configuration compliant with the above installation instructions, i.e., with the MySQL database and the Crossbar.io router installed locally.

```
$ mysql -u root -p<DB_PASSWORD> < /opt/stack4things/iotronic-standalone/utils/s4t-db.sql
$ sudo cp /opt/stack4things/iotronic-standalone/lib/settings.example.json /opt/stack4things/iotronic-standalone/lib/settings.json
$ sudo sed -i "s/\"interface\": \"\"/\"interface\":\"<INTERFACE>\"/g" /opt/stack4things/iotronic-standalone/lib/settings.json
$ sudo sed -i "s/\"password\": \"\"/\"password\":\"<DB_PASSWORD>\"/g" /opt/stack4things/iotronic-standalone/lib/settings.json
$ sudo sed -i "s/\"db_name\": \"\"/\"db_name\":\"<DB_NAME>\"/g" /opt/stack4things/iotronic-standalone/lib/settings.json
$ sudo sed -i "s/\"realm\": \"\"/\"realm\":\"<WAMP_REALM>\"/g" /opt/stack4things/iotronic-standalone/lib/settings.json
$ sudo systemctl start s4t-iotronic
```
