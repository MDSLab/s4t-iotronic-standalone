//###############################################################################
//##
//# Copyright (C) 2017 Nicola Peditto, Francesco Longo
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


var logger = log4js.getLogger('driver_utils');
logger.setLevel(loglevel);

var IotronicHome = process.env.IOTRONIC_HOME;

var db_utils = require('./../management/mng_db');
var db = new db_utils;

var board_utility = require('./../management/mng_board');

var fs = require('fs');
var Q = require("q");

var session_wamp;

driver_utils = function (session, rest) {
    
    session_wamp = session;
    session_wamp.register('s4t.board.driver.updateStatus', updateDriverStatus);
    logger.debug("[WAMP-EXPORT] - Driver's RPCs exported!");


    // DRIVER MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //GET drivers list
    /**
     * @swagger
     * /v1/drivers/:
     *   get:
     *     tags:
     *       - Drivers
     *     description: It returns IoTronic drivers list
     *     summary: get IoTronic projects list
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: List of IoTronic drivers
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of drivers"
     *                  items:
     *                      title: driver info
     *                      type: object
     *                      properties:
     *                          id:
     *                              type: integer
     *                              description: "The IoTronic driver ID"
     *                          name:
     *                              type: string
     *                              description: "Driver name"
     *                          jsonschema:
     *                              type: string
     *                              description: "Driver configuration file path"
     *                          code:
     *                              type: string
     *                              description: "Driver source code file path"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/drivers/', function (req, res) {

        logger.info("[API] - Drivers list - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        db.getDriverList(function (data) {

            if(data.result=="ERROR"){
                response.message = data.message;
                response.result = "ERROR";
                logger.error("[DRIVER] --> " + JSON.stringify(response.message));
                res.status(500).send(response);

            }else{
                response.message = data.message;
                response.result = "SUCCESS";
                res.status(200).send(response);

            }

        });


    });


    //GET drivers list on board
    /**
     * @swagger
     * /v1/boards/{board}/drivers:
     *   get:
     *     tags:
     *       - Drivers
     *     description: It returns IoTronic user-drivers list in a board
     *     summary: get IoTronic drivers list in a board
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
     *          description: Driver injected list in the board
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of drivers"
     *                  items:
     *                      title: driver info
     *                      type: object
     *                      properties:
     *                          name:
     *                              type: string
     *                              description: "Driver name"
     *                          state:
     *                              type: string
     *                              description: "Driver status: 'mounted', 'unmounted', 'injected'"
     *                          latest_change:
     *                              type: string
     *                              description: "Driver latest update timestamp."
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/boards/:board/drivers', function (req, res) {

        logger.info("[API] - Board drivers list - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        var response = {
            message: '',
            result: ''
        };


        logger.debug("[DRIVER] - Driver list for the board " + board);

        db.getBoardDriverList(board, function (data) {

            if (data.result == "ERROR") {
                response.result = data.result;
                response.message = data.message;
                logger.error("[DRIVER] --> " + response.message);
                res.status(500).send(response);

            } else {
                response = data;
                res.status(200).send(response);
            }


        });




    });

    
    //CREATE driver in Iotronic
    /**
     * @swagger
     * /v1/drivers/:
     *   post:
     *     tags:
     *       - Drivers
     *     description:  create new IoTronic user-driver
     *     summary: create IoTronic driver
     *     produces:
     *       - application/json
     *     parameters:
     *      -  name: body
     *         in: body
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - driver_name
     *                  - driver_json
     *                  - driver_code
     *              properties:
     *                  driver_name:
     *                      type: string
     *                  driver_json:
     *                      type: string
     *                      description: "driver inputs in JSON format"
     *                  driver_code:
     *                      type: string
     *                      description: "NodeJS driver code"
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
    rest.post('/v1/drivers/', function (req, res) {

        logger.info("[API] - Driver creation - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var drivername = req.body.driver_name;
        var driverjson = req.body.driver_json;
        var drivercode = req.body.driver_code;

        var ApiRequired= {"driver_name":drivername, "driver_json":driverjson, "driver_code":drivercode};

        board_utility.checkRequired(ApiRequired, function (check){

            if(check.result == "ERROR"){

                res.status(500).send(check);

            }else {

                driver_utils.createDriver(drivername, driverjson, drivercode, res);

            }

        });






    });


    //DELETE driver from Iotronic
    /**
     * @swagger
     * /v1/drivers/{driver}:
     *   delete:
     *     tags:
     *       - Drivers
     *     description: Delete an IoTronic user-driver
     *     summary: delete IoTronic driver
     *     parameters:
     *      - in: path
     *        name: driver
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic driver NAME or ID"
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
    rest.delete('/v1/drivers/:driver', function (req, res) {

        logger.info("[API] - Destroy driver - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var driver = req.params.driver;

        driver_utils.destroyDriver(driver, res);

    });


    //INJECT driver inside a board
    /**
     * @swagger
     * /v1/boards/{board}/drivers:
     *   put:
     *     tags:
     *       - Drivers
     *     description: Injects an IoTronic user-driver ('sync' or 'async' type) in a board
     *     summary: inject driver in a board
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *          type: string
     *          description: The IoTronic board ID
     *      -  name: body
     *         in: body
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - driver_name
     *                  - onboot
     *              properties:
     *                  driver:
     *                      type: string
     *                      description: "Driver name"
     *                  onboot:
     *                      type: string
     *                      description: "Flag to specify if the driver has to start at boot of Lightning-rod:\n- possible values: 'true' or 'false'"
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
    rest.put('/v1/boards/:board/drivers', function (req, res) {

        logger.info("[API] - Inject driver - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var drivername = req.body.driver_name;
                var onboot = req.body.onboot;

                var ApiRequired= {"drivername":drivername, "onboot":onboot};

                board_utility.checkRequired(ApiRequired, function (check){

                    if(check.result == "ERROR"){

                        res.status(500).send(check);

                    }else {

                        driver_utils.injectDriver(board, drivername, onboot, res);

                    }

                });


            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }

        });


        
        



    });


    //REMOVE drivers from board
    /**
     * @swagger
     * /v1/boards/{board}/drivers/{driver}:
     *   delete:
     *     tags:
     *       - Drivers
     *     description: Remove an IoTronic user-driver from a board
     *     summary: remove driver from board
     *     parameters:
     *      - in: path
     *        name: driver
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic driver NAME or ID"
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic board ID"
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
    rest.delete('/v1/boards/:board/drivers/:driver', function (req, res) {

        logger.info("[API] - Remove driver - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;
        var driver = req.params.driver;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                driver_utils.removeDriver(board, driver, res);

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }

        });

        

    });


    //READ driver files
    /**
     * @swagger
     * /v1/boards/{board}/drivers/read:
     *   post:
     *     tags:
     *       - Drivers
     *     description: Execute driver read operation on a board
     *     summary: execute driver read operations on a board
     *     produces:
     *       - application/json
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *          type: string
     *          description: "The IoTronic board ID"
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - driver
     *                  - driver_exp_filename
     *              properties:
     *                  driver:
     *                      type: string
     *                      description: "Driver name or id"
     *                  driver_exp_filename:
     *                      type: string
     *                      description: "Name of the file to read exposed by the driver"
     *     responses:
     *       200:
     *          description: "Read action on driver response"
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                      type: object
     *                      properties:
     *                          driver:
     *                              type: string
     *                              description: "The IoTronic driver NAME."
     *                          file:
     *                              type: string
     *                              description: "Virtual file to read exposed by the driver."
     *                          value:
     *                              type: string
     *                              description: "File content."
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.post('/v1/boards/:board/drivers/read', function (req, res) {

        logger.info("[API] - Driver Read - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var driver = req.body.driver;
                var driver_exp_filename = req.body.driver_exp_filename;

                var ApiRequired = {"driver":driver, "driver_exp_filename":driver_exp_filename};

                board_utility.checkRequired(ApiRequired, function (check){

                    if(check.result == "ERROR"){

                        res.status(500).send(check);

                    }else {

                        driver_utils.readRemoteFile(board, driver, driver_exp_filename, res);

                    }

                });

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }

        });

        

    });


    //WRITE driver files
    /**
     * @swagger
     * /v1/boards/{board}/drivers/write:
     *   post:
     *     tags:
     *       - Drivers
     *     description: Execute driver write operation on a board
     *     summary: execute driver write operations on a board
     *     produces:
     *       - application/json
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *          type: string
     *          description: The IoTronic board ID
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - driver
     *                  - driver_exp_filename
     *                  - filecontent
     *              properties:
     *                  driver:
     *                      type: string
     *                      description: "Driver name or id"
     *                  driver_exp_filename:
     *                      type: string
     *                      description: "Name of the file to read exposed by the driver"
     *                  filecontent:
     *                      type: string
     *                      description: "Content (string) to write in the file exposed by the driver"
     *     responses:
     *       200:
     *          description: "Read action on driver response"
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                      type: object
     *                      properties:
     *                          driver:
     *                              type: string
     *                              description: "The IoTronic driver NAME."
     *                          file:
     *                              type: string
     *                              description: "Virtual file to write exposed by the driver."
     *                          value:
     *                              type: string
     *                              description: "Writing operation response."
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.post('/v1/boards/:board/drivers/write', function (req, res) {

        logger.info("[API] - Driver Write - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var driver = req.body.driver;
                var driver_exp_filename = req.body.driver_exp_filename;
                var filecontent = req.body.filecontent;

                var ApiRequired= {"driver":driver, "driver_exp_filename":driver_exp_filename, "filecontent":filecontent};

                board_utility.checkRequired(ApiRequired, function (check){

                    if(check.result == "ERROR"){

                        res.status(500).send(check);

                    }else {

                        driver_utils.writeRemoteFile(board, driver, driver_exp_filename, filecontent, res);

                    }

                });

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }

        });


    });


    //ACTION driver on board
    /**
     * @swagger
     * /v1/boards/{board}/drivers/{driver}/action:
     *   post:
     *     tags:
     *       - Drivers
     *     description: Execute driver operations on a board
     *     summary: execute driver operations on a board
     *     produces:
     *       - application/json
     *     parameters:
     *      - in: path
     *        name: driver
     *        required: true
     *        schema:
     *          type: string
     *          description: The IoTronic driver NAME
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *          type: string
     *          description: The IoTronic board ID
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - driver_operation
     *              properties:
     *                  driver_json:
     *                      type: string
     *                      description: "Driver inputs in JSON format"
     *                  driver_operation:
     *                      type: string
     *                      description: "Possible values: 'mount' or 'unmount'"
     *                  remote_driver:
     *                      type: string
     *                      description: "Flag ['true' | 'false'] that specifies if the driver operations will be forwarded to another remote board ('mirror_board') that mounts the same driver."
     *                  mirror_board:
     *                      type: string
     *                      description: "IoTronic ID of the remote board that expose the same driver."
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
    rest.post('/v1/boards/:board/drivers/:driver/action', function (req, res) {

        logger.info("[API] Driver Operation " + Object.keys( req.route.methods ) + " " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        var driver = req.params.driver;

        var checkremote = true;

        var response = {
            message: '',
            result: {}
        };

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var remote_driver = req.body.remote_driver;
                var driveroperation = req.body.driver_operation; // mount | unmount
                var mirror_board = req.body.mirror_board;  //OPTIONAL

                if (driveroperation == "mount"){

                    var ApiRequired= {"remote_driver":remote_driver, "driver_operation":driveroperation};

                } else if (driveroperation == "unmount"){

                    var ApiRequired= {"driver_operation":driveroperation};

                } else {

                    logger.error("[API]-> Error in driver operation field: driver_operation =" + driveroperation)
                }

                if(mirror_board != "" && mirror_board != undefined){

                    logger.info("[API]-> Remote mounting using mirror board " + mirror_board);

                    if (remote_driver == "false")
                        checkremote = false

                }

                if(checkremote){

                    board_utility.checkRequired(ApiRequired, function (check){

                        if(check.result == "ERROR"){

                            res.status(500).send(check);

                        }else {

                            driver_utils.manageDrivers(board, driver, driveroperation, remote_driver, mirror_board, res);
                            
                        }

                    });

                }else{
                    response.result = "ERROR";
                    response.message = "If you are specifying 'mirror_board' you have to set 'remote' flag to true!";
                    logger.error("[API]-> " + response.message);
                    res.status(500).send(response);
                }




            }else if(available.result == "WARNING") {
                logger.error("[API]-> " + available.message);
                res.status(200).send(available);
            }

        });



    });


    logger.debug("[REST-EXPORT] - Driver's APIs exposed!");


};


driver_utils.prototype.createDriver = function (drivername, driverjson, drivercode, res) {

    logger.info("[DRIVER] - Inserting new driver " + drivername + " in Iotronic...");

    var response = {
        message: '',
        result: ''
    };

    db.getDriver(drivername, function (data) {

        if (data.result == "ERROR") {
            response.result = data.result;
            response.message = "DB getDriver error for '" + drivername + "': " + data.message;
            logger.error("[DRIVER] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {

                try {

                    var drivers_folder = IotronicHome + '/drivers';
                    var driver_path = drivers_folder + '/' + drivername;
                    var fileNameDriver = driver_path + '/' + drivername + '.js';
                    var fileNameSchema = driver_path + '/' + drivername + '.json';

                    logger.debug("[DRIVER] --> drivername = " + drivername + "\n driverjson = " + driverjson + "\n\n drivercode = " + drivercode);

                    fs.mkdir(driver_path, function () {

                        db.insertCreatedDriver(drivername, fileNameSchema, fileNameDriver, function (response_db) {

                            if (response_db.result == "ERROR") {
                                response.result = response_db.result;
                                response.message = "DB insertCreatedDriver error for '" + drivername + "': " + response_db.message;
                                logger.error("[DRIVER] --> " + response.message);
                                res.status(500).send(response);

                            } else {

                                fs.writeFile(fileNameDriver, drivercode, function (err) {

                                    if (err) {
                                        response.result = "ERROR";
                                        response.message  = "Error writeFile '" + drivername + "' driver file creation: " + err;
                                        logger.error("[DRIVER] --> " + response.message);
                                        res.status(500).send(response);

                                    } else {

                                        fs.writeFile(fileNameSchema, driverjson, function (err) {
                                            if (err) {
                                                response.result = "ERROR";
                                                response.message = "Error writeFile '" + drivername + "' driver JSON file creation: " + err;
                                                logger.error("[DRIVER] --> " + response.message);
                                                res.status(500).send(response);

                                            } else {
                                                response.result = "SUCCESS";
                                                response.message = "Driver '" + drivername + "' injected into Iotronic successfully";
                                                logger.info("[DRIVER] --> " + response.message);
                                                res.status(200).send(response);
                                            }
                                        });


                                    }
                                });


                            }

                        });


                    });


                } catch (err) {
                    response.result = "ERROR";
                    response.message = "Error '" + drivername + "' driver creation: " + err;
                    logger.error("[DRIVER] --> " + response.message);
                    res.status(500).send(response);
                }


            } else {

                response.result = "ERROR";
                response.message = "Driver creation failed: '" + drivername + "' already exists!";
                logger.error("[DRIVER] --> " + response.message);
                res.status(500).send(response);


            }
            
        }

        

    });


};

driver_utils.prototype.removeDriver = function (board, driver, res) {

    logger.info("[DRIVER] - Removing driver '" + driver + "' from board " + board);

    var response = {
        message: '',
        result: ''
    };

    var driverId;
    var driverName;

    db.getDriver(driver, function (data) {

        if (data.result == "ERROR") {
            response.result = data.result;
            response.message = "DB getDriver error for '" + driver + "': " + data.message;
            logger.error("[DRIVER] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {

                response.message = "Driver '" + driver + "' does not exist!";
                response.result = "ERROR";
                logger.error("[DRIVER] --> " + response.message);
                res.status(500).send(response);


            } else {

                driverId = data.message[0].id;
                driverName = data.message[0].name;

                db.getInjectedDriver(driverId, board, function (data_p) {

                    if (data_p.result == "ERROR") {
                        response.result = data_p.result;
                        response.message = "DB getInjectedDriver error for '" + driverName + "': " + data_p.message;
                        logger.error("[DRIVER] --> " + response.message);
                        res.status(500).send(response);

                    } else {

                        if (data_p.message[0] === undefined) {

                            response.message = "Driver removal failed: '" + driverName + "' already removed!";
                            response.result = "WARNING";
                            logger.warn("[DRIVER] --> " + response.message);
                            res.status(200).send(response);

                        } else {

                            session_wamp.call('s4t.' + board + '.driver.removeDriver', [driverName]).then(
                                
                                function (result) {

                                    db.deleteInjectedDriver(board, driverId, function (data_p) {
                                        if (data_p.result == "ERROR") {
                                            response.result = data_p.result;
                                            response.message = "DB deleteInjectedDriver error for '" + driverName + "': " + data_p.message;
                                            logger.error("[DRIVER] --> " + response.message);
                                            res.status(500).send(response);

                                        } else {

                                            response.message = "Driver '" + driverName + "' successfully removed from board " + board;
                                            response.result = "SUCCESS";
                                            logger.info("[DRIVER] --> " + response.message);
                                            res.status(200).send(response);
                                        }


                                    });

                                }
                            );


                        }
                        
                    }

                    

                });

            }
            
        }

        


    });

};

driver_utils.prototype.injectDriver = function (board, driver, onboot, res) {

    logger.info("[DRIVER] - INJECTING '" + driver + "' driver into the board " + board + "...");

    var response = {
        message: '',
        result: ''
    };

    var driverId;
    var driverName;
    var driverFileName;

    db.getDriver(driver, function (data) {

        if (data.result == "ERROR") {
            response.result = data.result;
            response.message = "DB getDriver error for '" + driver + "': " + data.message;
            logger.error("[DRIVER] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {

                response.message = "Driver '" + driver + "' does not exist!";
                response.result = "ERROR";
                logger.error("[DRIVER] --> " + response.message);
                res.status(500).send(response);

            } else {


                driverId = data.message[0].id;
                driverName = data.message[0].name;

                db.getInjectedDriver(driverId, board, function (data_p) {

                    if (data_p.result == "ERROR") {
                        response.result = data_p.result;
                        response.message = "DB getInjectedDriver error for " + driver + ": " + data_p.message;
                        logger.error("[DRIVER] --> " + response.message);
                        res.status(500).send(response);

                    } else {

                        if (data_p.message[0] === undefined) {

                            driverName = data.message[0].name;
                            driverFileName = data.message[0].code;
                            driverSchemaName = data.message[0].jsonschema;

                            fs.readFile(driverFileName, 'utf8', function (err, code_data) {

                                if (err) {

                                    response.result = "ERROR";
                                    response.message = "Driver code file decoding error: " + err;
                                    logger.error("[DRIVER] --> " + response.message);
                                    res.status(500).send(response);

                                } else {

                                    logger.debug("[DRIVER] --> File " + driverFileName + " successfully read.");

                                    var driverCode = code_data;

                                    fs.readFile(driverSchemaName, 'utf8', function (err, schema_data) {

                                        if (err) {

                                            response.result = "ERROR";
                                            response.message = "Driver schema file decoding error: " + err;
                                            logger.error("[DRIVER] --> " + response.message);
                                            res.status(500).send(response);

                                        } else {

                                            logger.debug("[DRIVER] --> Configuration file " + driverSchemaName + " successfully read.");

                                            var driverSchema = schema_data;

                                            logger.debug('[DRIVER] --> Calling RPC injectDriver with name = ' + driverName + " onboot = " + onboot + " code = " + driverCode + " schema = " + driverSchema);

                                            session_wamp.call('s4t.' + board + '.driver.injectDriver', [driverName, driverCode, driverSchema, onboot]).then(

                                                function (result) {

                                                    db.insertInjectedDriver(board, driverName, function (out) {

                                                        if (out.result == "ERROR") {
                                                            response.result = out.result;
                                                            response.message = "DB insertInjectedDriver error for " + driverName + ": " + out.message;
                                                            logger.error("[DRIVER] --> " + response.message);
                                                            res.status(500).send(response);

                                                        } else {

                                                            response.message = result;
                                                            response.result = "SUCCESS";
                                                            logger.info("[DRIVER] --> " + response.message);
                                                            res.status(200).send(response);

                                                        }

                                                    });

                                                }

                                            );

                                        }

                                    });

                                }

                            });


                        } else {

                            response.result = "WARNING";
                            response.message = "Driver " + driverName + " is already injected!";
                            logger.warn("[DRIVER] --> " + response.message);
                            res.status(200).send(response);

                        }

                    }

                });

            }

        }

    });
};

driver_utils.prototype.destroyDriver = function (driver, res) {

    logger.info("[DRIVER] - REMOVING '" + driver + "' driver from Iotronic...");

    var response = {
        message: '',
        result: ''
    };

    db.getDriver(driver, function (data) {

        if (data.result == "ERROR") {
            
            response.result = data.result;
            response.message = "DB getDriver error for '" + driver + "': " + data.message;
            logger.error("[DRIVER] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {

                response.message = "Driver '" + driver + "' does not exist!";
                response.result = "ERROR";
                logger.error("[DRIVER] --> " + response.message);
                res.status(500).send(response);

            } else {

                var driver_name = data.message[0].name;
                var driver_folder = IotronicHome + '/drivers/' + driver_name;

                db.deleteDriver(driver, function (result_db) {

                    if (result_db.result == "ERROR") {

                        response.message = "DB deleteDriver error for '" + driver_name + "': " + result_db.message;
                        response.result = "ERROR";
                        logger.error("[DRIVER] --> " + response.message);
                        res.status(500).send(response);


                    } else {

                        logger.debug("[DRIVER] --> Deleting files of '" + driver_name + "' ...");

                        deleteFolderRecursive(driver_folder);

                        response.message = "Driver '" + driver_name + "' successfully deleted from Iotronic!";
                        response.result = "SUCCESS";
                        logger.info("[DRIVER] --> " + response.message);
                        res.status(200).send(response);

                    }

                });

            }

        }




    });

};

driver_utils.prototype.manageDrivers = function (board, driver, driveroperation, remote, mirror_board, res) {

    var response = {
        message: '',
        result: {}
    };
    
    switch (driveroperation) {

        case 'mount':

            logger.info("[DRIVER] - MOUNTING driver '" + driver + "' into the board " + board + "...");

            db.getDriver(driver, function (data) {
                
                if (data.result == "ERROR") {
                    response.result = data.result;
                    response.message = "DB getDriver error for '" + driver + "': " + data.message;
                    logger.error("[DRIVER] --> " + response.message);
                    res.status(500).send(response);

                } else {

                    if (data.message[0] === undefined) {

                        response.message = "Driver '" + driver + "' does not exist!";
                        response.result = "ERROR";
                        logger.error("[DRIVER] --> " + response.message);
                        res.status(500).send(response);

                    } else {

                        var driverId = data.message[0].id;
                        var driverName = data.message[0].name;
                        
                        db.getInjectedDriver(driverId, board, function (data_p) {
                            
                            if (data_p.result == "ERROR") {
                                
                                response.result = data_p.result;
                                response.message = "DB getInjectedDriver error for '" + driverName + "': " + data_p.message;
                                logger.error("[DRIVER] --> " + response.message);
                                res.status(500).send(response);

                            } else {

                                if (data_p.message[0] === undefined) {

                                    response.message = "Driver mounting failed: '" + driverName + "' is not injected!";
                                    response.result = "WARNING";
                                    logger.warn("[DRIVER] --> " + response.message);
                                    res.status(200).send(response);
                                    
                                } else {

                                    var driverState = data_p.message[0].state;

                                    if (driverState != "mounted") {

                                        if (remote === undefined || remote === null) remote = false;

                                        session_wamp.call('s4t.' + board + '.driver.mountDriver', [driverName, remote, mirror_board]).then(
                                            
                                            function (driver_result) {

                                                if (driver_result.result === "SUCCESS") {
                                                    
                                                    db.updateDriverStatus(board, driverName, "mounted", function (out) {

                                                        if (out.result == "ERROR") {

                                                            response.result = out.result;
                                                            response.message = "DB getInjectedDriver error for '" + driverName + "': " + out.message;
                                                            logger.error("[DRIVER] --> " + response.message);
                                                            res.status(500).send(response);

                                                        } else {
                                                            logger.debug("[DRIVER] --> Update driver status result for '" + driverName + "': " +  out.message);
                                                            logger.info("[DRIVER] --> " + driver_result.message);
                                                            res.status(200).send(driver_result);
                                                        }

                                                    });
                                                    
                                                } else {

                                                    logger.info("[DRIVER] --> " + driver_result.message);
                                                    res.status(500).send(driver_result);

                                                }

                                            }
                                            
                                        );

                                    } else {

                                        response.result = "WARNING";
                                        response.message = "Driver '" + driverName + "' is already mounted!";
                                        logger.warn("[DRIVER] --> driverState " + driverState + " - "+ response.message);
                                        res.status(200).send(response);

                                    }

                                }
                                
                            }

                        });

                    }
                    
                }
                
            });

            break;


        case 'unmount':

            logger.info("[DRIVER] - UNMOUNTING driver '" + driver + "' from the board '" + board + "' ...");

            db.getDriver(driver, function (data) {

                if (data.result == "ERROR") {
                    response.result = data.result;
                    response.message = "DB getDriver error for '" + driver + "': " + data.message;
                    logger.error("[DRIVER] --> " + response.message);
                    res.status(500).send(response);

                } else {

                    if (data.message[0] === undefined) {

                        response.message = "Driver '" + driver + "' does not exist!";
                        response.result = "ERROR";
                        logger.error("[DRIVER] --> " + response.message);
                        res.status(500).send(response);

                    } else {

                        var driverId = data.message[0].id;
                        var driverName = data.message[0].name;

                        db.getInjectedDriver(driverId, board, function (data_p) {

                            if (data_p.result == "ERROR") {

                                response.result = data_p.result;
                                response.message = "DB getInjectedDriver error for '" + driverName + "': " + data_p.message;
                                logger.error("[DRIVER] --> " + response.message);
                                res.status(500).send(response);

                            } else {

                                if (data_p.message[0] === undefined) {

                                    response.message = "Driver mounting failed: '" + driverName + "' is not injected!";
                                    response.result = "WARNING";
                                    logger.warn("[DRIVER] --> " + response.message);
                                    res.status(200).send(response);

                                } else {

                                    var driverState = data_p.message[0].state;

                                    if (driverState === "mounted") {

                                        session_wamp.call('s4t.' + board + '.driver.unmountDriver', [driverName]).then(
                                            function (driver_result) {

                                                if (driver_result.result === "SUCCESS") {

                                                    db.updateDriverStatus(board, driverName, "unmounted", function (out) {

                                                        if (out.result == "ERROR") {

                                                            response.result = out.result;
                                                            response.message = "DB getInjectedDriver error for '" + driverName + "': " + out.message;
                                                            logger.error("[DRIVER] --> " + response.message);
                                                            res.status(500).send(response);

                                                        } else {
                                                            logger.debug("[DRIVER] --> Update driver status result for '" + driverName + "': " +  out.message);
                                                            logger.info("[DRIVER] --> " + driver_result.message);
                                                            res.status(200).send(driver_result);
                                                        }

                                                    });

                                                } else {

                                                    logger.error("[DRIVER] --> " + driver_result.message);
                                                    res.status(500).send(driver_result);

                                                }

                                            }

                                        );

                                    } else {

                                        response.result = "WARNING";
                                        response.message = "Driver '" + driverName + "' is already unmounted!";
                                        logger.warn("[DRIVER] --> driverState "+driverState+" - "+ response.message);
                                        res.status(200).send(response);

                                    }

                                }

                            }

                        });

                    }

                }


            });

            break;

        default:
            response.result = "ERROR";
            response.message = "Driver operation '" + driveroperation + "' is not supported! [ 'mount' | 'unmount' ]";
            logger.warn("[DRIVER] --> " + response.message);
            res.status(500).send(response);

            break;

    }

};

driver_utils.prototype.readRemoteFile = function (board, driver, filename, res) {

    logger.info("[DRIVER] - Remote file reading: " + driver + "[" + filename + "] from board " + board);

    var response = {
        message: '',
        result: ''
    };

    db.getDriver(driver, function (data) {

        if (data.result == "ERROR") {

            response.result = data.result;
            response.message = "DB getDriver error for '" + driver + "': " + data.message;
            logger.error("[DRIVER] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {

                response.message = "Driver '" + driver + "' does not exist!";
                response.result = "ERROR";
                logger.error("[DRIVER] --> " + response.message);
                res.status(500).send(response);

            } else {

                var driverId = data.message[0].id;
                var driverName = data.message[0].name;

                db.getInjectedDriver(driverId, board, function (data_p) {

                    if (data_p.result == "ERROR") {

                        response.result = data_p.result;
                        response.message = "DB getInjectedDriver error for '" + driverName + "': " + data_p.message;
                        logger.error("[DRIVER] --> " + response.message);
                        res.status(500).send(response);

                    } else {

                        if (data_p.message[0] === undefined || data_p.message[0].state != "mounted") {

                            if (data_p.message[0].state != "mounted")
                                response.message = "The driver '" + driverName + "' is not mounted in the board '" + board + "' !";
                            else if (data_p.message[0] === undefined)
                                response.message = "The driver '" + driverName + "' is not injected in the board '" + board + "' !";

                            response.result = "ERROR";
                            res.status(500).send(response);
                            logger.warn("[DRIVER] --> " + response.message );

                        } else {

                            logger.debug("[DRIVER] --> RPC call to read a remote file " + driverName + "[" + filename + "] ...");

                            session_wamp.call('s4t.' + board + '.driver.' + driverName + '.' + filename + '.read', [driverName, filename]).then(

                                function (result) {
                                    response.message = {"driver": driverName, "file": filename, "value": result};
                                    response.result = "SUCCESS";
                                    logger.info("[DRIVER] --> Remote file reading result " + driverName + "[" + filename + "] : " + result);
                                    res.status(200).send(response);

                                },
                                function (error) {
                                    // call failed
                                    var error_log = "ERROR: " + error["error"];
                                    response.message = {"driver": driverName, "file": filename, "response": error_log};
                                    response.result = "ERROR";
                                    logger.warn('[DRIVER] --> Remote file reading failed! - Error: ' + JSON.stringify(error));
                                    res.status(500).send(response);

                                }

                            );


                        }

                    }



                });


            }

        }


    });

};

driver_utils.prototype.writeRemoteFile = function (board, driver, filename, filecontent, res) {

    logger.info("[DRIVER] - Remote file writing: " + driver + "[" + filename + "] of the board " + board);

    var response = {
        message: '',
        result: ''
    };

    db.getDriver(driver, function (data) {

        if (data.result == "ERROR") {

            response.result = data.result;
            response.message = "DB getDriver error for '" + driver + "': " + data.message;
            logger.error("[DRIVER] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {

                response.message = "Driver '" + driver + "' does not exist!";
                response.result = "ERROR";
                logger.error("[DRIVER] --> " + response.message);
                res.status(500).send(response);

            } else {

                var driverId = data.message[0].id;
                var driverName = data.message[0].name;

                db.getInjectedDriver(driverId, board, function (data_p) {

                    if (data_p.result == "ERROR") {

                        response.result = data_p.result;
                        response.message = "DB getInjectedDriver error for '" + driverName + "': " + data_p.message;
                        logger.error("[DRIVER] --> " + response.message);
                        res.status(500).send(response);

                    } else {

                        if (data_p.message[0] === undefined || data_p.message[0].state != "mounted") {

                            if (data_p.message[0].state != "mounted")
                                response.message = "The driver '" + driverName + "' is not mounted in the board '" + board + "' !";
                            else if (data_p.message[0] === undefined)
                                response.message = "The driver '" + driverName + "' is not injected in the board '" + board + "' !";

                            response.result = "ERROR";
                            res.status(500).send(response);

                            logger.warn("[DRIVER] --> " + response.message);

                        } else {

                            logger.debug("[DRIVER] --> RPC call to write a remote file " + driverName + "[" + filename + "] ...");

                            logger.debug('[DRIVER] --> RPC s4t.' + board + '.driver.' + driverName + '.' + filename + '.write -> ' + filecontent);

                            session_wamp.call('s4t.' + board + '.driver.' + driverName + '.' + filename + '.write', [driverName, filename, filecontent]).then(

                                function (result) {
                                    response.message = {"driver": driverName, "file": filename, "value": result};
                                    response.result = "SUCCESS";
                                    logger.info("[DRIVER] --> Remote file writing result " + driverName + "[" + filename + "] : " + result);
                                    res.status(200).send(response);

                                },
                                function (error) {
                                    // call failed
                                    var error_log = "ERROR: " + error["error"];
                                    response.message = {"driver": driverName, "file": filename, "response": error_log};
                                    response.result = "ERROR";
                                    logger.error('[DRIVER] --> Remote file writing failed! - Error: ' + JSON.stringify(error));
                                    res.status(500).send(response);

                                }


                            );


                        }

                    }



                });


            }

        }


    });

};


function updateDriverStatus(args) {
    // Parsing the input arguments
    var boardCode = String(args[0]);
    var drivername = String(args[1]);
    var status = String(args[2]);

    var d = Q.defer();

    logger.debug("[DRIVER] - Updating " + drivername + " status (" + status + ") for the board " + boardCode);

    db.updateDriverStatus(boardCode, drivername, status, function (out) {

        logger.debug("[DRIVER] --> Update driver status result for " + drivername + ": " + out);
        d.resolve("db_update_completed");

    });

    return d.promise;


}

function deleteFolderRecursive(path) {

    if (fs.existsSync(path)) {

        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) {
                // recurse
                deleteFolderRecursive(curPath);
            } else {
                // delete file
                fs.unlinkSync(curPath);
            }
        });

        fs.rmdirSync(path);

    }

}


module.exports = driver_utils;
