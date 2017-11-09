//###############################################################################
//##
//# Copyright (C) 2017 Nicola Peditto
//##
//# Licensed under the Apache License, Version 2.0 (the "License");
//# you may not use this file except in compliance with the License.
//# You may obtain a copy of the License at
//##
//# http://www.apache.org/licenses/LICENSE-2.0
//##
//# Unless required by applicable law or agreed to in writing, software
//# distributed under the License is distributed on an "AS IS" BASIS,
//# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//# See the License for the specific language governing permissions and
//# limitations under the License.
//##
//###############################################################################

var logger = log4js.getLogger('mng_user');
logger.setLevel(loglevel);

var Q = require("q");

var db_utils = require('./mng_db');
var db = new db_utils;
var board_utility = require('./mng_board');
var auth = require('./mng_auth');

var uuid = require('node-uuid');
var bcrypt = require('bcrypt');

user_utils = function (session, rest) {

    // User management APIs
    //---------------------------------------------------------------------------------------------------

    //GET users list
    /**
     * @swagger
     * /v1/users/:
     *   get:
     *     tags:
     *       - Users
     *     description: It returns IoTronic users list
     *     summary: get IoTronic users list
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: no authentication token specified.
     */
    rest.get('/v1/users/', function (req, res) {

        logger.info("[API] - users list called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        db.getUserList(function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting users list: " + data.message;
                response.result = "ERROR";
                logger.error("[USER] --> " + response.message);
                //res.send(JSON.stringify(response));
                res.status(500).send(response);

            } else {
                //res.send(JSON.stringify(data));
                res.status(200).send(data);

            }

        });

    });


    //get user info
    /**
     * @swagger
     * /v1/users/{user}:
     *   get:
     *     tags:
     *       - Users
     *     summary: get user details
     *     description: It returns user information
     *     produces:
     *       - application/json
     *     parameters:
     *      - in: path
     *        name: user
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic user ID
     *     responses:
     *       200:
     *         description: A Json IoTronic response
     *         schema:
     *           $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: no authentication token specified.
     */
    rest.get('/v1/users/:user', function (req, res) {

        logger.info("[API] - User info called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var user = req.params.user;

        var response = {
            message: '',
            result: ''
        };


        db.getUser(user, function (data) {

            if (data.result == "ERROR") {

                response.message = "Error getting user info: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                delete data.message[0]["password"]
                console.log(data.message[0])
                res.send(data);
            }

        });



    });


    //CREATE a IoTronic user
    /**
     * @swagger
     * /v1/users/:
     *   post:
     *     tags:
     *       - Users
     *     description:  Register new IoTronic user
     *     summary: create IoTronic user
     *     produces:
     *       - application/json
     *     parameters:
     *      -  name: body
     *         in: body
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - username
     *                  - password
     *                  - email
     *                  - f_name
     *                  - l_name
     *              properties:
     *                  username:
     *                      type: string
     *                  password:
     *                      type: string
     *                  email:
     *                      type: string
     *                  f_name:
     *                      type: string
     *                  l_name:
     *                      type: string
     *     responses:
     *       200:
     *         description: A Json IoTronic response
     *         schema:
     *           $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: no authentication token specified.
     */
    rest.post('/v1/users/', function (req, res) {

        logger.info("[API] - Create an IoTronic user - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var username = req.body.username;
        var password = req.body.password;
        var email = req.body.email;
        var f_name = req.body.f_name;
        var l_name = req.body.l_name;


        var APIparamsList= {"username":username, "email":email, "password":password};

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
    /**
     * @swagger
     * /v1/users/{user}:
     *   delete:
     *     tags:
     *       - Users
     *     description: Delete an IoTronic user
     *     summary: delete IoTronic user
     *     parameters:
     *      - in: path
     *        name: user
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic user ID
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: no authentication token specified.
     */
    rest.delete('/v1/users/:user', function (req, res) {

        logger.info("[API] - Delete IoTronic user - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var user_id = req.params.user;

        user_utils.prototype.deleteUser(user_id, res);

    });


    //UPDATE IoTronic user
    /**
     * @swagger
     * /v1/users/{user}:
     *   patch:
     *     tags:
     *       - Users
     *     description: Update an IoTronic user
     *     summary: update IoTronic user
     *     parameters:
     *      -  name: body
     *         in: body
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - username
     *                  - password
     *                  - email
     *                  - f_name
     *                  - l_name
     *              properties:
     *                  username:
     *                      type: string
     *                  password:
     *                      type: string
     *                  email:
     *                      type: string
     *                  f_name:
     *                      type: string
     *                  l_name:
     *                      type: string
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: no authentication token specified.
     */
    rest.patch('/v1/users/:user', function (req, res) {

        logger.info("[API] - Update IoTronic user - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

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

                        console.log("PASSWORD: " + password)

                        user_utils.prototype.updateUser(user_id, username, password, email, f_name, l_name, res);

                    }

                });

            }

        });


    });


    //GET IoTronic user details
    /**
     * @swagger
     * /v1/users/{user}:
     *   get:
     *     tags:
     *       - Users
     *     description: It returns user information
     *     summary: get user details
     *     parameters:
     *      - in: path
     *        name: user
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic user ID
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: no authentication token specified.
     */
    rest.get('/v1/users/:user', function (req, res) {

        logger.info("[API] - Get IoTronic user details - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

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
                     logger.error("[USER] --> createUser - DB write error: " + result_db.message.code);
                     if(result_db.message.code == "ER_DUP_ENTRY"){
                         response.message = "User '" + username + "' already exists!";
                     }

                     response.result = "ERROR";
                     res.send(JSON.stringify(response));

                 } else {

                     response.message = "IoTronic user '" + username + " successfully created!";
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
                response.message = "IoTronic user '"+username+"' with ID '" + user_id + "' does not exist!";
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
                        response.message = "IoTronic user '" + username + "' deleted.";
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

    logger.debug("[USER] - User info updated...");
    var update_params = [].slice.apply(arguments);
    update_params.splice(6, 1);
    logger.debug(update_params);

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

                if (password == undefined){

                    db.updateUser(user_id, username, data.message[0].password, email, f_name, l_name, function (result_db) {

                        if (result_db.result == "ERROR") {
                            logger.error("[USER] --> updateUser - DB write error: " + result_db.message);
                            response.message = result_db.message;
                            response.result = "ERROR";
                            res.send(response);

                        } else {

                            response.message = "IoTronic user '" + username + "' successfully updated!";
                            response.result = "SUCCESS";
                            logger.info("[USER] --> " +response.message);
                            res.send(JSON.stringify(response));

                        }

                    });

                }else{

                    auth.encryptPassword(password, function(pw_result) {

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

                                    response.message = "IoTronic user '" + username + "' successfully updated!";
                                    response.result = "SUCCESS";
                                    logger.info("[USER] --> " +response.message);
                                    res.send(JSON.stringify(response));

                                }

                            });


                        }

                    });

                }




            }

        }

    });


};


module.exports = user_utils;
