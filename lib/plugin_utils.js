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
	  
            var response = {
                message : 'Run Plugin',
                result: {}
            }
            
            if(pluginjson === ""){
	      logger.warn("WARNING - RUNNER PLUGIN \""+pluginname+"\" has not parameters!");
	    }
	    else{
		logger.info("RUNNER PLUGIN \""+pluginname+"\" CALLED with these parameters:\n "+ pluginjson);
		
		//I need to read the category of the plugin from the DB
		db.getPluginCategory(pluginname, function(data){
		    
		    var plugincategory = data[0].category;
		    logger.info("RUNNER PLUGIN CATEGORY: "+ plugincategory);
		    
		    if (plugincategory === "async"){
		    
			session_wamp.call(board+'.command.rpc.plugin.run', [pluginname, pluginjson]).then(
			    function(result){
				response.result = result;
				res.send(JSON.stringify(response));
				logger.info("RUN RESULT for \""+ pluginname +"\": " + result);
				
				//NEWDB
				db.updatePluginStatus (board, pluginname, "running", function(out){
				      logger.info(out);
				});
				
			    } , session_wamp.log);

		      
		    } else{
			result="Plugin category not supported!";
			response.result = result;
			res.send(JSON.stringify(response));
			logger.warn("RUN RESULT for \""+ pluginname +"\": " + result);    
		    }
		    
		});
	    
	    }
	    
            break


	    
	    
        case 'call':
	  
            var response = {
                message : 'Call Plugin',
                result: {}
            }
            
            if(pluginjson === ""){
	      logger.warn("WARNING - CALL PLUGIN \""+pluginname+"\" has not parameters!");
	    }
	    else{
		  logger.info("CALL PLUGIN \""+pluginname+"\" CALLED with these parameters:\n "+ pluginjson);
		  
		  
		  //I need to read the category of the plugin from the DB
		  db.getPluginCategory(pluginname, function(data){
		    
		      var plugincategory = data[0].category;  
		      logger.info("CALL PLUGIN CATEGORY: "+ plugincategory);
		      
		      if (plugincategory === "sync"){
			
			  session_wamp.call(board+'.command.rpc.plugin.call', [pluginname, pluginjson], {}, {receive_progress: true}).then(
			    
			      function(result){
				  response.result = result;
				  res.send(JSON.stringify(response));
				  logger.info("COMMAND \""+ pluginname +"\" RESPONSE: " + JSON.stringify(result));
				  
				  //NEWDB
				  db.updatePluginStatus (board, pluginname, "executed", function(out){
					logger.info(out);
				  });
				  
			      },
			      function (error) {
				  logger.error("COMMAND \""+ pluginname +"\" ERROR: "+ JSON.stringify(error));
				  
				  //NEWDB
				  db.updatePluginStatus (board, pluginname, "failed", function(out){
					logger.error(out);
				  });
				 
			      },
			      function (progress) {
				  logger.info("COMMAND \""+ pluginname +"\" PROGRESS: "+ JSON.stringify(progress));
			      } 
													    
			    
			  );
			
		      } else{
			  result="Command category not supported!";
			  response.result = result;
			  res.send(JSON.stringify(response));
			  logger.warn("RUN RESULT for \""+ pluginname +"\": " + result);
		      }
		  });
		  
		  
	    }
	    
	    break
	    
	    
	    
        case 'kill':
            var response = {
                message : 'Kill Plugin',
                result: {}
            }
            
            session_wamp.call(board+'.command.rpc.plugin.kill', [pluginname]).then(
                function(result){
                    response.result = result;
                    res.send(JSON.stringify(response));
		    logger.info("KILL RESULT for \""+ pluginname +"\": " + result);
		    
		    //NEWDB
		    db.updatePluginStatus (board, pluginname, "killed", function(out){
			  logger.info(out);
		    });
		    
		    
		    
                } , session_wamp.log);
            
            break
            
        default:
            
    }
    
}

plugin_utils.prototype.createPlugin = function(pluginname, plugincategory, pluginjsonschema, plugincode, res){
    
    var fs = require('fs');
    
    var response = {
        message : 'Create Plugin',
        result: {}
    }
    
    var fileNamePlugin = './plugins/' + pluginname + '.js';
    var fileNameSchema = './schemas/' + pluginname + '.json';
    
    db.insertCreatedPlugin (pluginname, plugincategory, fileNameSchema, fileNamePlugin, function(result_db){
      
	if (result_db.result == "ERROR"){
	  logger.error("DB write error: " + result_db.message); 
	  response.result = result_db.message;
	  res.send(response);
	  
	}else{
	  
	  logger.info("pluginname = " + pluginname + " plugincategory = " + plugincategory + " pluginjsonschema = " + pluginjsonschema + " plugincode = " + plugincode);
    
	  
	  fs.writeFile(fileNamePlugin, plugincode, function(err) {
	      if(err) {
		  logger.error(err);
	      } else {
		  logger.info("Plugin " + fileNamePlugin + " injected successfully");
	      }
	  });
	  
	  
	  fs.writeFile(fileNameSchema, pluginjsonschema, function(err) {
	      if(err) {
		  logger.error(err);
	      } else {
		  logger.info("Schema " + fileNameSchema + " injected successfully");
	      }
	  });
    
	  logger.info("DB written successfully: " + JSON.stringify(result_db.message) ); 
	  response.result = result_db;
	  res.send(JSON.stringify(response));
	  
	}
	
    });
    
}
        
plugin_utils.prototype.injectPlugin = function(board, pluginname, autostart, res){
    
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
	  
	  response.result = "Plugin does not exist!";
	  res.send(JSON.stringify(response));
	  logger.warn("Plugin does not exist!");
	  
	}
	else{
	  
	      pluginId = data[0].id;

		  
		  pluginName = data[0].name;
		  pluginFileName = data[0].code;
		  
		  var fs = require('fs');
		  
		  fs.readFile(pluginFileName, 'utf8', function(err, data) {
		    
		      if(err) {
			  logger.info(err);
			  
		      } else {
			
			  logger.info("Plugin " + pluginFileName + " read successfully");
			  
			  var pluginCode = data;
			  
			  logger.info('Calling injectplugin with name = ' + pluginName +" autostart = "+ autostart +" code = " + pluginCode);
			  
			  //Now I can perform the RPC call
			  session_wamp.call(board+'.command.rpc.injectplugin', [pluginName, pluginCode, autostart]).then(
			    
			      function(result){
				
				  //NEWDB
				  db.getInjectedPlugin( pluginId, board, function(data_p){
				    
				      if (data_p[0] === undefined){
					  //Now I can write to the DB that the plugin has been injected
					  db.insertInjectedPlugin (board, pluginName, function(out){
					      logger.info("INJECT RESULT of "+ pluginName +": "+result + " ("+out+")");
					      response.result = result;
					      res.send(JSON.stringify(response));
					  });
					
				      }else{
					  //NEWDB
					  db.updatePluginStatus (board, pluginName, "injected", function(out){
						logger.info(out);
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
    
    logger.info('REMOVING plugin ' + pluginname +" ...");
    
    var response = {
        message : 'Remove Plugin',
        result: {}
    }
    
    var pluginId;
    var pluginName;
    var pluginFileName;
    
    db.getPlugin(pluginname, function(data){
        
	if (data[0] === undefined){
	  
	  response.result = "Plugin does not exist!";
	  res.send(JSON.stringify(response));
	  logger.warn("Plugin does not exist!");
	  
	}
	else{
	  
	      pluginId = data[0].id;
	      pluginName = data[0].name;
	      pluginFileName = data[0].code;
	      
	      //Now I can perform the RPC call
	      session_wamp.call(board+'.command.rpc.removeplugin', [pluginName]).then(
		
		  function(result){
		    
		    if(result === "Plugin files not found!"){
		      result = "No plugin in the selected board -> DB updated!";
		    }else{
		      
		    }
		      db.deleteInjectedPlugin(board, pluginId, function(data_p){

			    result = "--> DELETE RESULT of "+ pluginName +": "+result;
			    logger.info(result);
			    response.result = result;
			    res.send(JSON.stringify(response));
	
		      });
		      
  
		} , session_wamp.log);
		      

	
	}
    });
}


plugin_utils.prototype.destroyPlugin = function(pluginname, res){
  
    logger.info("Calling destroyPlugin with pluginname = " + pluginname);
    
    var response = {
        message : 'Destroy Plugin',
        result: {}
    }

    
    db.getPlugin(pluginname, function(data){
        
	if (data[0] === undefined){
	  
	  delete_response = "Plugin "+pluginname+" does not exist!"
	  logger.warn("--> "+delete_response);
	  response.result = delete_response;
	  res.send(JSON.stringify(response));
	  
	}
	else{
	  
		var fileNamePlugin = './plugins/' + pluginname + '.js';
		var fileNameSchema = './schemas/' + pluginname + '.json';
		
		
		db.deletePlugin (pluginname, function(result_db){
		  
		    if (result_db.result == "ERROR"){
		      
		      logger.error("Delete DB error: " + result_db.message); 
		      response.result = result_db.message;
		      res.send(response);
		      
		    }else{
		      

		    
		      logger.info('--> File '+fileNamePlugin+' deleting...');
		      
		      fs.unlink(fileNamePlugin, function(err) {
			
			    if(err) {
				  delete_response = "--> Plugin code "+fileNamePlugin+" removing FAILED: "+err;
				  logger.warn(delete_response);
				 
			    }
			    else{
			      
			      logger.info("--> " + fileNamePlugin + " successfully deleted!");	
			      
			    }
			    
			    
			    logger.info('--> File '+fileNameSchema+' deleting...');
		    
			    fs.unlink(fileNameSchema, function(err) {
			      
				  if(err) {
				      delete_response = "--> Plugin schema "+fileNameSchema+" removing FAILED: "+err;
				      logger.warn(delete_response);
				  }
				  else{

				      logger.info("--> " + fileNameSchema + " successfully deleted!");
				      
				  }
				  
				  delete_response = "Plugin "+pluginname+" successfully destroyed!";
				  logger.info("--> " + delete_response);
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
