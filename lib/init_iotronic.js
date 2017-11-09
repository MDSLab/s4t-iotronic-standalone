//###############################################################################
//##
//# Copyright (C) 2017 Nicola Peditto
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

var Q = require("q");

//GLOBAL VARIABLES
IotronicHome = process.env.IOTRONIC_HOME;
boards_disconnected = {};
net_backend = 'iotronic'; //neutron
iotronic_status = "OK";
server_rest = null;
server_rest_port = null;
iotronic_session = null;

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// LOGGING CONFIGURATION
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
try {

    nconf.file({file: IotronicHome + '/settings.json'});

    log4js.loadAppender('file');
    logfile = nconf.get('config:server:log:logfile');
    loglevel = nconf.get('config:server:log:loglevel');
    log4js.addAppender(log4js.appenders.file(logfile));

    var logger = log4js.getLogger('init');
    var log_result = null;

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
        log_result = '[SYSTEM] - LOG LEVEL not defined... default has been set: INFO';

    } else if (loglevel === "") {
        logger.setLevel('INFO');
        log_result = '[SYSTEM] - LOG LEVEL not specified... default has been set: INFO';

    } else {
        logger.setLevel(loglevel);
        log_result = '[SYSTEM] - LOG LEVEL: ' + loglevel;
    }

    logger.info(
        '\n\n' +
        '##################################\n ' +
        'Stack4Things Iotronic-Standalone' +
        '\n##################################'
    );
    logger.info("[SYSTEM] - IoTronic Home: " + IotronicHome);
    logger.debug(log_result);
    //------------------------------------------------------------------------------------------


}
catch (err) {
    // DEFAULT LOGGING
    logfile = IotronicHome + '/emergency-lightning-rod.log';
    log4js.addAppender(log4js.appenders.file(logfile));
    logger = log4js.getLogger('main');
    logger.error('[SYSTEM] - ' + err);
    process.exit();
}
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


var initIoTronicModules = function() {

    logger.info("[SYSTEM] - IoTronic initialization started...");

    var response = {
        message: '',
        result: ''
    };

    // IoTronic catching exceptions
    process.on('uncaughtException', function (err) {

        console.log(err);

        if (err.errno === 'EADDRINUSE') {

            iotronic_status = "FAULT - Express - EADDRINUSE - Port: " + err.port;
            // Exit from IoTronic if there are errors caught
            logger.error("[SYSTEM] - ERROR: " + iotronic_status);
            logger.info('Bye!');
            process.exit();

        }

    });

    // Load settings
    intr = nconf.get('config:server:interface');
    topic_connection = nconf.get('config:wamp:topic_connection');
    https_enable = nconf.get('config:server:https:enable');
    https_port = nconf.get('config:server:https:port');
    https_key = nconf.get('config:server:https:key');
    https_cert = nconf.get('config:server:https:cert');
    encryptKey = nconf.get('config:server:auth:encryptKey');
    auth_backend = nconf.get('config:server:auth:backend');
    docs_enabled = nconf.get('config:server:docs');


    // INIT IoTronic modules
    db_utils = require('./management/mng_db');
    plugin_utility = require('./modules/plugin_manager');
    driver_utility = require('./modules/driver_manager');
    vfs_utility = require('./modules/vfs_manager');
    gpio_utility = require('./modules/gpio_manager');
    board_utility = require('./management/mng_board');
    utility = require('./management/utility');
    service_utility = require('./modules/service_manager');
    layout_utility = require('./management/mng_layout');
    project_utility = require('./management/mng_project');
    user_utility = require('./management/mng_user');
    auth_utility = require('./management/mng_auth');
    notify = require('./management/mng_notify');
    docs = require('./management/mng_docs');
    wamp = require('./management/mng_wamp');


    if (net_backend == 'iotronic')
        net_utility = require('./modules/vnet_iotronic_manager');
    else
        net_utility = require('./modules/vnet_neutron_manager');


    //Loading
    db = new db_utils;
    IPLocal = utility.getIP(intr, 'IPv4');

    // Init Iotronic network devices
    if (net_backend == 'iotronic') {

        net_utility.initVNET();

    }else{
        logger.warn("[SYSTEM] - IoTronic does not support this network backend: " + net_backend)
    }

    // CHECK WSTUN PROCESS STATUS
    utility.checkProcessName('node', 'wstun',
        function (response) {
            if(response.message.command == 'wstun'){
                if(response.result == "SUCCESS") {

                    logger.info("[SYSTEM] - WSTUN status: " + response.message.log);


                }
                else {
                    logger.error("[SYSTEM] - WSTUN status: " + response.message.log);
                }
            }

        }

    );


};

var loadIoTronicModules = function(session, rest) {

    logger.info("[SYSTEM] - IoTronic modules loading...")
    
    // Loading IoTronic modules
    board_utils = new board_utility(session, rest);
    plugin_utils = new plugin_utility(session, rest);
    driver_utils = new driver_utility(session, rest);
    net_utils = new net_utility(session, rest);
    vfs_utils = new vfs_utility(session, rest);
    gpio_utils = new gpio_utility(session, rest);
    services_utils = new service_utility(session, rest);
    layouts_utils = new layout_utility(session, rest);
    projects_utils = new project_utility(session, rest);
    users_utils = new user_utility(session, rest);
    
};


//Subscribe IoTronic to topic_connection
var subscribeTopics = function(session, topic_connection, onBoardConnected) {
    session.subscribe(topic_connection, onBoardConnected);
    logger.info("[WAMP] - Subscribed to topic: " + topic_connection);
    session.publish(topic_connection, ['Iotronic-connected', session._id]);
};


var mngRpcRegister = function(session){

    // CHECK IF IOTRONIC IS ALIVE-------------------------------------------------------------------------------------------------------------------
    var isAlive = function (result) {

        var board_id = result[0];

        var response = {
            message: 'Response for '+board_id +': IoTronic is alive!',
            result: 'SUCCESS'
        };

        return response;

    };
    logger.info('[SYSTEM] - Registering RPC: s4t.iotronic.isAlive');
    session.register('s4t.iotronic.isAlive', isAlive);
    // ---------------------------------------------------------------------------------------------------------------------------------------------


    // BOARD SERVICES RESTORE ON CONNECTION---------------------------------------------------------------------------------------------------------
    var restore_board_services = function (result) {

        var board_id = result[0];

        var response = {
            message: '',
            result: ''
        };

        var d = Q.defer();

        // Get service tunnels for the connected board
        db.getBoardServices(board_id, function (data) {

            if (data.result == "ERROR") {

                logger.error("[SERVICE] --> " + data.message);

            } else {

                if(data.message.length == 0){

                    response.message = "No services to restore for the board " + board_id;
                    response.result = "SUCCESS";
                    logger.info("[SERVICE] --> "+response.message);
                    d.resolve(response);
                }


                else{

                    logger.info("[SERVICE] - RELOAD BOARD SERVICE TUNNELS:\n"+ JSON.stringify(data.message, null, "\t"));

                    for(var key=0; key < data.message.length; key++) {

                        (function(key) {

                            services_utils.manageService(board_id, null, data.message[key].service_id, "restore", false);

                            if (key == data.message.length - 1) {

                                response.message = "Restoring process for the board "+board_id+" started...";
                                response.result = "SUCCESS";
                                logger.info("[SERVICE] - "+response.message);

                                d.resolve(response);

                            }

                        })(key);

                    }
                }



            }


        });

        return d.promise;

    };
    logger.info('[SERVICE] - Registering RPC: s4t.iotronic.service.restore');
    session.register('s4t.iotronic.service.restore', restore_board_services);
    // ---------------------------------------------------------------------------------------------------------------------------------------------


    // VNET CONFIGURATION INJECTION AFTER BOARD RECONNECTION----------------------------------------------------------------------------------------
    var result_network_board = function (result) {

        var board_id = result[1];

        var response = {
            message: '',
            result: ''
        };

        var d = Q.defer();

        logger.info('[VNET] - Board ' + board_id + ' VNET result: ' + result[0]);

        if (net_backend == 'iotronic') {

            db.getBoardVLAN(board_id, function (data) {
                
                if (data.result == "ERROR") {

                    logger.error("[VNET] --> " + data.message);
                    res.send(JSON.stringify(data));

                } else {

                    if (data.message.length != 0) {

                        response.message = "Board " + board_id + " is connected to these VLANs: \n" + JSON.stringify(data.message, null, "\t");
                        response.result = "SUCCESS";
                        logger.info("[VNET] - "+response.message);

                        for (var i = 0; i < data.message.length; i++) {

                            (function (i) {

                                net_utils.addToNetwork(data.message[i].net_uuid, board_id, data.message[i].ip_vlan, "false", "true");

                                if ( i === (data.message.length - 1) ) {
                                    d.resolve(response);
                                }

                            })(i);

                        }

                    } else {
                        response.message = "No VLAN for the board " + board_id;
                        response.result = "SUCCESS";
                        logger.info("[VNET] - "+response.message);
                        d.resolve(response);
                    }

                }




            });

        }

        return d.promise;
    };
    logger.info('[VNET] - Registering RPC: iotronic.rpc.command.result_network_board');
    session.register('s4t.iotronic.vnet.result_network_board', result_network_board);
    // ---------------------------------------------------------------------------------------------------------------------------------------------


    // PROVISIONING OF A NEW BOARD------------------------------------------------------------------------------------------------------------------
    var Provisioning = function (result) {

        var board_id = result[0];
        var d = Q.defer();

        db.getBoardPosition(board_id, 1, function (board_position) {

            logger.info('[SYSTEM] - BOARD POSITION: ' + JSON.stringify(board_position) + ' PROVISIONING BOARD RESPONSE: ' + board_id);
            d.resolve(board_position);

        });

        return d.promise;
    };
    session.register('s4t.board.provisioning', Provisioning);
    logger.info('[SYSTEM] - Registering RPC: s4t.board.provisioning');
    // ---------------------------------------------------------------------------------------------------------------------------------------------
    
    
};

module.exports.initIoTronicModules = initIoTronicModules;
module.exports.loadIoTronicModules = loadIoTronicModules;
module.exports.subscribeTopics = subscribeTopics;
module.exports.mngRpcRegister = mngRpcRegister;