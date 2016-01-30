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

//NETDB
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
      
      res.type('application/json');
      res.header('Access-Control-Allow-Origin','*');

      if(board!=undefined){
	
	if(command == "reg-board"){
	  
		logger.info("Board registration...\n"+JSON.stringify(req.query));
		
		
		db.regBoard(board, latitude, longitude, altitude, net_enabled, sensorlist, function(result){

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
		
	} else if (command == "update-board"){
	  
		logger.info("Board updating...");
		db.updateBoard(board, latitude, longitude, altitude, net_enabled, sensorlist, function(result){

		    var response = {
		      result:{}
		    }
		    response.result=result;
		    res.send(JSON.stringify(response));
		    
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
			    net_utils.addToNetwork(netuid, board, value, res);
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
          res.send(JSON.stringify(response)); //simple JSON format
	  //res.send("callback_BoardList("+JSON.stringify(response)+")");  //JSONP callback
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

		logger.info("FINAL RESULT:\n"+JSON.stringify(response)+"\n");
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
			db.getNetEnabledId(args[0], function(data){

			    var net_enabledID = data[0].net_enabled;
			    
			    //logger.info("net_enabledID: "+net_enabledID);
			    
			    if(net_enabledID == 1){
			      
			      logger.info("BOARD "+db_board_id+" NETWORK ENABLED!");
			      
			      
			      db.getSocatStatus(db_board_id, function(data){
				
								
				//if the board is NEW=undefined OR we have to reconnect a board noactive
				if( data[0] == undefined || data[0].status == "noactive" ){

					//NETWORK INIT ---------------------------------------------------------------------------------------------------------------------------------------------
					logger.info("SOCAT INITIALIZATION: getting Socat parameters...");
					
					var socatNetwork = nconf.get('config:socat:ip');
					var basePort = nconf.get('config:socat:server:port');
					
					
					 if (data[0] == undefined){
					    logger.info("--> NEW BOARD " + db_board_id );
					 }
					 else{
					    logger.info("--> BOARD " + db_board_id + " socat status: "+data[0].status);
					 }

				      

					  
					//NETDB
					db.getSocatConf(db_board_id, basePort, socatNetwork, function(data){
					  
						logger.info("--> SOCAT NET CONF = "+JSON.stringify(data));
						//response.socat_conf={socatID:bSocatNum, port:socatPort, netIP:socatNetAddr, serverIP:socatServAddr, boardIP: socatServAddr}
						
						var bSocatNum = data.socat_conf["socatID"];
						//logger.info("--> SOCAT bSocatNum: "+bSocatNum);
					  
						
						//DA ELIMINARE-----------------------------------------------------------------------------------------------------------------
						//var bSocatNum = net_utils.findFirstFreeKey(socatBoards);
						//logger.info("--> bSocatNum " + bSocatNum);
						var map = {
						  key: bSocatNum,
						  value: db_board_id
						};
						socatBoards.push(map);
						logger.info("--> socatBoards " + JSON.stringify(socatBoards));  //Es --> socatBoards [{"key":0,"value":"14144545"}]
						//DA ELIMINARE-----------------------------------------------------------------------------------------------------------------
						
						
						
						//NEW-net
						//var socatNetAddr = ip.toLong(socatNetwork) + (bSocatNum*2);
						var socatServAddr = data.socat_conf["serverIP"];//ip.fromLong(socatNetAddr);
						var socatBoardAddr = data.socat_conf["boardIP"];//ip.fromLong(socatNetAddr+1);
						var socatPort = data.socat_conf["port"];//parseInt(basePort)+bSocatNum;
						
						
						
						
						logger.info("--> INJECTING SOCAT PARAMETERS IN " + db_board_id + ": { Server:" + socatServAddr+":"+ socatPort + ", BoardIP: " + socatBoardAddr+", socat_index: "+bSocatNum+" }");
							
						//NEW-net
						session.call(db_board_id+'.command.rpc.network.setSocatOnBoard', [ socatServAddr, socatPort, socatBoardAddr]).then(
						  
						    function(result){
						      
							logger.info("--> SOCAT BOARD RESULT: " + result);
							
							//EXEC SOCAT ---------------------------------------------------------------------------------------------------------------------------------------------
							
							var spawn = require('child_process').spawn;
				  
							//NEW-net
							//socat -d -d TCP:localhost:$PORT,reuseaddr,forever,interval=10 TUN,tun-name=$TUNNAME,up &
							var servSocat = spawn('socat',['-d','-d','TCP:localhost:'+socatPort+',reuseaddr,forever,interval=10','TUN:'+socatServAddr+'/31,tun-name=soc'+socatPort+',up']);
							logger.info('--> SOCAT COMMAND: socat -d -d TCP:localhost:'+socatPort+',reuseaddr,forever,interval=10 TUN:'+socatServAddr+'/31,tun-name=soc'+socatPort+',up');
							
							//--------------------------------------------------------------------------------------------------------------------------------------------------------
			
							//NEW-net: INIZIALIZZARE IL TUNNEL GRE CONDIVISO
							
							//ip link add gre-lr<port> type gretap remote <ipboard> local <serverip>
							var greIface = spawn('ip',['link','add','gre-lr'+socatPort,'type', 'gretap', 'remote', socatBoardAddr, 'local', socatServAddr]); 
							logger.info('GRE IFACE CREATION: ip link add gre-lr'+socatPort+' type gretap remote '+ socatBoardAddr+' local '+socatServAddr);
							
							greIface.stdout.on('data', function (data) {
							    logger.info('--> GRE IFACE CREATION stdout: ' + data);
							});
							greIface.stderr.on('data', function (data) {
							    logger.info('--> GRE IFACE CREATION stderr: ' + data);
							});
							greIface.on('close', function (code) {
							  
							    logger.info("--> GRE IFACE CREATED!");
							    
							    //ip link set gre-lr<port> up
							    var greIface_up = spawn('ip',['link','set','gre-lr'+socatPort,'up']); 
							    logger.info('GRE IFACE UP: ip link set gre-lr'+socatPort+' up');
							    
							    greIface_up.stdout.on('data', function (data) {
								logger.info('--> GRE IFACE UP stdout: ' + data);
							    });
							    greIface_up.stderr.on('data', function (data) {
								logger.info('--> GRE IFACE UP stderr: ' + data);
							    });
							    greIface_up.on('close', function (code) {
							      
								logger.info("--> GRE IFACE UP!");
								
								//ip link set gre-lr<port> master br-gre
								var add_to_brgre = spawn('ip',['link','set','gre-lr'+socatPort, 'master', 'br-gre']); 
								logger.info('GRE IFACE ADDED TO BRIDGE: ip link set gre-lr'+socatPort+' master br-gre');
								
								add_to_brgre.stdout.on('data', function (data) {
								    logger.info('--> GRE IFACE ADDED TO BRIDGE stdout: ' + data);
								});
								add_to_brgre.stderr.on('data', function (data) {
								    logger.info('--> GRE IFACE ADDED TO BRIDGE stderr: ' + data);
								});
								add_to_brgre.on('close', function (code) {
								  
								    logger.info("--> GRE IFACE ADDED TO GRE BRIDGE!");
								    
								    //bridge vlan add vid <freevlantag> dev gre-lr<port> pvid
								    var freevlantag = 2048 + bSocatNum;
								    
								    var tag_vlan = spawn('bridge',['vlan', 'add', 'vid', freevlantag, 'dev', 'gre-lr'+socatPort, 'pvid']); 
								    logger.info('TAG VLAN: bridge vlan add vid '+freevlantag+' dev gre-lr'+socatPort+' pvid');
								    
								    tag_vlan.stdout.on('data', function (data) {
									logger.info('--> TAG VLAN stdout: ' + data);
								    });
								    tag_vlan.stderr.on('data', function (data) {
									logger.info('--> TAG VLAN stderr: ' + data);
								    });
								    tag_vlan.on('close', function (code) {
								      
									logger.info("--> TAG VLAN COMPLETED!");
											  
									db.updateSocatStatus(db_board_id, "active", function(data){});
									
									logger.info("TUNNELS CONFIGURATION SERVER SIDE COMPLETED!"); 
								    });
								    
								});
							    
							    
								
							    });
							  
							  
							  
							    
							});
			
							
						    }
						    
						);
						});
						//NETWORK INIT END------------------------------------------------------------------------------------------------------------------------------------------
					
							    
				  
				  
				  
				} else{
				  logger.info("--> BOARD " + db_board_id + " ALREADY CONNECTED TO SOCAT - status: "+data[0].status);
				}
				
			      });
			      
			

			      
				
			      
			      
			     
			      
			      
			      
			   } else{
			     logger.info("BOARD "+db_board_id+" NO NETWORK ENABLED!");
			   }
			   
			});    
			
			
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
	  
	  var board = data[0].board_code;
	  
          db.changeBoardState(board,'null','D', function(result){
            //DEBUG
            //db.checkBoard(data[0].name, function(data){
            //  console.log("Now the status of the board is:");
            //  console.log("name"+data[0].name);
            //  console.log("session"+data[0].session);
            //  console.log("stato"+data[0].state);  
            //});
            db.removeAllServices(board, function(result){});
	    
	    
	    //NEWDB
	    db.updateSocatStatus(data[0].board_code, "noactive", function(data){
		logger.info("SOCAT status of board "+board+": noactive");
	    });
	    //DELETE SOCAT OF THE BOARD
	    
	    
	    
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