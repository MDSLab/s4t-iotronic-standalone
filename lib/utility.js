/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Andrea Rocco Lotronto
*/
var db_utils = require('./mysql_db_utils');
var db = new db_utils;
//db.conn();

var nconf = require('nconf');
nconf.file ({file: process.cwd()+'/lib/setting.json'});

var topic_command     = nconf.get('config:wamp:topic_command');
var topic_connection  = nconf.get('config:wamp:topic_connection');
var intr = nconf.get('config:server:interface');

var getIP = require('./getIP.js');
var IPLocal = getIP(intr, 'IPv4');

var session_wamp;

utility = function(session){
  session_wamp = session;
  console.log("utility::"+"IPLocal"+IPLocal);
};

utility.prototype.exportService = function(board, command, op, res){

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
        if(data.length == 0){
          //DEBUG
          console.log("Service "+command+" Never started");
          
          //newPort function is used because we need a TCP port not already used
          newPort(function(port){
            //DEBUG
            //console.log("New Port:::"+data);
            
            session_wamp.publish(topic_command, [board, command, port,op]);
            response.port = port;
            response.status=op;
            res.send(JSON.stringify(response));
            db.insertService(board,command, IPLocal, port, function(result){
              //DEBUG
              //console.log("Insert Service::"+result);
            });
          });
        }
        else{
          //DEBUG
          console.log("Service already started");
          //db.getPortService(board,command, function(data){
            //DEBUG
            //console.log(data);
            response.status=op;
            response.port=data[0].public_port;
            res.send(JSON.stringify(response));
          //});
        }
      });  
    }
    if(op=="stop"){
      response.status=op;
      db.checkService(board,command, function(data){
        if(data.length == 0){
          console.log("It not already started");
          res.send(JSON.stringify(response));
        }
        else{
          //db.getPortService(board,command, function(data){
            //DEBUG
            console.log("Service "+command+ "stopped");
            response.port = data[0].public_port;
            session_wamp.publish(topic_command, [board, command, response.port, op]);
            db.removeService(board,command, function(data){
              //DEBUG
              //console.log(data);
              res.send(JSON.stringify(response));
            })
          //});
        }
      });
    }
  }
  else{
    response.status="error";
    res.send(JSON.stringify(response));
  }
}

//function to calculate a new tcp port not already used
function newPort (callback){
  var port = randomIntInc(6000,7000);
  db.checkPort(port, function(data){
    if(data == 0){
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

//This function return true if an array contains another array
function arrayContainsAnotherArray(needle, haystack){
  for(var i = 0; i < needle.length; i++){
    if(haystack[needle[i]] == undefined)
       return false;
  }
  return true;
}

module.exports = utility;