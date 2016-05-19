/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Francesco Longo, Nicola Peditto
*/

//service logging configuration: "plugin_utils"   
//var logger = log4js.getLogger('plugin_utils');


//service logging configuration: "plugin_utils"   
var logger = log4js.getLogger('plugin_utils');
logger.setLevel(loglevel);

var db_utils = require('./mysql_db_utils');
var db = new db_utils;

var session_wamp;

plugin_utils = function(session){
  session_wamp = session;
};

var fs = require('fs');


plugin_utils.prototype.managePlugins = function(board, pluginname, pluginjson, pluginoperation, res){
    
    switch(pluginoperation){
    
        case 'run':
	  
	    logger.info("[PLUGIN] - STARTING ASYNC PLUGIN \""+pluginname+"\"...");
	    
            var response = {
                message : 'Run Plugin',
                result: {}
            }
            
            if(pluginjson === ""){
	      logger.warn("[PLUGIN] --> WARNING - ASYNC (RUNNER) PLUGIN \""+pluginname+"\" has not parameters!");
	    }
	    else{
	      
		logger.info("[PLUGIN] --> Plugin \""+pluginname+"\" parameters:\n "+ pluginjson);
		
		//I need to read the category of the plugin from the DB
		db.getPluginCategory(pluginname, function(data){
		    
		    var plugincategory = data[0].category;
		    logger.info("[PLUGIN] --> Plugin category: "+ plugincategory);
		    
		    if (plugincategory === "async"){
		    
			session_wamp.call(board+'.command.rpc.plugin.run', [pluginname, pluginjson]).then(
			    function(result){
				response.result = result;
				res.send(JSON.stringify(response));
				logger.info("[PLUGIN] --> RUNNING RESULT for \""+ pluginname +"\": " + result);
				
				db.updatePluginStatus (board, pluginname, "running", function(out){
				      logger.info("[PLUGIN] --> EXECUTION RESULT: "+out);
				});
				
			    } , session_wamp.log);

		      
		    } else{
			result="Plugin category not supported!";
			response.result = result;
			res.send(JSON.stringify(response));  
			logger.warn("[PLUGIN] --> PLUGIN \""+ pluginname +"\" EXECUTION RESULT: " + result);
		    }
		    
		});
	    
	    }
	    
            break


	    
	    
        case 'call':
	  
	    logger.info("[PLUGIN] - STARTING SYNC PLUGIN \""+pluginname+"\"...");
	    
            var response = {
                message : 'Call Plugin',
                result: {}
            }
            
            if(pluginjson === ""){
	      logger.warn("[PLUGIN] --> WARNING - SYNC (CALL) PLUGIN \""+pluginname+"\" has not parameters!");
	    }
	    else{
	      
		  logger.info("[PLUGIN] --> Plugin \""+pluginname+"\" parameters:\n "+ pluginjson);		  
		  
		  //I need to read the category of the plugin from the DB
		  db.getPluginCategory(pluginname, function(data){
		    
		      var plugincategory = data[0].category;  
		      logger.info("[PLUGIN] --> Plugin category: "+ plugincategory);
		      
		      if (plugincategory === "sync"){
			
			  session_wamp.call(board+'.command.rpc.plugin.call', [pluginname, pluginjson], {}, {receive_progress: true}).then(
			    
			      function(result){
				  response.result = result;
				  res.send(JSON.stringify(response));
				  logger.info("[PLUGIN] --> Plugin \""+ pluginname +"\" response: " + JSON.stringify(result));
				  
				  //NEWDB
				  db.updatePluginStatus (board, pluginname, "executed", function(out){
					logger.info("[PLUGIN] --> EXECUTION RESULT: "+out);
				  });
				  
			      },
			      function (error) {
				  logger.error("[PLUGIN] --> Plugin \""+ pluginname +"\" error: "+ JSON.stringify(error));
				  
				  //NEWDB
				  db.updatePluginStatus (board, pluginname, "failed", function(out){
					logger.error("[PLUGIN] --> EXECUTION RESULT: "+out);
				  });
				 
			      },
			      function (progress) {
				  logger.info("[PLUGIN] --> Plugin \""+ pluginname +"\" progress: "+ JSON.stringify(progress));
			      } 
													    
			    
			  );
			
		      } else{
			  result="Command category not supported!";
			  response.result = result;
			  res.send(JSON.stringify(response));
			  logger.warn("[PLUGIN] --> PLUGIN \""+ pluginname +"\" EXECUTION RESULT: " + result);
		      }
		  });
		  
		  
	    }
	    
	    break
	    
	    
	    
        case 'kill':
	  
	    logger.info("[PLUGIN] - KILLING PLUGIN \""+pluginname+"\"...");
	    
            var response = {
                message : 'Kill Plugin',
                result: {}
            }
            
            session_wamp.call(board+'.command.rpc.plugin.kill', [pluginname]).then(
                function(result){
                    response.result = result;
                    res.send(JSON.stringify(response));
		    logger.info("[PLUGIN] --> KILL RESULT for \""+ pluginname +"\": " + result);
		    
		    //NEWDB
		    db.updatePluginStatus (board, pluginname, "killed", function(out){
			  logger.info("[PLUGIN] --> "+out);
		    });
		    
		    
		    
                } , session_wamp.log);
            
            break
            
        default:
            
    }
    
}

plugin_utils.prototype.createPlugin = function(pluginname, plugincategory, pluginjsonschema, plugincode, res){
    
    logger.info("[PLUGIN] - CREATING plugin "+pluginname+"...");
    
    var fs = require('fs');
    
    var response = {
        message : 'Create Plugin',
        result: {}
    }
    
    var fileNamePlugin = './plugins/' + pluginname + '.js';
    var fileNameSchema = './schemas/' + pluginname + '.json';
    
    db.insertCreatedPlugin (pluginname, plugincategory, fileNameSchema, fileNamePlugin, function(result_db){
      
	if (result_db.result == "ERROR"){
	  logger.error("[PLUGIN] --> createPlugin - DB write error: " + result_db.message); 
	  response.result = result_db.message;
	  res.send(response);
	  
	}else{
	  
	  logger.debug("[PLUGIN] --> DB successfully updated: " + JSON.stringify(result_db.message) ); 
    
	  
	  fs.writeFile(fileNamePlugin, plugincode, function(err) {
	      if(err) {
		  logger.error("[PLUGIN] --> Error writing plugin "+pluginname+" code: "+err);
	      } else {
		  logger.debug("[PLUGIN] --> Plugin " + fileNamePlugin + " successfully created!");
	      }
	  });
	  
	  
	  fs.writeFile(fileNameSchema, pluginjsonschema, function(err) {
	      if(err) {
		  logger.error("[PLUGIN] --> Error writing plugin "+pluginname+" conf: "+err);
	      } else {
		  logger.debug("[PLUGIN] --> Schema " + fileNameSchema + " successfully created!");
		  logger.info("[PLUGIN] --> Plugin " + pluginname + " successfully created in Iotronic!" ); 
	      }
	  });
    
	  
	  response.result = result_db;
	  res.send(JSON.stringify(response));
	  
	}
	
    });
    
}
        
plugin_utils.prototype.injectPlugin = function(board, pluginname, autostart, res){
  
    logger.info("[PLUGIN] - Injecting plugin "+pluginname+" into the board "+board+"...");
    
    var response = {
        message : 'Inject Plugin',
        result: {}
    }
    
    var pluginId;
    var pluginName;
    var pluginFileName;
    
    //I need to read the name of the plugin from the DB
    db.getPlugin(pluginname, function(data){
        
	
	if (data[0] === undefined){
	  
	  response.result = "Plugin does not exist in Iotronic!";
	  res.send(JSON.stringify(response));
	  logger.warn("[PLUGIN] --> "+response.result);
	  
	}
	else{
	  
		  pluginId = data[0].id;

		  
		  pluginName = data[0].name;
		  pluginFileName = data[0].code;
		  
		  var fs = require('fs');
		  
		  fs.readFile(pluginFileName, 'utf8', function(err, data) {
		    
		      if(err) {
			  logger.warn("[PLUGIN] --> Error reading "+pluginFileName+": "+err);
			  
		      } else {
			
			  logger.debug("[PLUGIN] --> Plugin " + pluginFileName + " read successfully");
			  
			  var pluginCode = data;
			  
			  logger.debug('[PLUGIN] --> Calling injectplugin with name = ' + pluginName +" autostart = "+ autostart +" code = " + pluginCode);
			  
			  //Now I can perform the RPC call
			  session_wamp.call(board+'.command.rpc.injectplugin', [pluginName, pluginCode, autostart]).then(
			    
			      function(result){
				
				  //NEWDB
				  db.getInjectedPlugin( pluginId, board, function(data_p){
				    
				      if (data_p[0] === undefined){
					  //Now I can write to the DB that the plugin has been injected
					  db.insertInjectedPlugin (board, pluginName, function(out){
					      logger.info("[PLUGIN] --> INJECT RESULT of "+ pluginName +": "+result + " ("+out+")");
					      response.result = result;
					      res.send(JSON.stringify(response));
					  });
					
				      }else{
					  //NEWDB
					  db.updatePluginStatus (board, pluginName, "injected", function(out){
						logger.info("[PLUGIN] --> "+out);
						response.result = result;
						res.send(JSON.stringify(response));
					  });
				      }
				      
				  });
				  
				  
				  
			    } , session_wamp.log);
			  
			  
		      }
		  });
	   
	
	}
    });
}



plugin_utils.prototype.removePlugin = function(board, pluginname, res){
    
    logger.info('[PLUGIN] - REMOVING plugin ' + pluginname +" from board "+board);
    
    var response = {
        message : 'Remove Plugin',
        result: {}
    }
    
    var pluginId;
    var pluginName;
    var pluginFileName;
    
    db.getPlugin(pluginname, function(data){
        
	if (data[0] === undefined){
	  
	  response.result = "Plugin does not exist in Iotronic!";
	  res.send(JSON.stringify(response));
	  logger.warn("[PLUGIN] --> "+response.result);
	  
	}
	else{
	  
	      pluginId = data[0].id;
	      pluginName = data[0].name;
	      
	      //Now I can perform the RPC call
	      session_wamp.call(board+'.command.rpc.removeplugin', [pluginName]).then(
		
		  function(result){
		    
		    if(result === "Plugin files not found!"){
		      
		      result = "No plugin in the selected board -> DB updated!";
		      
		    }else{
		      
			db.deleteInjectedPlugin(board, pluginId, function(data_p){

			      result = "DELETE RESULT: "+ pluginName +": "+result;
			      logger.info("[PLUGIN] --> "+result);
			      response.result = result;
			      res.send(JSON.stringify(response));
	  
			});
		      
		    }

		      
  
		} , session_wamp.log);
		      

	
	}
    });
}


plugin_utils.prototype.destroyPlugin = function(pluginname, res){
  
    logger.info("[PLUGIN] - REMOVING plugin "+pluginname+" from Iotronic...");
    //logger.info("Calling destroyPlugin with pluginname = " + pluginname);
    
    var response = {
        message : 'Destroy Plugin',
        result: {}
    }

    
    db.getPlugin(pluginname, function(data){
        
	if (data[0] === undefined){
	  
	  delete_response = "Plugin "+pluginname+" does not exist!"
	  logger.warn("[PLUGIN] --> "+delete_response);
	  response.result = delete_response;
	  res.send(JSON.stringify(response));
	  
	}
	else{
	  
		var fileNamePlugin = './plugins/' + pluginname + '.js';
		var fileNameSchema = './schemas/' + pluginname + '.json';
		
		
		db.deletePlugin (pluginname, function(result_db){
		  
		    if (result_db.result == "ERROR"){
		      
		      logger.warn("[PLUGIN] --> Delete DB error: " + result_db.message); 
		      response.result = result_db.message;
		      res.send(response);
		      
		    }else{
		      

		    
		      //logger.debug('[PLUGIN] --> File '+fileNamePlugin+' deleting...');
		      
		      fs.unlink(fileNamePlugin, function(err) {
			
			    if(err) {
				  delete_response = "Plugin code "+fileNamePlugin+" removing FAILED: "+err;
				  logger.warn("[PLUGIN] --> "+delete_response);
				 
			    }
			    else{
			      
			      logger.debug("[PLUGIN] --> " + fileNamePlugin + " successfully deleted!");	
			      
			    }
			    
			    
			    //logger.info('[PLUGIN] --> File '+fileNameSchema+' deleting...');
		    
			    fs.unlink(fileNameSchema, function(err) {
			      
				  if(err) {
				      delete_response = "Plugin schema "+fileNameSchema+" removing FAILED: "+err;
				      logger.warn("[PLUGIN] --> "+delete_response);
				  }
				  else{

				      logger.debug("[PLUGIN] --> " + fileNameSchema + " successfully deleted!");
				      logger.info("[PLUGIN] --> Plugin "+pluginname+" successfully removed from Iotronic!");
				      
				  }
				  
				  delete_response = "Plugin "+pluginname+" successfully removed from Iotronic!!";
				  response.result = delete_response;
				  res.send(JSON.stringify(response));	
						  
			    });	
			    
		    
			    
			    

		      });

		      
		    }
		    
		});
		
		
	}
	
    });
    
}


module.exports = plugin_utils;
