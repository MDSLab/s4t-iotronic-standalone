/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Andrea Rocco Lotronto
*/
var mysql = require('mysql');

var nconf = require('nconf');
nconf.file ({file: process.cwd()+'/lib/setting.json'});

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
	connection = mysql.createConnection({
		host: 		db_host,
		port: '3306', 
		user: 		db_user,
		password: 	db_pass,
		database: 	db_name
	});
}

//Function to obtain all the boards id
db_utils.prototype.getBoards = function(callback){
	//DEBUG
	console.log("db:::"+"SELECT * FROM boards");

	connection.query("SELECT * FROM boards", function(err,result){
		console.log(err);
		callback(result);
	});
}

//Function to check if a board is already present in the DB
db_utils.prototype.checkBoard = function(b_id, callback){
	//DEBUG
	console.log("db:::"+"SELECT * FROM boards WHERE boards.name = '"+b_id+"'");

	connection.query("SELECT * FROM boards WHERE boards.name ='"+b_id+"'", function(err,result){
		console.log(err);
		callback(result);
	});
}
//Function to insert board in DB in active status
db_utils.prototype.insertBoard = function(b_id, b_session, b_state, callback){
	//DEBUG
	console.log("db:::"+"INSERT INTO boards (name, session, state) VALUES ('"+b_id+"','"+b_session+"','"+b_state+"')");

	connection.query("INSERT INTO boards (name, session, state) VALUES ('"+b_id+"','"+b_session+"','"+b_state+"')", function(err, result){
		console.log(err);
		callback(result);
	})
}
//Function to find board using session ID
db_utils.prototype.findBySessionId = function(s_id, callback){
	//DEBUG
	console.log("db:::"+"SELECT * FROM boards WHERE boards.session = '"+s_id+"'");
	connection.query("SELECT * FROM boards WHERE boards.session = '"+s_id+"'", function(err, result){
		console.log(err);
		callback(result);
	});
}

//Function to change the status of the board in DB
db_utils.prototype.changeBoardState = function(b_id, b_session, b_state, callback){
	//DEBUG
	console.log("db:::"+"UPDATE boards SET name='"+b_id+"',session='"+b_session+"',state='"+b_state+"' WHERE name='"+b_id+"'");
	
	connection.query("UPDATE boards SET name='"+b_id+"',session='"+b_session+"',state='"+b_state+"' WHERE name='"+b_id+"'", function(err, result){
		console.log(err);
		callback(result);
	});
}
//Function to check if a service is already present in the db
db_utils.prototype.checkService=function(b_id, s_name, callback){
	//DEBUG
	console.log("db:::"+"SELECT * FROM services WHERE services.name ='"+b_id+"' AND services.service ='"+s_name+"'");
	connection.query("SELECT * FROM services WHERE services.name ='"+b_id+"' AND services.service ='"+s_name+"'", function(err, result){
		console.log(err);
		callback(result);
	})
}
//Function to insert a service reference in DB
db_utils.prototype.insertService = function (b_id, s_name, s_port,callback){
    //DEBUG
	console.log("db:::"+"INSERT INTO services (name, service, port) VALUES ('"+b_id+"','"+s_name+"',"+s_port+")");

	connection.query("INSERT INTO services (name, service, port) VALUES ('"+b_id+"','"+s_name+"',"+s_port+")", function(err, result){
		console.log(err);
		callback(result);
	})
}
//Fuction to remove a service of a specific board from the db
db_utils.prototype.removeService = function (b_id, s_name, callback){
	//DEBUG
	console.log("db:::"+"DELETE FROM services WHERE services.name ='"+b_id+"' AND services.service='"+s_name+"'");

	connection.query("DELETE FROM services WHERE services.name ='"+b_id+"' AND services.service='"+s_name+"'", function(err, result){
		console.log(err);
		callback(result);
	})
}

//Fuction to remove all services of a specific board from the db
db_utils.prototype.removeAllServices = function (b_id, callback){
	//DEBUG
	console.log("db:::"+"DELETE FROM services WHERE services.name ='"+b_id+"'");

	connection.query("DELETE FROM services WHERE services.name ='"+b_id+"'", function(err, result){
		console.log(err);
		callback(result);
	})
}

//Function to check if a specific port is already used
db_utils.prototype.checkPort=function(s_port, callback){
	console.log("db:::"+"SELECT * FROM services WHERE services.port="+s_port);

	connection.query("SELECT * FROM services WHERE services.port="+s_port, function(err, result){
	    if (result.length == 0)
	    	callback(0);
	  	else
	  		callback(1);
	})
}

module.exports = db_utils;
