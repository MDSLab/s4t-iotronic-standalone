/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 Andrea Rocco Lotronto
*/

var autobahn = require('autobahn');
var express = require('express');
var ip = require('ip');
var spawn = require('child_process').spawn;

var nconf = require('nconf');
nconf.file ({file: 'setting.json'});

var socatNetwork = nconf.get('config:socat:ip');
var basePort = nconf.get('config:socat:server:port');

s4t_wamp_server = function(){


}

s4t_wamp_server.prototype.start = function(restPort, wamp_router_url){


   var boards = {};
   var greboards = [];//Arthur
   var getIP = require('./getIP.js');
   var IPLocal = getIP('eth0', 'IPv4');

   //var url_wamp_router = "ws://172.17.3.139:8181/ws";  //example of url wamp router

   var connection = new autobahn.Connection({
      //url: url_wamp_router,
      url:wamp_router_url,
      realm: "s4t"
   });

   var topic_command = 'board.command'
   var topic_connection = 'board.connection'

   connection.onopen = function (session, details) {


   	var rest = express();

//----------Arthur
   process.on('SIGINT', function(){
      for(var i = 0; i < greboards.length; i++) {
         spawn('ip',['link','del',greboards[i]['value']+'-gre']);
      }
      process.exit();
   });                                                                              
    
   process.on('SIGTERM', function(){                                                        
      for(var i = 0; i < greboards.length; i++) {
         spawn('ip',['link','del',greboards[i]['value']+'-gre']);
      }
      process.exit();
   });

//--------------------




      rest.get('/', function (req, res){
         res.send('API: <br> http://'+IPLocal+':'+restPort+'/list   for board list');
      });

      rest.get('')


   	rest.get('/command/', function (req, res){

         //DEBUG Message
   		//console.log('POST::::'+req.originalUrl);
   		
         var board = req.query.board;
   		var command = req.query.command;
         var pin = req.query.pin;
         var mode = req.query.mode;
         var value = req.query.val;
         var op = req.query.op;
         var tmis = req.query.tmis;
         var nmis = req.query.nmis;

         res.type('application/json');

         
         var boardlist = board.split(",");
         if(boards[board] != undefined || arrayContainsAnotherArray(boardlist, boards)){//----Arthur-------------

         //if(boards[board] != undefined){
   			//DEBUG Message
            //console.log("ID exsist");
            //console.log(command);
            switch(command){
               case 'tty':
                  var response = {
                     ip: IPLocal,
                     port: {},
                     service:'tty'
                  }
                  //random port for reverse service
                  var port = randomIntInc(6000,7000);
                  session.publish(topic_command, [board, command, port]);
                  response.port = port;
                  res.send(JSON.stringify(response));

                  //res.send("ssh -p "+port+" root@"+IPLocal);
                  //res.json(IPLocal+':'+port);

                  break;

               case 'ssh':
                  var response = {
                     ip: IPLocal,
                     port: {},
                     service:'ssh'
                  }
                  //random port for reverse service
   			      var port = randomIntInc(6000,7000);
   			      session.publish(topic_command, [board, command, port]);
                  response.port = port;
                  res.send(JSON.stringify(response));

                  //res.send("ssh -p "+port+" root@"+IPLocal);
                  //res.json(IPLocal+':'+port);

                  break;

               case 'ideino':
                  var response = {
                     ip: IPLocal,
                     port: {},
                     service:'ideino'
                  }
                  var port = randomIntInc(6000,7000);
                  session.publish(topic_command, [board, command, port]);
                  response.port = port;
                  res.send(JSON.stringify(response));
                  //res.send("http://"+IPLocal+":"+port);
                  //res.json(IPLocal+':'+port);
                  break;

               case 'osjs':
                  var response = {
                     ip: IPLocal,
                     port: {},
                     service:'osjs'
                  }
                  var port = randomIntInc(6000,7000);
                  session.publish(topic_command, [board, command, port]);
                  response.port = port;
                  res.send(JSON.stringify(response));
                  //res.send("http://"+IPLocal+":"+port);
                  //res.json(IPLocal+':'+port);
                  break;

               case 'mode':
                  var response = {
                     result: {}
                  }

                  session.call(board+'.command.rpc.setmode', [pin, mode]).then(
                     function(result){
                        response.result = result;
                        res.send(JSON.stringify(response));
                     } , session.log);
                  break;

               //Analog
               case 'analog':
                  var response = {
                     result: {}
                  }
                  if(value!=undefined){//WRITE
                     console.log('ANALOG WRITE');
                     session.call(board+'.command.rpc.write.analog', [board, command, pin, value]).then(
                        function(result){
                           response.result = result;
                           res.send(JSON.stringify(response));
                     } , session.log);
                  }
                  else{
                  //DEBUG message
                  console.log('ANALOG READ');
                  session.call(board+'.command.rpc.read.analog', [board, command, pin]).then(
                     function(result){
                        response.result = result;
                        res.send(JSON.stringify(response));
                     }, session.log);
                  }
                  break;

               //Misure
               case 'misura':
                  var response = {
                     result: {}
                  }
                  console.log('MISURE');
                  session.publish(topic_command, [board, command, pin, op, tmis, nmis]);
                  response.result = [board, command, pin, op, tmis, nmis];
                  res.send(JSON.stringify(response));
                  break;
/*
               case 'turnMotor':
                  var response = {
                     result: {}
                  }
                  console.log('TURN MOTOR');
                  session.publish(topic_command, [board, command, pin, value]);
                  response.result = [board, command, pin, value];
                  res.send(JSON.stringify(response));
                  break;
*/                  
               //Digital
               case 'digital':
                  var response = {
                        result: {}
                  }

                  if(value!=undefined){//WRITE
                     //DEBUG Message
                     console.log('DIGITAL WRITE');
                     session.call(board+'.command.rpc.write.digital', [board, command, pin, value]).then(
                        function(result){
                           response.result = result;
                           res.send(JSON.stringify(response));
                     } , session.log);
                  }
                  else{
                     //DEBUG Message
                     console.log('DIGITAL READ');
                     session.call(board+'.command.rpc.read.digital', [board, command, pin]).then(
                        function(result){
                           response.result = result;
                           res.send(JSON.stringify(response));
                     } , session.log);

                  }

                  break;

               case 'create-network':
                    var response = {
                      message:{},
                      result:{}
                   }
                    if(value == undefined){
                        message = "Please specify subnet";
                        response.message = message;

                     } else {
                        var network = ip.cidrSubnet(value);
                     var temp = [];
                     for(var j = 0; j < greboards.length; j++){
                        temp.push(greboards[j]['value']);
                     }
                     if(network.numHosts >= boardlist.concat(temp).unique().length){
                         var establishTunnels = [];
                         spawn('brctl',['addbr','brgre']);
                         spawn('ip',['link','set','brgre','down']);//just in case it already exists
                         for(var i = 0; i < boardlist.length; i++) {
                              var bnum = findFirstFreeKey(greboards);;
                              var hostAddress = ip.fromLong(ip.toLong(network.firstAddress) + bnum);
                              console.log("LOGGGGGGGG::"+socatNetwork);
                              var socatNetAddr = ip.toLong(socatNetwork) + (bnum*4);
                              var socatHostAddr = ip.fromLong(socatNetAddr+2);
                              var socatServAddr = ip.fromLong(socatNetAddr+1);
                              var elem = {
                                    board: boardlist[i],
                                    socatIP: socatHostAddr,
                                    socatPort: parseInt(basePort)+bnum,
                                    socatServ: socatServAddr,
                                    greIP: hostAddress,
                                    greTap: boardlist[i]+'-gre',
                                    greBC: network.broadcastAddress,
                                    greMask: network.subnetMaskLength
                              }
                              if(findValue(greboards,boardlist[i],'value') == -1) { //if the board isn't configured
                                  establishTunnels[i] = createEstablishTunnels(session,topic_command, elem);
                                  establishTunnels[i]();
                                  response.message = "OK";
                                  response.result = elem;
                                    var map = {
                                       key: bnum,
                                       value: elem.board
                                    };
                                  greboards.push(map);
                              } else {
                                message = "board already configured";
                                  response.message = message;
                              }
                        
                        }
                        spawn('ip',['link','set','brgre','up']);
                     } else {
                         message = "You need a bigger subnet";
                         response.message = message;

                     }
                  }
                  res.send(JSON.stringify(response));
                  break; 
      
               case 'remove-from-network':
                   var response = {
                      message:{},
                      result:{}
                   }
                   for(var i = 0; i < boardlist.length; i++) {
                      var boardindex = findValue(greboards, boardlist[i], 'value');
                      if(boardindex > -1) {
                    session.publish(topic_command, [boardlist[i],'remove-from-network']);
                    var elem = 'disconnecting ' + boardlist[i] + ' from GRE network';
                         spawn('ip',['link','del',boardlist[i]+'-gre']);
                    greboards.splice(boardindex,1);
                    console.log(elem);
                    if(i==0)
                      response.message = elem;
                    else
                      response.message += elem;
                      }
                   }
                   res.send(JSON.stringify(response));
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
   
   	});

   	rest.get('/list/', function (req, res){
   		
        res.type('application/json');
         var list=[];
         var response = {
            list: {}
         };
         //first it checks if there are board
         if(Object.keys(boards).length==0){
            response.list=list;
         }
         else{
            for (var i in boards){
               list.push(boards[i]); 
            }
            response.list=list;
         }
         //res.json(JSON.stringify(response));
         res.send(JSON.stringify(response));
      });

      
   	rest.listen(restPort);
      console.log("Server REST started on: http://"+IPLocal+":"+restPort);

   	console.log("Connected to router WAMP");
      // Publish, Subscribe, Call and Register

      var onBoardConnected = function (args){
      	//registrare le schede che si connettono
         console.log(args);
         
      	if(args[1]=='connection'){
      		boards[args[0]] = args[0];
      		//DEBUGGG Message
            console.log("Board connected:"+args[0]+" board state:"+args[1]);
      		//DEBUGGG Message
      		console.log("List of board::"+boards.length);
      		for (var i in boards){
      			console.log('Key: '+i+' value: '+boards[i]);
      		}

      	}
      	if(args[1]=='disconnect'){
      		delete boards[args[0]];
      		//DEBUGGG
            console.log("Board disconnected:"+args[0]+" board state:"+args[1]);
      		//DEBUGGG
      		console.log("List of the board::"+boards.length);
      		for (var i in boards){
      			console.log('Key: '+i+' value: '+boards[i]);
      		}
      	}   
      }

      session.subscribe(topic_connection, onBoardConnected);
      console.log("Subsscribe to topic: "+topic_connection);
   };

   connection.onclose = function (reason, details) {
      // handle connection lost
   }

   connection.open();

}

//function for pseudo random number
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
      session.publish(topic_command, [elem.board,'create-network',elem.socatIP,elem.socatServ,elem.socatPort,elem.greIP,elem.greBC,elem.greMask]);

      console.log("SOCAT SPAWN :::::"+'TCP:localhost:'+elem.socatPort+',reuseaddr,forever,interval=10','TUN:'+elem.socatServ+'/30,up')
      
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
                 var testing2 = spawn('ip',['link','set',elem.greTap,'up']);
                 testing2.stdout.on('data', function (data) {
                    console.log('turn if up: ' + data);
                 });
                 testing2.stderr.on('data', function (data) {
                    console.log('turn if up: ' + data);
                 });
                 testing2.on('close', function (code) {
                    console.log('turn if up child process exited with code ' + code);
                    var testing3 = spawn('brctl',['addif','brgre',elem.greTap]);
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
              });
           }
        });

        servSocat.on('close', function (code) {
           console.log('child process exited with code ' + code);
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