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

REST call for virtual network 