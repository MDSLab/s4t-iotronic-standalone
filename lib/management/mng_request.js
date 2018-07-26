//###############################################################################
//##
//# Copyright (C) 2018 Nicola Peditto
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

//service logging configuration: "request_utils"
var logger = log4js.getLogger('mng_request');
logger.setLevel(loglevel);

var project_utils = require('./mng_project');

var db_utils = require('./mng_db');
var db = new db_utils;

var Q = require("q");
var uuid = require('node-uuid');

REQUESTS = {};


request_utils = function (session, rest) {


    // IoTronic request management APIs
    //---------------------------------------------------------------------------------------------------

    //GET global requests list
    /**
     * @swagger
     * /v1/requests/:
     *   get:
     *     tags:
     *       - Requests
     *     description: It returns IoTronic requests list
     *     summary: get Iotronic requests
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: Requests list of Iotronic
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of requests"
     *                  items:
     *                      title: request info
     *                      type: object
     *                      properties:
     *                          id_request:
     *                              type: string
     *                              description: "The IoTronic request ID"
     *                          project_id:
     *                              type: string
     *                              description: "The IoTronic project ID"
     *                          subject:
     *                              type: string
     *                              description: "Batch API called"
     *                          result:
     *                              type: string
     *                              description: "Request result ['completed' | 'pending']"
     *                          timestamp:
     *                              type: string
     *                              description: "Timestamp of the latest request update"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/requests/', function (req, res) {

        logger.info("[API] - Global requests list called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        db.getGlobalRequestsList(function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting global requests list: " + data.message;
                response.result = "ERROR";
                logger.error("[REQUEST] --> " + response.message);
                res.status(500).send(response);

            } else {
                res.status(200).send(data);
            }

        });

    });


    //GET IoTronic request results
    /**
     * @swagger
     * /v1/requests/{request}:
     *   get:
     *     tags:
     *       - Requests
     *     description: It returns IoTronic request results
     *     summary: get request results
     *     parameters:
     *      - in: path
     *        name: request
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic request ID"
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: "IoTronic request results"
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: object
     *                  properties:
     *                          board_id:
     *                              type: string
     *                              description: "Batch API called"
     *                          result:
     *                              type: string
     *                              description: "Iotronic request result ['SUCCESS' | 'ERROR' | 'WARNING']"
     *                          message:
     *                              type: string
     *                              description: "Iotronic result message"
     *                          timestamp:
     *                              type: string
     *                              description: "Timestamp of the latest request update"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/requests/:request', function (req, res) {

        logger.info("[API] - Get request results - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        var request = req.params.request;

        db.getRequestResults(request, function (data) {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "IoTronic request '" + request + "' does not exist!";
                logger.error("[REQUEST] --> " + response.message);
                res.status(500).send(response);

            }
            else {

                if (data.result == "ERROR") {
                    response.message = "Error getting request results: " + data.message;
                    response.result = "ERROR";
                    logger.error("[REQUEST] --> " + response.message);
                    res.status(500).send(response);

                } else {

                    //data.message[0].message = data.message[0].message.slice(1,-1);
                    response.message = data.message;
                    response.result = "SUCCESS";
                    logger.debug("[REQUEST] --> Results of the request '"+request+"': " + JSON.stringify(response.message));
                    res.status(200).send(response);

                }

            }

        });

    });


    //GET project requests list
    /**
     * @swagger
     * /v1/projects/{project}/requests:
     *   get:
     *     tags:
     *       - Requests
     *     description: It returns IoTronic project's requests list
     *     summary: get project's requests
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: Requests list of a project
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of requests"
     *                  items:
     *                      title: request info
     *                      type: object
     *                      properties:
     *                          id_request:
     *                              type: string
     *                              description: "The IoTronic request ID"
     *                          subject:
     *                              type: string
     *                              description: "Batch API called"
     *                          result:
     *                              type: string
     *                              description: "Request result ['completed' | 'pending']"
     *                          timestamp:
     *                              type: string
     *                              description: "Timestamp of the latest request update"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/projects/:project/requests', function (req, res) {

        logger.info("[API] - Project requests list called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var project = req.params.project;

        var response = {
            message: '',
            result: ''
        };

        db.getProjectRequestsList(project, function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting project requests list: " + data.message;
                response.result = "ERROR";
                logger.error("[REQUEST] --> " + response.message);
                res.status(500).send(response);

            } else {
                res.status(200).send(data);
            }

        });

    });


    //DELETE IoTronic request
    /**
     * @swagger
     * /v1/requests/{request}:
     *   delete:
     *     tags:
     *       - Requests
     *     description: Delete an IoTronic request
     *     summary: delete IoTronic request
     *     parameters:
     *      - in: path
     *        name: request
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic request ID
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
    rest.delete('/v1/requests/:request', function (req, res) {

        logger.info("[API] - Delete IoTronic request - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var request_id = req.params.request;

        var response = {
            message: '',
            result: ''
        };


        db.getRequest(request_id, function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting request details: " + data.message;
                response.result = "ERROR";
                logger.error("[REQUEST] --> " + response.message);
                res.status(500).send(response);

            } else {

                if (data.message[0] === undefined) {
                    response.result = "ERROR";
                    response.message = "IoTronic request with ID '" + request_id + "' does not exist!";
                    logger.error("[REQUEST] --> " + response.message);
                    res.status(500).send(response);

                }
                else {

                    db.deleteRequest(request_id, function (data) {

                        if (data.result == "ERROR") {
                            response.message = "Error deleting request: " + data.message;
                            response.result = "ERROR";
                            logger.error("[REQUEST] --> " + response.message);
                            res.status(500).send(response);

                        } else {
                            response.message = "Request '"+request_id+"' successfully deleted!";
                            response.result = "SUCCESS";
                            logger.info("[REQUEST] --> " + response.message);
                            res.status(200).send(response);

                        }

                    });

                }

            }

        });


    });


    //DELETE all IoTronic requests
    /**
     * @swagger
     * /v1/requests/:
     *   delete:
     *     tags:
     *       - Requests
     *     description: Delete all IoTronic requests
     *     summary: delete all IoTronic requests
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
    rest.delete('/v1/requests/', function (req, res) {

        logger.info("[API] - Delete all IoTronic request - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);
        
        var response = {
            message: '',
            result: ''
        };

        db.deleteAllRequests(function (data) {

            if (data.result == "ERROR") {
                response.message = "Error deleting Iotronic requests: " + data.message;
                response.result = "ERROR";
                logger.error("[REQUEST] --> " + response.message);
                res.status(500).send(response);

            } else {
                response.message = "Requests successfully deleted!";
                response.result = "SUCCESS";
                logger.info("[REQUEST] --> " + response.message);
                res.status(200).send(response);

            }

        });


    });


    //DELETE all project requests
    /**
     * @swagger
     * /v1/projects/{project}/requests:
     *   delete:
     *     tags:
     *       - Requests
     *     description: It deletes all requests of a project
     *     summary: delete project's requests
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
    rest.delete('/v1/projects/:project/requests', function (req, res) {

        logger.info("[API] - Delete project's requests called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var project = req.params.project;

        var response = {
            message: '',
            result: ''
        };

        db.deleteProjectRequests(project, function (data) {

            if (data.result == "ERROR") {
                response.message = "Error deleting project requests: " + data.message;
                response.result = "ERROR";
                logger.error("[REQUEST] --> " + response.message);
                res.status(500).send(response);

            } else {
                response.message = "Requests of the project '"+project+"' successfully deleted!";
                response.result = "SUCCESS";
                logger.info("[REQUEST] --> " + response.message);
                res.status(200).send(response);
            }

        });

    });



    logger.debug("[REST-EXPORT] - IoTronic requests management APIs exposed!");


};


var singleRequest = function (board_id, subject, res, funcAction, funcArgs) {

    var response = {
        message: {},
        result: ""
    };
    
    
    //get project ID of the board

    db.checkBoard(board_id, function (data) {

        if (data.result == "ERROR") {

            response.message = "Error getting board info: " + data.message;
            response.result = "ERROR";
            logger.error("[SYSTEM] --> " + response.message);
            res.status(500).send(response);

        } else {

            var project = data.message[0].projects_id;
            var board_label = data.message[0].label;

            insertRequest(project, subject).then(

                function (request) {

                    if (request.result == "ERROR") {

                        res.status(500).send(request);

                    } else {

                        var request_id = request.message;

                        REQUESTS[request_id]=1;

                        db.insertRequestResult(request_id, board_id, "pending", "-", function (data) {

                            if (data.result == "ERROR") {

                                logger.error("[SYSTEM] --> " + data.message);

                            }else{

                                funcAction(board_id, request_id, funcArgs);

                                response.result = "SUCCESS";
                                response.message = "Performing action '"+funcArgs[0]+"' on board '" + board_label + "' ("+board_id+").";
                                response.board_id = board_id;
                                response.req_id = request_id;
                                response.subject = subject;
                                logger.info("[SYSTEM] --> " + response.message);
                                res.status(200).send(response);

                            }

                        });

                    }


                }

            );


        }

    });
    
    
    




};


var batchRequest = function (project, subject, res, funcAction, funcArgs) {

    var response = {
        message: {},
        result: ""
    };

   insertRequest(project, subject).then(

        function (request) {

            if (request.result == "ERROR") {

                res.status(500).send(request);

            } else {

                var request_id = request.message;

                project_utils.getProjectBoards(project).then(

                    function (data) {

                        if(data.result == "SUCCESS"){

                            var boards_list = data.message;

                            REQUESTS[request_id]=boards_list.length;

                            for (var i = 0; i < boards_list.length; i++) {

                                (function (i) {

                                    var board_id = boards_list[i]["board_id"];

                                    db.insertRequestResult(request_id, board_id, "pending", "-", function (data) {

                                        if (data.result == "ERROR") {

                                            logger.error("[SYSTEM] --> " + data.message);

                                        }else{

                                            funcAction(board_id, request_id, funcArgs);

                                        }

                                    });

                                    if (i === (boards_list.length - 1)) {

                                        response.result = "SUCCESS";
                                        response.message = "Action on boards of the project '" + project + "' -  Request ID: " + request_id;
                                        response.project_id = project;
                                        response.req_id = request_id;
                                        response.subject = subject;
                                        logger.info("[PROJECT] --> " + response.message);
                                        res.status(200).send(response);

                                    }

                                })(i);

                            }

                        } else{

                            response.result = "WARNING";
                            response.message = data.message;
                            logger.warn("[PROJECT] --> " + response.message);
                            res.status(200).send(response);

                        }


                    }

                );
                
            }


        }

    );


};


var insertRequest = function (project, subject) {

    var response = {
        message: {},
        result: ""
    };

    var d = Q.defer();

    var request_id = uuid.v4();

    db.insertRequest(request_id, project, subject, "pending", function (data) {

        if (data.result == "ERROR") {

            response.message = "Error inserting new request: " + data.message;
            response.result = "ERROR";
            logger.error("[PROJECT] --> " + response.message);
            d.resolve(response);

        } else {

            response.result = "SUCCESS";
            response.message = request_id; //data.message;

            d.resolve(response);

        }

    });


    return d.promise;

};


var updateResult = function (request_id, board_id, result, message) {

    REQUESTS[request_id] =  REQUESTS[request_id] - 1;

    db.updateResultStatus(request_id, board_id, result, message, function (data) {

        if (data.result == "ERROR") {

            logger.error("[SYSTEM] --> " + data.message);

        } else {

            if(result == "ERROR")
                logger.error("[SYSTEM] --> Action result on board '" + board_id + "' for request '"+request_id+"':\n" + message);
            else
                logger.debug("[SYSTEM] --> Action result on board '" + board_id + "' for request '"+request_id+"':\n" + message);
            
            if (REQUESTS[request_id] == 0) {
                
                db.updateRequestStatus(request_id, "completed", function (data) {

                    if (data.result == "ERROR") {

                        logger.error("[SYSTEM] --> " + data.message);

                    }

                    delete REQUESTS[request_id];
                    
                });

            }

        }

    });
    
};





module.exports = request_utils;
module.exports.insertRequest = insertRequest;
module.exports.updateResult = updateResult;
module.exports.singleRequest = singleRequest;
module.exports.batchRequest = batchRequest;