/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2014 2015 Andrea Rocco Lotronto, Arthur Warnier, Nicola Peditto
 */

nconf = require('nconf');


try {

    nconf.file({file: process.cwd() + '/lib/settings.json'});
    var intr = nconf.get('config:server:interface');
    var topic_command = nconf.get('config:wamp:topic_command');
    var topic_connection = nconf.get('config:wamp:topic_connection');

    // LOGGING CONFIGURATION --------------------------------------------------------------------
    log4js = require('log4js');
    log4js.loadAppender('file');

    logfile = nconf.get('config:server:log:logfile');		//log4js.addAppender(log4js.appenders.file('/var/log/s4t-iotronic.log'));  
    loglevel = nconf.get('config:server:log:loglevel');
    log4js.addAppender(log4js.appenders.file(logfile));

    //service logging configuration: "main"                                                  
    var logger = log4js.getLogger('main');


    /*
     OFF	nothing is logged
     FATAL	fatal errors are logged
     ERROR	errors are logged
     WARN	warnings are logged
     INFO	infos are logged
     DEBUG	debug infos are logged
     TRACE	traces are logged
     ALL	everything is logged
     */

    if (loglevel === undefined) {
        logger.setLevel('INFO');
        logger.warn('[SYSTEM] - LOG LEVEL not defined... default has been set: INFO');

    } else if (loglevel === "") {
        logger.setLevel('INFO');
        logger.warn('[SYSTEM] - LOG LEVEL not specified... default has been set: INFO');

    } else {

        logger.setLevel(loglevel);
        logger.info('[SYSTEM] - LOG LEVEL: ' + loglevel);

    }
    //------------------------------------------------------------------------------------------


}
catch (err) {
    // DEFAULT LOGGING
    logfile = './emergency-lightning-rod.log';
    log4js.addAppender(log4js.appenders.file(logfile));
    logger = log4js.getLogger('main');
    logger.error('[SYSTEM] - ' + err);
    process.exit();
}


logger.info('\n\n\n\n##################################\n Stack4Things Iotronic-Standalone\n##################################')


net_backend = 'iotronic'; //neutron

//IMPORT MODULES
var autobahn = require('autobahn');
var express = require('express');
var bodyParser = require('body-parser');
var ip = require('ip');
var uuid = require('uuid');
var Q = require("q");

//IMPORT Iotronic LIBRARIES
var ckan_utils = require('./ckan_db_utils');
var db_utils = require('./mysql_db_utils');
var plugin_utility = require('./plugin_utils');
var driver_utility = require('./driver_utils');
var vfs_utility = require('./vfs_utils');
var gpio_utility = require('./gpio_utils');
var node_utility = require('./node_utils');
var utility = require('./utility');

if (net_backend == 'iotronic')
    var net_utility = require('./net_utils');
else
    var net_utility = require('./net_neutron_utils');


//GLOBAL VARIABLES
iotronic_status = "OK";
var db = new db_utils;
IPLocal = utility.getIP(intr, 'IPv4');


s4t_wamp_server = function () {};


s4t_wamp_server.prototype.start = function (restPort, wamp_router_url, wamp_realm) {

    // Set up WAMP connection
    var connection = new autobahn.Connection({
        url: wamp_router_url,
        realm: wamp_realm
    });

    // Init Iotronic network devices
    if (net_backend == 'iotronic') {
        
        net_utility.initVNET();

    }
    
    // Connect to WAMP router
    connection.open();

    connection.onopen = function (session, details) {

        
        if (IPLocal != undefined) {

            // Start REST server
            var rest = express();

            rest.use(bodyParser.json()); // support json encoded bodies
            rest.use(bodyParser.urlencoded({extended: true})); // support encoded bodies

            rest.all('/*', function(req, res, next) {
                res.type('application/json');
                res.header("Access-Control-Allow-Origin", "*");
                res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PATCH, PUT');
                next();
            });

            rest.get('/', function (req, res) {
                res.send('API: <br> http://' + IPLocal + ':' + restPort + '/   Welcome in Iotronic-standalone!');
            });


            // Loading Iotronic-standalone modules
            var utils = new utility(session, rest);
            var node_utils = new node_utility(session, rest);
            var plugin_utils = new plugin_utility(session, rest);
            var driver_utils = new driver_utility(session, rest);
            var net_utils = new net_utility(session, rest);
            var vfs_utils = new vfs_utility(session, rest);
            var gpio_utils = new gpio_utility(session, rest);


            process.on('uncaughtException', function (err) {

                if (err.errno === 'EADDRINUSE') {

                    iotronic_status = "[SYSTEM] - FAULT - Express - EADDRINUSE";

                }

            });

            if (iotronic_status === "OK") {
                rest.listen(restPort);
                logger.info("[SYSTEM] - Server REST started on: http://" + IPLocal + ":" + restPort + " status " + iotronic_status);
                logger.info("[SYSTEM] - Connected to router WAMP!");
            }
            else {
                logger.error("[SYSTEM] - ERROR: " + iotronic_status);
                logger.info('Bye!');
                process.exit();
            }



            var onBoardConnected = function (args) {

                var board_id = args[0];
                var wamp_conn_status = args[1];
                var wamp_session = args[2];

                if (wamp_conn_status == 'connection') {

                    db.checkNode(board_id, function (data) {

                        if (data.length == 0) {
                            
                            // Node not registered in Iotronic

                            logger.warn("[SYSTEM] - A not authorized node has tried connecting to Iotronic!");

                            var response = {
                                message: 'Node with UUID '+board_id+' not authorized!',
                                result: 'REJECTED'
                            };

                            session.call(board_id + '.command.checkRegistrationStatus', [response]);
                            
                        }
                        else {
                            
                            // Node registered in Iotronic

                            db.changeNodeState(board_id, wamp_session, 'C', function (result) {

                                db.checkNodeConnected(board_id, function (data) {

                                    if (data.result == "ERROR") {
                                        response.result = data.result;
                                        response.message = "DB checkNodeConnected error for node " + node + ": " + data.message;
                                        logger.error("[SYSTEM] --> " + response.message);
                                        res.send(JSON.stringify(response));

                                    } else {

                                        var db_board_id = data.message[0].board_code;
                                        logger.info("[SYSTEM] - Node " + data.message[0].label + " (" + db_board_id + ") CONNECTED!");
                                        logger.debug("[WAMP] - Now the status of the node is:");
                                        logger.debug("[WAMP] --> node ID::" + db_board_id);
                                        logger.debug("[WAMP] --> session::" + data.message[0].session_id + " - status::" + data.message[0].status);

                                        //Input parameters: node_id - res = false - restore = false
                                        net_utils.activateBoardNetwork(db_board_id, "false", "false");
                                        
                                    }

         

                                });

                            });

                        }


                    });

                }
                else
                    logger.debug("[WAMP] - Node ("+board_id+") connection status:\n"+args)

            };

            //Subscribing to topic_connection
            session.subscribe(topic_connection, onBoardConnected);
            logger.info("[WAMP] - Subscribed to topic: " + topic_connection);


            // VLAN CONFIGURATION INJECTION AFTER RECONNECTION ON JOIN NODE---------------------------------------------------------------------------------
            var result_network_board = function (result) {

                var board_id = result[1];

                var response = {
                    message: '',
                    result: ''
                };
                
                var d = Q.defer();

                logger.info('[NETWORK] - Node ' + board_id + ' VNET result: ' + result[0]);
                
                if (net_backend == 'iotronic') {
                    
                    db.getNodeVLAN(board_id, function (data) {

                        if (data.message.length != 0) {

                            response.message = "Node " + board_id + " is connected to these VLANs: \n" + JSON.stringify(data.message, null, "\t");
                            response.result = "SUCCESS";
                            logger.info("[NETWORK] - "+response.message);

                            for (var i = 0; i < data.message.length; i++) {

                                (function (i) {

                                    net_utils.addToNetwork(data.message[i].net_uuid, board_id, data.message[i].ip_vlan, "false", "true");

                                    if ( i === (data.message.length - 1) ) {
                                        d.resolve(response);
                                    }

                                })(i);

                            }

                        } else {
                            response.message = "No VLAN for the node " + board_id;
                            response.result = "SUCCESS";
                            logger.info("[NETWORK] - "+response.message);
                            d.resolve(response);
                        }

                    });

                } else if (net_backend == 'neutron') {
                    db.getAllPorts(board_id, function (err, result_db) {
                        if (err) {

                            response.message = "Neutron getting ports FAILED: " + err;
                            response.result = "ERROR";
                            logger.error("[IOTRONIC DB] - "+response.message);
                            d.resolve(response);

                        } else if (result_db.length == 0) {
                            response.message = "No VLAN for the node " + board_id;
                            response.result = "SUCCESS";
                            logger.info("[NETWORK] - "+response.message);
                            d.resolve(response);
                        }
                        else {
                            for (var i = 0; i < result_db.length; i++) {

                                (function (i) {
                                    logger.debug("[NETWORK] - " + JSON.stringify(result_db[i], null, "\t"));
                                    net_utils.addToNetwork_restore(result_db[i].net_uuid, board_id, result_db[i].uuid, "false", "true");

                                    if ( i === (result_db.length - 1) ) {
                                        response.message = "Node " + board_id + " added to the VNETs!";
                                        response.result = "SUCCESS";
                                        d.resolve(response);
                                    }

                                })(i);

                            }
                        }
                    });

                }

                return d.promise;
            };

            session.register('iotronic.rpc.command.result_network_board', result_network_board);
            logger.info('[WAMP] - Registering iotronic command: iotronic.rpc.command.result_network_board');
            // ---------------------------------------------------------------------------------------------------------------------------------------------


            // PROVISIONING OF A NEW NODE-----------------------------------------------------------------------------------------------
            var Provisioning = function (result) {

                var node_id = result[0];
                var d = Q.defer();

                db.getNodePosition(node_id, function (node_position) {
                    logger.info('[SYSTEM] - NODE POSITION: ' + JSON.stringify(node_position) + ' PROVISIONING NODE RESPONSE: ' + result[0]);
                    d.resolve(node_position);
                });

                return d.promise;
            };

            session.register('s4t.board.provisioning', Provisioning);
            logger.info('[WAMP] - Registering s4t provisioning RPC: s4t.board.provisioning');
            // -------------------------------------------------------------------------------------------------------------------------


            var onLeave_function = function (session_id) {

                logger.debug("[WAMP] - SESSION closed with ID: " + session_id);

                db.findBySessionId(session_id, function (data) {

                    if (data.length == 1) {

                        var board = data[0].board_code;

                        db.changeNodeState(board, 'null', 'D', function (result) {

                            logger.info("[SYSTEM] - Node " + data[0].label + " (" + board + ") DISCONNECTED!");

                            db.removeAllServices(board, function (response) {
                                if(response.result == "ERROR")
                                    logger.error("[SYSTEM] - Error removing all active services: " +response.message);
                                else
                                    logger.debug("[SYSTEM] - Removed all active services!")
                            });
                            
                            db.updateSocatStatus(data[0].board_code, "noactive", function (data) {
                                if(response.result == "ERROR")
                                    logger.error("[NETWORK] - Error updating Socat status: " +response.message);
                                else
                                    logger.debug("[NETWORK] - Socat status of node " + board + " set to 'noactive' ");
                            });


                        });
                    }
                });
            };

            var onJoin_function = function (args) {
                logger.info("[WAMP] - WAMP ONJOIN:\n" + JSON.stringify(args, null, 4));
            };

            session.subscribe('wamp.session.on_join', onJoin_function);

            session.subscribe('wamp.session.on_leave', onLeave_function);


        } else {

            logger.error("[SYSTEM] - SERVER IP UNDEFINED: please specify a valid network interface in settings.json");
            logger.info('Bye!');
            process.exit();

        }


    };


    connection.onclose = function (reason, details) {
        logger.info("[WAMP] - Connection close for::" + reason);
        logger.debug("[WAMP] - Connection close for::");
        logger.debug("[WAMP]\n - " + details);
    }


};


module.exports = s4t_wamp_server;
