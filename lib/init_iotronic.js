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

//GLOBAL VARIABLES
IotronicHome = process.env.IOTRONIC_HOME;
boards_disconnected = {};
net_backend = 'iotronic'; //neutron
iotronic_status = "OK";
server_rest = null;

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

    logger.info('\n\n##################################\n Stack4Things Iotronic-Standalone\n##################################');
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

    var response = {
        message: '',
        result: ''
    };

    //var d = Q.defer();

    // Load settings
    intr = nconf.get('config:server:interface');
    topic_connection = nconf.get('config:wamp:topic_connection');
    https_enable = nconf.get('config:server:https:enable');
    https_port = nconf.get('config:server:https:port');
    https_key = nconf.get('config:server:https:key');
    https_cert = nconf.get('config:server:https:cert');
    encryptKey = nconf.get('config:server:auth:encryptKey');
    auth_backend = nconf.get('config:server:auth:backend');


    // INIT IoTronic modules
    db_utils = require('./management/mng_db');
    plugin_utility = require('./modules/plugin_manager');
    driver_utility = require('./modules/driver_manager');
    vfs_utility = require('./modules/vfs_manager');
    gpio_utility = require('./modules/gpio_manager');
    board_utility = require('./management/mng_boards');
    utility = require('./management/utility');
    service_utility = require('./modules/service_manager');
    layout_utility = require('./management/mng_layout');
    project_utility = require('./management/mng_project');
    user_utility = require('./management/mng_user');
    auth_utility = require('./management/mng_auth');
    docs = require('./management/mng_docs');
    notify = require('./management/mng_notify');

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




    //return d.promise;

};

var loadIoTronicModules = function(session, rest) {
    
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


module.exports.initIoTronicModules = initIoTronicModules;
module.exports.loadIoTronicModules = loadIoTronicModules;
