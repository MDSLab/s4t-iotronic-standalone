#Ubuntu 14.04 Stack4Things IoTronic (standalone) installation guide.

We tested this procedure on a Ubuntu 14.04 server. Everything needs to be run as root.

####Install dependencies via apt-get:

```
$ apt-get update
$ apt-get install npm nodejs nodejs-legacy git python-dev libyaml-dev libpython2.7-dev mysql-server-5.6 nmap apache2 unzip socat bridge-utils python-pip
```

####Install dependencies using pyp:

```
$ pip install httplib2
```

####Install dependencies using npm:

```
$ npm install -g node-reverse-wstunnel requestify mysql nconf ip express uuid autobahn log4js q
```

####Configure npm NODE_PATH variable

```
$ echo "export NODE_PATH=/usr/local/lib/node_modules" >> /etc/profile
$ source /etc/profile > /dev/null 
$ echo $NODE_PATH

```

####Install Crossbar.io router

```
$ apt-key adv --keyserver hkps.pool.sks-keyservers.net --recv D58C6920 && sh -c "echo 'deb http://package.crossbar.io/ubuntu trusty main' > /etc/apt/sources.list.d/crossbar.list" 
$ apt-get update
$ apt-get install crossbar

```

####Install IoTronic

```
$ mkdir /opt/stack4things
$ cd /opt/stack4things
$ wget https://github.com/MDSLab/s4t-iotronic-standalone/archive/master.zip
$ unzip master.zip && sudo rm master.zip
$ mv s4t-iotronic-standalone-master/ iotronic-standalone
$ cp /opt/stack4things/iotronic-standalone/etc/init.d/s4t-iotronic /etc/init.d/
$ chmod +x /etc/init.d/s4t-iotronic
$ sed '/^ *#/b; s%exit 0%/etc/init.d/crossbar start\n/etc/init.d/s4t-iotronic start\nexit 0%g' /etc/rc.local
```

####Configure and start Crossbar.io router

```
$ mkdir /etc/crossbar
$ cp /opt/stack4things/s4t-iotronic-standalone/etc/crossbar/config.example.json /etc/crossbar/config.json
$ cp /opt/stack4things/s4t-iotronic-standalone/etc/init.d/crossbar /etc/init.d/
$ chmod +x /etc/init.d/crossbar
$ /opt/crossbar/bin/crossbar check --cbdir /etc/crossbar

IF NEEDED:
$ /opt/crossbar/bin/crossbar upgrade --cbdir /etc/crossbar

$ /etc/init.d/crossbar enable
$ /etc/init.d/crossbar start [stop|restart|status]
```

####Configure and start IoTronic
This is an example of a minimal configuration compliant with the above installation instructions, i.e., with the MySQL database and the Crossbar.io router installed locally.

```
Import the Iotronic DB schema:
$ mysql -u root -p<DB_PASSWORD> < /opt/stack4things/iotronic-standalone/utils/s4t-db.sql

$ cp /opt/stack4things/iotronic-standalone/lib/settings.example.json /opt/stack4things/iotronic-standalone/lib/settings.json
$ mkdir /opt/stack4things/iotronic-standalone/drivers/

Specify the server's NIC used by Iotronic:
$ sed -i "s/\"interface\": \"\"/\"interface\":\"<INTERFACE>\"/g" /opt/stack4things/iotronic-standalone/lib/settings.json

Specify DB references:
$ sed -i "s/\"password\": \"\"/\"password\":\"<DB_PASSWORD>\"/g" /opt/stack4things/iotronic-standalone/lib/settings.json
$ sed -i "s/\"db_name\": \"\"/\"db_name\":\"s4t-iotronic\"/g" /opt/stack4things/iotronic-standalone/lib/settings.json

Specify the WAMP realm (e.g. "s4t"):
$ sed -i "s/\"realm\": \"\"/\"realm\":\"<WAMP_REALM>\"/g" /opt/stack4things/iotronic-standalone/lib/settings.json

Start Iotronic:
$ /etc/init.d/s4t-iotronic start
$ CHECK: tail -f /var/log/s4t-iotronic.log
```
