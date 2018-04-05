//###############################################################################
//##
//# Copyright (C) 2016-2017 Nicola Peditto
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
     *                          type:
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
     *                          layout:
     *                              type: string
     *                              description: "device layout ID"
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
     *                  - type_id
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
     *                  type_id:
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

        var board_id = req.body.board_id;
        var board_label = req.body.board_label;
        var description = req.body.description;

        var latitude = req.body.latitude;
        var longitude = req.body.longitude;
        var altitude = req.body.altitude;
        var position_refr_time = req.body.position_refresh_time;

        var net_enabled = req.body.net_enabled;
        var sensorslist = req.body.sensorslist;
        var type = req.body.type_id;
        var mobile = req.body.mobile;

        var project_id = req.body.project_id;
        var user_id = req.body.user_id;

        var notify = req.body.notify;
        var notify_rate = req.body.notify_rate;
        var notify_retry = req.body.notify_retry;

        var extra = req.body.extra;

        var response = {
            result: '',
            message: ''
        };

        var ApiRequired= { "board_id":board_id, "board_label":board_label, "latitude":latitude, "longitude":longitude, "altitude":altitude,
            "net_enabled":net_enabled, "type_id":type, "user_id":user_id, "project_id":project_id, "mobile":mobile, "position_refr_time":position_refr_time, "notify":notify, "notify_rate":notify_rate, "notify_retry":notify_retry};

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

                        logger.info("[SYSTEM] - New board " + board_label + " (" + board_id + ") - registration parameters:\n" + JSON.stringify(req.body, null, "\t"));

                        if(extra == undefined)
                            extra = '{}';

                        db.regBoard(board_id, board_label, latitude, longitude, altitude, net_enabled, sensorslist, type, description, extra, project_id, user_id, mobile, position_refr_time, notify, notify_rate, notify_retry, function (db_result) {

                            if (db_result.result === "SUCCESS") {

                                logger.info("[SYSTEM] --> Registration of board '" + board_id + "' successfully completed!");
                                res.status(200).send(db_result);

                            } else {
                                res.status(500).send(db_result);
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
     *                  - type_id
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
     *                  type_id:
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

                var latitude = req.body.latitude;
                var longitude = req.body.longitude;
                var altitude = req.body.altitude;
                var position_refr_time = req.body.position_refresh_time;

                var net_enabled = req.body.net_enabled;
                var sensorslist = req.body.sensorslist;
                var type = req.body.type_id;
                var mobile = req.body.mobile;

                var project_id = req.body.project_id;
                var user_id = req.body.user_id;

                var notify = req.body.notify;
                var notify_rate = req.body.notify_rate;
                var notify_retry = req.body.notify_retry;

                var response = {
                    result: "",
                    message: ""
                };

                logger.info("[SYSTEM] - BOARD " + board_label + " (" + board + ") UPDATING...");
                logger.debug("[SYSTEM] --> New configuration\n" + JSON.stringify(req.body, null, "\t"));
                logger.debug(extra);

                var ApiRequired= {"board_label":board_label, "latitude":latitude, "longitude":longitude, "altitude":altitude,
                    "net_enabled":net_enabled, "type_id":type, "user_id":user_id, "project_id":project_id, "mobile":mobile, "position_refr_time":position_refr_time,
                    "notify":notify, "notify_rate":notify_rate, "notify_retry":notify_retry};

                checkRequired(ApiRequired, function (check){

                    if(check.result == "ERROR"){

                        res.status(500).send(check);

                    }else {

                        if(extra == undefined)
                            extra = '{}';

                        db.updateBoard(board, board_label, latitude, longitude, altitude, net_enabled, sensorslist, type, description, extra, project_id, user_id, mobile, position_refr_time, notify, notify_rate, notify_retry, function (db_result) {

                            if (db_result.result == "ERROR") {
                                logger.error("[SYSTEM] --> " + db_result.message);
                                res.status(500).send(db_result);

                            } else {

                                var position = {
                                    "altitude": altitude,
                                    "longitude": longitude,
                                    "latitude": latitude
                                };

                                /*
                                 var remote_conf = {
                                 "notifier":{
                                 "retry":1
                                 }
                                 };
                                 */

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


                                            session.call('s4t.' + board + '.board.setBoardPosition', [position]).then(
                                                function (conf_result) {
                                                    response.message = db_result.message + " - " + conf_result;
                                                    response.result = "SUCCESS";
                                                    res.status(200).send(response);
                                                },
                                                session.log
                                            );

                                            /*
                                             session.call('s4t.' + board + '.board.updateConf', [remote_conf, position]).then(
                                             function (conf_result) {
                                             response.message = db_result.message + " - " + conf_result;
                                             response.result = "SUCCESS";
                                             res.send(response);
                                             },
                                             session.log
                                             );
                                             */

                                        } else {
                                            response.message = db_result.message + " - !!! WARNING: REMOTE BOARD CONFIGURATION NOT UPDATED !!!";
                                            response.result = "WARNING";

                                            res.status(200).send(response);
                                        }

                                    }



                                });



                            }


                        });

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
     *                      description: "supported actions: hostname, reboot"
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

        checkBoardAvailable(board, res, function (available) {

            if (available.result == "SUCCESS") {
                
                var action = req.body.action; // reboot | etc..
                var parameters = req.body.parameters; // OPTIONAL

                var ApiRequired= {"action":action};

                checkRequired(ApiRequired, function (check) {

                    if (check.result == "ERROR") {

                        res.status(500).send(check);

                    } else {

                        execActionOnBoard(board, action, parameters, res);
                        
                    }
                    
                });
                

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
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


    //UPDATE board configuration
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

                board_utils.injectConf(board, res);

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }


        });






    });



    logger.debug("[REST-EXPORT] - Board's APIs exposed!");

    //---------------------------------------------------------------------------------------------------


    // Register RPC methods
    this.exportCommands(session_wamp)





};


board_utils.prototype.injectConf = function (board, res){

    logger.info("[SYSTEM] - Injecting configuration into board '" + board + "'...");

    var response = {
        message: '',
        result: ''
    };

    createBoardConf(board, function (conf) {

        if (conf.result == "ERROR") {

            response.message = "Error getting board info: " + conf.message;
            response.result = "ERROR";
            logger.error("[SYSTEM] --> " + response.message);
            res.status(500).send(response);

        } else {


            session_wamp.call('s4t.'+ board + '.board.updateConf', [conf]).then(

                function (rpc_response) {

                    if(rpc_response.result == "ERROR"){
                        response.message = "INJECT configuration into board " + board + " failed: "+rpc_response.message;
                        response.result = "ERROR";
                        logger.error("[SYSTEM] --> " + response.message);
                        res.status(500).send(response);

                    }
                    else{

                        response.message = "Configuration successfully injected into the board" + board;
                        response.result = "SUCCESS";
                        logger.info("[SYSTEM] --> " + response.message);
                        res.status(200).send(response);


                    }



                }
            );

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

var execActionOnBoard = function (board, action, parameters, res) {

    var response = {
        message: {},
        result: ""
    };

    session_wamp.call('s4t.' + board + '.board.execAction', [action, parameters]).then(

        function (rpc_response) {

            if (rpc_response.result == "ERROR") {

                response.message = rpc_response.message;
                response.result = "ERROR";
                res.status(500).send(response);
                logger.error("[SYSTEM] --> Action result on board '" + board + "': " + response.message);

            }else {
                response.message = rpc_response.message;
                response.result = rpc_response.result;
                res.status(200).send(response);
                logger.info("[SYSTEM] --> Action result on board '" + board + "': " + response.message);

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
            logger.error("[SYSTEM] --> " + response.message);
            res.status(500).send(response);

        } else {


            if (data.message.length == 1) {

                if (data.message[0].status == 'D') {

                    response.result = "WARNING";
                    response.message = "Board " + board + " is disconnected!";
                    callback(response);

                }
                else {

                    response.result = "SUCCESS";
                    response.message = "Board " + board + " is connected!";
                    callback(response);

                }

            }
            else {

                logger.error("[API] - Board " + board + " does not exist!");

                response.result = "ERROR";
                response.message = "Board " + board + " doesn't exist!";
                res.status(500).send(response);

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
                    response.message = data.message[0]; //"Board "+data.message[0].label+" (" + board + ") exists!";
                    callback(response);

            }
            else {

                logger.error("[API] - Board " + board + " does not exist!");

                response.result = "ERROR";
                response.message = "Board " + board + " doesn't exist!";
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


            var settings = JSON.parse(fs.readFileSync(__dirname+"/../../utils/board_settings_template.json", 'utf8'));

            settings.config.device = data.message.info.model;
            settings.config.board.code = data.message.info.board_id;
            settings.config.board.status = "registered";
            settings.config.board.position = data.message.info.coordinates;

            
            if (wamp_ssl == "true")
                settings.config.wamp.url_wamp = "wss://" + IoTronic_IP;
            else
                settings.config.wamp.url_wamp = "ws://" + IoTronic_IP;


            if( settings.config.reverse.server.url_reverse == "<WSTUN-URL>")
                if (https_enable == "true")
                    settings.config.reverse.server.url_reverse = "wss://" + IoTronic_IP;
                else
                    settings.config.reverse.server.url_reverse = "ws://" + IoTronic_IP;


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


board_utils.prototype.Provisioning = function (result) {

    var board_id = result[0];
    var d = Q.defer();

    var response = {
        message: '',
        result: ''
    };

    db.BoardInfo(board_id, function (data) {

        if (data.result == "ERROR") {
            response.message = "Error getting board info: " + data.message;
            response.result = "ERROR";
            logger.error("[SYSTEM] --> " + response.message);
            d.reject(response);

        } else {
            d.resolve(data);
        }

    });

    return d.promise;
};



board_utils.prototype.exportCommands = function (session){

    //Register all the module functions as WAMP RPCs
    logger.debug("[WAMP-EXPORTS] Boards RPCs exposing:");

    // CHECK IF IOTRONIC IS ALIVE
    session.register('s4t.iotronic.isAlive', this.isAlive);
    logger.debug('[WAMP-EXPORTS] --> s4t.iotronic.isAlive');

    // PROVISIONING OF A NEW BOARD
    session.register('s4t.board.provisioning', this.Provisioning);
    logger.debug('[WAMP-EXPORTS] --> s4t.board.provisioning');

    logger.info('[WAMP-EXPORTS] Boards RPCs exported to the cloud!');


};



module.exports = board_utils;
module.exports.checkBoardAvailable = checkBoardAvailable;
module.exports.checkBodyParams = checkBodyParams;
module.exports.checkRequired = checkRequired;
module.exports.execActionOnBoard = execActionOnBoard;
module.exports.addBoardPosition = addBoardPosition;
