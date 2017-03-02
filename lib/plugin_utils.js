/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2014 2015 Francesco Longo, Nicola Peditto
 */


//service logging configuration: "plugin_utils"   
var logger = log4js.getLogger('plugin_utils');
logger.setLevel(loglevel);

var fs = require('fs');

var db_utils = require('./mysql_db_utils');
var db = new db_utils;
var node_utility = require('./node_utils');

var session_wamp;

plugin_utils = function (session, rest) {

    session_wamp = session;

    // PLUGIN MANAGEMENTS APIs
    //---------------------------------------------------------------------------------------------------

    //get plugins list
    rest.get('/v1/plugins/', function (req, res) {

        var response = {};

        db_utils.prototype.getPluginList(function (data) {
            response = data;
            res.send(JSON.stringify(response));
            logger.debug("[SYSTEM] - Plugin list called.");
        });

    });

    //create plugin in Iotronic
    rest.post('/v1/plugins/', function (req, res) {

        var pluginname = req.body.pluginname;
        var plugincategory = req.body.plugincategory; // sync | async
        var pluginjsonschema = req.body.pluginjsonschema;
        var plugincode = req.body.plugincode;

        plugin_utils.prototype.createPlugin(pluginname, plugincategory, pluginjsonschema, plugincode, res);

    });

    //delete plugin from Iotronic
    rest.delete('/v1/plugins/:plugin', function (req, res) {

        var pluginname = req.params.plugin;
        plugin_utils.prototype.destroyPlugin(pluginname, res);

    });

    //get plugins list inside a node
    rest.get('/v1/plugins/:node', function (req, res) {

        var node = req.params.node;

        logger.debug("[API] - Plugins list on node "+ node +" called.");

        var response = {
            message: '',
            result: ''
        };

        node_utility.checkNodeAvailable(node, res, function (available){

            if(available == true){

                db_utils.prototype.NodePlugins(node, function (data) {


                    if(data.result=="ERROR"){
                        response.message = data.message;
                        response.result = "ERROR";
                        logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                        res.send(JSON.stringify(response));
                    }else{
                        response.message = data.message;
                        response.result = "SUCCESS";
                        res.send(JSON.stringify(response));
                    }

                });

            }

        });


    });

    //inject plugin inside a node
    rest.put('/v1/plugins/:node', function (req, res) {

        var node = req.params.node;
        var pluginname = req.body.pluginname;
        var autostart = req.body.autostart;

        node_utility.checkNodeAvailable(node, res, function (available){

            if(available == true){

                plugin_utils.prototype.injectPlugin(node, pluginname, autostart, res);

            }

        });

        

    });

    //execute plugin operations on node
    rest.post('/v1/plugins/:node', function (req, res) {

        var node = req.params.node;
        var pluginname = req.body.pluginname;
        var pluginjson = req.body.pluginjson;
        var pluginoperation = req.body.pluginoperation; // run | call | stop

        logger.debug("[API] - Plugin operation on node "+ node +" called.");

        node_utility.checkNodeAvailable(node, res, function (available){

            if(available == true){

                plugin_utils.prototype.managePlugins(node, pluginname, pluginjson, pluginoperation, res);

            }

        });

        

    });

    //remove plugin from node
    rest.delete('/v1/plugins/:plugin/:node', function (req, res) {

        var node = req.params.node;
        var plugin = req.params.plugin;

        node_utility.checkNodeAvailable(node, res, function (available){

            if(available == true){

                plugin_utils.prototype.removePlugin(node, plugin, res);

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

    var fileNamePlugin = './plugins/' + pluginname + '.js';
    var fileNameSchema = './schemas/' + pluginname + '.json';

    db.insertCreatedPlugin(pluginname, plugincategory, fileNameSchema, fileNamePlugin, function (result_db) {

        if (result_db.result == "ERROR") {
            logger.error("[PLUGIN] --> createPlugin - DB write error: " + result_db.message);
            response.message = result_db.message;
            response.result = "ERROR";
            res.send(response);

        } else {

            logger.debug("[PLUGIN] --> DB successfully updated: " + JSON.stringify(result_db.message));


            fs.writeFile(fileNamePlugin, plugincode, function (err) {
                if (err) {
                    response.message = "Error writing plugin " + pluginname + " code: " + err;
                    response.result = "ERROR";
                    logger.error("[PLUGIN] --> " +response.message);
                    res.send(JSON.stringify(response));

                } else {
                    logger.debug("[PLUGIN] --> Plugin " + fileNamePlugin + " successfully created!");

                    fs.writeFile(fileNameSchema, pluginjsonschema, function (err) {
                        if (err) {
                            response.message = "Error writing plugin schema " + pluginname + " conf: " + err;
                            response.result = "ERROR";
                            logger.error("[PLUGIN] --> " +response.message);
                            res.send(JSON.stringify(response));

                        } else {
                            logger.debug("[PLUGIN] --> Schema " + fileNameSchema + " successfully created!");

                            response.message = "Plugin " + pluginname + " successfully created in Iotronic!";
                            response.result = "SUCCESS";
                            logger.info("[PLUGIN] --> " +response.message);
                            res.send(JSON.stringify(response));

                        }
                    });

                }
            });

        }

    });

};

plugin_utils.prototype.destroyPlugin = function (pluginname, res) {

    logger.info("[PLUGIN] - REMOVING plugin " + pluginname + " from Iotronic...");

    var response = {
        message: '',
        result: ''
    };

    db.getPlugin(pluginname, function (data) {

        if (data[0] === undefined) {
            response.message = "Plugin " + pluginname + " does not exist!";
            response.result = "ERROR";
            logger.warn("[PLUGIN] --> " + response.message);
            res.send(JSON.stringify(response));
        }
        else {

            var fileNamePlugin = './plugins/' + pluginname + '.js';
            var fileNameSchema = './schemas/' + pluginname + '.json';

            db.deletePlugin(pluginname, function (result_db) {

                if (result_db.result == "ERROR") {
                    logger.warn("[PLUGIN] --> Delete DB error: " + result_db.message);
                    response.message = result_db.message;
                    response.result = "ERROR";
                    res.send(response);

                } else {

                    fs.unlink(fileNamePlugin, function (err) {
                        if (err) {
                            delete_response = "Plugin code " + fileNamePlugin + " removing FAILED: " + err;
                            logger.warn("[PLUGIN] --> " + delete_response);
                        }
                        else {
                            logger.debug("[PLUGIN] --> " + fileNamePlugin + " successfully deleted!");
                        }

                        fs.unlink(fileNameSchema, function (err) {

                            if (err) {
                                delete_response = "Plugin schema " + fileNameSchema + " removing FAILED: " + err;
                                logger.warn("[PLUGIN] --> " + delete_response);
                            }
                            else {

                                logger.debug("[PLUGIN] --> " + fileNameSchema + " successfully deleted!");
                                logger.info("[PLUGIN] --> Plugin " + pluginname + " successfully removed from Iotronic!");

                            }

                            delete_response = "Plugin " + pluginname + " successfully removed from Iotronic!!";
                            response.message = delete_response;
                            response.result = "SUCCESS";
                            res.send(JSON.stringify(response));

                        });


                    });


                }

            });


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

        if (data[0] === undefined) {
            response.message = "Plugin does not exist in Iotronic!";
            response.result = "ERROR";
            logger.warn("[PLUGIN] --> " + response.message);
            res.send(JSON.stringify(response));
        }
        else {

            pluginId = data[0].id;
            pluginName = data[0].name;
            pluginFileName = data[0].code;

            fs.readFile(pluginFileName, 'utf8', function (err, data) {

                if (err) {
                    response.message = "Error reading " + pluginFileName + ": " + err;
                    response.result = "ERROR";
                    logger.warn("[PLUGIN] --> " + response.message);
                    res.send(JSON.stringify(response));

                } else {

                    logger.debug("[PLUGIN] --> Plugin " + pluginFileName + " read successfully");

                    var pluginCode = data;

                    logger.debug('[PLUGIN] --> Calling injectplugin RPC with name = ' + pluginName + " autostart = " + autostart + " code = " + pluginCode);

                    //Now I can perform the RPC call
                    session_wamp.call(board + '.command.rpc.injectplugin', [pluginName, pluginCode, autostart]).then(

                        function (rpc_response) {

                            if(rpc_response.result == "ERROR"){
                                response.message = "INJECT plugin " + pluginName + " failed: "+rpc_response.message;
                                response.result = "ERROR";
                                logger.error("[PLUGIN] --> " + response.message);
                                res.send(JSON.stringify(response));
                            }
                            else{
                                
                                db.getInjectedPlugin(pluginId, board, function (data_p) {

                                    if (data_p[0] === undefined) {
                                        //Now I can write to the DB that the plugin has been injected
                                        db.insertInjectedPlugin(board, pluginName, function (out) {

                                            if(out.result=="ERROR"){
                                                response.message = "Plugin " + pluginName + " injection failed: "+out.message;
                                                response.result = "ERROR";
                                                logger.error("[PLUGIN] --> " + response.message);
                                                res.send(JSON.stringify(response));
                                            }else{
                                                response.message = "Plugin " + pluginName + " successfully injected!";
                                                response.result = "SUCCESS";
                                                logger.info("[PLUGIN] --> " + response.message);
                                                res.send(JSON.stringify(response));
                                            }

                                        });

                                    } else {
                                        logger.warn("[PLUGIN] --> Plugin " + pluginName+" already injected! Updating...");

                                        db.updatePluginStatus(board, pluginName, "injected", function (out) {
                                            if(out.result=="ERROR"){
                                                response.message = "Plugin " + pluginName + " updating error: "+out.message;
                                                response.result = "ERROR";
                                                logger.error("[PLUGIN] ----> " + response.message);
                                                res.send(JSON.stringify(response));
                                            }else{
                                                response.message = "Plugin " + pluginName+" successfully injected (updated)!";
                                                response.result = "SUCCESS";
                                                logger.info("[PLUGIN] ----> " + response.message);
                                                res.send(JSON.stringify(response));
                                            }

                                        });
                                    }

                                });
                            }




                        }, session_wamp.log);


                }
            });


        }
    });
};

plugin_utils.prototype.managePlugins = function (board, pluginname, pluginjson, pluginoperation, res) {
    

    db.getPlugin(pluginname, function (data) {

        var response = {
            message: '',
            result: ''
        };

        if (data[0] === undefined) {

            response.result = "ERROR";
            response.message = "Plugin does not exist in Iotronic!";
            res.send(JSON.stringify(response));
            logger.warn("[PLUGIN] --> " + response.message);

        }
        else {

            switch (pluginoperation) {

                case 'run':

                    logger.info("[PLUGIN] - STARTING ASYNC PLUGIN \"" + pluginname + "\"...");

                    if (pluginjson === "") {
                        response.message = "WARNING - ASYNC PLUGIN \"" + pluginname + "\" has not parameters!";
                        response.result = "ERROR";
                        logger.warn("[PLUGIN] --> " + response.message);
                        res.send(JSON.stringify(response));
                    }
                    else {

                        logger.info("[PLUGIN] --> Plugin \"" + pluginname + "\" parameters:\n " + pluginjson);

                        //I need to read the category of the plugin from the DB
                        db.getPluginCategory(pluginname, function (data) {

                            var plugincategory = data[0].category;
                            logger.info("[PLUGIN] --> Plugin category: " + plugincategory);

                            if (plugincategory === "async") {

                                session_wamp.call(board + '.command.rpc.plugin.run', [pluginname, pluginjson]).then(
                                    function (rpc_response) {
                                        if (rpc_response.result == "ERROR") {

                                            response.message = rpc_response.message;
                                            response.result = "ERROR";
                                            res.send(JSON.stringify(response));
                                            logger.error("[PLUGIN] --> RUNNING RESULT for \"" + pluginname + "\": " + response.message);

                                        }else if (rpc_response.result == "SUCCESS"){

                                            response.message = rpc_response.message;
                                            response.result = "SUCCESS";
                                            res.send(JSON.stringify(response));
                                            logger.info("[PLUGIN] --> RUNNING RESULT for \"" + pluginname + "\": " + response.message);

                                            db.updatePluginStatus(board, pluginname, "running", function (out) {
                                                logger.debug("[PLUGIN] ----> " + out.message);
                                            });

                                        }else {
                                            response.message = rpc_response.message;
                                            response.result = rpc_response.result;
                                            res.send(JSON.stringify(response));
                                            logger.warn("[PLUGIN] --> RUNNING RESULT for \"" + pluginname + "\": " + response.message);

                                        }


                                    });

                            } else {
                                response.message = "Operation 'run' not supported for this plugin category!";
                                response.result = "ERROR";
                                res.send(JSON.stringify(response));
                                logger.warn("[PLUGIN] ----> " + response.message);
                            }

                        });

                    }

                    break;


                case 'call':

                    logger.info("[PLUGIN] - STARTING SYNC PLUGIN \"" + pluginname + "\"...");

                    if (pluginjson === "") {
                        response.message = "WARNING - SYNC PLUGIN \"" + pluginname + "\" has not parameters!";
                        response.result = "ERROR";
                        logger.warn("[PLUGIN] --> " + response.message);
                        res.send(JSON.stringify(response));

                    }
                    else {

                        logger.info("[PLUGIN] --> Plugin \"" + pluginname + "\" parameters:\n " + pluginjson);

                        //I need to read the category of the plugin from the DB
                        db.getPluginCategory(pluginname, function (data) {

                            var plugincategory = data[0].category;
                            logger.info("[PLUGIN] --> Plugin category: " + plugincategory);

                            if (plugincategory === "sync") {

                                session_wamp.call(board + '.command.rpc.plugin.call', [pluginname, pluginjson], {}, {receive_progress: true}).then(
                                    function (result) {
                                        response.message = result;
                                        response.result = "SUCCESS";
                                        res.send(JSON.stringify(response));
                                        logger.info("[PLUGIN] --> RUNNING RESULT for \"" + pluginname + "\":\n" + result);

                                        db.updatePluginStatus(board, pluginname, "executed", function (out) {
                                            logger.debug("[PLUGIN] ----> " + out.message);
                                        });

                                    },
                                    function (error) {

                                        response.message = error;
                                        response.result = "ERROR";
                                        res.send(JSON.stringify(response));
                                        logger.error("[PLUGIN] --> Plugin \"" + pluginname + "\" error: " + JSON.stringify(error));

                                        db.updatePluginStatus(board, pluginname, "failed", function (out) {
                                            logger.error("[PLUGIN] ----> " + out.message);
                                        });

                                    },
                                    function (progress) {
                                        logger.info("[PLUGIN] --> Plugin \"" + pluginname + "\" progress: " + JSON.stringify(progress));
                                    }
                                );

                            } else {
                                response.message = "Operation 'call' not supported for this plugin category!";
                                response.result = "ERROR";
                                res.send(JSON.stringify(response));
                                logger.warn("[PLUGIN] ----> " + response.message);
                            }
                        });


                    }

                    break;


                case 'kill':

                    logger.info("[PLUGIN] - KILLING PLUGIN \"" + pluginname + "\"...");

                    session_wamp.call(board + '.command.rpc.plugin.kill', [pluginname]).then(

                        function (rpc_response) {

                            if (rpc_response.result == "ERROR") {

                                response.message = rpc_response.message;
                                response.result = "ERROR";
                                res.send(JSON.stringify(response));
                                logger.error("[PLUGIN] --> KILL RESULT for \"" + pluginname + "\": " + response.message);

                            }else{
                                response.message = rpc_response.message;
                                response.result = rpc_response.result;
                                res.send(JSON.stringify(response));
                                logger.info("[PLUGIN] --> KILL RESULT for \"" + pluginname + "\": " + response.message);

                                db.updatePluginStatus(board, pluginname, "killed", function (out) {
                                    logger.info("[PLUGIN] ----> " + out.message);
                                });

                            }

                        }, session_wamp.log);

                    break;

                default:

                    var response = {
                        message: "",
                        result: ""
                    };
                    response.message = "Plugin operation '" + pluginoperation + "' not supported!";
                    response.result = 'ERROR';
                    logger.error("[PLUGIN] - " + response.message);
                    res.send(JSON.stringify(response));

                    break;


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

        if (data[0] === undefined) {

            response.result = "ERROR";
            response.message = "Plugin does not exist in Iotronic!";
            res.send(JSON.stringify(response));
            logger.warn("[PLUGIN] --> " + response.message);

        }
        else {

            pluginId = data[0].id;
            pluginName = data[0].name;

            session_wamp.call(board + '.command.rpc.removeplugin', [pluginName]).then(
                function (result) {

                    if (result === "Plugin files not found!") {

                        result = "No plugin in the selected board -> DB updated!";

                    } else {

                        db.deleteInjectedPlugin(board, pluginId, function (data_p) {
                            response.result = "SUCCESS";
                            response.message = "DELETE RESULT: " + result;
                            res.send(JSON.stringify(response));
                            logger.info("[PLUGIN] --> " + response.message + " - " + data_p);
                            
                        });

                    }


                }, session_wamp.log);


        }
    });
};


module.exports = plugin_utils;
