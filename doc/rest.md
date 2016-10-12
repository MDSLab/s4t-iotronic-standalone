#REST API Specification


###List of the devices 
```
http://IP:PORT/list/
```
Response:
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


### Register a board
```
http://IP:PORT/command/?command=reg-board&board={boardID}&board_label={label}&latitude={latitude}&longitude={longitude}&altitude={altitude}&net_enabled={net_enabled_flag}&sensorlist={sensors_list}
```
Response:
```
{
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Update a board
```
http://IP:PORT/command/?command=update-board&board={boardID}&board_label={label}&latitude={latitude}&longitude={longitude}&altitude={altitude}&net_enabled={net_enabled_flag}&sensorlist={sensors_list}
```
Response:
```
{
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Unregister a board
```
http://IP:PORT/command/?command=unreg-board&board={boardID}
```
Response:
```
{
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Board Sensors List
```
http://IP:PORT/sensorlist
```
Response:
```
{
    "message":
    [
        {
            "id": <SENSOR-ID>,
            "type": <SENSOR-TYPE>,
            "unit": <METRIC-UNIT>,
            "fabric_name": <SENSOR-FABRIC-NAME>,
            "model": <SENSOR-MODEL>
        },

    	…

   ],

   "result": <IOTRONIC-RESULT-MSG>
}
```


### Show Board Layout
```
http://IP:PORT/command/?command=board-layout&board={boardID}
```
Response:
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


    "result": <IOTRONIC-RESULT-MSG>
}
```


### Show Board Information
```
http://IP:PORT/command/?command=board-info&board={boardID}
```
Response:
```

{
    "message":
    {
        "info":
        [
            {
                "label": <BOARD-LABEL>,
                "altitude": <BOARD-ALTITUDE>,
                "longitude": <BOARD-LONGITUDE>,
                "latitude": <BOARD-LATITUDE>,
                "net_enabled": [ 0 | 1 ] 
            }
        ],
        "sensors":
        [
            {
                "type": <SENSOR-TYPE>,
                "model": <SENSOR-MODEL>,
                "id": <SENSOR-ID>
            },
            ...
        ],    
     },
    "result": <IOTRONIC-RESULT-MSG>
}
```




###Export Board Services
```
http://IP:PORT/command/?board={boardID}&command={service_name}&op={"start"|"stop"}
```
Response:
```
{
    "ip": <IOTRONIC-IP>,
    "port": <SERVICE-PORT-NUMBER>,
    "service": <SERVICE-NAME>,
    "status": [ “start” | “stop” ]
}
```


###Set PIN mode
```
http://IP:PORT/command/?board={boardID}&command=mode&pin={pinName}&mode={input|output|pwm}
```
Response:
```
{
	"mesage": "Set Mode",
	"result": [ <IOTRONIC-RESULT-MSG> | <IDEINO-ERR-MSG> ]
}
```


### Digital or Analog (PWM) Write
```
http://IP:PORT/command/?board={boardID}&command={analog|digital}&pin={pinName}&val={0,1 | 0,1...1024}
```
*in this REST call analog is used per PWM PIN*

Response:
```
{
	"message": [ "Digital Write" | "Analog Write" ],
	"result":  [ <IOTRONIC-RESULT-MSG> | <IDEINO-ERR-MSG> ]
}
```


### Digital or Analog Read
```
http://IP:PORT/command/?board={boardID}&command={analog|digital}&pin={pinName}
```
Response:
```
{
	"message" : [ "Digital Write" | "Analog Write" ],
	"result": [ <PIN-VALUE> | <IDEINO-ERR-MSG> ]
}
```




### Iotronic Plugins list
```
http://IP:PORT/pluginlist
```
Response:
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


### Upload Plugin to Iotronic
```
http://IP:PORT/command/?command=createplugin&pluginname={plugin_name}&pluginjsonschema={plugin_json}&plugincode={plugin_code}
```
Response:
```
{
	"message": "Create Plugin",
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Remove Plugin from Iotronic
```
http://IP:PORT/command/?command=destroyplugin&pluginname={plugin_name}
```
Response:
```
{
	"message":"Destroy Plugin",
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Inject Plugin to Board
```
http://IP:PORT/command/?command=injectplugin&board={boardID}&pluginname={plugin_name}&autostart={True|False}
```
Response:
```
{
	"message": "Inject Plugin",
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Remove Plugin from board
```
http://IP:PORT/command/?command=remove-plugin-board&board={boardID}&pluginname={plugin_name}
```
Response:
```
{
	"message":"Remove Plugin",
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Start Asynchronous Plugin
```
http://IP:PORT/command/?command=plugin&pluginname={plugin_name}&pluginjson={plugin_json}&pluginoperation=run&board={boardID}
```
Response:
```
{
	"message": "Run Plugin",
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Stop Asynchronous Plugin
```
http://IP:PORT/command/?command=plugin&pluginname={plugin_name}&pluginoperation=kill&board={boardID}
```
Response:
```
{
	"message": "Kill Plugin",
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Execute Synchronous Plugin
```
http://IP:PORT/command/?command=plugin&pluginname={plugin_name}&pluginjson={plugin_json}&pluginoperation=call&board={boardID}
```
Response:
```
{
	"message": "Call Plugin",
	"result": <IOTRONIC-RESULT-MSG>
	
}
```




### Show Iotronic virtual networks
```
http://IP:PORT/command/?command=show-network
```
Response:
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


### Create new virtual network
```
http://IP:PORT/command/?command=create-network&netname={name-of-the-network}&val={Net-IP/Net-Mask}
```
Response:
```
{
    "message": "Network creation",
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

### Destroy virtual network
```
http://IP:PORT/command/?command=destroy-network&netuid={uuid-of-the-network}
```
Response:
```
{
	"message":"Destroying network",
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Add Board to Network
```
http://IP:PORT/command/?command=add-to-network&netuid={uuid-of-the-network}&board={boardID}&val=[{IP}]
```
Response:
```
{
	"message": <IOTRONIC-RESULT-MSG>,
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


### Remove Board from a virtual network
```
http://IP:PORT/command/?command=remove-from-network&netuid={vlan-uuid}&board={board-id}
```
Response:
```
{
	"message": <IOTRONIC-RESULT-MSG>,
	"result": {"found": [ 1 | 0 ]},
	"log": <IOTRONIC-DB-MESSAGE>
}
```


### Show boards in a network
```
http://IP:PORT/command/?command=show-boards&netuid={network-uuid}
```
Response:
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
Response:
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
    "result": <IOTRONIC-RESULT-MSG>
}
```


### Board drivers list
```
http://IP:PORT/driverlist/?board={board-id}
```
Response:
```
{
	"message": [
		{
			"name": "<DRIVER-NAME>",
			"state": "< mounted | unmounted | injected >",
			"latest_change": "2016-05-20T16:12:45.000Z"
		},
		{ ... },
	],
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Upload driver to Iotronic
```
http://IP:PORT/command/?command=createdriver&drivername={driver_name}&driverjson={driver_json}&drivercode={driver_code}
```
Response:
```
{	
	"message": "Create Driver",
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Inject driver to board
```
http://IP:PORT/command/?command=injectdriver&board={board-id}&drivername={driver_name}&autostart={True|False}
```
Response:
```
{	
	"message": "Inject driver",
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Mount driver on board
```
http://IP:PORT/command/?command=driver&drivername={driver_name}&driveroperation=mount&board={board-id}&remote_driver={true|false}
```
Response:
```
{	
	"message": <IOTRONIC-MSG>,
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Unmount driver from board
```
http://IP:PORT/command/?command=driver&drivername={driver_name}&driveroperation=unmount&board={board-id}
```
Success response json:
```
{	
	"message": <IOTRONIC-MSG>,
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Read driver file remotely
```
http://IP:PORT/command/?command=readdriverfile&board={board-id}&drivername={driver_name}&filename={driver_file}
```
Response:
```	
{
    "message": "Read remote file",
    "result": {
	  "driver": <DRIVER-NAME>,
	  "file": <DRIVER-FILE-NAME>,
	  "value": <DRIVER-FILE-CONTENT>
    }
}
```


### Write driver file remotely
```
http://IP:PORT/command/?command=writedriverfile&board={board-id}&drivername={driver_name}&filename={driver_file}&filecontent={file_content}
```
Response:
```
{	
    "message":"Write remote file",
    "result":{
      "driver": <DRIVER-NAME>,
      "file": <DRIVER-FILE-NAME>,
      "response": <DRIVER-RESULT-MSG>
    }
}
```


### Remove driver from board
```
http://IP:PORT/command/?command=remove-driver-board&board={board-id}&drivername={driver_name}
```
Response:
```
{
	"message": "Remove driver",
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Remove driver from Iotronic
```
http://IP:PORT/command/?command=destroydriver&drivername={driver_name}
```
Success response json:
```
{	
	"message": "Destroy driver",
	"result": <IOTRONIC-RESULT-MSG>
}
```


### Mount mirrored driver
```
http://IP:PORT/command/?command=driver&drivername={driver_name}&driveroperation=mount&board={board-id}&remote_driver=true&mirror_board={mirrored-board-id}
```
Response:
```
{
    "message": <IOTRONIC-MSG>,
    "result": <IOTRONIC-RESULT-MSG>
}
```


