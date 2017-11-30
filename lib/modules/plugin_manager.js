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
     *     summary: get plugin details
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: A Json IoTronic response
     *         schema:
     *           type: object
     *           properties:
     *             result:
     *               type: object
     *             message:
     *               type: string
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
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
     *        description: The IoTronic plugin NAME
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
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
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
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
     *        description: The IoTronic plugin NAME
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
     */
    rest.get('/v1/boards/:board/plugins/:plugin', function (req, res) {

        logger.info("[API] - Board plugin details - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;
        var pluginname = req.params.plugin;

        plugin_utils.getBoardPluginDetails(board, pluginname, res);

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
     *                  - plugin_name
     *                  - plugin_category
     *                  - plugin_json_schema
     *                  - plugin_code
     *              properties:
     *                  plugin_name:
     *                      type: string
     *                  plugin_category:
     *                      type: string
     *                      description: "possible values: 'async' or 'sync'"
     *                  plugin_json_schema:
     *                      type: string
     *                      description: "plugin inputs in JSON format"
     *                  plugin_code:
     *                      type: string
     *                      description: "NodeJS plugin code"
     *     responses:
     *       200:
     *         description: A Json IoTronic response
     *         schema:
     *           $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     */
    rest.post('/v1/plugins/', function (req, res) {

        logger.info("[API] - Create plugin - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);
        
        var pluginname = req.body.plugin_name;
        var plugincategory = req.body.plugin_category; // sync | async
        var pluginjsonschema = req.body.plugin_json_schema;
        var plugincode = req.body.plugin_code;

        var APIparamsList= {"plugin_name":pluginname, "plugin_category":plugincategory, "plugin_json_schema":pluginjsonschema, "plugin_code":plugincode};

        board_utility.checkDefInputs(APIparamsList, function (check){

            if(check.result == "ERROR"){

                res.status(500).send(check);

            }else {

                board_utility.checkRestInputs(req, function (check){

                    if(check.result == "ERROR"){
                        res.status(500).send(check);

                    }else {

                        plugin_utils.createPlugin(pluginname, plugincategory, pluginjsonschema, plugincode, res);

                    }

                });

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
     *        description: The IoTronic plugin NAME
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     */
    rest.delete('/v1/plugins/:plugin', function (req, res) {

        logger.info("[API] - Destroy plugin - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var pluginname = req.params.plugin;
        
        plugin_utils.destroyPlugin(pluginname, res);
        

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
     *          description: The IoTronic board ID
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
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     */
    rest.put('/v1/boards/:board/plugins', function (req, res) {

        logger.info("[API] - Inject plugin - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var pluginname = req.body.plugin;
                var onboot = req.body.onboot;

                var APIparamsList= {"plugin":pluginname, "onboot":onboot};

                board_utility.checkDefInputs(APIparamsList, function (check){

                    if(check.result == "ERROR"){

                        res.status(500).send(check);

                    }else {

                        board_utility.checkRestInputs(req, function (check){

                            if(check.result == "ERROR"){
                                res.status(500).send(check);

                            }else {

                                plugin_utils.injectPlugin(board, pluginname, onboot, res);

                            }

                        });

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
     *        description: The IoTronic plugin NAME
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
     *                  - plugin_operation
     *              properties:
     *                  plugin_json:
     *                      type: string
     *                      description: "plugin inputs in JSON format"
     *                  plugin_operation:
     *                      type: string
     *                      description: "possible values:\n
     *                      - for 'async' plugins: 'run', 'kill'\n
     *                      - for 'sync' plugins: 'call'\n
     *                      - for both plugin types: 'restart'
     *                      "
     *     responses:
     *       200:
     *         description: A Json IoTronic response
     *         schema:
     *           $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     */
    rest.post('/v1/boards/:board/plugins/:plugin', function (req, res) {

        var board = req.params.board;

        logger.info("[API] - Plugin Operation - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);
        
        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                //var pluginname = req.body.pluginname;
                var pluginname = req.params.plugin;

                var pluginjson = req.body.plugin_json; //OPTIONAL: start only
                var plugin_operation = req.body.plugin_operation; // run | call | stop

                //var APIparamsList= {"pluginname":pluginname, "pluginjson":pluginjson, "plugin_operation":plugin_operation};
                var APIparamsList= {"plugin_operation":plugin_operation};

                board_utility.checkDefInputs(APIparamsList, function (check){

                    if(check.result == "ERROR"){

                        res.status(500).send(check);

                    }else {

                        board_utility.checkRestInputs(req, function (check){

                            if(check.result == "ERROR"){

                                res.status(500).send(check);

                            }else {

                                logger.info("[PLUGIN] - Plugin operation on board "+ board +": " + plugin_operation + " plugin '" + pluginname +"'");

                                plugin_utils.managePlugins(board, pluginname, pluginjson, plugin_operation, res);
                            }

                        });

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
     *        description: The IoTronic plugin NAME
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

    logger.debug("[REST-EXPORT] - Plugin's APIs exposed!");



};


plugin_utils.prototype.createPlugin = function (pluginname, plugincategory, pluginjsonschema, plugincode, res) {

    logger.info("[PLUGIN] - CREATING plugin " + pluginname + "...");

    var response = {
        message: '',
        result: ''
    };

    if (plugincategory != "sync" && plugincategory != "async"){

        response.message = "Plugin category '" + plugincategory + "' is not supported: [ 'sync' | 'async' ]";
        response.result = "ERROR";
        logger.error("[PLUGIN] --> " + response.message);
        res.status(500).send(response);

    }else{

        try{

            JSON.parse(pluginjsonschema);
            
            var plugin_folder = PLUGINS_STORE + pluginname;

            var fileNamePlugin = plugin_folder + "/" + pluginname + '.js';
            var fileNameSchema = plugin_folder + "/" + pluginname + '.json';

            // Check plugin folder
            if ( fs.existsSync(plugin_folder) === false ){

                // plugin folder creation
                fs.mkdir(plugin_folder, function() {

                    db.getPlugin(pluginname, function (data) {

                        if (data.result == "ERROR") {

                            response.message = data.message;
                            response.result = "ERROR";
                            logger.warn("[PLUGIN] --> " + response.message);
                            res.status(500).send(response);

                        } else {

                            if (data.message[0] === undefined) {

                                db.insertCreatedPlugin(pluginname, plugincategory, fileNameSchema, fileNamePlugin, function (result_db) {

                                    if (result_db.result == "ERROR") {
                                        
                                        logger.error("[PLUGIN] --> createPlugin - DB write error: " + result_db.message);
                                        response.message = result_db.message;
                                        response.result = "ERROR";
                                        res.status(500).send(response);

                                    } else {

                                        logger.debug("[PLUGIN] --> DB successfully updated: " + JSON.stringify(result_db.message));

                                        fs.writeFile(fileNamePlugin, plugincode, function (err) {
                                            if (err) {
                                                response.message = "Error writing plugin " + pluginname + " code: " + err;
                                                response.result = "ERROR";
                                                logger.error("[PLUGIN] --> " +response.message);
                                                res.status(500).send(response);

                                            } else {

                                                logger.debug("[PLUGIN] --> Plugin " + fileNamePlugin + " successfully created!");

                                                fs.writeFile(fileNameSchema, pluginjsonschema, function (err) {
                                                    if (err) {
                                                        response.message = "Error writing plugin schema " + pluginname + " conf: " + err;
                                                        response.result = "ERROR";
                                                        logger.error("[PLUGIN] --> " +response.message);
                                                        res.status(500).send(response);

                                                    } else {
                                                        logger.debug("[PLUGIN] --> Schema " + fileNameSchema + " successfully created!");

                                                        response.message = "Plugin " + pluginname + " successfully created in Iotronic!";
                                                        response.result = "SUCCESS";
                                                        logger.info("[PLUGIN] --> " +response.message);
                                                        res.status(200).send(response);

                                                    }
                                                });

                                            }
                                        });

                                    }

                                });



                            }
                            else {

                                response.message = "Plugin " + pluginname + " already exist!";
                                response.result = "ERROR";
                                logger.warn("[PLUGIN] --> " + response.message);
                                res.status(500).send(response);

                            }

                        }

                    });

                });


            } else{

                response.result = "ERROR";
                response.message = "ERROR: "+pluginname+" plugin's files already injected! - Remove the previous plugin's data!";
                logger.warn('[PLUGIN] --> ' + response.message);
                res.status(500).send(response);

            }
            

        }
        catch (err) {
            response.message = "Plugin config is not a JSON: " + err;
            response.result = "ERROR";
            logger.error("[PLUGIN] --> " + response.message);
            res.status(500).send(response);
        }
        

    }
    

};


plugin_utils.prototype.destroyPlugin = function (pluginname, res) {

    logger.info("[PLUGIN] - Removing plugin " + pluginname + " from Iotronic...");

    var response = {
        message: '',
        result: ''
    };

    db.getPlugin(pluginname, function (data) {

        if (data.result == "ERROR") {
            response.message = data.message;
            response.result = "ERROR";
            logger.warn("[PLUGIN] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {
                response.message = "Plugin " + pluginname + " does not exist!";
                response.result = "ERROR";
                logger.warn("[PLUGIN] --> " + response.message);
                res.status(500).send(response);
                
            }
            else {

                var plugin_folder = PLUGINS_STORE + pluginname;

                var fileNamePlugin = plugin_folder + "/" + pluginname + '.js';
                var fileNameSchema = plugin_folder + "/" + pluginname + '.json';

                db.deletePlugin(pluginname, function (result_db) {

                    if (result_db.result == "ERROR") {
                        logger.warn("[PLUGIN] --> Delete DB error: " + result_db.message);
                        response.message = result_db.message;
                        response.result = "ERROR";
                        res.status(500).send(response);

                    } else {
                        
                        if ( fs.existsSync(plugin_folder) === true ) {

                            deleteFolderRecursive(plugin_folder);		//delete plugin files folder

                            delete_response = "Plugin " + pluginname + " successfully removed from Iotronic!!";
                            logger.info("[PLUGIN] --> " + delete_response);
                            response.message = delete_response;
                            response.result = "SUCCESS";
                            res.status(200).send(response);
                            
                        } else{

                            delete_response = "Plugin "+pluginname+" data not found!";
                            logger.error("[PLUGIN] --> " + delete_response);
                            response.message = delete_response;
                            response.result = "ERROR";
                            res.status(500).send(response);

                        }


                    }

                });


            }

        }



    });

};


plugin_utils.prototype.injectPlugin = function (board, pluginname, autostart, res) {

    logger.info("[PLUGIN] - Injecting plugin " + pluginname + " into the board " + board + "...");

    var response = {
        message: '',
        result: ''
    };

    var pluginId;
    var pluginName;
    var pluginFileName;

    //I need to read the name of the plugin from the DB
    db.getPlugin(pluginname, function (data) {

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

                pluginId = data.message[0].id;
                pluginName = data.message[0].name;
                pluginFileName = data.message[0].code;

                //check if the plugin is still injected
                db.getInjectedPlugin(pluginId, board, function (data) {

                    if (data.result == "ERROR") {

                        response.message = data.message;
                        response.result = "ERROR";
                        logger.error("[PLUGIN] --> " + response.message);
                        res.status(500).send(response);

                    } else {

                        if (data.message.length == 0) {

                            fs.readFile(pluginFileName, 'utf8', function (err, data) {

                                if (err) {
                                    response.message = "Error reading " + pluginFileName + ": " + err;
                                    response.result = "ERROR";
                                    logger.warn("[PLUGIN] --> " + response.message);
                                    res.status(500).send(response);

                                } else {

                                    logger.debug("[PLUGIN] --> Plugin " + pluginFileName + " read successfully");

                                    var pluginCode = data;

                                    logger.debug('[PLUGIN] --> Calling injectplugin RPC with name = ' + pluginName + " onboot = " + autostart + " code = " + pluginCode);

                                    //Now I can perform the RPC call
                                    session_wamp.call('s4t.'+ board + '.plugin.inject', [pluginName, pluginCode, autostart]).then(

                                        function (rpc_response) {

                                            if(rpc_response.result == "ERROR"){
                                                response.message = "INJECT plugin " + pluginName + " failed: "+rpc_response.message;
                                                response.result = "ERROR";
                                                logger.error("[PLUGIN] --> " + response.message);
                                                res.status(500).send(response);

                                            }
                                            else{

                                                db.getInjectedPlugin(pluginId, board, function (data_p) {

                                                    if (data_p.result == "ERROR") {

                                                        response.message = data_p.message;
                                                        response.result = "ERROR";
                                                        logger.warn("[PLUGIN] --> " + response.message);
                                                        res.status(500).send(response);

                                                    } else {

                                                        if (data_p[0] === undefined) {

                                                            //Now I can write to the DB that the plugin has been injected
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

                                                        } else {

                                                            logger.warn("[PLUGIN] --> Plugin " + pluginName+" already injected! Updating...");

                                                            db.updatePluginStatus(board, pluginName, "injected", function (out) {
                                                                if(out.result=="ERROR"){
                                                                    response.message = "Plugin " + pluginName + " updating error: "+out.message;
                                                                    response.result = "ERROR";
                                                                    logger.error("[PLUGIN] ----> " + response.message);
                                                                    res.status(500).send(response);
                                                                }else{
                                                                    response.message = "Plugin " + pluginName+" successfully injected (updated)!";
                                                                    response.result = "SUCCESS";
                                                                    logger.info("[PLUGIN] ----> " + response.message);
                                                                    res.status(200).send(response);
                                                                }

                                                            });


                                                        }

                                                    }



                                                });
                                            }




                                        }, session_wamp.log);


                                }
                            });

                        } else {

                            response.message = "Plugin " + pluginName + " already injected!";
                            response.result = "WARNING";
                            logger.warn("[PLUGIN] --> " + response.message);
                            res.status(200).send(response);


                        }

                    }

                });








            }
        }


    });
};


plugin_utils.prototype.managePlugins = function (board, pluginname, pluginjson, plugin_operation, res) {


    db.getPlugin(pluginname, function (data) {
        
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


                try {

                    if(plugin_operation != "kill" && plugin_operation != "restart")
                        JSON.parse(pluginjson);

                    switch (plugin_operation) {

                        case 'run':

                            logger.debug("[PLUGIN] - STARTING ASYNC PLUGIN \"" + pluginname + "\"...");

                            if (pluginjson === "") {
                                response.message = "WARNING - ASYNC PLUGIN \"" + pluginname + "\" has not parameters!";
                                response.result = "ERROR";
                                logger.warn("[PLUGIN] --> " + response.message);
                                res.status(500).send(response);
                            }
                            else {

                                logger.debug("[PLUGIN] --> Plugin \"" + pluginname + "\" parameters:\n " + pluginjson);

                                //I need to read the category of the plugin from the DB
                                db.getPluginCategory(pluginname, function (data) {

                                    if (data.result == "ERROR") {
                                        response.message = data.message;
                                        response.result = "ERROR";
                                        logger.warn("[PLUGIN] --> " + response.message);
                                        res.status(500).send(response);

                                    } else {

                                        var plugincategory = data.message[0].category;
                                        logger.debug("[PLUGIN] --> Plugin category: " + plugincategory);

                                        if (plugincategory === "async") {

                                            session_wamp.call('s4t.'+ board + '.plugin.run', [pluginname, pluginjson]).then(

                                                function (rpc_response) {
                                                    if (rpc_response.result == "ERROR") {

                                                        response.message = rpc_response.message;
                                                        response.result = "ERROR";
                                                        res.status(500).send(response);
                                                        logger.error("[PLUGIN] --> RUNNING RESULT for \"" + pluginname + "\": " + response.message);

                                                    }else if (rpc_response.result == "SUCCESS"){

                                                        response.message = rpc_response.message;
                                                        response.result = "SUCCESS";
                                                        res.status(200).send(response);
                                                        logger.info("[PLUGIN] --> RUNNING RESULT for \"" + pluginname + "\": " + response.message);

                                                        db.updatePluginStatus(board, pluginname, "running", function (out) {
                                                            logger.debug("[PLUGIN] ----> " + out.message);
                                                        });

                                                    }else {
                                                        response.message = rpc_response.message;
                                                        response.result = rpc_response.result;
                                                        res.status(500).send(response);
                                                        logger.warn("[PLUGIN] --> RUNNING RESULT for \"" + pluginname + "\": " + response.message);

                                                    }


                                                });

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

                            logger.debug("[PLUGIN] - STARTING SYNC PLUGIN \"" + pluginname + "\"...");

                            if (pluginjson === "") {
                                response.message = "WARNING - SYNC PLUGIN \"" + pluginname + "\" has not parameters!";
                                response.result = "ERROR";
                                logger.warn("[PLUGIN] --> " + response.message);
                                res.status(500).send(response);

                            }
                            else {

                                logger.debug("[PLUGIN] --> Plugin \"" + pluginname + "\" parameters:\n " + pluginjson);

                                //I need to read the category of the plugin from the DB
                                db.getPluginCategory(pluginname, function (data) {

                                    var plugincategory = data.message[0].category;
                                    logger.debug("[PLUGIN] --> Plugin category: " + plugincategory);

                                    if (plugincategory === "sync") {

                                        session_wamp.call('s4t.'+ board + '.plugin.call', [pluginname, pluginjson], {}, {receive_progress: true}).then(
                                            function (result) {
                                                response.message = result;
                                                response.result = "SUCCESS";
                                                res.status(200).send(response);
                                                logger.info("[PLUGIN] --> RUNNING RESULT for \"" + pluginname + "\":\n" + result);

                                                db.updatePluginStatus(board, pluginname, "executed", function (out) {
                                                    logger.debug("[PLUGIN] ----> " + out.message);
                                                });

                                            },
                                            function (error) {

                                                response.message = error;
                                                response.result = "ERROR";
                                                res.status(500).send(response);
                                                logger.error("[PLUGIN] --> Plugin \"" + pluginname + "\" error: " + JSON.stringify(error));

                                                db.updatePluginStatus(board, pluginname, "failed", function (out) {
                                                    logger.error("[PLUGIN] ----> " + out.message);
                                                });

                                            },
                                            function (progress) {
                                                logger.debug("[PLUGIN] --> Plugin \"" + pluginname + "\" progress: " + JSON.stringify(progress));
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

                            logger.debug("[PLUGIN] - KILLING PLUGIN \"" + pluginname + "\"...");

                            session_wamp.call('s4t.'+ board + '.plugin.kill', [pluginname]).then(

                                function (rpc_response) {

                                    if (rpc_response.result == "ERROR") {

                                        response.message = rpc_response.message;
                                        response.result = "ERROR";
                                        res.status(500).send(response);
                                        logger.warn("[PLUGIN] --> KILL RESULT for \"" + pluginname + "\": " + response.message);

                                    }else{
                                        response.message = rpc_response.message;
                                        response.result = rpc_response.result;
                                        res.status(200).send(response);
                                        logger.info("[PLUGIN] --> KILL RESULT for \"" + pluginname + "\": " + response.message);

                                        db.updatePluginStatus(board, pluginname, "killed", function (out) {
                                            logger.debug("[PLUGIN] ----> " + out.message);
                                        });

                                    }

                                }, session_wamp.log);

                            break;

                        case 'restart':

                            logger.debug("[PLUGIN] - RESTARTING PLUGIN \"" + pluginname + "\"...");

                            session_wamp.call('s4t.'+ board + '.plugin.restart', [pluginname]).then(

                                function (rpc_response) {

                                    if (rpc_response.result == "ERROR") {

                                        response.message = rpc_response.message;
                                        response.result = "ERROR";
                                        res.status(500).send(response);
                                        logger.warn("[PLUGIN] --> RESTART RESULT for \"" + pluginname + "\": " + response.message);

                                    }else{

                                        response.message = rpc_response.message;
                                        response.result = rpc_response.result;
                                        res.status(200).send(response);
                                        logger.info("[PLUGIN] --> RESTART RESULT for \"" + pluginname + "\": " + response.message);

                                        db.updatePluginStatus(board, pluginname, "restarted", function (out) {
                                            logger.debug("[PLUGIN] ----> " + out.message);
                                        });

                                    }

                                }, session_wamp.log);

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


plugin_utils.prototype.removePlugin = function (board, pluginname, res) {

    logger.info('[PLUGIN] - REMOVING plugin ' + pluginname + " from board " + board);

    var response = {
        message: '',
        result: ''
    };

    var pluginId;
    var pluginName;
    
    db.getPlugin(pluginname, function (data) {

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

                            response.message = "Plugin "+pluginName+" already removed!";
                            response.result = "WARNING";
                            logger.warn("[PLUGIN] --> " + response.message);
                            res.status(200).send(response);

                        }else{

                            session_wamp.call('s4t.' + board + '.plugin.remove', [pluginName]).then(

                                function (result) {

                                    if (result === "Plugin files not found!") {

                                        result = "No plugin in the selected board -> DB updated!";

                                    } else {

                                        db.deleteInjectedPlugin(board, pluginId, function (data_p) {

                                            if (data_p.result == "ERROR") {
                                                response.message = data_p.message;
                                                response.result = "ERROR";
                                                logger.warn("[PLUGIN] --> " + response.message);
                                                res.status(500).send(response);

                                            } else {

                                                response.result = "SUCCESS";
                                                response.message = "DELETE RESULT: " + result;
                                                res.status(200).send(response);
                                                logger.info("[PLUGIN] --> " + response.message + " - " + data_p);
                                                
                                            }
             

                                        });

                                    }


                                }, session_wamp.log);


                        }





                    }


                });



            }

        }


    });
};


plugin_utils.prototype.getBoardPluginDetails = function (board, pluginname, res) {

    var response = {
        message: '',
        result: ''
    };

    logger.debug("[PLUGIN] - Plugin "+pluginname+" details on board " + board);

    //I need to read the name of the plugin from the DB
    db.getPlugin(pluginname, function (data) {

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
                        response.message = data.message;
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


module.exports = plugin_utils;
