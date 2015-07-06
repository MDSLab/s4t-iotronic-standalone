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
/*
db_utils.prototype.conn = function(){
	connection = mysql.createConnection({
		host: 		db_host,
		port: '3306', 
		user: 		db_user,
		password: 	db_pass,
		database: 	db_name
	});
}
*/

function conn(){
	connection = mysql.createConnection({
		host: 		db_host,
		port: '3306', 
		user: 		db_user,
		password: 	db_pass,
		database: 	db_name
	});
}

function disconn(){
	connection.end();
}
//Function to obtain all the boards id
db_utils.prototype.getBoardsConnected = function(callback){
	conn();
	//DEBUG
	//console.log("db:::"+"SELECT * FROM boards_connected");

	connection.query("SELECT * FROM boards_connected", function(err,result){
		console.log(err);
		callback(result);
	});
	disconn();
}

//Function to check if a board is registered to a user
db_utils.prototype.checkBoard = function(b_id, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"SELECT * FROM user_boards WHERE user_boards.board_code = '"+b_id+"'");

	connection.query("SELECT * FROM user_boards WHERE user_boards.board_code ='"+b_id+"'", function(err,result){
		console.log(err);
		callback(result);
	});
	disconn();
}
//Function to insert board in DB boards_connected table
db_utils.prototype.insertBoard = function(b_id, b_session, b_state, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"INSERT INTO boards_connected (board_code, session_id, status) VALUES ('"+b_id+"','"+b_session+"','"+b_state+"')");

	connection.query("INSERT INTO boards_connected (board_code, session_id, status) VALUES ('"+b_id+"','"+b_session+"','"+b_state+"')", function(err, result){
		console.log(err);
		callback(result);
	});
	disconn();
}

//Function to check the status of a specific board
db_utils.prototype.checkBoardConnected= function(b_id, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"SELECT * FROM boards_connected WHERE boards_connected.board_code = '"+b_id+"'");

	connection.query("SELECT * FROM boards_connected WHERE boards_connected.board_code ='"+b_id+"'", function(err,result){
		console.log(err);
		callback(result);
	});
	disconn();
}


//Function to find board using session ID
db_utils.prototype.findBySessionId = function(s_id, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"SELECT * FROM boards_connected WHERE boards_connected.session_id = '"+s_id+"'");
	connection.query("SELECT * FROM boards_connected WHERE boards_connected.session_id = '"+s_id+"'", function(err, result){
		console.log(err);
		callback(result);
	});
	disconn();
}

//Function to change the status of the board in DB
db_utils.prototype.changeBoardState = function(b_id, b_session, b_state, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"UPDATE boards_connected SET board_code='"+b_id+"',session_id='"+b_session+"',status='"+b_state+"' WHERE board_code='"+b_id+"'");
	
	connection.query("UPDATE boards_connected SET board_code='"+b_id+"',session_id='"+b_session+"',status='"+b_state+"' WHERE board_code='"+b_id+"'", function(err, result){
		console.log(err);
		callback(result);
	});
	disconn();
}
//Function to check if a service is already present in the db
db_utils.prototype.checkService=function(b_id, s_name, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"SELECT * FROM reverse_cloud_services WHERE reverse_cloud_services.board_id ='"+b_id+"' AND reverse_cloud_services.service ='"+s_name+"'");
	
	connection.query("SELECT * FROM reverse_cloud_services WHERE reverse_cloud_services.board_id ='"+b_id+"' AND reverse_cloud_services.service ='"+s_name+"'", function(err, result){
		console.log(err);
		callback(result);
	});
	disconn();
}
//Function to insert a service reference in DB
db_utils.prototype.insertService = function (b_id, s_name, s_ip, s_port,callback){
    conn();
    //DEBUG
	//console.log("db:::"+"INSERT INTO reverse_cloud_services (board_id, service, public_ip, public_port) VALUES ('"+b_id+"','"+s_name+"','"+s_ip+"','"+s_port+"')");

	connection.query("INSERT INTO reverse_cloud_services (board_id, service, public_ip, public_port) VALUES ('"+b_id+"','"+s_name+"','"+s_ip+"','"+s_port+"')", function(err, result){
		console.log(err);
		callback(result);
	});
	disconn();
}
//Fuction to remove a service of a specific board from the db
db_utils.prototype.removeService = function (b_id, s_name, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"DELETE FROM reverse_cloud_services WHERE reverse_cloud_services.board_id ='"+b_id+"' AND reverse_cloud_services.service='"+s_name+"'");

	connection.query("DELETE FROM reverse_cloud_services WHERE reverse_cloud_services.board_id ='"+b_id+"' AND reverse_cloud_services.service='"+s_name+"'", function(err, result){
		console.log(err);
		callback(result);
	});
	disconn();
}

//Fuction to remove all services of a specific board from the db
db_utils.prototype.removeAllServices = function (b_id, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"DELETE FROM reverse_cloud_services WHERE reverse_cloud_services.board_id ='"+b_id+"'");

	connection.query("DELETE FROM reverse_cloud_services WHERE reverse_cloud_services.board_id ='"+b_id+"'", function(err, result){
		console.log(err);
		callback(result);
	});
	disconn();
}

//Function to check if a specific port is already used
db_utils.prototype.checkPort=function(s_port, callback){
	conn();
	//DEBUG
	//console.log("db:::"+"SELECT * FROM reverse_cloud_services WHERE reverse_cloud_services.public_port='"+s_port+"'");

	connection.query("SELECT * FROM reverse_cloud_services WHERE reverse_cloud_services.public_port='"+s_port+"'", function(err, result){
	    if (result.length == 0)
	    	callback(0);
	  	else
	  		callback(1);
	});
	disconn();
}

module.exports = db_utils;
