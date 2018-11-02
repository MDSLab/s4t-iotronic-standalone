//###############################################################################
//##
//# Copyright (C) 2017-2018 Nicola Peditto
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
reconnection = false;

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
    public_ip = nconf.get('config:server:public_ip');
    topic_connection = nconf.get('config:wamp:topic_connection');
    wamp_ssl = nconf.get('config:wamp:ssl');
    
    http_port = nconf.get('config:server:http_port');
    https_enable = nconf.get('config:server:https:enable');
    https_port = nconf.get('config:server:https:port');
    https_key = nconf.get('config:server:https:key');
    https_cert = nconf.get('config:server:https:cert');
    
    encryptKey = nconf.get('config:server:auth:encryptKey');
    auth_backend = nconf.get('config:server:auth:backend');
    auth_lr_mode = nconf.get('config:server:auth:auth_lr_mode');
    logger.debug("[SYSTEM] - Lightning-rod athentication mode:",auth_lr_mode);


    docs_embedded = nconf.get('config:server:docs:embedded:enable');
    docs_path = nconf.get('config:server:docs:embedded:path');
    docs_exp = nconf.get('config:server:docs:exposed:enable');
    docs_url = nconf.get('config:server:docs:exposed:url');
    docs_url_spec = nconf.get('config:server:docs:expose:url_spec');


    if(nconf.get('config:wstun:ip') == "env"){
        wstun_ip = process.env.WSTUN_IP;
        logger.debug("[SYSTEM] - WSTUN public IP (env):",wstun_ip);
    }else
        wstun_ip = nconf.get('config:wstun:ip');

    if(nconf.get('config:wstun:port_range:high') == "env" && nconf.get('config:wstun:port_range:low') == "env"){
        wstun_h_port = parseInt(process.env.WSTUN_H_PORT);
        wstun_l_port = parseInt(process.env.WSTUN_L_PORT);
        logger.debug("[SYSTEM] - WSTUN port range (env):",wstun_l_port, wstun_h_port);
    }
    else {
        wstun_h_port = parseInt(nconf.get('config:wstun:port_range:high'));
        wstun_l_port = parseInt(nconf.get('config:wstun:port_range:low'));
        logger.debug("[SYSTEM] - WSTUN port range (conf):",wstun_l_port, wstun_h_port);
    }


    // INIT IoTronic modules
    db_utils = require('./management/mng_db');
    plugin_utility = require('./modules/plugin_manager');
    driver_utility = require('./modules/driver_manager');
    vfs_utility = require('./modules/vfs_manager');
    gpio_utility = require('./modules/gpio_manager');
    nr_utility = require('./modules/nodered_manager');
    

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
    request_utility = require('./management/mng_request');


    /*
    if (net_backend == 'iotronic')
        net_utility = require('./modules/vnet_iotronic_manager');
    else
        net_utility = require('./modules/vnet_neutron_manager');
    */

    // Loading DB library
    db = new db_utils;

    // Set fronted IP address
    if (public_ip == "")
        IoTronic_IP = utility.getIP(intr, 'IPv4');
    else if(public_ip == "env"){
        IoTronic_IP = process.env.IOTRONIC_PUB_IP;
    }
    else
        IoTronic_IP = public_ip;


    // Init IoTronic Manager
    if (net_backend == 'iotronic') {
        net_utility = require('./modules/vnet_iotronic_manager');
        net_utility.initVNET();
    }
    /*
    else if(net_backend == 'neutron'){
        net_utility = require('./modules/vnet_neutron_manager');
    }
    */
    else {
        logger.warn("[SYSTEM] - IoTronic does not support this network backend: " + net_backend)
    }


    // CHECK WSTUN PROCESS STATUS
    /*
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
    */


};

var loadIoTronicModules = function(session, rest) {

    logger.info("[SYSTEM] - IoTronic modules loading...");

    var d = Q.defer();

    var response = {
        message: '',
        result: ''
    };

    try {
        
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
        nr_utils = new nr_utility(session, rest);
        requests_utils = new request_utility(session, rest);

        response.message = "IoTronic modules successfully loaded.";
        response.result = "SUCCESS";
        d.resolve(response);

    }catch (err) {

        response.message = "Error loading IoTronic modules: " + err;
        response.result = "ERROR";
        d.resolve(response);
        
    }

    return d.promise;
    
};


//Subscribe IoTronic to topic_connection
var subscribeTopics = function(session, topic_connection, onBoardConnected) {
    session.subscribe(topic_connection, onBoardConnected);
    logger.info("[WAMP] - Subscribed to topic: " + topic_connection);
    session.publish(topic_connection, ['Iotronic-connected', session._id]);
};

// NO USED ANYMORE
/*
var mngRpcRegister = function(session){

    logger.debug("[SYSTEM] - " + "Registering IoTronic RPCs:");

    // CHECK IF IOTRONIC IS ALIVE-------------------------------------------------------------------------------------------------------------------
    session.register('s4t.iotronic.isAlive', board_utils.isAlive);
    logger.debug('[SYSTEM] --> s4t.iotronic.isAlive');
    // ---------------------------------------------------------------------------------------------------------------------------------------------

    // PROVISIONING OF A NEW BOARD------------------------------------------------------------------------------------------------------------------
    session.register('s4t.board.provisioning', board_utils.Provisioning);
    logger.debug('[SYSTEM] --> s4t.board.provisioning');
    // ---------------------------------------------------------------------------------------------------------------------------------------------


    // BOARD SERVICES RESTORE ON CONNECTION---------------------------------------------------------------------------------------------------------
    session.register('s4t.iotronic.service.restore', services_utils.restoreServices);
    logger.debug('[SYSTEM] --> s4t.iotronic.service.restore');
    // ---------------------------------------------------------------------------------------------------------------------------------------------

    // VNET CONFIGURATION INJECTION AFTER BOARD RECONNECTION----------------------------------------------------------------------------------------
    session.register('s4t.iotronic.vnet.result_network_board', net_utils.result_network_board);
    logger.debug('[SYSTEM] --> s4t.iotronic.vnet.result_network_board');
    // ---------------------------------------------------------------------------------------------------------------------------------------------

};
*/

module.exports.initIoTronicModules = initIoTronicModules;
module.exports.loadIoTronicModules = loadIoTronicModules;
module.exports.subscribeTopics = subscribeTopics;
//module.exports.mngRpcRegister = mngRpcRegister;