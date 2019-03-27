//###############################################################################
//##
//# Copyright (C) 2014-2018 Nicola Peditto, Francesco Longo
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


var logger = log4js.getLogger('plugin_utils');
logger.setLevel(loglevel);

var fs = require('fs');
var Q = require("q");
var md5 = require('md5');

var db_utils = require('./../management/mng_db');
var db = new db_utils;
var board_utility = require('./../management/mng_board');
var request_utils = require('./../management/mng_request');


var session_wamp;

var PLUGINS_STORE = process.env.IOTRONIC_HOME + '/plugins/';

plugin_utils = function (session, rest) {

    session_wamp = session;

    // PLUGIN MANAGEMENTS APIs
    //---------------------------------------------------------------------------------------------------


    //GET plugins list
    /**
     * @swagger
     * /v1/plugins/:
     *   get:
     *     tags:
     *       - Plugins
     *     description: It returns IoTronic user-plugins list
     *     summary: get plugin list
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: List of IoTronic plugins
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of plugins"
     *                  items:
     *                      title: plugin info
     *                      type: object
     *                      properties:
     *                          id:
     *                              type: integer
     *                              description: "The IoTronic plugin ID"
     *                          name:
     *                              type: string
     *                              description: "Plugin name"
     *                          category:
     *                              type: string
     *                              description: "Plugin category: ‘async’ or ‘sync’"
     *                          version:
     *                              type: string
     *                              description: "Plugin version"
     *                          checksum:
     *                              type: string
     *                              description: "Plugin source code checksum"
     *                          code:
     *                              type: string
     *                              description: "Plugin source code"
     *                          defaults:
     *                              type: object
     *                              description: "Plugin input default parameters"
     *                          type_id:
     *                              type: integer
     *                              description: "Plugin type ID: identifies the nature of the plugin, 1 -> 'nodejs' or 2 -> 'python'"
     *                          tag_id:
     *                              type: integer
     *                              description: "Plugin revision ID (e.g. 1 -> 'released' | 2 -> 'unreleased')"
     *                          description:
     *                              type: string
     *                              description: "Plugin description (300 char)"
     *                          updated_at:
     *                              type: string
     *                              description: "Timestamp of the latest plugin change"
     *                          created_at:
     *                              type: string
     *                              description: "Timestamp of plugin publishing"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/plugins/', function (req, res) {
        
        logger.info("[API] - Plugins list - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        db.getPluginList(function (data) {
            if(data.result=="ERROR"){
                response.message = data.message;
                response.result = "ERROR";
                logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                res.status(500).send(response);

            }else{

                data.message.forEach(function(entry) {
                    delete entry['checksum'];
                });

                response.message = data.message;
                response.result = "SUCCESS";
                res.status(200).send(response);

            }
            
        });


    });

    //GET plugin details
    /**
     * @swagger
     * /v1/plugins/{plugin}:
     *   get:
     *     tags:
     *       - Plugins
     *     description: It returns plugin information
     *     summary: get plugin details
     *     parameters:
     *      - in: path
     *        name: plugin
     *        required: true
     *        schema:
     *        type: integer
     *        description: "The IoTronic plugin ID"
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: Plugin information
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                      type: object
     *                      properties:
     *                          id:
     *                              type: integer
     *                              description: "The IoTronic plugin ID"
     *                          name:
     *                              type: string
     *                              description: "Plugin name"
     *                          category:
     *                              type: string
     *                              description: "Plugin category: ‘async’ or ‘sync’"
     *                          version:
     *                              type: string
     *                              description: "Plugin version"
     *                          checksum:
     *                              type: string
     *                              description: "Plugin source code checksum"
     *                          code:
     *                              type: string
     *                              description: "Plugin source code"
     *                          defaults:
     *                              type: object
     *                              description: "Plugin input default parameters"
     *                          type:
     *                              type: string
     *                              description: "Plugin type identifies the nature of the plugin: 'nodejs' or 'python'"
     *                          tag:
     *                              type: string
     *                              description: "Plugin revision (e.g. 'released' | 'unreleased')"
     *                          description:
     *                              type: string
     *                              description: "Plugin description (300 char)"
     *                          updated_at:
     *                              type: string
     *                              description: "Timestamp of the latest plugin change"
     *                          created_at:
     *                              type: string
     *                              description: "Timestamp of plugin publishing"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/plugins/:plugin', function (req, res) {

        logger.info("[API] - Plugin details - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var plugin = req.params.plugin;

        var response = {
            message: '',
            result: ''
        };

        db.getPlugin(plugin, function (data) {

            if(data.result=="ERROR"){
                
                response.message = data.message;
                response.result = "ERROR";
                logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                res.status(500).send(response);

            }else{
                
                if (data.message[0] === undefined) {
                    response.message = "Plugin '" + plugin + "' does not exist in IoTronic!";
                    response.result = "WARNING";
                    res.status(200).send(response);
                }
                else {
                    response.message = data.message[0];
                    response.result = "SUCCESS";
                    res.status(200).send(response);
                }


                

            }

        });

    });
    
    //GET plugins list inside a board
    /**
     * @swagger
     * /v1/boards/{board}/plugins:
     *   get:
     *     tags:
     *       - Plugins
     *     description: It returns IoTronic user-plugins list in a board
     *     summary: get IoTronic plugins list in a board
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
     *          description: Plugins list injected in the board
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of plugins"
     *                  items:
     *                      title: plugin info
     *                      type: object
     *                      properties:
     *                          id:
     *                              type: integer
     *                              description: "The IoTronic plugin ID"
     *                          name:
     *                              type: string
     *                              description: "Plugin name"
     *                          category:
     *                              type: string
     *                              description: "Plugin type: ‘async’ or ‘sync’"
     *                          state:
     *                              type: string
     *                              description: "Plugin status: 'injected', 'executed', 'running', 'killed'"
     *                          type:
     *                              type: string
     *                              description: "Plugin type identifies the nature of the plugin: 'nodejs' or 'python'"
     *                          tag:
     *                              type: string
     *                              description: "Plugin revision (e.g. 'released' | 'unreleased')"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/boards/:board/plugins', function (req, res) {

        logger.info("[API] - Board plugins list - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        var response = {
            message: '',
            result: ''
        };
        
        logger.info("[PLUGIN] - Plugins list for the board " + board);

        db.BoardPlugins(board, function (data) {

            if(data.result=="ERROR"){
                
                response.message = data.message;
                response.result = "ERROR";
                logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                res.status(500).send(response);

            }else{
                
                data.message.forEach(function(entry) {
                    delete entry['checksum'];
                });
                response.message = data.message;
                response.result = "SUCCESS";
                res.status(200).send(response);

            }

        });


    });

    //GET plugin details inside a board
    /**
     * @swagger
     * /v1/boards/{board}/plugins/{plugin}:
     *   get:
     *     tags:
     *       - Plugins
     *     description: Return plugin status details inside a board
     *     summary: get plugin status in a board
     *     parameters:
     *      - in: path
     *        name: plugin
     *        required: true
     *        schema:
     *        type: integer
     *        description: "The IoTronic plugin ID"
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
     *          description: Plugin status in the board
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                      title: plugin info
     *                      type: object
     *                      properties:
     *                          board_id:
     *                              type: string
     *                              description: "The IoTronic board ID"
     *                          plugin_id:
     *                              type: integer
     *                              description: "The IoTronic plugin ID"
     *                          latest_change:
     *                              type: string
     *                              description: "Timestamp of the latest plugin state update."
     *                          state:
     *                              type: string
     *                              description: "Plugin status: 'injected', 'executed', 'running', 'killed'"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/boards/:board/plugins/:plugin', function (req, res) {

        logger.info("[API] - Board plugin details - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;
        var plugin = req.params.plugin;

        plugin_utils.getBoardPluginDetails(board, plugin, res);

    });

    //CREATE plugin in Iotronic
    /**
     * @swagger
     * /v1/plugins/:
     *   post:
     *     tags:
     *       - Plugins
     *     description:  create new IoTronic user-plugin
     *     summary: create IoTronic plugin
     *     produces:
     *       - application/json
     *     parameters:
     *      -  name: body
     *         in: body
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - name
     *                  - category
     *                  - parameters
     *                  - code
     *                  - version
     *                  - type
     *              properties:
     *                  name:
     *                      type: string
     *                  category:
     *                      type: string
     *                      description: "possible values: 'async' or 'sync'"
     *                  parameters:
     *                      type: object
     *                      description: "plugin input parameters in JSON format"
     *                  code:
     *                      type: string
     *                      description: "plugin source code"
     *                  version:
     *                      type: string
     *                      description: "plugin version"
     *                  type:
     *                      type: integer
     *                      description: "plugin type: 1 -> 'nodejs' | 2 -> 'python'"
     *                  description:
     *                      type: string
     *                      description: "plugin description (max 300 char)"
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
    rest.post('/v1/plugins/', function (req, res) {

        logger.info("[API] - Create plugin - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);
        
        var plugin_name = req.body.name;
        var plugincategory = req.body.category; // sync | async

        var parameters = req.body.parameters;
        var code = req.body.code;
        var description = req.body.description;
        
        var version = req.body.version;
        var type = req.body.type;

        var ApiRequired = {"plugin_name":plugin_name, "plugin_category":plugincategory, "parameters":parameters, "code":code, "version":version, "type":type};

        board_utility.checkRequired(ApiRequired, function (check){

            if(check.result == "ERROR"){

                res.status(500).send(check);

            }else {

                plugin_utils.createPlugin(plugin_name, plugincategory, parameters, code, version, type, description, res);

            }

        });
        

    });

    //DELETE plugin from Iotronic
    /**
     * @swagger
     * /v1/plugins/{plugin}:
     *   delete:
     *     tags:
     *       - Plugins
     *     description: Delete an IoTronic user-plugin
     *     summary: delete IoTronic plugin
     *     parameters:
     *      - in: path
     *        name: plugin
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic plugin ID"
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
    rest.delete('/v1/plugins/:plugin', function (req, res) {

        logger.info("[API] - Destroy plugin - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var plugin = req.params.plugin;

        plugin_utils.destroyPlugin(plugin, res);
        

    });

    //INJECT plugin inside a board
    /**
     * @swagger
     * /v1/boards/{board}/plugins:
     *   put:
     *     tags:
     *       - Plugins
     *     description: Injects an IoTronic user-plugin ('sync' or 'async' type) in a board
     *     summary: inject plugin in a board
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *          type: string
     *          description: "The IoTronic board ID"
     *      -  name: body
     *         in: body
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - plugin
     *                  - onboot
     *              properties:
     *                  plugin:
     *                      type: string
     *                      description: "plugin name"
     *                  onboot:
     *                      type: string
     *                      description: "Flag to specify if the plugin has to start at boot of Lightning-rod:\n- possible values: 'true' or 'false'"
     *                  force:
     *                      type: string
     *                      description: "Flag to force the plugin injection even if it was already injected into the board:\n- possible values: 'true' or 'false'"
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
    rest.put('/v1/boards/:board/plugins', function (req, res) {

        logger.info("[API] - Inject plugin - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        var response = {
            message: '',
            result: ''
        };

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var plugin = req.body.plugin;
                var onboot = req.body.onboot;
                var force = req.body.force;

                if ( (onboot != "true" && onboot != "false") || (force != "true" && force != "false")){

                    response.message = "Check 'onboot' and 'force' paramters [ true | false ]";
                    response.result = "ERROR";
                    logger.error("[PLUGIN] --> " + response.message);
                    res.status(500).send(response);


                }else{

                    var ApiRequired= {"plugin":plugin, "onboot":onboot};

                    board_utility.checkRequired(ApiRequired, function (check){

                        if(check.result == "ERROR"){

                            res.status(500).send(check);

                        }else {

                            //plugin_utils.injectPlugin(board, plugin, onboot, force, res);
                            plugin_utils.injectPlugin(board, null, [plugin, onboot, force, res]);

                        }

                    });

                }


                

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }

        });


        

    });
    
    //BATCH: INJECT plugin inside a board
    /**
     * @swagger
     * /v1/projects/{project}/plugins:
     *   put:
     *     tags:
     *       - Plugins
     *     description: Injects an IoTronic user-plugin ('sync' or 'async' type) in the boards of a project
     *     summary: inject plugin in the project's boards
     *     parameters:
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *          type: string
     *          description: "The IoTronic projects ID or NAME"
     *      -  name: body
     *         in: body
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - plugin
     *                  - onboot
     *              properties:
     *                  plugin:
     *                      type: string
     *                      description: "plugin name"
     *                  onboot:
     *                      type: string
     *                      description: "Flag to specify if the plugin has to start at boot of Lightning-rod:\n- possible values: 'true' or 'false'"
     *                  force:
     *                      type: string
     *                      description: "Flag to force the plugin injection even if it was already injected into the board:\n- possible values: 'true' or 'false'"
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
    rest.put('/v1/projects/:project/plugins', function (req, res) {

        logger.info("[API] - BATCH Inject plugin - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var project = req.params.project;

        var response = {
            message: '',
            result: ''
        };

        var plugin = req.body.plugin;
        var onboot = req.body.onboot;
        var force = req.body.force;

        if ( (onboot != "true" && onboot != "false") || (force != "true" && force != "false")){

            response.message = "Check 'onboot' and 'force' paramters [ true | false ]";
            response.result = "ERROR";
            logger.error("[PLUGIN] --> " + response.message);
            res.status(500).send(response);


        }else{

            var ApiRequired = {"plugin":plugin, "onboot":onboot};

            board_utility.checkRequired(ApiRequired, function (check){

                if(check.result == "ERROR"){

                    res.status(500).send(check);

                }else {

                    //I need to read the name of the plugin from the DB
                    db.getPlugin(plugin, function (data) {

                        if (data.result == "ERROR") {
                            response.message = data.message;
                            response.result = "ERROR";
                            logger.warn("[PLUGIN] --> " + response.message);
                            res.status(500).send(response);

                        } else {

                            if (data.message[0] === undefined) {
                                response.message = "Plugin '" + plugin + "' does not exist in Iotronic!";
                                response.result = "ERROR";
                                logger.warn("[PLUGIN] --> " + response.message);
                                res.status(500).send(response);
                            }
                            else {

                                var pluginTag = data.message[0].tag;

                                if (pluginTag == "released") {

                                    var subject = "plugin inject: "+plugin;

                                    request_utils.batchRequest(project, subject, res, plugin_utils.injectPlugin, [plugin, onboot, force, false]);

                                }
                                else{

                                    response.message = "Plugin not released yet!";
                                    response.result = "ERROR";
                                    logger.warn("[PLUGIN] --> " + response.message);
                                    res.status(500).send(response);

                                }

                            }
                        }


                    });


                }

            });

        }


    });

    
    //EXECUTE plugin operations on board
    /**
     * @swagger
     * /v1/boards/{board}/plugins/{plugin}:
     *   post:
     *     tags:
     *       - Plugins
     *     description: Execute plugin ('sync' or 'async' type) operations on a board
     *     summary: execute plugin operations on a board
     *     produces:
     *       - application/json
     *     parameters:
     *      - in: path
     *        name: plugin
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic plugin ID"
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic board ID"
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - operation
     *              properties:
     *                  parameters:
     *                      type: object
     *                      description: "plugin inputs in JSON format"
     *                  parameters_set:
     *                      type: string
     *                      description: "possible values:\n
     *                      - 'default' (plugin will use DB input parameters specified at creation time)\n
     *                      - 'latest' (plugin will use the last DB parameters injected)\n
     *                      - 'new' (plugin will use the parameters specified in the field 'parameters' of this API, overwriting the 'latest' ones saved on DB)."
     *                  operation:
     *                      type: string
     *                      description: "possible values:\n
     *                      - for 'async' plugins: 'run', 'kill'\n
     *                      - for 'sync' plugins: 'call'\n
     *                      - for both plugin types: 'restart'
     *                      "
     *     responses:
     *       200:
     *          description: Action result on the plugin
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                      title: action result
     *                      type: string
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.post('/v1/boards/:board/plugins/:plugin', function (req, res) {

        var board = req.params.board;

        var response = {
            message: "",
            result: ""
        };

        logger.info("[API] - Plugin Operation - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);
        
        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var plugin = req.params.plugin;

                var parameters = req.body.parameters; //OPTIONAL: run | call only
                var operation = req.body.operation; // run | call | kill | restart
                var parameters_set = req.body.parameters_set; //only for run and call actions: "default" | "latest" | "new"

                var ApiRequired = {"operation":operation};

                board_utility.checkRequired(ApiRequired, function (check){

                    if(check.result == "ERROR"){

                        res.status(500).send(check);

                    }else {

                        if(operation != "run" && operation != "kill" && operation != "call"  && operation != "restart" ){

                            response.message = "Plugin operation '" + operation + "' not supported!";
                            response.result = 'ERROR';

                            logger.error("[PLUGIN] - " + response.message);
                            res.status(500).send(response);

                        }else{

                            logger.info("[PLUGIN] - Plugin operation on board "+ board +": " + operation + " plugin '" + plugin +"'");

                            plugin_utils.managePlugins(board, null, [plugin, parameters, operation, parameters_set, res]);

                        }
                        

                    }

                });






            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }

        });
        
        

    });
    
    //BATCH: EXECUTE plugin operations on board
    /**
     * @swagger
     * /v1/projects/{project}/plugins/{plugin}:
     *   post:
     *     tags:
     *       - Plugins
     *     description: Execute plugin ('sync' or 'async' type) operations on the boards of a project
     *     summary: execute plugin operations on project's boards
     *     produces:
     *       - application/json
     *     parameters:
     *      - in: path
     *        name: plugin
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic plugin ID"
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic project ID or NAME"
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - operation
     *              properties:
     *                  parameters:
     *                      type: object
     *                      description: "plugin inputs in JSON format"
     *                  operation:
     *                      type: string
     *                      description: "possible values:\n
     *                      - for 'async' plugins: 'run', 'kill'\n
     *                      - for 'sync' plugins: 'call'\n
     *                      - for both plugin types: 'restart'
     *                      "
     *     responses:
     *       200:
     *          description: Action result on the plugin
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                      title: action result
     *                      type: string
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.post('/v1/projects/:project/plugins/:plugin', function (req, res) {

        logger.info("[API] - BATCH plugin operation - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        var project = req.params.project;
        var plugin = req.params.plugin;
        var parameters = req.body.parameters; //OPTIONAL: run | call only
        var operation = req.body.operation; // run | call | stop | restart
        var parameters_set = req.body.parameters_set; //only for run and call actions: "default" | "latest" | "new"

        var ApiRequired = {"operation":operation};

        board_utility.checkRequired(ApiRequired, function (check){

            if(check.result == "ERROR"){

                res.status(500).send(check);

            }else {

                if(operation != "run" && operation != "kill" && operation != "call"  && operation != "restart" ){

                    response.message = "Plugin operation '" + operation + "' not supported!";
                    response.result = 'ERROR';

                    logger.error("[PLUGIN] - " + response.message);
                    res.status(500).send(response);

                }else{

                    logger.info("[PLUGIN] - BATCH plugin operation on boards of the project "+ project +": " + operation + " plugin '" + plugin +"'");

                    var subject = "plugin action: " + operation + " "+ plugin;

                    request_utils.batchRequest(project, subject, res, plugin_utils.managePlugins, [plugin, parameters, operation, parameters_set, false]);

                }

            }

        });


    });

    //REMOVE plugin from board
    /**
     * @swagger
     * /v1/boards/{board}/plugins/{plugin}:
     *   delete:
     *     tags:
     *       - Plugins
     *     description: Remove an IoTronic user-plugin from a board
     *     summary: remove plugin from board
     *     parameters:
     *      - in: path
     *        name: plugin
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic plugin ID"
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
    rest.delete('/v1/boards/:board/plugins/:plugin', function (req, res) {

        logger.info("[API] - Remove Plugin - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;
        var plugin = req.params.plugin;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                plugin_utils.removePlugin(board, null, [plugin, res]);

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }

        });
        

    });
    
    //BATCH: REMOVE plugin from board
    /**
     * @swagger
     * /v1/projects/{project}/plugins/{plugin}:
     *   delete:
     *     tags:
     *       - Plugins
     *     description: Remove an IoTronic user-plugin from the boards of a project
     *     summary: remove plugin from project's boards
     *     parameters:
     *      - in: path
     *        name: plugin
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic plugin ID"
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic project ID or NAME"
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
    rest.delete('/v1/projects/:project/plugins/:plugin', function (req, res) {

        logger.info("[API] - BATCH Remove Plugin - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var project = req.params.project;
        var plugin = req.params.plugin;

        var response = {
            message: '',
            result: ''
        };


        var subject = "remove plugin: "+plugin;

        request_utils.batchRequest(project, subject, res, plugin_utils.removePlugin, [plugin, false]);


    });
    
    //UPDATE plugin
    /**
     * @swagger
     * /v1/plugins/{plugin}:
     *   patch:
     *     tags:
     *       - Plugins
     *     description: Update an IoTronic plugin
     *     summary: update IoTronic plugin
     *     parameters:
     *      -  in: path
     *         name: plugin
     *         required: true
     *         schema:
     *         type: string
     *         description: "The IoTronic plugin ID"
     *      -  name: body
     *         in: body
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - name
     *                  - category
     *                  - version
     *                  - tag
     *                  - code
     *                  - parameters
     *                  - description
     *              properties:
     *                  name:
     *                      type: string
     *                      description: "Plugin name"
     *                  version:
     *                      type: string
     *                      description: "Plugin version"
     *                  tag:
     *                      type: number
     *                      description: "Plugin tag ID (e.g. '1' -> 'released | '2' -> 'unreleased')"
     *                  code:
     *                      type: string
     *                      description: "Plugin source code"
     *                  parameters:
     *                      type: object
     *                      description: "JSON object contains default plugin's parameters"
     *                  description:
     *                      type: string
     *                      description: "Plugin description (max 300 chars)"
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
    rest.patch('/v1/plugins/:plugin', function (req, res) {

        logger.info("[API] - Update plugin - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var plugin = req.params.plugin;

        var name = req.body.name;
        //var category = req.body.category; // sync | async
        var defaults = req.body.defaults;
        var code = req.body.code;
        var description = req.body.description;
        var version = req.body.version;
        //var type_id = req.body.type;
        var tag_id = req.body.tag;


        var ApiRequired = {"name":name, "defaults":defaults, "code":code, "version":version, "tag":tag_id};

        board_utility.checkRequired(ApiRequired, function (check){

            if(check.result == "ERROR"){

                res.status(500).send(check);

            }else {

                plugin_utils.updatePlugin(plugin, name, defaults, code, description, version, tag_id, res);

            }

        });


    });

    //TAG plugin
    /**
     * @swagger
     * /v1/plugins/{plugin}/tag:
     *   post:
     *     tags:
     *       - Plugins
     *     description: Tag an IoTronic plugin
     *     summary: tag plugin
     *     parameters:
     *      -  in: path
     *         name: plugin
     *         required: true
     *         schema:
     *         type: string
     *         description: "The IoTronic plugin ID"
     *      -  name: body
     *         in: body
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - tag_id
     *              properties:
     *                  tag_id:
     *                      type: number
     *                      description: "Plugin tag ID (e.g. '1' -> 'released | '2' -> 'unreleased')"
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
    rest.post('/v1/plugins/:plugin/tag', function (req, res){

        logger.info("[API] - Tag plugin - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var plugin_id = req.params.plugin;
        var tag_id = req.body.tag_id;

        var response = {
            message: '',
            result: ''
        };

        var ApiRequired = {"tag":tag_id};

        board_utility.checkRequired(ApiRequired, function (check){

            if(check.result == "ERROR"){

                res.status(500).send(check);

            }else {

                plugin_utils.tagPlugin(plugin_id, tag_id, res);

            }

        });


    });

    //GET plugin logs of a board
    /**
     * @swagger
     * /v1/boards/{board}/plugins/{plugin}/logs:
     *   get:
     *     tags:
     *       - Plugins
     *     description: Return plugin logs of a board
     *     summary: get plugin logs of a board
     *     parameters:
     *      - in: path
     *        name: plugin
     *        required: true
     *        schema:
     *        type: integer
     *        description: "The IoTronic plugin ID"
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic board ID"
     *      - in: query
     *        name: rows
     *        type: number
     *        description: "Number of rows to retrieve."
     *        required: false
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: Plugin logs
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  title: plugin logs (rows list)
     *                  type: array
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/boards/:board/plugins/:plugin/logs', function (req, res) {

        logger.info("[API] - Plugin logs - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;
        var plugin = req.params.plugin;
        var rows = req.query.rows;


        if(rows == undefined){
            rows = 10;  //default value
        }

        plugin_utils.getPluginLogs(board, null, [plugin, rows, res]);


    });

    //BATCH: GET plugin logs of a board
    /**
     * @swagger
     * /v1/projects/{project}/plugins/{plugin}/logs:
     *   get:
     *     tags:
     *       - Plugins
     *     description: Return plugin logs from the boards of a project
     *     summary: get plugin logs of project's boards
     *     parameters:
     *      - in: path
     *        name: plugin
     *        required: true
     *        schema:
     *        type: integer
     *        description: "The IoTronic plugin ID"
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic project ID or NAME"
     *      - in: query
     *        name: rows
     *        type: number
     *        description: "Number of rows to retrieve."
     *        required: false
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: Plugin logs
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  title: plugin logs (rows list)
     *                  type: array
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/projects/:project/plugins/:plugin/logs', function (req, res) {

        logger.info("[API] - Plugin logs - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var project = req.params.project;
        var plugin = req.params.plugin;
        var rows = req.query.rows;


        var subject = "get plugin logs: "+plugin;

        request_utils.batchRequest(project, subject, res, plugin_utils.getPluginLogs, [plugin, rows, false]);


    });
    
    logger.debug("[REST-EXPORT] - Plugin's APIs exposed!");

    //---------------------------------------------------------------------------------------------------


    // Register RPC methods
    this.exportCommands(session_wamp)






};


plugin_utils.prototype.tagPlugin = function (plugin_id, tag_id, res) {

    var response = {
        message: '',
        result: ''
    };

    db.getPlugin(plugin_id, function (data) {

        if (data.result == "ERROR") {

            response.message = data.message;
            response.result = "ERROR";
            logger.warn("[PLUGIN] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {

                response.message = "Plugin '" + plugin_id + "' does not exist!";
                response.result = "ERROR";
                logger.warn("[PLUGIN] --> " + response.message);
                res.status(500).send(response);

            }
            else {

                db.tagPlugin(plugin_id, tag_id, function (data) {

                    if(data.result=="ERROR"){
                        response.message = data.message;
                        response.result = "ERROR";
                        logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                        res.status(500).send(response);

                    }else{
                        response.message = data.message;
                        response.result = "SUCCESS";
                        res.status(200).send(response);

                    }

                });

            }

        }

    });

};


plugin_utils.prototype.updatePlugin = function (plugin, name, defaults, code, description, version, tag_id, res) {

    logger.info("[PLUGIN] - UPDATING plugin '" + plugin + "'...");

    var response = {
        message: '',
        result: ''
    };

    db.getPlugin(plugin, function (data) {

        if (data.result == "ERROR") {

            response.message = data.message;
            response.result = "ERROR";
            logger.warn("[PLUGIN] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {

                response.message = "Plugin '" + plugin + "' does not exist!";
                response.result = "ERROR";
                logger.warn("[PLUGIN] --> " + response.message);
                res.status(500).send(response);

            }
            else {

                var plugin_id = data.message[0].id;

                //db.updatePlugin(plugin_id, name, category, version, type_id, tag_id, code, defaults, description, function (result_db) {
                db.updatePlugin(plugin_id, name, version, tag_id, code, defaults, description, function (result_db) {

                    if (result_db.result == "ERROR") {
                        logger.error("[PLUGIN] --> updatePlugin - DB write error: " + result_db.message);
                        response.message = result_db.message;
                        response.result = "ERROR";
                        res.status(500).send(response);

                    } else {

                        response.message = "Plugin '" + name + "' successfully updated!";
                        response.result = "SUCCESS";
                        logger.info("[PLUGIN] --> " +response.message);
                        res.status(200).send(response);

                    }

                });

            }

        }

    });



};


plugin_utils.prototype.getChecksum = function (args) {

    var d = Q.defer();

    var response = {
        message: '',
        result: ''
    };

    var board_id = args[0];

    //logger.debug("[PLUGIN] - Getting plugin checksums for board " + board_id);


    db.getPluginsChecksums(board_id, function (data) {

        if(data.result=="ERROR"){
            response.message = data.message;
            response.result = "ERROR";
            logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
            d.resolve(response);
        }else{

            var checkList = {};

            for (var i = 0; i < data.message.length; i++) {

                (function (i) {

                    //console.log(data.message[i]);

                    checkList[data.message[i].name] = data.message[i].checksum;

                    if (i == data.message.length -1 ){

                        //logger.debug("\n"+JSON.stringify(checkList));

                        response.message = checkList;
                        response.result = "SUCCESS";
                        d.resolve(response);
                    }

                })(i);

            }



        }

    });


    return d.promise;


};


plugin_utils.prototype.invalidPlugin = function (args) {

    var d = Q.defer();

    var response = {
        message: '',
        result: ''
    };

    var board_id = args[0];
    var plugin_name = args[1];
    var plugin_version = args[2];

    logger.debug("[PLUGIN] - Plugin '"+plugin_name+"' checksum not valid for board '" + board_id +"'!");

    db.getPluginFromVersion(plugin_name, plugin_version, function (data) {

        if(data.result=="ERROR"){
            response.message = data.message;
            response.result = "ERROR";
            logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
            d.resolve(response);

        }else{

            var plugin_id = data.message[0].id;

            db.updatePluginStatus(board_id, plugin_id, "invalid", function (data) {

                logger.debug("[PLUGIN] - " + data.message);

                if(data.result=="ERROR"){
                    response.message = data.message;
                    response.result = "ERROR";
                    logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                    d.resolve(response);
                }else{

                    response.message = "Iotronic received the notice for the '"+plugin_name+"' plugin.";
                    response.result = "SUCCESS";
                    d.resolve(response);

                }

            });

        }

    });








    return d.promise;


};


plugin_utils.prototype.createPlugin = function (name, category, parameters, code, version, type, description, res) {

    logger.info("[PLUGIN] - CREATING plugin '" + name + "' ...");

    var response = {
        message: '',
        result: ''
    };

    if (category != "sync" && category != "async"){

        response.message = "Plugin category '" + category + "' is not supported: [ 'sync' | 'async' ]";
        response.result = "ERROR";
        logger.error("[PLUGIN] --> " + response.message);
        res.status(500).send(response);

    }else{

        try{
            
            //check if plugin parameters are in JSON format
            JSON.parse(parameters);


            db.getTypeId(type, function (c_type) {

                if (c_type.result == "ERROR") {

                    logger.error("[PLUGIN] --> getTypeName error: " + JSON.stringify(c_type.message));
                    response.message = c_type.message;
                    response.result = "ERROR";
                    res.status(500).send(response);

                } else {

                    var type_id = c_type.message[0];
                    var type_name = c_type.message[1];

                    db.checkPluginExists(name, version, category, type_id, function (data) {

                        if (data.result == "ERROR") {

                            response.message = data.message;
                            response.result = "ERROR";
                            logger.warn("[PLUGIN] --> " + response.message);
                            res.status(500).send(response);

                        } else {

                            if (data.message[0] === undefined) {


                                db.insertCreatedPlugin(name, category, parameters, code, version, type_id, description, function (result_db) {

                                    if (result_db.result == "ERROR") {

                                        logger.error("[PLUGIN] --> createPlugin - DB write error: " + JSON.stringify(result_db.message));
                                        response.message = result_db.message;
                                        response.result = "ERROR";
                                        res.status(500).send(response);

                                    } else {

                                        logger.debug("[PLUGIN] --> DB successfully updated: " + JSON.stringify(result_db.message));

                                        response.message = "Plugin '" + name + "' [ v"+version+" - "+category+" - "+type_name+"] created!";
                                        response.result = "SUCCESS";
                                        logger.info("[PLUGIN] --> " +response.message);
                                        res.status(200).send(response);

                                    }

                                });


                            }
                            else {

                                response.message = "Plugin '" + name + "' [ v"+version+" - "+category+" - "+type_name+"] already exist!";
                                response.result = "ERROR";
                                logger.warn("[PLUGIN] --> " + JSON.stringify(data.message));
                                res.status(500).send(response);

                            }

                        }

                    });


                }

            });



        }
        catch (err) {
            response.message = "Plugin config is not a JSON: " + err;
            response.result = "ERROR";
            logger.error("[PLUGIN] --> " + response.message);
            res.status(500).send(response);
        }


    }


};


plugin_utils.prototype.destroyPlugin = function (plugin, res) {

    logger.info("[PLUGIN] - Removing plugin '" + plugin + "' from Iotronic...");

    var response = {
        message: '',
        result: ''
    };

    db.getPlugin(plugin, function (data) {

        if (data.result == "ERROR") {

            response.message = data.message;
            response.result = "ERROR";
            logger.warn("[PLUGIN] --> " + response.message);
            res.status(500).send(response);

        } else {
            
            if (data.message[0] === undefined) {

                response.message = "Plugin '" + plugin + "' does not exist!";
                response.result = "ERROR";
                logger.warn("[PLUGIN] --> " + response.message);
                res.status(500).send(response);

            }
            else {

                var p_name = data.message[0].name;
                var p_id = data.message[0].id;
                var p_category = data.message[0].category;
                var p_version = data.message[0].version;
                var p_type = data.message[0].type_id;
                
                db.getUsedPlugin(p_id, function (data) {

                    if (data.result == "ERROR") {

                        response.message = data.message;
                        response.result = "ERROR";
                        logger.warn("[PLUGIN] --> " + response.message);
                        res.status(500).send(response);

                    } else {

                        if (data.message[0] === undefined) {
                          
                            logger.debug("[PLUGIN] --> Plugin '" + p_name + "'  [ v"+p_version+" - "+p_category+" - "+p_type+"] is not injected in any board");

                            db.deletePlugin(plugin, function (result_db) {

                                if (result_db.result == "ERROR") {
                                    logger.warn("[PLUGIN] --> Delete DB error: " + result_db.message);
                                    response.message = result_db.message;
                                    response.result = "ERROR";
                                    res.status(500).send(response);

                                } else {

                                    response.message = "Plugin '" + p_name + "'  [ v"+p_version+" - "+p_category+" - "+p_type+"] successfully removed from Iotronic!!";
                                    response.result = "SUCCESS";
                                    logger.info("[PLUGIN] --> " + response.message);
                                    res.status(200).send(response);

                                }

                            });

                        

                        }else{
                            response.message = "Plugin '" + p_name + "'  [ v"+p_version+" - "+p_category+" - "+p_type+"] can not be deleted: it is still injected in some boards!";
                            response.result = "ERROR";
                            logger.warn("[PLUGIN] --> " + response.message);
                            res.status(500).send(response);

                        }
                    }
                        
                    
                });




            }

        }



    });

};


plugin_utils.prototype.injectPlugin = function (board, request_id, args) {

    var response = {
        message: '',
        result: ''
    };

    var plugin = args[0];
    var autostart = args[1];
    var force = args[2];
    var res = args[3];


    board_utility.checkBoardAvailable(board, res, function (available) {

        if (available.result == "SUCCESS") {

            if(res != false)
                logger.info("[PLUGIN] - Injecting plugin '" + plugin + "' into the board '" + board + "'...");

            //I need to read the name of the plugin from the DB
            db.getPlugin(plugin, function (data) {

                if (data.result == "ERROR") {
                    response.message = data.message;
                    response.result = "ERROR";
                    if(res != false){
                        logger.warn("[PLUGIN] --> " + response.message);
                        res.status(500).send(response);
                    }
                    else{
                        request_utils.updateResult(request_id, board, response.result, response.message);
                    }

                } else {

                    if (data.message[0] === undefined) {
                        response.message = "Plugin '"+plugin+"' does not exist in Iotronic!";
                        response.result = "ERROR";
                        if(res != false){
                            logger.warn("[PLUGIN] --> " + response.message);
                            res.status(500).send(response);
                        }
                        else{
                            request_utils.updateResult(request_id, board, response.result, response.message);
                        }
                    }
                    else {

                        var pluginId = data.message[0].id;

                        var pluginName = data.message[0].name;
                        var pluginCode = data.message[0].code;

                        var pluginChecksum = data.message[0].checksum;
                        var pluginTag = data.message[0].tag;
                        var pluginParameters = data.message[0].defaults;

                        var plugin_version = data.message[0].version;


                        var pluginBundle = data.message[0];

                        if(pluginTag == "released"){

                            var checksum = md5(pluginCode);

                            if(pluginChecksum === checksum){

                                //check if the plugin is still injected
                                db.getInjectedPlugin(pluginId, board, function (data) {

                                    if (data.result == "ERROR") {

                                        response.message = data.message;
                                        response.result = "ERROR";
                                        if(res != false){
                                            logger.error("[PLUGIN] --> " + response.message);
                                            res.status(500).send(response);
                                        }
                                        else{
                                            request_utils.updateResult(request_id, board, response.result, response.message);
                                        }

                                    } else {

                                        if(data.message.length != 0 && (force == false || force == "false")){

                                            if(res != false){

                                                response.message = "Plugin " + pluginName + " already injected!";
                                                response.result = "WARNING";
                                                logger.warn("[PLUGIN] --> " + response.message);
                                                res.status(200).send(response);

                                            } else{

                                                response.message = "Plugin '" + pluginName + "' already injected in "+board+" board!";
                                                response.result = "WARNING";
                                                request_utils.updateResult(request_id, board, response.result, response.message);


                                            }


                                        }
                                        else{

                                            if(res != false)
                                                logger.debug("[PLUGIN] --> Calling injectplugin RPC with name = '" + pluginName + "' onboot = '" + autostart + "' - force = '" + force + "' code: \n" + pluginCode +
                                                    "\n\nwith the following default parameters:\n"+pluginParameters);

                                            //Now I can perform the RPC call
                                            session_wamp.call('s4t.'+ board + '.plugin.inject', [JSON.stringify(pluginBundle) , autostart, force]).then(

                                                function (rpc_response) {

                                                    if(rpc_response.result == "ERROR"){
                                                        response.message = "INJECT plugin " + pluginName + " failed: "+rpc_response.message;
                                                        response.result = "ERROR";
                                                        if(res != false){
                                                            logger.error("[PLUGIN] --> " + response.message);
                                                            res.status(500).send(response);
                                                        }
                                                        else{
                                                            request_utils.updateResult(request_id, board, response.result, response.message);
                                                        }
                                                    }
                                                    else{


                                                        if( data.message.length != 0 && (force == true || force == "true") ){

                                                            //logger.warn("[PLUGIN] --> Plugin '" + pluginName + "' overwritten ! Updating...");

                                                            db.updatePluginStatus(board, pluginId, "injected", function (out) {

                                                                if(out.result=="ERROR"){
                                                                    response.message = "Plugin '" + pluginName + "' updating error: "+out.message;
                                                                    response.result = "ERROR";
                                                                    if(res != false){
                                                                        logger.error("[PLUGIN] ----> " + response.message);
                                                                        res.status(500).send(response);
                                                                    }
                                                                    else{
                                                                        request_utils.updateResult(request_id, board, response.result, response.message);
                                                                    }

                                                                }else{

                                                                    if(res != false){

                                                                        response.message = "Plugin '" + pluginName+"' successfully overwritten!";
                                                                        response.result = "SUCCESS";
                                                                        logger.info("[PLUGIN] ----> " + response.message);
                                                                        res.status(200).send(response);

                                                                    } else{

                                                                        response.message = "Plugin '" + pluginName + "' successfully overwritten on "+board+" board!";
                                                                        response.result = "SUCCESS";
                                                                        request_utils.updateResult(request_id, board, response.result, response.message);

                                                                    }

                                                                }

                                                            });

                                                        }else if(data.message.length == 0 ){


                                                            db.deleteInjectedPlugin(board, pluginName, function (data_p) {

                                                                if (data_p.result == "ERROR") {
                                                                    response.message = data_p.message;
                                                                    response.result = "ERROR";
                                                                    if(res != false){
                                                                        logger.warn("[PLUGIN] --> " + response.message);
                                                                        res.status(500).send(response);
                                                                    }
                                                                    else{
                                                                        request_utils.updateResult(request_id, board, response.result, response.message);
                                                                    }

                                                                } else {


                                                                    db.insertInjectedPlugin(board, pluginId, pluginName, function (out) {

                                                                        if(out.result=="ERROR"){
                                                                            response.message = "Plugin '" + pluginName + "' injection failed: "+JSON.stringify(out.message);
                                                                            response.result = "ERROR";
                                                                            if(res != false){
                                                                                logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                                                                                res.status(500).send(response);
                                                                            }
                                                                            else{
                                                                                request_utils.updateResult(request_id, board, response.result, response.message);
                                                                            }

                                                                        }else{

                                                                            if(res != false){

                                                                                response.message = "Plugin '" + pluginName + "' successfully injected!";
                                                                                response.result = "SUCCESS";
                                                                                logger.info("[PLUGIN] --> " + JSON.stringify(response.message));
                                                                                res.status(200).send(response);

                                                                            } else{

                                                                                response.message = "Plugin '" + pluginName + "' successfully injected on "+board+" board!";
                                                                                response.result = "SUCCESS";
                                                                                request_utils.updateResult(request_id, board, response.result, response.message);

                                                                            }


                                                                        }

                                                                    });


                                                                }


                                                            });





                                                            /*




                                                            db.getPluginVersions(pluginName, function (data) {

                                                                if(data.result=="ERROR"){
                                                                    response.message = data.message;
                                                                    response.result = "ERROR";
                                                                    logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                                                                    d.resolve(response);

                                                                }else{

                                                                    for (var i = 0; i < data.message.length; i++) {

                                                                        (function (i) {

                                                                            db.deleteInjectedPlugin(board, data.message[i].id, function (data_p) {

                                                                                if (data_p.result == "ERROR") {

                                                                                    response.message = data_p.message;
                                                                                    response.result = "ERROR";
                                                                                    if(res != false){
                                                                                        logger.warn("[PLUGIN] --> " + JSON.stringify(response.message));
                                                                                        res.status(500).send(response);
                                                                                    }
                                                                                    else{
                                                                                        request_utils.updateResult(request_id, board, response.result, response.message);
                                                                                    }

                                                                                } else {

                                                                                    response.result = "SUCCESS";
                                                                                    response.message = data_p.message;

                                                                                    logger.debug("[PLUGIN] ----> " + JSON.stringify(response.message));

                                                                                    if (i == data.message.length -1 ){

                                                                                        db.insertInjectedPlugin(board, pluginId, function (out) {

                                                                                            if(out.result=="ERROR"){
                                                                                                response.message = "Plugin '" + pluginName + "' injection failed: "+JSON.stringify(out.message);
                                                                                                response.result = "ERROR";
                                                                                                if(res != false){
                                                                                                    logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                                                                                                    res.status(500).send(response);
                                                                                                }
                                                                                                else{
                                                                                                    request_utils.updateResult(request_id, board, response.result, response.message);
                                                                                                }

                                                                                            }else{

                                                                                                if(res != false){

                                                                                                    response.message = "Plugin '" + pluginName + "' successfully injected!";
                                                                                                    response.result = "SUCCESS";
                                                                                                    logger.info("[PLUGIN] --> " + JSON.stringify(response.message));
                                                                                                    res.status(200).send(response);

                                                                                                } else{

                                                                                                    response.message = "Plugin '" + pluginName + "' successfully injected on "+board+" board!";
                                                                                                    response.result = "SUCCESS";
                                                                                                    request_utils.updateResult(request_id, board, response.result, response.message);

                                                                                                }


                                                                                            }

                                                                                        });

                                                                                    }


                                                                                }


                                                                            });



                                                                        })(i);

                                                                    }




                                                                }

                                                            });


                                                            */

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


                                        }

                                    }

                                });


                            }else{

                                response.message = "Plugin checksum mismatch!";
                                response.result = "ERROR";
                                if(res != false){
                                    logger.warn("[PLUGIN] --> " + response.message);
                                    res.status(500).send(response);
                                }
                                else{
                                    request_utils.updateResult(request_id, board, response.result, response.message);
                                }

                            }


                        }else{

                            response.message = "Plugin not released yet!";
                            response.result = "ERROR";
                            if(res != false){
                                logger.warn("[PLUGIN] --> " + response.message);
                                res.status(500).send(response);
                            }
                            else{
                                request_utils.updateResult(request_id, board, response.result, response.message);
                            }


                        }


                    }


                }


            });


        } else if (available.result == "WARNING") {

            if(res != false){
                logger.warn("[PLUGIN] --> " + available.message);
            }
            else{

                var result_msg = "board disconnected";

                request_utils.updateResult(request_id, board, available.result, result_msg);

            }


        }


    });





};


function computeParameters(board, plugin, parameters, parameters_set, plugin_defaults, callback){

    var response = {
        message: '',
        result: ''
    };

    if (parameters_set == "" || parameters_set == undefined) {
        parameters_set = "latest";
    }

    switch (parameters_set) {

            case 'new':

                logger.debug("[PLUGIN] --> Loading new parameters: " + parameters);

                try {
                    //JSON check managed in try-catch
                    JSON.parse(parameters);

                    //Save plugin parameters into DB
                    db.insertPluginParameters(board, plugin, parameters, function (data) {

                        if (data.result == "ERROR") {

                            response.message = data.message;
                            response.result = "ERROR";
                            callback(response);

                        }
                        else {

                            response.message = parameters;
                            response.result = "SUCCESS";
                            callback(response);

                        }

                    });

                }
                catch (err) {

                    logger.error("[PLUGIN] --> " + JSON.stringify(err));
                    response.message = err;
                    response.result = "ERROR";
                    callback(response);

                }

                break;


            case 'default':
                logger.debug("[PLUGIN] --> Loading default parameters: " + plugin_defaults);
                response.message = plugin_defaults;
                response.result = "SUCCESS";
                callback(response);
                break;


            case 'latest':

                logger.debug("[PLUGIN] --> Loading latest parameters: ");

                db.getInjectedPlugin(plugin, board, function (data) {

                    if (data.result == "ERROR") {

                        response.message = data.message;
                        response.result = "ERROR";
                    }
                    else {

                        response.message = data.message[0].parameters;
                        response.result = "SUCCESS";
                        callback(response);

                    }

                });

                break;

            default:

                response.message = "Wrong parameters set: only 'default', 'latest' , 'new'  are supported.";
                response.result = "ERROR";
                callback(response);

                break;

        }




    return response;


}



plugin_utils.prototype.managePlugins = function (board, request_id, args) {

    var response = {
        message: '',
        result: ''
    };

    var plugin = args[0];
    var parameters = args[1];       //plugin's parameters
    var plugin_operation = args[2];
    var parameters_set = args[3];
    var res = args[4];


    board_utility.checkBoardAvailable(board, res, function (available) {

        if (available.result == "SUCCESS") {

            db.getPlugin(plugin, function (data) {

                if (data.result == "ERROR") {
                    response.message = data.message;
                    response.result = "ERROR";

                    if(res != false){
                        logger.warn("[PLUGIN] --> " + response.message);
                        res.status(500).send(response);
                    }
                    else{
                        request_utils.updateResult(request_id, board_id, response.result, response.message);
                    }

                } else {

                    if (data.message[0] === undefined) {

                        response.result = "ERROR";
                        response.message = "Plugin does not exist in Iotronic!";
                        if(res != false){
                            logger.warn("[PLUGIN] --> " + response.message);
                            res.status(500).send(response);
                        }
                        else{
                            request_utils.updateResult(request_id, board_id, response.result, response.message);
                        }

                    }
                    else {

                        // the plugin exists

                        var plugin_name = data.message[0].name;
                        var plugin_checksum = data.message[0].checksum;
                        var plugin_type = data.message[0].type;
                        var plugin_defaults = data.message[0].defaults;


                        db.getInjectedPlugin(plugin, board, function (data) {

                            var response = {
                                message: '',
                                result: ''
                            };

                            if(data.result=="ERROR"){

                                response.message = data.message;
                                response.result = "ERROR";

                                if(res != false){
                                    logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                                    res.status(500).send(response);
                                }
                                else{
                                    request_utils.updateResult(request_id, board, response.result, response.message);
                                }

                            }else{


                                if(data.message.length == 0){

                                    response.message = "Plugin '"+plugin_name+"' is not injected in the board '"+board+"' !";
                                    response.result = "ERROR";
                                    if(res != false){
                                        logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                                        res.status(500).send(response);
                                    }
                                    else{
                                        request_utils.updateResult(request_id, board, response.result, response.message);
                                    }


                                }else{

                                    try {


                                        if(plugin_operation != "kill" && plugin_operation != "restart"){

                                            //get plugin parameters

                                            if (parameters != "" && parameters != undefined){

                                                //JSON check managed in try-catch
                                                JSON.parse(parameters);

                                                //Save plugin parameters into DB
                                                db.insertPluginParameters(board, plugin, parameters, function (data) {

                                                    if (data.result == "ERROR") {

                                                        response.message = data.message;
                                                        response.result = "ERROR";
                                                        if(res != false){
                                                            logger.warn("[PLUGIN] --> " + response.message);
                                                            res.status(500).send(response);
                                                        }else{
                                                            request_utils.updateResult(request_id, board, response.result, response.message);
                                                        }

                                                    }
                                                    else{

                                                        if(res != false)
                                                            logger.debug("[PLUGIN] --> " + data.message);

                                                    }

                                                });


                                            }else{

                                                if(res != false)
                                                    logger.debug("[PLUGIN] - Plugin parameters not specified, retrieving default parameters from DB....");

                                                parameters = plugin_defaults;

                                            }

                                        }

/*

                                        computeParameters(board, plugin, parameters, parameters_set, plugin_defaults,
                                            function (cparams) {

                                                console.log("FFFFFFFFFFFFFFFFFFFFF\nPARAMS COMPUTED: " + cparams.message + "\nFFFFFFFFFFFFFFFFFFFFF");


                                            }
                                        );




                                        computeParameters(board, plugin, parameters, parameters_set, plugin_defaults,
                                            function (cparams) {

                                                if(cparams.result == "ERROR"){

                                                    if(res != false){
                                                        logger.warn("[PLUGIN] --> " + cparams.message);
                                                        res.status(500).send(cparams);
                                                    }else{
                                                        request_utils.updateResult(request_id, board, cparams.result, cparams.message);
                                                    }

                                                }
                                                else{

                                                    console.log("FFFFFFFFFFFFFFFFFFFFF\nPARAMS COMPUTED: " + cparams.message + "\nFFFFFFFFFFFFFFFFFFFFF");


                                                }



                                            }
                                        );

                                    */



                                        switch (plugin_operation) {

                                            case 'run':

                                                if(res != false)
                                                    logger.debug("[PLUGIN] - STARTING ASYNC PLUGIN '" + plugin_name + "'...");
                                                
                                                computeParameters(board, plugin, parameters, parameters_set, plugin_defaults,
                                                    function (cparams) {

                                                        if(cparams.result == "ERROR"){

                                                            if(res != false){
                                                                logger.warn("[PLUGIN] --> " + cparams.message);
                                                                res.status(500).send(cparams);
                                                            }else{
                                                                request_utils.updateResult(request_id, board, cparams.result, cparams.message);
                                                            }

                                                        }
                                                        else{

                                                            var parameters = cparams.message;

                                                            //console.log("FFFFFFFFFFFFFFFFFFFFF\nPARAMS COMPUTED: " + parameters + "\nFFFFFFFFFFFFFFFFFFFFF");

                                                            if(res != false)
                                                                logger.debug("[PLUGIN] --> Plugin '" + plugin_name + "' parameters:\n " + parameters);

                                                            //I need to read the category of the plugin from the DB
                                                            db.getPluginCategory(plugin_name, function (data) {

                                                                if (data.result == "ERROR") {
                                                                    response.message = data.message;
                                                                    response.result = "ERROR";
                                                                    if(res != false){
                                                                        logger.warn("[PLUGIN] --> " + response.message);
                                                                        res.status(500).send(response);
                                                                    }else{
                                                                        request_utils.updateResult(request_id, board, response.result, response.message);
                                                                    }


                                                                } else {

                                                                    var plugincategory = data.message[0].category;
                                                                    if(res != false)
                                                                        logger.debug("[PLUGIN] --> Plugin category: " + plugincategory);

                                                                    if (plugincategory === "async") {

                                                                        session_wamp.call('s4t.'+ board + '.plugin.run', [plugin_name, parameters, plugin_checksum]).then(

                                                                            function (rpc_response) {

                                                                                if (rpc_response.result == "ERROR") {

                                                                                    response.message = rpc_response.message;
                                                                                    response.result = "ERROR";

                                                                                    db.updatePluginStatus(board, plugin, "failed", function (out) {

                                                                                        if(res != false){
                                                                                            logger.debug("[PLUGIN] ----> " + out.message);
                                                                                            logger.warn("[PLUGIN] --> Start plugin error for '" + plugin_name + "': " + JSON.stringify(response.message, null, "\t"));
                                                                                            res.status(500).send(response);
                                                                                        }else{
                                                                                            request_utils.updateResult(request_id, board, response.result, response.message);
                                                                                        }

                                                                                    });


                                                                                }
                                                                                else if (rpc_response.result == "SUCCESS"){

                                                                                    response.message = rpc_response.message;
                                                                                    response.result = "SUCCESS";

                                                                                    db.updatePluginStatus(board, plugin, "running", function (out) {

                                                                                        if(res != false){
                                                                                            logger.debug("[PLUGIN] ----> " + out.message);
                                                                                            logger.info("[PLUGIN] --> Start plugin result for '" + plugin_name + "': " + response.message);
                                                                                            res.status(200).send(response);
                                                                                        }else{
                                                                                            request_utils.updateResult(request_id, board, response.result, response.message);
                                                                                        }

                                                                                    });


                                                                                }else {

                                                                                    response.message = rpc_response.message;
                                                                                    response.result = rpc_response.result;
                                                                                    if(res != false){
                                                                                        logger.warn("[PLUGIN] --> Running warning result for '" + plugin_name + "' plugin: " + response.message);
                                                                                        res.status(500).send(response);
                                                                                    }else{
                                                                                        request_utils.updateResult(request_id, board, response.result, response.message);
                                                                                    }

                                                                                }


                                                                            },
                                                                            function (error) {

                                                                                response.message = error.args[0].message;
                                                                                response.result = "ERROR";
                                                                                if(res != false)
                                                                                    logger.error("[PLUGIN] --> Plugin error '" + plugin_name + "': " + JSON.stringify(response.message));

                                                                                db.updatePluginStatus(board, plugin, "failed", function (out) {

                                                                                    if(res != false){
                                                                                        logger.debug("[PLUGIN] ----> " + out.message);
                                                                                        logger.info("[PLUGIN] --> Error starting plugin '" + plugin_name + "': " + response.message);
                                                                                        res.status(500).send(response);
                                                                                    }else{
                                                                                        request_utils.updateResult(request_id, board, response.result, response.message);
                                                                                    }

                                                                                });

                                                                            }
                                                                        );

                                                                    } else {

                                                                        response.message = "Operation 'run' not supported for this plugin category!";
                                                                        response.result = "ERROR";
                                                                        if(res != false){
                                                                            logger.warn("[PLUGIN] ----> " + response.message);
                                                                            res.status(500).send(response);
                                                                        }else{
                                                                            request_utils.updateResult(request_id, board, response.result, response.message);
                                                                        }


                                                                    }


                                                                }



                                                            });


                                                        }



                                                    }
                                                );


                                                /*
                                                if (parameters == "" || parameters == undefined) {

                                                    response.message = "WARNING - ASYNC PLUGIN '" + plugin_name + "' has not parameters!";
                                                    response.result = "ERROR";
                                                    if(res != false){
                                                        logger.warn("[PLUGIN] --> " + response.message);
                                                        res.status(500).send(response);
                                                    }else{
                                                        request_utils.updateResult(request_id, board, response.result, response.message);
                                                    }

                                                }
                                                else {

                                                    if(res != false)
                                                        logger.debug("[PLUGIN] --> Plugin '" + plugin_name + "' parameters:\n " + parameters);

                                                    //I need to read the category of the plugin from the DB
                                                    db.getPluginCategory(plugin_name, function (data) {

                                                        if (data.result == "ERROR") {
                                                            response.message = data.message;
                                                            response.result = "ERROR";
                                                            if(res != false){
                                                                logger.warn("[PLUGIN] --> " + response.message);
                                                                res.status(500).send(response);
                                                            }else{
                                                                request_utils.updateResult(request_id, board, response.result, response.message);
                                                            }


                                                        } else {

                                                            var plugincategory = data.message[0].category;
                                                            if(res != false)
                                                                logger.debug("[PLUGIN] --> Plugin category: " + plugincategory);

                                                            if (plugincategory === "async") {

                                                                session_wamp.call('s4t.'+ board + '.plugin.run', [plugin_name, parameters, plugin_checksum]).then(

                                                                    function (rpc_response) {

                                                                        if (rpc_response.result == "ERROR") {

                                                                            response.message = rpc_response.message;
                                                                            response.result = "ERROR";

                                                                            db.updatePluginStatus(board, plugin, "failed", function (out) {

                                                                                if(res != false){
                                                                                    logger.debug("[PLUGIN] ----> " + out.message);
                                                                                    logger.warn("[PLUGIN] --> Start plugin error for '" + plugin_name + "': " + JSON.stringify(response.message, null, "\t"));
                                                                                    res.status(500).send(response);
                                                                                }else{
                                                                                    request_utils.updateResult(request_id, board, response.result, response.message);
                                                                                }

                                                                            });


                                                                        }
                                                                        else if (rpc_response.result == "SUCCESS"){

                                                                            response.message = rpc_response.message;
                                                                            response.result = "SUCCESS";

                                                                            db.updatePluginStatus(board, plugin, "running", function (out) {

                                                                                if(res != false){
                                                                                    logger.debug("[PLUGIN] ----> " + out.message);
                                                                                    logger.info("[PLUGIN] --> Start plugin result for '" + plugin_name + "': " + response.message);
                                                                                    res.status(200).send(response);
                                                                                }else{
                                                                                    request_utils.updateResult(request_id, board, response.result, response.message);
                                                                                }

                                                                            });


                                                                        }else {

                                                                            response.message = rpc_response.message;
                                                                            response.result = rpc_response.result;
                                                                            if(res != false){
                                                                                logger.warn("[PLUGIN] --> Running warning result for '" + plugin_name + "' plugin: " + response.message);
                                                                                res.status(500).send(response);
                                                                            }else{
                                                                                request_utils.updateResult(request_id, board, response.result, response.message);
                                                                            }

                                                                        }


                                                                    },
                                                                    function (error) {

                                                                        response.message = error.args[0].message;
                                                                        response.result = "ERROR";
                                                                        if(res != false)
                                                                            logger.error("[PLUGIN] --> Plugin error '" + plugin_name + "': " + JSON.stringify(response.message));

                                                                        db.updatePluginStatus(board, plugin, "failed", function (out) {

                                                                            if(res != false){
                                                                                logger.debug("[PLUGIN] ----> " + out.message);
                                                                                logger.info("[PLUGIN] --> Error starting plugin '" + plugin_name + "': " + response.message);
                                                                                res.status(500).send(response);
                                                                            }else{
                                                                                request_utils.updateResult(request_id, board, response.result, response.message);
                                                                            }

                                                                        });

                                                                    }
                                                                );

                                                            } else {

                                                                response.message = "Operation 'run' not supported for this plugin category!";
                                                                response.result = "ERROR";
                                                                if(res != false){
                                                                    logger.warn("[PLUGIN] ----> " + response.message);
                                                                    res.status(500).send(response);
                                                                }else{
                                                                    request_utils.updateResult(request_id, board, response.result, response.message);
                                                                }


                                                            }


                                                        }



                                                    });

                                                }
                                                */

                                                break;


                                            case 'call':

                                                if(res != false)
                                                    logger.debug("[PLUGIN] - STARTING SYNC PLUGIN '" + plugin_name + "'...");

                                                computeParameters(board, plugin, parameters, parameters_set, plugin_defaults,
                                                    function (cparams) {

                                                        if(cparams.result == "ERROR"){

                                                            if(res != false){
                                                                logger.warn("[PLUGIN] --> " + cparams.message);
                                                                res.status(500).send(cparams);
                                                            }else{
                                                                request_utils.updateResult(request_id, board, cparams.result, cparams.message);
                                                            }

                                                        }
                                                        else{

                                                            var parameters = cparams.message;

                                                            //console.log("FFFFFFFFFFFFFFFFFFFFF\nPARAMS COMPUTED: " + parameters + "\nFFFFFFFFFFFFFFFFFFFFF");

                                                            if(res != false)
                                                                logger.debug("[PLUGIN] --> Plugin '" + plugin_name + "' parameters:\n " + parameters);

                                                            //I need to read the category of the plugin from the DB
                                                            db.getPluginCategory(plugin_name, function (data) {

                                                                var plugincategory = data.message[0].category;
                                                                if(res != false)
                                                                    logger.debug("[PLUGIN] --> Plugin category: " + plugincategory);

                                                                if (plugincategory === "sync") {

                                                                    session_wamp.call('s4t.'+ board + '.plugin.call', [plugin_name, parameters, plugin_checksum], {}, {receive_progress: true}).then(

                                                                        function (rpc_response) {

                                                                            if (rpc_response.result == "ERROR") {

                                                                                response.message = rpc_response.message;
                                                                                response.result = "ERROR";

                                                                                db.updatePluginStatus(board, plugin, "failed", function (out) {

                                                                                    if(res != false){
                                                                                        logger.debug("[PLUGIN] ----> " + out.message);
                                                                                        logger.error("[PLUGIN] --> Executing error for '" + plugin_name + "' plugin: " + JSON.stringify(response.message, null, "\t"));
                                                                                        res.status(500).send(response);
                                                                                    }else{
                                                                                        request_utils.updateResult(request_id, board, response.result, response.message);
                                                                                    }


                                                                                });

                                                                            }else{

                                                                                response.message = rpc_response;
                                                                                response.result = "SUCCESS";

                                                                                db.updatePluginStatus(board, plugin, "executed", function (out) {

                                                                                    if(res != false){
                                                                                        logger.debug("[PLUGIN] ----> " + out.message);
                                                                                        logger.info("[PLUGIN] --> Executing result for '" + plugin_name + "' plugin:\n" + JSON.stringify(rpc_response, null, "\t"));
                                                                                        res.status(200).send(response);
                                                                                    }else{
                                                                                        request_utils.updateResult(request_id, board, response.result, response.message);
                                                                                    }

                                                                                });

                                                                            }

                                                                        },
                                                                        function (error) {

                                                                            response.message = error.args[0].message;
                                                                            response.result = "ERROR";

                                                                            db.updatePluginStatus(board, plugin, "failed", function (out) {

                                                                                if(res != false){
                                                                                    logger.debug("[PLUGIN] ----> " + out.message);
                                                                                    logger.error("[PLUGIN] --> Executing RPC error for '" + plugin_name + "' plugin: " + JSON.stringify(response.message));
                                                                                    res.status(500).send(response);
                                                                                }else{
                                                                                    request_utils.updateResult(request_id, board, response.result, response.message);
                                                                                }

                                                                            });

                                                                        },
                                                                        function (progress) {
                                                                            logger.debug("[PLUGIN] --> Executing RPC progress result for '" + plugin_name + "' plugin: " + JSON.stringify(progress));
                                                                        }

                                                                    );

                                                                } else {
                                                                    response.message = "Operation 'call' not supported for this plugin category!";
                                                                    response.result = "ERROR";
                                                                    if(res != false){
                                                                        logger.warn("[PLUGIN] ----> " + response.message);
                                                                        res.status(500).send(response);
                                                                    }else{
                                                                        request_utils.updateResult(request_id, board, response.result, response.message);
                                                                    }
                                                                }
                                                            });


                                                        }



                                                    }
                                                );




                                                /*
                                                if (parameters == "" || parameters == undefined) {

                                                    response.message = "WARNING - SYNC PLUGIN '" + plugin_name + "' has not parameters!";
                                                    response.result = "ERROR";

                                                    if(res != false){
                                                        logger.warn("[PLUGIN] --> " + response.message);
                                                        res.status(500).send(response);
                                                    }else{
                                                        request_utils.updateResult(request_id, board, response.result, response.message);
                                                    }

                                                }
                                                else {

                                                    if(res != false)
                                                        logger.debug("[PLUGIN] --> Plugin '" + plugin_name + "' parameters:\n " + parameters);

                                                    //I need to read the category of the plugin from the DB
                                                    db.getPluginCategory(plugin_name, function (data) {

                                                        var plugincategory = data.message[0].category;
                                                        if(res != false)
                                                            logger.debug("[PLUGIN] --> Plugin category: " + plugincategory);

                                                        if (plugincategory === "sync") {

                                                            session_wamp.call('s4t.'+ board + '.plugin.call', [plugin_name, parameters, plugin_checksum], {}, {receive_progress: true}).then(

                                                                function (rpc_response) {

                                                                    if (rpc_response.result == "ERROR") {

                                                                        response.message = rpc_response.message;
                                                                        response.result = "ERROR";

                                                                        db.updatePluginStatus(board, plugin, "failed", function (out) {

                                                                            if(res != false){
                                                                                logger.debug("[PLUGIN] ----> " + out.message);
                                                                                logger.error("[PLUGIN] --> Executing error for '" + plugin_name + "' plugin: " + JSON.stringify(response.message, null, "\t"));
                                                                                res.status(500).send(response);
                                                                            }else{
                                                                                request_utils.updateResult(request_id, board, response.result, response.message);
                                                                            }


                                                                        });

                                                                    }else{

                                                                        response.message = rpc_response;
                                                                        response.result = "SUCCESS";

                                                                        db.updatePluginStatus(board, plugin, "executed", function (out) {

                                                                            if(res != false){
                                                                                logger.debug("[PLUGIN] ----> " + out.message);
                                                                                logger.info("[PLUGIN] --> Executing result for '" + plugin_name + "' plugin:\n" + JSON.stringify(rpc_response, null, "\t"));
                                                                                res.status(200).send(response);
                                                                            }else{
                                                                                request_utils.updateResult(request_id, board, response.result, response.message);
                                                                            }

                                                                        });

                                                                    }

                                                                },
                                                                function (error) {

                                                                    response.message = error.args[0].message;
                                                                    response.result = "ERROR";

                                                                    db.updatePluginStatus(board, plugin, "failed", function (out) {

                                                                        if(res != false){
                                                                            logger.debug("[PLUGIN] ----> " + out.message);
                                                                            logger.error("[PLUGIN] --> Executing RPC error for '" + plugin_name + "' plugin: " + JSON.stringify(response.message));
                                                                            res.status(500).send(response);
                                                                        }else{
                                                                            request_utils.updateResult(request_id, board, response.result, response.message);
                                                                        }

                                                                    });

                                                                },
                                                                function (progress) {
                                                                    logger.debug("[PLUGIN] --> Executing RPC progress result for '" + plugin_name + "' plugin: " + JSON.stringify(progress));
                                                                }

                                                            );

                                                        } else {
                                                            response.message = "Operation 'call' not supported for this plugin category!";
                                                            response.result = "ERROR";
                                                            if(res != false){
                                                                logger.warn("[PLUGIN] ----> " + response.message);
                                                                res.status(500).send(response);
                                                            }else{
                                                                request_utils.updateResult(request_id, board, response.result, response.message);
                                                            }
                                                        }
                                                    });


                                                }
                                                */

                                                break;


                                            case 'kill':

                                                if(res != false)
                                                    logger.debug("[PLUGIN] - KILLING PLUGIN '" + plugin_name + "'...");

                                                session_wamp.call('s4t.'+ board + '.plugin.kill', [plugin_name]).then(

                                                    function (rpc_response) {

                                                        if (rpc_response.result == "ERROR") {

                                                            response.message = rpc_response.message;
                                                            response.result = "ERROR";

                                                            if(res != false){
                                                                logger.warn("[PLUGIN] --> Stop plugin result for '" + plugin_name + "': " + JSON.stringify(response.message, null, "\t"));
                                                                res.status(500).send(response);
                                                            }else{
                                                                request_utils.updateResult(request_id, board, response.result, response.message);
                                                            }

                                                        }else{

                                                            response.message = rpc_response.message;
                                                            response.result = rpc_response.result;

                                                            db.updatePluginStatus(board, plugin, "killed", function (out) {

                                                                if(res != false){
                                                                    logger.debug("[PLUGIN] ----> " + out.message);
                                                                    logger.info("[PLUGIN] --> Stop plugin result for '" + plugin_name + "': " + response.message);
                                                                    res.status(200).send(response);
                                                                }else{
                                                                    request_utils.updateResult(request_id, board, response.result, response.message);
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

                                                            request_utils.updateResult(request_id, board, response.result, response.message);

                                                        }

                                                    }
                                                    
                                                );

                                                break;

                                            case 'restart':

                                                if(res != false)
                                                    logger.debug("[PLUGIN] - RESTARTING PLUGIN '" + plugin_name + "'...");

                                                session_wamp.call('s4t.'+ board + '.plugin.restart', [plugin_name, plugin_checksum]).then(

                                                    function (rpc_response) {

                                                        if (rpc_response.result == "ERROR") {

                                                            response.message = rpc_response.message;
                                                            response.result = "ERROR";
                                                            
                                                            db.updatePluginStatus(board, plugin, "failed", function (out) {

                                                                if(res != false){
                                                                    logger.debug("[PLUGIN] ----> " + out.message);
                                                                    logger.error("[PLUGIN] --> Restart error for '" + plugin_name + "' plugin: " + JSON.stringify(response.message, null, "\t"));
                                                                    res.status(500).send(response);
                                                                }else{
                                                                    request_utils.updateResult(request_id, board, response.result, response.message);
                                                                }

                                                            });

                                                        }else{

                                                            response.message = rpc_response.message;
                                                            response.result = rpc_response.result;

                                                            db.updatePluginStatus(board, plugin, "restarted", function (out) {

                                                                if(res != false){
                                                                    logger.debug("[PLUGIN] ----> " + out.message);
                                                                    logger.info("[PLUGIN] --> Restart result for '" + plugin_name + "' plugin: " + response.message);
                                                                    res.status(200).send(response);
                                                                }else{
                                                                    request_utils.updateResult(request_id, board, response.result, response.message);
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

                                                            request_utils.updateResult(request_id, board, response.result, response.message);

                                                        }

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

                                                if(res != false){
                                                    logger.error("[PLUGIN] - " + response.message);
                                                    res.status(500).send(response);
                                                }else{
                                                    request_utils.updateResult(request_id, board, response.result, response.message);
                                                }

                                                break;


                                        }

                                    }
                                    catch (err) {
                                        response.message = "Plugin config is not a JSON: " + err;
                                        response.result = "ERROR";
                                        if(res != false){
                                            logger.error("[PLUGIN] --> " + response.message);
                                            res.status(500).send(response);
                                        }else{
                                            request_utils.updateResult(request_id, board, response.result, response.message);
                                        }

                                    }

                                }



                            }

                        });





                    }

                }




            });


        } else if (available.result == "WARNING") {

            if(res != false){
                logger.warn("[PLUGIN] --> " + available.message);
            }
            else{

                var result_msg = "board disconnected";

                request_utils.updateResult(request_id, board, available.result, result_msg);

            }


        }


    });





};


plugin_utils.prototype.removePlugin = function (board, request_id, args) {

    var plugin = args[0];
    var res = args[1];

    if(res != false)
        logger.info("[PLUGIN] - REMOVING plugin '" + plugin + "' from board " + board);

    var response = {
        message: '',
        result: ''
    };

    board_utility.checkBoardAvailable(board, res, function (available) {

        if (available.result == "SUCCESS") {

            var pluginId;
            var pluginName;

            db.getPlugin(plugin, function (data) {

                if (data.result == "ERROR") {
                    response.message = data.message;
                    response.result = "ERROR";
                    if(res != false){
                        logger.warn("[PLUGIN] --> " + response.message);
                        res.status(500).send(response);
                    }
                    else{
                        request_utils.updateResult(request_id, board, response.result, response.message);
                    }

                } else {

                    if (data.message[0] === undefined) {

                        response.result = "ERROR";
                        response.message = "Plugin does not exist in Iotronic!";
                        if(res != false){
                            logger.error("[PLUGIN] --> " + response.message);
                            res.status(500).send(response);
                        }
                        else{
                            request_utils.updateResult(request_id, board, response.result, response.message);
                        }

                    }
                    else {

                        pluginId = data.message[0].id;
                        pluginName = data.message[0].name;

                        //check if the plugin is still injected
                        db.getInjectedPlugin(pluginId, board, function (data) {

                            if (data.result == "ERROR") {

                                response.message = data.message;
                                response.result = "ERROR";
                                if(res != false){
                                    logger.error("[PLUGIN] --> " + response.message);
                                    res.status(500).send(response);
                                }
                                else{
                                    request_utils.updateResult(request_id, board, response.result, response.message);
                                }

                            } else {

                                if(data.message.length == 0){

                                    response.message = "Plugin '" + pluginName + "' already removed!";
                                    response.result = "WARNING";

                                    if(res != false){
                                        logger.warn("[PLUGIN] --> " + response.message);
                                        res.status(200).send(response);
                                    } else{
                                        request_utils.updateResult(request_id, board, response.result, response.message);
                                    }

                                }else{

                                    session_wamp.call('s4t.' + board + '.plugin.remove', [pluginName]).then(

                                        function (rpc_remove) {

                                            if(rpc_remove.result == "SUCCESS"){

                                                db.deleteInjectedPlugin(board, pluginName, function (data_p) {

                                                    if (data_p.result == "ERROR") {
                                                        response.message = data_p.message;
                                                        response.result = "ERROR";
                                                        if(res != false){
                                                            logger.warn("[PLUGIN] --> " + response.message);
                                                            res.status(500).send(response);
                                                        }
                                                        else{
                                                            request_utils.updateResult(request_id, board, response.result, response.message);
                                                        }

                                                    } else {

                                                        response.result = "SUCCESS";
                                                        response.message = rpc_remove.message;

                                                        if(res != false){
                                                            logger.info("[PLUGIN] ----> " + response.message);
                                                            res.status(200).send(response);
                                                        } else{
                                                            request_utils.updateResult(request_id, board, response.result, response.message);
                                                        }

                                                    }


                                                });

                                            }else{

                                                if(res != false){
                                                    logger.warn("[PLUGIN] --> " + rpc_remove.message);
                                                    res.status(200).send(rpc_remove);
                                                }
                                                else
                                                    request_utils.updateResult(request_id, board, rpc_remove.result, rpc_remove.message);


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


                                }


                            }


                        });



                    }

                }


            });


        } else if (available.result == "WARNING") {

            if(res != false){
                logger.warn("[PLUGIN] --> " + available.message);
            }
            else{

                var result_msg = "board disconnected";

                request_utils.updateResult(request_id, board, available.result, result_msg);

            }


        }


    });


};


plugin_utils.prototype.getBoardPluginDetails = function (board, plugin, res) {

    var response = {
        message: '',
        result: ''
    };

    logger.debug("[PLUGIN] - Plugin '" + plugin + "' details on board " + board);

    //I need to read the name of the plugin from the DB
    db.getPlugin(plugin, function (data) {

        if (data.result == "ERROR") {
            response.message = data.message;
            response.result = "ERROR";
            logger.warn("[PLUGIN] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {
                response.message = "Plugin does not exist in Iotronic!";
                response.result = "ERROR";
                logger.warn("[PLUGIN] --> " + response.message);
                res.status(500).send(response);
            }
            else {

                var pluginId = data.message[0].id;

                db.getInjectedPlugin(pluginId, board, function (data) {

                    if(data.result=="ERROR"){
                        response.message = data.message;
                        response.result = "ERROR";
                        logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                        res.status(500).send(response);

                    }else{
                        response.message = data.message[0];
                        response.result = "SUCCESS";
                        res.status(200).send(response);

                    }

                });

            }

        }

    });

};


plugin_utils.prototype.getPluginLogs = function (board, request_id, args) {

    var d = Q.defer();

    var response = {
        message: '',
        result: ''
    };

    var plugin_id = args[0];
    var rows = args[1];
    var res = args[2];

    if(res != false)
        logger.debug("[PLUGIN] - Getting plugin "+plugin_id+" logs for board '" + board +"':");

    board_utility.checkBoardAvailable(board, res, function (available) {

        if (available.result == "SUCCESS") {


            db.getPlugin(plugin_id, function (data) {

                if(data.result=="ERROR"){

                    response.message = data.message;
                    response.result = "ERROR";

                    if(res != false){
                        logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                        res.status(500).send(response);
                    } else{
                        request_utils.updateResult(request_id, board, response.result, response.message);
                    }

                }else{

                    if (data.message[0] === undefined) {
                        response.message = "Plugin '" + plugin_id + "' does not exist in IoTronic!";
                        response.result = "WARNING";
                        if(res != false){
                            logger.info("[PLUGIN] ----> " + response.message);
                            res.status(200).send(response);
                        } else{
                            request_utils.updateResult(request_id, board, response.result, response.message);
                        }
                    }
                    else {

                        var plugin_name = data.message[0].name;

                        //check if the plugin is injected
                        db.getInjectedPlugin(plugin_id, board, function (data) {

                            if (data.result == "ERROR") {

                                response.message = data.message;
                                response.result = "ERROR";
                                if(res != false){
                                    logger.error("[PLUGIN] --> " + response.message);
                                    res.status(500).send(response);
                                }
                                else{
                                    request_utils.updateResult(request_id, board, response.result, response.message);
                                }

                            } else {

                                if(data.message.length == 0){

                                    response.message = "Plugin '" + plugin_name + "' is not injected!";
                                    response.result = "WARNING";

                                    if(res != false){
                                        logger.warn("[PLUGIN] --> " + response.message);
                                        res.status(200).send(response);
                                    } else{
                                        request_utils.updateResult(request_id, board, response.result, response.message);
                                    }

                                }else{

                                    session_wamp.call('s4t.'+ board + '.plugin.logs', [plugin_name, rows]).then(

                                        function (rpc_response) {

                                            if (rpc_response.result == "ERROR") {

                                                response.message = rpc_response.message;
                                                response.result = "ERROR";
                                                if(res != false){
                                                    logger.error("[PLUGIN] ----> " + response.message);
                                                    res.status(500).send(response);
                                                } else{
                                                    request_utils.updateResult(request_id, board, response.result, response.message);
                                                }

                                            }else{

                                                response.message = rpc_response.message;
                                                response.result = rpc_response.result;
                                                if(res != false){
                                                    logger.info("[PLUGIN] ----> " + response.message);
                                                    res.status(200).send(response);
                                                } else{
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


                                }


                            }


                        });



                    }


                }

            });


        } else if (available.result == "WARNING") {

            if(res != false){
                logger.warn("[PLUGIN] --> " + available.message);
            }
            else{

                var result_msg = "board disconnected";

                request_utils.updateResult(request_id, board, available.result, result_msg);

            }


        }


    });







    return d.promise;


};




plugin_utils.prototype.exportCommands = function (session){

    //Register all the module functions as WAMP RPCs
    logger.debug("[WAMP-EXPORTS] Plugins RPCs exposing:");

    session.register('s4t.iotronic.plugin.checksum', this.getChecksum);
    logger.debug('[WAMP-EXPORTS] --> s4t.iotronic.checksum');

    session.register('s4t.iotronic.plugin.invalidPlugin', this.invalidPlugin);
    logger.debug('[WAMP-EXPORTS] --> s4t.iotronic.invalidPlugin');

    logger.info('[WAMP-EXPORTS] Plugins RPCs exported to the cloud!');

};


/*
// Function used to delete all driver files during driver removing from the board
function deleteFolderRecursive(path){

    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) {
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
*/


module.exports = plugin_utils;
