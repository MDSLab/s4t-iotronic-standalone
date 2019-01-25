//############################################################################################
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
//############################################################################################


var logger = log4js.getLogger('nodered_utils');
logger.setLevel(loglevel);

var fs = require('fs');

var db_utils = require('./../management/mng_db');
var db = new db_utils;
var board_utility = require('./../management/mng_board');
var project_utils = require('./../management/mng_project');

var session_wamp;

nodered_utils = function (session, rest) {

    session_wamp = session;

    // NODE-RED MANAGEMENTS APIs
    //---------------------------------------------------------------------------------------------------

    //Execute action on board
    /**
     * @swagger
     * /v1/boards/{board}/nodered:
     *   post:
     *     tags:
     *       - Node-Red
     *     description: Perform an action on Node-RED
     *     summary: perform action on Node-RED
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
    rest.post('/v1/boards/:board/nodered', function (req, res) {

        var board = req.params.board;

        logger.info("[API] - Node-RED board action - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        board_utility.checkBoardAvailable(board, res, function (available) {

            if (available.result == "SUCCESS") {

                var action = req.body.action; // reboot | etc..
                var parameters = req.body.parameters; // OPTIONAL

                var ApiRequired = {"action":action};

                board_utility.checkRequired(ApiRequired, function (check) {

                    if (check.result == "ERROR") {

                        res.status(500).send(check);

                    } else {

                        execEngineAction(board, action, parameters, res);

                    }

                });


            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }


        });




    });


    //Get flows list of the board
    /**
     * @swagger
     * /v1/boards/{board}/nodered/flows:
     *   post:
     *     tags:
     *       - Node-Red
     *     description: Get flows list of the board
     *     summary: get flows list
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
     *          description: List of Node-RED flows of a board
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of Node-RED flows"
     *                  items:
     *                      title: flow info from Node-RED
     *                      type: object
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/boards/:board/nodered/flows', function (req, res) {

        var board = req.params.board;

        logger.info("[API] - Node-RED board flows - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        board_utility.checkBoardAvailable(board, res, function (available) {

            if (available.result == "SUCCESS") {

                var response = {
                    message: {},
                    result: ""
                };
                
                session_wamp.call('s4t.' + board + '.nodered.getFlows').then(
                    function (rpc_response) {

                        if (rpc_response.result == "ERROR") {

                            response.message = rpc_response.message;
                            response.result = "ERROR";
                            res.status(500).send(response);
                            logger.error("[SYSTEM] --> Get flows result on board '" + board + "': " + response.message);

                        } else {
                            response.message = rpc_response.message;
                            response.result = rpc_response.result;
                            res.status(200).send(response);
                            logger.info("[SYSTEM] --> Get flows result on board '" + board + "': " + response.message);

                        }

                    },
                    function (rpc_error) {

                        response.message = "RPC UNAVAILABLE: " + rpc_error.error;
                        response.result = "WARNING";

                        logger.warn("[SYSTEM] - RPC UNAVAILABLE: " + rpc_error.error);
                        res.status(200).send(response);

                    }

                );
                
                
            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }


        });




    });


    //BATCH: Get flows list of the board
    /**
     * @swagger
     * /v1/projects/{project}/nodered/flows:
     *   post:
     *     tags:
     *       - Node-Red
     *     description: Get flows list from the boards of a project
     *     summary: get flows list
     *     parameters:
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic projects ID or NAME"
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
    rest.get('/v1/projects/:project/nodered/flows', function (req, res) {

        logger.info("[API] - BATCH Get Node-RED flows - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var project = req.params.project;

        var response = {
            message: '',
            result: ''
        };

        project_utils.getProjectBoards(project).then(

            function (data) {

                if(data.result == "SUCCESS"){

                    var boards_list = data.message;

                    for (var i = 0; i < boards_list.length; i++) {

                        (function (i) {

                            var board_id = boards_list[i]["board_id"];

                            board_utility.checkBoardAvailable(board_id, res, function (available) {

                                if (available.result == "SUCCESS") {

                                    session_wamp.call('s4t.' + board_id + '.nodered.getFlows').then(
                                        function (rpc_response) {

                                            if (rpc_response.result == "ERROR") {

                                                response.message = rpc_response.message;
                                                response.result = "ERROR";
                                                //res.status(500).send(response);
                                                logger.error("[SYSTEM] --> Get flows result on board '" + board_id + "': " + response.message);

                                            } else {
                                                response.message = rpc_response.message;
                                                response.result = rpc_response.result;
                                                //res.status(200).send(response);
                                                logger.info("[SYSTEM] --> Get flows result on board '" + board_id + "': " + response.message);

                                            }

                                        },
                                        function (rpc_error) {

                                            response.message = "RPC UNAVAILABLE: " + rpc_error.error;
                                            response.result = "WARNING";

                                            logger.warn("[SYSTEM] - RPC UNAVAILABLE: " + rpc_error.error);
                                            res.status(200).send(response);

                                        }

                                    );
                                    
                                } else if (available.result == "WARNING") {
                                    logger.warn("[API] --> " + available.message);
                                }


                            });


                            if (i === (boards_list.length - 1)) {

                                response.result = "SUCCESS";
                                response.message = "Getting Node-RED flows from boards of the project '" + project + "'!";
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



    });


    //Get flows list of the board
    /**
     * @swagger
     * /v1/boards/{board}/nodered/flows:
     *   post:
     *     tags:
     *       - Node-Red
     *     description: Get flows list of the board
     *     summary: get flows list
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
     *          description: List of Node-RED flows of a board
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of Node-RED flows"
     *                  items:
     *                      title: flow info from Node-RED
     *                      type: object
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/boards/:board/nodered/flow/:flow', function (req, res) {

        var board = req.params.board;
        var flow_id = req.params.flow;

        logger.info("[API] - Node-RED board flow info - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        board_utility.checkBoardAvailable(board, res, function (available) {

            if (available.result == "SUCCESS") {

                var response = {
                    message: {},
                    result: ""
                };

                session_wamp.call('s4t.' + board + '.nodered.getFlowInfo', [flow_id]).then(
                    
                    function (rpc_response) {

                        if (rpc_response.result == "ERROR") {

                            response.message = rpc_response.message;
                            response.result = "ERROR";
                            res.status(500).send(response);
                            logger.warn("[SYSTEM] --> Got error retrieving flow info from board '" + board + "': " + JSON.stringify(response.message));

                        } else {

                            response.message = rpc_response.message;
                            response.result = rpc_response.result;
                            res.status(200).send(response);
                            logger.info("[SYSTEM] --> Retrieved flow ("+flow_id+") details from board '" + board + "'!");

                        }

                    },
                    function (rpc_error) {

                        response.message = "RPC UNAVAILABLE: " + rpc_error.error;
                        response.result = "WARNING";

                        logger.warn("[SYSTEM] - RPC UNAVAILABLE: " + rpc_error.error);
                        res.status(200).send(response);

                    }

                );


            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }


        });




    });

    
    //INJECT flow
    /**
     * @swagger
     * /v1/boards/{board}/nodered/flow:
     *   post:
     *     tags:
     *       - Node-Red
     *     description: Inject a flow in the Node-RED instance of the board
     *     summary: Inject a flow in Node-RED
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
     *                  - flow
     *              properties:
     *                  flow:
     *                      type: array
     *                      description: "flow represented by an array of nodes (Complete Flow configuration)"
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
    rest.post('/v1/boards/:board/nodered/flow', function (req, res){

        var board = req.params.board;

        logger.info("[API] - Node-RED flow injection - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        board_utility.checkBoardAvailable(board, res, function (available) {

            if (available.result == "SUCCESS") {

                var exported_flow = req.body.exported_flow; //Complete Flow configuration

                var ApiRequired = {"exported_flow":exported_flow};

                board_utility.checkRequired(ApiRequired, function (check) {

                    if (check.result == "ERROR") {

                        res.status(500).send(check);

                    } else {

                        injectFlow(board, null, [exported_flow, res]);


                    }

                });


            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }


        });



    });


    logger.debug("[REST-EXPORT] - Node-RED's APIs exposed!");

    //---------------------------------------------------------------------------------------------------

    // Register RPC methods
    this.exportCommands(session_wamp)


};



var execEngineAction = function (board, action, parameters, res) {

    var response = {
        message: {},
        result: ""
    };

    switch (action) {

        case 'start':

            session_wamp.call('s4t.' + board + '.nodered.start').then(
                function (rpc_response) {

                    if (rpc_response.result == "ERROR") {

                        response.message = rpc_response.message;
                        response.result = "ERROR";
                        res.status(500).send(response);
                        logger.error("[SYSTEM] --> Action result on board '" + board + "': " + response.message);

                    } else {
                        response.message = rpc_response.message;
                        response.result = rpc_response.result;
                        res.status(200).send(response);
                        logger.info("[SYSTEM] --> Action result on board '" + board + "': " + response.message);

                    }

                },
                function (rpc_error) {

                    response.message = "RPC UNAVAILABLE: " + rpc_error.error;
                    response.result = "WARNING";

                    logger.warn("[SYSTEM] - RPC UNAVAILABLE: " + rpc_error.error);
                    res.status(200).send(response);

                }

            );

            break;

        case 'stop':

            session_wamp.call('s4t.' + board + '.nodered.stop').then(
                function (rpc_response) {

                    if (rpc_response.result == "ERROR") {

                        response.message = rpc_response.message;
                        response.result = "ERROR";
                        res.status(500).send(response);
                        logger.error("[SYSTEM] --> Action result on board '" + board + "': " + response.message);

                    } else {
                        response.message = rpc_response.message;
                        response.result = rpc_response.result;
                        res.status(200).send(response);
                        logger.info("[SYSTEM] --> Action result on board '" + board + "': " + response.message);

                    }

                },
                function (rpc_error) {

                    response.message = "RPC UNAVAILABLE: " + rpc_error.error;
                    response.result = "WARNING";

                    logger.warn("[SYSTEM] - RPC UNAVAILABLE: " + rpc_error.error);
                    res.status(200).send(response);

                }

            );

            break;

        default:

            var response = {
                message: "",
                result: ""
            };
            response.message = "Plugin operation '" + plugin_operation + "' not supported!";
            response.result = 'ERROR';
            logger.error("[PLUGIN] - " + response.message);
            res.status(500).send(response);

            break;

    }

};


var injectFlow = function (board, request_id, args) {


    var response = {
        message: '',
        result: ''
    };

    var exported_flow = args[0];
    var res = args[1];

    flowFormatConverter(exported_flow, function (single_flow) {

        /*
        response.message = single_flow;
        response.result = "SUCCESS";
        res.status(200).send(response);
        */

        session_wamp.call('s4t.'+ board + '.nodered.injectFlow', [single_flow]).then(

            function (rpc_response) {

                if (rpc_response.result == "ERROR") {

                    response.message = rpc_response.message;
                    response.result = "ERROR";

                    if(res != false){
                        logger.warn("[PLUGIN] --> Flow injection error for board '" + board + "': " + JSON.stringify(response.message, null, "\t"));
                        res.status(500).send(response);
                    }else{
                        request_utils.updateResult(request_id, board, response.result, response.message);
                    }

                }else{

                    response.message = rpc_response.message;
                    response.result = rpc_response.result;

                    if(res != false){
                        logger.info("[PLUGIN] --> Flow injection result for board '" + board + "': " + JSON.stringify(response.message, null, "\t"));
                        res.status(200).send(response);
                    }else{
                        request_utils.updateResult(request_id, board, response.result, response.message);
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

                    request_utils.updateResult(request_id, board, response.result, response.message);

                }

            }

        );


    })

};


var flowFormatConverter = function (exported, callback) {

    var single_format_template = {
        "label": "",                //A label for the the flow
        "nodes": [],                //An array of the Nodes in the flow
        "configs": [],              //An array of the Configs in the flow
        "subflows": []              //An array of the Subflows in the flow - only used when representing the global flow configuration
    };

    var single_flow = single_format_template; //import template

    var exported = JSON.parse(exported);  //from string to JSON

    for (var item in exported) {

        var node_type = exported[item].type;

        if(node_type != "tab"){

            single_flow.nodes.push(exported[item])
        }
        else{
            single_flow.label = exported[item].label;
        }

        if (item == exported.length - 1 ){
            callback(single_flow);

        }

    }


};



nodered_utils.prototype.exportCommands = function (session){

    //Register all the module functions as WAMP RPCs

};



module.exports = nodered_utils;
