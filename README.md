# s4t-node-cloud
**s4t-node-cloud** is the implementation, totally in nodejs, of a personal cloud to remote manage embedded devices **Arduino YUN/Linino One** and **Raspberry Pi**.

**s4t-node-cloud** uses for the communication with the embedded devices a protocol called [**WAMP**](http://wamp.ws/)  *Web Application Protocol*, this protocol uses an element called **WAMP Router** to provides an *"Unified Application Routing"* for the applications:

  * Routing of events (for Publish/Subscribe communication pattern );
   
  * Routing of calls (for Remote Procedure Call communication pattern);

Using the **s4t-node-cloud** the embedded devices connected to it, through a [**Reverse Websocket Tunnel Protocol**](https://www.npmjs.com/package/node-reverse-wstunnel) are able to expose their local services, but not only, it is possible to realize a direct connection to the devices and its services behind a strict firewalls or without a public IP. It is obviously necessary to use a public host with a specific IP; on this host there will be installed the s4t-node-cloud and all of the necessary software  components.

**s4t-node-cloud** has a rich REST interface to communicate with all the devices connected to it, you can use the documentation the [**REST API Specification**](https://github.com/MDSLab/s4t-node-cloud/blob/develop/doc/rest.md) to properly use this REST interface.

##Installation

**s4t-node-cloud** needs two additionals software components:

	* A WAMP router;
	
	* A Reverse Websocket Tunnel Server;

###WAM Router Installation
**s4t-node-cloud** has been tested with the Crossbar.io, a python implementation of the WAMP Router. To install and configure Crossbar.io it is possible following the instructions to the official web page:
http://crossbar.io/, generally if there is installed python and python package manager *pip* it is possible to install crossbar using the follow command:

```
pip install crossbar
```

to start Crossbar.io it is necessary to use the follow command:

```
crossbar start
```
Make sure to start Crossbar.io in a path where is present the directory *.crossbar*  inside of it there will need the json configuration file the official web site explain all the details

###Reverse Websocket Tunnel Server Installation
To install the **Reverse Websocket Tunnel Server** it is only necessary to download the nodejs package using *npm* utility using the follow command:

```
npm install node-reverse-wstunnel
```
For more details on this package it is possible to visit the official page of [**node-reverse-wstunnel**](https://www.npmjs.com/package/node-reverse-wstunnel).

Assuing to start a Reverse Websocket Tunnel server on the TCP port 8080 we can use the follow command:

```
/node_modules/node-reverse-wstunnel/bin/wstt.js -r -s 8080
```

###s4t-node-cloud Installation
To install the **s4t-node-cloud** it is only necessary to copy the source code using for example the follow command:

```
git clone https://github.com/MDSLab/s4t-node-cloud.git
```

Then to start the **s4t-node-cloud** you need run the following command:

```
/bin/server
```

In the root path of the source code there is a json configuration file called *setting.json* using this file it is possible to set all the parameters of the *s4t-node-cloud*.
