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
var spawn = require('child_process').spawn;
var uuid = require('uuid');
var Q = require("q");

//IMPORT LIBRARIES
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
var ckan = new ckan_utils;
var IPLocal = utility.getIP(intr, 'IPv4');



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
                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');
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


            // Publish, Subscribe, Call and Register
            var onBoardConnected = function (args) {


                if (args[1] == 'connection') {

                    db.checkBoard(args[0], function (data) {

                        if (data.length == 0) {

                            logger.warn("[SYSTEM] - A not authorized board has tried a connection to the cloud!");

                        }
                        else {

                            db.checkBoardConnected(args[0], function (data) {

                                if (data.length == 0) {

                                    logger.info("[SYSTEM] - First Connection of the Board " + args[0]);
                                    db.insertBoard(args[0], args[2], 'C', function (result) {
                                        logger.debug("[SYSTEM] - Risultato della insert:::" + result);
                                    });

                                }
                                else {

                                    db.changeBoardState(args[0], args[2], 'C', function (result) {

                                        db.checkBoardConnected(args[0], function (data) {

                                            var db_board_id = data[0].board_code;
                                            logger.info("[SYSTEM] - Board " + data[0].label + " (" + db_board_id + ") CONNECTED!");
                                            logger.debug("[WAMP] - Now the status of the board is:");
                                            logger.debug("[WAMP] --> board_code::" + db_board_id);
                                            logger.debug("[WAMP] --> session::" + data[0].session_id + " - status::" + data[0].status);

                                            //NETWORK CONFIGURATION FOR NET-ENABLED BOARDS
                                            net_utils.activateBoardNetwork(db_board_id, "false", "false");

                                        });

                                    });

                                }

                            });

                        }


                    });

                }

            };

            //Subscribing to topic_connection
            session.subscribe(topic_connection, onBoardConnected);
            logger.info("[WAMP] - Subscribed to topic: " + topic_connection);


            // VLAN CONFIGURATION INJECTION AFTER RECONNECTION ON JOIN BOARD---------------------------------------------------------------------------------
            var result_network_board = function (result) {
                var board_id = result[1];
                logger.info('[NETWORK] - BOARD ' + board_id + ' NETWORK RESULT: ' + result[0]);
                if (net_backend == 'iotronic') {


                    db.getBoardVLAN(board_id, function (data) {

                        if (data.message.length != 0) {

                            logger.info("[NETWORK] - Board " + board_id + " is connected to these VLANs: \n" + JSON.stringify(data.message, null, "\t"));

                            for (var i = 0; i < data.message.length; i++) {

                                (function (i) {

                                    net_utils.addToNetwork(data.message[i].net_uuid, board_id, data.message[i].ip_vlan, "false", "true");

                                })(i);

                            }

                        } else {
                            logger.info("[NETWORK] - NO VLAN for the board " + board_id);
                        }

                    });

                } else if (net_backend == 'neutron') {
                    db.getAllPorts(board_id, function (err, result_db) {
                        if (err) {
                            logger.error("[IOTRONIC DB] - getting Ports FAILED: " + err);

                        } else if (result_db.length == 0) {
                            logger.info("[NETWORK] - NO LAN for the board " + board_id);
                        }
                        else {
                            for (var i = 0; i < result_db.length; i++) {

                                (function (i) {
                                    logger.debug("[NETWORK] - " + JSON.stringify(result_db[i], null, "\t"));
                                    net_utils.addToNetwork_restore(result_db[i].net_uuid, board_id, result_db[i].uuid, "false", "true");

                                })(i);

                            }
                        }
                    });

                }

                return "OK from Iotronic!";
            };

            session.register('iotronic.rpc.command.result_network_board', result_network_board);
            logger.info('[WAMP] - Registering iotronic command: iotronic.rpc.command.result_network_board');
            // ---------------------------------------------------------------------------------------------------------------------------------------------


            // PROVISIONING OF A NEW BOARD-----------------------------------------------------------------------------------------------
            var Provisioning = function (result) {

                var board_id = result[0];
                var d = Q.defer();

                db.getBoardPosition(board_id, function (board_position) {

                    logger.info('[SYSTEM] - BOARD POSITION: ' + JSON.stringify(board_position) + ' PROVISIONING BOARD RESPONSE: ' + result[0]);

                    d.resolve(board_position);

                });

                return d.promise;
            };

            session.register('s4t.board.provisioning', Provisioning);
            logger.info('[WAMP] - Registering s4t provisioning RPC: s4t.board.provisioning');
            // -------------------------------------------------------------------------------------------------------------------------


            var onLeave_function = function (session_id) {

                logger.debug("[WAMP] - SESSION closed with code: " + session_id);

                db.findBySessionId(session_id, function (data) {

                    if (data.length == 1) {

                        var board = data[0].board_code;

                        db.changeBoardState(board, 'null', 'D', function (result) {

                            logger.info("[SYSTEM] - Board " + data[0].label + " (" + board + ") DISCONNECTED!");

                            db.removeAllServices(board, function (result) {});
                            
                            db.updateSocatStatus(data[0].board_code, "noactive", function (data) {
                                logger.debug("[NETWORK] - SOCAT status of board " + board + ": noactive");
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
