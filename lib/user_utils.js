/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2017 Nicola Peditto

 */

//service logging configuration: "user_utils"
var logger = log4js.getLogger('user_utils');
logger.setLevel(loglevel);

var Q = require("q");

var db_utils = require('./mysql_db_utils');
var db = new db_utils;
var board_utility = require('./board_utils');
var auth = require('./auth_utils');

var uuid = require('node-uuid');
var bcrypt = require('bcrypt');

user_utils = function (session, rest) {

    // User management APIs
    //---------------------------------------------------------------------------------------------------

    //GET users list
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
                logger.error("[USER] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                res.send(JSON.stringify(data));
            }

        });

    });


    //CREATE a IoTronic user
    rest.post('/v1/users/', function (req, res) {

        logger.debug("[API] - Create an IoTronic user - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var username = req.body.username;
        var password = req.body.password;
        var email = req.body.email;
        var f_name = req.body.f_name;
        var l_name = req.body.l_name;


        var APIparamsList= {"username":username, "email":email};

        board_utility.checkDefInputs(APIparamsList, function (check){

            if(check.result == "ERROR"){

                res.send(JSON.stringify(check));

            }else {

                board_utility.checkRestInputs(req, function (check){

                    if(check.result == "ERROR"){
                        res.send(JSON.stringify(check));

                    }else {

                        user_utils.prototype.createUser(username, password, email, f_name, l_name, res);

                    }

                });

            }

        });


    });


    //DELETE IoTronic user
    rest.delete('/v1/users/:user', function (req, res) {

        logger.debug("[API] - Delete IoTronic user - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var user_id = req.params.user;

        user_utils.prototype.deleteUser(user_id, res);

    });


    //UPDATE IoTronic user
    rest.patch('/v1/users/:user', function (req, res) {

        logger.debug("[API] - Update IoTronic user - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var user_id = req.params.user;

        var username = req.body.username;
        var password = req.body.password;
        var email = req.body.email;
        var f_name = req.body.f_name;
        var l_name = req.body.l_name;

        var APIparamsList= {"username":username, "email":email};

        board_utility.checkDefInputs(APIparamsList, function (check){

            if(check.result == "ERROR"){

                res.send(JSON.stringify(check));

            }else {

                board_utility.checkRestInputs(req, function (check){

                    if(check.result == "ERROR"){
                        res.send(JSON.stringify(check));

                    }else {

                        user_utils.prototype.updateUser(user_id, username, password, email, f_name, l_name, res);

                    }

                });

            }

        });


    });


    //GET IoTronic user details
    rest.get('/v1/users/:user', function (req, res) {

        logger.debug("[API] - Get IoTronic user details - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var response = {
            message: '',
            result: ''
        };

        var user_id = req.params.user;

        db.getUser(user_id, function (data) {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "IoTronic user with ID '" + user_id + "' does not exist!";
                logger.error("[USER] --> " + response.message);
                res.send(JSON.stringify(response));

            }
            else {

                if (data.result == "ERROR") {
                    response.message = "Error getting user details: " + data.message;
                    response.result = "ERROR";
                    logger.error("[USER] --> " + response.message);
                    res.send(JSON.stringify(response));

                } else {
                    response.message = data.message[0];
                    response.result = "SUCCESS";
                    logger.info("[USER] --> " + JSON.stringify(response.message));
                    res.send(JSON.stringify(response));

                }

            }

        });

    });


    logger.debug("[REST-EXPORT] - User management APIs exposed!");


};



user_utils.prototype.createUser = function (username, password, email, f_name, l_name, res) {

    logger.info("[USER] - Creating IoTronic user: " + username);

    var response = {
        message: '',
        result: ''
    };

    var user_id = uuid.v4();

    auth.encryptPassword(password, function(pw_result) {


         if (pw_result.result == "ERROR") {
             response.message = pw_result.message;
             response.result = pw_result.result;
             logger.error("[USER] --> " + response.message);
             res.send(JSON.stringify(response));

         } else {

             db.createUser(user_id, username, pw_result.message, email, f_name, l_name, function (result_db) {

                 if (result_db.result == "ERROR") {
                     logger.error("[USER] --> createUser - DB write error: " + result_db.message);
                     response.message = result_db.message;
                     response.result = "ERROR";
                     res.send(response);

                 } else {

                     response.message = "IoTronic user '" + username + "' (id = "+user_id+") successfully created!";
                     response.result = "SUCCESS";
                     logger.info("[USER] --> " +response.message);
                     res.send(JSON.stringify(response));

                 }

             });

         }


    });







};

user_utils.prototype.deleteUser = function (user_id, res) {

    logger.info("[USER] - Deleting IoTronic user with ID '" + user_id + "'...");

    var response = {
        message: '',
        result: ''
    };

    db.getUser(user_id, function (data) {

        if (data.result == "ERROR") {
            response.message = "Error getting user details: " + data.message;
            response.result = "ERROR";
            logger.error("[USER] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "IoTronic user with ID '" + user_id + "' does not exist!";
                logger.error("[USER] --> " + response.message);
                res.send(JSON.stringify(response));

            }
            else {

                var username = data.message[0].username;

                logger.info("[USER] --> deleting '" + username + "' IoTronic user.");

                db.deleteUser(user_id, function (data) {

                    if (data.result == "ERROR") {
                        response.message = "Error deleting IoTronic user: " + data.message;
                        response.result = "ERROR";
                        logger.error("[USER] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {
                        response.message = "IoTronic user '" + username + "' (id = "+user_id+") deleted.";
                        response.result = "SUCCESS";
                        logger.info("[USER] --> " + response.message);
                        res.send(JSON.stringify(response));
                    }

                });

            }



        }

    });


};

user_utils.prototype.updateUser = function (user_id, username, password, email, f_name, l_name, res) {

    logger.info("[USER] - Updating IoTronic user with ID " + user_id + "...");

    var response = {
        message: '',
        result: ''
    };

    db.getUser(user_id, function (data) {

        if (data.result == "ERROR") {
            response.message = "Error getting IoTronic user: " + data.message;
            response.result = "ERROR";
            logger.error("[USER] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "IoTronic user with ID '" + user_id + "' does not exist!";
                logger.error("[USER] --> " + response.message);
                res.send(JSON.stringify(response));

            }
            else {

                var user_to_update = data.message[0].username;
                logger.debug("[USER] --> IoTronic user to update: " + user_to_update);

                auth.encryptPassword(data.message[0].password, function(pw_result) {


                    if (pw_result.result == "ERROR") {
                        response.message = pw_result.message;
                        response.result = pw_result.result;
                        logger.error("[USER] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {

                        db.updateUser(user_id, username, pw_result.message, email, f_name, l_name, function (result_db) {

                            if (result_db.result == "ERROR") {
                                logger.error("[USER] --> updateUser - DB write error: " + result_db.message);
                                response.message = result_db.message;
                                response.result = "ERROR";
                                res.send(response);

                            } else {

                                response.message = "IoTronic user with ID " + user_id + " successfully updated!";
                                response.result = "SUCCESS";
                                logger.info("[USER] --> " +response.message);
                                res.send(JSON.stringify(response));

                            }

                        });


                    }



                });


            }

        }

    });


};


module.exports = user_utils;
