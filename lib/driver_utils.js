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


//driver_utils.manageDrivers(board, drivername, driveroperation, driver_exp_filename, remote, mirror_board, res);
driver_utils.prototype.manageDrivers = function(board, drivername, driveroperation, filename, remote, mirror_board, res){
  
    var response = {
        message : '',
        result: {}
    }
    
    
    switch(driveroperation){
    
        case 'mount':
 
	    logger.debug("RPC call to mount driver \""+drivername+"\"...");
	    
	    //I need to read the name of the driver from the DB
	    db.getDriverId(drivername, function(data){        
		
		if (data[0] === undefined){
		  
		  result_db = "Driver "+drivername+" does not exist!";
		  response.message = result_db;
		  response.result = "WARNING";
		  res.send(JSON.stringify(response));
		  logger.warn(result_db);
		  
		}else{
		  
		      driverId = data[0].id;
		      
		      db.getInjectedDriver( driverId, board, function(data_p){
	      
			  if (data_p[0] === undefined){
			    
			      result_db = "Driver mounting failed: "+drivername+" is not injected!";
			      response.message = result_db;
			      response.result = "WARNING";
			      res.send(JSON.stringify(response));
			      logger.warn(result_db);
		  
			  }else{
			    
			      var driverState = data_p[0].state;
			      
			      if (driverState != "mounted"){
				
				    session_wamp.call('s4t.'+board+'.driver.mountDriver', [drivername, filename, remote, mirror_board]).then(
				      
					function(driver_result){
					  
					    if(driver_result.result === "SUCCESS"){
						db.updateDriverStatus (board, drivername, "mounted", function(out){
						    logger.debug("Update driver status result for "+ drivername +": "+out);
						    res.send(JSON.stringify(driver_result));
						    logger.info("Driver mount result for \""+ drivername +"\": " + JSON.stringify(driver_result.result) + " - " + JSON.stringify(driver_result.message) );
						});
					    }else{
					      
						res.send(JSON.stringify(driver_result));
						logger.info("Driver mount result for \""+ drivername +"\": " + JSON.stringify(driver_result.result) + " - " + JSON.stringify(driver_result.message) );					    
					    }

					}
				    );			
				
			      }else{
				
				  result_db = "Driver "+drivername+" is already mounted!";
				  response.message = result_db;
				  response.result = "WARNING";
				  res.send(JSON.stringify(response));
				  logger.warn(result_db);
			      
			      }
			      
			      
			  }
			  
		      });
		      
		}
	    });
	    
	    
            break


	    
	
	    
        case 'unmount':

	    logger.info("RPC call to unmount driver \""+drivername+"\"...");
            

	    
	    
	    

	    //I need to read the name of the driver from the DB
	    db.getDriverId(drivername, function(data){        
		
		if (data[0] === undefined){
		  
		  result_db = "Driver "+drivername+" does not exist!";
		  response.message = result_db;
		  response.result = "WARNING";
		  res.send(JSON.stringify(response));
		  logger.warn(result_db);
		  
		}else{
		  
		      driverId = data[0].id;
		      
		      db.getInjectedDriver( driverId, board, function(data_p){
	      
			  if (data_p[0] === undefined){
			    
			      result_db = "Driver unmounting failed: "+drivername+" is not injected!";
			      response.message = result_db;
			      response.result = "WARNING";
			      res.send(JSON.stringify(response));
			      logger.warn(result_db);
		  
			  }else{
			    
			      var driverState = data_p[0].state;
			      
			      if (driverState === "mounted"){
				
				  session_wamp.call('s4t.'+board+'.driver.unmountDriver', [drivername]).then(
				    
				      function(driver_result){
					  
					  if(driver_result.result === "SUCCESS"){
					      db.updateDriverStatus (board, drivername, "unmounted", function(out){
						logger.debug("Update driver status result for "+ drivername +": "+out);
						res.send(JSON.stringify(driver_result));
						logger.info("Driver unmount for \""+ drivername +"\": " + JSON.stringify(driver_result.result) + " - " + JSON.stringify(driver_result.message) );
					      });
					  } else{
					      res.send(JSON.stringify(driver_result));
					      logger.info("Driver unmount for \""+ drivername +"\": " + JSON.stringify(driver_result.result) + " - " + JSON.stringify(driver_result.message) );
					  }
					  
				      } 
				  );		
				
			      }else{
				
				  result_db = "Driver "+drivername+" is not mounted!";
				  response.message = result_db;
				  response.result = "WARNING";
				  res.send(JSON.stringify(response));
				  logger.warn(result_db);
			      
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
    
    var result_db;
    
    var response = {
        message : 'Create Driver',
        result: {}
    }
    


    db.getDriverId(drivername, function(data){
        
	if (data[0] === undefined){
	  
	      try{
		
		    var drivers_folder = './drivers'
		    var driver_path = drivers_folder + '/' + drivername;
		    var fileNameDriver = driver_path + '/' + drivername + '.js';
		    var fileNameSchema = driver_path + '/' + drivername + '.json';
    
		    logger.info("Driver creation -> drivername = " + drivername + " driverjson = " + driverjson + " drivercode = " + drivercode);
	
		    fs.mkdir(driver_path, function() {

			  db.insertCreatedDriver (drivername, fileNameSchema, fileNameDriver, function(response_db){
			    
			      if (response_db.result == "ERROR"){
				result_creation = "DB write error: " + response_db.message
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
		  result_db = "Error during driver creation: " + err;
		  logger.error(result_db);
		  response.result = result_db;
		  res.send(JSON.stringify(response));
	      }	  
	  

	  
	  
	}else{
	  
	  result_db = "Driver creation failed: "+drivername+" already exists!";
	  response.result = result_db;
	  res.send(JSON.stringify(response));
	  logger.warn(result_db);	  
	  
	  
	}
	
    });


    
    

    
    
    
}


driver_utils.prototype.readRemoteFile = function(board, drivername, filename, res){
  
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
	  logger.warn(result_db);
	  
	}else{
	  
	      driverId = data[0].id;  
	      db.getInjectedDriver( driverId, board, function(data_p){
      
		  if (data_p[0] === undefined){
		      result_db = "The driver "+drivername+" is not injected in the board "+board+" !";
		      response.result = result_db;
		      res.send(JSON.stringify(response));
		      logger.warn(result_db);

		  }else{

		      logger.debug("RPC call to read a remote file "+drivername+"["+filename+"] ...");

		      session_wamp.call('s4t.'+board+'.driver.'+drivername+'.'+filename+'.read', [drivername, filename]).then(
			  function(result){
			      response.result = {"driver":drivername, "file":filename, "value":result};
			      res.send(JSON.stringify(response));
			      logger.info("Remote read file result "+drivername+"["+filename+"] : " + result);
			           
			      
			  }
		      );
		
		      
		    
		  }		  
		  
	      });
	      
	      
	}
    });
  
}
        
        
        
driver_utils.prototype.injectDriver = function(board, drivername, autostart, res){
    
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
	  logger.warn(result_db);
	  
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
				      logger.error(result_db);
				      
				  } else {
				    
				      logger.info("Driver " + driverFileName + " read successfully");
				      
				      var driverCode = code_data;
							      
				      fs.readFile(driverSchemaName, 'utf8', function(err, schema_data) {
					
					  if(err) {
				    
					      result_db = "Driver schema file decoding error: " + err;
					      response.result = result_db;
					      res.send(JSON.stringify(response));
					      logger.error(result_db);
					      
					  } else {
					      logger.info("Driver " + driverSchemaName + " read successfully");
					      
					      var driverSchema = schema_data;	
					      
					      logger.info('Calling RPC injectDriver with name = ' + driverName +" autostart = "+ autostart +" code = " + driverCode +" schema = " + driverSchema);

					      
					      session_wamp.call('s4t.'+board+'.driver.injectDriver', [driverName, driverCode, driverSchema, autostart]).then(
						
						  function(result){
						    
						      db.insertInjectedDriver (board, driverName, function(out){
							  logger.info("INJECT RESULT of "+ driverName +": "+result + " ("+out+")");
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
		      logger.warn(result_db);
		      
		    
		  }

	      });
	      


	
	}
    });
}


module.exports = driver_utils;
