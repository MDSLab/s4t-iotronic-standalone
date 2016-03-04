/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2016 Nicola Peditto
*/


//service logging configuration: "driver_utils"   
var logger = log4js.getLogger('driver_utils');

//var db_utils = require('./mysql_db_utils');
//var db = new db_utils;
var fs = require('fs');

var session_wamp;

driver_utils = function(session){
  session_wamp = session;
};


//driver_utils.prototype.manageDrivers = function(board, drivername, driverjson, driveroperation, res){
driver_utils.prototype.manageDrivers = function(board, drivername, driveroperation, res){
    
    switch(driveroperation){
    
        case 'mount':
	  
            var response = {
                message : 'Driver mounting',
                result: {}
            }
 
	    logger.info("RPC call to mount driver \""+drivername+"\"...");

		
	    session_wamp.call('s4t.'+board+'.driver.mountDriver', [drivername]).then(
		function(result){
		    response.result = result;
		    res.send(JSON.stringify(response));
		    logger.info("Driver mount result for \""+ drivername +"\": " + result);
		    
		}
	    );
		  
		  
            /*
            if(driverjson === ""){
	      logger.warn("WARNING - DRIVER \""+drivername+"\" has not input parameters specified!");
	    }
	    else{
	      
		  logger.info("DRIVER \""+drivername+"\" MOUNTED with these parameters:\n "+ driverjson);

		      
		  session_wamp.call('s4t.'+board+'.driver.mountDriver', [drivername, driverjson]).then(
		      function(result){
			  response.result = result;
			  res.send(JSON.stringify(response));
			  logger.info("Driver mount result for \""+ drivername +"\": " + result);
			  
		      }
		  );

	
	    
	    }
	    */
	    
            break


	    
	
	    
        case 'unmount':
	  
            var response = {
                message : 'Driver unmounting',
                result: {}
            }
 
	    logger.info("RPC call to unmount driver \""+drivername+"\"...");
            
            session_wamp.call('s4t.'+board+'.driver.unmountDriver', [drivername]).then(
                function(result){
                    response.result = result;
                    res.send(JSON.stringify(response));
		    logger.info("Driver unmount result for \""+ drivername +"\": " + result);
		    
                } 
	    );
            
            break
            
        default:
            
    }
    
}

driver_utils.prototype.createDriver = function(pluginname, plugincategory, pluginjsonschema, plugincode, res){
    
    
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


        
driver_utils.prototype.injectDriver = function(board, pluginname, autostart, res){
    
    var response = {
        message : 'Inject Plugin',
        result: {}
    }
    
    var pluginId;
    var pluginName;
    var pluginFileName;
    
    //I need to read the name of the plugin from the DB
    db.getPluginId(pluginname, function(data){
        
	
	if (data[0] === undefined){
	  
	  response.result = "Plugin does not exist!";
	  res.send(JSON.stringify(response));
	  logger.warn("Plugin does not exist!");
	  
	}
	else{
	  
	      pluginId = data[0].id;
        
	      //Then I can read the path of the code of the plugin from the DB
	      db.getPlugin(pluginId, function(data){
		  
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
					  });
				      }
				      
				  });
				  
				  
				  
			    } , session_wamp.log);
			  
			  
		      }
		  });
	      });
	
	}
    });
}


module.exports = driver_utils;
