# Stack4Things IoTronic (standalone version) installation guide for Ubuntu 16.04

We tested this procedure on a Ubuntu 16.04 (within a LXD container also). Everything needs to be run as root.

## Install requirements

##### Install dependencies via apt-get
```
apt -y install python-dev python-setuptools libyaml-dev libpython2.7-dev mysql-server nmap apache2 unzip socat bridge-utils python-pip python-httplib2 libssl-dev libffi-dev
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

echo "export NODE_PATH=/usr/lib/node_modules" | sudo tee -a /etc/environment
source /etc/environment > /dev/null
echo $NODE_PATH
```

## Install IoTronic-standalone

You can choose to install IoTronic via NPM or from source-code via Git.

#### Install via NPM
```
npm install -g --unsafe iotronic-standalone

npm install -g --unsafe @mdslab/wstun
```
during the installation the procedure asks the following information:

* Enter network interface: e.g. "eth0", "enp3s0", etc.

* Enter MySQL password: in order to access to "s4t-iotronic" database.




#### Install from source-code

* ##### Install dependencies using npm
```
npm install -g --unsafe log4js@1.1.1 @mdslab/wstun optimist bcrypt requestify mysql nconf ip express node-uuid autobahn q body-parser ps-node nodemailer nodemailer-smtp-transport jsonwebtoken
```

* ##### Setup IoTronic environment
```
mkdir /var/lib/iotronic/
cd /usr/lib/node_modules/

git clone git://github.com/MDSLab/s4t-iotronic-standalone.git
mv s4t-iotronic-standalone/ iotronic-standalone

cp /usr/lib/node_modules/iotronic-standalone/etc/systemd/system/iotronic-standalone.service /etc/systemd/system/
chmod +x /etc/systemd/system/iotronic-standalone.service
systemctl daemon-reload
systemctl enable iotronic-standalone.service

mkdir /var/lib/iotronic/drivers/
mkdir /var/lib/iotronic/plugins/
mkdir /var/lib/iotronic/schemas/

echo "export IOTRONIC_HOME=/var/lib/iotronic" >> /etc/profile
source /etc/profile
```

* ##### Configure Crossbar.io router
```
mkdir /etc/crossbar
cp /usr/lib/node_modules/iotronic-standalone/etc/crossbar/config.example.json /etc/crossbar/config.json
cp /usr/lib/node_modules/iotronic-standalone/etc/systemd/system/crossbar.service /etc/systemd/system/
chmod +x /etc/systemd/system/crossbar.service
systemctl daemon-reload
systemctl enable crossbar.service
```
Please, note that the config.example.json coming with the iotronic-standalone package sets the name of the WAMP realm to "s4t" and the Crossbar.io listening port to "8181". If you want to change such values, please consider that later on you will need to correctly change them in other configuration files.

* ##### Configure Websocket reverse tunnel (WSTUN) server
```
cp /usr/lib/node_modules/iotronic-standalone/etc/systemd/system/wstun.service /etc/systemd/system/
chmod +x /etc/systemd/system/wstun.service
systemctl daemon-reload
systemctl enable wstun.service
```

* ##### Configure IoTronic-standalone
First of all, you need to import the Iotronic database schema. During the installation of the MySQL package you should have been asked for a database root password. Please note that name of the database is set to "s4t-iotronic". If you want to change it, please consider that later on you will need to correctly change it in other configuration files.
```
mysql -u root -p < /usr/lib/node_modules/iotronic-standalone/utils/s4t-db.sql
```

Then, copy the example of IoTronic configuration file coming with the package in the correct path. 
```
cp /usr/lib/node_modules/iotronic-standalone/settings.example.json /var/lib/iotronic/settings.json
``` 
Please, note that the settings.example.json coming with the iotronic-standalone package sets the IoTronic listening port to "8888", the database name to "s4t-iotronic" (the database server is supposed to be running locally), the WAMP realm to "s4t" (the Crossbar.io WAMP router is supposed to be running locally on port 8181). If you want to change such values, please consider that later on you will need to correctly change them in other configuration files. 

Open /var/lib/iotronic/settings.json:
- specify the network interface that IoTronic is supposed to use (e.g., change <INTERFACE> with "eth0") and the listening port for the REST the API:
```
"server":
{
        "interface":"<INTERFACE>",
        "port":"<HTTP-API-PORT>",
        ...
}
```

 - specify the database password (use the same password you set while installing the MySQL package):
```
"db":{
        "host":"localhost",
        "user":"root",
        "password":"<MYSQL-PASSWORD>",
        "db_name": "new-s4t-iotronic"
}
```

 - set API security parameters:
```
"https":{
        "enable":"[ true  | false ]",
        "port":"<HTTPS-API-PORT>",
        "key":"<PATH-PRIVATE-KEY>",
        "cert":"<PATH-PUBLIC-KEY>"
}
```

 - set Notify Manager parameters:
```
"notifier":{
        "email": {
                "address": "<SENDER-EMAIL>",
                "password": "<SENDER-PASSWORD-EMAIL>"
        },
        "enable_notify":"[ true | false ]",
        "retry":<ATTEMPTS-NUMBER>
}
```

Set authentication parameters:
 - create SuperAdmin token ("adminToken" to set below in the settings.json):
```
node /usr/lib/node_modules/iotronic-standalone/utils/createAdminToken.js <PASSWORD>
```
 - open /var/lib/iotronic/settings.json:
```
"auth":{
        "encryptKey":"<ENC-KEY>",
        "adminToken":"<GENERATED-BEFORE>",
        "backend":"iotronic",
        "expire_time":600
}
```
The "encryptKey" field is a user-defined keyword/password used to encrypt/decrypt the users passwords during authentication procedures.

The "adminToken" field was generated in the previous step and it is considered a token used ONLY by Admin to call the APIs without the need to get a temporary token to attach to each request as well the common users.





## Start IoTronic-standalone

##### Start services
```
systemctl enable crossbar
systemctl start crossbar

systemctl start wstun

systemctl status crossbar
systemctl status wstun
```
Now you are ready to start Iotronic:
```
systemctl start iotronic-standalone.service

systemctl status iotronic-standalone.service
```
You can check logs by typing:
```
tail -f /var/log/iotronic/s4t-iotronic.log
```

##### Register Admin user and project

From API you are able to register the Admin user by means of SuperAdmin authorization token:
```
REQUEST:
curl -X POST \
  http://<IOTRONIC-IP>:8888/v1/users/ \
  -H 'cache-control: no-cache' \
  -H 'content-type: application/x-www-form-urlencoded' \
  -H 'x-auth-token: <SUPER-ADMIN-TOKEN>' \
  -d 'username=admin&password=<ADMIN-PASSWORD>&email=<ADMIN-EMAIL>&f_name=<NAME>&l_name=<SURNAME>'

RESPONSE:
{
    "message":"IoTronic user 'admin' successfully created!",
    "result":"SUCCESS"
}

REQUEST:
curl -X POST \
  http://<IOTRONIC-IP>:8888/v1/projects/ \
  -H 'cache-control: no-cache' \
  -H 'content-type: application/x-www-form-urlencoded' \
  -H 'x-auth-token:<SUPER-ADMIN-TOKEN>' \
  -d 'name=Admin&description=Admin%20Project'

RESPONSE:
{
    "message": "IoTronic project 'Admin' successfully created!",
    "result": "SUCCESS"
}
```