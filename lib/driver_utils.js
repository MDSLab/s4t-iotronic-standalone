/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2016 Nicola Peditto
*/


//service logging configuration: "driver_utils"   
var logger = log4js.getLogger('driver_utils');

var db_utils = require('./mysql_db_utils');
var db = new db_utils;

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



driver_utils.prototype.createDriver = function(drivername, driverjson, drivercode, res){
    
    
    var response = {
        message : 'Create Driver',
        result: {}
    }
    
    
    var drivers_folder = './drivers'
    var driver_path = drivers_folder + '/' + drivername;
    var fileNameDriver = driver_path + '/' + drivername + '.js';
    var fileNameSchema = driver_path + '/' + drivername + '.json';
    
    
    try{
 
    
	  fs.mkdir(driver_path, function() {


		db.insertCreatedDriver (drivername, fileNameSchema, fileNameDriver, function(result_db){
		  
		    if (result_db.result == "ERROR"){
		      result_creation = "DB write error: " + result_db.message
		      logger.error(result_creation); 
		      response.result = result_creation;
		      res.send(response);
		      
		    }else{
			  
			  fs.writeFile(fileNameDriver, drivercode, function(err) {
			    
			      if(err) {
				
				  result_creation = "Error during driver creation: " + err;
				  logger.error(response);
				  response.result = result_creation;
				  res.send(JSON.stringify(response));
				  
			      } else {
				
				  
				  
				  fs.writeFile(fileNameSchema, driverjson, function(err) {
				      if(err) {
					  result_creation = "Error during driver creation: " + err;
					  logger.error(result_creation);
					  response.result = result_creation;
					  res.send(JSON.stringify(response));
				      } else {
					  result_creation = "Driver " + drivername + " injected into Iotronic successfully"
					  logger.info(result_creation);
					  response.result = result_creation;
					  res.send(JSON.stringify(response));
				      }
				  });
				  

			  
			      }
			  });
		      
		      
		    }
		    
		});
	  
	    
	  });
    

    
    
    } catch (err) {
	response = "Error during driver creation: " + err;
	logger.error(response);
	res.send(JSON.stringify(response));
    }
    
    
    
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
