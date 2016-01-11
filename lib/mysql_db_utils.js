/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Andrea Rocco Lotronto, Nicola Peditto
*/
var mysql = require('mysql');

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

//Function to obtain the name and code of a generic plugin
db_utils.prototype.getPlugin = function(pluginId, callback){
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
        
        //console.log("pluginname = " + pluginname + " plugincategory = " + plugincategory + " plugincode = " + plugincode);
        
        connection.query("INSERT INTO plugins (id, name, category, jsonschema, code) VALUES (NULL, "+mysql.escape(pluginname)+" , "+mysql.escape(plugincategory)+" , "+mysql.escape(pluginjsonschema)+" , "+mysql.escape(plugincode)+")", function(err, result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
                callback(result);
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
	      console.log(err);
	      
	    } else {
	      plugin_id = result[0].id;
	      //console.log("the id is " + plugin_id);
	      connection.query("INSERT INTO plugins_injected (board_id, plugin_id, state) VALUES ('"+board+"','"+plugin_id+"', 'stop')", function(err, result){
		  if(err){
		    console.log(err);
		  } else {
		    //callback(result);
		    callback("plugin_id: " + plugin_id);
		  }
		  disconn();
	      });
	      
	    }
	    
        });
}


//Function to obtain the id of a plugin
db_utils.prototype.getPluginId = function(pluginName, callback){
	conn();

	connection.query("SELECT id FROM plugins WHERE name = '" + pluginName + "'", function(err,result){
		//console.log(err);
		if(err != null){
		  console.log(err);
		}
		callback(result);
	});
	disconn();
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
db_utils.prototype.regBoard = function(board, latitude, longitude, altitude, callback){
  
	conn();
		
        //check if the board already exists
	logger.info("--> Board ID check...");
        connection.query("SELECT code FROM board_codes WHERE code =  '" + board + "'", function(err, result){
	    
	    //logger.info("--> list size " + result.length);
	    if(result.length == 0){
	      
	      logger.info("--> Registering new board " + board + "...");
	      connection.query("INSERT INTO board_codes VALUES ('"+board+"', NOW() )", function(err, result2){

		if(err != null){
		  logger.error("--> Registration error in board_codes: "+ err);
		  callback("Registration error in board_codes table!");
		}
		else{
		  
		    connection.query("INSERT INTO user_boards VALUES ('',1,1,'"+board+"',1);", function(err, result3){
		      if(err != null){
			logger.error("--> Registration error in user_boards: "+ err);
			callback("Registration error in user_boards table!");
		      }
		      else{

			connection.query("INSERT INTO boards_connected (board_code, session_id, status, altitude, longitude, latitude) VALUES ('"+board+"','null','D', '"+altitude+"', '"+longitude+"', '"+latitude+"')", function(err, latest_result){
			  
			  if(err != null){
			    logger.error("--> Registration error in boards_connected: "+ err);
			    callback("Registration error in boards_connected table!");
			  }
			  else{
			    logger.info("--> Registration successfully completed!");
			    callback("Registration successfully completed!");
			    
			  }
			  
			});
			
		    
		      }
		      
		      disconn();
		      
		    });
		    
		}
	      });
	      
	      
	    }
	    else{
	      //logger.info("--> DB response: " + JSON.stringify(result) );
	      //board_id = result[0].code;
	      logger.warn("--> The board " + board + " already exists!");
	      callback("The board " + board + " already exists!");
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
	    
	    //logger.info("--> list size " + result.length);
	    if(result.length != 0){
	      
	      logger.info("--> Unegistering board " + board + "...");
	      connection.query("DELETE FROM user_boards WHERE board_code='"+board+"';", function(err, result2){

		if(err != null){
		  logger.error("--> Unregistration error in user_boards: "+ err);
		  callback("Unregistration error in user_boards table!");
		}
		else{
		  
		    connection.query("DELETE FROM board_codes WHERE code='"+board+"';", function(err, result3){
		    
		      if(err != null){
			logger.error("--> Unregistration error in board_codes: "+ err);
			callback("Unregistration error in board_codes table!");
		      }
		      else{

			connection.query("DELETE FROM boards_connected WHERE board_code='"+board+"';", function(err, latest_result){
			  
			  if(err != null){
			    logger.error("--> Unregistration error in boards_connected: "+ err);
			    callback("Registration error in boards_connected table!");
			  }
			  else{
			    logger.info("--> Unregistration successfully completed!");
			    callback("Unregistration successfully completed!");
			    
			  }
			  
			});
			
		    
		      }
		      
		      disconn();
		      
		    });
		    
		}
	      });
	      
	      
	    }
	    else{
	      //logger.info("--> DB response: " + JSON.stringify(result) );
	      //board_id = result[0].code;
	      logger.warn("--> The board " + board + " already exists!");
	      callback("The board " + board + " already exists!");
	      disconn();
	    }
            
        });
	
	
}


module.exports = db_utils;
