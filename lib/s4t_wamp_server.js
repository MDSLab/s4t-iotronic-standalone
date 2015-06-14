/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Andrea Rocco Lotronto, Arthur Warnier
*/

var db_utils = require('./mysql_db_utils');


var autobahn = require('autobahn');
var express = require('express');
var ip = require('ip');
var spawn = require('child_process').spawn;
var uuid = require('uuid');

var nconf = require('nconf');
nconf.file ({file: process.cwd()+'/lib/setting.json'});

var socatNetwork = nconf.get('config:socat:ip');
var basePort = nconf.get('config:socat:server:port');
var intr = nconf.get('config:server:interface');

var topic_command = nconf.get('config:wamp:topic_command');
var topic_connection = nconf.get('config:wamp:topic_connection');

//DEBUG
//console.log("TOPIC COMMAND:::::::::::::"+topic_command);
//console.log("TOPIC CONNECTIO::::::::::"+topic_connection);
//var db = new db_utils;
var db = new db_utils;
db.conn();
//---------New Arthur-----------------
var networksArray = [];
var greDevices = [];
//------------------------------------


s4t_wamp_server = function(){}

s4t_wamp_server.prototype.start = function(restPort, wamp_router_url, wamp_realm){



  var boards = {};
  var socatBoards = [];//Arthur
  //var greboards = [];
  var getIP = require('./getIP.js');
  var IPLocal = getIP(intr, 'IPv4');

  var connection = new autobahn.Connection({
    url:wamp_router_url,
    realm: wamp_realm
  });



  connection.onopen = function (session, details) {

    

    var rest = express();

    //----------Arthur New-----------------------------------------------
    process.on('SIGINT', function(){
      for(var i = 0; i < networksArray.length; i++) {
        spawn('ip',['link','set','br'+networksArray[i].uuid.substring(0, 6),'down']);
        spawn('brctl',['delbr','br'+networksArray[i].uuid.substring(0, 6)]);
      }
      for(i = 0; i < greDevices.length; i++) {
        spawn('ip',['link','del',greDevices[i]]);
      }
      process.exit();
    });                                                                              

    process.on('SIGTERM', function(){                                                        
      for(var i = 0; i < networksArray.length; i++) {
        spawn('ip',['link','set','br'+networksArray[i].uuid.substring(0, 6),'down']);
        spawn('brctl',['delbr','br'+networksArray[i].uuid.substring(0, 6)]);
      }
      for(i = 0; i < greDevices.length; i++) {
        spawn('ip',['link','del',greDevices[i]]);
      }
     process.exit();
    });
    //-------------------------------------------------------------------
    
    rest.get('/', function (req, res){
      res.send('API: <br> http://'+IPLocal+':'+restPort+'/list   for board list');
    });

    rest.get('')


    rest.get('/command/', function (req, res){

      
      var board = req.query.board;
      var command = req.query.command;
      var pin = req.query.pin;
      var mode = req.query.mode;
      var value = req.query.val;
      var op = req.query.op;
      var tmis = req.query.tmis;
      var nmis = req.query.nmis;
      //------ Arthur New-------------
      var netname = req.query.netname;
      var netuid = req.query.netuid;
      //------------------------------
      
      res.type('application/json');

      var checkList = false;
      var boardlist = [];

           //Check if the POST board variable is a single board ID or a list of boards 
      /*      if(board.indexOf(",") > -1) {
              boardlist = board.split(",");
              checkList = arrayContainsAnotherArray(boardlist, boards); 
            }
            else
              boardlist.push(board);

            console.log("boardlist:::"+boardlist);
      */
      if(board != undefined){
        var boardlist = board.split(",");
      }
      //-----------------Arthur New -----------------------------------------
      if(command == 'create-network' || command == 'remove-from-network' || command == 'show-network'
          || command == 'destroy-network' || command == 'update-network'
          || command == 'show-boards' || boards[board] != undefined 
          || arrayContainsAnotherArray(boardlist, boards) ){
      //---------------------------------------------------------------------

            //if(boards[board] != undefined || checkList){
              //if(boards[board] != undefined){
     			    //DEBUG Message
              //console.log("ID exsist");
              //console.log(command);

              //Services managment
        switch(command){
          case 'tty':
            exportService();
            break;
          case 'ssh':
            exportService();
            break;
          case 'ideino':
            exportService();
            break;
          case 'osjs':
            exportService();
            break;
          //PIN management  
          case 'mode':
          //DEBUG
          console.log("MODE");
            var response = {
              message: 'Set Mode',
              error: {},
            }

            session.call(board+'.command.rpc.setmode', [pin, mode]).then(
              function(result){
              response.error = result;
              res.send(JSON.stringify(response));
            } , session.log);
            break;

          case 'analog':
            var response = {
              message : 'Analog',
              result: {}
            }
            if(value!=undefined){
              //DEBUG
              console.log('ANALOG WRITE');
              response.message += ' Write'
              session.call(board+'.command.rpc.write.analog', [board, command, pin, value]).then(
                function(result){
                  response.result = result;
                  res.send(JSON.stringify(response));
                } , session.log);
            }
            else{
              //DEBUG message
              console.log('ANALOG READ');
              response.message += ' Read'
              session.call(board+'.command.rpc.read.analog', [board, command, pin]).then(
                function(result){
                  response.result = result;
                  res.send(JSON.stringify(response));
                }, session.log);
            }
            break;

          case 'misura':
            var response = {
              result: {}
            }
            //DEBUG
            console.log('MISURE');
            
            session.publish(topic_command, [board, command, pin, op, tmis, nmis]);
            response.result = [board, command, pin, op, tmis, nmis];
            res.send(JSON.stringify(response));
            break;

          case 'digital':
            var response = {
              message: 'Digital ',
              result:{}
            }

            if(value!=undefined){
              //DEBUG
              console.log('DIGITAL WRITE');
              response.message += 'Write';
              session.call(board+'.command.rpc.write.digital', [board, command, pin, value]).then(
                function(result){
                  response.result = result;
                  res.send(JSON.stringify(response));
                } , session.log);
            }
            else{
              //DEBUG Message
              console.log('DIGITAL READ');
              response.message+= 'Read';
              session.call(board+'.command.rpc.read.digital', [board, command, pin]).then(
                function(result){
                  response.result = result;
                  res.send(JSON.stringify(response));
                } , session.log);
            }
            break;
          case 'create-network':
            createNetwork();
            break;
          case 'add-to-network':
            addToNetwork();
            break 
          case 'remove-from-network':
            removeFromNetwork();
            break;
          case 'update-network':
            updateNetwork()
            break;

          case 'update-board':
            updataBoard();
            break;
          case 'destroy-network':
            destroyNetwork();
            break;
          case 'show-network':
            showNetwork();
            break;
          case 'show-boards':
            showBoards();
            break;

          default:
            //DEBUG MESSAGE
            console.log("Default Case");
            
            var response = {
              error:{}
            }
            response.error='ERROR COMMAND';
            res.send(JSON.stringify(response));
            break;
        }
      }

      else{
        //DEBUG
        console.log("ID DOESN'T exsist");
        var response = {
          error:{}
          }
        response.error="ID doesn't exsist";
        res.send(JSON.stringify(response));
      }

      function showBoards(){
        var response = {
          message:"Showing boards in a network",
          result:[]
        }

        if(netuid == undefined) {
          response.result.push("You must specify the network uid");
        } else {
          var position = findValue(networksArray,netuid,'uuid');
          if(position != -1) {
            var network = networksArray[position];
            response.result.push(network.nethosts);
          } else {
            response.result.push("That network uid does not exist");
          }
        }

        res.send(JSON.stringify(response,null,"\t"));
      }

      function showNetwork(){
        var response = {
          message:"list of networks",
          result:[]
        }

        for(var i = 0; i < networksArray.length; i++) {
          var temporary = {
            uuid:networksArray[i]['uuid'],
            name:networksArray[i]['name'],
            address:networksArray[i]['netaddr'],
            size:networksArray[i]['netsize'],
            hosts:networksArray[i]['nethosts']
          }

          response.result.push(temporary);
        }
        res.send(JSON.stringify(response,null,"\t"));
      }

      function destroyNetwork(){
        var response = {
          message:"Destroying network",
          result:[]
        }
        if(netuid == undefined) {
          response.message = "Please specify a network name";
        } else {
          var position = findValue(networksArray,netuid,'uuid');
          if(position != -1){
            var temporary = {
              uuid:networksArray[position]['uuid'],
              name:networksArray[position]['name'],
              address:networksArray[position]['netaddr'],
              size:networksArray[position]['netsize'],
              hosts:networksArray[position]['nethosts']
            }
            for(var j = 0; j < temporary.hosts.length; j++) {
              var tempHosts = temporary.hosts[j];
              session.publish(topic_command, [tempHosts['value'],'remove-from-network',tempHosts.device,tempHosts.socatMap]);
              socatBoards.splice(findValue(socatBoards,tempHosts.socatMap,'key'),1);
            }
            networksArray.splice(position,1);
            response.result.push(temporary);
            var testing = spawn('ip',['link','set','br'+temporary.uuid.substring(0, 6),'down']);
            testing.on('close',function(code) {
              spawn('brctl',['delbr','br'+temporary.uuid.substring(0, 6)]);
            });
          } else {
            response.result = "That network uid does not exist"
          }
        }
        res.send(JSON.stringify(response,null,"\t"));
      }

      function updataBoard(){
        var response = {
          message:"Updating board",
          result:[]
        }
        if(netuid == undefined) {
          response.result.push("You must specify the network uid");
        } else {
          var position = findValue(networksArray,netuid,'uuid');
          if(position != -1) {
            var network = networksArray[position];
            var boardInNet = findValue(network.nethosts,board,'value');
            if(boardInNet != -1) {
              var hostBoard = network.nethosts[boardInNet];
              var firstI = ip.toLong(network.netaddr);
              var lastI = firstI + network.netsize;
              var reqIp = ip.toLong(value);
              if(reqIp > firstI && reqIp <= lastI) {//if req IP in range
                var reqGreNum = reqIp - (firstI+1); //firstI is the network address, so the first available is firstI+1
                if(findValue(network.nethosts,reqGreNum,'key') == -1) { //if that key is free
                  hostBoard.key = reqGreNum;
                  session.publish(topic_command,[board,'update-board',value+"/"+network.netmask,hostBoard.device,hostBoard.addr+"/"+network.netmask,network.netbc]);
                  hostBoard.addr = value;
                  response.result.push(hostBoard);
                }
                else {
                  response.result.push("The requested ip is not available");
                }
              } else {
                response.result.push("The requested ip is not in the network range");
              }
            } else {
                response.result.push("Board " + board + " is not connected to the specified network");
            }
          } else {
            response.result.push("That network uid does not exist");
          }
        }
        res.send(JSON.stringify(response,null,"\t"));
      }

      function updateNetwork(){
        //envoyer un push update-board a toutes les boards avec la nouvelle information
        //si changement d'ip et/ou de masque, changer d'abord dans le réseau, puis transmettre aux boards
        var response = {
          message:"Updating network",
          result:[]
        }
        if(netuid == undefined) {
          response.message = "Please specify a network name";
        } else {
          var position = findValue(networksArray,netuid,'uuid');
          if(position != -1){
            var temporary = networksArray[position];
            if(netname != undefined) {
              temporary['name'] = netname;
            }
            if(value != undefined) {
              var network = ip.cidrSubnet(value);
              var first = ip.toLong(network.networkAddress);
              var last = ip.toLong(network.broadcastAddress);
              var overlap = false;
              for(var i = 0; i < networksArray.length; i++) {
                if(i!=position) { //because the network might overlap with its old self, which is not a problem so we ignore that specific case
                  var firstI = ip.toLong(networksArray[i].netaddr);
                  var lastI = firstI + networksArray[i].netsize;
                  if((first >= firstI && first<=lastI) || (last >= firstI && last<=lastI)) {
                    overlap = true;
                    break; //no need to look further so leave the loop
                  }
                }
              }
              if(!overlap) {
                var newNetwork = ip.cidrSubnet(value);
                if(newNetwork.numHosts >= temporary.nethosts.length) {
                  var oldMask = "/" + temporary.netmask;
                  temporary.netaddr = newNetwork.networkAddress;
                  temporary.netmask = newNetwork.subnetMaskLength;
                  temporary.netbc = newNetwork.broadcastAddress;
                  temporary.netsize = newNetwork.numHosts;

                  for(var j = 0; j < temporary.nethosts.length; j++) {
                    var tempHosts = temporary.nethosts[j];
                    var oldAddrMask = tempHosts.addr + oldMask ;
                    tempHosts.addr = ip.fromLong(ip.toLong(temporary.netaddr) + tempHosts.key + 1);
                    session.publish(topic_command, [tempHosts['value'],'update-board',tempHosts.addr+"/"+temporary.netmask,tempHosts.device,oldAddrMask,temporary.netbc]);
                  }

                  response.result = {
                                      netuid: temporary.uuid,
                                      netname: temporary.name,
                                      netaddr: temporary.netaddr,
                                      netmask: temporary.netmask
                                    }

                } else {
                  response.result.push("Network too small to contain all of its hosts")
                }
              }
            }
            


            //assigner nouvelles valeurs au network, sauvegarder anciennes valeurs nécessaires
            /*
            for(var j = 0; j < temporary.hosts.length; j++) {
              var tempHosts = temporary.hosts[j];
              session.publish(topic_command, [tempHosts['value'],'update-board',tempHosts.device,tempHosts.socatMap]);
              socatBoards.splice(findValue(socatBoards,tempHosts.socatMap,'key'),1);
            }*/

          } else {
            response.result = "That network uid does not exist"
          }
        }
        res.send(JSON.stringify(response,null,"\t"));
      }

      function removeFromNetwork(){
        var response = {
          message:"Removing boards from a network",
          result:[]
        }
        if(netuid == undefined) {
          response.result.push("You must specify the network uid");
        } else {
          var position = findValue(networksArray,netuid,'uuid');
          if(position != -1) {
            var network = networksArray[position];
            for(var i = 0; i < boardlist.length; i++) {
              var boardInNet = findValue(network.nethosts,boardlist[i],'value');
              if(boardInNet != -1) {
                var hostBoard = network.nethosts[boardInNet];
                var greDev = network.uuid.substring(0, 6)+'-'+boardlist[i].substring(0,6);
                spawn('ip',['link','del',greDev]);
                response.result.push(hostBoard);
                var boardSocatNum = findValue(socatBoards,hostBoard.socatMap,'key');
                session.publish(topic_command, [boardlist[i],'remove-from-network',greDev,hostBoard.socatMap]);
                socatBoards.splice(boardSocatNum,1);
                network.nethosts.splice(boardInNet,1);
              } else {
                response.result.push("Board " + boardlist[i] + " is not connected to the specified network");
              }
            }
          } else {
            response.result.push("That network uid does not exist");
          }
        }
        res.send(JSON.stringify(response,null,"\t"));
      }

      function addToNetwork(){
        var response = {
          message:"Adding boards to a network",
          result:[]
        }
        if(netuid == undefined){
          response.result.push("You must specify the network uid");
        } else {
          var position = findValue(networksArray,netuid,'uuid');
          if(position != -1){
            var network = networksArray[position];
            var temp = [];
            for(var j = 0; j < network['nethosts'].length; j++){
              temp.push(network['nethosts'][j]['value']);
            }
            if(network.netsize >= boardlist.concat(temp).unique().length){
              var establishTunnels = [];
              spawn('ip',['link','set','br'+network.uuid.substring(0, 6),'down']);
              for(var i = 0; i < boardlist.length; i++) {
                var bSocatNum = findFirstFreeKey(socatBoards);
                var bGreNum = 0;
                var reqIp = -1;
                if(value != undefined) {
                  reqIp = ip.toLong(value); //considering value is a valid ip
                  var firstI = ip.toLong(network.netaddr);
                  var lastI = firstI + network.netsize;
                  if(reqIp > firstI && reqIp <= lastI) { //the requested ip is in the network
                    var reqGreNum = reqIp - (firstI+1); //firstI is the network address, so the first available is firstI+1
                    if(findValue(network.nethosts,reqGreNum,'key') == -1) { //if that key is free
                      bGreNum = reqGreNum;
                    } else { //not available, default ip given
                      bGreNum = findFirstFreeKey(network.nethosts);
                      reqIp = -1;
                    }
                  } else { //wrong ip, default ip given
                    bGreNum = findFirstFreeKey(network.nethosts);
                    reqIp = -1;
                  }
                } else {
                  bGreNum = findFirstFreeKey(network.nethosts);
                }
                var hostAddress = ip.fromLong(ip.toLong(network.netaddr) + bGreNum + 1);
                var socatNetAddr = ip.toLong(socatNetwork) + (bSocatNum*4);
                var socatHostAddr = ip.fromLong(socatNetAddr+2);
                var socatServAddr = ip.fromLong(socatNetAddr+1);
                var elem = {
                  board: boardlist[i],
                  socatIP: socatHostAddr,
                  socatPort: parseInt(basePort)+bSocatNum,
                  socatServ: socatServAddr,
                  greIP: hostAddress,
                  greTap: network.uuid.substring(0, 6)+'-'+boardlist[i].substring(0,6),
                  greBC: network.netbc,
                  greMask: network.netmask,
                  netuid: network.uuid
                }
                var positionB = findValue(network.nethosts,boardlist[i],'value');
                if(positionB == -1) { //if the board isn't configured
                  establishTunnels[i] = createEstablishTunnels(session,topic_command, elem);
                  establishTunnels[i]();
                  response.result.push(elem);
                  var map = {
                    key: bSocatNum,
                    value: elem.board
                  };
                  socatBoards.push(map);
                  var map2 = {
                    key: bGreNum,
                    socatMap: bSocatNum,
                    value: elem.board,
                    addr: elem.greIP,
                    device: elem.greTap,
                    state: 1
                  }
                  network.nethosts.push(map2);
                } else if(network.nethosts[positionB].state == 1){
                  response.result.push("board already configured");
                } else {
                  bSocatNum = network.nethosts[positionB].socatMap;
                  if(reqIp == -1){
                    bGreNum = network.nethosts[positionB].key;
                  }
                  socatNetAddr = ip.toLong(socatNetwork) + (bSocatNum*4);
                  elem.socatIP = ip.fromLong(socatNetAddr+2);
                  elem.socatPort = parseInt(basePort)+bSocatNum;
                  elem.socatServ = ip.fromLong(socatNetAddr+1);
                  elem.greIP = ip.fromLong(ip.toLong(network.netaddr) + bGreNum + 1);

                  if(reqIp != -1) {
                    network.nethosts[positionB].addr = elem.greIP;
                  }

                  network.nethosts[positionB].state = 1;
                  establishTunnels[i] = createEstablishTunnels(session,topic_command, elem);
                  establishTunnels[i]();
                  response.result.push(elem);
                }
              }
            spawn('ip',['link','set','br'+network.uuid.substring(0, 6),'up']);
            } else {
              response.result.push("You need a bigger subnet");
            }
          } else {
            response.result.push("That network uid does not exist");
          }
        }
        res.send(JSON.stringify(response,null,"\t"));

      }

      function createNetwork(){
        var response = {
          message:{},
          result:{}
        }
        if(netname == undefined) {
          response.message = "Please specify a network name";
        } else if(value == undefined) {
          response.message = "Please specify a network address";
        } else {
          var network = ip.cidrSubnet(value);
          var first = ip.toLong(network.networkAddress);
          var last = ip.toLong(network.broadcastAddress);
          var overlap = false;
          for(var i = 0; i < networksArray.length; i++) {
            var firstI = ip.toLong(networksArray[i].netaddr);
            var lastI = firstI + networksArray[i].netsize;
            if((first >= firstI && first<=lastI) || (last >= firstI && last<=lastI)) {
              overlap = true;
              break; //no need to look further so leave the loop
            }
          }
          if(!overlap) {
            var newNW = {
              key:findFirstFreeKey(networksArray),
              uuid:"",
              name:netname,
              netaddr:network.networkAddress,
              netmask:network.subnetMaskLength,
              netbc:network.broadcastAddress,
              netsize:network.numHosts,
              nethosts:[]
            }
            var idArray = {};
            uuid.v4(null,idArray,0);
            newNW.uuid = uuid.unparse(idArray);
            networksArray.push(newNW);
            response.message="Network created";
            response.result=newNW;
            var comodo = spawn('brctl',['addbr','br'+newNW.uuid.substring(0, 6)]);
          } else {
            response.result="Network overlaps with other network(s)";
          }
        }
        res.send(JSON.stringify(response,null,"\t"));
      }


      function exportService(){

        var response = {
          ip: IPLocal,
          port: {},
          service:command
        }
        
        if(op=="start" || op=="stop"){
          //DEBUG
          console.log("Command: "+command);
          
          if(op=="start"){
            db.checkService(board, command, function(data){
              if(data == 0){
                //DEBUG
                console.log("Service "+command+" Never started");
                
                //newPort function is used because we need a TCP port not already used
                newPort(function(port){
                  //DEBUG
                  //console.log("New Port:::"+data);
                  
                  session.publish(topic_command, [board, command, port,op]);
                  response.port = port;
                  response.status=op;
                  res.send(JSON.stringify(response));
                  db.insertService(board,command,port, function(result){
                    //DEBUG
                    //console.log("Insert Service::"+result);
                  });
                });
              }
              else{
                //DEBUG
                console.log("Service already started");
                db.getPortService(board,command, function(data){
                  //DEBUG
                  //console.log(data);
                  response.status=op;
                  response.port=data;
                  res.send(JSON.stringify(response));
                });
              }
            });  
          }
          if(op=="stop"){
            response.status=op;
            db.checkService(board,command, function(data){
              if(data == 0){
                console.log("It not already started");
                res.send(JSON.stringify(response));
              }
              else{
                db.getPortService(board,command, function(data){
                  //DEBUG
                  console.log("Service "+command+ "stopped");
                  response.port = data;
                  session.publish(topic_command, [board, command, response.port, op]);
                  db.removeService(board,command, function(data){
                    //DEBUG
                    //console.log(data);
                    res.send(JSON.stringify(response));
                  })
                });
              }
            });
          }
        }
        else{
          response.status="error";
          res.send(JSON.stringify(response));
        }
      }
     
    });

   	rest.get('/list/', function (req, res){
   		
      res.type('application/json');
       var list=[];
        var response = {
          list: {}
        };
        db.getBoardsId(function(data){
          /*for(var i=0; i<data.length; i++){
            list[i] = data[i].name;
          }
          console.log(list);*/
          response.list = data;
          res.send(JSON.stringify(response));
        });
        
       //first it checks if there are board
       /*if(Object.keys(boards).length==0){
          response.list=list;
       }
       else{
          for (var i in boards){
             list.push(boards[i]); 
          }
          response.list=list;
       }
       //res.json(JSON.stringify(response));
       res.send(JSON.stringify(response));*/
    });

        
   	rest.listen(restPort);
    console.log("Server REST started on: http://"+IPLocal+":"+restPort);

   	console.log("Connected to router WAMP");
      // Publish, Subscribe, Call and Register

    var onBoardConnected = function (args){
    	

    	if(args[1]=='connection'){
    		boards[args[0]] = args[0];
    		//DEBUGGG Message
        //  console.log("Board connected:"+args[0]+" board state:"+args[1]);
    		//DEBUGGG Message
    		//console.log("List of board::"+Object.keys(boards).length);
    		for (var i in boards){
    			console.log('Key: '+i+' value: '+boards[i]);
    		}
    
        db.checkBoard(args[0], function(data){
          console.log("data.length::"+data.length);
          if(data.length == 0){
            //DEBUG
            console.log("First Connection of the Board "+args[0]);
            db.insertBoard(args[0],args[2],'active', function(result){
              console.log("Risultato della insert:::"+result);
            });
          }
          else{
            db.changeBoardState(args[0],args[2],'active', function(result){
              //DEBUG
              db.checkBoard(args[0], function(data){
                console.log("Now the status of the board is:");
                console.log("name"+data[0].name);
                console.log("session"+data[0].session);
                console.log("stato"+data[0].state);  
              })
              
            });

          }
        });
      }
    	if(args[1]=='disconnect'){
    		delete boards[args[0]];
    		//DEBUGGG
        //  console.log("Board disconnected:"+args[0]+" board state:"+args[1]);
    		//DEBUGGG
    		//console.log("List of the board::"+Object.keys(boards).length);
    		for (var i in boards){
    			console.log('Key: '+i+' value: '+boards[i]);
    		}
/*
        db.checkBoard(args[0], function(data){
          if (data.length == 0) {
            console.log("The disconnected board is not present in DB!!!!!");
          }
          else{
            //DEBUG
            console.log("State of the board "+args[0]+" before "+data[0].state);
            db.changeBoardState(args[0],'off','null',function(result){
              //DEBUG
              db.checkBoard(args[0], function(data){
                console.log("State of the board "+args[0]+" now:"+data[0].state);
              });
            });
          }
        });*/
    	}
    }

    session.subscribe(topic_connection, onBoardConnected);
    console.log("Subsscribe to topic: "+topic_connection);

    //DEBUGGGGG
    var onJoin_function = function (args){
      console.log("Connection Session:::::"+args[0].session);
    }
    var onLeave_function = function(session_id){
      console.log("Find with SESSION code::"+session_id);
      db.findBySessionId(session_id, function(data){
        //DEBUG
        console.log("length result"+data.length);
        if(data.length == 1){
          db.changeBoardState(data[0].name,'null','off', function(result){
            //DEBUG
            db.checkBoard(data[0].name, function(data){
              console.log("Now the status of the board is:");
              console.log("name"+data[0].name);
              console.log("session"+data[0].session);
              console.log("stato"+data[0].state);  
            });
            
          });
        }  
      });
    }

    session.subscribe('wamp.session.on_join',onJoin_function);
    session.subscribe('wamp.session.on_leave',onLeave_function);

  }

  connection.onclose = function (reason, details) {
  // handle connection lost
  }

  connection.open();

}

//function to calculate a new tcp port not already used
function newPort(callback){
  var port = randomIntInc(6000,7000);
  db.checkPort(port, function(data){
    //DEBUG
    //console.log("PORT::::"+port);
    //console.log("data::"+data);
    
    if(data == 0){
      //console.log("FALSE::::"+port+" data:"+data);
      return callback(port);
    }
    else{
      newPort();
    }
  });     
}


//This function returns a pseudo random number in a range
function randomIntInc (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function arrayContainsAnotherArray(needle, haystack){
  for(var i = 0; i < needle.length; i++){
    if(haystack[needle[i]] == undefined)
       return false;
  }
  return true;
}

function createEstablishTunnels(session,topic_command,elem){
  return function() {
    session.publish(topic_command, [elem.board,'add-to-network',elem.socatIP,elem.socatServ,elem.socatPort,elem.greIP,elem.greBC,elem.greMask,elem.greTap,(elem.socatPort-parseInt(basePort))]);

    var servSocat = spawn('socat',['-d','-d','TCP:localhost:'+elem.socatPort+',reuseaddr,forever,interval=10','TUN:'+elem.socatServ+'/30,up']);
    servSocat.stdout.on('data', function (data) {
     console.log('stdout: ' + data);
    });
    servSocat.stderr.on('data', function (data) {
      var textdata = 'stderr: ' + data;
      console.log(textdata);
      if(textdata.indexOf("starting data transfer loop") > -1){
              //
              console.log('creating gre tunnels: ' + JSON.stringify(elem));
              //
              var testing = spawn('ip',['link','add',elem.greTap,'type','gretap','remote',elem.socatIP,'local',elem.socatServ]);
              testing.stdout.on('data', function (data) {
                console.log('create link: ' + data);
              });
              testing.stderr.on('data', function (data) {
                console.log('create link: ' + data);
              });
              testing.on('close', function (code) {
                console.log('create link child process exited with code ' + code);
                if(code == 0) {
                  greDevices.push(elem.greTap);
                  var testing2 = spawn('ip',['link','set',elem.greTap,'up']);
                  testing2.stdout.on('data', function (data) {
                    console.log('turn if up: ' + data);
                  });
                  testing2.stderr.on('data', function (data) {
                    console.log('turn if up: ' + data);
                  });
                  testing2.on('close', function (code) {
                    console.log('turn if up child process exited with code ' + code);
                    var testing3 = spawn('brctl',['addif','br'+elem.greTap.substring(0, 6),elem.greTap]);
                    testing3.stdout.on('data', function (data) {
                      console.log('add to bridge: ' + data);
                    });
                    testing3.stderr.on('data', function (data) {
                      console.log('add to bridge: ' + data);
                    });
                    testing3.on('close', function (code) {
                      console.log('turn up child process exited with code ' + code);
                    });
                  });
                }
              });
      }
    });

    servSocat.on('close', function (code) {
      spawn('ip',['link','del',elem.greTap]);
      var i = findValue(networksArray,elem.netuid,'uuid');
      if(i != -1) {
        var j = findValue(networksArray[i].nethosts,elem.board,'value');
        if(j!=-1) {
          networksArray[i].nethosts[j].state = 0;
        }
      }
    });
  };
}
// myArray is the array being searched
// value is the value we want to find
// property is the name of the field in which to search
function findValue(myArray, value, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
       if (myArray[i][property] === value) {
          return i;
       }
    }
    return -1;
}

function findFirstFreeKey(myArray){
    var found = -1, len = myArray.length;
    for(var i = 0; i < len; i++){
       found = findValue(myArray,i,'key');
       if(found == -1) {
          return i;
       }
    }
    return len;
}

Array.prototype.unique = function() {
    var a = this.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }
    return a;
};

module.exports = s4t_wamp_server;