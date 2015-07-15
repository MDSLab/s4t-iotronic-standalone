/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Andrea Rocco Lotronto, Arthur Warnier
*/

var db_utils = require('./mysql_db_utils');
var utility = require('./utility');
var net_utility = require('./net_utils');


var autobahn = require('autobahn');
var express = require('express');
var ip = require('ip');
var spawn = require('child_process').spawn;
var uuid = require('uuid');

var nconf = require('nconf');
nconf.file ({file: process.cwd()+'/lib/setting.json'});

var intr = nconf.get('config:server:interface');

var topic_command = nconf.get('config:wamp:topic_command');
var topic_connection = nconf.get('config:wamp:topic_connection');

var db = new db_utils;
//db.conn();

var utils = new utility;



s4t_wamp_server = function(){}

s4t_wamp_server.prototype.start = function(restPort, wamp_router_url, wamp_realm){


  var getIP = require('./getIP.js');
  var IPLocal = getIP(intr, 'IPv4');

  var connection = new autobahn.Connection({
    url:wamp_router_url,
    realm: wamp_realm
  });



  connection.onopen = function (session, details) {

    var rest = express();

    var net_utils = new net_utility(session);
    var utils = new utility(session);

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
      var mname = req.query.mname;
      var mtime = req.query.mtime;
      var netname = req.query.netname;
      var netuid = req.query.netuid;
      
      res.type('application/json');

      if(board!=undefined){
    
        db.checkBoardConnected(board, function(data){
          if(data.length == 1){
            if(data[0].status == 'D'){
              //DEBUG
              console.log("Board state is Disconnected");
              var response = {
                error:{}
              }
              response.error="Board state is Disconnected"
              res.send(JSON.stringify(response));
       
            }

            else{
              switch(command){
              case 'tty':
                utils.exportService(board, command, op, res);
                break;
              case 'ssh':
                utils.exportService(board, command, op, res);
                break;
              case 'ideino':
                utils.exportService(board, command, op, res);
                break;
              case 'osjs':
                utils.exportService(board, command, op, res);
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

              case 'measure':
                var response = {
                  result: {}
                }
                if(mname != undefined && op != undefined && mtime != undefined){
                  //DEBUG
                  console.log('Measure');
                  
                  console.log(board+'.command.rpc.'+mname+':::'+op+"," +mname+"," +mtime);
                  session.call(board+'.command.rpc.'+mname, [op, mtime]).then(
                    function(result){
                    response.result = result;
                    res.send(JSON.stringify(response));
                  } , session.log);
                }
                else{
                  response.result="ERROR";
                  res.send(JSON.stringify(response));
                }
                //session.publish(topic_command, [board, command, pin, op, tmis, nmis]);
                //response.result = [board, command, pin, op, tmis, nmis];
                //res.send(JSON.stringify(response));
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

              case 'add-to-network':
                //addToNetwork();
                net_utils.addToNetwork(netuid, board, value, res);
                break

              case 'remove-from-network':
                //removeFromNetwork();
                net_utils.removeFromNetwork(netuid, board, res);
                break;

              case 'update-board':
                //updataBoard();
                net_utils.updataBoard(netuid, board, value, res);
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
        });
      }
      else{
        switch(command){
          case 'create-network':
            //createNetwork();
            net_utils.createNetwork(netname,value,res);
            break;
          case 'update-network':
            //updateNetwork()
            net_utils.updateNetwork(netname,netuid,value,res);
            break;    
          case 'destroy-network':
            net_utils.destroyNetwork(netuid,res);
            break;
          case 'show-network':
            //showNetwork();
            net_utils.showNetwork(res);
            break;
          case 'show-boards':
            //showBoards();
            net_utils.showBoards(netuid, res);
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
        db.getBoardsConnected(function(data){
          response.list = data;
          res.send(JSON.stringify(response));
        });
    });

        
   	rest.listen(restPort);
    console.log("Server REST started on: http://"+IPLocal+":"+restPort);

   	console.log("Connected to router WAMP");
      // Publish, Subscribe, Call and Register

    var onBoardConnected = function (args){
    	

    	if(args[1]=='connection'){    
        db.checkBoard(args[0], function(data){
          //DEBUG
          console.log("board_user:: data.length::"+data.length);
          if(data.length == 0){
            //DEBUG
            console.log("A not authorized board has tried a connection to the cloud");
            //console.log("First Connection of the Board "+args[0]);
            //db.insertBoard(args[0],args[2],'active', function(result){
            //  console.log("Risultato della insert:::"+result);
            //});
          }
          else{
            db.checkBoardConnected(args[0], function(data){
              //DEBUG
              console.log("boards_connected:: data.length"+data.length);
              if(data.length == 0){
                console.log("First Connection of the Board "+args[0]);
                db.insertBoard(args[0],args[2],'C', function(result){
                  console.log("Risultato della insert:::"+result);
                });
              }
              else{
                console.log("Not First Connection of the board"+args[0]);
                db.changeBoardState(args[0],args[2],'C', function(result){
                  //DEBUG
                  db.checkBoardConnected(args[0], function(data){
                    console.log("Now the status of the board is:");
                    console.log("board_code::"+data[0].board_code);
                    console.log("session::"+data[0].session_id);
                    console.log("status::"+data[0].status);  
                  });
                });
              }
            });
          }
        });
      }
    }

    session.subscribe(topic_connection, onBoardConnected);
    console.log("Subsscribe to topic: "+topic_connection);

    var onLeave_function = function(session_id){
      console.log("Find with SESSION code::"+session_id);
      db.findBySessionId(session_id, function(data){
        //DEBUG
        //console.log("length result"+data.length);
        if(data.length == 1){
          db.changeBoardState(data[0].board_code,'null','D', function(result){
            //DEBUG
            //db.checkBoard(data[0].name, function(data){
            //  console.log("Now the status of the board is:");
            //  console.log("name"+data[0].name);
            //  console.log("session"+data[0].session);
            //  console.log("stato"+data[0].state);  
            //});
            db.removeAllServices(data[0].board_code, function(result){});
          });
        }  
      });
    }

    var onJoin_function = function(args){
      console.log("onjoin");
      console.dir(args);
    }
    
    session.subscribe('wamp.session.on_join',onJoin_function);
    
    session.subscribe('wamp.session.on_leave',onLeave_function);

  }


   connection.onclose = function (reason, details) {
      console.log("Connection close for::"+reason);
      console.log("Connection close for::");
      console.dir(details);
      //connection.open();
   }

  connection.open();

}



module.exports = s4t_wamp_server;