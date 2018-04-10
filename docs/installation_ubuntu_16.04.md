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

##### Install latest LTS NodeJS (and npm) distribution:
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install -y nodejs
node -v

npm install -g npm
npm config set python `which python2.7`
npm -v

echo "NODE_PATH=/usr/lib/node_modules" | tee -a /etc/environment
source /etc/environment > /dev/null
echo $NODE_PATH
```

## Install IoTronic-standalone

You can choose to install IoTronic via NPM or from source-code via Git.

#### Install via NPM
```
npm install -g --unsafe @mdslab/wstun

npm install -g --unsafe @mdslab/iotronic-standalone
```
during the installation the procedure asks the following information:

* Enter MySQL password: in order to access to "s4t-iotronic" database.




#### Install from source-code

* ##### Install dependencies using npm
```
npm install -g --unsafe log4js@1.1.1 requestify mysql nconf ip express node-uuid autobahn q body-parser ps-node nodemailer nodemailer-smtp-transport swagger-jsdoc cors bcrypt optimist
jsonwebtoken md5 python-shell

npm install -g --unsafe @mdslab/wstun
```

* ##### Setup IoTronic environment
```
mkdir /var/lib/iotronic/
cd /usr/lib/node_modules/@mdslab/

git clone git://github.com/MDSLab/s4t-iotronic-standalone.git
mv s4t-iotronic-standalone/ iotronic-standalone

cp /usr/lib/node_modules/@mdslab/iotronic-standalone/etc/systemd/system/iotronic-standalone.service /etc/systemd/system/
chmod +x /etc/systemd/system/iotronic-standalone.service
systemctl daemon-reload
systemctl enable iotronic-standalone.service

mkdir /var/lib/iotronic/drivers/
mkdir /var/lib/iotronic/plugins/

cp /usr/lib/node_modules/@mdslab/iotronic-standalone/settings.example.json /var/lib/iotronic/settings.json

echo "IOTRONIC_HOME=/var/lib/iotronic" >> /etc/environment
source /etc/environment
echo $IOTRONIC_HOME
```

* ##### Setup Crossbar.io environment
```
cp /usr/lib/node_modules/@mdslab/iotronic-standalone/etc/systemd/system/crossbar.service /etc/systemd/system/
chmod +x /etc/systemd/system/crossbar.service
systemctl daemon-reload
systemctl enable crossbar.service
```


* ##### Configure Websocket reverse tunnel (WSTUN) server
```
cp /usr/lib/node_modules/@mdslab/iotronic-standalone/etc/systemd/system/wstun.service /etc/systemd/system/
chmod +x /etc/systemd/system/wstun.service
systemctl daemon-reload
systemctl enable wstun.service
```

* ##### Import IoTronic-standalone database
You need to import the IoTronic database schema. During the installation of the MySQL package you should have been asked for a database root password. Please note that name of the database is set to "s4t-iotronic". If you want to change it, please consider that later on you will need to correctly change it in other configuration files.
```
mysql -u root -p < /usr/lib/node_modules/@mdslab/iotronic-standalone/utils/s4t-db.sql
```


## Configure Crossbar.io router
Configure Crossbar with SSL:
```
cp /usr/lib/node_modules/@mdslab/iotronic-standalone/etc/crossbar/config.SSL.example.json /etc/crossbar/config.json
vim /etc/crossbar/config.json

    "key": "<PRIVATE-KEY.PEM>",
    "certificate": "<PUBLIC-CERT.PEM>",
    "chain_certificates": [<CHAIN-CERT.PEM>]
```

or without SSL:
```
cp /usr/lib/node_modules/@mdslab/iotronic-standalone/etc/crossbar/config.example.json /etc/crossbar/config.json
```
at the end check the configuration:
```
crossbar check --cbdir /etc/crossbar
```

Please, note that the config[.SSL].example.json coming with the iotronic-standalone package sets the name of the WAMP realm to "s4t" and the Crossbar.io listening port to "8181". If you want to change such values, please consider that later on you will need to correctly change them in other configuration files.



## Configure IoTronic-standalone

Please, note that the settings.example.json coming with the iotronic-standalone package sets the IoTronic listening port to "8888", the database name to "s4t-iotronic" (the database server is supposed to be running locally), the WAMP realm to "s4t" (the Crossbar.io WAMP router is supposed to be running locally on port 8181). If you want to change such values, please consider that later on you will need to correctly change them in other configuration files. 

Open /var/lib/iotronic/settings.json:
- specify the NIC (e.g., change <INTERFACE> with "eth0") or the public IP and the port that IoTronic supposed to use to expose its REST interface;
if you would like to use HTTPS to expose them you have to specify the "https" section.
```
"server":
{
        "interface":"<INTERFACE>",
        "public_ip": "<IOTRONIC-PUBLIC-IP>",
        "http_port":"<HTTP-API-PORT>",
        "https":{
                "enable":"[ true  | false ]",
                "port":"<HTTPS-API-PORT>",
                "key":"<PATH-PRIVATE-KEY>",
                "cert":"<PATH-PUBLIC-KEY>"
        }
        ...
}
```

 - specify the database password (use the same password you set while installing the MySQL package):
```
"db":{
        "host":"localhost",
        "user":"root",
        "password":"<MYSQL-PASSWORD>",
        "db_name": "s4t-iotronic"
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
}
```

Set authentication parameters:
 - create SuperAdmin token ("adminToken" to set below in the settings.json):
```
node /usr/lib/node_modules/@mdslab/iotronic-standalone/utils/createAdminToken.js <PASSWORD>
```
 - open /var/lib/iotronic/settings.json:
```
"auth":{
        "encryptKey": "<ENC-KEY>",
        "adminToken": "<GENERATED-BEFORE>",
        "backend": "iotronic",
        "expire_time": 60
}
```
The "encryptKey" field is a user-defined keyword/password used to encrypt/decrypt the users passwords during authentication procedures.

The "adminToken" field was generated in the previous step and it is considered a token used ONLY by Admin to call the APIs without the need to get a temporary token to attach to each request as well the common users.

The "expire_time" field is expressed in seconds (e.g.: 60) or as string describing a [timespan](https://github.com/zeit/ms) (e.g.: "30m", "2 days", "10h", "7d").
If you decide to express this field in seconds you MUST specify it as integer (e.g. 60 -> 1 minute)
NOT as a string (e.g. "60" -> 60 milliseconds).


## Start IoTronic-standalone

##### Start services
```
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
  http(s)://<IOTRONIC-IP>:<PORT>/v1/users/ \
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
  http(s)://<IOTRONIC-IP>:<PORT>/v1/projects/ \
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



## API documentation management
IoTronic releases its APIs documentation by means of Swagger framework. In particular we used ["swagger-jsdoc"](https://www.npmjs.com/package/swagger-jsdoc)  and ["swagger-ui"](https://swagger.io/swagger-ui/) respectively to describe each RESTful API in the source code and publish the produced documentation.

To use swagger-ui we need to clone the git repository from [here](https://github.com/swagger-api/swagger-ui)
 and move the "dist" folder where you prefer and specify it inside the "settings.json" configuration file
 as showed below:

```
"docs": {
        "enable": [ true | false ],
        "path": "<SWAGGER-DIST-PATH>"

}
```

You have to edit the "index.html" in <SWAGGER-DIST-PATH> as described in the [official guide](https://swagger.io/docs/swagger-tools/#download-33):
```
window.swaggerUi = new SwaggerUi({
 url: <URL-SWAGGER-JSON>,
…
});
```
where
```
<URL-SWAGGER-JSON> = http(s)://<IOTRONIC-IP>:<HTTP(S)-API-PORT>/<SWAGGER-JSON-LOCATION>/iotronic-swagger.json
```

[Link to Official guide](https://swagger.io/docs/swagger-tools/#download-33)

#### Embedded API management
Enabling the above flag ("enable":true) IoTronic will generate end expose the API documentation.

The docs will be available at:
```
<URL-API-DOCS> = http(s)://<IOTRONIC-IP>:<HTTP(S)-API-PORT>/v1/iotronic-api-docs/
```
and the location of the Swagger JSON file will be:
```
<URL-SWAGGER-JSON> = http(s)://<IOTRONIC-IP>:<HTTP(S)-API-PORT>/v1/iotronic-swagger.json
```

#### Standalone API management
We also provided a NodeJS script ([iotronic-docs-gen.js](iotronic-docs-gen.js)) to do that without using directly IoTronic (we need to set "enable" to false). This script will generate the documentation and will publish it by means of "swagger-ui".

Script usage:
```
node iotronic-docs-gen.js --iotronic="<IOTRONIC_SOURCE_CODE_PATH>" -e [true|false] [ -p <API_DOCS_PORT> ]
```
options:
 - -i, --iotronic  IoTronic suorce code path. (e.g. "/usr/lib/node_modules/@mdslab/iotronic-standalone/")
 - -e, --embedded  true | false to spawn API webpage documentation; if "false" the "iotronic-swagger.json" will be created in the <SWAGGER-DIST-PATH> folder specified in the "settings.json" file in the "docs" section.
 - -p, --port      [only with --embedded=true] Listening port. (this port has to be different from the ports used by IoTronic "http(s)_port")

The docs will be available at:
```
<URL-API-DOCS> = http(s)://<IOTRONIC-IP>:<API_DOCS_PORT>/iotronic-api-docs/
```
and the location of the Swagger JSON file will be:
```
<URL-SWAGGER-JSON> = http(s)://<IOTRONIC-IP>:<HTTP(S)-API-PORT>/iotronic-api-docs/iotronic-swagger.json
```


## Administration dashboard
In order to install the admin dashboard follow this [guide](https://github.com/MDSLab/s4t-iotronic-webinterface).