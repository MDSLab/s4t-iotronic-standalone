#REST API Specification

###List of the connected devices 
```
http:/IP:PORT/list/
```
response json
```
{
"list": ["board1", "board2"...]
}
```

###List of the boards on the Map 
```
http:/IP:PORT/map/
```
response json
```
{
	"boards":{
		"<BOARD-ID-1>":{
			"coordinates":{
				"altitude":"<VALUE>",
				"latitude":"<VALUE>",
				"longitude":"<VALUE>"
			},								
			"resources":{
				"metrics":[ {"Temperature":"<VALUE>", ...}, {"Brightness":"<VALUE>", ...}, ...]
			}
		},
		"<BOARD-ID-2":{
			"coordinates":{
				"altitude":"<VALUE>",
				"latitude":"<VALUE>",
				"longitude":"<VALUE>"
			},								
			"resources":{
				"metrics":[ {"Temperature":"<VALUE>", ...}, {"Brightness":"<VALUE>", ...}, ...]
			}
		}
	}
}
```

###Export Local Services
```
http://IP:PORT/command/?board=id_board&command={service_name}&op={start|stop}
```

response json:
```
{
"ip":"212.189.207.212",
"port":6667,
"service":"ServiceName",
"status":"start|stop"
}
```

###Set PIN mode
```
http://IP:PORT/command/?board=id_board&command=mode&pin=pinName&mode=input|output|pwm
```
response json:
```
{
“mesage”: “Set Mode”,
“result”: “0| ERROR DESCRIPTION”
}
```
### Digital or PWM Write
```
http://IP:PORT/command/?board=id_board&command=analog|digital&pin=pinNmae&val=0,1 | 0,1...1024
```
*in this REST call analog is used per PWM PIN*

response json:
```
{
"message": ”Digital Write | Analog Write”,
“result”: "0 | ERROR DESCRIPTION"
}
```

### Digital or Analog read
```
http://IP:PORT/command/?board=id_board&command=analog|digital&pin=pinName
```
response json:
```
{
“message” : “Digital Read | Analog Read”,
“result”: "value of the PIN | ERROR DESCRIPTION"
}
```

### Create Plugin
```
http://IP:PORT/command/?command=createplugin&pluginname=plugin_name&pluginjsonschema=plugin_json&plugincode=plugin_code
```
response json:
```
{
	"message": "Create Plugin",
	"result": {
		"fieldCount": 0,
		"affectedRows": rows,
		"insertId": id,
		"serverStatus": status, 
		"warningCount": 0,
		"message": "",
		"protocol41": true,
		"changedRows": 0
	}
}
```

### Inject Plugin
```
http://IP:PORT/command/?command=injectplugin&board=id_board&pluginname=$plugin_name&autostart={True|False}
```
response json:
```
{
	"message": "Inject Plugin",
	"result": "Plugin injected successfully!" | "Plugin does not exist!"
}
```

###Run Plugin (async)
```
http://IP:PORT/command/?command=plugin&pluginname=plugin_name&pluginjson=plugin_json&pluginoperation=run&board=id_board
```
response json:
```
{
	"message": "Run Plugin",
	"result": "OK - Plugin running!" | "Plugin category not supported!"
}
```

###Kill Plugin
```
http://IP:PORT/command/?command=plugin&pluginname=plugin_name&pluginoperation=kill&board=id_board
```
response json:
```
{
	"message": "Kill Plugin",
	"result": "OK - plugin killed!" | "Plugin is not running on this board!"
}
```


###Call Plugin (sync)
```
http://IP:PORT/command/?command=plugin&pluginname=plugin_name&pluginjson=plugin_json&pluginoperation=call&board=id_board
```
response json:
```
{
	"message": "Call Plugin",
	"result": "< CALL RESPONSE USER DEFINED >" | "Plugin category not supported!"
	
}
```



### Create New Network
```
http://IP:PORT/command/?command=create-network&netname={name-of-the-network}&val={Net-IP/Net-Mask}
```
response json:
```
{
	"message": "Network created",
	"result": {
		"key": "KeyNumber",
		"uuid": "UUID-assigned",
		"name": "name-of-the-network",
		"netaddr": "Net-IP",
		"netmask": "Net-Mask",
		"netbc": "Broadcast-IP",
		"netsize": "Net-Size",
		"nethosts": "Array of the hosts in the network"
	}
}
```
### Add to Network
```
http://IP:PORT/command/?command=add-to-network&netuid={uuid-of-the-network}&boad={boardID}&[val={IP}]
```
response json:
```
{
	"message": "Adding boards to a network",
	"result": []
}
```

### Remove from a Network
```
http://IP:PORT/command/?command=remove-from-network&netuid=296ff200-1a07-4024-a040-5ce2fb5b6568&board=one1
```
response json:
```
{
	"message": "Removing boards from a network",
	"result": [
		{
			"key": key-number,
			"socatMap": key-socat,
			"value": "board-id",
			"addr": "IP",
			"device": "Device-id",
			"state": 1
		}
	]
}
```

### Destroy Network
```
http://IP:PORT/command/?command=destroy-network&netuid=uid-of-the-network
```
response json:
```
{
	"message": "Destroying network",
	"result": [
		{
			"uuid": "network-uid",
			"name": "network-naem",
			"address": "IP",
			"size": 254,
			"hosts": []
		}
	]
}
```

###Show Networks
```
http://IP:PORT/command/?command=show-network
```
response json:
```
{
	"message": "list of networks",
	"result": [
		{
			"uuid": "network-uid",
			"name": "network-name",
			"address": "IP",
			"size": size,
			"hosts": []
		},
		....
	] 
}
```

###Show Boards
```
http://IP:PORT/command/?command=show-boards&netuid=network-uid
```
response json:
```
{
	"message": "Showing boards in a network",
	"result": [
		[
			{
				"key": 0,
				"socatMap": 0,
				"value": "idBoar",
				"addr": "IP",
				"device": "device-name",
				"state": 1
			}
		],
		...
	]
}
```
###Update Network
```
http://IP:PORT/command/?command=update-network&netuid=uid-network&val=new-IP/new-mask'
```
response json:
```
{
	"message": "Updating network",
	"result": {
		"netuid": "network-uid",
		"netname": "network-name",
		"netaddr": "network-IP",
		"netmask": netmask
	}
}
```
