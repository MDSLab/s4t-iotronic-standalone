/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 Andrea Rocco Lotronto
*/

var autobahn = require('autobahn');
var express = require('express');


s4t_wamp_server = function(){


}

s4t_wamp_server.prototype.start = function(restPort, wamp_router_url){


   var boards = {};
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

      rest.get('/', function (req, res){
         res.send('API: <br> http://'+IPLocal+':'+restPort+'/list   for board list');
      });

   	rest.get('/command/', function (req, res){

         //DEBUG Message
   		//console.log('POST::::'+req.originalUrl);
   		
         var board = req.query.board;
   		var command = req.query.command;
         var pin = req.query.pin;
         var mode = req.query.mode;
         var value = req.query.val;

   		if(boards[board] != undefined){
   			//DEBUG Message
            //console.log("ID exsist");
            //console.log(command);
            switch(command){
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
                     pin:pin,
                     mode:mode,
                     error:'false'
                  }
                  if(mode === 'input' || mode ==='output'){
                     //Set mode to the pin
                     session.call(board+'.command.rpc.setmode', [pin, mode]).then(
                        function(result){
                           if(result === 0){
                              res.send(JSON.stringify(response));
                           }
                           else{
                              response.error='PROBLEM IN SET MODE PROCESS';
                              res.send(JSON.stringify(response));
                           }
                        } ,session.log); 
                        break;
                  }
                  else{
                     response.error='MODE NOT PERMITTED';
                     res.send(JSON.stringify(response));
                     break;
                  } 
               
               //Analog
               case 'analog':
                  var response = {
                           pin:pin,
                           value:value,
                           error:'false'
                        }
                  if(value!=undefined){//WRITE
                     console.log('ANALOG WRITE');
                     if(value<=0 && value <=1024){
                        session.call(board+'.command.rpc.write.analog', [board, command, pin, value]).then(
                           function(result){
                              //DEBUG Message
                              console.log(result);
                              if(result === 0){
                                 res.send(JSON.stringify(response));
                              }
                              else{
                                 response.error='PROBLEM IN WRITING PROCESS';
                                 res.send(JSON.stringify(response));
                              }
                           } ,session.log); 
                           break;
                     }
                     else{
                        response.error='VALUE NOT PERMITTED';
                        res.send(JSON.stringify(response));
                        break;
                     }   
                  }
                  else{//READ 
                     console.log('ANALOG READ');
                     session.call(board+'.command.rpc.read.analog', [board, command, pin]).then(
                        function(result){
                           var response = {
                              pin:pin,
                              value:{}
                           }
                           response.value = result;
                           res.send(JSON.stringify(response));
                        },session.log);
                     break;
                  }

               //Digital
               case 'digital':
                  var response = {
                           pin:pin,
                           value:value,
                           error:'false'
                        }
                  if(value!=undefined){//WRITE
                     console.log('DIGITAL WRITE');
                     if(value==0 || value==1){//WRITE
                        session.call(board+'.command.rpc.write.digital', [board, command, pin, value]).then(
                           function(result){
                           console.log(result);
                           if(result === 0){
                              res.send(JSON.stringify(response));
                           }
                           else{
                              response.error='PROBLEM IN WRITING PROCESS';
                              res.send(JSON.stringify(response));  
                           }
                        } ,session.log); 
                        break;
                     }
                     else{
                        response.error='VALUE NOT PERMITTED';
                        res.send(JSON.stringify(response));
                        break;
                     }
                  }
                  else{//READ
                     console.log('DIGITAL READ');
                     session.call(board+'.command.rpc.read.digital', [board, command, pin]).then(
                        function(result){
                           var response = {
                              pin:pin,
                              value:{}
                           }
                           response.value = result;
                           res.send(JSON.stringify(response));
                        },session.log);
                     break;
                  }

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

module.exports = s4t_wamp_server;