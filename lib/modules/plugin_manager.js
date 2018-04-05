//###############################################################################
//##
//# Copyright (C) 2014-2017 Nicola Peditto, Francesco Longo
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

var session_wamp;

//var IotronicHome = "/var/lib/iotronic";
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
     *        type: string
     *        description: "The IoTronic plugin NAME or ID"
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

        var pluginName = req.params.plugin;

        var response = {
            message: '',
            result: ''
        };

        db.getPlugin(pluginName, function (data) {

            if(data.result=="ERROR"){
                
                response.message = data.message;
                response.result = "ERROR";
                logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                res.status(500).send(response);

            }else{
                
                if (data.message[0] === undefined) {
                    response.message = "Plugin '" + pluginName + "' does not exist in IoTronic!";
                    response.result = "WARNING";
                    res.status(200).send(response);
                }
                else {
                    //delete data.message[0]['checksum'];
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
     *        type: string
     *        description: "The IoTronic plugin NAME or ID"
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
     *        description: "The IoTronic plugin NAME or ID"
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

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var plugin = req.body.plugin;
                var onboot = req.body.onboot;
                var force = req.body.force;

                var ApiRequired= {"plugin":plugin, "onboot":onboot};

                board_utility.checkRequired(ApiRequired, function (check){

                    if(check.result == "ERROR"){

                        res.status(500).send(check);

                    }else {

                        plugin_utils.injectPlugin(board, plugin, onboot, force, res);
                        
                    }

                });
                

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }

        });


        

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
     *        description: "The IoTronic plugin NAME or ID"
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

        logger.info("[API] - Plugin Operation - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);
        
        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var plugin = req.params.plugin;

                var parameters = req.body.parameters; //OPTIONAL: run | call only
                var operation = req.body.operation; // run | call | stop

                var ApiRequired= {"operation":operation};

                board_utility.checkRequired(ApiRequired, function (check){

                    if(check.result == "ERROR"){

                        res.status(500).send(check);

                    }else {
                        
                        logger.info("[PLUGIN] - Plugin operation on board "+ board +": " + operation + " plugin '" + plugin +"'");

                        plugin_utils.managePlugins(board, plugin, parameters, operation, res);

                    }

                });


            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
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
     *        description: "The IoTronic plugin NAME or ID"
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

                plugin_utils.removePlugin(board, plugin, res);

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }

        });
        

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
        var parameters = req.body.parameters;
        var code = req.body.code;
        var description = req.body.description;
        var version = req.body.version;
        //var type_id = req.body.type;
        var tag_id = req.body.tag;


        var ApiRequired = {"name":name, "parameters":parameters, "code":code, "version":version, "tag":tag_id};
        //var ApiRequired = {"name":name, "category":category, "parameters":parameters, "code":code, "version":version, "type":type_id, "tag":tag_id};


        board_utility.checkRequired(ApiRequired, function (check){

            if(check.result == "ERROR"){

                res.status(500).send(check);

            }else {

                plugin_utils.updatePlugin(plugin, name, parameters, code, description, version, tag_id, res);
                //plugin_utils.updatePlugin(plugin, name, category, parameters, code, description, version, tag_id, type_id, res);


            }

        });


    });
    
    
    
    logger.debug("[REST-EXPORT] - Plugin's APIs exposed!");

    //---------------------------------------------------------------------------------------------------


    // Register RPC methods
    this.exportCommands(session_wamp)






};





//plugin_utils.prototype.updatePlugin = function (plugin, name, category, parameters, code, description, version, tag_id, type_id, res) {
plugin_utils.prototype.updatePlugin = function (plugin, name, parameters, code, description, version, tag_id, res) {

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

                //db.updatePlugin(plugin_id, name, category, version, type_id, tag_id, code, parameters, description, function (result_db) {
                db.updatePlugin(plugin_id, name, version, tag_id, code, parameters, description, function (result_db) {

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

    logger.debug("[PLUGIN] - Getting plugin checksums for board '" + board_id +"':");


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

                        logger.debug("\n"+JSON.stringify(checkList));

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

    logger.debug("[PLUGIN] - Plugin '"+plugin_name+"' checksum not valid for board '" + board_id +"'!");

    db.updatePluginStatus(board_id, plugin_name, "invalid", function (data) {

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
            

            db.getPlugin(name, function (data) {

                if (data.result == "ERROR") {

                    response.message = data.message;
                    response.result = "ERROR";
                    logger.warn("[PLUGIN] --> " + response.message);
                    res.status(500).send(response);

                } else {

                    if (data.message[0] === undefined) {


                        db.insertCreatedPlugin(name, category, parameters, code, version, type, description, function (result_db) {

                            if (result_db.result == "ERROR") {

                                logger.error("[PLUGIN] --> createPlugin - DB write error: " + result_db.message);
                                response.message = result_db.message;
                                response.result = "ERROR";
                                res.status(500).send(response);

                            } else {

                                logger.debug("[PLUGIN] --> DB successfully updated: " + JSON.stringify(result_db.message));

                                response.message = "Plugin '" + name + "' successfully created in Iotronic!";
                                response.result = "SUCCESS";
                                logger.info("[PLUGIN] --> " +response.message);
                                res.status(200).send(response);

                            }

                        });



                    }
                    else {

                        response.message = "Plugin '" + name + "' already exist!";
                        response.result = "ERROR";
                        logger.warn("[PLUGIN] --> " + response.message);
                        res.status(500).send(response);

                    }

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
                response.message = "Plugin " + plugin + " does not exist!";
                response.result = "ERROR";
                logger.warn("[PLUGIN] --> " + response.message);
                res.status(500).send(response);

            }
            else {

                var p_name = data.message[0].name;
                var plugin_folder = PLUGINS_STORE + p_name;

                db.deletePlugin(plugin, function (result_db) {

                    if (result_db.result == "ERROR") {
                        logger.warn("[PLUGIN] --> Delete DB error: " + result_db.message);
                        response.message = result_db.message;
                        response.result = "ERROR";
                        res.status(500).send(response);

                    } else {

                        response.message = "Plugin " + p_name + " successfully removed from Iotronic!!";
                        response.result = "SUCCESS";
                        logger.info("[PLUGIN] --> " + response.message);
                        res.status(200).send(response);

                    }

                });


            }

        }



    });

};


plugin_utils.prototype.injectPlugin = function (board, plugin, autostart, force, res) {

    logger.info("[PLUGIN] - Injecting plugin '" + plugin + "' into the board '" + board + "'...");

    var response = {
        message: '',
        result: ''
    };

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

                var pluginName = data.message[0].name;
                var pluginCode = data.message[0].code;

                var pluginChecksum = data.message[0].checksum;
                var pluginTag = data.message[0].tag;
                var pluginParameters = data.message[0].defaults;

                var pluginBundle = data.message[0];

                if(pluginTag == "released"){

                    var checksum = md5(pluginCode);

                    if(pluginChecksum === checksum){

                        logger.debug("[PLUGIN] --> Plugin checksum accepted!");

                        //check if the plugin is still injected
                        db.getInjectedPlugin(pluginId, board, function (data) {

                            if (data.result == "ERROR") {

                                response.message = data.message;
                                response.result = "ERROR";
                                logger.error("[PLUGIN] --> " + response.message);
                                res.status(500).send(response);

                            } else {

                                if (data.message.length == 0 || force == true || force == "true") {

                                    logger.debug("[PLUGIN] --> Calling injectplugin RPC with name = '" + pluginName + "' onboot = '" + autostart + "' - force = '" + force + "' code: \n" + pluginCode +
                                        "\n\nwith the following default parameters:\n"+pluginParameters);

                                    //Now I can perform the RPC call
                                    session_wamp.call('s4t.'+ board + '.plugin.inject', [JSON.stringify(pluginBundle) , autostart, force]).then(

                                        function (rpc_response) {

                                            if(rpc_response.result == "ERROR"){
                                                response.message = "INJECT plugin " + pluginName + " failed: "+rpc_response.message;
                                                response.result = "ERROR";
                                                logger.error("[PLUGIN] --> " + response.message);
                                                res.status(500).send(response);

                                            }
                                            else{


                                                if(force == true || force == "true"){

                                                    //logger.warn("[PLUGIN] --> Plugin '" + pluginName + "' overwritten ! Updating...");

                                                    db.updatePluginStatus(board, pluginName, "injected", function (out) {
                                                        if(out.result=="ERROR"){
                                                            response.message = "Plugin " + pluginName + " updating error: "+out.message;
                                                            response.result = "ERROR";
                                                            logger.error("[PLUGIN] ----> " + response.message);
                                                            res.status(500).send(response);
                                                        }else{
                                                            response.message = "Plugin " + pluginName+" successfully overwritten!";
                                                            response.result = "SUCCESS";
                                                            logger.info("[PLUGIN] ----> " + response.message);
                                                            res.status(200).send(response);
                                                        }

                                                    });

                                                }else{

                                                    db.insertInjectedPlugin(board, pluginName, function (out) {

                                                        if(out.result=="ERROR"){
                                                            response.message = "Plugin " + pluginName + " injection failed: "+out.message;
                                                            response.result = "ERROR";
                                                            logger.error("[PLUGIN] --> " + response.message);
                                                            res.status(500).send(response);
                                                        }else{
                                                            response.message = "Plugin " + pluginName + " successfully injected!";
                                                            response.result = "SUCCESS";
                                                            logger.info("[PLUGIN] --> " + response.message);
                                                            res.status(200).send(response);
                                                        }

                                                    });

                                                }

                                      
                                            }

                                            

                                        }
                                    );




                                } else {

                                    response.message = "Plugin " + pluginName + " already injected!";
                                    response.result = "WARNING";
                                    logger.warn("[PLUGIN] --> " + response.message);
                                    res.status(200).send(response);


                                }

                            }

                        });






                    }else{

                        response.message = "Plugin checksum mismatch!";
                        response.result = "ERROR";
                        logger.warn("[PLUGIN] --> " + response.message);
                        res.status(500).send(response);

                    }


                }else{

                    response.message = "Plugin not released yet!";
                    response.result = "ERROR";
                    logger.warn("[PLUGIN] --> " + response.message);
                    res.status(500).send(response);

                }









            }
        }


    });
};


plugin_utils.prototype.managePlugins = function (board, plugin, pluginjson, plugin_operation, res) {


    db.getPlugin(plugin, function (data) {
        
        if (data.result == "ERROR") {
            response.message = data.message;
            response.result = "ERROR";
            logger.warn("[PLUGIN] --> " + response.message);
            res.status(500).send(response);

        } else {

            var response = {
                message: '',
                result: ''
            };

            if (data.message[0] === undefined) {

                response.result = "ERROR";
                response.message = "Plugin does not exist in Iotronic!";
                res.status(500).send(response);
                logger.warn("[PLUGIN] --> " + response.message);

            }
            else {

                var plugin_name = data.message[0].name;
                var plugin_checksum = data.message[0].checksum;

                try {

                    if(plugin_operation != "kill" && plugin_operation != "restart")

                        if (pluginjson != "" && pluginjson != undefined){

                            JSON.parse(pluginjson);

                        }else{
                            
                            logger.debug("[PLUGIN] - Plugin parameters not specified, retrieving default parameters from DB....");

                            pluginjson = data.message[0].defaults;

                        }


                    switch (plugin_operation) {

                        case 'run':

                            logger.debug("[PLUGIN] - STARTING ASYNC PLUGIN '" + plugin_name + "'...");

                            if (pluginjson == "" || pluginjson == undefined) {
                                response.message = "WARNING - ASYNC PLUGIN '" + plugin_name + "' has not parameters!";
                                response.result = "ERROR";
                                logger.warn("[PLUGIN] --> " + response.message);
                                res.status(500).send(response);
                            }
                            else {

                                logger.debug("[PLUGIN] --> Plugin '" + plugin_name + "' parameters:\n " + pluginjson);

                                //I need to read the category of the plugin from the DB
                                db.getPluginCategory(plugin_name, function (data) {

                                    if (data.result == "ERROR") {
                                        response.message = data.message;
                                        response.result = "ERROR";
                                        logger.warn("[PLUGIN] --> " + response.message);
                                        res.status(500).send(response);

                                    } else {

                                        var plugincategory = data.message[0].category;
                                        logger.debug("[PLUGIN] --> Plugin category: " + plugincategory);

                                        if (plugincategory === "async") {

                                            session_wamp.call('s4t.'+ board + '.plugin.run', [plugin_name, pluginjson, plugin_checksum]).then(

                                                function (rpc_response) {
                                                    
                                                    if (rpc_response.result == "ERROR") {

                                                        response.message = rpc_response.message;
                                                        response.result = "ERROR";
                                                        res.status(500).send(response);
                                                        logger.error("[PLUGIN] --> Running error for '" + plugin_name + "' plugin: " + response.message);

                                                        db.updatePluginStatus(board, plugin_name, "failed", function (out) {
                                                            logger.info("[PLUGIN] ----> " + out.message);
                                                        });

                                                    }else if (rpc_response.result == "SUCCESS"){

                                                        response.message = rpc_response.message;
                                                        response.result = "SUCCESS";
                                                        res.status(200).send(response);
                                                        logger.info("[PLUGIN] --> Running result for '" + plugin_name + "': plugin " + response.message);

                                                        db.updatePluginStatus(board, plugin_name, "running", function (out) {
                                                            logger.debug("[PLUGIN] ----> " + out.message);
                                                        });

                                                    }else {

                                                        response.message = rpc_response.message;
                                                        response.result = rpc_response.result;
                                                        res.status(500).send(response);
                                                        logger.warn("[PLUGIN] --> Running warning result for '" + plugin_name + "' plugin: " + response.message);

                                                    }


                                                },
                                                function (error) {

                                                    response.message = error.args[0].message;
                                                    response.result = "ERROR";
                                                    res.status(500).send(response);
                                                    logger.error("[PLUGIN] --> Plugin error '" + plugin_name + "': " + JSON.stringify(response.message));

                                                    db.updatePluginStatus(board, plugin_name, "failed", function (out) {
                                                        logger.info("[PLUGIN] ----> " + out.message);
                                                    });

                                                }
                                            );

                                        } else {
                                            response.message = "Operation 'run' not supported for this plugin category!";
                                            response.result = "ERROR";
                                            res.status(500).send(response);
                                            logger.warn("[PLUGIN] ----> " + response.message);
                                        }

                                    }



                                });

                            }

                            break;


                        case 'call':

                            logger.debug("[PLUGIN] - STARTING SYNC PLUGIN '" + plugin_name + "'...");

                            if (pluginjson == "" || pluginjson == undefined) {

                                response.message = "WARNING - SYNC PLUGIN '" + plugin_name + "' has not parameters!";
                                response.result = "ERROR";
                                logger.warn("[PLUGIN] --> " + response.message);
                                res.status(500).send(response);

                            }
                            else {

                                logger.debug("[PLUGIN] --> Plugin '" + plugin_name + "' parameters:\n " + pluginjson);

                                //I need to read the category of the plugin from the DB
                                db.getPluginCategory(plugin_name, function (data) {

                                    var plugincategory = data.message[0].category;
                                    logger.debug("[PLUGIN] --> Plugin category: " + plugincategory);

                                    if (plugincategory === "sync") {

                                        session_wamp.call('s4t.'+ board + '.plugin.call', [plugin_name, pluginjson, plugin_checksum], {}, {receive_progress: true}).then(
                                            function (rpc_response) {

                                                if (rpc_response.result == "ERROR") {

                                                    response.message = rpc_response.message;
                                                    response.result = "ERROR";
                                                    res.status(500).send(response);
                                                    logger.error("[PLUGIN] --> Executing error for '" + plugin_name + "' plugin: " + JSON.stringify(response.message));

                                                    db.updatePluginStatus(board, plugin_name, "failed", function (out) {
                                                        logger.info("[PLUGIN] ----> " + out.message);
                                                    });

                                                }else{
                                                    response.message = rpc_response;
                                                    response.result = "SUCCESS";
                                                    res.status(200).send(response);
                                                    logger.info("[PLUGIN] --> Executing result for '" + plugin_name + "' plugin:\n" + rpc_response);

                                                    db.updatePluginStatus(board, plugin_name, "executed", function (out) {
                                                        logger.debug("[PLUGIN] ----> " + out.message);
                                                    });
                                                }

                                            },
                                            function (error) {

                                                response.message = error.args[0].message;
                                                response.result = "ERROR";
                                                res.status(500).send(response);
                                                logger.error("[PLUGIN] --> Executing RPC error for '" + plugin_name + "' plugin: " + JSON.stringify(response.message));

                                                db.updatePluginStatus(board, plugin_name, "failed", function (out) {
                                                    logger.info("[PLUGIN] ----> " + out.message);
                                                });

                                            },
                                            function (progress) {
                                                logger.debug("[PLUGIN] --> Executing RPC progress result for '" + plugin_name + "' plugin: " + JSON.stringify(progress));
                                            }
                                        );

                                    } else {
                                        response.message = "Operation 'call' not supported for this plugin category!";
                                        response.result = "ERROR";
                                        res.status(500).send(response);
                                        logger.warn("[PLUGIN] ----> " + response.message);
                                    }
                                });


                            }

                            break;


                        case 'kill':

                            logger.debug("[PLUGIN] - KILLING PLUGIN '" + plugin_name + "'...");

                            session_wamp.call('s4t.'+ board + '.plugin.kill', [plugin_name]).then(

                                function (rpc_response) {

                                    if (rpc_response.result == "ERROR") {

                                        response.message = rpc_response.message;
                                        response.result = "ERROR";
                                        res.status(500).send(response);
                                        logger.warn("[PLUGIN] --> KILL RESULT for '" + plugin_name + "': " + response.message);

                                    }else{
                                        response.message = rpc_response.message;
                                        response.result = rpc_response.result;
                                        res.status(200).send(response);
                                        logger.info("[PLUGIN] --> KILL RESULT for '" + plugin_name + "': " + response.message);

                                        db.updatePluginStatus(board, plugin_name, "killed", function (out) {
                                            logger.debug("[PLUGIN] ----> " + out.message);
                                        });

                                    }

                                });

                            break;

                        case 'restart':

                            logger.debug("[PLUGIN] - RESTARTING PLUGIN '" + plugin_name + "'...");

                            session_wamp.call('s4t.'+ board + '.plugin.restart', [plugin_name, plugin_checksum]).then(

                                function (rpc_response) {

                                    if (rpc_response.result == "ERROR") {

                                        response.message = rpc_response.message;
                                        response.result = "ERROR";
                                        res.status(500).send(response);
                                        logger.error("[PLUGIN] --> Restart error for '" + plugin_name + "' plugin: " + response.message);

                                        db.updatePluginStatus(board, plugin_name, "failed", function (out) {
                                            logger.info("[PLUGIN] ----> " + out.message);
                                        });

                                    }else{

                                        response.message = rpc_response.message;
                                        response.result = rpc_response.result;
                                        res.status(200).send(response);
                                        logger.info("[PLUGIN] --> Restart result for '" + plugin_name + "' plugin: " + response.message);

                                        db.updatePluginStatus(board, plugin_name, "restarted", function (out) {
                                            logger.debug("[PLUGIN] ----> " + out.message);
                                        });

                                    }

                                });

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

                }
                catch (err) {
                    response.message = "Plugin config is not a JSON: " + err;
                    response.result = "ERROR";
                    logger.error("[PLUGIN] --> " + response.message);
                    res.status(500).send(response);
                }



            }

        }




    });



};


plugin_utils.prototype.removePlugin = function (board, plugin, res) {

    logger.info("[PLUGIN] - REMOVING plugin '" + plugin + "' from board " + board);

    var response = {
        message: '',
        result: ''
    };

    var pluginId;
    var pluginName;
    
    db.getPlugin(plugin, function (data) {

        if (data.result == "ERROR") {
            response.message = data.message;
            response.result = "ERROR";
            logger.warn("[PLUGIN] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {

                response.result = "ERROR";
                response.message = "Plugin does not exist in Iotronic!";
                logger.error("[PLUGIN] --> " + response.message);
                res.status(500).send(response);

            }
            else {

                pluginId = data.message[0].id;
                pluginName = data.message[0].name;

                //check if the plugin is still injected
                db.getInjectedPlugin(pluginId, board, function (data) {

                    if (data.result == "ERROR") {

                        response.message = data.message;
                        response.result = "ERROR";
                        logger.error("[PLUGIN] --> " + response.message);
                        res.status(500).send(response);

                    } else {

                        if(data.message.length == 0){

                            response.message = "Plugin '" + pluginName + "' already removed!";
                            response.result = "WARNING";
                            logger.warn("[PLUGIN] --> " + response.message);
                            res.status(200).send(response);

                        }else{

                            session_wamp.call('s4t.' + board + '.plugin.remove', [pluginName]).then(

                                function (rpc_remove) {

                                    if(rpc_remove.result == "SUCCESS"){

                                        db.deleteInjectedPlugin(board, pluginId, function (data_p) {

                                            if (data_p.result == "ERROR") {
                                                response.message = data_p.message;
                                                response.result = "ERROR";
                                                logger.warn("[PLUGIN] --> " + response.message);
                                                res.status(500).send(response);

                                            } else {

                                                response.result = "SUCCESS";
                                                response.message = rpc_remove.message;
                                                res.status(200).send(response);
                                                logger.info("[PLUGIN] --> " + response.message);

                                            }


                                        });

                                    }else{

                                        logger.warn("[PLUGIN] --> " + rpc_remove.message);
                                        res.status(200).send(rpc_remove);

                                    }

                                }

                            );


                        }


                    }


                });



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


plugin_utils.prototype.exportCommands = function (session){

    //Register all the module functions as WAMP RPCs
    logger.debug("[WAMP-EXPORTS] Plugins RPCs exposing:");

    session.register('s4t.iotronic.plugin.checksum', plugin_utils.prototype.getChecksum);
    logger.debug('[WAMP-EXPORTS] --> s4t.iotronic.checksum');

    session.register('s4t.iotronic.plugin.invalidPlugin', plugin_utils.prototype.invalidPlugin);
    logger.debug('[WAMP-EXPORTS] --> s4t.iotronic.invalidPlugin');

    logger.info('[WAMP-EXPORTS] Plugins RPCs exported to the cloud!');

};



module.exports = plugin_utils;
