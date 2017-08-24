/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2017 Nicola Peditto

*/

//service logging configuration: "user_utils"
var logger = log4js.getLogger('user_utils');
logger.setLevel(loglevel);


var db_utils = require('./mysql_db_utils');
var db = new db_utils;

var Q = require("q");


var session_wamp;

user_utils = function (session, rest) {

    session_wamp = session;

    // user MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //get users list
    rest.get('/v1/users/', function (req, res) {

        logger.debug("[API] - users list called - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var response = {
            message: '',
            result: ''
        };

        db.getUserList(function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting users list: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                res.send(JSON.stringify(data));
            }

        });

    });

    logger.debug("[REST-EXPORT] - user management APIs exposed!");


};


module.exports = user_utils;