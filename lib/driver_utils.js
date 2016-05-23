/*
				  Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2016 Nicola Peditto

*/


//service logging configuration: "driver_utils"   
var logger = log4js.getLogger('driver_utils');
logger.setLevel(loglevel);

var db_utils = require('./mysql_db_utils');
var db = new db_utils;

var fs = require('fs');

var session_wamp;

driver_utils = function(session){
  session_wamp = session;
};


//driver_utils.manageDrivers(board, drivername, driveroperation, driver_exp_filename, remote, mirror_board, res);
driver_utils.prototype.manageDrivers = function(board, drivername, driveroperation, filename, remote, mirror_board, res){
  
    var response = {
        message : '',
        result: {}
    }
    
    
    switch(driveroperation){
    
        case 'mount':
 
	    logger.info("[DRIVER] - MOUNTING driver \""+drivername+"\" into the board "+board+"...");
	    
	    //I need to read the name of the driver from the DB
	    db.getDriverId(drivername, function(data){        
		
		if (data[0] === undefined){
		  
		  result_db = "Driver "+drivername+" does not exist!";
		  response.message = result_db;
		  response.result = "WARNING";
		  res.send(JSON.stringify(response));
		  logger.warn("[DRIVER] --> "+result_db);
		  
		}else{
		  
		      driverId = data[0].id;
		      
		      db.getInjectedDriver( driverId, board, function(data_p){
	      
			  if (data_p[0] === undefined){
			    
			      result_db = "Driver mounting failed: "+drivername+" is not injected!";
			      response.message = result_db;
			      response.result = "WARNING";
			      res.send(JSON.stringify(response));
			      logger.warn("[DRIVER] --> "+result_db);
		  
			  }else{
			    
			      var driverState = data_p[0].state;
			      
			      if (driverState != "mounted"){
				
				    if(remote === undefined || remote === null) remote = false;
				
				    session_wamp.call('s4t.'+board+'.driver.mountDriver', [drivername, filename, remote, mirror_board]).then(
				      
					function(driver_result){
					  
					    if(driver_result.result === "SUCCESS"){
						db.updateDriverStatus (board, drivername, "mounted", function(out){
						    logger.debug("[DRIVER] --> Update driver status result for "+ drivername +": "+out);
						    res.send(JSON.stringify(driver_result));
						    logger.info("[DRIVER] --> Driver mount result for \""+ drivername +"\": " + JSON.stringify(driver_result.result) + " - " + JSON.stringify(driver_result.message) );
						});
					    }else{
					      
						res.send(JSON.stringify(driver_result));
						logger.info("[DRIVER] --> Driver mount result for \""+ drivername +"\": " + JSON.stringify(driver_result.result) + " - " + JSON.stringify(driver_result.message) );					    
					    }

					}
				    );			
				
			      }else{
				
				  result_db = "Driver "+drivername+" is already mounted!";
				  response.message = result_db;
				  response.result = "WARNING";
				  res.send(JSON.stringify(response));
				  logger.warn("[DRIVER] --> "+result_db);
			      
			      }
			      
			      
			  }
			  
		      });
		      
		}
	    });
	    
	    
            break


	    
	
	    
        case 'unmount':

	    logger.info("[DRIVER] - UNMOUNTING driver \""+drivername+"\" from the board "+board+"...");

	    //I need to read the name of the driver from the DB
	    db.getDriverId(drivername, function(data){        
		
		if (data[0] === undefined){
		  
		  result_db = "Driver "+drivername+" does not exist!";
		  response.message = result_db;
		  response.result = "WARNING";
		  res.send(JSON.stringify(response));
		  logger.warn("[DRIVER] --> "+result_db);
		  
		}else{
		  
		      driverId = data[0].id;
		      
		      db.getInjectedDriver( driverId, board, function(data_p){
	      
			  if (data_p[0] === undefined){
			    
			      result_db = "Driver unmounting failed: "+drivername+" is not injected!";
			      response.message = result_db;
			      response.result = "WARNING";
			      res.send(JSON.stringify(response));
			      logger.warn("[DRIVER] --> "+result_db);
		  
			  }else{
			    
			      var driverState = data_p[0].state;
			      
			      if (driverState === "mounted"){
				
				  session_wamp.call('s4t.'+board+'.driver.unmountDriver', [drivername]).then(
				    
				      function(driver_result){
					  
					  if(driver_result.result === "SUCCESS"){
					      db.updateDriverStatus (board, drivername, "unmounted", function(out){
						logger.debug("[DRIVER] --> Update driver status result for "+ drivername +": "+out);
						res.send(JSON.stringify(driver_result));
						logger.info("[DRIVER] --> Driver unmount for \""+ drivername +"\": " + JSON.stringify(driver_result.result) + " - " + JSON.stringify(driver_result.message) );
					      });
					  } else{
					      res.send(JSON.stringify(driver_result));
					      logger.info("[DRIVER] --> Driver unmount for \""+ drivername +"\": " + JSON.stringify(driver_result.result) + " - " + JSON.stringify(driver_result.message) );
					  }
					  
				      } 
				  );		
				
			      }else{
				
				  result_db = "Driver "+drivername+" is not mounted!";
				  response.message = result_db;
				  response.result = "WARNING";
				  res.send(JSON.stringify(response));
				  logger.warn("[DRIVER] --> "+result_db);
			      
			      }
			      
			      
			  }
			  
		      });
		      
		}
	    });
	    	    
	    
	    
	    
	    
	    
	    
	    
	    
            
            break
            
        default:
            
    }
    
}



driver_utils.prototype.createDriver = function(drivername, driverjson, drivercode, res){
    
    logger.info("[DRIVER] - Inserting new driver "+drivername+" in Iotronic...");
    
    var response = {
        message : 'Create Driver',
        result: {}
    }
    
    var result_db;

    db.getDriverId(drivername, function(data){
        
	if (data[0] === undefined){
	  
	      try{
		
		    var drivers_folder = './drivers'
		    var driver_path = drivers_folder + '/' + drivername;
		    var fileNameDriver = driver_path + '/' + drivername + '.js';
		    var fileNameSchema = driver_path + '/' + drivername + '.json';
   
		    logger.debug("[DRIVER] --> drivername = " + drivername + "\n driverjson = " + driverjson + "\n\n drivercode = " + drivercode);
	
		    fs.mkdir(driver_path, function() {

			  db.insertCreatedDriver (drivername, fileNameSchema, fileNameDriver, function(response_db){
			    
			      if (response_db.result == "ERROR"){
				result_creation = "DB write error: " + response_db.message
				logger.error("[DRIVER] --> "+result_creation); 
				response.result = result_creation;
				res.send(response);
				
			      }else{
				    
				    fs.writeFile(fileNameDriver, drivercode, function(err) {
				      
					if(err) {
					  
					    result_creation = "Error during driver creation: " + err;
					    logger.error("[DRIVER] --> "+response);
					    response.result = result_creation;
					    res.send(JSON.stringify(response));
					    
					} else {
					  
					    
					    
					    fs.writeFile(fileNameSchema, driverjson, function(err) {
						if(err) {
						    result_creation = "Error during driver creation: " + err;
						    logger.error("[DRIVER] --> "+result_creation);
						    response.result = result_creation;
						    res.send(JSON.stringify(response));
						} else {
						    result_creation = "Driver " + drivername + " injected into Iotronic successfully"
						    logger.info("[DRIVER] --> "+result_creation);
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
		  result_db = "Error during driver creation: " + err;
		  logger.error("[DRIVER] --> "+result_db);
		  response.result = result_db;
		  res.send(JSON.stringify(response));
	      }	  
	  

	  
	  
	}else{
	  
	  result_db = "Driver creation failed: "+drivername+" already exists!";
	  response.result = result_db;
	  res.send(JSON.stringify(response));
	  logger.warn("[DRIVER] --> "+result_db);	  
	  
	  
	}
	
    });


    
    

    
    
    
}


driver_utils.prototype.writeRemoteFile = function(board, drivername, filename, filecontent, res){
  
    logger.info("[DRIVER] - Remote file writing: "+drivername+"["+filename+"] of the board "+board);
    
    var response = {
        message : 'Write remote file',
        result: {}
    }
    
    var driverId;
    var driverName;
    var driverFileName;
    var result_db;
    
    //I need to read the name of the driver from the DB
    db.getDriverId(drivername, function(data){        
	
	if (data[0] === undefined){
	  
	  result_db = "Driver "+drivername+" does not exist!";
	  response.result = result_db;
	  res.send(JSON.stringify(response));
	  logger.warn("[DRIVER] --> "+result_db);
	  
	}else{
	  
	      driverId = data[0].id;  
	      db.getInjectedDriver( driverId, board, function(data_p){
      
		  if (data_p[0] === undefined){
		      result_db = "The driver "+drivername+" is not injected in the board "+board+" !";
		      response.result = result_db;
		      res.send(JSON.stringify(response));
		      logger.warn("[DRIVER] --> "+result_db);

		  }else{

		      logger.debug("[DRIVER] --> RPC call to write a remote file "+drivername+"["+filename+"] ...");

		      session_wamp.call('s4t.'+board+'.driver.'+drivername+'.'+filename+'.write', [drivername, filename, filecontent]).then(
			
			  function(result){
			      response.result = {"driver":drivername, "file":filename, "response":result};
			      res.send(JSON.stringify(response));
			      logger.info("[DRIVER] --> Remote file writing result "+drivername+"["+filename+"] : " + result);
			           
			      
			  },
			  function (error) {
			      // call failed
			      var error_log = "ERROR: " + error["error"]			      
			      response.result = {"driver":drivername, "file":filename, "response":error_log};
			      res.send(JSON.stringify(response));
			      logger.warn('[DRIVER] --> Remote file writing failed! - Error: '+ JSON.stringify(error));
			  }
	    
		      );
		
		      
		    
		  }		  
		  
	      });
	      
	      
	}
    });
  
}
     
     
     
     


driver_utils.prototype.readRemoteFile = function(board, drivername, filename, res){

    logger.info("[DRIVER] - Remote file reading: "+drivername+"["+filename+"] from board "+board);
    
    var response = {
        message : 'Read remote file',
        result: {}
    }
    
    var driverId;
    var driverName;
    var driverFileName;
    var result_db;

      
    //I need to read the name of the driver from the DB
    db.getDriverId(drivername, function(data){        
	
	if (data[0] === undefined){
	  
	  result_db = "Driver "+drivername+" does not exist!";
	  response.result = result_db;
	  res.send(JSON.stringify(response));
	  logger.warn("[DRIVER] --> "+result_db);
	  
	}else{
	  
	      driverId = data[0].id;  
	      db.getInjectedDriver( driverId, board, function(data_p){
      
		  if (data_p[0] === undefined){
		      result_db = "The driver "+drivername+" is not injected in the board "+board+" !";
		      response.result = result_db;
		      res.send(JSON.stringify(response));
		      logger.warn("[DRIVER] --> "+result_db);

		  }else{

		      logger.debug("[DRIVER] --> RPC call to read a remote file "+drivername+"["+filename+"] ...");

		      session_wamp.call('s4t.'+board+'.driver.'+drivername+'.'+filename+'.read', [drivername, filename]).then(
			
			  function(result){
			      response.result = {"driver":drivername, "file":filename, "value":result};
			      res.send(JSON.stringify(response));
			      logger.info("[DRIVER] --> Remote file reading result "+drivername+"["+filename+"] : " + result);
			           
			      
			  },
			  function (error) {
			      // call failed
			      var error_log = "ERROR: " + error["error"]			      
			      response.result = {"driver":drivername, "file":filename, "response":error_log};
			      res.send(JSON.stringify(response));
			      logger.warn('[DRIVER] --> Remote file reading failed! - Error: '+ JSON.stringify(error));
			  }
	    
		      );
		
		      
		    
		  }		  
		  
	      });
	      
	      
	}
    });
  
}
        
        
        
driver_utils.prototype.injectDriver = function(board, drivername, autostart, res){
    
    logger.info("[DRIVER] - INJECTING " + drivername + " driver into the board " +board+ "...");
  
    var response = {
        message : 'Inject driver',
        result: {}
    }
    
    var driverId;
    var driverName;
    var driverFileName;
    var result_db;

      
    //I need to read the name of the driver from the DB
    db.getDriverId(drivername, function(data){        
	
	if (data[0] === undefined){
	  
	  result_db = "Driver "+drivername+" does not exist!";
	  response.result = result_db;
	  res.send(JSON.stringify(response));
	  logger.warn("[DRIVER] --> "+result_db);
	  
	}else{
	  
	      driverId = data[0].id;
	      
	      db.getInjectedDriver( driverId, board, function(data_p){
      
		  if (data_p[0] === undefined){
		    
		    
		      //Then I can read the path of the driver code from the DB
		      db.getDriver(driverId, function(data){
		  
			      driverName = data[0].name;
			      driverFileName = data[0].code;
			      driverSchemaName = data[0].jsonschema;
			      
			      var fs = require('fs');
			      
			      fs.readFile(driverFileName, 'utf8', function(err, code_data) {
				
				  if(err) {
				    
				      result_db = "Driver code file decoding error: " + err;
				      response.result = result_db;
				      res.send(JSON.stringify(response));
				      logger.error("[DRIVER] --> "+result_db);
				      
				  } else {
				    
				      logger.debug("[DRIVER] --> File " + driverFileName + " successfully read.");
				      
				      var driverCode = code_data;
							      
				      fs.readFile(driverSchemaName, 'utf8', function(err, schema_data) {
					
					  if(err) {
				    
					      result_db = "Driver schema file decoding error: " + err;
					      response.result = result_db;
					      res.send(JSON.stringify(response));
					      logger.error("[DRIVER] --> "+result_db);
					      
					  } else {
					      logger.debug("[DRIVER] --> Configuration file " + driverSchemaName + " successfully read.");
					      
					      var driverSchema = schema_data;	
					      
					      logger.debug('[DRIVER] --> Calling RPC injectDriver with name = ' + driverName +" autostart = "+ autostart +" code = " + driverCode +" schema = " + driverSchema);

					      session_wamp.call('s4t.'+board+'.driver.injectDriver', [driverName, driverCode, driverSchema, autostart]).then(
						
						  function(result){
						    
						      db.insertInjectedDriver (board, driverName, function(out){
							  logger.info("[DRIVER] --> Injecting result of "+ driverName +": "+result + " ("+out+")");
							  response.result = result;
							  res.send(JSON.stringify(response));
						      });
						      
						} , session_wamp.log);
					      
					      
					      
					  }
				    
				      
				      });

				      
				  }
			      });
			      
			      
		      });		    

		    
		  }else{

		      result_db = "Driver injection failed: "+drivername+" already injected!";
		      response.result = result_db;
		      res.send(JSON.stringify(response));
		      logger.warn("[DRIVER] --> "+result_db);
		      
		    
		  }

	      });
	      


	
	}
    });
}





driver_utils.prototype.removeDriver = function(board, drivername, res){
  
    logger.info("[DRIVER] - Removing driver "+ drivername + " from board " + board);
    
    var response = {
        message : 'Remove driver',
        result: {}
    }
    
    var driverId;
    var drivername;
    var result_db;  
    
    //I need to read the name of the driver from the DB
    db.getDriverId(drivername, function(data){        
	
	if (data[0] === undefined){
	  
	  result_db = "Driver "+drivername+" does not exist!";
	  response.result = result_db;
	  res.send(JSON.stringify(response));
	  logger.warn("[DRIVER] --> "+result_db);
	  
	}else{
	  
	      driverId = data[0].id;
	      
	      db.getInjectedDriver( driverId, board, function(data_p){
      
		  if (data_p[0] === undefined){

			result_db = "Driver removal failed: "+drivername+" already removed!";
			response.result = result_db;
			res.send(JSON.stringify(response));
			logger.warn("[DRIVER] --> "+result_db);
	      
	      
		  }else{
			  
			//Now I can perform the RPC call
			session_wamp.call('s4t.'+board+'.driver.removeDriver', [drivername]).then(
			  
			    function(result){
			      
				  db.deleteInjectedDriver(board, driverId, function(data_p){

					result = "Delete result of "+ drivername +": "+result;
					logger.info("[DRIVER] --> "+result);
					response.result = result;
					res.send(JSON.stringify(response));
		    
				  });
	    
			} , session_wamp.log);
			  
		      
		  }
		  
	      });
	  
	}
	
	
    });  
  
}




function deleteFolderRecursive(path){
  
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { 
	// recurse
        deleteFolderRecursive(curPath);
      } else { 
	// delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
  
}


driver_utils.prototype.destroyDriver = function(drivername, res){
  
    logger.info("[DRIVER] - REMOVING " + drivername + " driver from Iotronic...");
    
    var response = {
        message : 'Destroy driver',
        result: {}
    }

    //I need to read the name of the driver from the DB
    db.getDriverId(drivername, function(data){        
	
	if (data[0] === undefined){
	  
	      result_db = "Driver "+drivername+" does not exist!";
	      response.result = result_db;
	      res.send(JSON.stringify(response));
	      logger.warn("[DRIVER] --> "+result_db);
	  
	}else{
	  
	      //driverId = data[0].id;
	      var driver_folder = './drivers/'+drivername;
	      
	      db.deleteDriver (drivername, function(result_db){
		
		    if (result_db.result == "ERROR"){
		      
			logger.error("[DRIVER] --> Delete driver DB error: " + result_db.message); 
			response.result = result_db.message;
			res.send(response);
		      
		    }else{
		      
			logger.info('[DRIVER] --> Deleting files of '+drivername+'...');
			
			deleteFolderRecursive(driver_folder);
			
			delete_response = "Driver "+drivername+" successfully deleted from Iotronic!";
			logger.info("[DRIVER] --> " + delete_response);
			response.result = delete_response;
			res.send(JSON.stringify(response));	
			
		    }
		    
	      });
	      
	}
	
	
    });
   
}






module.exports = driver_utils;
