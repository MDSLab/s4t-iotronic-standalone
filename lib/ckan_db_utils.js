/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2015 Nicola Peditto
*/


//service logging configuration: "ckan_db_utils"   
var logger = log4js.getLogger('ckan_db_utils');
var requestify = require('requestify');
var when = require('when');
var Q = require("q");


/*
var nconf = require('nconf');
nconf.file ({file: process.cwd()+'/lib/settings.json'});
var db_host = nconf.get('config:server:db:host');
*/

var ckan_host = 'http://smartme-data.unime.it';
var ckan_datastore_search = "http://smartme-data.unime.it/api/3/action/datastore_search";
ckan_utils = function()
{
	//var db_host = nconf.get('config:server:db:host');
	var ckan_host = 'http://smartme-data.unime.it';
	var ckan_datastore_search = "http://smartme-data.unime.it/api/3/action/datastore_search";
	
	
}

/*
    function getCKAN(id){    

	var d = when.defer();
	
	var requestify = require('requestify');

	requestify.get('http://smartme-data.unime.it/api/rest/dataset/'+id)
	  .then(function(response) {
	      // Get the response body (JSON parsed)
	    
	      //if(response != '"Not found"'){
		//console.log("Board "+id+" is in CKAN!");
			
		dataCKAN=response.getBody()
		//logger.info(JSON.stringify(dataCKAN));
		d.resolve(dataCKAN);
		
	      //}
	      

	  }
	);
	  
	
	return d.promise;
  
  
	      
    }  
*/
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
  
  

module.exports = ckan_utils;
