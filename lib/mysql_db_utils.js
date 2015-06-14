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

	console.log("Data:"+db_host+" "+db_user+" "+db_pass+" "+db_name);

	connection = mysql.createConnection({
		host: 		db_host,
		port: '3306', 
		user: 		db_user,
		password: 	db_pass,
		database: 	db_name
	});
}

//Function to obtain all the boards id
db_utils.prototype.getBoardsId = function(callback){
	//DEBUG
	console.log("db:::"+"SELECT name FROM boards");

	connection.query("SELECT name FROM boards", function(err,result){
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


module.exports = db_utils;