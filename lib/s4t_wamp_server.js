/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Andrea Rocco Lotronto, Arthur Warnier, Nicola Peditto
*/


//main logging configuration                                                                
log4js = require('log4js');          
log4js.loadAppender('file');         
log4js.addAppender(log4js.appenders.file('/var/log/s4t-iotronic.log'));  

//service logging configuration: "main"                                                  
var logger = log4js.getLogger('main');  


socatBoards = [];

logger.info('\n\n\n\n#############################\nStarting Iotronic-Standalone\n#############################')

iotronic_status = "OK";

var ckan_utils = require('./ckan_db_utils');

var db_utils = require('./mysql_db_utils');
var utility = require('./utility'); 
var net_utility = require('./net_utils');
var measure_utility = require('./measure_utils');
var plugin_utility = require('./plugin_utils');

var autobahn = require('autobahn');
var express = require('express');
var ip = require('ip');
var spawn = require('child_process').spawn;
var uuid = require('uuid');

var nconf = require('nconf');
nconf.file ({file: process.cwd()+'/lib/settings.json'});

var intr = nconf.get('config:server:interface');

var topic_command = nconf.get('config:wamp:topic_command');
var topic_connection = nconf.get('config:wamp:topic_connection');

var db = new db_utils;
var ckan = new ckan_utils;
//db.conn();

//var utils = new utility;

s4t_wamp_server = function(){}

s4t_wamp_server.prototype.start = function(restPort, wamp_router_url, wamp_realm){

  logger

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
    var measure_utils = new measure_utility(session);
    var plugin_utils = new plugin_utility(session);
    
    
    
    

    rest.get('/', function (req, res){
      res.send('API: <br> http://'+IPLocal+':'+restPort+'/list   for board list');
    });

    rest.get('/command/', function (req, res){

      
      var command = req.query.command;
      var board = req.query.board;
      var pin = req.query.pin;
      var mode = req.query.mode;
      var value = req.query.val;
      var op = req.query.op;
      var netname = req.query.netname;
      var netuid = req.query.netuid;
      var measurename = req.query.measurename;
      var measureoperation = req.query.measureoperation;
      var measurepin = req.query.measurepin;
      var measureperiod = req.query.measureperiod;
      var pluginname = req.query.pluginname;
      var plugincategory = req.query.plugincategory;
      var pluginjsonschema = req.query.pluginjsonschema;
      var pluginjson = req.query.pluginjson;
      var pluginoperation = req.query.pluginoperation;
      var plugincode = req.query.plugincode;
      var readplugin = req.query.readplugin;
      var elaborateplugin = req.query.elaborateplugin;
      var autostart = req.query.autostart;
      
      res.type('application/json');
      res.header('Access-Control-Allow-Origin','*');

      if(board!=undefined){
    
	if(command == "reg-board"){
	  
		logger.info("Board registration...");
		db.regBoard(board, latitude, longitude, altitude, function(result){

		    var response = {
		      result:{}
		    }
		    response.result=result;
		    res.send(JSON.stringify(response));
		    
		});
		
	
	} else if (command == "unreg-board"){
	  
		logger.info("Board unregistration...");
		db.unRegBoard(board, function(result){

		    var response = {
		      result:{}
		    }
		    response.result=result;
		    res.send(JSON.stringify(response));
		    
		});
		
	}
	else{
    
		db.checkBoardConnected(board, function(data){
		  
		  if(data.length == 1){
		    
		    if(data[0].status == 'D'){
		      //DEBUG
		      logger.info("Board state is Disconnected");
		      var response = {
			error:{}
		      }
		      response.error="Board state is Disconnected"
		      res.send(JSON.stringify(response));
	      
		    }
		    else{
		      
		      //logger.info("COMMAND REQUESTED: " + command);
		      
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
			    logger.info("MODE");
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
			      logger.info('ANALOG WRITE on board: '+ board + ' - pin '+ pin + ' with value '+ value);
			      response.message += ' Write'
			      session.call(board+'.command.rpc.write.analog', [board, command, pin, value]).then(
				function(result){
				  response.result = result;
				  res.send(JSON.stringify(response));
				} , session.log);
			    }
			    else{
			      //DEBUG message
			      logger.info('ANALOG READ on board: '+ board +' - pin '+ pin);
			      response.message += ' Read'
			      session.call(board+'.command.rpc.read.analog', [board, command, pin]).then(
				function(result){
				  response.result = result;
				  res.send(JSON.stringify(response));
				}, session.log);
			    }
			    break;

			  case 'digital':
			    
			    var response = {
			      message: 'Digital ',
			      result:{}
			    }

			    if(value!=undefined){
			      //DEBUG
			      logger.info('DIGITAL WRITE on board: '+ board +' - digital pin '+ pin + ' with value '+ value);
			      response.message += 'Write';
			      session.call(board+'.command.rpc.write.digital', [board, command, pin, value]).then(
				function(result){
				  response.result = result;
				  res.send(JSON.stringify(response));
				  //res.send("callback("+JSON.stringify(response)+")");  //JSONP callback
				} , session.log);
			    }
			    else{
			      //DEBUG Message
			      logger.info('DIGITAL READ on board: '+ board +' - digital pin '+ pin);
			      response.message+= 'Read';
			      session.call(board+'.command.rpc.read.digital', [board, command, pin]).then(
				function(result){
				  response.result = result;
				  res.send(JSON.stringify(response));
				} , session.log);
			    }
			    break;
			    
			  case 'measure':
			      measure_utils.manageMeasures(board, measurename, measureoperation, res);
			      break
			    
			  case 'plugin':
			      plugin_utils.managePlugins(board, pluginname, pluginjson, pluginoperation, res);
			      break
			  
			  case 'injectmeasure':
			      measure_utils.injectMeasure(board, measurename, measurepin, measureperiod, res);
			      break
			      
			  case 'injectplugin':
			      plugin_utils.injectPlugin(board, pluginname, autostart, res);
			      break
			      
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
			    logger.info("Default Case");
			    
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
		      logger.info("BOARD-ID DOESN'T exsist!");
		      var response = {
			error:{}
		      }
		      response.error="BOARD-ID doesn't exsist!";
		      res.send(JSON.stringify(response));
		  }
		  
		});
	
	}
	
      } 
      else{
	
	
        switch(command){
	  
            case 'createplugin':
		plugin_utils.createPlugin(pluginname, plugincategory, pluginjsonschema, plugincode, res);
                break
            case 'createmeasure':
                measure_utils.createMeasure(measurename, readplugin, elaborateplugin, res);
                break                         
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
                logger.info("Default Case");
                
                var response = {
                    error:{}
                }
                response.error='ERROR COMMAND';
                res.send(JSON.stringify(response));
                break;
		
		
        }
        
      }
      
      
    });

    
    
    
    
    


    //-----------------------------------------------------------------------------------------------------------------------------------------------------
    // MAP WEBSITE MANAGEMENT -----------------------------------------------------------------------------------------------------------------------------
    Q = require("q");

    rest.get('/map/', function (req, res){
      
	logger.info("##################################################################################################################");
	logger.info("Boards on Map called.");
	logger.info("##################################################################################################################");
	
	db.getBoardsConnected(function(data){  
	  
	  res.type('application/json');
	  res.header('Access-Control-Allow-Origin','*');
	  
	  var response = { 
	    boards: {}
	  };
	  
	
	  logger.info("Number of registered boards: " + data.length);
	  
	  logger.info("BOARDS GRID IN CKAN: "+JSON.stringify(data,null,"\t"));
	  
	
	  var board = 0;
	  
	  promiseWhile(function () { return board < data.length; }, function () {
	    
	    var id = data[board].board_code; 
		
	    response.boards[id] = {}; 
	    response.boards[id]['coordinates'] = {"altitude":data[board].altitude, "latitude":data[board].latitude, "longitude":data[board].longitude};
	    response.boards[id]['resources'] = {metrics:[]};
	    
	      
	    ckan.getCKANdataset(id).then(
		    
		function(result){
	      
	      
		      logger.info("Getting metrics of board "+ id);
		      
		      for(var resource=0; resource < result.resources.length; resource++) {
			
			
			(function(resource) {
			  
			   //setTimeout(function(){
			      
				if (result.resources[resource].name != "metadata"){
				  
				  var queryResource = {"resource_id":result.resources[resource].id, "limit":1, "sort":"Date  desc"};
				  
				  if (result.resources[resource].name == "temperature"){
				    
				    //logger.info("--> RESOURCE: "+JSON.stringify(result.resources[resource].name) + " ID: "+JSON.stringify(result.resources[resource].id));
				    
				    ckan.queryCKANdatastore(queryResource).then(function(result){
				      
					if(result[0]!= null){
					  logger.info("--> VALUE TEMP of board "+id+": " + JSON.stringify(result[0].Temperature) + " °C");
					  response.boards[id]['resources'].metrics.push(result[0]);
					}
					
				    });
				    
				    
				  } else if (result.resources[resource].name == "brightness"){
				    
				    //logger.info("--> RESOURCE: "+JSON.stringify(result.resources[resource].name) + " ID: "+JSON.stringify(result.resources[resource].id));
				    
				    ckan.queryCKANdatastore(queryResource).then(function(result){
				      
					if(result[0]!= null){
					  logger.info("--> VALUE LUX of board "+id+": " + JSON.stringify(result[0].Brightness) +" lux");
					  response.boards[id]['resources'].metrics.push(result[0]);
					}

				    });
				    
				    
				  } 
				  
				}
				
			    //}, 100*resource);  // end of setTimeout function

			 })(resource);  // end of the function(i)	
			  
		      }
		      
		      
	      
	    });
	    
	    board++;
	    
	    return Q.delay(600); // arbitrary async


	    
	  }).then(function () {

		logger.info("\nFINAL RESULT:\n"+JSON.stringify(response)+"\n");
		res.send(JSON.stringify(response));

		logger.info("##################################################################################################################");
		logger.info("##################################################################################################################");
		
	  }).done();    

	  
	  

        });
	
	
    });        
    

    // METHOD USED TO MANAGE THE DEFFERED PROMISE 
    // `condition` is a function that returns a boolean
    // `body` is a function that returns a promise
    // returns a promise for the completion of the loop
    function promiseWhile(condition, body) {
      
	var done = Q.defer();

	function loop() {
	    // When the result of calling `condition` is no longer true, we are
	    // done.
	    if (!condition()) return done.resolve();
	    // Use `when`, in case `body` does not return a promise.
	    // When it completes loop again otherwise, if it fails, reject the
	    // done promise
	    Q.when(body(), loop, done.reject);
	    //Q.fcall(body).then(loop,done.reject); 
	}

	// Start running the loop in the next tick so that this function is
	// completely async. It would be unexpected if `body` was called
	// synchronously the first time.
	Q.nextTick(loop);

	// The promise
	return done.promise;
    }
 
    
    
    //-----------------------------------------------------------------------------------------------------------------------------------------------------
    
    
    
    
    
    
    

    
    
    
    rest.get('/list/', function (req, res){
      
        res.type('application/json');
	res.header('Access-Control-Allow-Origin','*');
        var list=[];
        var response = {
          list: {}
        };
	
        db.getBoardsConnected(function(data){
          response.list = data;
          res.send(JSON.stringify(response)); //simple JSON format
	  //res.send("callback_BoardList("+JSON.stringify(response)+")");  //JSONP callback
	  logger.info("Board List called.");
        });
	
    });

    
    
    
    
    
    process.on('uncaughtException', function(err) {
      
	if(err.errno === 'EADDRINUSE'){
	      
	    iotronic_status = "FAULT - Express - EADDRINUSE";
	    
	}
	
    });  

    if(iotronic_status === "OK"){
	rest.listen(restPort);
	logger.info("Server REST started on: http://"+IPLocal+":"+restPort+ " status " + iotronic_status);
	logger.info("Connected to router WAMP");
    }
    else{
	logger.error("ERROR: "+ iotronic_status);
    }
    

    
    
    // Publish, Subscribe, Call and Register
    var onBoardConnected = function (args){
    	

    	if(args[1]=='connection'){    
	  
	  db.checkBoard(args[0], function(data){
	      //DEBUG
	      //logger.info("board_user::data.length::"+data.length);
	      if(data.length == 0){
		//DEBUG
		logger.warn("A not authorized board has tried a connection to the cloud");
		//console.log("First Connection of the Board "+args[0]);
		//db.insertBoard(args[0],args[2],'active', function(result){
		//  console.log("Risultato della insert:::"+result);
		//});
	      }
	      else{
		db.checkBoardConnected(args[0], function(data){
		  //DEBUG
		  //logger.info("boards_connected::data.length"+data.length);
		  if(data.length == 0){
		    logger.info("First Connection of the Board "+args[0]);
		    db.insertBoard(args[0],args[2],'C', function(result){
		      logger.info("Risultato della insert:::"+result);
		    });
		  }
		  else{
		    
		    //logger.info("Not First Connection of the board"+args[0]);
		    db.changeBoardState(args[0],args[2],'C', function(result){
		      
		      db.checkBoardConnected(args[0], function(data){
			
			var db_board_id = data[0].board_code;
			logger.info("Now the status of the board is:");
			logger.info("--> board_code::"+db_board_id);
			logger.info("--> session::"+data[0].session_id + " - status::"+data[0].status);  
			
			
			
			      //NETWORK INIT ---------------------------------------------------------------------------------------------------------------------------------------------
			      logger.info("SOCAT INITIALIZATION: getting Socat parameters...");
			      
			      var socatNetwork 	= nconf.get('config:socat:ip');
			      var basePort = nconf.get('config:socat:server:port');
				      
			      var bSocatNum = net_utils.findFirstFreeKey(socatBoards);
			      //logger.info("--> bSocatNum " + bSocatNum);
			      
			      var map = {
				key: bSocatNum,
				value: db_board_id
			      };
			      socatBoards.push(map);
			      
			      logger.info("--> socatBoards " + JSON.stringify(socatBoards));
			      
			      var socatNetAddr = ip.toLong(socatNetwork) + (bSocatNum*4);
			      var socatServAddr = ip.fromLong(socatNetAddr+1);
			      var socatBoardAddr = ip.fromLong(socatNetAddr+2);
			      var socatPort = parseInt(basePort)+bSocatNum;
			      
			      logger.info("--> INJECTING SOCAT PARAMETERS IN " + db_board_id + ": { Server:" + socatServAddr+":"+ socatPort + ", BoardIP: " + socatBoardAddr+", socat_index: "+bSocatNum+" }");
				      
			      session.call(db_board_id+'.command.rpc.network.setSocatOnBoard', [ db_board_id, socatServAddr, socatPort, socatBoardAddr, bSocatNum]).then(
				
				  function(result){
				    
				      logger.info("--> SOCAT BOARD RESULT: " + result);
				      
				      //EXEC SOCAT ---------------------------------------------------------------------------------------------------------------------------------------------
				      
				      var spawn = require('child_process').spawn;
		
				      var servSocat = spawn('socat',['-d','-d','TCP:localhost:'+socatPort+',reuseaddr,forever,interval=10','TUN:'+socatServAddr+'/30,up']);
				      
				      logger.info('--> SOCAT COMMAND: socat -d -d TCP:localhost:'+socatPort+',reuseaddr,forever,interval=10 TUN:'+socatServAddr+'/30,up');
				      
				      //--------------------------------------------------------------------------------------------------------------------------------------------------------
      
      
      
				      
				  }
				  
			      );
			      //NETWORK INIT END------------------------------------------------------------------------------------------------------------------------------------------

			      
			
		      });
		    });
		  }
		});
	      }
	  });
      }
      
    }

    session.subscribe(topic_connection, onBoardConnected);
    logger.info("Subscribed to topic: "+topic_connection);
    
    

    

    var onLeave_function = function(session_id){

      logger.info("WAMP SESSION closed with code: "+session_id);
      
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
      
      logger.info("WAMP ONJOIN:\n"+JSON.stringify(args,null,4));

    }
    
    session.subscribe('wamp.session.on_join', onJoin_function);
    
    session.subscribe('wamp.session.on_leave', onLeave_function);

  }


   connection.onclose = function (reason, details) {
      logger.info("Connection close for::"+reason);
      logger.info("Connection close for::");
      logger.info(details);

   }

  connection.open();

}



module.exports = s4t_wamp_server;