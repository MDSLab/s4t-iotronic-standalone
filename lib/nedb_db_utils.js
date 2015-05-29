/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Andrea Rocco Lotronto
*/

//Using in-memory DB
var Datastore = require('nedb');
var db = new Datastore();


db_utils = function()
{
	db.loadDatabase();
}


//Function to insert in DB
db_utils.prototype.insertService = function (b_id, s_name, s_port,callback){
	var doc = {
		name:     b_id,
        service:  s_name,
        port:     s_port
    };

    db.insert(doc, function(err, newDoc){
    	callback(newDoc,err);
    });

}
//Function to check if a service is already present in the db
db_utils.prototype.checkService=function(id, s_name, callback){
	
  	db.find({name : id, service: s_name}, function(err, docs){
	    if (docs.length == 0)
	    	callback(0);
	  	else
	  		callback(1);
	});
}

//Function to check if a specific port is already used
db_utils.prototype.checkPort=function(s_port, callback){
	
  	db.find({port: s_port}, function(err, docs){
	    if (docs.length == 0)
	    	callback(0);
	  	else
	  		callback(1);
	});
}

//Fuction that returns the port of a specific service already started
db_utils.prototype.getPortService = function (id, s_name, callback){
  db.find({name : id, service: s_name}, function(err, docs){
    callback(docs[0].port);
  });
}

//Fuction to remove a service of a specific board from the db
db_utils.prototype.removeService = function (id, s_name, callback){
	db.find({name : id, service: s_name}, function(err, docs){
		if(docs.length > 0){
			db.remove({_id:docs[0]._id},{}, function(err, numRemoved){
				callback(numRemoved);
			});
		}
	});
}
//----------------------------------------------------------

module.exports = db_utils;