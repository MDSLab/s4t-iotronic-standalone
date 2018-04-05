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


var logger = log4js.getLogger('service_utils');
logger.setLevel(loglevel);

var db_utils = require('./../management/mng_db');
var db = new db_utils;
var board_utility = require('./../management/mng_board');
var Q = require("q");

var session_wamp;

var response = {
    message: '',
    result: ''
};


services_utils = function (session, rest) {

    session_wamp = session;

    // SERVICES MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------
    
    //GET services list
    /**
     * @swagger
     * /v1/services/:
     *   get:
     *     tags:
     *       - Services
     *     description: It returns IoTronic cloud-services list
     *     summary: get IoTronic services list
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: List of service exposed by IoTronic
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of service"
     *                  items:
     *                      title: service info
     *                      type: object
     *                      properties:
     *                          id:
     *                              type: string
     *                              description: "The IoTronic service ID"
     *                          name:
     *                              type: string
     *                              description: "Name of the service to expose (e.g. 'SSH')."
     *                          port:
     *                              type: string
     *                              description: "Port number of the service running on the board (e.g. '22')."
     *                          protocol:
     *                              type: string
     *                              description: "Information about the protocol used by the service (e.g. 'TCP')."
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/services/', function (req, res) {

        logger.info("[API] - Services list - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        db.getServicesList(function (data) {
            if(data.result=="ERROR"){
                response.message = data.message;
                response.result = "ERROR";
                logger.error("[SERVICE] --> " + JSON.stringify(response.message));
                res.status(500).send(response);

            }else{
                response.message = data.message;
                response.result = "SUCCESS";
                res.status(200).send(response);

            }
        });


    });

    //CREATE service in Iotronic
    /**
     * @swagger
     * /v1/services/:
     *   post:
     *     tags:
     *       - Services
     *     summary: create IoTronic service
     *     description:  Registration data for the new IoTronic service
     *     produces:
     *       - application/json
     *     parameters:
     *      -  name: body
     *         in: body
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - service_name
     *                  - port
     *                  - protocol
     *              properties:
     *                  service_name:
     *                      type: string
     *                      description: "Name of the service to expose (e.g. 'SSH')."
     *                  port:
     *                      type: integer
     *                      description: "Port number of the service running on the board (e.g. '22')."
     *                  protocol:
     *                      type: string
     *                      description: "Information about the protocol used by the service (e.g. 'TCP')."
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
    rest.post('/v1/services/', function (req, res) {

        logger.info("[API] - Create service - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var service_name = req.body.service_name;
        var port = req.body.port;
        var protocol = req.body.protocol;


        var ApiRequired= {"service_name":service_name, "port":port, "protocol":protocol};

        board_utility.checkRequired(ApiRequired, function (check){

            if(check.result == "ERROR"){

                res.status(500).send(check);

            }else {

                services_utils.createService(service_name, port, protocol, res);

            }

        });


    });

    //UPDATE service in Iotronic
    /**
     * @swagger
     * /v1/services/{service}:
     *   patch:
     *     tags:
     *       - Services
     *     description: Update an IoTronic service
     *     summary: update IoTronic service
     *     parameters:
     *      - in: path
     *        name: service
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic service ID or NAME"
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - service_name
     *                  - port
     *                  - protocol
     *              properties:
     *                  service_name:
     *                      type: string
     *                      description: "Name of the service to expose (e.g. 'SSH')."
     *                  port:
     *                      type: integer
     *                      description: "Port number of the service running on the board (e.g. '22')."
     *                  protocol:
     *                      type: string
     *                      description: "Information about the protocol used by the service (e.g. 'TCP')."
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
    rest.patch('/v1/services/:service', function (req, res) {

        logger.info("[API] - Update service - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var service = req.params.service;
        var service_name = req.body.service_name;
        var port = req.body.port;
        var protocol = req.body.protocol;

        var ApiRequired= {"service_name":service_name, "port":port, "protocol":protocol};

        board_utility.checkRequired(ApiRequired, function (check){

            if(check.result == "ERROR"){

                res.status(500).send(check);

            }else {

                services_utils.updateService(service, service_name, port, protocol, res);

            }

        });


    });

    //DELETE service from Iotronic
    /**
     * @swagger
     * /v1/services/{service}:
     *   delete:
     *     tags:
     *       - Services
     *     description: Delete an IoTronic service
     *     summary: delete IoTronic service
     *     parameters:
     *      - in: path
     *        name: service
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic service ID or NAME"
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
    rest.delete('/v1/services/:service', function (req, res) {

        logger.info("[API] - Destroy service - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var service_name = req.params.service;

        services_utils.deleteService(service_name, res);


    });

    //ACTION on a single service on board
    /**
     * @swagger
     * /v1/boards/{board}/services/{service}/action:
     *   post:
     *     tags:
     *       - Services
     *     description: Perform an action on IoTronic service
     *     summary: perform action on a service
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic board ID
     *      - in: path
     *        name: service
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic service ID or NAME"
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - service_action
     *              properties:
     *                  service_action:
     *                      type: string
     *                      description: "action to execute on the service: 'enable', 'disable', 'restore'"
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
    rest.post('/v1/boards/:board/services/:service/action', function (req, res) {

        logger.info("[API] - Service Operation - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;
        var service = req.params.service;  // ssh | tty | ideino | osjs

        var response = {
            message: '',
            result: {}
        };

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var service_action = req.body.service_action; // enable | disable

                if (service_action == "enable" || service_action == "disable" || service_action == "restore") {

                    var ApiRequired = {"service_action": service_action};

                    board_utility.checkRequired(ApiRequired, function (check) {

                        if (check.result == "ERROR") {

                            res.status(500).send(check);

                        } else {

                            services_utils.manageService(board, service, service_action, res);
    
                        }

                    });

                } else {

                    response.result = "ERROR";
                    response.message = "Service action " + service_action + " is not supported! [ 'enable' | 'disable' | 'restore' ]";
                    logger.error("[API] --> " + response.message);
                    res.status(500).send(response.message);

                }


            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }

        });

    });

    //GET services list inside a board
    /**
     * @swagger
     * /v1/boards/{board}/services:
     *   get:
     *     tags:
     *       - Services
     *     description: Get IoTronic services list on a board
     *     summary: get services exposed on a board
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
     *          description: List of service exposed by the board
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of service"
     *                  items:
     *                      title: service info
     *                      type: object
     *                      properties:
     *                          service_name:
     *                              type: string
     *                              description: "Name of the service exposed (e.g. 'SSH')."
     *                          service_id:
     *                              type: string
     *                              description: "The IoTronic service ID"
     *                          public_port:
     *                              type: integer
     *                              description: "Port number exposed by IoTronic for the service running on the board (e.g. '4422')."
     *                          local_port:
     *                              type: string
     *                              description: "Port number of the service running on the board (e.g. '22')."
     *                          protocol:
     *                              type: string
     *                              description: "Information about the protocol used by the service (e.g. 'TCP')."
     *                          last_update:
     *                              type: string
     *                              description: "Timestamp of the latest service update."
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/boards/:board/services', function (req, res) {

        logger.info("[API] - Board services list - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        var response = {
            message: '',
            result: ''
        };

        logger.debug("[SERVICE] - Services list for the board " + board);

        db.getBoardServices(board, function (data) {

            if(data.result=="ERROR"){
                response.message = data.message;
                response.result = "ERROR";
                logger.error("[SERVICE] --> " + response.message);
                res.status(500).send(response);

            }else{
                response.message = data.message;
                response.result = "SUCCESS";
                res.status(200).send(response);

            }

        });
                


    });
    
    //RESTORE all services on board
    /**
     * @swagger
     * /v1/boards/{board}/services/restore:
     *   get:
     *     tags:
     *       - Services
     *     description: "Restore all services on a board. Recreate all wstun tunnels."
     *     summary: restore all board services
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
    rest.get('/v1/boards/:board/services/restore', function (req, res) {

        logger.info("[API] - Service Operation - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        var response = {
            message: '',
            result: {}
        };

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                services_utils.restoreServices([board]).then(
                    function (response) {

                        if(response.result=="ERROR"){
                            logger.error("[SERVICE] --> " + JSON.stringify(response.message));
                            res.status(500).send(response);

                        }else{

                            res.status(200).send(response);
                            logger.info('[SERVICE] --> Services restoring completed!');

                        }

                    }
                );

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }

        });

    });

    logger.debug("[REST-EXPORT] - Services's APIs exposed!");

    //---------------------------------------------------------------------------------------------------

    // Register RPC methods
    this.exportCommands(session_wamp)
    
};





services_utils.prototype.createService = function (service_name, port, protocol, res) {

    logger.info("[SERVICE] - CREATING service " + service_name + "...");

    var response = {
        message: '',
        result: ''
    };


    db.getService(service_name, function (data) {

        if (data.result == "ERROR") {

            response.message = data.message;
            response.result = "ERROR";
            logger.warn("[SERVICE] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {

                db.registerService(service_name, port, protocol, function (result_db) {

                    if (result_db.result == "ERROR") {
                        logger.error("[SERVICE] --> createService - DB write error: " + result_db.message);
                        response.message = result_db.message;
                        response.result = "ERROR";
                        res.status(500).send(response);

                    } else {

                        response.message = "Service " + service_name + " successfully created in IoTronic!";
                        response.result = "SUCCESS";
                        logger.info("[SERVICE] --> " +response.message);
                        res.status(200).send(response);

                    }

                });



            }
            else {

                response.message = "Service " + service_name + " already exists!";
                response.result = "ERROR";
                logger.warn("[SERVICE] --> " + response.message);
                res.status(500).send(response);

            }

        }

    });



};


services_utils.prototype.updateService = function (service, service_name, port, protocol, res) {

    logger.info("[SERVICE] - UPDATING service '" + service + "'...");

    var response = {
        message: '',
        result: ''
    };

    db.getService(service, function (data) {

        if (data.result == "ERROR") {

            response.message = data.message;
            response.result = "ERROR";
            logger.warn("[SERVICE] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {
                
                response.message = "Service '" + service + "' does not exist!";
                response.result = "ERROR";
                logger.warn("[SERVICE] --> " + response.message);
                res.status(500).send(response);
                
            }
            else {
                
                db.updateService(service, service_name, port, protocol, function (result_db) {

                    if (result_db.result == "ERROR") {
                        logger.error("[SERVICE] --> updateService - DB write error: " + result_db.message);
                        response.message = result_db.message;
                        response.result = "ERROR";
                        res.status(500).send(response);

                    } else {

                        response.message = "Service " + service_name + " successfully updated!";
                        response.result = "SUCCESS";
                        logger.info("[SERVICE] --> " +response.message);
                        res.status(200).send(response);

                    }

                });

            }

        }

    });



};


services_utils.prototype.deleteService = function (service_name, res) {

    logger.info("[SERVICE] - Deleting service " + service_name + " from Iotronic...");

    var response = {
        message: '',
        result: ''
    };

    //db.getServiceByName(service_name, function (data) {
    db.getService(service_name, function (data) {

        if (data.result == "ERROR") {
            response.message = data.message;
            response.result = "ERROR";
            logger.warn("[PLUGIN] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {
                response.message = "Service " + service_name + " does not exist!";
                response.result = "ERROR";
                logger.warn("[SERVICE] --> " + response.message);
                res.status(500).send(response);

            }
            else {

                db.deleteService(service_name, function (result_db) {

                    if (result_db.result == "ERROR") {
                        logger.warn("[SERVICE] --> Delete DB error: " + result_db.message);
                        response.message = result_db.message;
                        response.result = "ERROR";
                        res.status(500).send(response);

                    } else {

                        response.message = "Service " + service_name + " successfully deleted from IoTronic!";
                        response.result = "SUCCESS";
                        logger.info("[SERVICE] --> " +response.message);
                        res.status(200).send(response);

                    }

                });


            }

        }



    });

};


services_utils.prototype.manageService = function (board_id, service, service_action, res) {

    var response = {
        message: '',
        result: {}
    };

    var service_msg = {
        ip: IoTronic_IP,
        public_port: "",
        service: ""
    };

    getServiceInfo(service, function (service_info) {

        if (service_info.result == "ERROR") {

            logger.error("[SERVICE] --> getServiceInfo error: " + service_info.message);
            if(res != false)
                res.status(500).send(service_info.message);

        } else {

            var service_id = service_info.message.id;
            var service_name = service_info.message.name;
            var localport = service_info.message.localport;

            switch (service_action) {

                case 'restore':

                    logger.info("[SERVICE] - Restoring tunnel of '" + service_name + "' service of the board " + board_id + "...");

                    db.getActiveService(service_id, board_id, function (data_p) {

                        if (data_p.result == "ERROR") {

                            response.result = data_p.result;
                            response.message = "DB getActiveService error for " + service_name + ": " + data_p.message;
                            logger.error("[SERVICE] --> " + response.message);
                            if(res != false)
                                res.status(200).send(response);

                        } else {

                            if (data_p.message.length != 0){

                                var publicPort = data_p.message[0].public_port;

                                var restore = true;

                                session_wamp.call('s4t.' + board_id + '.service.enable', [service_name, localport, publicPort, restore]).then(

                                    function (service_result) {

                                        if (service_result.result === "SUCCESS") {

                                            service_msg.public_port = publicPort;
                                            service_msg.service = service_name;
                                            response.message = service_msg;
                                            response.result = "SUCCESS";
                                            logger.info("[SERVICE] --> " + service_result.message);
                                            if(res != false)
                                                res.status(200).send(response);

                                        } else {

                                            response.result = "ERROR";
                                            response.message = "Problem exposing service: " + service_result.message;
                                            logger.error("[SERVICE] --> " + response.message);
                                            if(res != false)
                                                res.status(500).send(response);

                                        }

                                    }
                                );

                            }else{

                                response.result = "WARNING";
                                response.message = "The '" + service_name + "' service is not enabled!";
                                logger.warn("[SERVICE] --> " + response.message);
                                if(res != false)
                                    res.status(200).send(response);

                            }


                        }

                    });



                    break;

                case 'enable':

                    logger.info("[SERVICE] - Exposing '" + service_name + "' service of the board " + board_id + "...");

                    db.getActiveService(service_id, board_id, function (data_p) {

                        if (data_p.result == "ERROR") {

                            response.result = data_p.result;
                            response.message = "DB getActiveService error for " + service_name + ": " + data_p.message;
                            logger.error("[SERVICE] --> " + response.message);
                            if(res != false)
                                res.status(500).send(response);

                        } else {


                            if (data_p.message[0] != undefined) {

                                session_wamp.call('s4t.' + board_id + '.service.checkService', [service_name]).then(

                                    function (service_result) {

                                        if (service_result.result === "WARNING") {

                                            if (service_result.message.status === "ACTIVE") {

                                                response.message = "Service " + service_name + " already exposed!";
                                                response.result = "WARNING";
                                                logger.warn("[SERVICE] --> " + response.message);
                                                if(res != false)
                                                    res.status(200).send(response);

                                            }

                                        }else{

                                            if (service_result.result === "SUCCESS") {

                                                if (service_result.message.status === "INACTIVE") {

                                                    logger.warn("[SERVICE] --> " + service_name + " service of board " + board_id + " is in wrong state.. Updating...");

                                                    //UPDATE DB
                                                    db.removeTunnel(service_id, board_id, function (check_result) {

                                                        if (check_result.result == "ERROR") {
                                                            response.result = check_result.result;
                                                            response.message = check_result.message;
                                                            logger.error("[SERVICE] --> DB removeTunnel error for board " + board_id + ": " + response.message);
                                                            if(res != false)
                                                                res.status(500).send(response);

                                                        } else {

                                                            response.message = service_name + " service status of board " + board_id + " updated! Please try enabling the service again!";
                                                            response.result = "SUCCESS";
                                                            logger.info("[SERVICE] --> " + response.message);
                                                            if(res != false)
                                                                res.status(200).send(response);

                                                        }

                                                    });

                                                }

                                            }



                                        }

                                    }
                                );


                            } else {

                                //newPort function is used because we need a TCP port not already used
                                newPort(function (publicPort) {

                                    if (publicPort.result == "ERROR") {

                                        logger.error("[SERVICE] --> getServiceInfo error: " + publicPort.message);
                                        if(res != false)
                                            res.status(500).send(publicPort);

                                    } else {

                                        logger.debug("[SERVICE] --> Public port generated: " + publicPort.message);

                                        session_wamp.call('s4t.' + board_id + '.service.enable', [service_name, localport, publicPort.message]).then(

                                            function (service_result) {

                                                if (service_result.result === "SUCCESS") {

                                                    //UPDATE DB
                                                    db.registerTunnel(service_name, board_id, publicPort.message, function (check_result) {

                                                        if (check_result.result == "ERROR") {
                                                            response.result = check_result.result;
                                                            response.message = check_result.message;
                                                            logger.error("[SERVICE] --> DB registerTunnel error for board " + board_id + ": " + response.message);
                                                            if(res != false)
                                                                res.status(500).send(response);

                                                        } else {

                                                            service_msg.public_port = publicPort.message;
                                                            service_msg.service = service_name;

                                                            if (service_name === "SSH"){

                                                                response.message = "SSH command:   ssh -p " + publicPort.message + " root@"+IoTronic_IP;

                                                            }else
                                                                response.message = service_msg;

                                                            response.result = "SUCCESS";
                                                            logger.info("[SERVICE] --> " + service_result.message);
                                                            if(res != false)
                                                                res.status(200).send(response);
                                                            

                                                        }

                                                    });
                                                    

                                                } else {

                                                    response.result = "ERROR";
                                                    response.message = "Problem exposing service: " + service_result.message;
                                                    logger.info("[SERVICE] --> " + response.message);
                                                    if(res != false)
                                                        res.status(500).send(response);

                                                }

                                            }
                                            
                                        );

                                    }

                                });

                            }
                            

                        }
                        

                    });
                    

                    break;


                case 'disable':

                    logger.info("[SERVICE] - Disabling tunnel for service " + service_name + " in the board " + board_id +" ( local port = "+localport+" )");

                    db.getActiveService(service_id, board_id, function (data_p) {

                        if (data_p.result == "ERROR") {

                            response.result = data_p.result;
                            response.message = "DB getActiveService error for " + service_name + ": " + data_p.message;
                            logger.error("[SERVICE] --> " + response.message);
                            if(res != false)
                                res.status(500).send(response);

                        } else {


                            if (data_p.message[0] == undefined) {

                                response.message = "Service " + service_name + " not exposed for the board " + board_id;
                                response.result = "WARNING";
                                logger.warn("[SERVICE] --> " + response.message);
                                if(res != false)
                                    res.status(200).send(response);

                            } else {

                                var publicPort = data_p.message[0].public_port;

                                session_wamp.call('s4t.' + board_id + '.service.disable', [service_name]).then(

                                    function (service_result) {

                                        if (service_result.result === "SUCCESS") {

                                            //UPDATE DB
                                            db.removeTunnel(service_id, board_id, function (check_result) {

                                                if (check_result.result == "ERROR") {
                                                    response.result = check_result.result;
                                                    response.message = check_result.message;
                                                    logger.error("[SERVICE] --> DB removeTunnel error for board " + board_id + ": " + response.message);
                                                    if(res != false)
                                                        res.status(500).send(response);

                                                } else {

                                                    response.message = "Tunnel for service " + service_name + " disabled on board " + board_id + " (public port = "+publicPort+")";
                                                    response.result = "SUCCESS";
                                                    logger.info("[SERVICE] --> " + response.message);
                                                    if(res != false)
                                                        res.status(200).send(response);

                                                }

                                            });



                                        } else {

                                            if (service_result.result === "ERROR") {

                                                response.result = "ERROR";
                                                response.message = "Problem exposing service: " + service_result.message;
                                                logger.info("[SERVICE] --> " + response.message);
                                                if(res != false)
                                                    res.status(500).send(response);

                                            }else if (service_result.result === "WARNING"){

                                                logger.warn("[SERVICE] --> " + service_name + " service of board " + board_id + " is in wrong state.. Updating...");

                                                if (service_result.message.status === "INACTIVE"){

                                                    //UPDATE DB
                                                    db.removeTunnel(service_id, board_id, function (check_result) {

                                                        if (check_result.result == "ERROR") {
                                                            response.result = check_result.result;
                                                            response.message = check_result.message;
                                                            logger.error("[SERVICE] --> DB removeTunnel error for board " + board_id + ": " + response.message);
                                                            if(res != false)
                                                                res.status(500).send(response);

                                                        } else {

                                                            response.result = "WARNING";
                                                            response.message = service_result.message.message + " - Database updated!";
                                                            logger.info("[SERVICE] --> " + response.message);
                                                            if(res != false)
                                                                res.status(200).send(response);
                                                        }

                                                    });
                                                    

                                                }

                                            }
                                            
                                        }

                                    }
                                    
                                );
                                

                            }

                        }

                    });

                    break;

                default:
                    response.result = "ERROR";
                    response.message = "Service action " + service_action + " is not supported! [ 'enable' | 'disable' | 'restore' ]";
                    logger.warn("[SERVICE] --> " + response.message);
                    if(res != false)
                        res.status(500).send(response.message);

                    break;

            }






        }
        
    });



};


services_utils.prototype.restoreServices = function (result) {

    var board_id = result[0];

    var response = {
        message: '',
        result: ''
    };

    var d = Q.defer();

    // Get service tunnels for the connected board
    db.getBoardServices(board_id, function (data) {

        if (data.result == "ERROR") {

            response.message = "Error retrieving services information for board '" + board_id + "' : " + data.message;
            response.result = "ERROR";
            logger.error("[SERVICE] --> " + response.message);
            d.resolve(response);

        } else {

            if(data.message.length == 0){

                response.message = "No services to restore for the board " + board_id;
                response.result = "SUCCESS";
                logger.info("[SERVICE] --> "+response.message);
                d.resolve(response);
            }
            else{

                logger.info("[SERVICE] - RELOAD BOARD SERVICE TUNNELS:\n"+ JSON.stringify(data.message, null, "\t"));

                for(var key=0; key < data.message.length; key++) {

                    (function(key) {

                        setTimeout(function(){

                            //function (board_id, service_name, service_id, service_action, res)
                            //services_utils.manageService(board_id, null, data.message[key].service_id, "restore", false);
                            services_utils.manageService(board_id, data.message[key].service_id, "restore", false);

                        }, key*500);

                        if (key == data.message.length - 1) {

                            response.message = "Restoring process for the board "+board_id+" started...";
                            response.result = "SUCCESS";
                            logger.info("[SERVICE] - "+response.message);

                            d.resolve(response);

                        }

                    })(key);

                }
            }



        }


    });

    return d.promise;

};


//This function returns a pseudo random number in a range
function randomIntInc(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}


//Function to calculate a new tcp port not already used
function newPort(callback) {

    var port = randomIntInc(6000, 7000);

    var response = {
        message: '',
        result: ''
    };



    db.checkPort(port, function (data) {

        if (data.result == "ERROR") {
            logger.error("[SERVICE] --> DB checkPort error: " + data.message);
            callback(data)

        } else {

            logger.debug(data.message)

            if (data.message.length == 0) {
                response.message = port;
                response.result = "SUCCESS";
                callback(response);
            }
            else
                newPort();

        }

    });

}


// Function to get information about a service registered in Iotronic specifying its name or id
//function getServiceInfo(service_name, service_id, callback) {
function getServiceInfo(service, callback) {

    var response = {
        message: '',
        result: ''
    };

    var service_info = {
        name: '',
        localport: '',
        id:''
    };

    //db.getServiceByName(service, function (data) {
    db.getService(service, function (data) {

        if (data.result == "ERROR") {

            response.message = data.message;
            response.result = "ERROR";
            logger.warn("[SERVICE] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {

                response.message = "Service '" + service + "' does not exist!";
                response.result = "ERROR";
                logger.error("[SERVICE] --> " + response.message);
                callback(response);

            } else {

                service_info.id = data.message[0].id;
                service_info.localport = data.message[0].port;
                service_info.name = data.message[0].name;

                response.message = service_info;
                response.result = "SUCCESS";

                callback(response);

            }


        }

    });
    
    /*
    if(service_id == null){
        
        db.getServiceByName(service_name, function (data) {

            if (data.result == "ERROR") {

                response.message = data.message;
                response.result = "ERROR";
                logger.warn("[SERVICE] --> " + response.message);
                res.status(500).send(response);

            } else {

                if (data.message[0] === undefined) {

                    response.message = "Service " + service_name + " does not exist!";
                    response.result = "ERROR";
                    logger.error("[SERVICE] --> " + response.message);
                    callback(response);

                } else {

                    service_info.id = data.message[0].id;
                    service_info.localport = data.message[0].port;
                    service_info.name = service_name;

                    response.message = service_info;
                    response.result = "SUCCESS";

                    callback(response);

                }


            }

        });
        
    } else if (service_name == null){

        db.getServiceById(service_id, function (data) {

            if (data.result == "ERROR") {

                response.message = data.message;
                response.result = "ERROR";
                logger.warn("[SERVICE] --> " + response.message);
                res.status(500).send(response);

            } else {

                if (data.message[0] === undefined) {

                    response.message = "Service " + service_id + " does not exist!";
                    response.result = "ERROR";
                    logger.error("[SERVICE] --> " + response.message);
                    callback(response);

                } else {

                    service_info.id = service_id;
                    service_info.localport = data.message[0].port;
                    service_info.name = data.message[0].name;

                    response.message = service_info;
                    response.result = "SUCCESS";
                    callback(response);


                }


            }

        });


    }
    */




}



services_utils.prototype.exportCommands = function (session){

    //Register all the module functions as WAMP RPCs
    logger.debug("[WAMP-EXPORTS] Services RPCs exposing:");

    // BOARD SERVICES RESTORE ON CONNECTION
    session.register('s4t.iotronic.service.restore', this.restoreServices);
    logger.debug('[WAMP-EXPORTS] --> s4t.iotronic.service.restore');


    logger.info('[WAMP-EXPORTS] Services RPCs exported to the cloud!');


};

module.exports = services_utils;

