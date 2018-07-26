//###############################################################################
//##
//# Copyright (C) 2016-2018 Nicola Peditto
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

var logger = log4js.getLogger('mng_board');
logger.setLevel(loglevel);

var db_utils = require('./mng_db');
var db = new db_utils;

var fs = require("fs");
var Q = require("q");

var project_utils = require('./mng_project');
var request_utils = require('./mng_request');
var auth = require('./mng_auth');


var session_wamp;



board_utils = function (session, rest) {

    session_wamp = session;

    // BOARDS MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //get boards list
    /**
     * @swagger
     * /v1/boards/:
     *   get:
     *     tags:
     *       - Boards
     *     description: It returns IoTronic boards list
     *     summary: get IoTronic boards list
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: List of boards
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of boards"
     *                  items:
     *                      title: board info
     *                      type: object
     *                      properties:
     *                          board_id:
     *                              type: string
     *                              description: "The IoTronic board ID"
     *                          label:
     *                              type: string
     *                              description: "Board label"
     *                          session_id:
     *                              type: string
     *                              description: "WAMP session id ('null' if the board is disconnected)"
     *                          status:
     *                              type: string
     *                              description: "[ 'C' | 'D' ] specify if the board is connected or not"
     *                          latest_update:
     *                              type: string
     *                              description: "timestamp of the latest board update"
     *                          layout_id:
     *                              type: integer
     *                              description: "Board layout ID [ 1 -> Arduino YUN | 2 -> generic server | 3 -> Raspberry Pi]"
     *                          description:
     *                              type: string
     *                              description: "Board description"
     *                          net_enabled:
     *                              type: string
     *                              description: "Flag [true | false] indicates if the board is VNET enabled"
     *                          project_id:
     *                              type: string
     *                              description: "IoTronic project ID"
     *                          user_id:
     *                              type: string
     *                              description: "IoTronic user ID"
     *                          mobile:
     *                              type: string
     *                              description: "Flag [0 | 1] specifies if the board is mobile or not"
     *                          position_refresh_time:
     *                              type: integer
     *                              description: "sending position rate (seconds)"
     *                          notify:
     *                              type: string
     *                              description: "Flag [true | false] indicates if the notification system is enabled for this board"
     *                          notify_rate:
     *                              type: integer
     *                              description: "notification sending rate in seconds"
     *                          notify_retry:
     *                              type: integer
     *                              description: "number of notifications retry"
     *                          extra:
     *                              type: object
     *                              description: "User defined extra data in JSON format"
     *                          coordinates_id:
     *                              type: integer
     *                              description: "latest position ID"
     *                          latitude:
     *                              type: number
     *                              description: "Board latitude"
     *                          longitude:
     *                              type: number
     *                              description: "Board longitude"
     *                          altitude:
     *                              type: number
     *                              description: "Board altitude"
     *                          timestamp:
     *                              type: "string"
     *                              description: "timestamp of the latest board position"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/boards/', function (req, res) {

        logger.info("[API] - Boards list called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        var project = req.query.project;

        db.getBoardsList(project, function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting boards list: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.status(500).send(response);

            } else {
                res.status(200).send(data);
            }

        });

    });

    //get board info
    /**
     * @swagger
     * /v1/boards/{board}:
     *   get:
     *     tags:
     *       - Boards
     *     summary: get board details
     *     description: It returns board information
     *     produces:
     *       - application/json
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic board ID
     *     responses:
     *       200:
     *          description: Board information
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: object
     *                  properties:
     *                      info:
     *                        type: object
     *                        properties:
     *                          board_id:
     *                              type: string
     *                              description: "The IoTronic board ID"
     *                          label:
     *                              type: string
     *                              description: "Board label"
     *                          status:
     *                              type: string
     *                              description: "[ 'C' | 'D' ] specify if the board is connected or not"
     *                          latest_update:
     *                              type: string
     *                              description: "timestamp of the latest board update"
     *                          description:
     *                              type: string
     *                              description: "Board description"
     *                          net_enabled:
     *                              type: string
     *                              description: "Flag [true | false] indicates if the board is VNET enabled"
     *                          project:
     *                              type: string
     *                              description: "IoTronic project name"
     *                          user:
     *                              type: string
     *                              description: "IoTronic user name"
     *                          mobile:
     *                              type: string
     *                              description: "Flag [0 | 1] specifies if the board is mobile or not"
     *                          position_refresh_time:
     *                              type: integer
     *                              description: "sending position rate (seconds)"
     *                          notify:
     *                              type: string
     *                              description: "Flag [true | false] indicates if the notification system is enabled for this board"
     *                          notify_rate:
     *                              type: integer
     *                              description: "notification sending rate in seconds"
     *                          notify_retry:
     *                              type: integer
     *                              description: "number of notifications retry"
     *                          extra:
     *                              type: object
     *                              description: "User defined extra data in JSON format"
     *                          layout_id:
     *                              type: string
     *                              description: "device layout ID"
     *                          layout:
     *                              type: string
     *                              description: "Iotronic device layout"
     *                          model:
     *                              type: string
     *                              description: "device model name"
     *                          manufacturer:
     *                              type: string
     *                              description: "device manufacturer name"
     *                          image:
     *                              type: string
     *                              description: "OS distribution image used by device"
     *                          coordinates:
     *                              type: object
     *                              description: "latest position ID"
     *                              properties:
     *                                  latitude:
     *                                      type: number
     *                                      description: "Board latitude"
     *                                  longitude:
     *                                      type: number
     *                                      description: "Board longitude"
     *                                  altitude:
     *                                      type: number
     *                                      description: "Board altitude"
     *                                  timestamp:
     *                                      type: "string"
     *                                      description: "timestamp of the latest board position"
     *                      sensors:
     *                          type: array
     *                          description: "List of sensors installed in the board"
     *                          items:
     *                              title: sensor information
     *                              type: object
     *                      plugins:
     *                          type: array
     *                          description: "List of plugins injected in the board"
     *                          items:
     *                              title: plugin information
     *                              type: object
     *                      drivers:
     *                          type: array
     *                          description: "List of drivers mounted on the board"
     *                          items:
     *                              title: driver information
     *                              type: object
     *                      services:
     *                          type: array
     *                          description: "List of services exposed by the board"
     *                          items:
     *                              title: sensor information
     *                              type: object
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."

     */
    rest.get('/v1/boards/:board', function (req, res) {

        logger.info("[API] - Board info called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        var response = {
            message: '',
            result: ''
        };

        checkBoardExists(board, res, function (available) {

            if (available.result == "SUCCESS") {

                db.BoardInfo(board, function (data) {

                    if (data.result == "ERROR") {
                        response.message = "Error getting board info: " + data.message;
                        response.result = "ERROR";
                        logger.error("[SYSTEM] --> " + response.message);
                        res.status(500).send(response);

                    } else {
                        res.status(200).send(data);
                    }

                });

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }


        });
        
    });

    //create board
    /**
     * @swagger
     * /v1/boards/:
     *   post:
     *     tags:
     *       - Boards
     *     description:  Register new IoTronic board
     *     summary: create IoTronic board
     *     produces:
     *       - application/json
     *     parameters:
     *      -  name: body
     *         in: body
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - board_id
     *                  - board_label
     *                  - latitude
     *                  - longitude
     *                  - altitude
     *                  - net_enabled
     *                  - sensorslist
     *                  - extra
     *                  - layout_id
     *                  - description
     *                  - mobile
     *                  - position_refresh_time
     *                  - project_id
     *                  - user_id
     *                  - notify
     *                  - notify_rate
     *                  - notify_retry
     *              properties:
     *                  board_id:
     *                      type: string
     *                      description: "The IoTronic board ID"
     *                  board_label:
     *                      type: string
     *                      description: "Board label"
     *                  password:
     *                      type: string
     *                      description: "Board password: used only in 'password' authentication mode and if it is not specified Iotronic will generate a random password (alphanumeric 36 chars long)."
     *                  pubkey:
     *                      type: string
     *                      description: "Board password: used only in 'certs' authentication mode and if it is not specified Iotronic return an error."
     *                  latitude:
     *                      type: number
     *                      description: "Board latitude"
     *                  longitude:
     *                      type: number
     *                      description: "Board longitude"
     *                  altitude:
     *                      type: number
     *                      description: "Board altitude"
     *                  net_enabled:
     *                      type: string
     *                      description: "Flag [true | false] to enable VNET on the board"
     *                  sensorslist:
     *                      type: string
     *                      description: "Sensor list id sensors comma separeted (e.g. 1,2,3,4, etc)"
     *                  extra:
     *                      type: object
     *                      description: "User defined extra data in JSON format"
     *                  layout_id:
     *                      type: integer
     *                      description: "Board layout ID [ 1 -> Arduino YUN | 2 -> generic server | 3 -> Raspberry Pi]"
     *                  description:
     *                      type: string
     *                      description: "Board description (300 chars)"
     *                  mobile:
     *                      type: string
     *                      description: "Flag [0 | 1] to specify if the board is mobile or not"
     *                  position_refresh_time:
     *                      type: integer
     *                      description: "[NOT USED YET] sending position rate in seconds"
     *                  project_id:
     *                      type: string
     *                      description: "IoTronic project ID"
     *                  user_id:
     *                      type: string
     *                      description: "IoTronic user ID"
     *                  notify:
     *                      type: string
     *                      description: "Flag [true | false] to enable|disable notifications about the board"
     *                  notify_rate:
     *                      type: integer
     *                      description: "notification sending rate in seconds"
     *                  notify_retry:
     *                      type: integer
     *                      description: "number of notifications retry"
     *     responses:
     *       200:
     *         description: A Json IoTronic response
     *         schema:
     *           $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.post('/v1/boards/', function (req, res) {

        var response = {
            result: '',
            message: ''
        };

        var board_id = req.body.board_id;
        var board_label = req.body.board_label;
        var description = req.body.description;

        var latitude = req.body.latitude;
        var longitude = req.body.longitude;
        var altitude = req.body.altitude;
        var position_refr_time = req.body.position_refresh_time;

        var net_enabled = req.body.net_enabled;
        var sensorslist = req.body.sensorslist;
        var layout_id = req.body.layout_id;
        var mobile = req.body.mobile;

        var project_id = req.body.project_id;
        var user_id = req.body.user_id;

        var notify = req.body.notify;
        var notify_rate = req.body.notify_rate;
        var notify_retry = req.body.notify_retry;

        var extra = req.body.extra;

        var b_pub_key = req.body.pubkey;
        if(b_pub_key == undefined) b_pub_key = "";
        var b_pw = req.body.password;
        if(b_pw == undefined) b_pw = "";

        var ApiRequired= { "board_id":board_id, "board_label":board_label, "latitude":latitude, "longitude":longitude, "altitude":altitude,
            "net_enabled":net_enabled, "layout_id":layout_id, "user_id":user_id, "project_id":project_id, "mobile":mobile, "position_refr_time":position_refr_time, 
            "notify":notify, "notify_rate":notify_rate, "notify_retry":notify_retry};

        checkRequired(ApiRequired, function (check){

            if(check.result == "ERROR"){

                res.status(500).send(check);

            }else {


                if(net_enabled != "true" && net_enabled != "false"){
                    response.message = "Board creation: wrong value of net-enabled flag: [ true | false ] - Specified: "+ net_enabled;
                    response.result = "ERROR";
                    logger.error("[SYSTEM] --> " + response.message);
                    res.status(500).send(response);

                }else if(mobile != "true" && mobile != "false"){
                    response.message = "Board creation: wrong value of mobile flag: [ true | false ] - Specified: "+ net_enabled;
                    response.result = "ERROR";
                    logger.error("[SYSTEM] --> " + response.message);
                    res.status(500).send(response);

                }else{

                    try {

                        logger.debug("[SYSTEM] - New board '" + board_label + "' (ID: " + board_id + ")");
                        //logger.debug("[SYSTEM] - New board '" + board_label + "' (ID: " + board_id + ") - registration parameters:\n" + JSON.stringify(req.body, null, "\t"));


                        if(extra == undefined)
                            extra = '{}';

                        auth.computeCredentials(b_pw, b_pub_key, function(credentials) {

                            if (credentials.result == "ERROR") {
                                
                                response.message = credentials.message;
                                response.result = credentials.result;
                                logger.error("[SYSTEM] --> " + response.message);
                                res.status(500).send(response);

                            } else {

                                var hash_b_pw = credentials.hash_pw;
                                var b_pub_key = credentials.pub_key;

                                db.regBoard(board_id, board_label, latitude, longitude, altitude, net_enabled, sensorslist, layout_id, description,
                                    extra, project_id, user_id, mobile, position_refr_time, notify, notify_rate, notify_retry, b_pub_key, hash_b_pw,

                                    function (db_result) {

                                        if (db_result.result === "SUCCESS") {

                                            logger.info("[SYSTEM] --> Registration of board '" + board_id + "' successfully completed!");
                                            db_result.password = b_pw;

                                            res.status(200).send(db_result);

                                        } else {
                                            res.status(500).send(db_result);
                                        }


                                    }

                                );

                            }

                        });




                    }
                    catch (err) {

                        response.result = "ERROR";
                        response.message = err.toString();
                        logger.error('[SYSTEM] - ' + response.message);
                        res.status(500).send(response);

                    }


                }
                        

            }

        });






    });

    //update board
    /**
     * @swagger
     * /v1/boards/{board}:
     *   patch:
     *     tags:
     *       - Boards
     *     description: Update an IoTronic board
     *     summary: update IoTronic board
     *     parameters:
     *      -  name: body
     *         in: body
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - board_label
     *                  - latitude
     *                  - longitude
     *                  - altitude
     *                  - net_enabled
     *                  - sensorslist
     *                  - extra
     *                  - layout_id
     *                  - description
     *                  - mobile
     *                  - position_refresh_time
     *                  - project_id
     *                  - user_id
     *                  - notify
     *                  - notify_rate
     *                  - notify_retry
     *              properties:
     *                  board_label:
     *                      type: string
     *                      description: "Board label"
     *                  password:
     *                      type: string
     *                      description: "Board password: used only in 'password' authentication mode and if it is specified Iotronic will update the existing password."
     *                  pubkey:
     *                      type: string
     *                      description: "Board password: used only in 'certs' authentication mode."
     *                  latitude:
     *                      type: number
     *                      description: "Board latitude"
     *                  longitude:
     *                      type: number
     *                      description: "Board longitude"
     *                  altitude:
     *                      type: number
     *                      description: "Board altitude"
     *                  net_enabled:
     *                      type: string
     *                      description: "Flag [true | false] to enable VNET on the board"
     *                  sensorslist:
     *                      type: string
     *                      description: "Sensor list id sensors comma separeted (e.g. 1,2,3,4, etc)"
     *                  extra:
     *                      type: object
     *                      description: "User defined extra data in JSON format"
     *                  layout_id:
     *                      type: integer
     *                      description: "Board layout ID [ 1 -> Arduino YUN | 2 -> generic server | 3 -> Raspberry Pi]"
     *                  description:
     *                      type: string
     *                      description: "Board description (300 chars)"
     *                  mobile:
     *                      type: string
     *                      description: "Flag [0 | 1] to specify if the board is mobile or not"
     *                  position_refresh_time:
     *                      type: integer
     *                      description: "[NOT USED YET] sending position rate in seconds"
     *                  project_id:
     *                      type: string
     *                      description: "IoTronic project ID"
     *                  user_id:
     *                      type: string
     *                      description: "IoTronic user ID"
     *                  notify:
     *                      type: string
     *                      description: "Flag [true | false] to enable|disable notifications about the board"
     *                  notify_rate:
     *                      type: integer
     *                      description: "notification sending rate in seconds"
     *                  notify_retry:
     *                      type: integer
     *                      description: "number of notifications retry"
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.patch('/v1/boards/:board', function (req, res) {

        var board = req.params.board;

        checkBoardAvailable(board, res, function (available) {

            if (available.result != "ERROR") {
                
                var board_label = req.body.board_label;
                var description = req.body.description;
                var extra = req.body.extra;
                
                var state = req.body.state;

                var latitude = req.body.latitude;
                var longitude = req.body.longitude;
                var altitude = req.body.altitude;
                var position_refr_time = req.body.position_refresh_time;

                var net_enabled = req.body.net_enabled;
                var sensorslist = req.body.sensorslist;
                var layout_id = req.body.layout_id;
                var mobile = req.body.mobile;

                var project_id = req.body.project_id;
                var user_id = req.body.user_id;

                var notify = req.body.notify;
                var notify_rate = req.body.notify_rate;
                var notify_retry = req.body.notify_retry;

                var b_pub_key = req.body.pubkey;
                var b_pw = req.body.password;
                
                var response = {
                    result: "",
                    message: ""
                };

                logger.info("[SYSTEM] - BOARD " + board_label + " (" + board + ") UPDATING...");
                //logger.debug("[SYSTEM] --> New configuration\n" + JSON.stringify(req.body, null, "\t"));
                //logger.debug(extra);

                var ApiRequired = {
                    "board_label":board_label, "latitude":latitude, "longitude":longitude, "altitude":altitude,
                    "net_enabled":net_enabled, "layout_id":layout_id, "user_id":user_id, "project_id":project_id, "mobile":mobile, "position_refr_time":position_refr_time,
                    "notify":notify, "notify_rate":notify_rate, "notify_retry":notify_retry, "state":state
                };

                checkRequired(ApiRequired, function (check){

                    if(check.result == "ERROR"){

                        res.status(500).send(check);

                    }else {

                        if(extra == undefined)
                            extra = '{}';

                        if (state != "new" && state != "registered"){

                            response.message = "Registration status '" + state + "' is not supported: [ 'new' | 'registered' ]";
                            response.result = "ERROR";
                            logger.error("[SYSTEM] --> " + response.message);
                            res.status(500).send(response);

                        }
                        else{

                            auth.updateCredentials(b_pw, b_pub_key, function(credentials) {

                                if (credentials.result == "ERROR") {
                                    response.message = credentials.message;
                                    response.result = credentials.result;
                                    logger.error("[USER] --> " + response.message);
                                    res.status(500).send(response);

                                } else {

                                    var hash_b_pw = credentials.hash_pw;
                                    var b_pub_key = credentials.pub_key;

                                    db.updateBoard(board, board_label, latitude, longitude, altitude, net_enabled, sensorslist, layout_id, description, 
                                        extra, project_id, user_id, mobile, position_refr_time, notify, notify_rate, notify_retry, state, b_pub_key, hash_b_pw,
                                        function (db_result) {

                                            if (db_result.result == "ERROR") {
                                                logger.error("[SYSTEM] --> " + db_result.message);
                                                res.status(500).send(db_result);

                                            } else {

                                                var position = {
                                                    "altitude": altitude,
                                                    "longitude": longitude,
                                                    "latitude": latitude
                                                };

                                                db.checkBoardConnected(board, function (check_result) {

                                                    if (check_result.result == "ERROR") {

                                                        response.result = check_result.result;
                                                        response.message = "DB checkBoardConnected error for board " + board + ": " + check_result.message;
                                                        logger.error("[SYSTEM] --> " + response.message);
                                                        res.status(500).send(response);

                                                    } else {

                                                        var status = check_result.message[0].status;

                                                        if (status === "C") {

                                                            logger.debug("[SYSTEM] - RPC call towards: 's4t." + board + "'.board.setBoardPosition \n with parameters: " + JSON.stringify(position));

                                                            var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
                                                            var localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
                                                            position.timestamp=localISOTime;

                                                            session.call('s4t.' + board + '.board.setBoardPosition', [position]).then(

                                                                function (conf_result) {
                                                                    response.message = db_result.message + " - " + conf_result;
                                                                    response.result = "SUCCESS";
                                                                    res.status(200).send(response);
                                                                },
                                                                function (rpc_error) {

                                                                    response.message = "RPC UNAVAILABLE: " + rpc_error.error;
                                                                    response.result = "WARNING";
                                                                    logger.warn("[SYSTEM] - RPC UNAVAILABLE: " + rpc_error.error);
                                                                    res.status(200).send(response);

                                                                }

                                                            );

                                                        } else {

                                                            response.message = db_result.message + " - !!! WARNING: REMOTE BOARD CONFIGURATION NOT UPDATED !!!";
                                                            response.result = "WARNING";

                                                            res.status(200).send(response);
                                                        }

                                                    }


                                                });


                                            }


                                        }

                                    );
                                    

                                }

                            });




                            
                            
                        }


                    }

                });


            }

        });



    });

    //delete board
    /**
     * @swagger
     * /v1/boards/{board}:
     *   delete:
     *     tags:
     *       - Boards
     *     description: Delete an IoTronic board
     *     summary: delete IoTronic board
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic board ID
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.delete('/v1/boards/:board', function (req, res) {

        var board = req.params.board;

        logger.info("[SYSTEM] - UNREGISTERING BOARD " + board + "...");

        var response = {
            message: '',
            result: ''
        };
        
        db.unRegBoard(board, function (data) {

            if (data.result == "ERROR") {
                response.message = "Error unregistering board: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.status(500).send(response);

            } else {
                res.status(200).send(data);
            }

        });

    });

    //BATCH: delete board
    /**
     * @swagger
     * /v1/projects/{project}/boards:
     *   delete:
     *     tags:
     *       - Boards
     *     description: Delete boards of a project
     *     summary: delete project's boards
     *     parameters:
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic project ID or NAME
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.delete('/v1/projects/:project/boards', function (req, res) {

        var project = req.params.project;

        logger.info("[SYSTEM] - UNREGISTERING BOARDS of project " + project + "...");

        var response = {
            message: '',
            result: ''
        };

        db.getProject(project, function (data) {

            if (data.message[0] === undefined) {

                response.result = "ERROR";
                response.message = "IoTronic project '" + project + "' does not exist!";
                logger.error("[PROJECT] --> " + response.message);
                res.status(500).send(response);
            }
            else {

                if (data.result == "ERROR") {

                    response.message = "Error getting project details: " + data.message;
                    response.result = "ERROR";
                    logger.error("[PROJECT] --> " + response.message);
                    res.status(500).send(response);

                } else {

                    var project_id = data.message[0].uuid;

                    db.getProjectBoards(project_id, function (data) {

                        if (data.message[0] === undefined) {

                            response.result = "WARNING";
                            response.message = "There are not boards in the project '" + project + "'!";
                            logger.warn("[PROJECT] --> " + response.message);
                            res.status(200).send(response);
                        }
                        else {

                            if (data.result == "ERROR") {

                                response.message = "Error getting project's boards list: " + data.message;
                                response.result = "ERROR";
                                logger.error("[PROJECT] --> " + response.message);
                                res.status(500).send(response);

                            } else {

                                db.unRegProjectBoards(project_id, function (data) {

                                    if (data.result == "ERROR") {

                                        response.message = "Error unregistering project's boards: " + data.message;
                                        response.result = "ERROR";
                                        logger.error("[SYSTEM] --> " + response.message);
                                        res.status(500).send(response);

                                    } else {

                                        response.message = "Boards of the project " + project + " successfully unregistered.";
                                        response.result = data.result;
                                        logger.info("[SYSTEM] --> " + response.message);
                                        res.status(200).send(response);

                                    }

                                });


                            }

                        }

                    });




                }

            }

        });


    });

    //get sensors list
    /**
     * @swagger
     * /v1/sensors/:
     *   get:
     *     tags:
     *       - Boards
     *     description: It returns sensors list managed by IoTronic
     *     summary: get IoTronic sensors list
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: List of sensors
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of sensors"
     *                  items:
     *                      type: object
     *                      properties:
     *                          id:
     *                              type: string
     *                              description: "The IoTronic sensor ID"
     *                          type:
     *                              type: string
     *                              description: "sensor type (e.g. 'temperature')"
     *                          unit:
     *                              type: string
     *                              description: "measure unit (e.g. '°C')"
     *                          fabric_name:
     *                              type: string
     *                              description: "sensor fabric name."
     *                          model:
     *                              type: string
     *                              description: "sensor model"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/sensors/', function (req, res) {

        db.getSensorList(function (data) {

            logger.info("[SYSTEM] - Sensors list called.");

            var response = {
                message: '',
                result: ''
            };

            if (data.result == "ERROR") {
                response.message = "Error getting sensors list: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.status(500).send(response);

            } else {
                res.status(200).send(data);
            }

        });

    });

    //Execute action on board
    /**
     * @swagger
     * /v1/boards/{board}/action:
     *   post:
     *     tags:
     *       - Boards
     *     description: Perform an action on IoTronic board
     *     summary: perform action on a board
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic board ID
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - action
     *              properties:
     *                  action:
     *                      type: string
     *                      description: "supported actions: hostname, reboot, restart_lr"
     *                  parameters:
     *                      type: object
     *                      description: "JSON object where specify action arguments"
     *                  long_running:
     *                      type: boolean
     *                      description: "If 'false' the api will wait for action response; if 'true' Iotronic release a 'request-id' to be used to retrieve the response."
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.post('/v1/boards/:board/action', function (req, res) {

        var board = req.params.board;
        
        logger.info("[API] - Board Operation - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var action = req.body.action; // reboot | etc..
        var long_running = req.body.long_running;
        var parameters = req.body.parameters; // OPTIONAL
        
        if(long_running == "true")
            long_running = true;
        else if (long_running == undefined || long_running == "" || long_running == "false")
            long_running = false;

        var ApiRequired = {"action":action};

        checkRequired(ApiRequired, function (check) {

            if (check.result == "ERROR") {

                res.status(500).send(check);

            } else {

                if(long_running){
                    
                    var subject = "board action: " + action;
                    request_utils.singleRequest(board, subject, res, execActionOnBoard, [action, parameters, false]);

                }
                else{
                    var request_id = null;
                    execActionOnBoard(board, request_id, [action, parameters, res]);  
                }
          
                

            }

        });
        



    });

    //BATCH: Execute action on board
    /**
     * @swagger
     * /v1/projects/{project}/action:
     *   post:
     *     tags:
     *       - Boards
     *     description: Perform an action on IoTronic boards in a project
     *     summary: "perform action on project's boards"
     *     parameters:
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic project ID
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - action
     *              properties:
     *                  action:
     *                      type: string
     *                      description: "supported actions: hostname, reboot, restart_lr"
     *                  parameters:
     *                      type: object
     *                      description: "JSON object where specify action arguments"
     *                  long_running:
     *                      type: boolean
     *                      description: "If 'false' the api will wait for action response; if 'true' Iotronic release a 'request-id' to be used to retrieve the response."
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.post('/v1/projects/:project/boards/action', function (req, res) {

        logger.info("[API] - Batch - Board operation - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var project = req.params.project;
        var action = req.body.action; // reboot | etc..
        var parameters = req.body.parameters; // OPTIONAL

        var ApiRequired = {"action":action};

        checkRequired(ApiRequired, function (check) {

            if (check.result == "ERROR") {

                res.status(500).send(check);

            } else {

                var subject = "board action: " + action;

                request_utils.batchRequest(project, subject, res, execActionOnBoard, [action, parameters, false]);


            }

        });


    });
    
    //Add board position
    /**
     * @swagger
     * /v1/boards/{board}/position:
     *   post:
     *     tags:
     *       - Boards
     *     description: Add a new position of the board
     *     summary: add a new position of the board
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic board ID
     *      - in: body
     *        name: position
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - latitude
     *                  - longitude
     *                  - altitude
     *              properties:
     *                  latitude:
     *                      type: number
     *                  longitude:
     *                      type: number
     *                  altitude:
     *                      type: number
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.post('/v1/boards/:board/position', function (req, res) {

        var board_id = req.params.board;

        logger.info("[API] - Add board position - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var latitude = req.body.latitude;
        var longitude = req.body.longitude;
        var altitude = req.body.altitude;

        var ApiRequired= {"latitude":latitude, "longitude":longitude, "altitude":altitude};

        checkRequired(ApiRequired, function (check) {

            if (check.result == "ERROR") {

                res.status(500).send(check);

            } else {

                addBoardPosition(board_id, latitude, longitude, altitude, res);

            }

        });






    });

    //Get board position
    /**
     * @swagger
     * /v1/boards/{board}/position:
     *   get:
     *     tags:
     *       - Boards
     *     description: "It returns latest board position or its history:
     *     \n - if no query parameters are specified this API returns the latest position known.
     *     \n - if you specify 'samples' the API returns the latest number of samples specified.
     *     \n - if you specify 'hours' or 'days' or 'weeks' you will obtain the samples number window specified.
     *     "
     *     summary: get board position/history
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic board ID
     *      - in: query
     *        name: samples
     *        type: number
     *        description: "number of position samples to retieve."
     *        required: false
     *      - in: query
     *        name: hour
     *        type: number
     *        description: "samples retrieve window in hours."
     *        required: false
     *      - in: query
     *        name: day
     *        type: number
     *        description: "samples retrieve window in days."
     *        required: false
     *      - in: query
     *        name: week
     *        type: number
     *        description: "samples retrieve window in weeks."
     *        required: false
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: "Coordinates list"
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "Coordinates list"
     *                  items:
     *                      type: object
     *                      properties:
     *                          latitude:
     *                              type: number
     *                              description: "Board latitude"
     *                          longitude:
     *                              type: number
     *                              description: "Board longitude"
     *                          altitude:
     *                              type: number
     *                              description: "Board altitude"
     *                          timestamp:
     *                              type: "string"
     *                              description: "timestamp at that position"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/boards/:board/position', function (req, res) {

        var board_id = req.params.board;

        var samples = req.query.samples;

        var hours = req.query.hours;
        var days = req.query.days;
        var weeks = req.query.weeks;

        var response = {
            message: {},
            result: ""
        };


        logger.info("[API] - Get board position - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        if (samples != undefined && hours == undefined && days == undefined && weeks == undefined) {

            // Get last X samples
            db.getBoardPosition(board_id, samples, function (data) {

                if (data.result == "ERROR") {
                    response.message = "Error getting board position: " + data.message;
                    response.result = "ERROR";
                    logger.error("[SYSTEM] --> " + response.message);
                    res.status(500).send(response);

                } else {
                    res.status(200).send(data);
                }

            });

        }else if (samples == undefined && hours == undefined && days == undefined && weeks == undefined){

            //GET the last position

            db.getBoardPosition(board_id, 1, function (data) {

                if (data.result == "ERROR") {
                    response.message = "Error getting board position: " + data.message;
                    response.result = "ERROR";
                    logger.error("[SYSTEM] --> " + response.message);
                    res.status(500).send(response);

                } else {
                    res.status(200).send(data);
                }

            });

        }else if (samples == undefined || hours != undefined || days != undefined || weeks != undefined){

            //GET board position in a time window

            if (hours != undefined &&  days == undefined && weeks == undefined){
                var interval = hours + " HOUR";
            }else if (hours == undefined &&  days != undefined && weeks == undefined){
                var interval = days + " DAY";
            }else if (hours == undefined &&  days == undefined && weeks != undefined){
                var interval = weeks + " WEEK";
            }else{
                var interval = undefined;
            }

            if (interval != undefined){

                db.getBoardPositionHistory(board_id, interval, function (data) {

                    if (data.result == "ERROR") {
                        response.message = "Error getting board position: " + data.message;
                        response.result = "ERROR";
                        logger.error("[SYSTEM] --> " + response.message);
                        res.status(500).send(response);

                    } else {
                        res.status(200).send(data);
                    }

                });

            }else{
                response.message = "Specify only 'hour' or 'day' or 'week' parameter!";
                response.result = "ERROR";
                logger.error("[API] --> " + response.message);
                res.status(500).send(response);
            }


        }else{
            response.message = "Specify or 'samples' or ['hour' | 'day' | 'week'] parameter!";
            response.result = "ERROR";
            logger.error("[API] --> " + response.message);
            res.status(500).send(response);
        }








    });

    //get board configuration: create the settings.json board configuration file
    /**
     * @swagger
     * /v1/boards/{board}/conf:
     *   get:
     *     tags:
     *       - Boards
     *     summary: get settings.json board configuration file
     *     description: It returns board configuration file
     *     produces:
     *       - application/json
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic board ID
     *     responses:
     *       200:
     *          description: Board information
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: object
     *                  properties:
     *                      config:
     *                        type: object
     *                        description: "board configuration file"
     *
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/boards/:board/conf', function (req, res) {

        logger.info("[API] - Board conf called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        var response = {
            message: '',
            result: ''
        };

        checkBoardExists(board, res, function (available) {

            if (available.result == "SUCCESS") {


                createBoardConf(board, function (conf) {

                    if (conf.result == "ERROR") {
                        response.message = "Error getting board info: " + conf.message;
                        response.result = "ERROR";
                        logger.error("[SYSTEM] --> " + response.message);
                        res.status(500).send(response);

                    } else {

                        res.status(200).send(conf);

                    }


                });

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }


        });






    });

    //Inject board configuration
    /**
     * @swagger
     * /v1/boards/{board}/conf:
     *   put:
     *     tags:
     *       - Boards
     *     summary: inject board configuration to the board
     *     description: Inject board configuration to the board
     *     produces:
     *       - application/json
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic board ID
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.put('/v1/boards/:board/conf', function (req, res) {

        logger.info("[API] - Board conf called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        var response = {
            message: '',
            result: ''
        };


        checkBoardExists(board, res, function (available) {

            if (available.result == "SUCCESS") {
                
                var request_id = null;
                board_utils.injectConf(board, request_id, [res]);
                
            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }


        });


    });

    //BATCH: Inject board configuration
    /**
     * @swagger
     * /v1/projects/{project}/conf:
     *   put:
     *     tags:
     *       - Boards
     *     summary: inject board configuration to the board of a project
     *     description: Inject board configuration to the board of a project
     *     produces:
     *       - application/json
     *     parameters:
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic project ID or NAME
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.put('/v1/projects/:project/boards/conf', function (req, res) {

        logger.info("[API] - Batch - Inject board conf called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var project = req.params.project;

        var response = {
            message: '',
            result: ''
        };

        var subject = "inject configuration";

        request_utils.batchRequest(project, subject, res, board_utils.injectConf, [false]);


    });



    //Manage package on board
    /**
     * @swagger
     * /v1/boards/{board}/package:
     *   post:
     *     tags:
     *       - Boards
     *     description: Manage packages on IoTronic board
     *     summary: manage packages on a board
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic board ID
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - pkg_mng
     *                  - pkg_mng_cmd
     *                  - pkg_name
     *              properties:
     *                  pkg_mng:
     *                      type: string
     *                      description: "package manager: 'apt', 'apt-get', 'pip', 'pip3', 'opkg'"
     *                  pkg_mng_cmf:
     *                      type: string
     *                      description: "package manager sub-command: 'install', 'update', 'remove', etc..."
     *                  pkg_name:
     *                      type: string
     *                      description: "package name"
     *                  pkg_opts:
     *                      type: string
     *                      description: "options supported by package managers, e.g. '-y', '--force', etc..."
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.post('/v1/boards/:board/package', function (req, res) {

        var board = req.params.board;

        logger.info("[API] - Manage package on board - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var action = "pkg_manager";
        var long_running = req.body.long_running;

        var pkg_mng = req.body.pkg_mng;
        var pkg_mng_cmd = req.body.pkg_mng_cmd;
        var pkg_opts = req.body.pkg_opts;
        var pkg_name = req.body.pkg_name;

        var parameters = {};
        parameters.pkg_mng = pkg_mng;
        parameters.pkg_mng_cmd = pkg_mng_cmd;
        parameters.pkg_opts = pkg_opts;
        parameters.pkg_name = pkg_name;

        if(long_running == "true")
            long_running = true;
        else if (long_running == undefined || long_running == "" || long_running == "false")
            long_running = false;

        var ApiRequired = {"pkg_mng":pkg_mng, "pkg_mng_cmd":pkg_mng_cmd, "pkg_name":pkg_name};

        checkRequired(ApiRequired, function (check) {

            if (check.result == "ERROR") {

                res.status(500).send(check);

            } else {

                if(long_running){

                    var subject = pkg_mng_cmd + " package " + pkg_name;
                    request_utils.singleRequest(board, subject, res, execActionOnBoard, [action, parameters, false]);

                }
                else{
                    var request_id = null;
                    execActionOnBoard(board, request_id, [action, parameters, res]);
                }



            }

        });

    });

    //BATCH: Manage package on board
    /**
     * @swagger
     * /v1/projects/{project}/package:
     *   post:
     *     tags:
     *       - Boards
     *     description: Manage packages on IoTronic boards in a project
     *     summary: "manage packages on project's boards"
     *     parameters:
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic project ID
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - pkg_mng
     *                  - pkg_mng_cmd
     *                  - pkg_name
     *              properties:
     *                  pkg_mng:
     *                      type: string
     *                      description: "package manager: 'apt', 'apt-get', 'pip', 'pip3', 'opkg'"
     *                  pkg_mng_cmf:
     *                      type: string
     *                      description: "package manager sub-command: 'install', 'update', 'remove', etc..."
     *                  pkg_name:
     *                      type: string
     *                      description: "package name"
     *                  pkg_opts:
     *                      type: string
     *                      description: "options supported by package managers, e.g. '-y', '--force', etc..."
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.post('/v1/projects/:project/boards/package', function (req, res) {

        logger.info("[API] - Batch - Board operation - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var project = req.params.project;
        var action = "pkg_manager";

        var pkg_mng = req.body.pkg_mng;
        var pkg_mng_cmd = req.body.pkg_mng_cmd;
        var pkg_opts = req.body.pkg_opts;
        var pkg_name = req.body.pkg_name;

        var parameters = {};
        parameters.pkg_mng = pkg_mng;
        parameters.pkg_mng_cmd = pkg_mng_cmd;
        parameters.pkg_opts = pkg_opts;
        parameters.pkg_name = pkg_name;

        var ApiRequired = {"pkg_mng":pkg_mng, "pkg_mng_cmd":pkg_mng_cmd, "pkg_name":pkg_name};

        checkRequired(ApiRequired, function (check) {

            if (check.result == "ERROR") {

                res.status(500).send(check);

            } else {

                var subject = pkg_mng_cmd + " package " + pkg_name;

                request_utils.batchRequest(project, subject, res, execActionOnBoard, [action, parameters, false]);


            }

        });


    });

    //Manage LR update
    /**
     * @swagger
     * /v1/boards/{board}/lr:
     *   post:
     *     tags:
     *       - Boards
     *     description: Manage Lightning-rod package on a board
     *     summary: manage Lightning-rod package
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic board ID
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - operation
     *              properties:
     *                  operation:
     *                      type: string
     *                      description: "You have to specify one of these two options: 'update' or 'revert' (to downgrade to the previous version)."
     *                  lr_version:
     *                      type: string
     *                      description: "ONLY for debian boards: Lightning-rod package version."
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.post('/v1/boards/:board/lr', function (req, res) {

        logger.info("[API] - Manage package on board - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;
        var lr_new_version = req.body.lr_version;
        var operation = req.body.operation;


        var response = {
            message: '',
            result: ''
        };


        switch (operation) {

            case 'update':

                db.BoardInfo(board, function (data) {

                    if (data.result == "ERROR") {

                        response.message = "Error getting board info: " + data.message;
                        response.result = "ERROR";
                        logger.error("[SYSTEM] --> " + response.message);
                        res.status(500).send(response);

                    } else {

                        var lr_version = data.message.info.lr_version;

                        if (lr_version == lr_new_version) {

                            response.message = "Warning: LR is already updated at this version: " + lr_version;
                            response.result = "WARNING";
                            logger.warn("[SYSTEM] --> " + response.message);
                            res.status(500).send(response);

                        }
                        else {

                            var distro = data.message.info.distro;

                            if (distro == "openwrt")
                                var pkg_mng = "opkg";
                            else if (distro == "debian")
                                var pkg_mng = "apt-get";
                            else {
                                response.message = "Error: wrong image distribution!";
                                response.result = "ERROR";
                                logger.error("[SYSTEM] --> " + response.message);
                                res.status(500).send(response);
                            }

                            var action = "update_lr";
                            var subject = "LR update";

                            request_utils.singleRequest(board, subject, res, updateLR, [action, lr_new_version, pkg_mng, operation, false]);

                        }


                    }

                });

                break;

            default:
                response.message = "LR operation '" + operation + "' not supported!";
                response.result = 'ERROR';
                logger.error("[SYSTEM] - " + response.message);
                res.status(500).send(response);
                break;

        }
        
    });

    //BATCH: Manage LR update
    /**
     * @swagger
     * /v1/projects/{project}/lr:
     *   post:
     *     tags:
     *       - Boards
     *     summary: Manage Lightning-rod package on the board of a project
     *     description: Manage Lightning-rod package on the board of a project
     *     produces:
     *       - application/json
     *     parameters:
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic project ID or NAME
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - operation
     *                  - distro
     *              properties:
     *                  operation:
     *                      type: string
     *                      description: "You have to specify one of these two options: 'update' or 'revert' (to downgrade to the previous version)."
     *                  lr_version:
     *                      type: string
     *                      description: "ONLY for debian boards: Lightning-rod package version."
     *                  distro:
     *                      type: string
     *                      description: "You have to specify one of these two options: 'openwrt' or 'debian'."
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.post('/v1/projects/:project/lr', function (req, res) {

        logger.info("[API] - Batch - Update LR called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var project = req.params.project;
        var lr_new_version = req.body.lr_version;
        var operation = req.body.operation;
        var distro = req.body.distro;

        var response = {
            message: '',
            result: ''
        };

        switch (operation) {

            case 'update':

                var subject = "LR update";
                var action = "update_lr";

                if (distro != "openwrt" && distro != "debian") {
                    response.message = "Error: wrong image distribution!";
                    response.result = "ERROR";
                    logger.error("[SYSTEM] --> " + response.message);
                    res.status(500).send(response);
                }
                else {

                    if (distro == "openwrt")
                        var pkg_mng = "opkg";
                    else if (distro == "debian")
                        var pkg_mng = "apt-get";

                    request_utils.batchRequest(project, subject, res, updateLR, [action, lr_new_version, pkg_mng, operation, false]);

                }

                break;

            default:

                response.message = "LR operation '" + operation + "' not supported!";
                response.result = 'ERROR';
                logger.error("[SYSTEM] - " + response.message);
                res.status(500).send(response);

                break;

        }


    });




    logger.debug("[REST-EXPORT] - Board's APIs exposed!");

    //---------------------------------------------------------------------------------------------------

    // Register RPC methods
    this.exportCommands(session_wamp)


};




var updateLR = function (board_id, request_id, args) {

    var response = {
        message: {},
        logs: "",
        result: ""
    };

    var lr_version = args[1];
    var pkg_mng = args[2];
    var operation = args[3];
    var res = args[4];
    

    checkBoardAvailable(board_id, res, function (available) {

        if (available.result == "SUCCESS") {

            session_wamp.call('s4t.' + board_id + '.board.updateLR', [lr_version, pkg_mng, operation]).then(

                function (rpc_response) {
                    
                    logger.info("[SYSTEM] --> On board '" + board_id + "' there is now this LR version: " + rpc_response.lr_version);

                    if (rpc_response.result == "ERROR") {

                        if(rpc_response.logs != undefined){
                            response.message = rpc_response.logs;

                        }else
                            response.message = rpc_response.message;

                        response.result = "ERROR";

                        if(res != false){
                            logger.error("[SYSTEM] --> Restart LR error on board '" + board_id + "': " + JSON.stringify(response.message));
                            res.status(500).send(response);
                        }
                        else{

                            request_utils.updateResult(request_id, board_id, response.result, response.message);

                        }

                    }
                    else {


                        db.changeBoardState(board_id, "updated", lr_version, function (response) {

                            if(response.result == "ERROR")
                                logger.error("[SYSTEM] - Error updating board state: " +response.message);
                            else {
                                logger.debug("[SYSTEM] - Board state '" + board_id + " set to 'updated'");


                                session_wamp.call('s4t.' + board_id + '.board.execAction', ["restart_lr", null]).then(

                                    function (restart_response) {

                                        if (restart_response.result == "ERROR") {

                                            if(restart_response.logs != undefined){
                                                response.message = rpc_response.logs + "\n\n" + restart_response.logs;

                                            }else
                                                response.message = rpc_response.message + "\n\n" + restart_response.message;

                                            response.result = "ERROR";

                                            if(res != false){
                                                logger.error("[SYSTEM] --> Restart LR error on board '" + board_id + "': " + JSON.stringify(response.message));
                                                res.status(500).send(response);
                                            }
                                            else{

                                                request_utils.updateResult(request_id, board_id, response.result, response.message);

                                            }


                                        }else {

                                            if(restart_response.logs != undefined){
                                                response.message = rpc_response.logs + "\n\n" + restart_response.logs;

                                            }else
                                                response.message = rpc_response.message + "\n\n" + restart_response.message;

                                            response.result = restart_response.result;

                                            if(res != false){
                                                logger.debug("[SYSTEM] --> Update LR result on board '" + board_id + "': " + response.message);
                                                res.status(200).send(response);
                                            }
                                            else{

                                                request_utils.updateResult(request_id, board_id, response.result, response.message);

                                            }

                                        }


                                    },
                                    function (rpc_error) {

                                        response.message = "RPC UNAVAILABLE: " + rpc_error.error;
                                        response.result = "WARNING";
                                        if(res != false){
                                            logger.warn("[SYSTEM] - RPC UNAVAILABLE: " + rpc_error.error);
                                            res.status(200).send(response);
                                        }
                                        else{

                                            request_utils.updateResult(request_id, board_id, response.result, response.message);

                                        }

                                    }

                                );


                            }

                        });
                        


                    }


                },
                function (rpc_error) {

                    response.message = "RPC UNAVAILABLE: " + rpc_error.error;
                    response.result = "WARNING";
                    if(res != false){
                        logger.warn("[SYSTEM] - RPC UNAVAILABLE: " + rpc_error.error);
                        res.status(200).send(response);
                    }
                    else{

                        request_utils.updateResult(request_id, board_id, response.result, response.message);

                    }

                }

            );

        }
        else if (available.result == "WARNING") {

            if(res != false){
                logger.warn("[API] --> " + available.message);
            }
            else{

                var result_msg = "board disconnected";

                request_utils.updateResult(request_id, board_id, available.result, result_msg);

            }

        }


    });







};



var addBoardPosition = function (board, latitude, longitude, altitude, res){
    
    var response = {
        message: {},
        result: ""
    };

    checkBoardExists(board, res, function (available) {

        if (available.result == "SUCCESS") {

            logger.debug("--> Board "+available.message.label+" (" + board + ") exists!");

            if (available.message.mobile == 1){

                db.addBoardPosition(board, latitude, longitude, altitude, function (data) {

                    if (data.result == "ERROR") {

                        response.result = data.result;
                        response.message = "DB addBoardPosition error for board " + board + ": " + data.message;
                        logger.error("[SYSTEM] --> " + response.message);
                        res.status(500).send(response);

                    } else {
                        response.result = data.result;
                        response.message = "New position added for board "+available.result.label+" (" + board + ").";
                        logger.info("[SYSTEM] --> " + response.message);
                        res.status(200).send(response);

                    }



                });

            }else{

                response.result = "WARNING";
                response.message = "Board "+available.message.label+" (" + board + ") is not mobile: you can not add a new position... update board data!";
                logger.error("[SYSTEM] --> " + response.message);
                res.status(200).send(response);

            }



        }else if(available.result == "WARNING") {
            logger.error("[API] --> " + available.message);
            res.status(200).send(available);
        }


    });


    
};

var execActionOnBoard = function (board_id, request_id, args) {

    var response = {
        message: {},
        logs: "",
        result: ""
    };

    var action = args[0];
    var parameters = args[1];
    var res = args[2];

    checkBoardAvailable(board_id, res, function (available) {

        if (available.result == "SUCCESS") {

            session_wamp.call('s4t.' + board_id + '.board.execAction', [action, parameters]).then(

                function (rpc_response) {

                    if (rpc_response.result == "ERROR") {

                        if(rpc_response.logs != undefined){
                            response.message = rpc_response.message;
                            response.logs = rpc_response.logs;

                        }else
                            response.message = rpc_response.message;

                        
                        response.result = "ERROR";

                        if(res != false){
                            logger.error("[SYSTEM] --> Action error on board '" + board_id + "': " + JSON.stringify(response.message));
                            res.status(500).send(response);
                        }
                        else{

                            request_utils.updateResult(request_id, board_id, response.result, response.message);

                        }


                    }else {

                        if(rpc_response.logs != undefined){
                            response.message = rpc_response.logs;

                        }else
                            response.message = rpc_response.message;

                        response.result = rpc_response.result;

                        if(res != false){
                            logger.debug("[SYSTEM] --> Action result on board '" + board_id + "': " + response.message);
                            res.status(200).send(response);
                        }
                        else{

                            request_utils.updateResult(request_id, board_id, response.result, response.message);

                        }

                    }


                },
                function (rpc_error) {

                    response.message = "RPC UNAVAILABLE: " + rpc_error.error;
                    response.result = "WARNING";
                    if(res != false){
                        logger.warn("[SYSTEM] - RPC UNAVAILABLE: " + rpc_error.error);
                        res.status(200).send(response);
                    }
                    else{

                        request_utils.updateResult(request_id, board_id, response.result, response.message);

                    }

                }

            );

        }
        else if (available.result == "WARNING") {

            if(res != false){
                logger.warn("[API] --> " + available.message);
                res.status(500).send(available);

            }
            else{

                var result_msg = "board disconnected";

                request_utils.updateResult(request_id, board_id, available.result, result_msg);

            }
            
        }


    });






    
};

var checkBoardAvailable = function (board, res, callback) {

    var response = {
        message: {},
        result: ""
    };

    db.checkBoardConnected(board, function (data) {

        if (data.result == "ERROR") {

            response.result = data.result;
            response.message = "DB checkBoardConnected error for board " + board + ": " + data.message;
            if(res != false){
                logger.error("[SYSTEM] --> " + response.message);
                res.status(500).send(response);
            }

        } else {

            if (data.message.length == 1) {

                if (data.message[0].status == 'D') {

                    response.result = "WARNING";
                    response.message = "Board '" + data.message[0].label + "' (" + board + ") is disconnected!";
                    callback(response);

                }
                else {

                    response.result = "SUCCESS";
                    response.message = "Board '" + data.message[0].label + "' (" + board + ") is connected!";
                    callback(response);

                }

            }
            else {
                
                response.result = "ERROR";
                response.message = "Board '" + board + "' doesn't exist!";
                if(res != false){
                    logger.error("[API] - " + response.message);
                    res.status(500).send(response);
                }

                callback(response);
                
            }
            
        }
        

    });
    
};

var checkBoardExists = function (board, res, callback) {

    var response = {
        message: {},
        result: ""
    };

    db.checkBoard(board, function (data) {

        if (data.result == "ERROR") {

            response.result = data.result;
            response.message = "DB checkBoard error for board " + board + ": " + data.message;
            logger.error("[SYSTEM] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message.length == 1) {

                    response.result = "SUCCESS";
                    response.message = data.message[0];
                    callback(response);

            }
            else {

                response.result = "ERROR";
                response.message = "Board '" + board + "' does not exist!";
                logger.error("[API] - " + response.message);
                res.status(500).send(response);

                callback(response);

            }

        }

    });

};

var checkBodyParams = function (req, callback){

    var response = {
        message: '',
        result: ''
    };
    
    var wrongParams = [];

    var restBodyParams = Object.keys( req.body );

    if (restBodyParams.length == 0){

        response.result = "ERROR";
        response.message = "No paramaters in your request!";
        logger.error("[API] ----> " + response.message);
        callback(response);

    }else{

        for (var i = 0; i < restBodyParams.length; i++) {

            (function (i) {

                var restValue = req.body[restBodyParams[i]];

                if (restValue == "") {
                    wrongParams.push(restBodyParams[i]);
                    response.result = "ERROR";
                }

                if (i === (restBodyParams.length - 1)) {

                    if (response.result == "ERROR"){

                        response.message = "The following parameters are not specified: " + wrongParams.toString();
                        logger.error("[API] ----> " + response.message);
                    }

                    logger.info("[API] --> Rest parameters analyzed...")
                    callback(response);

                }

            })(i);
        }

    }
    


};

var checkRequired  = function (APIparams, callback){

    var response = {
        message: '',
        result: ''
    };

    var wrongParams = [];

    var restBodyParams = Object.keys(APIparams);

    for (var i = 0; i < restBodyParams.length; i++) {

        (function (i) {

            var restValue = APIparams[restBodyParams[i]];

            if (restValue == undefined || restValue == "") {
                wrongParams.push(restBodyParams[i]);
                response.result = "ERROR";
            }

            if (i === (restBodyParams.length - 1)) {
                
                if (response.result == "ERROR"){

                    logger.info("[API] ----> Parameters required:");
                    logger.debug(APIparams);

                    response.message = "The following parameters are undefined or not specified: " + wrongParams.toString();
                    logger.error("[API] ----> " + response.message);
                }
                callback(response);
                
            }

        })(i);
    }


};

var createBoardConf = function (board_id, callback) {
    
    var response = {
        message: '',
        result: ''
    };

    db.BoardInfo(board_id, function (data) {

        if (data.result == "ERROR") {

            response.message = "Error getting board info: " + data.message;
            response.result = "ERROR";
            logger.error("[SYSTEM] --> " + response.message);
            callback(response);

        } else {

            var settings = JSON.parse(fs.readFileSync(IotronicHome+"/board_settings_template.json", 'utf8'));
            
            settings.config.board.label = data.message.info.label;
            settings.config.board.position = data.message.info.coordinates;

            response.message = settings;
            response.result = "SUCCESS";
            callback(response);

        }

    });
    

};


board_utils.prototype.isAlive = function (result) {

    var board_id = result[0];
    var d = Q.defer();

    var response = {
        message: 'Response for '+board_id +': IoTronic is alive!',
        result: 'SUCCESS'
    };
    
    d.resolve(response);

    return d.promise;
    
};

board_utils.prototype.injectConf = function (board_id, request_id, args){

    logger.info("[SYSTEM] - Injecting configuration into board '" + board_id + "'...");

    var response = {
        message: '',
        result: ''
    };

    var res = args[0];

    checkBoardAvailable(board_id, res, function (available) {

        if (available.result == "SUCCESS") {

            createBoardConf(board_id, function (conf) {

                if (conf.result == "ERROR") {

                    response.message = "Error getting board info: " + conf.message;
                    response.result = "ERROR";
                    if(res != false){
                        logger.error("[SYSTEM] --> " + response.message);
                        res.status(500).send(response);
                    }

                } else {

                    session_wamp.call('s4t.'+ board_id + '.board.updateConf', [conf]).then(

                        function (rpc_response) {

                            if(rpc_response.result == "ERROR"){

                                response.message = "INJECT configuration into board " + board_id + " failed: "+rpc_response.message;
                                response.result = "ERROR";
                                if(res != false){
                                    logger.error("[SYSTEM] --> " + response.message);
                                    res.status(500).send(response);
                                }
                                else
                                    request_utils.updateResult(request_id, board_id, response.result, response.message);

                            }
                            else{

                                response.message = "Configuration injected into the board '" + board_id + "': LR restarting...";
                                response.result = "SUCCESS";
                                if(res != false){
                                    logger.info("[SYSTEM] --> " + response.message);
                                    res.status(200).send(response);
                                }
                                else
                                    request_utils.updateResult(request_id, board_id, response.result, response.message);

                            }

                        },
                        function (rpc_error) {

                            response.message = "RPC UNAVAILABLE: " + rpc_error.error;
                            response.result = "WARNING";
                            if(res != false){
                                logger.warn("[SYSTEM] - RPC UNAVAILABLE: " + rpc_error.error);
                                res.status(200).send(response);
                            }
                            else{

                                request_utils.updateResult(request_id, board_id, response.result, response.message);

                            }

                        }

                    );

                }


            });

        } else if (available.result == "WARNING") {

            if(res != false){
                logger.warn("[API] --> " + available.message);
                res.status(500).send(available);
            }
            else{

                var result_msg = "board disconnected";

                request_utils.updateResult(request_id, board_id, available.result, result_msg);

            }

        }

    });





};

board_utils.prototype.exportCommands = function (session){

    // Register all the module functions as WAMP RPCs
    logger.debug("[WAMP-EXPORTS] Boards RPCs exposing:");

    // CHECK IF IOTRONIC IS ALIVE
    session.register('s4t.iotronic.isAlive', this.isAlive);
    logger.debug('[WAMP-EXPORTS] --> s4t.iotronic.isAlive');

    /*
    // PROVISIONING OF A NEW BOARD
    session.register('s4t.board.provisioning', this.Provisioning);
    logger.debug('[WAMP-EXPORTS] --> s4t.board.provisioning');
    */

    // INJECT CONF TO NEW BOARD
    session.register('s4t.board.createBoardConf', createBoardConf);
    logger.debug('[WAMP-EXPORTS] --> s4t.board.createBoardConf');

    logger.info('[WAMP-EXPORTS] Boards RPCs exported to the cloud!');

};



module.exports = board_utils;
module.exports.checkBoardAvailable = checkBoardAvailable;
module.exports.checkBodyParams = checkBodyParams;
module.exports.checkRequired = checkRequired;
module.exports.execActionOnBoard = execActionOnBoard;
module.exports.addBoardPosition = addBoardPosition;
module.exports.createBoardConf = createBoardConf;
