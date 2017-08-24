/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2017 Nicola Peditto

*/

//service logging configuration: "project_utils"
var logger = log4js.getLogger('project_utils');
logger.setLevel(loglevel);


var db_utils = require('./mysql_db_utils');
var db = new db_utils;

var Q = require("q");


var session_wamp;

project_utils = function (session, rest) {

    session_wamp = session;

    // project MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //get projects list
    rest.get('/v1/projects/', function (req, res) {

        logger.debug("[API] - projects list called - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var response = {
            message: '',
            result: ''
        };

        db.getProjectList(function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting projects list: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                res.send(JSON.stringify(data));
            }

        });

    });

    logger.debug("[REST-EXPORT] - project management APIs exposed!");


};


module.exports = project_utils;