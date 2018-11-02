//###############################################################################
//##
//# Copyright (C) 2017-2018 Nicola Peditto
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

var logger = log4js.getLogger('mng_auth');
logger.setLevel(loglevel);

var Q = require("q");

var db_utils = require('./mng_db');
var db = new db_utils;
var wamp = require('./mng_wamp');


var uuid = require('node-uuid');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');


auth = function (session, rest) {

    // Auth management APIs
    //---------------------------------------------------------------------------------------------------

    /**
     * @swagger
     * definitions:
     *   IoTronicAuthMessage:
     *      type: object
     *      properties:
     *       token:
     *         type: string
     *         description: "Authentication token released by IoTronic"
     *       expire:
     *         type: string
     *         description: "token expiration time"
     *       log:
     *         type: string
     *         description: "IoTronic response message"
     *
     */
    
    // User Authentication: the registered user obtains an authentication token to use APIs
    /**
     * @swagger
     * /v1/auth/:
     *   post:
     *     tags:
     *       - Authentication
     *     summary: Get IoTronic authorization token
     *     description: "The authorization token is needed to perform any subsequent call to the IoTronic API. The user should provide her credentials in the body of the request specifying her username and password."
     *     produces:
     *       - application/json
     *     parameters:
     *      -  name: body
     *         in: body
     *         description: "Credentials for authentication to the IoTronic API."
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - username
     *                  - password
     *              properties:
     *                  username:
     *                      type: string
     *                  password:
     *                      type: string
     *     responses:
     *       200:
     *         description: "Authentication successfully performed: IoTronic replies with an authorization token also specifying its validity."
     *         properties:
     *                  message:
     *                      $ref: "#/definitions/IoTronicAuthMessage"
     *                  result:
     *                      type: string
     *       403:
     *         description: "Authentication failed."
     *       500:
     *         description: "API specific error message."
     */
    rest.post('/v1/auth/',function(req, res){

        var message;

        var response = {
            message: '',
            result: ''
        };

        db.getUserList(function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting users list: " + data.message;
                response.result = "ERROR";
                logger.error("[USER] --> " + response.message);
                res.status(500).send(response);

            } else {

                var users = data.message;

                var selected_user = users.findByValueOfObject("username", req.body.username);

                if (selected_user.length === 0 || selected_user[0].username != "admin"){

                    logger.error("[USER] - Token request failed: wrong user " + req.body.username);
                    message="Wrong user";
                    res.status(403).json({
                        message:{log:message},
                        result:"ERROR"
                    });

                }else{

                    var selected_user = selected_user[0];

                    logger.info("[USER] - Token request from user: " + selected_user.username);

                    checkPassword(req.body.password, selected_user.password).then( function (pw_result) {

                        if (pw_result.result == "SUCCESS"){

                            //create the token.
                            expire_time = nconf.get('config:server:auth:expire_time');
                            encryptKey = nconf.get('config:server:auth:encryptKey');
                            var user = JSON.stringify(selected_user);
                            var token = jwt.sign(JSON.parse(user), encryptKey, { expiresIn: expire_time}); //expiresIn: expressed in seconds or a string describing a timespan: Eg: 60, "30m", "2 days", "10h", "7d"
                            logger.debug("[USER] --> token generated for '"+selected_user.username+"':\n" + token);

                            logger.info("[USER] --> User '" + selected_user.username + "' got token successfully!");
                            message="Authentication Success: token generated.";

                            res.status(200).json({
                                message:{token:token, log:message, expire: expire_time},
                                result:"SUCCESS"
                            });

                        }else{
                            message="Wrong password";
                            logger.error("[USER] --> " + message + " for user '" + selected_user.username +"'");
                            res.status(403).json({
                                message:{log:message},
                                result:"ERROR"
                            });
                        }

                    });


                }




            }

        });
        


    });


    logger.debug("[REST-EXPORT] - Authentication management APIs exposed!");


};



var checkAuthorization = function (board_id, callback) {

    var response = {
        message: '',
        result: ''
    };


    if( auth_lr_mode == "basic" ){

        db.checkBoard(board_id, function (data) {

            if (data.result == "ERROR") {

                logger.error("[SYSTEM] --> " + data.message);

                response.message = data.message;
                response.result = 'ERROR';

                callback(response);

            } else {

                //console.log(data.message[0].status);

                if (data.message.length == 0) {

                    // Board not registered in Iotronic

                    logger.warn("[SYSTEM] - A not registered board has tried connecting to Iotronic!");

                    response.message = "Board with UUID '"+board_id+"' not authorized!";
                    response.result = 'REJECTED';


                    callback(response);
                    
                }
                else if (data.message[0].status == "C"){

                    logger.warn("[SYSTEM] - This board '"+board_id+"' is already connected to Iotronic!");

                    response.message = "Board with UUID '"+board_id+"' is already connected!";
                    response.result = 'REJECTED';

                    callback(response);

                }
                else {

                    // Board registered in Iotronic
                    logger.info("[SYSTEM] --> Board with UUID '"+board_id+"' is authorized!");

                    //logger.info("[SYSTEM] - Access granted for board " + board_id);

                    wamp.computeStatus(board_id, data.message[0].state, function (confStatus) {

                        if(confStatus.result == "SUCCESS"){

                            response.message = confStatus.message;
                            response.result = 'SUCCESS';

                            callback(response);


                        }else{

                            logger.error("[SYSTEM] --> " + confStatus.message);

                            response.message = confStatus.message;
                            response.result = 'ERROR';

                            callback(response);


                        }

                    });


                }

            }

        });

    }


};



Array.prototype.findByValueOfObject = function(key, value) {
    return this.filter(function(item) {
        return (item[key] === value);
    });
};


var encryptPassword = function (user_pw, callback) {

    var response = {
        message: '',
        result: ''
    };

    bcrypt.hash(user_pw, 5, function(err, bcryptedPassword) {

        if (err) {
            response.message = "Error encrypting user password: " + err.message;
            response.result = "ERROR";
            callback(response);

        } else {
            response.message = bcryptedPassword;
            response.result = "SUCCESS";
            callback(response);
        }

    });


};


var checkPassword = function(user_pw, crypted_pw) {

    var response = {
        message: '',
        result: ''
    };

    var d = Q.defer();
    
    bcrypt.compare(user_pw, crypted_pw, function(err, result){
        if (result){
            //authorized
            response.message = "password is correct";
            response.result = "SUCCESS";
            d.resolve(response);
        }else{
            //no authorized
            response.message = "password is not correct";
            response.result = "ERROR";
            d.resolve(response);
        }
    });

    return d.promise;

};

module.exports = auth;
module.exports.checkPassword = checkPassword;
module.exports.encryptPassword = encryptPassword;
module.exports.checkAuthorization = checkAuthorization;