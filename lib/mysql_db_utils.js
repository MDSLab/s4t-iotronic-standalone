/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Andrea Rocco Lotronto
*/
var mysql = require('mysql');

var nconf = require('nconf');
nconf.file ({file: '/mnt/Data-Partition/Develop/GitRepository/GitHub/MDSLab/s4t-node-cloud/lib/setting.json'});


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

db_utils.prototype.conn = function(){

	console.log("Data:"+db_host+" "+db_user+" "+db_pass+" "+db_name);

	connection = mysql.createConnection({
		host: 		db_host,
		port: '3306', 
		user: 		db_user,
		password: 	db_pass,
		database: 	db_name
	});

	connection.connect(function(err) {
		if (err)
		{
    		console.error('error connecting: ' + err.stack);
    		return;
  		}

		//DEBUG
		console.log('Connected as id '+connection.threadId);
	});
}

module.exports = db_utils;