#REST API Specification

##List of the connected devices 
```
http:/IP:PORT/list/
```
response json
```
{
"list": ["board1", "board2"...]
}
```
##Set PIN mode
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

### Digital or Analog read
```
http://IP:PORT/command/?command=create-network&netname={name-of-the-new-network}&val={Net-IP/Net-Mask}
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
