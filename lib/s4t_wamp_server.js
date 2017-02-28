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


net_backend = 'iotronic' //neutron

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
var utility = require('./utility');
if (net_backend == 'iotronic') var net_utility = require('./net_utils');
else var net_utility = require('./net_neutron_utils');
//var measure_utility = require('./measure_utils');
var plugin_utility = require('./plugin_utils');
var driver_utility = require('./driver_utils');
var fs_utility = require('./fs_utils');


//GLOBAL VARIABLES
iotronic_status = "OK";
var db = new db_utils;
var ckan = new ckan_utils;
//var ckan_enabled = false;


s4t_wamp_server = function () {
}


s4t_wamp_server.prototype.start = function (restPort, wamp_router_url, wamp_realm) {

    var getIP = require('./getIP.js');
    var IPLocal = getIP(intr, 'IPv4');


    if (IPLocal != undefined) {


        var connection = new autobahn.Connection({
            url: wamp_router_url,
            realm: wamp_realm
        });

        if (net_backend == 'iotronic') {

            try {
                //IOTRONIC NETWORK DEVICE CREATION-------------------------------------------------------------

                logger.info("[NETWORK] - Iotronic network configuration starting...");
                var brgre_creation = spawn('ip', ['link', 'add', 'br-gre', 'type', 'bridge']);  //ip link add name br-gre type bridge
                logger.debug('[NETWORK] - GRE BRIDGE CREATION:  ip link add br-gre type bridge');

                brgre_creation.stdout.on('data', function (data) {
                    logger.debug('[NETWORK] - bridge creation stdout: ' + data);
                });
                brgre_creation.stderr.on('data', function (data) {

                    //RTNETLINK answers: File exists
                    logger.warn('[NETWORK] - bridge creation stderr: ' + data);
                });
                brgre_creation.on('close', function (code) {

                    logger.info("[NETWORK] - BRIDGE br-gre SUCCESSFULLY CREATED!");

                    //ip link set br-gre up
                    var brgre_up = spawn('ip', ['link', 'set', 'br-gre', 'up']);
                    logger.debug('[NETWORK] - GRE BRIDGE UP: ip link set br-gre up');

                    brgre_up.stdout.on('data', function (data) {
                        logger.debug('[NETWORK] - gre bridge up stdout: ' + data);
                    });
                    brgre_up.stderr.on('data', function (data) {
                        logger.error('[NETWORK] - gre bridge up stderr: ' + data);
                    });
                    brgre_up.on('close', function (code) {
                        logger.debug("[NETWORK] - BRIDGE br-gre UP!");
                        logger.info("[NETWORK] - GRE BRIDGE br-gre SUCCESSFULLY CONFIGURED!");
                    });
                    ;

                });

                //----------------------------------------------------------------------------------------------

            }
            catch (err) {

                logger.warn('[SYSTEM] - ' + err);

            }
        }


        connection.open();


        connection.onopen = function (session, details) {

            var net_utils = new net_utility(session);
            var utils = new utility(session);
            var plugin_utils = new plugin_utility(session);
            var driver_utils = new driver_utility(session);
            var fs_utils = new fs_utility(session);

            var rest = express();

            rest.use(bodyParser.json()); // support json encoded bodies
            rest.use(bodyParser.urlencoded({extended: true})); // support encoded bodies


            rest.get('/', function (req, res) {
                res.send('API: <br> http://' + IPLocal + ':' + restPort + '/   Welcome in Iotronic-standalone!');
            });



            // NODES APIs MANAGEMENT
            //---------------------------------------------------------------------------------------------------

            //get nodes list
            rest.get('/v1/nodes/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var list = [];
                var response = {
                    list: {}
                };

                db.getBoardsConnected(function (data) {
                    response.list = data;
                    res.send(JSON.stringify(response));
                    logger.debug("[SYSTEM] - Board list called.");
                });

            });

            //get node info
            rest.get('/v1/nodes/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;

                logger.debug("[SYSTEM] - Board info called!");

                db_utils.prototype.BoardInfo(node, function (result) {
                    res.send(result); //JSON.stringify(result));
                });


            });

            //create node
            rest.post('/v1/nodes/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                try {

                    logger.info("[SYSTEM] - NEW BOARD " + req.body.board_label + " (" + req.body.board + ") - REGISTRATION INFO:\n" + JSON.stringify(req.body, null, "\t"));

                    if(req.body.extra != undefined) {
                        var extra = JSON.parse(req.body.extra);
                        var ckan_enabled = extra.ckan_enabled;
                    }
                    else
                        logger.debug("[SYSTEM] --> No extra data.");



                    db.regBoard(req.body.board, req.body.board_label, req.body.latitude, req.body.longitude, req.body.altitude, req.body.net_enabled, req.body.sensorslist, function (db_result) {

                        var response = {
                            result: {},
                            message: ""
                        };


                        if (db_result["result"] === "SUCCESS") {

                            if (ckan_enabled === "true") {

                                logger.info("CKAN enabled registration: ");

                                /*
                                 ckan.CkanBoardRegistration(req.body.board, req.body.board_label, req.body.latitude, req.body.longitude, req.body.altitude, function (ckan_result) {

                                 response.result = db_result["message"] + " - " + ckan_result;
                                 res.send(JSON.stringify(response));

                                 });
                                 */
                                response.result = "CKAN TEST OK";
                                res.send(JSON.stringify(response));

                            }
                            else {

                                response.result = db_result["message"];
                                res.send(JSON.stringify(response));

                            }

                        } else {

                            response.result = db_result["message"];
                            res.send(JSON.stringify(response));

                        }


                    });
                }
                catch (err) {

                    var response = {
                        result: "ERROR",
                        message: err.toString()
                    };
                    logger.warn('[SYSTEM] - ' + err);
                    res.send(JSON.stringify(response));

                }

            });

            //update node
            rest.patch('/v1/nodes/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                logger.info("[SYSTEM] - BOARD " + req.body.board_label + " (" + req.body.board + ") UPDATING...");
                db.updateBoard(req.body.board, req.body.board_label, req.body.latitude, req.body.longitude, req.body.altitude, req.body.net_enabled, req.body.sensorlist, function (db_result) {

                    var response = {
                        result: {}
                    };
                    var position = {
                        "altitude": req.body.altitude,
                        "longitude": req.body.longitude,
                        "latitude": req.body.latitude
                    }

                    db.checkBoardConnected(req.body.board, function (check_result) {

                        var status = check_result[0].status;

                        if (status === "C") {

                            logger.debug('[SYSTEM] - RPC call towards: ' + req.body.board + '.command.setBoardPosition \n with parameters: ' + JSON.stringify(position));
                            session.call(req.body.board + '.command.setBoardPosition', [position]).then(
                                function (conf_result) {
                                    response.result = db_result + " - " + conf_result;
                                    res.send(JSON.stringify(response));
                                }
                                , session.log);

                        } else {
                            response.result = db_result + " - !!! WARNING - POSITION ON BOARD NOT UPDATED !!!";
                            res.send(JSON.stringify(response));
                        }

                    });


                });

            });

            //delete node
            rest.delete('/v1/nodes/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;

                logger.info("[SYSTEM] - UNREGISTERING NODE " + node + "...");
                db.unRegBoard(node, function (result) {

                    var response = {
                        result: {}
                    };
                    response.result = result;
                    res.send(JSON.stringify(response));

                });

            });

            //get sensors list
            rest.get('/v1/sensors/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var list = [];
                var response = {};

                db_utils.prototype.getSensorList(function (data) {
                    response = data;
                    res.send(JSON.stringify(response));
                    logger.debug("[SYSTEM] - Sensor list called.");
                });

            });


            // SERVICES APIsMANAGEMENT
            //---------------------------------------------------------------------------------------------------

            //start|stop service on node
            rest.post('/v1/services/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;
                var command = req.body.command; // ssh | tty | ideino | osjs
                var op = req.body.op;  // start | stop

                utils.exportService(node, command, op, res);

            });


            // GPIO APIs MANAGEMENT
            //---------------------------------------------------------------------------------------------------

            //set PIN mode
            rest.post('/v1/gpio/mode/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;
                var mode = req.body.mode;
                var pin = req.body.pin;

                logger.info("[GPIO] - MODE");
                var response = {
                    message: 'Set Mode',
                    result: {}
                };

                session.call(node + '.command.rpc.setmode', [pin, mode]).then(
                    function (result) {
                        response.error = result;
                        res.send(JSON.stringify(response));
                    }, session.log);

            });

            //read/write analog PIN
            rest.post('/v1/gpio/analog/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;
                var op = req.body.op;
                var value = req.body.value;
                var pin = req.body.pin;

                var response = {
                    message: '',
                    result: {}
                };

                if (op == "write") {
                    //DEBUG
                    logger.info('[GPIO] - ANALOG WRITE on node: ' + node + ' - pin ' + pin + ' with value ' + value);
                    response.message += ' Write';
                    session.call(node + '.command.rpc.write.analog', [node, "analog", pin, value]).then(
                        function (result) {
                            response.result = result;
                            res.send(JSON.stringify(response));
                        }, session.log);
                }
                else if (op == "read") {
                    //DEBUG message
                    logger.info('[GPIO] - ANALOG READ on node: ' + node + ' - pin ' + pin);
                    response.message += ' Read';
                    session.call(node + '.command.rpc.read.analog', [node, "analog", pin]).then(
                        function (result) {
                            response.result = result;
                            res.send(JSON.stringify(response));
                        }, session.log);
                }
                else {
                    var message = 'Wrong analog operation: ' + op + ' operation not supported!';
                    var result = 'ERROR';
                    logger.warn('[GPIO] - ' + message);
                    response.message = message;
                    response.result = result;
                    res.send(JSON.stringify(response));
                }

            });

            //read/write digital PIN
            rest.post('/v1/gpio/digital/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;
                var op = req.body.op;
                var value = req.body.value;
                var pin = req.body.pin;


                var response = {
                    message: '',
                    result: {}
                };

                if (op == "write") {
                    //DEBUG
                    logger.info('[GPIO] - DIGITAL WRITE on node: ' + node + ' - digital pin ' + pin + ' with value ' + value);
                    response.message += 'Write';
                    session.call(node + '.command.rpc.write.digital', [node, "digital", pin, value]).then(
                        function (result) {
                            response.result = result;
                            res.send(JSON.stringify(response));
                            //res.send("callback("+JSON.stringify(response)+")");  //JSONP callback
                        }, session.log);
                }
                else if (op == "read") {
                    //DEBUG Message
                    logger.info('[GPIO] - DIGITAL READ on node: ' + node + ' - digital pin ' + pin);
                    response.message += 'Read';
                    session.call(node + '.command.rpc.read.digital', [node, "digital", pin]).then(
                        function (result) {
                            response.result = result;
                            res.send(JSON.stringify(response));
                        }, session.log);
                }
                else {
                    var message = 'Wrong digital operation: ' + op + ' operation not supported!';
                    var result = 'ERROR';
                    logger.warn('[GPIO] - ' + message);
                    response.message = message;
                    response.result = result;
                    res.send(JSON.stringify(response));
                }

            });


            // PLUGINS APIs MANAGEMENT
            //---------------------------------------------------------------------------------------------------

            //get plugins list
            rest.get('/v1/plugins/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var list = [];
                var response = {};

                db_utils.prototype.getPluginList(function (data) {
                    response = data;
                    res.send(JSON.stringify(response));
                    logger.debug("[SYSTEM] - Plugin list called.");
                });

            });

            //create plugin in Iotronic
            rest.post('/v1/plugins/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var pluginname = req.body.pluginname;
                var plugincategory = req.body.plugincategory; // sync | async
                var pluginjsonschema = req.body.pluginjsonschema;
                var plugincode = req.body.plugincode;

                plugin_utils.createPlugin(pluginname, plugincategory, pluginjsonschema, plugincode, res);

            });

            //delete plugin from Iotronic
            rest.delete('/v1/plugins/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var pluginname = req.body.pluginname;
                plugin_utils.destroyPlugin(pluginname, res);

            });

            //inject plugin inside a node
            rest.put('/v1/plugins/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;
                var pluginname = req.body.pluginname;
                var autostart = req.body.autostart;

                plugin_utils.injectPlugin(node, pluginname, autostart, res);

            });

            //execute plugin operations on node
            rest.post('/v1/plugins/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;
                var pluginname = req.body.pluginname;
                var pluginjson = req.body.pluginjson;
                var pluginoperation = req.body.pluginoperation; // run | call | stop

                plugin_utils.managePlugins(node, pluginname, pluginjson, pluginoperation, res);

            });

            //remove plugin from node
            rest.delete('/v1/plugins/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;
                var pluginname = req.body.pluginname;

                plugin_utils.removePlugin(node, pluginname, res);

            });





            // DRIVER APIs MANAGEMENT
            //---------------------------------------------------------------------------------------------------

            //get drivers list
            rest.get('/v1/drivers/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var response = {};

                logger.debug("[SYSTEM] - Driver list called.");
                db_utils.prototype.getDriverList(function (data) {
                    response = data;
                    res.send(JSON.stringify(response, null, "\t"));

                });



            });

            //get drivers list on node
            rest.get('/v1/drivers/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;

                var response = {};

                logger.debug("[SYSTEM] - Driver list for the node " + node + " called.");
                db_utils.prototype.getBoardDriverList(node, function (data) {
                    response = data;
                    res.send(JSON.stringify(response, null, "\t"));

                });

            });

            //create driver in Iotronic
            rest.post('/v1/drivers/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var drivername = req.body.drivername;
                var driverjson = req.body.driverjson;
                var drivercode = req.body.drivercode;

                driver_utils.createDriver(drivername, driverjson, drivercode, res);

            });

            //delete driver from Iotronic
            rest.delete('/v1/drivers/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var drivername = req.body.drivername;

                driver_utils.destroyDriver(drivername, res);

            });

            //execute driver operations on node
            rest.post('/v1/drivers/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;
                var drivername = req.body.drivername;
                var remote_driver = req.body.remote_driver;
                var driveroperation = req.body.driveroperation; // mount | unmount
                var mirror_node = req.body.mirror_board;

                driver_utils.manageDrivers(node, drivername, driveroperation, remote_driver, mirror_node, res);

            });

            //inject driver inside a node
            rest.put('/v1/drivers/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;
                var drivername = req.body.drivername;
                var autostart = req.body.autostart;

                driver_utils.injectDriver(node, drivername, autostart, res);

            });

            //remove drivers from node
            rest.delete('/v1/drivers/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;
                var drivername = req.body.drivername;

                driver_utils.removeDriver(node, drivername, res);

            });

            //read driver files
            rest.post('/v1/drivers/:node/read', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;
                var drivername = req.body.drivername;
                var driver_exp_filename = req.body.driver_exp_filename;

                driver_utils.readRemoteFile(node, drivername, driver_exp_filename, res);

            });

            //write driver files
            rest.post('/v1/drivers/:node/write', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var node = req.params.node;
                var drivername = req.body.drivername;
                var driver_exp_filename = req.body.driver_exp_filename;
                var filecontent = req.body.filecontent;

                driver_utils.writeRemoteFile(node, drivername, driver_exp_filename, filecontent, res);

            });


            // VNET APIs MANAGEMENT
            //---------------------------------------------------------------------------------------------------

            //get vnets list
            rest.get('/v1/vnets/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                net_utils.showNetwork(res);



            });

            //create vnet in Iotronic
            rest.put('/v1/vnets/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var netname = req.body.netname;
                var value = req.body.value;

                net_utils.createNetwork(netname, value, res);

            });

            //delete driver from Iotronic
            rest.delete('/v1/vnets/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var netuuid = req.body.netuuid;

                net_utils.destroyNetwork(netuuid, res);

            });

            //show nodes in a vnet
            rest.get('/v1/vnets/:vnet', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var netuuid = req.params.vnet;

                net_utils.showBoards(netuuid, res);

            });

            //add node to vnet
            rest.post('/v1/vnets/:vnet/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var netuuid = req.params.vnet;
                var node = req.params.node;
                var value = req.body.value;
                var restore = "false";

                net_utils.addToNetwork(netuuid, node, value, res, restore);

            });

            //remove node from vnet
            rest.delete('/v1/vnets/:vnet/:node', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var netuuid = req.params.vnet;
                var node = req.params.node;

                net_utils.removeFromNetwork(netuuid, node, res);

            });











            rest.get('/command/', function (req, res) {

                var command = req.query.command;
                //var board = req.query.board;
                var value = req.query.val;
                var netuid = req.query.netuid;


                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                if (board != undefined) {

                    if (command == "active-net-board") {

                        logger.info("[NETWORK] - Activating network on board " + board + "...");

                        net_utils.activateBoardNetwork(board, res, "true");

                    }

                    else {

                        db.checkBoardConnected(board, function (data) {

                            if (data.length == 1) {

                                if (data[0].status == 'D') {
                                    //DEBUG
                                    logger.info("[SYSTEM] - Board state is Disconnected");
                                    var response = {
                                        error: {}
                                    };
                                    response.error = "Board state is Disconnected";
                                    res.send(JSON.stringify(response));

                                }
                                else {

                                    //logger.info("COMMAND REQUESTED: " + command);

                                    switch (command) {

                                        //FUSE_FS
                                        case 'mountfs':
                                            //http://---:8888/command/?command=mountfs&board=1111&mirror_board=2222&path_org=<PATH_ORG>&path_dest=<PATH_DEST>
                                            logger.debug("[REST] - mountfs: "+ board +" - "+ mirror_board +" - "+ path_org +" - "+ path_dest);
                                            fs_utils.mountfs(board, mirror_board, path_org, path_dest, res);
                                            break;

                                        case 'unmountfs':
                                            //http://---:8888/command/?command=unmountfs&board=1111&mirror_board=2222&path_dest=<PATH_DEST>
                                            logger.debug("[REST] - unmountfs: "+ board +" - "+ path_dest);
                                            fs_utils.unmountfs(board, path_dest, res);
                                            break;

                                        case 'remove-from-network':
                                            net_utils.removeFromNetwork(netuid, board, res);
                                            break;

                                        default:
                                            //DEBUG MESSAGE
                                            logger.warn("[SYSTEM] - The command specified (" + command + ") is not supported!");

                                            var response = {
                                                error: {}
                                            }
                                            response.error = 'ERROR COMMAND';
                                            res.send(JSON.stringify(response));
                                            break;


                                    }
                                }
                            }
                            else {
                                //DEBUG
                                logger.warn("[SYSTEM] - BOARD-ID DOESN'T exsist!");
                                var response = {
                                    error: {}
                                };
                                response.error = "BOARD-ID doesn't exsist!";
                                res.send(JSON.stringify(response));
                            }

                        });

                    }

                }

            });


            rest.get('/list/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');
                var list = [];
                var response = {
                    list: {}
                };

                db.getBoardsConnected(function (data) {
                    response.list = data;
                    res.send(JSON.stringify(response));
                    logger.debug("[SYSTEM] - Board list called.");
                });

            });

            rest.get('/sensorlist/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');
                var list = [];
                var response = {};

                db_utils.prototype.getSensorList(function (data) {
                    response = data;
                    res.send(JSON.stringify(response));
                    logger.debug("[SYSTEM] - Sensor list called.");
                });

            });

            rest.get('/pluginlist/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');
                var list = [];
                var response = {};

                db_utils.prototype.getPluginList(function (data) {
                    response = data;
                    res.send(JSON.stringify(response));
                    logger.debug("[SYSTEM] - Plugin list called.");
                });

            });

            rest.get('/driverlist/', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');
                var response = {};
                var board = req.query.board;

                if (board === undefined) {

                    logger.debug("[SYSTEM] - Driver list called.");
                    db_utils.prototype.getDriverList(function (data) {
                        response = data;
                        res.send(JSON.stringify(response, null, "\t"));

                    });

                } else {

                    logger.debug("[SYSTEM] - Driver list for the board " + board + " called.");
                    db_utils.prototype.getBoardDriverList(board, function (data) {
                        response = data;
                        res.send(JSON.stringify(response, null, "\t"));

                    });

                }

            });


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
            }


            // Publish, Subscribe, Call and Register
            var onBoardConnected = function (args) {


                if (args[1] == 'connection') {

                    db.checkBoard(args[0], function (data) {

                        //DEBUG
                        //logger.info("board_user::data.length::"+data.length);
                        if (data.length == 0) {

                            logger.warn("[MAIN] - A not authorized board has tried a connection to the cloud!");

                        }
                        else {

                            db.checkBoardConnected(args[0], function (data) {
                                //DEBUG
                                //logger.info("boards_connected::data.length"+data.length);
                                if (data.length == 0) {

                                    logger.info("[SYSTEM] - First Connection of the Board " + args[0]);
                                    db.insertBoard(args[0], args[2], 'C', function (result) {
                                        logger.debug("[SYSTEM] - Risultato della insert:::" + result);
                                    });

                                }
                                else {

                                    //logger.info("Not First Connection of the board"+args[0]);
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
                    //DEBUG
                    //console.log("length result"+data.length);
                    if (data.length == 1) {

                        var board = data[0].board_code;

                        db.changeBoardState(board, 'null', 'D', function (result) {

                            logger.info("[SYSTEM] - Board " + data[0].label + " (" + board + ") DISCONNECTED!");

                            db.removeAllServices(board, function (result) {
                            });


                            //NEWDB
                            db.updateSocatStatus(data[0].board_code, "noactive", function (data) {
                                logger.info("[NETWORK] - SOCAT status of board " + board + ": noactive");
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


        };


        connection.onclose = function (reason, details) {

            logger.info("[WAMP] - Connection close for::" + reason);
            logger.debug("[WAMP] - Connection close for::");
            logger.debug("[WAMP]\n - " + details);

        }


    } else {

        logger.error("[SYSTEM] - SERVER IP UNDEFINED: please specify a valid network interface in settings.json");

    }


};


module.exports = s4t_wamp_server;
