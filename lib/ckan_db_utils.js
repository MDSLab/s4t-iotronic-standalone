/*
				 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2015 2016 Nicola Peditto
*/


//service logging configuration: "ckan_db_utils"   
var logger = log4js.getLogger('ckan_db_utils');
var requestify = require('requestify');
var Q = require("q");

var db_utils = require('./mysql_db_utils');
var db = new db_utils;



var ckan_addr = '';
var ckan_host = 'http://'+ckan_addr;
var ckan_datastore_search = "http://"+ckan_addr+"/api/3/action/datastore_search";
ckan_utils = function()
{

	var ckan_host = 'http://'+ckan_addr;
	var ckan_datastore_search = "http://"+ckan_addr+"/api/3/action/datastore_search";
	
	
}

ckan_utils.prototype.CkanBoardRegistration = function(board, board_label, latitude, longitude, altitude, callback){  
  
    var spawn = require('child_process').spawn;

    logger.info("CKAN board registration...");
    
    var ckan  = spawn('python', ['./lib/ckan_register_board.py', board, board_label, altitude, latitude, longitude ]);

    ckan.stdout.on('data', function (data) {
	ckan_response = 'stdout: ' + data;
	logger.info(ckan_response);

    });
    ckan.stderr.on('data', function (data) {
      	ckan_response = 'stdout: ' + data;
	logger.error(ckan_response);

    });
    ckan.on('close', function (code) {
	ckan_response = "CKAN registration process successfully completed [Exit code " + code + "]";
	logger.info(ckan_response);
	callback(ckan_response);
    });  

}


ckan_utils.prototype.getCKANdataset = function(id){  

	var d = Q.defer();

	logger.info(ckan_host + '/api/rest/dataset/'+id);
	requestify.get(ckan_host + '/api/rest/dataset/'+id).then( function(response) {

	  var dataCKAN = response.getBody();
	  
	  d.resolve(dataCKAN);
	  
	});
	
	return d.promise;     
} 
    
    
    


ckan_utils.prototype.queryCKANdatastore = function(restParams){

	var d1 = Q.defer();
	
	//console.log("--> REST CALL "+ ckan_datastore_search + " " + JSON.stringify(restParams));
	requestify.get(ckan_datastore_search,  {params: restParams}).then( function(response) {
	    
		// Get the response body (JSON parsed)
		dataCKAN=response.getBody()
		//console.log(JSON.stringify(dataCKAN));
		//console.log("--> REST RESPONSE METRICS: "+JSON.stringify(dataCKAN.result.records));
	     
		d1.resolve(dataCKAN.result.records);
	  }
	);
	return d1.promise; 
}  






ckan_utils.prototype.getMap = function(req, res){

      
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
	  
	  //logger.info("BOARDS GRID IN CKAN: "+JSON.stringify(data,null,"\t"));
	  
	
	  var board = 0;
	  
	  promiseWhile(function () { return board < data.length; }, function () {
	    
	    var id = data[board].board_code; 
		
	    response.boards[id] = {}; 
	    response.boards[id]['label'] = data[board].label; 
	    response.boards[id]['coordinates'] = {"altitude":data[board].altitude, "latitude":data[board].latitude, "longitude":data[board].longitude};
	    response.boards[id]['resources'] = {metrics:[]};
	    
	      
	    ckan_utils.prototype.getCKANdataset(id).then(
		    
		function(result){
	      
	      
		      logger.info("Getting metrics of board "+ id);
		      
		      for(var resource=0; resource < result.resources.length; resource++) {
			
			
			(function(resource) {
			  
			   setTimeout(function(){
			      
				if (result.resources[resource].name != "metadata"){
				  
				    var queryResource = {"resource_id":result.resources[resource].id, "limit":1, "sort":"Date  desc"};
				    
				    if (result.resources[resource].name == "temperature"){
				      
				      //logger.info("--> RESOURCE: "+JSON.stringify(result.resources[resource].name) + " ID: "+JSON.stringify(result.resources[resource].id));
				      
				      ckan_utils.prototype.queryCKANdatastore(queryResource).then(function(result){
					
					  if(result[0]!= null){
					    logger.info("--> TEMP VALUE of board "+id+": " + JSON.stringify(result[0].Temperature) + " °C");
					    response.boards[id]['resources'].metrics.push(result[0]);
					  }
					  
				      });
				      
				      
				    } else if (result.resources[resource].name == "brightness"){
				      
				      //logger.info("--> RESOURCE: "+JSON.stringify(result.resources[resource].name) + " ID: "+JSON.stringify(result.resources[resource].id));
				      
				      ckan_utils.prototype.queryCKANdatastore(queryResource).then(function(result){
					
					  if(result[0]!= null){
					    logger.info("--> LUX VALUE of board "+id+": " + JSON.stringify(result[0].Brightness) +" lux");
					    response.boards[id]['resources'].metrics.push(result[0]);
					  }

				      });
				      
				      
				    } else if (result.resources[resource].name == "humidity"){
				      
				      //logger.info("--> RESOURCE: "+JSON.stringify(result.resources[resource].name) + " ID: "+JSON.stringify(result.resources[resource].id));
				      
				      ckan_utils.prototype.queryCKANdatastore(queryResource).then(function(result){
					
					  if(result[0]!= null){
					    logger.info("--> HUMIDITY VALUE of board "+id+": " + JSON.stringify(result[0].Humidity) +" percent");
					    response.boards[id]['resources'].metrics.push(result[0]);
					  }

				      });
				      
				      
				    } else if (result.resources[resource].name == "gas"){
				      
				      //logger.info("--> RESOURCE: "+JSON.stringify(result.resources[resource].name) + " ID: "+JSON.stringify(result.resources[resource].id));
				      
				      ckan_utils.prototype.queryCKANdatastore(queryResource).then(function(result){
					
					  if(result[0]!= null){
					    logger.info("--> C02 VALUE of board "+id+": " + JSON.stringify(result[0].Gas) +" ppm");
					    response.boards[id]['resources'].metrics.push(result[0]);
					  }

				      });
				      
				      
				    } else if (result.resources[resource].name == "pressure"){
				      
				      //logger.info("--> RESOURCE: "+JSON.stringify(result.resources[resource].name) + " ID: "+JSON.stringify(result.resources[resource].id));
				      
				      ckan_utils.prototype.queryCKANdatastore(queryResource).then(function(result){
					
					  if(result[0]!= null){
					    logger.info("--> PRESSURE VALUE of board "+id+": " + JSON.stringify(result[0].Pressure) +" hPa");
					    response.boards[id]['resources'].metrics.push(result[0]);
					  }

				      });
				      
				      
				    } else if (result.resources[resource].name == "noise"){
				      
				      //logger.info("--> RESOURCE: "+JSON.stringify(result.resources[resource].name) + " ID: "+JSON.stringify(result.resources[resource].id));
				      
				      ckan_utils.prototype.queryCKANdatastore(queryResource).then(function(result){
					
					  if(result[0]!= null){
					    logger.info("--> NOISE VALUE of board "+id+": " + JSON.stringify(result[0].Noise) +" amplitude");
					    response.boards[id]['resources'].metrics.push(result[0]);
					  }

				      });
				      
				      
				    }   
				  
				}
				
			    }, 100*resource);  // end of setTimeout function

			 })(resource);  // end of the function(i)	
			  
		      }
		      
		      
	      
	    });
	    
	    board++;
	    
	    return Q.delay(400*data.length); // arbitrary async


	    
	  }).then(function () {

		logger.info("FINAL RESULT:\n"+JSON.stringify(response)+"\n");
		res.send(JSON.stringify(response));

		logger.info("##################################################################################################################");
		logger.info("##################################################################################################################");
		
	  }).done();    

	  
	  

        });
	
	
      
    




}


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



module.exports = ckan_utils;
