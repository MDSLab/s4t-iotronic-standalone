/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Andrea Rocco Lotronto, Nicola Peditto, Fabio Verboso
*/
var mysql = require('mysql');

var ip = require('ip');

var util = require('util');

//service logging configuration: "mysql_db_utils"   
var logger = log4js.getLogger('mysql_db_utils');

var nconf = require('nconf');
nconf.file ({file: process.cwd()+'/lib/settings.json'});

var db_host = nconf.get('config:server:db:host');
var db_user = nconf.get('config:server:db:user');
var db_pass = nconf.get('config:server:db:password');
var db_name = nconf.get('config:server:db:db_name');

var connection;

db_utils = function()
{
	var db_host = nconf.get('config:server:db:host');
	var db_user = nconf.get('config:server:db:user');
	var db_pass = nconf.get('config:server:db:password');
	var db_name = nconf.get('config:server:db:db_name');
}
/*
db_utils.prototype.conn = function(){
	connection = mysql.createConnection({
		host: 		db_host,
		port: '3306', 
		user: 		db_user,
		password: 	db_pass,
		database: 	db_name
	});
}
*/

function conn(){
	connection = mysql.createConnection({
		host: 		db_host,
		port: '3306', 
		user: 		db_user,
		password: 	db_pass,
		database: 	db_name
	});
}

function disconn(){
	connection.end();
}
//Function to obtain all the boards id
db_utils.prototype.getBoardsConnected = function(callback){
	conn();
	//DEBUG
	//console.log("db:::"+"SELECT * FROM boards_connected");

	connection.query("SELECT * FROM boards_connected", function(err,result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}

//Function to check if a board is registered to a user
db_utils.prototype.checkBoard = function(b_id, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"SELECT * FROM user_boards WHERE user_boards.board_code = '"+b_id+"'");

	connection.query("SELECT * FROM user_boards WHERE user_boards.board_code ='"+b_id+"'", function(err,result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}
//Function to insert board in DB boards_connected table
db_utils.prototype.insertBoard = function(b_id, b_session, b_state, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"INSERT INTO boards_connected (board_code, session_id, status) VALUES ('"+b_id+"','"+b_session+"','"+b_state+"')");

	connection.query("INSERT INTO boards_connected (board_code, session_id, status) VALUES ('"+b_id+"','"+b_session+"','"+b_state+"')", function(err, result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}

//Function to check the status of a specific board
db_utils.prototype.checkBoardConnected= function(b_id, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"SELECT * FROM boards_connected WHERE boards_connected.board_code = '"+b_id+"'");

	connection.query("SELECT * FROM boards_connected WHERE boards_connected.board_code ='"+b_id+"'", function(err,result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}


//Function to find board using session ID
db_utils.prototype.findBySessionId = function(s_id, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"SELECT * FROM boards_connected WHERE boards_connected.session_id = '"+s_id+"'");
	connection.query("SELECT * FROM boards_connected WHERE boards_connected.session_id = '"+s_id+"'", function(err, result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}

//Function to change the status of the board in DB
db_utils.prototype.changeBoardState = function(b_id, b_session, b_state, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"UPDATE boards_connected SET board_code='"+b_id+"',session_id='"+b_session+"',status='"+b_state+"' WHERE board_code='"+b_id+"'");
	
	connection.query("UPDATE boards_connected SET board_code='"+b_id+"',session_id='"+b_session+"',status='"+b_state+"' WHERE board_code='"+b_id+"'", function(err, result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}
//Function to check if a service is already present in the db
db_utils.prototype.checkService=function(b_id, s_name, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"SELECT * FROM reverse_cloud_services WHERE reverse_cloud_services.board_id ='"+b_id+"' AND reverse_cloud_services.service ='"+s_name+"'");
	
	connection.query("SELECT * FROM reverse_cloud_services WHERE reverse_cloud_services.board_id ='"+b_id+"' AND reverse_cloud_services.service ='"+s_name+"'", function(err, result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}
//Function to insert a service reference in DB
db_utils.prototype.insertService = function (b_id, s_name, s_ip, s_port,callback){
    conn();
    //DEBUG
	//console.log("db:::"+"INSERT INTO reverse_cloud_services (board_id, service, public_ip, public_port) VALUES ('"+b_id+"','"+s_name+"','"+s_ip+"','"+s_port+"')");

	connection.query("INSERT INTO reverse_cloud_services (board_id, service, public_ip, public_port) VALUES ('"+b_id+"','"+s_name+"','"+s_ip+"','"+s_port+"')", function(err, result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}
//Fuction to remove a service of a specific board from the db
db_utils.prototype.removeService = function (b_id, s_name, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"DELETE FROM reverse_cloud_services WHERE reverse_cloud_services.board_id ='"+b_id+"' AND reverse_cloud_services.service='"+s_name+"'");

	connection.query("DELETE FROM reverse_cloud_services WHERE reverse_cloud_services.board_id ='"+b_id+"' AND reverse_cloud_services.service='"+s_name+"'", function(err, result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}

//Fuction to remove all services of a specific board from the db
db_utils.prototype.removeAllServices = function (b_id, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"DELETE FROM reverse_cloud_services WHERE reverse_cloud_services.board_id ='"+b_id+"'");

	connection.query("DELETE FROM reverse_cloud_services WHERE reverse_cloud_services.board_id ='"+b_id+"'", function(err, result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}

//Function to check if a specific port is already used
db_utils.prototype.checkPort=function(s_port, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"SELECT * FROM reverse_cloud_services WHERE reverse_cloud_services.public_port='"+s_port+"'");

	connection.query("SELECT * FROM reverse_cloud_services WHERE reverse_cloud_services.public_port='"+s_port+"'", function(err, result){
	    if (result.length == 0)
	    	callback(0);
	    else
		callback(1);
	});
	disconn();
}

//Function to obtain the read plugin id of a measure
db_utils.prototype.getReadPluginId = function(measureName, callback){
	conn();

	connection.query("SELECT read_plugin FROM measures WHERE name = '" + measureName + "'", function(err,result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}

//Function to obtain the elaborate plugin id of a measure
db_utils.prototype.getElaboratePluginId = function(measureName, callback){
	conn();

	connection.query("SELECT elaborate_plugin FROM measures WHERE name = '" + measureName +"'", function(err,result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}

//Function to obtain the name and code of the read plugin of a measure
db_utils.prototype.getReadPlugin = function(pluginId, callback){
	conn();

	connection.query("SELECT name, code FROM plugins WHERE id = '" + pluginId + "'", function(err,result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}

//Function to obtain the name and code of the elaborate plugin of a measure
db_utils.prototype.getElaboratePlugin = function(pluginId, callback){
	conn();

	connection.query("SELECT name, code FROM plugins WHERE id = '" + pluginId + "'", function(err,result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}




//Function to write that a measure has been injected in a board to the proper table
db_utils.prototype.insertInjectedMeasure = function(board, measurename, measurepin, measureperiod, callback){
	conn();
        
        //Find the id of the measure whose name is measurename
        var measure_id;
        connection.query("SELECT id FROM measures WHERE name = '" + measurename + "'", function(err, result){
	    //console.log(err);
	    if(err != null){
	      console.log(err);
	    }
            measure_id = result[0].id;
            console.log("the id is " + measure_id);
            connection.query("INSERT INTO measures_injected (board_id, measure_id, pin, period, state) VALUES ('"+board+"','"+measure_id+"','"+measurepin+"','"+measureperiod+"', 'stop')", function(err, result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
                callback(result);
                disconn();
            });
        });
}



//Function to insert a plugin into the database
db_utils.prototype.insertCreatedPlugin = function(pluginname, plugincategory, pluginjsonschema, plugincode, callback){
	conn();
        
	var response = {
	  message : {},
	  result: ''
	}
	
        connection.query("INSERT INTO plugins (id, name, category, jsonschema, code) VALUES (NULL, "+mysql.escape(pluginname)+" , "+mysql.escape(plugincategory)+" , "+mysql.escape(pluginjsonschema)+" , "+mysql.escape(plugincode)+")", function(err, result){
		//console.log(err);
		if(err != null){
		  response.message=err;
		  response.result="ERROR";
		  logger.error(response.result + " - " + err);
		  callback( response );
		}else{
		  response.message=result;
		  response.result="SUCCESS";
		  callback(response);
		}
                
                disconn();
            });
}


//Function to delete a plugin from database
db_utils.prototype.deletePlugin = function(pluginname, callback){
	conn();
        
	var response = {
	  message : {},
	  result: ''
	}
	
        connection.query("DELETE FROM plugins WHERE name="+mysql.escape(pluginname), function(err, result){

		if(err != null){
		  response.message=err;
		  response.result="ERROR";
		  logger.error(response.result + " - " + err);
		  callback( response );
		}else{
		  response.message=result;
		  response.result="SUCCESS";
		  callback(response);
		}
                
                disconn();
            });
}



//Function to write that a plugin has been injected in a board to the proper table
db_utils.prototype.insertInjectedPlugin = function(board, pluginname, callback){
	conn();
        
        //Find the id of the plugin whose name is pluginname
        var plugin_id;
        connection.query("SELECT id FROM plugins WHERE name = '" + pluginname + "'", function(err, result){
	  
	    if(err){
	      logger.error("insertInjectedPlugin: "+err);
	      
	    } else {
	      plugin_id = result[0].id;

	      connection.query("INSERT INTO plugins_injected (board_id, plugin_id, state) VALUES ('"+board+"','"+plugin_id+"', 'injected')", function(err, result){
		  if(err){
		    logger.error("insertInjectedPlugin: "+err);
		  } else {
		    callback("plugin_id: " + plugin_id);
		  }
		  disconn();
	      });
	      
	    }
	    
        });
}

//Function to remove a plugin that was injected in a board
db_utils.prototype.deleteInjectedPlugin = function(board, plugin_id, callback){
	conn();
	//delete from plugins_injected where plugin_id=5;
	connection.query("DELETE FROM plugins_injected WHERE board_id='"+board+"' AND plugin_id='"+plugin_id+"'", function(err, result){
	    if(err){
	      logger.error("deleteInjectedPlugin: "+err);
	    } else {
	      callback("plugin_id: " + plugin_id);
	    }
	    disconn();
	});

	
}

//Function to update the plugin status of a specific board
db_utils.prototype.updatePluginStatus = function(board, pluginname, status, callback){
	conn();
        
        //Find the id of the plugin whose name is pluginname
        var plugin_id;
        connection.query("SELECT id FROM plugins WHERE name = '" + pluginname + "'", function(err, result){
	  
	    if(err){
	      logger.error("updatePluginStatus: "+err);
	      
	    } else {
	      plugin_id = result[0].id;
	      connection.query("UPDATE plugins_injected SET state = '"+status+"', latest_change=NOW() WHERE board_id='"+board+"' AND plugin_id='"+plugin_id+"'", function(err, result){
		  if(err){
		    logger.error("updatePluginStatus: "+err);
		  } else {
		    callback("Plugin " +pluginname+ " status updated: "+status);
		  }
		  disconn();
	      });
	      
	    }
	    
        });
}


//Function to obtain the id of a plugin
db_utils.prototype.getPlugin = function(pluginName, callback){
	conn();

	connection.query("SELECT id, name, code FROM plugins WHERE name = '" + pluginName + "'", function(err,result){
		
		if(err != null){
		  logger.error(err);
		}
		callback(result);
	});
	disconn();
}






//Function to obtain the id of a plugin
db_utils.prototype.getPluginName = function(pluginName, callback){
	conn();

	connection.query("SELECT name FROM plugins WHERE name = '" + pluginName + "'", function(err,result){
		
		if(err != null){
		  logger.error(err);
		}
		callback(result);
	});
	disconn();
}


//Function to obtain the key boardId-pluginId from table plugins_injected
db_utils.prototype.getInjectedPlugin = function(plugin_id, board, callback){
	conn();

	connection.query("SELECT board_id, plugin_id FROM plugins_injected WHERE board_id = '" + board + "' AND plugin_id = '" + plugin_id + "'", function(err,result){

		if(err != null){
		  logger.error(err);
		}
		callback(result);
	});
	disconn();
}


//Function to obtain the plugins list on a board
db_utils.prototype.getPluginsOnBoard = function(board, callback){
  
  
	conn();
	//logger.info("---> QUERY plugin-on-board called...");
	connection.query("SELECT plugins.name, plugins.id, plugins_injected.state FROM plugins_injected, plugins WHERE plugins_injected.board_id = '" + board + "' AND plugins_injected.plugin_id = plugins.id", function(err, result){

		if(err != null){
		  logger.error(err);
		}
		callback(result);
	});
	disconn();
	
}


//Function to obtain the sensors list on a board
db_utils.prototype.getSensorsOnBoard = function(board, callback){
  
	conn();

	connection.query("SELECT sensors.type, sensors.model, sensors.id FROM sensors, sensors_on_board WHERE sensors_on_board.id_board = '" + board + "' AND sensors_on_board.id_sensor = sensors.id", function(err, result){

		if(err != null){
		  logger.error(err);
		}
		callback(result);
	});
	
	disconn();
	
}



//Function to obtain the plugin list on a board
db_utils.prototype.getBoardLayout = function(board, callback){
  
	conn();
	
	var response = {
	  message : {},
	  result: ''
	}
	
	
	connection.query("SELECT plugins.name, plugins.id, plugins_injected.state FROM plugins_injected, plugins WHERE plugins_injected.board_id = '" + board + "' AND plugins_injected.plugin_id = plugins.id", function(err_plugin, result_plugin){

		if(err_plugin != null){
		    response.result="ERROR";
		    response.message=err_plugin;
		    logger.error(response.result + " - " + err_plugin);
		    callback( response );
		    disconn();
		}
		else{
		  
		    connection.query("SELECT sensors.type, sensors.model, sensors.id FROM sensors, sensors_on_board WHERE sensors_on_board.id_board = '" + board + "' AND sensors_on_board.id_sensor = sensors.id", function(err_sensor, result_sensor){

			if(err_sensor != null){
			      response.result="ERROR";
			      response.message=err_sensor;
			      logger.error(response.result + " - " + err_sensor);
			      callback( response );
			      disconn();
			}else{
			  
			      var layout = {
				sensors : result_sensor,
				plugins: result_plugin
			      }
	
			      response.result="SUCCESS";
			      response.message=layout;
			      //logger.info(response.result + " - " + JSON.stringify(layout));
			      callback( response );
			      disconn();
			      
			}
			    
		    });
		  
		  
		}
		
	});
	
	
}



//Function to obtain the id of a plugin
db_utils.prototype.getPluginCategory = function(pluginName, callback){
	conn();

	connection.query("SELECT category FROM plugins WHERE name = '" + pluginName + "' ORDER BY id desc limit 1", function(err,result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
}




//Function to insert a measure into the database
db_utils.prototype.insertCreatedMeasure = function(measurename, readpluginId, elaboratepluginId, callback){
	conn();
        
        //console.log("pluginname = " + pluginname + " plugincategory = " + plugincategory + " plugincode = " + plugincode);
        
        connection.query("INSERT INTO measures (id, name, read_plugin, elaborate_plugin) VALUES (NULL, '"+measurename+"','"+readpluginId+"','"+elaboratepluginId+"')", function(err, result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
                callback(result);
                disconn();
            });
}







//Function to register a new board
db_utils.prototype.regBoard = function(board, board_label, latitude, longitude, altitude, net_enabled, sensorList, callback){
  
	conn();
	
	var sensorList2 = sensorList.split(",");

	//logger.info("LIST: "+sensorList2+" - "+JSON.stringify(sensorList2)+"----"+sensorList);
		
        //check if the board already exists
	logger.info("--> Board ID check...");
        connection.query("SELECT code FROM board_codes WHERE code =  '" + board + "'", function(err, result){
	    
	    //logger.info("--> list size " + result.length);
	    if(result.length == 0){
	      
	      logger.info("--> Registering new board " + board + "...");
	      connection.query("INSERT INTO board_codes VALUES ('"+board+"', NOW() )", function(err, result2){

		if(err != null){
		  disconn();
		  logger.error("--> Registration error in board_codes: "+ err);
		  //callback("Registration error in board_codes table!");
		  callback( {result:"ERROR", message:"Registration error in board_codes table!"} );
		}
		else{
		  
		    connection.query("INSERT INTO user_boards VALUES ('',1,1,'"+board+"',1,'"+net_enabled+"');", function(err, result3){
		      if(err != null){
			disconn();
			logger.error("--> Registration error in user_boards: "+ err);
			//callback("Registration error in user_boards table!");
			callback( {result:"ERROR", message:"Registration error in user_boards table!"} );
		      }
		      else{

			connection.query("INSERT INTO boards_connected (board_code, label, session_id, status, altitude, longitude, latitude) VALUES ('"+board+"', '"+board_label+"','null','D', '"+altitude+"', '"+longitude+"', '"+latitude+"')", function(err, latest_result){
			  
			  if(err != null){
			    disconn();
			    logger.error("--> Registration error in boards_connected: "+ err);
			    //callback("Registration error in boards_connected table!");
			    callback( {result:"ERROR", message:"Registration error in boards_connected table!"} );
			  }
			  else{
			    
			    if (sensorList2 != "NULL"){
			    
				  for(var i = 0; i < sensorList2.length; i++) {
	    
				    (function(i) {
				      
					logger.info("INSERT INTO sensors_on_board (id_sensor, id_board) VALUES ('"+sensorList2[i]+"', '"+board+"')");

					
					connection.query("INSERT INTO sensors_on_board (id_sensor, id_board) VALUES ('"+sensorList2[i]+"', '"+board+"')", function(err, latest_result){
					  
					  if(err != null){
					    logger.error("--> Registration error in sensors_on_board: "+ err);
					    //callback("Registration error in sensors_on_board table!");
					    callback( {result:"ERROR", message:"Registration error in sensors_on_board table!"} );
					  }
					  
					  if( i == (sensorList2.length - 1) ){
					    
					    disconn();
					    logger.info("--> Registration successfully completed!");
					    //callback("Registration successfully completed!");
					    callback( {result:"SUCCESS", message:"Registration successfully completed!"} );
					    
					  }

					  
					});
				  

				    })(i); 
	    
				  }
				  
				  
			    }
			    else{
			      
				  disconn();
				  logger.info("--> Registration successfully completed!");
				  //callback("Registration successfully completed!");
				  callback( {result:"SUCCESS", message:"Registration successfully completed!"} );
					    
			      
			    }
			    
			    
			  }
			  
			});
			
		    
		      }
		      
		      
		      
		    });
		    
		}
	      });
	      
	      
	    }
	    else{
	      logger.warn("--> The board " + board + " already exists!");
	      callback( {result:"EXISTS", message:"The board " + board + " already exists!"} );
	      disconn();
	    }
            
        });
	
	
	
	
}





//Function to register a new board
db_utils.prototype.unRegBoard = function(board, callback){
  
	conn();
		
        //check if the board already exists
	logger.info("--> Board ID check...");
        connection.query("SELECT code FROM board_codes WHERE code =  '" + board + "'", function(err, result){
	    
	    if(result.length != 0){
	      
	      logger.info("--> Unegistering board " + board + "...");

		  
	      connection.query("DELETE FROM board_codes WHERE code='"+board+"';", function(err, result3){
		    
		      if(err != null){
			logger.error("--> Unregistration error in board_codes: "+ err);
			callback("Unregistration error in board_codes table!");
			disconn();
		      }
		      else{
			logger.info("--> Unregistration successfully completed!");
			callback("Unregistration successfully completed!");
			disconn();
		      } 
		      
	      });

	      
	    }
	    else{

	      logger.warn("--> The board " + board + " does not exist!");
	      callback("The board " + board + " does not exist!");
	      disconn();
	    }
            
        });
	
	
}










//Function to register a new board
db_utils.prototype.updateBoard = function(board, board_label, latitude, longitude, altitude, net_enabled, sensorList, callback){
  
	conn();
		
	
	
        //check if the board exists
	logger.info("--> Board ID check...");
        connection.query("SELECT code FROM board_codes WHERE code =  '" + board + "'", function(err, result){
	    
	    if(result.length != 0){
	      
	      logger.info("--> Updating board " + board + "...");
	      
	      

	      connection.query("UPDATE boards_connected, user_boards SET user_boards.net_enabled='"+net_enabled+"',boards_connected.label='"+board_label+"' ,boards_connected.altitude='"+altitude+"', boards_connected.longitude='"+longitude+"', boards_connected.latitude='"+latitude+"' WHERE user_boards.board_code='"+board+"' AND boards_connected.board_code='"+board+"'", function(err, latest_result){
		
		if(err != null){
		  logger.error("--> Updating board error in boards_connected: "+ err);
		  callback("Updating board error in boards_connected table!");
		  disconn();
		}
		else{
		  
			logger.info("--> Updating sensor list for board " + board + "...");
			
			var sensorList2 = sensorList.split(",");
			//logger.info("LIST: "+sensorList2+" - "+JSON.stringify(sensorList2));
			
			connection.query("DELETE FROM sensors_on_board WHERE id_board='"+board+"';", function(err, result3){
		    
				if(err != null){
				  logger.error("--> Cleaning sensor list error in sensors_on_board table: "+ err);
				  callback("Cleaning sensor list error in sensors_on_board table!");
				  disconn();
				}
				else{
				  
				  logger.info("--> Cleaning sensor list successfully completed!");

				  
				  for(var i = 0; i < sensorList2.length; i++) {

				    (function(i) {
				      
					logger.info("INSERT INTO sensors_on_board (id_sensor, id_board) VALUES ('"+sensorList2[i]+"', '"+board+"')");

					
					connection.query("INSERT INTO sensors_on_board (id_sensor, id_board) VALUES ('"+sensorList2[i]+"', '"+board+"')", function(err, latest_result){
					  
					  if(err != null){
					    logger.error("--> Updating sensor list error in sensors_on_board: "+ err);
					    callback("Updating sensor list error in sensors_on_board table!");
					  }
					  
					  if( i == (sensorList2.length - 1) ){
					    
					    disconn();
					    //logger.info("--> disconnected from DB");
					    logger.info("--> Updating board successfully completed!");
					    callback("Board successfully updated in Iotronic!");
					    
					  }

					  
					});
				    

				    })(i); 

				  }		  

				  
				  
				} 
				
			});
			

		  
		}
		
	      });
	      
	  
	      
		      

	    }
	    else{
	      logger.warn("--> The board " + board + " does not exist!");
	      callback("The board " + board + " does not exist!");
	      disconn();
	    }
            
        });
	
	
}






//Function to obtain the sensors list
db_utils.prototype.getSensorList = function(callback){
	conn();

	var response = {
	  message : {},
	  result: ''
	}
	
	connection.query("SELECT * FROM sensors", function(err, result){
		if(err != null){
		  response.message=err;
		  response.result="ERROR";
		  logger.error(response.result + " - " + err);
		  callback( response );
		}else{
		  response.message=result;
		  response.result="SUCCESS";
		  callback(response);
		}
	});
	disconn();
}



//Function to obtain the sensors list
db_utils.prototype.getPluginList = function(callback){
	conn();

	var response = {
	  message : {},
	  result: ''
	}
	
	connection.query("SELECT * FROM plugins", function(err, result){
		if(err != null){
		  response.message=err;
		  response.result="ERROR";
		  logger.error(response.result + " - " + err);
		  callback( response );
		}else{
		  response.message=result;
		  response.result="SUCCESS";
		  callback(response);
		}
	});
	disconn();
}



//Function to obtain the board info: plugins e sernsors list
db_utils.prototype.getBoardInfo = function(board, callback){
  
	conn();
	
	var response = {
	  message : {},
	  result: ''
	}
	
	
	connection.query("SELECT boards_connected.board_code, label, altitude, longitude, latitude, net_enabled FROM boards_connected, user_boards WHERE boards_connected.board_code = '" + board + "' AND boards_connected.board_code = user_boards.board_code", function(err_info, result_info){

		if(err_info != null){
		    response.result="ERROR";
		    response.message=err_info;
		    logger.error(response.result + " - " + err_info);
		    callback( response );
		    disconn();
		}
		else{
		  
		    connection.query("SELECT sensors.type, sensors.model, sensors.id FROM sensors, sensors_on_board WHERE sensors_on_board.id_board = '" + board + "' AND sensors_on_board.id_sensor = sensors.id", function(err_sensor, result_sensor){

			if(err_sensor != null){
			      response.result="ERROR";
			      response.message=err_sensor;
			      logger.error(response.result + " - " + err_sensor);
			      callback( response );
			      disconn();
			}else{
			  
			      var layout = {
				info: result_info,
				sensors : result_sensor
			      }
	
			      response.result="SUCCESS";
			      response.message=layout;
			      //logger.info(response.result + " - " + JSON.stringify(layout));
			      //logger.info("Board Info successfully called!");
			      callback( response );
			      disconn();
			      
			}
			    
		    });
		  
		  
		}
		
	});
	
	
}





//Function to obtain the net_enabled id of a board
db_utils.prototype.getNetEnabledId = function(board, callback){
  
	conn();

	//select net_enabled from user_boards where board_code=30303030
	connection.query("SELECT net_enabled FROM user_boards WHERE board_code = '" + board + "'", function(err,result){
		
		if(err != null){
		  logger.error("SELECT error in user_boards tables: "+ err);
		}
		callback(result);
	});
	disconn();
	
}





//Function to obtain the net_enabled id of a board
db_utils.prototype.getSocatConf = function(board, basePort, socatNetwork, callback){
  
	conn();
	
	connection.query("SELECT id FROM socat_connections WHERE id_board='" + board + "'", function(err,result){
	  
	      if(err != null){
			  
		    logger.error("INSERT error in socat_connection tables: "+ err);
		    disconn();
		    callback(result);
			  
	      } else {
		
		    
		    //if the board is NEW one
		    if (result[0] == undefined ){   //var socat_id = result[0].id;
		      
		      
						
			logger.info("--> registering new board in DB...");			   
				
						
						
	      
			  //NEW socat ID creation related to the new board FOREVER
			  connection.query("INSERT INTO socat_connections (id, id_board, status) VALUES ('', '" + board + "', 'noactive' )", function(err,result){
				  
				  if(err != null){
				    
					logger.error("INSERT error in socat_connection tables: "+ err);
					disconn();
					//callback(result);
				    
				  } else {
				    
				    	var response = {
					  socat_conf : {}
					}
				    
					//get the socat ID just created before
					connection.query("SELECT id FROM socat_connections WHERE id_board='" + board + "'", function(err,result){
			  
					    if(err != null){
					      logger.error("SELECT error in socat_connection tables: "+ err);
					      
					    }else{
					      
					      var bSocatNum = result[0].id - 1;
					      logger.info("--> selecting new board id DB...bSocatNum = "+bSocatNum);
					      
					      var socatPort = parseInt(basePort)+bSocatNum;
					      var socatNetAddr = ip.toLong(socatNetwork) + (bSocatNum*2);
					      var socatServAddr = ip.fromLong(socatNetAddr);
					      var socatBoardAddr = ip.fromLong(socatNetAddr+1);
					      
					      
					      response.socat_conf={socatID:bSocatNum, port:socatPort, serverIP:socatServAddr, boardIP: socatBoardAddr}
					      
					      logger.info("--> creating new NET parameters in DB for board "+board+"..."+" port = '"+socatPort+"', ip_board='"+socatBoardAddr+"', ip_server='"+socatServAddr);	
					      
					      
					      connection.query("UPDATE socat_connections SET port = '"+socatPort+"', ip_board='"+socatBoardAddr+"', ip_server='"+socatServAddr+"'  WHERE id_board='"+board+"'", function(err, result_insert){
						
				  
						if(err != null){
						  logger.error("UPDATE error in socat_connections tables: "+ err);
						  disconn();
						  //callback(response);
						}else{
						  disconn();
						  callback(response);
						}
						
					      });
					      
					      
					      
					      
					    }
					    
					    
					});
					  
				  }
				  
			  });
			  
		    }else{
		      
			  var response = {
			    socat_conf : {}
			  }
			  
			  //get the socat ID just created before
			  connection.query("SELECT id, ip_board, ip_server, port FROM socat_connections WHERE id_board='" + board + "'", function(err,result){
	    
			      if(err != null){
				logger.error("SELECT error in socat_connection tables: "+ err);
			      }else{
									      
				var bSocatNum = result[0].id - 1;
				logger.info("--> selecting new board id DB...bSocatNum = "+bSocatNum);
					      
				var socatPort = result[0].port;
				var socatServAddr = result[0].ip_server;
				var socatBoardAddr = result[0].ip_board;
				
				//logger.info("--> NET PARAM port = '"+socatPort+"', ip_board='"+socatBoardAddr+"', ip_server='"+socatServAddr);	
				
				response.socat_conf={socatID:bSocatNum, port:socatPort, serverIP:socatServAddr, boardIP: socatBoardAddr}
				
				//logger.info("--> NET RESPONSE = "+JSON.stringify(response));
				
				disconn();
				callback(response);
				
			      }
			      
			      
			  });
			  
			  
		    }
		    
		    
		    
		    
	    }
	});
	
}

//Function to obtain the socat status of a board
db_utils.prototype.getSocatStatus = function(board, callback){
  
	conn();
	
	connection.query("SELECT status FROM socat_connections WHERE id_board='" + board + "'", function(err,result){

	    if(err != null){
	      logger.error("SELECT error in socat_connection tables: "+ err);
	      disconn();
	      //callback(result);
	    }else{
	      disconn();
	      callback(result);
	    }
	    
	    
	});
}


//Function to obtain the socat ID of a board
db_utils.prototype.getSocatPort = function(board, callback){
  
	conn();
	
	connection.query("SELECT port FROM socat_connections WHERE id_board='" + board + "'", function(err,result){

	    if(err != null){
	      logger.error("SELECT error in socat_connection tables: "+ err);
	      disconn();
	      //callback(result);
	    }else{
	      disconn();
	      callback(result);
	    }
	    
	    
	});
	
}


//Function to obtain the socat ID of a board
db_utils.prototype.getSocatConn = function(board, callback){
  
	conn();
	
	connection.query("SELECT id, port FROM socat_connections WHERE id_board='" + board + "'", function(err,result){

	    if(err != null){
	      logger.error("SELECT error in socat_connection tables: "+ err);
	      disconn();
	      //callback(result);
	    }else{
	      disconn();
	      callback(result);
	    }
	    
	    
	});
	
}


//Function to update the socat status of a board
db_utils.prototype.updateSocatStatus = function(board, status, callback){
  
	conn();
	
	connection.query("UPDATE socat_connections SET status = '"+status+"' WHERE id_board='"+board+"'", function(err, result){

	    if(err != null){
	      logger.error("UPDATE error in socat_connection tables: "+ err);
	      disconn();
	      //callback(result);
	    }else{
	      disconn();
	      callback(result);
	    }
	    
	    
	})
}


//Function to insert new VLAN
db_utils.prototype.insertNetVlan = function(vlan_ip, vlan_mask, net_uuid, vlan_name, callback){
  
	conn();

	logger.info("--> registering new VLAN in DB...");			   

	//NEW socat ID creation related to the new board FOREVER
	connection.query("INSERT INTO vlans (id, vlan_ip, vlan_mask, net_uuid, vlan_name) VALUES ('', '" + vlan_ip + "', '" + vlan_mask + "', '" + net_uuid + "', '" + vlan_name + "' )", function(err,result){
		
		if(err != null){
		  
		      logger.error("insertNetVlan - INSERT error in vlans tables: "+ err);
		      disconn();
		  
		} else {
		  
		      //logger.info("--> SELECT id FROM vlans WHERE net_uuid='" + net_uuid + "'");
		      //get the socat ID just created before
		      connection.query("SELECT id FROM vlans WHERE net_uuid='" + net_uuid + "'", function(err,result){
	
			  
			  if(err != null){
			    logger.error("insertNetVlan - SELECT error in vlans tables: "+ err);
			    disconn();
			    
			  }else{
			    
			    logger.info("--> new vlan ID selected from DB: "+ result[0].id);

			    disconn();
			    callback(result);

			  }
			  
			  
		      });
			
		}
		
	});
			  
		   
	
}


//Function to insert new VLAN
db_utils.prototype.getVlanList = function(callback){
  
	conn();
		   
		  
	//get the socat ID just created before
	connection.query("SELECT * FROM vlans", function(err,result){

	    if(err != null){
	      logger.error("getVlanList - SELECT error in vlans tables: "+ err);
	      disconn();
	    }else{
	      
	      //logger.info("--> new vlan ID selected from DB: "+ result);

	      disconn();
	      callback(result);

	    }
	    
	    
	});

			  
		   
	
}

//Function to insert new VLAN
db_utils.prototype.getVlan = function(net_uuid, callback){
  
	conn();
		   
		  
	//get the socat ID just created before
	connection.query("SELECT * FROM vlans WHERE net_uuid='" + net_uuid + "'", function(err,result){

	    if(err != null){
	      logger.error("getVlan - SELECT error in vlans tables: "+ err);
	      disconn();
	    }else{
	      
	      //logger.info("--> new vlan ID selected from DB: "+ result);

	      disconn();
	      callback(result);

	    }
	    
	    
	});

			  
		   
	
}


//Function to delete a VLAN
db_utils.prototype.deleteVlan = function(net_uuid, callback){
  
	conn();
		   
	//delete from vlans where vlan
	connection.query("DELETE FROM vlans WHERE net_uuid='" + net_uuid + "'", function(err,result){

	    if(err != null){
	      logger.error("deleteVlan - DELETE error in vlans tables: "+ err);
	      disconn();
	    }else{
	      
	      logger.info("--> Deleted VLAND with ID: "+ result[0].id);

	      disconn();
	      callback(result);

	    }
	    
	    
	});

			  
		   
	
}




//Function to insert new VLANConnection
db_utils.prototype.insertVLANConnection = function(vlan_ip , net_uuid, id_board, callback){
  
	conn();

        var response = {
            message:{},
            result:'',
        }
        
        //"SELECT EXISTS(SELECT 1 FROM vlans_connection WHERE ip_vlan ='"+vlan_ip+"' LIMIT 1)"
        connection.query("SELECT EXISTS(SELECT 1 FROM vlans_connection WHERE ip_vlan ='"+vlan_ip+"' LIMIT 1) AS found", function(err,result){
		if(err != null){
		      logger.error("insertVLANConnection - SELECT error in checking ip_vlans: "+ err);
		      disconn();
                      response.message=err;
                      response.result='ERROR';
                      callback(response);
		} else {
                    
                    if (result[0].found == 1) {
                            logger.info("insertVLANConnection - VLAN connection already exists: "+ result[0].id);
                            disconn();
                            response.message=result;
                            response.result=result[0].found;
			    callback(response);
                    }
                    else{
                            logger.info("insertVLANConnection - registering new VLAN connection...");	

                            //NEW socat ID creation related to the new board FOREVER
                            connection.query("INSERT INTO vlans_connection (id, id_vlan, id_socat_connection,ip_vlan) VALUES ('', (select id from vlans where net_uuid='"+net_uuid+"'), (select id from socat_connections where id_board="+id_board+"), '"+vlan_ip+"')", function(err,result){
                                    
                                    if(err != null){
        
                                        logger.error("insertVLANConnection - INSERT error in vlans_connection tables: "+ err);
                                        disconn();
                                        response.message=err;
                                        response.result='ERROR';
                                        callback(response);
                                    
                                    } else {
                                        logger.info("insertVLANConnection - registering new VLAN Connection completed!");
                                        disconn();
                                        response.message=result;
                                        response.result='SUCCESS';
                                        callback(response);
 
                                    }
                                    
                            });
                        
                    }
                    

		}
		
	});
        

}




//Function to insert new Addresses
db_utils.prototype.insertAddresses = function(list_ip, net_uuid, callback){
    
	conn();
        
	logger.info("--> registering new VLAN Addresses in DB...");
        
        var query="INSERT INTO free_addresses (vlans_id, ip, insert_date) VALUES "
	
	var getVID="SELECT id FROM vlans WHERE net_uuid='" + net_uuid + "' "
	
	
	connection.query(getVID, function(err, result){
	  
		if(err != null){
		  
		      logger.error("insertAddresses - SELECT error in vlans table: "+ err); 
		      
		} else {

		      for(var i = 0; i < list_ip.length; i++) {
	      
			  (function(i) {
			    
			      v = util.format("(%d,'%s', NOW())", result[0].id, list_ip[i]);
			      query=query+v;
			      if (i<list_ip.length-1) query=query+",";
			  
			      //logger.info("--> IP POOL..." + v);
			  
			  })(i); 
			  
		      }
		     

		      connection.query(query, function(err,result){
			      if(err != null){
				
				    logger.error("insertAddresses - INSERT error in free_addresses table: "+ err); 
				    
			      } else {
				  disconn();
				  callback(result);
			      }
		      });
		  
		  
		  
                }
	});
        
        
}



//Function to check if a board is already connected to a VLAN
db_utils.prototype.checkBoardIntoVLAN = function(board, net_uuid, callback){
  
	conn();
	
	var response = {
	  message : {},
	  result: ''
	}
	
	
	connection.query("SELECT EXISTS(  SELECT id_vlan, id_socat_connection FROM vlans_connection WHERE id_vlan = (SELECT id FROM vlans WHERE net_uuid='" + net_uuid + "' )  AND id_socat_connection=(SELECT id FROM socat_connections WHERE id_board='" + board + "' )  ) AS found", function(err, result){

		if(err != null){
		    response.result="ERROR";
		    response.message=err;
		    //logger.error(response.result + " - " + err);
		    disconn();
		    callback( response );
		    
		}
		else{
		  
		  response.result="SUCCESS";
		  response.message=result;
		  //logger.info(response.result + " - " + result);
		  disconn();
		  callback( response );
		  
		}
		
	});
	
	
}


//Function to get first valid address
db_utils.prototype.checkAddressPool = function(net_uuid, callback){
  
	conn();
	
	var response = {
	  message : {},
	  result: ''
	}
	//SELECT id, ip  FROM vlans, free_addresses WHERE net_uuid='85268bf8-55d6-42b2-8ce5-fb89cc2101ae' AND vlans.id=free_addresses.vlans_id;
	query="select ip from free_addresses where vlans_id = (SELECT id FROM vlans WHERE net_uuid='" + net_uuid + "' ) ORDER BY insert_date, ip ASC limit 1";
	
	connection.query(query, function(err, result){

		if(err != null){
		    response.result="ERROR";
		    response.message=err;
		    logger.error(response.result + " - " + err);
		    disconn();
                    callback( response );
		}
		else{

		    response.message=result;
                  
                    if (result.length != 0){
		      
		      //logger.info(response.result + " - " + result);
		      response.result="SUCCESS";
		      logger.info(response.result + " - " + JSON.stringify(result) + " err " + err);
		      disconn();
		      callback( response );
			
			
                    }
                    else{
			
			response.result="NO-IP";
			logger.info(response.result + " - " + JSON.stringify(result) + " err " + err);
			disconn();
			callback( response );
                    }
                    
		}
		
	});
	
	
}



//Function to get first valid address
db_utils.prototype.getFreeAddress = function(net_uuid, callback){
  
	conn();
	
	var response = {
	  message : {},
	  result: ''
	}
	//SELECT id, ip  FROM vlans, free_addresses WHERE net_uuid='85268bf8-55d6-42b2-8ce5-fb89cc2101ae' AND vlans.id=free_addresses.vlans_id;
	query="select ip from free_addresses where vlans_id = (SELECT id FROM vlans WHERE net_uuid='" + net_uuid + "' ) ORDER BY insert_date, ip ASC limit 1";
	
	connection.query(query, function(err, result){

		if(err != null){
		    response.result="ERROR";
		    response.message=err;
		    logger.error(response.result + " - " + err);
		    disconn();
                    callback( response );
		}
		else{
		  
		    response.result="SUCCESS";
		    response.message=result;
		    //logger.info(response.result + " - " + JSON.stringify(result) + " err " + err);
                  
                    if (result.length != 0){
		      
                        query="DELETE from free_addresses where ip='"+result[0].ip+"'";
                        
                        connection.query(query, function(err, result){

                                if(err != null){
                                    response.result="ERROR";
                                    response.message=err;
                                    //logger.error(response.result + " - " + err);
                                    disconn();
                                    callback( response );
                                    
                                }
                                else{
                                //logger.info(response.result + " - " + result);
                                response.result="SUCCESS";
                                disconn();
                                callback( response );
                                }
                        
                        });
			
			
                    }
                    else{
			
			response.result="NO-IP";
			response.message=result;
			logger.info(response.result + " - " + JSON.stringify(result) + " err " + err);
			
			disconn();
			callback( response );
                    }
                    
		}
		
	});
	
	
}



//Function to check if the USER ip is free
db_utils.prototype.checkAssignedVlanIP = function(user_ip, vlan_id, callback){
  
	conn();
	
	var response = {
	  message : {},
	  result: ''
	}

	
	connection.query("SELECT EXISTS(  SELECT vlans_id, ip FROM free_addresses WHERE vlans_id ='" + vlan_id + "' AND ip ='" + user_ip + "' ) AS found", function(err, result){

		if(err != null){
		    response.result="ERROR";
		    response.message=err;
		    logger.error("--> checkAssignedVlanIP ERROR: " + err);
		    callback( response );
		    disconn();
		}
		else{
		  
		    logger.info("--> checkAssignedVlanIP query OK!");
		    logger.info("--> checkAssignedVlanIP found: "+result[0].found);
		    
		    if (result[0].found == 1){

                        query="DELETE from free_addresses where ip='"+user_ip+"'";
			
			logger.info("FOUND - " + result[0].found + " query: " +query);
                        
                        connection.query(query, result, function(del_err, del_result){
			  
				logger.info("FOUND DELETE - " + result[0].found + " - "+user_ip);

                                if(del_err != null){
				    response.result="ERROR";
				    response.message=del_err;
				    callback( response );
				    disconn();
                                    
                                }
                                else{
				    response.result="SUCCESS";
				    response.message=result;
				    callback( response );
				    disconn();
                                }
                        
                        });
			
		    }else{
			logger.info("--> checkAssignedVlanIP IP NOT AVAILABLE: "+result[0].found);
			response.result="NOT-AVAILABLE";
			response.message=result;
			callback( response );
			disconn();
		      
		    }
		  

		  
		}
		
	});
	
	
}

//Function to remove board from a VLAN
db_utils.prototype.removeBoardFromVlan = function(board_id,net_uuid, callback){
  
	conn();
	
	var response = {
	  message : {},
	  result: ''
	}

	query="select ip_vlan from vlans_connection where id_vlan = (SELECT id FROM vlans WHERE net_uuid='" + net_uuid + "' )  and id_socat_connection = (SELECT id FROM socat_connections WHERE id_board='" + board_id + "' )";
	
	connection.query(query, function(err, result){

		if(err != null){
		    response.result="ERROR";
		    response.message=err;
		    //logger.error(response.result + " - " + err);
		    disconn();
                    callback( response );
		}
		else{
		  
		    response.message=result;
		    var board_ip = result[0].ip_vlan;
		    //logger.info(response.result + " - " + result);
                  
                    if (result.length != 0){
		      
                        query="DELETE from vlans_connection where ip_vlan='"+board_ip+"'";
                        
                        connection.query(query, function(err, result){

                                if(err != null){
                                    response.result="ERROR";
                                    response.message=err;
                                    //logger.error(response.result + " - " + err);
                                    disconn();
                                    callback( response );
                                    
                                }
                                else{
				  
				    connection.query("INSERT INTO free_addresses (vlans_id, ip, insert_date) VALUES ( (SELECT id FROM vlans WHERE net_uuid='" + net_uuid + "' ), '"+board_ip+"', NOW())", function(err,result){
					    
					    if(err != null){
		
						logger.error("removeBoardFromVlan - ERROR INSERT into free_addresses tables: "+ err);
						disconn();
						response.message=err;
						response.result='ERROR';
						callback(response);
					    
					    } else {
						logger.info("removeBoardFromVlan - INSERT into free_addresses tables SUCCESS!");
						disconn();
						response.message=result;
						response.result='SUCCESS';
						callback(response);
						
	
					    }
					    
				    });
			    
			    

                                }
                        
                        });
                    }
                    else{
			//logger.info(response.result + " - " + result);
			response.result="ERROR";
			disconn();
			callback( response );
                    }
		}
		
	});
	
	
}



    
//Function to get VLAN board info for "show-board" REST CALL
db_utils.prototype.showBoards = function(net_uuid, callback){
  
	conn();
	
	var response = {
	  message : {},
	  result: ''
	}
	
	
	connection.query("select id_board  AS BOARD_ID, vlans.vlan_name AS vlan_NAME, vlans_connection.id_vlan AS vlan_ID, vlans_connection.ip_vlan AS vlan_IP,  socat_connections.id AS socat_ID, socat_connections.ip_board AS socat_IP, socat_connections.port AS socat_PORT from socat_connections,vlans_connection, vlans where socat_connections.id = vlans_connection.id_socat_connection AND id_vlan = vlans.id AND vlans.net_uuid='" + net_uuid + "'", function(err, result){

		if(err != null){
		    response.result="ERROR";
		    response.message=err;
		    callback( response );
		    disconn();
		}
		else{
		  
		  response.result="SUCCESS";
		  response.message=result;
		  callback( response );
		  disconn();
		  
		}
		
	});
	
	
}    
    
    
//Function to destroy a VLAN
db_utils.prototype.destroyVLAN = function(net_uuid, callback){
  
	conn();
	
	var response = {
	  message : {},
	  result: ''
	}
	
	
	connection.query("DELETE FROM vlans WHERE vlans.net_uuid='" + net_uuid + "'", function(err, result){

		if(err != null){
		    response.result="ERROR";
		    response.message=err;
		    callback( response );
		    disconn();
		}
		else{
		  
		  response.result="SUCCESS";
		  response.message=result;
		  callback( response );
		  disconn();
		  
		}
		
	});
	
	
}    


//select vlan_name, ip_vlan, net_uuid from vlans, vlans_connection, socat_connections where id_socat_connection = (select id from socat_connections where id_board="14144545") AND vlans_connection.id_socat_connection = socat_connections.id AND vlans_connection.id_vlan = vlans.id;

//Function to get VLANs of a board
db_utils.prototype.getBoardVLAN = function(board, callback){
  
	conn();
	
	var response = {
	  message : {},
	  result: ''
	}
	
	
	connection.query("select vlan_name, ip_vlan, net_uuid from vlans, vlans_connection, socat_connections where id_socat_connection = (select id from socat_connections where id_board='" + board + "') AND vlans_connection.id_socat_connection = socat_connections.id AND vlans_connection.id_vlan = vlans.id", function(err, result){

		if(err != null){
		    response.result="ERROR";
		    response.message=err;
		    callback( response );
		    disconn();
		}
		else{
		  
		  response.result="SUCCESS";
		  response.message=result;
		  callback( response );
		  disconn();
		  
		}
		
	});
	
	
} 



//DRIVERS MANAGMENT ------------------------------------------------------------------------------------------------------------------------------------------

//Function to insert a driver into the database
db_utils.prototype.insertCreatedDriver = function(drivername, driverjson, drivercode, callback){
	conn();
        
	var response = {
	  message : {},
	  result: ''
	}
	
        connection.query("INSERT INTO drivers (id, name, jsonschema, code) VALUES (NULL, "+mysql.escape(drivername)+" , "+mysql.escape(driverjson)+" , "+mysql.escape(drivercode)+")", function(err, result){

		if(err != null){
		  response.message=err;
		  response.result="ERROR";
		  logger.error("insertCreatedDriver: "+err);
		  callback( response );
		}else{
		  response.message=result;
		  response.result="SUCCESS";
		  callback(response);
		}
                
                disconn();
	});
}


//Function to obtain the id of a driver
db_utils.prototype.getDriverId = function(drivername, callback){
	conn();

	connection.query("SELECT id FROM drivers WHERE name = '" + drivername + "'", function(err,result){
		
		if(err != null){
		  logger.error("getDriverId: "+err);
		}
		callback(result);
	});
	disconn();
}

//Function to obtain the name and code of a generic driver
db_utils.prototype.getDriver = function(driverId, callback){
	conn();

	connection.query("SELECT name, code, jsonschema FROM drivers WHERE id = '" + driverId + "'", function(err,result){

		if(err != null){
		  logger.error("getDriver: "+err);
		}
		callback(result);
	});
	disconn();
}

//Function to obtain the key boardId-driverId from table drivers_injected
db_utils.prototype.getInjectedDriver = function(driver_id, board, callback){
	conn();

	connection.query("SELECT board_id, driver_id FROM drivers_injected WHERE board_id = '" + board + "' AND driver_id = '" + driver_id + "'", function(err,result){

		if(err != null){
		  logger.error("getInjectedDriver: "+err);
		}
		callback(result);
	});
	disconn();
}

//Function to write that a driver has been injected in a board to the proper table
db_utils.prototype.insertInjectedDriver = function(board, drivername, callback){
	conn();
        
        //Find the id of the driver whose name is drivername
        var driver_id;
        connection.query("SELECT id FROM drivers WHERE name = '" + drivername + "'", function(err, result){
	  
	    if(err){
	      logger.error("insertInjectedDriver: "+err);
	      
	    } else {
	      
	      driver_id = result[0].id;

	      connection.query("INSERT INTO drivers_injected (board_id, driver_id, state) VALUES ('"+board+"','"+driver_id+"', 'injected')", function(err, result){
		  if(err){
		    logger.error("insertInjectedDriver: "+err);
		  } else {
		    callback("driver_id: " + driver_id);
		  }
		  disconn();
	      });
	      
	    }
	    
        });
}


//Function to update the driver status of a specific board
db_utils.prototype.updateDriverStatus = function(board, drivername, status, callback){
	conn();
        
        //Find the id of the driver whose name is drivername
        var driver_id;
        connection.query("SELECT id FROM drivers WHERE name = '" + drivername + "'", function(err, result){
	  
	    if(err){
	      logger.error("updateDriverStatus: "+err);
	      
	    } else {
	      driver_id = result[0].id;
	      connection.query("UPDATE drivers_injected SET state = '"+status+"', latest_change=NOW() WHERE board_id='"+board+"' AND driver_id='"+driver_id+"'", function(err, result){
		  if(err){
		    logger.error("updateDriverStatus: "+err);
		  } else {
		    callback("Driver " +drivername+ " status updated: "+status);
		  }
		  disconn();
	      });
	      
	    }
	    
        });
}
//DRIVERS MANAGMENT ------------------------------------------------------------------------------------------------------------------------------------------




//Function to obtain the name and code of a generic driver
db_utils.prototype.getBoardPosition = function(board_id, callback){
  
	conn();
	
	connection.query("SELECT altitude, longitude, latitude FROM boards_connected WHERE board_code = '" + board_id + "'", function(err,result){

		if(err != null){
		  logger.error("getBoardPosition: "+err);
		}
		callback(result);
	});
	
	disconn();
	
}




module.exports = db_utils;
