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


var Q = require("q");


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
    
    
    //IOTRONIC NETWORK DEVICE CREATION-------------------------------------------------------------
    //ip link add name br-gre type bridge
    var brgre_creation = spawn('ip',['link','add', 'br-gre', 'type', 'bridge']);
    logger.info('GRE BRIDGE CREATION:  ip link add br-gre type bridge');
    
    brgre_creation.stdout.on('data', function (data) {
	logger.info('--> bridge creation stdout: ' + data);
    });
    brgre_creation.stderr.on('data', function (data) {
      
	//RTNETLINK answers: File exists
	logger.error('--> bridge creation stderr: ' + data);
    });
    brgre_creation.on('close', function (code) {
      
	logger.info("--> BRIDGE br-gre SUCCESSFULLY CREATED!");
      
	//ip link set br-gre up
	var brgre_up = spawn('ip',['link', 'set', 'br-gre', 'up']);
	logger.info('GRE BRIDGE UP: ip link set br-gre up');
	
	brgre_up.stdout.on('data', function (data) {
	    logger.info('--> gre bridge up stdout: ' + data);
	});
	brgre_up.stderr.on('data', function (data) {
	    logger.error('--> gre bridge up stderr: ' + data);
	});
	brgre_up.on('close', function (code) {
	    logger.info("--> BRIDGE br-gre UP!");
	    logger.info("GRE BRIDGE br-gre SUCCESSFULLY CONFIGURED!");
	});
	;
	
    });
    //----------------------------------------------------------------------------------------------

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
      var latitude = req.query.latitude; 
      var longitude = req.query.longitude;
      var altitude = req.query.altitude;
      var sensorlist = req.query.sensorlist;
      var net_enabled = req.query.net_enabled;
      
      var board_label = req.query.board_label;
      
      res.type('application/json');
      res.header('Access-Control-Allow-Origin','*');

      if(board!=undefined){
	
	if(command == "reg-board"){
	  
		logger.info("Board registration...\n"+JSON.stringify(req.query));
		
		
		db.regBoard(board, board_label, latitude, longitude, altitude, net_enabled, sensorlist, function(db_result){

		    var response = {
		      result:{}
		    }
		    if(db_result["result"] === "EXISTS"){
		      
			response.result=db_result["message"];
			res.send(JSON.stringify(response));

		    }else{
		      
			ckan.CkanBoardRegistration(board, board_label, latitude, longitude, altitude, function(ckan_result){
			  
			    response.result = db_result["message"] +" - "+ ckan_result;
			    res.send(JSON.stringify(response));
			  
			});
		      
		    }
		    

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
		
	} else if (command == "update-board"){
	  
		logger.info("Board updating...");
		db.updateBoard(board, board_label, latitude, longitude, altitude, net_enabled, sensorlist, function(db_result){

		    var response = {
		      result:{}
		    }
		    var position = {"altitude":altitude, "longitude": longitude, "latitude":latitude}							  
		    session.call(board+'.command.setBoardPosition', [position]).then(
			  function(conf_result){
			    response.result = db_result + " - " + conf_result;
			    res.send(JSON.stringify(response));
			  } 
		    , session.log);

		    
		});
		
	} else if (command == "board-layout"){
	  
		logger.info("Board layout called...");

		db_utils.prototype.getBoardLayout( board, function(result){  
		    res.send(JSON.stringify(result));
		    logger.info("Board "+board+" layout: "+JSON.stringify(result) );
		  
		});
	
	
	} else if (command == "board-info"){
	  
		logger.info("Board info called...");

		db_utils.prototype.getBoardInfo( board, function(result){  
		    res.send(JSON.stringify(result));
		    logger.info("Board "+board+" info: "+JSON.stringify(result) );
		  
		});
	
	
	} else if (command == "active-net-board"){
	  
		logger.info("Activating network on board " +board+ "...");
		
		net_utils.activateBoardNetwork(board, res, "true");
	
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
			      
			  case 'remove-plugin-board':
			      //http://212.189.207.205:8888/command/?command=remove-plugin-board&board=14144545&pluginname=hello_plugin
			      plugin_utils.removePlugin(board, pluginname, res);
			      break
			      
			  case 'add-to-network':
			    //net_utils.addToNetwork(netuid, board, value, res);
			    //net_utils.prototype.addToNetwork = function(netuid, board, value, res, restore)
			    net_utils.addToNetwork(netuid, board, value, res, "false");
			    break

			  case 'remove-from-network':
			    net_utils.removeFromNetwork(netuid, board, res);
			    break;

			  case 'update-board':
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
	    case 'destroyplugin':
		//
		plugin_utils.destroyPlugin(pluginname, res);
                break
            case 'createmeasure':
                measure_utils.createMeasure(measurename, readplugin, elaborateplugin, res);
                break                         
            case 'create-network':
                net_utils.createNetwork(netname,value,res);
                break;
            case 'update-network':
                net_utils.updateNetwork(netname,netuid,value,res);
                break;    
            case 'destroy-network':
                net_utils.destroyNetwork(netuid,res);
		break;
            case 'show-network':
                net_utils.showNetwork(res);
                break;
            case 'show-boards':
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



    
    
    rest.get('/list/', function (req, res){
      
        res.type('application/json');
	res.header('Access-Control-Allow-Origin','*');
        var list=[];
        var response = {
          list: {}
        };
	
        db.getBoardsConnected(function(data){
          response.list = data;
          res.send(JSON.stringify(response)); 
	  logger.info("Board list called.");
        });
	
    });

    
    
    rest.get('/sensorlist/', function (req, res){
      
        res.type('application/json');
	res.header('Access-Control-Allow-Origin','*');
        var list=[];
        var response = {};
	
	db_utils.prototype.getSensorList(function(data){
          response = data;
          res.send(JSON.stringify(response));
	  logger.info("Sensor list called.");
        });
	
    });    


    rest.get('/pluginlist/', function (req, res){
      
        res.type('application/json');
	res.header('Access-Control-Allow-Origin','*');
        var list=[];
        var response = {};
	
	db_utils.prototype.getPluginList(function(data){
          response = data;
          res.send(JSON.stringify(response));
	  logger.info("Plugin list called.");
        });
	
    });       
    
    
    rest.get('/map/', function (req, res){
      
	ckan.getMap(req, res);
      
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
		
		logger.warn("A not authorized board has tried a connection to the cloud");

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
				
				//NETWORK CONFIGURATION FOR NET-ENABLED BOARDS
				net_utils.activateBoardNetwork(db_board_id, "false", "false");

			      });
			      
			    });
			
		      }
		      
		    });
		
	      }
	      
	      
	  });
	  
      }
      
    }

    //Subscribing to topic_connection
    session.subscribe(topic_connection, onBoardConnected);
    logger.info("Subscribed to topic: "+topic_connection);
    
    
    // VLAN CONFIGURATION INJECTION AFTER RECONNECTION ON JOIN BOARD---------------------------------------------------------------------------------
    var result_network_board = function(result){
	var board_id=result[1];
	logger.info('BOARD '+ board_id +' NETWORK RESULT: '+ result[0]);
	
	db.getBoardVLAN(board_id, function(data){
							  
	    if(data.message.length != 0){
	      
		logger.info("Board "+board_id+ " is connected to these VLANs: \n" + JSON.stringify(data.message,null,"\t"));
		
		for(var i = 0; i < data.message.length; i++) {

		    (function(i) {
			      
			net_utils.addToNetwork(data.message[i].net_uuid, board_id, data.message[i].ip_vlan, "false", "true");
		      
		    })(i); 

		}				  
		
	    }else{
		logger.info("NO VLAN for the board "+board_id);
	    }

	});	
	
	return "OK from Iotronic!";
    }
    session.register('iotronic.rpc.command.result_network_board', result_network_board);
    logger.info('Registering iotronic command: iotronic.rpc.command.result_network_board');
    // ---------------------------------------------------------------------------------------------------------------------------------------------



    
    
    // PROVISIONING OF A NEW BOARD-----------------------------------------------------------------------------------------------
    var Provisioning = function(result){
      
	var board_id=result[0];
	var d = Q.defer();
	
	db.getBoardPosition(board_id, function(board_position){
	    
	  logger.info('BOARD POSITION: '+ JSON.stringify(board_position) +' PROVISIONING BOARD RESPONSE: '+ result[0]);
	  
	  d.resolve(board_position);
	  
	});

	return d.promise;     
    }
    
    session.register('s4t.board.provisioning', Provisioning);
    logger.info('Registering s4t provisioning RPC: s4t.board.provisioning');
    // -------------------------------------------------------------------------------------------------------------------------        


    

    var onLeave_function = function(session_id){

      logger.info("WAMP SESSION closed with code: "+session_id);
      
      db.findBySessionId(session_id, function(data){
        //DEBUG
        //console.log("length result"+data.length);
        if(data.length == 1){
	  
	  var board = data[0].board_code;
	  
          db.changeBoardState(board,'null','D', function(result){

            db.removeAllServices(board, function(result){});
	    
	    
	    //NEWDB
	    db.updateSocatStatus(data[0].board_code, "noactive", function(data){
		logger.info("SOCAT status of board "+board+": noactive");
	    });
	    
	    
	    
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