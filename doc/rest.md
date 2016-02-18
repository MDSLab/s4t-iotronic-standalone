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
			"uuid": "network-uuid",
			"name": "network-name",
			"address": "IP",
			"size": size,
			"hosts": []
		},
		....
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
		"vlanid": "vlanid",
		"uuid":"UUID-assigned",
		"name":"name-of-the-network",
		"netaddr":"Net-IP",
		"netmask":"Net-Mask"
	}
}

### Destroy Network
```
http://IP:PORT/command/?command=destroy-network&netuid={uuid-of-the-network}
```
response json:
```
{
	"message":"Destroying network",
	"result": "NETWORK network-uuid DESTROYED!"
}
```

```
### Add Board to Network
```
http://IP:PORT/command/?command=add-to-network&netuid={uuid-of-the-network}&boad={boardID}&[val={IP}]
```
response json:
```
{
	"message":[{"ip":"board_IP"}],
	"result":"VLAN CONNECTION ON boardID SUCCESSFULLY ESTABLISHED!",
	"log":{
		"board":"boardID",
		"socatID":1,
		"socatPort":10000,
		"greIP":"IP",
		"greMask":"24",
		"vlanID":"vlanid",
		"vlan_name":"name-of-the-vlan",
		"net_uuid":"UUID-assigned"
	}
}

```

### Remove Board from a Network
```
http://IP:PORT/command/?command=remove-from-network&netuid={name-of-the-vlan}&board={board-id}
```
response json:
```
{
	"message": [
		{
			"found": 1
		}
	],
	"result": "BOARD board-id REMOVED FROM VLAN name-of-the-vlan",
	"log": {
		"message": {
			"fieldCount": 0,
			"affectedRows": 1,
			"insertId": 0,
			"serverStatus": 34,
			"warningCount": 0,
			"message": "",
			"protocol41": true,
			"changedRows": 0
		},
		"result": "SUCCESS"
	}
}


```


###Show Boards
```
http://IP:PORT/command/?command=show-boards&netuid={network-uuid}
```
response json:
```
{
	"message": "Showing boards in a network",
	"result": [
		{
			"BOARD_ID": "boardID",
			"vlan_NAME": "name-of-the-vlan",
			"vlan_ID": 15,
			"vlan_IP": "board_vlanIP",
			"socat_ID": 1,
			"socat_IP": "board_socatIP",
			"socat_PORT": 10000
		}
	],
	...
	"log": ""
}

```
