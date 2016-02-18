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
