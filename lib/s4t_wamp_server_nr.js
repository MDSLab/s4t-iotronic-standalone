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



s4t_wamp_server_nr = function(){}

s4t_wamp_server_nr.prototype.start = function(restPort, wamp_router_url, wamp_realm){


  var getIP = require('./getIP.js');
  var IPLocal = getIP(intr, 'IPv4');

  var connection = new autobahn.Connection({
    url:wamp_router_url,
    realm: wamp_realm
  });



  connection.onopen = function (session, details) {

    var app     = express();
    var router  = express.Router();

    var net_utils = new net_utility(session);
    var utils = new utility(session);

    router.get('/v0.1/list/boards/', function (req, res){
      res.type('application/json');
      var response = {
        list: {}
      };
      db.getBoardsConnected(function(data){
        response.list = data;
        res.send(JSON.stringify(response));
      });
    });

    app.use('/', router);

    app.listen(8888);
    console.log("Server REST on port 8888");

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



module.exports = s4t_wamp_server_nr;