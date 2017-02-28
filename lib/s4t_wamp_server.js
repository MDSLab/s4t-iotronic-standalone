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

            var rest = express();

            rest.use(bodyParser.json()); // support json encoded bodies
            rest.use(bodyParser.urlencoded({extended: true})); // support encoded bodies

            rest.get('/', function (req, res) {
                res.send('API: <br> http://' + IPLocal + ':' + restPort + '/   Welcome in Iotronic-standalone!');
            });



            // NODES APIs MANAGEMENT
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
            rest.get('/v1/nodes/:board', function (req, res) {

                board = req.params.board;

                logger.info('/node/ -> ', board);

                logger.debug("[SYSTEM] - Board info called!");

                db_utils.prototype.BoardInfo(board, function (result) {
                    res.send(result); //JSON.stringify(result));
                });


            });

            //create node
            rest.post('/v1/nodes/', function (req, res) {

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
            rest.delete('/v1/nodes/:board', function (req, res) {

                board = req.params.board;

                logger.info("[SYSTEM] - UNREGISTERING BOARD " + board + "...");
                db.unRegBoard(board, function (result) {

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
            //start|stop service on node
            rest.post('/v1/services/:board', function (req, res) {

                var board = req.params.board;
                var command = req.body.command; // ssh | tty | ideino | osjs
                var op = req.body.op;  // start | stop

                utils.exportService(board, command, op, res);

            });


            // GPIO APIs MANAGEMENT
            //set PIN mode
            rest.post('/v1/gpio/mode/:board', function (req, res) {

                var board = req.params.board;
                var mode = req.body.mode;
                var pin = req.body.pin;

                logger.info("[GPIO] - MODE");
                var response = {
                    message: 'Set Mode',
                    result: {}
                };

                session.call(board + '.command.rpc.setmode', [pin, mode]).then(
                    function (result) {
                        response.error = result;
                        res.send(JSON.stringify(response));
                    }, session.log);

            });

            //read/write analog PIN
            rest.post('/v1/gpio/analog/:board', function (req, res) {

                var board = req.params.board;
                var op = req.body.op;
                var value = req.body.value;
                var pin = req.body.pin;

                var response = {
                    message: '',
                    result: {}
                };

                if (op == "write") {
                    //DEBUG
                    logger.info('[GPIO] - ANALOG WRITE on board: ' + board + ' - pin ' + pin + ' with value ' + value);
                    response.message += ' Write';
                    session.call(board + '.command.rpc.write.analog', [board, "analog", pin, value]).then(
                        function (result) {
                            response.result = result;
                            res.send(JSON.stringify(response));
                        }, session.log);
                }
                else if (op == "read") {
                    //DEBUG message
                    logger.info('[GPIO] - ANALOG READ on board: ' + board + ' - pin ' + pin);
                    response.message += ' Read';
                    session.call(board + '.command.rpc.read.analog', [board, "analog", pin]).then(
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
            rest.post('/v1/gpio/digital/:board', function (req, res) {

                var board = req.params.board;
                var op = req.body.op;
                var value = req.body.value;
                var pin = req.body.pin;


                var response = {
                    message: '',
                    result: {}
                };

                if (op == "write") {
                    //DEBUG
                    logger.info('[GPIO] - DIGITAL WRITE on board: ' + board + ' - digital pin ' + pin + ' with value ' + value);
                    response.message += 'Write';
                    session.call(board + '.command.rpc.write.digital', [board, "digital", pin, value]).then(
                        function (result) {
                            response.result = result;
                            res.send(JSON.stringify(response));
                            //res.send("callback("+JSON.stringify(response)+")");  //JSONP callback
                        }, session.log);
                }
                else if (op == "read") {
                    //DEBUG Message
                    logger.info('[GPIO] - DIGITAL READ on board: ' + board + ' - digital pin ' + pin);
                    response.message += 'Read';
                    session.call(board + '.command.rpc.read.digital', [board, "digital", pin]).then(
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

                var pluginname = req.body.pluginname;
                var plugincategory = req.body.plugincategory; // sync | async
                var pluginjsonschema = req.body.pluginjsonschema;
                var plugincode = req.body.plugincode;

                plugin_utils.createPlugin(pluginname, plugincategory, pluginjsonschema, plugincode, res);

            });

            //delete plugin from Iotronic
            rest.delete('/v1/plugins/', function (req, res) {

                var pluginname = req.body.pluginname;
                plugin_utils.destroyPlugin(pluginname, res);

            });

            //inject plugin inside a node
            rest.put('/v1/plugins/:board', function (req, res) {

                var board = req.params.board;
                var pluginname = req.body.pluginname;
                var autostart = req.body.autostart;

                plugin_utils.injectPlugin(board, pluginname, autostart, res);

            });

            //execute plugin operations on node
            rest.post('/v1/plugins/:board', function (req, res) {

                var board = req.params.board;
                var pluginname = req.body.pluginname;
                var pluginjson = req.body.pluginjson;
                var pluginoperation = req.body.pluginoperation; // run | call | stop

                plugin_utils.managePlugins(board, pluginname, pluginjson, pluginoperation, res);

            });

            //remove plugin from node
            rest.delete('/v1/plugins/:board', function (req, res) {

                var board = req.params.board;
                var pluginname = req.body.pluginname;

                plugin_utils.removePlugin(board, pluginname, res);

            });


            // DRIVER APIs MANAGEMENT
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

            //get drivers list on board
            rest.get('/v1/drivers/:board', function (req, res) {

                res.type('application/json');
                res.header('Access-Control-Allow-Origin', '*');

                var board = req.params.board;

                var response = {};

                logger.debug("[SYSTEM] - Driver list for the board " + board + " called.");
                db_utils.prototype.getBoardDriverList(board, function (data) {
                    response = data;
                    res.send(JSON.stringify(response, null, "\t"));

                });

            });

            //create driver in Iotronic
            rest.post('/v1/drivers/', function (req, res) {

                var drivername = req.body.drivername;
                var driverjson = req.body.driverjson;
                var drivercode = req.body.drivercode;

                driver_utils.createDriver(drivername, driverjson, drivercode, res);

            });

            //delete driver from Iotronic
            rest.delete('/v1/drivers/', function (req, res) {

                var drivername = req.body.drivername;
                driver_utils.destroyDriver(drivername, res);

            });

            //execute driver operations on node
            rest.post('/v1/drivers/:board', function (req, res) {

                var board = req.params.board;
                var drivername = req.body.drivername;
                var remote_driver = req.body.remote_driver;
                var driveroperation = req.body.driveroperation; // mount | unmount
                var mirror_board = req.body.mirror_board;

                driver_utils.manageDrivers(board, drivername, driveroperation, remote_driver, mirror_board, res);

            });

            //inject driver inside a node
            rest.put('/v1/drivers/:board', function (req, res) {

                var board = req.params.board;
                var drivername = req.body.drivername;
                var autostart = req.body.autostart;

                driver_utils.injectDriver(board, drivername, autostart, res);

            });

            //remove drivers from node
            rest.delete('/v1/drivers/:board', function (req, res) {

                var board = req.params.board;
                var drivername = req.body.drivername;

                driver_utils.removeDriver(board, drivername, res);

            });

            // VFS APIs MANAGEMENT


            rest.get('/command/', function (req, res) {

                var command = req.query.command;
                var board = req.query.board;
                var pin = req.query.pin;
                var mode = req.query.mode;
                var value = req.query.val;
                var op = req.query.op;
                var netname = req.query.netname;
                var netuid = req.query.netuid;
                var pluginname = req.query.pluginname;
                var plugincategory = req.query.plugincategory;
                var pluginjsonschema = req.query.pluginjsonschema;
                var pluginjson = req.query.pluginjson;
                var pluginoperation = req.query.pluginoperation;
                var plugincode = req.query.plugincode;
                var readplugin = req.query.readplugin;
                var elaborateplugin = req.query.elaborateplugin;
                var autostart = req.query.autostart;
                var latitude = req.query.latitude;
                var longitude = req.query.longitude;
                var altitude = req.query.altitude;
                var sensorlist = req.query.sensorlist;
                var net_enabled = req.query.net_enabled;
                var board_label = req.query.board_label;

                //DRIVER variables
                var drivername = req.query.drivername;
                var driveroperation = req.query.driveroperation;
                var driverjson = req.query.driverjson;
                var drivercode = req.query.drivercode;
                //Remote driver variables
                var driver_exp_filename = req.query.filename;
                var remote_driver = req.query.remote_driver;
                var mirror_board = req.query.mirror_board;
                var filecontent = req.query.filecontent;


                var ckan_enabled = req.query.ckan_enabled;

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


                                        case 'readdriverfile':
                                            //http://---:8888/command/?command=readdriverfile&board=14144545&drivername=temp_driver&filename=temperature
                                            //logger.debug("[REST] - readdriverfile: "+ board +" - "+ drivername +" - "+ driver_exp_filename);
                                            driver_utils.readRemoteFile(board, drivername, driver_exp_filename, res);
                                            break

                                        case 'writedriverfile':
                                            //http://---:8888/command/?command=writedriverfile&board=14144545&drivername=temp_driver&filename=temperature&filecontent="AAA"
                                            //logger.debug("[REST] - writedriverfile: "+ board +" - "+ drivername +" - "+ driver_exp_filename +" - content: "+ filecontent);
                                            driver_utils.writeRemoteFile(board, drivername, driver_exp_filename, filecontent, res);
                                            break


                                        case 'add-to-network':
                                            net_utils.addToNetwork(netuid, board, value, res, "false");
                                            break

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
                                }
                                response.error = "BOARD-ID doesn't exsist!";
                                res.send(JSON.stringify(response));
                            }

                        });

                    }

                }
                else {


                    switch (command) {




                        case 'create-network':
                            net_utils.createNetwork(netname, value, res);
                            break;

                        case 'update-network':
                            net_utils.updateNetwork(netname, netuid, value, res);
                            break;

                        case 'destroy-network':
                            net_utils.destroyNetwork(netuid, res);
                            break;

                        case 'show-network':
                            net_utils.showNetwork(res);
                            break;

                        case 'show-boards':
                            net_utils.showBoards(netuid, res);
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

            }

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
            }
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
            }

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
            }


            var onJoin_function = function (args) {

                logger.info("[WAMP] - WAMP ONJOIN:\n" + JSON.stringify(args, null, 4));

            }

            session.subscribe('wamp.session.on_join', onJoin_function);

            session.subscribe('wamp.session.on_leave', onLeave_function);

        }


        connection.onclose = function (reason, details) {

            logger.info("[WAMP] - Connection close for::" + reason);
            logger.debug("[WAMP] - Connection close for::");
            logger.debug("[WAMP]\n - " + details);

        }


    } else {

        logger.error("[SYSTEM] - SERVER IP UNDEFINED: please specify a valid network interface in settings.json");

    }


}


module.exports = s4t_wamp_server;
