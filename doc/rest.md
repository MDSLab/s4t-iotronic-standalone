#REST API Specification

###List of the devices 
```
http://IP:PORT/list/
```
response json
```
{
	"list":
	[
		{
			"board_code":"boardID",
			"session_id":"null",
			"status":"Disconnected/Connected",
			"altitude":"alt",
			"longitude":"long",
			"latitude":"lat"
		},
		...
	]
}

```

###Export Local Services
```
http://IP:PORT/command/?board={boardID}&command={service_name}&op={start|stop}
```

response json:
```
{
	"ip":"IP",
	"port":"TUNNELED_PORT",
	"service":"ServiceName",
	"status":"start|stop"
}
```

###Set PIN mode
```
http://IP:PORT/command/?board={boardID}&command=mode&pin={pinName}&mode={input|output|pwm}
```
response json:
```
{
	"mesage": "Set Mode",
	"result": "0| ERROR DESCRIPTION"
}
```
### Digital or Analog Write
```
http://IP:PORT/command/?board={boardID}&command={analog|digital}&pin={pinName}&val={0,1 | 0,1...1024}
```
*in this REST call analog is used per PWM PIN*

response json:
```
{
	"message": "Digital Write | Analog Write",
	"result": "0 | ERROR DESCRIPTION"
}
```

### Digital or Analog Read
```
http://IP:PORT/command/?board={boardID}&command={analog|digital}&pin={pinName}
```
response json:
```
{
	"message" : "Digital Read | Analog Read",
	"result": "value of the PIN | ERROR DESCRIPTION"
}
```

### Register a board
```
http://IP:PORT/command/?command=reg-board&board={boardID}&board_label={label}&latitude={latitude}&longitude={longitude}&altitude={altitude}&net_enabled={net_enabled_flag}&sensorlist={sensors_list}
```

response json:
```
{
	"result": "Registration successfully completed!"
}
```

### Update a board
```
http://IP:PORT/command/?command=update-board&board={boardID}&board_label={label}&latitude={latitude}&longitude={longitude}&altitude={altitude}&net_enabled={net_enabled_flag}&sensorlist={sensors_list}
```

response json:
```
{
	"result": "Updating board successfully completed!"
}
```

### Unregister a board
```
http://IP:PORT/command/?command=unreg-board&board={boardID}
```

response json:
```
{
	"result": "Unegistration board successfully completed!"
}
```




### Board Sensors List
```
http://IP:PORT/sensorlist
```

response json:
```
{
	"message":
	[
		{
			"id":1,
			"type":"temperature",
			"unit":"°C",
			"fabric_name":"Thermistor",
			"model":"TinkerKit"
		},
		{
			"id":2,
			"type":"brightness",
			"unit":"lux",
			"fabric_name":"LDR",
			"model":"TinkerKit"
		},
		{
			"id":3,
			"type":"humidity",
			"unit":"%",
			"fabric_name":"HIH-4030",
			"model":"Honeywell"
		},
		{
			"id":4,
			"type":"sound_detect",
			"unit":"db",
			"fabric_name":"HY-038",
			"model":"Keyes"
		},
		{
			"id":5,
			"type":"gas",
			"unit":"ppm",
			"fabric_name":"MQ9",
			"model":"Grove"
		},
		{
			"id":6,
			"type":"barometer",
			"unit":"hPa",
			"fabric_name":"mpl3115",
			"model":"TinkerKit"
		}
	],
	"result":"SUCCESS"
}
```

### Iotronic Plugins list
```
http://IP:PORT/pluginlist
```

response json:
```
{
	"message":
		[
			{
				"id":<NUM>,
				"name":"<PLUGINNAME>",
				"category":"async | sync",
				"jsonschema":"./schemas/<PLUGINSCHEMA>.json",
				"code":"./plugins/<PLUGINNAME>.js"
			},
			{ ... },
		],
	"result":"SUCCESS"
}
```

### Show Board Layout
```
http://IP:PORT/command/?command=board-layout&board={boardID}
```

response json:
```
{
    "message":{
        "sensors":
        [
            {
                "type": <SENSOR-TYPE>,
                "model": <SENSOR-MODEL>,
                "id": <SENSOR-ID>
            },
            ...
        ],
        "plugins":
        [
            {
                "name": <PLUGIN-NAME>,
                "id": <PLUGIN-ID>,
                "state": [ "running" | "executed" | "failed" | "killed" | "injected" ]
            },
            ...
        ],
        "drivers":
        [
            { 
                "name": <DRIVER-NAME>, 
                "state": [ "mounted" | "unmounted" | “injected” ], 
                "latest_change": <TIMESTAMP>
            } ,
            ...
        ]


    "result": [ "SUCCESS" | <IOTRONIC-ERR-MSG> ]
}
```


### Board Info
```
http://IP:PORT/command/?command=board-info&board={boardID}
```

response json:
```
{
	"message":
	{
		"info":
		[
			{
				"label": label,
				"altitude":altitude,
				"longitude":longitude,
				"latitude":latitude,
				"net_enabled":1
			}
		],
		"sensors":
		[
			{
				"type":"temperature",
				"model":"TinkerKit",
				"id":1
			},
			{
				"type":"brightness",
				"model":"TinkerKit",
				"id":2
			}
		]
	},
	"result":"SUCCESS"
}
```




### Create Plugin
```
http://IP:PORT/command/?command=createplugin&pluginname={plugin_name}&pluginjsonschema={plugin_json}&plugincode={plugin_code}
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

### Destroy Plugin
```
http://IP:PORT/command/?command=destroyplugin&pluginname={plugin_name}
```

response json:
```
{
	"message":"Destroy Plugin",
	"result":"Plugin <PLUGINNAME> successfully destroyed!"
}
```

### Inject Plugin
```
http://IP:PORT/command/?command=injectplugin&board={boardID}&pluginname={plugin_name}&autostart={True|False}
```
response json:
```
{
	"message": "Inject Plugin",
	"result": "Plugin injected successfully!" | "Plugin does not exist!"
}
```


### Remove Plugin from board
```
http://IP:PORT/command/?command=remove-plugin-board&board={boardID}&pluginname={plugin_name}
```

response json:
```
{
	"message":"Remove Plugin",
	"result":"Plugin <PLUGINNAME> successfully removed!"
}
```


###Run Plugin (async)
```
http://IP:PORT/command/?command=plugin&pluginname={plugin_name}&pluginjson={plugin_json}&pluginoperation=run&board={boardID}
```
response json:
```
{
	"message": "Run Plugin",
	"result": "OK - Plugin running!" | "Plugin category not supported!"
}
```

###Kill Plugin (async)
```
http://IP:PORT/command/?command=plugin&pluginname={plugin_name}&pluginoperation=kill&board={boardID}
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
http://IP:PORT/command/?command=plugin&pluginname={plugin_name}&pluginjson={plugin_json}&pluginoperation=call&board={boardID}
```
response json:
```
{
	"message": "Call Plugin",
	"result": "< CALL RESPONSE USER DEFINED >" | "Plugin category not supported!"
	
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
		"uuid":  <IOTRONIC-NETWORK-UUID>,
		"vlan_ip":  <VLAN-NETWORK-ADDRESS>,
		"vlan_mask":  <VLAN-NETWORK-NETMASK>,
		"vlan_name":  <IOTRONIC-NETWORK-NAME>,
		"vlan_id":  <VLAN-ID>
	    },
	    ...
	] 
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
    "result":"NETWORK SUCCESSFULLY CREATED!",
    "log":{
        "vlanid": <VLAN-ID>,
        "uuid": <IOTRONIC-NETWORK-UUID>,
        "name": <IOTRONIC-NETWORK-NAME>,
        "netaddr": <VLAN-NETWORK-ADDRESS>,
        "netmask": <VLAN-NETWORK-NETMASK>
    }
}
```

### Destroy Network
```
http://IP:PORT/command/?command=destroy-network&netuid={uuid-of-the-network}
```
response json:

```
{
	"message":"Destroying network",
	"result": "NETWORK <NETWORK-UUID> DESTROYED!"
}
```


### Add Board to Network
```
http://IP:PORT/command/?command=add-to-network&netuid={uuid-of-the-network}&boad={boardID}&val=[{IP}]
```
response json:
```
{
	"message":"VLAN CONNECTION ON <BOARD-UUID> SUCCESSFULLY ESTABLISHED!",
	"result": {"ip": <VLAN-BOARD-IP>},
	"log":{
               "board":<BOARD-UUID>,
               "socatID": <SOCAT-BOARD-ID>,
               "socatPort": <SOCAT-BOARD-PORT>,
               "greIP": <VLAN-BOARD-IP>,
               "greMask": <VLAN-BOARD-NETMASK>,
               "vlanID": <VLAN-TAG-ID>,
               "vlan_name": <VLAN-NAME>,
               "net_uuid": <VLAN-UUID>
	}

}
```

### Remove Board from a Network
```
http://IP:PORT/command/?command=remove-from-network&netuid={vlan-uuid}&board={board-id}
```
response json:
```
{
	"message":"BOARD <BOARD-UUID> REMOVED FROM VLAN <VLAN-NAME>",
	"result": {"found": [ 1 | 0 ]},
	"log": <IOTRONIC-DB-MESSAGE>
}
```


###Show boards in a network
```
http://IP:PORT/command/?command=show-boards&netuid={network-uuid}
```
response json:
```
{
	"message": "Showing boards in a network",
	"result": [
		{
			"BOARD_ID": <BOARD-UUID>,
			"vlan_NAME": <VLAN-NAME>,
			"vlan_ID": <VLAN-TAG-ID>,
			"vlan_IP": <VLAN-BOARD-IP>,
			"socat_ID": <SOCAT-BOARD-ID>,
			"socat_IP": <SOCAT-BOARD-IP>,
			"socat_PORT": <SOCAT-BOARD-PORT>
		}
	],
	...

}

```


### Iotronic drivers list
```
http://IP:PORT/driverlist/
```

Success response json:
```
{
    "message":
        [
            {
                "id": <DRIVER-ID>,
                "name": <DRIVER-NAME>,
                "jsonschema":"./schemas/<DRIVE-CONF-FILE-NAME>",
                "code":"./plugins/<DRIVER-CODE-FILE-NAME>"
            },
            { ... },
        ],
    "result": [ "SUCCESS" | <IOTRONIC-ERR-MSG> ]
}
```

### List of drivers injected in a board
```
http://IP:PORT/driverlist/?board={board-id}
```

Success response json:
```
{
	"message": [
		{
			"name": "<DRIVERNAME>",
			"state": "< mounted | unmounted | injected >",
			"latest_change": "2016-05-20T16:12:45.000Z"
		},
		{ ... },
	],
	"result": "SUCCESS"
}
```


### Create driver
```
http://IP:PORT/command/?command=createdriver&drivername={driver_name}&driverjson={driver_json}&drivercode={driver_code}
```
Success response json:
```
{	
	"message":"Create Driver",
	"result":"Driver <driver_name> injected into Iotronic successfully"
}
```

### Inject driver
```
http://IP:PORT/command/?command=injectdriver&board={board-id}&drivername={driver_name}
```
Success response json:
```
{	
	"message":"Inject driver",
	"result":"Driver <driver_name> successfully injected!"
}
```

### Mount driver
```
http://IP:PORT/command/?command=driver&drivername={driver_name}&driveroperation=mount&board={board-id}

```
Success response json:
```
{	
	"message":Driver '<driver_name>' successfully mounted!",
	"result":"SUCCESS"

}
```


### Unmount driver
```
http://IP:PORT/command/?command=driver&drivername={driver_name}&driveroperation=unmount&board={board-id}
```
Success response json:
```
{	
	"message":Driver '<driver_name>' successfully unmounted!",
	"result":"SUCCESS"

}
```

### Read remote driver file
```
http://IP:PORT/command/?command=readdriverfile&board={board-id}&drivername={driver_name}&filename={driver_file}
```
Success response json:
```
{	
	"message":"Read remote file",
	"result":{
		"driver":"<driver_name>",
		"file":"<driver_file>",
		"value":"<file_content>"
	}
}
```

### Write remote driver file
```
http://IP:PORT/command/?command=writedriverfile&board={board-id}&drivername={driver_name}&filename={driver_file}&filecontent={file_content}
```
Success response json:
```
{	
	"message":"Write remote file",
	"result":{
		"driver":"<driver_name>",
		"file":"<driver_file>",
		"response":"writing completed"
	}

}
```



### Remove driver from board
```
http://IP:PORT/command/?command=remove-driver-board&board={board-id}&drivername={driver_name}
```
Success response json:
```
{	
	"message":"Remove driver",
	"result":"Driver <driver_name> successfully removed!"

}
```


### Remove driver from Iotronic
```
http://IP:PORT/command/?command=destroydriver&drivername={driver_name}
```
Success response json:
```
{	
	"message":"Destroy driver",
	"result":"Driver <driver_name> successfully deleted from Iotronic!"
}
```

### MIRRORED: Mount driver
```
http://IP:PORT/command/?command=driver&drivername={driver_name}&driveroperation=mount&board={board-id}&remote_driver=true&mirror_board={mirrored-board-id}
```



