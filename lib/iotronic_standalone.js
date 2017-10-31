//############################################################################################
//##
//# Copyright (C) 2014-2017 Dario Bruneo, Francesco Longo, Andrea Rocco Lotronto,
//# Giovanni Merlino, Nicola Peditto
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
//############################################################################################

nconf = require('nconf');
log4js = require('log4js');



//IMPORT GENERIC MODULES
var autobahn = require('autobahn');
var express = require('express');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
var ip = require('ip');
var Q = require("q");
var fs = require('fs');


iotronic_standalone = function () {

    init_iotronic = require('./init_iotronic');

    logger = log4js.getLogger('main');
    logger.setLevel(loglevel);


};


iotronic_standalone.prototype.start = function (restPort, wamp_router_url, wamp_realm) {
    
    // Init IoTronic modules
    init_iotronic.initIoTronicModules();

    // Set up WAMP connection
    var connection = new autobahn.Connection({
        url: wamp_router_url,
        realm: wamp_realm
    });
    /* TEST WAMP over HTTPS
    var connection = new autobahn.Connection({
        //url: "wss://localhost:443", //wamp_router_url,
        realm: wamp_realm,
        transports: [
            {
                type: 'websocket',
                url: 'wss://localhost:443',
                protocols: ['wamp.2.json']
            }
        ]
    });
    console.log(connection);
    */


    // Connect to WAMP router
    connection.open();


    // Actions to perform on connection
    connection.onopen = function (session, details) {

        logger.info("[SYSTEM] - Connected to WAMP router!");

        if (IPLocal != undefined) {

            var rest = express();

            /*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
            /* SWAGGER TEST */
            /*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
            docs.genApiDocs(rest);
            /*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/

            // Configuring REST server
            rest.use(bodyParser.json()); // support json encoded bodies
            rest.use(bodyParser.urlencoded({extended: true})); // support encoded bodies
            rest.all('/*', function(req, res, next) {
                res.type('application/json');
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Methods", 'GET, POST, DELETE, PATCH, PUT');
                next();
            });


            // Load authentication manager ------------------------------------------------------------------------------

            if(auth_backend == "iotronic"){

                var auth = new auth_utility(session, rest);

                rest.use(function(req, res, next) {

                    console.log(req.headers)
                    console.log(req.body)

                    var ip_requester = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

                    var message;
                    // check header or url parameters or post parameters for token
                    var token = req.body.token || req.query.token || req.headers['x-auth-token'];

                    if(token){

                        adminToken = nconf.get('config:server:auth:adminToken');

                        if(token == adminToken){
                            //If you are SuperAdmin and you are using adminToken.

                            logger.debug("[AUTH] - SuperAdmin request verified from " + ip_requester);
                            req.IotronicUser = "SuperAdmin";
                            next();

                        }else {
                            //Decode the token
                            jwt.verify(token, encryptKey, function(err,decod){

                                if(err){
                                    message = "Wrong Token: " + err;
                                    logger.error("[AUTH] - " + message);
                                    res.status(403).json({
                                        message:message,
                                        result:"ERROR"
                                    });
                                }
                                else{
                                    //If decoded then call next() so that respective route is called.
                                    logger.debug("[AUTH] - Request verified for " + decod.username + " ("+decod.uuid+") from " + ip_requester);
                                    req.decoded=decod;
                                    req.IotronicUser=decod.username;
                                    next();

                                }

                            });
                        }


                    }
                    else{
                        logger.error("[AUTH] - No token specified in the request: " + req.route.path);
                        res.status(403).json({
                            message:"No Token",
                            result:"ERROR"
                        });
                    }

                });

            }else if (auth_backend == "keystone"){

                message = "Not implemented yet! Use 'iotronic' authentication.";
                logger.warn("[AUTH] - " + message);
                logger.info('Bye!');
                process.exit();

            }else {
                message = "Authentication backend not supported or not specified!";
                logger.error("[AUTH] - " + message);
                logger.info('Bye!');
                process.exit();
            }

            //----------------------------------------------------------------------------------------------------------


            /*rest.get('/', function (req, res) {
                
                res.send('API: <br> http://' + IPLocal + ':' + restPort + '/   Welcome in Iotronic-standalone!');

            });
*/

            // Loading IoTronic modules
            init_iotronic.loadIoTronicModules(session, rest);

            // IoTronic catching exceptions
            process.on('uncaughtException', function (err) {

                if (err.errno === 'EADDRINUSE') {

                    iotronic_status = "FAULT - Express - EADDRINUSE";

                }

            });

            // REST server starting if there are not error errors caught
            if (iotronic_status === "OK") {

                // START REST SERVER
                if (https_enable == "true"){
                    //HTTPS
                    var https = require('https');

                    var s4t_key = fs.readFileSync(https_key, 'utf8');
                    var s4t_cert = fs.readFileSync(https_cert, 'utf8');

                    var credentials = {
                        key: s4t_key,
                        cert: s4t_cert
                    };

                    //logger.debug("CREDENTIALS: " + JSON.stringify(credentials));
                    https.createServer(credentials, rest).listen(https_port, function(){
                        logger.info("[SYSTEM] - Server REST started on: https://" + IPLocal + ":" + https_port + " - IoTronic CERT: \n" + s4t_cert);
                    });

                }else{
                    //HTTP
                    var http = require('http');
                    http.createServer(rest).listen(restPort, function(){
                        logger.info("[SYSTEM] - Server REST started on: http://" + IPLocal + ":" + restPort);
                    });

                }

                //HTTP-TEMPORARY
                var http = require('http');
                http.createServer(rest).listen(restPort, function(){
                    logger.info("[SYSTEM] - Server REST started on: http://" + IPLocal + ":" + restPort);
                });



                
            }
            else {
                // Exit from IoTronic if there are errors caught
                logger.error("[SYSTEM] - ERROR: " + iotronic_status);
                logger.info('Bye!');
                process.exit();
            }


            // TO MANAGE BOARD CONNECTION EVENT-------------------------------------------------------------------------------------------------------------
            var onBoardConnected = function (args) {

                var board_id = args[0];
                var wamp_conn_status = args[1];
                var wamp_session = args[2];
                
                if (wamp_conn_status == 'connection') {

                    //CHECK IF THE BOARD IS AUTHORIZED: IF IT EXISTS IN boards TABLE OR BY MEANS OF KEYSTONE SERVICE

                    db.checkBoard(board_id, function (data) {

                        if (data.result == "ERROR") {

                            logger.error("[SYSTEM] --> " + data.message);
                            //res.send(JSON.stringify(data));

                        } else {

                            if (data.message.length == 0) {

                                // Board not registered in Iotronic

                                logger.warn("[SYSTEM] - A not authorized board has tried connecting to Iotronic!");

                                var response = {
                                    message: "Board with UUID '"+board_id+"' not authorized!",
                                    result: 'REJECTED'
                                };

                                session.call('s4t.' + board_id + '.board.checkRegistrationStatus', [response]);

                            }
                            else {

                                // Board registered in Iotronic
                                logger.info("[SYSTEM] - Access granted for board " + board_id);

                                var response = {
                                    message: 'Board with UUID '+board_id+' is authorized!',
                                    result: 'SUCCESS'
                                };

                                session.call('s4t.' + board_id + '.board.checkRegistrationStatus', [response]);
                                
                                
                                db.changeBoardState(board_id, wamp_session, 'C', function (data) {

                                    if (data.result == "ERROR") {

                                        logger.error("[SYSTEM] --> " + data.message);
                                        res.send(JSON.stringify(data));

                                    } else {

                                        db.getBoard(board_id, function (data) {

                                            if (data.result == "ERROR") {

                                                logger.error("[SYSTEM] --> " + data.message);
                                                //res.send(JSON.stringify(data));

                                            } else {

                                                var label = data.message[0].label;

                                                logger.info("[SYSTEM] - Board " + label + " (" + board_id + ") CONNECTED!");

                                                //Input parameters: board_id - res = false - restore = false
                                                net_utils.activateBoardNetwork(board_id, "false", "false");

                                                //ENABLE DISCONNECTION ALARM
                                                if ( boards_disconnected[board_id] != undefined){
                                                     // There is a disconnection alarm related to this board because it did reconnect in time
                                                     clearInterval( boards_disconnected[board_id] );
                                                     delete boards_disconnected[board_id];
                                                     logger.debug("[SYSTEM] - Alarm DEACTIVATED for board " + label + " (" + board_id + ")");
                                                }


                                            }



                                        });

                                    }



                                });

                            }
                            
                        }

                    });


                }
                else
                    logger.debug("[WAMP] - Board connection status: "+args)

            };
            
            
            //Subscribing to topic_connection
            session.subscribe(topic_connection, onBoardConnected);
            logger.info("[WAMP] - Subscribed to topic: " + topic_connection);
            session.publish(topic_connection, ['Iotronic-connected', session._id]);
            // ---------------------------------------------------------------------------------------------------------------------------------------------

            
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


            // SYNCHRONIZE BOARD LIST-----------------------------------------------------------------------------------------------------------------------
            logger.info("[WAMP] - Status boards WAMP connection syncronizing...");
            logger.info("[WAMP]   --> Iotronic session ID: " + session.id);
            logger.info("[WAMP]   --> Retriving boards connected to 'board.connection' topic...");


            //Get sessions list connected to "board.connection" topic.
            session.call("wamp.subscription.match", [topic_connection]).then(

                function (subCommandId) {

                    if (subCommandId != null){

                        subID = subCommandId[0];

                        //logger.debug("[WAMP] - Topic 'board.connection' ID: " + subID);

                        // Get subscribers (boards) list
                        session.call("wamp.subscription.list_subscribers",[subID]).then(

                            function (subBoards) {

                                // Boards connected WAMP side
                                logger.info("[WAMP]   --> Active sessions in the topic: " + subBoards);
                                var iotronic_index = subBoards.indexOf(parseInt(session.id));

                                subBoards.splice(iotronic_index, 1); //delete IoTronic session ID from boards list

                                if (subBoards.length == "0")
                                    logger.info("[WAMP]   --> No boards connected to the topic.");
                                else
                                    logger.info("[WAMP]   --> Board connected sessions to the topic: " + subBoards);


                                db.getBoardsList(function (data) {

                                    if (data.result == "ERROR") {

                                        logger.error("[SYSTEM]   --> Error getting boards list: " + data.message);

                                    } else {

                                        //logger.debug(JSON.stringify(data.message, null, "\t"));

                                        var db_board_list = data.message;
                                        var wrong_disconn_boards = []; // list of boards that disconnected from Iotronic when it was offline
                                        var wrong_conn_boards = [];    // list of boards that kept connected when Iotronic was offline and needs to be restored

                                        for (var i = 0; i < db_board_list.length; i++) {

                                            (function (i) {

                                                if (db_board_list[i]['session_id'] != "null"){

                                                    // Boards connected DB side
                                                    //logger.debug(db_board_list[i]['label'] + " - " + db_board_list[i]['session_id']);

                                                    if(subBoards.indexOf(parseInt(db_board_list[i]['session_id'])) > -1){

                                                        wrong_conn_boards.push(db_board_list[i]['board_code']);
                                                        //logger.debug(db_board_list[i]['label'] + " is connected!")

                                                    }else{

                                                        wrong_disconn_boards.push(db_board_list[i]['board_code']);
                                                        //logger.debug(db_board_list[i]['label'] + " is disconnected!");

                                                    }

                                                }


                                                if (i === (db_board_list.length - 1)) {

                                                    if(wrong_conn_boards.length !=0){

                                                        // Restore Iotronic services compromised by Iotronic disconnection

                                                        //logger.debug("[WAMP] - Wrong connected boards: \n" + wrong_conn_boards.sort());

                                                        logger.warn("[WAMP] - These boards need to be restored: ");

                                                        for (var w = 0; w < wrong_conn_boards.length; w++) {

                                                            (function (w) {

                                                                logger.warn("[WAMP] --> "+wrong_conn_boards[w]);

                                                                //Input parameters: board_id - res = false - restore = false
                                                                net_utils.activateBoardNetwork(wrong_conn_boards[w], "false", "true");

                                                            })(w);

                                                        }

                                                    }else
                                                        logger.info("[WAMP] - No boards in wrong connection status!");



                                                    if(wrong_disconn_boards.length != 0){

                                                        // Update DB boards status: put disconnected boards off-line.

                                                        //logger.debug("[WAMP] - Wrong disconnected boards: \n" + wrong_disconn_boards.sort());

                                                        logger.info("[WAMP] - These boards disconnected when Iotronic was off-line: ");

                                                        for (var w = 0; w < wrong_disconn_boards.length; w++) {

                                                            (function (w) {

                                                                var wrong_board = wrong_disconn_boards[w];

                                                                db.changeBoardState(wrong_board, 'null', 'D', function (data) {

                                                                    if (data.result == "ERROR") {

                                                                        logger.error("[SYSTEM] --> " + data.message);

                                                                    } else {

                                                                        //logger.debug(" --> DB status updated!");

                                                                        db.updateSocatStatus(wrong_board, "noactive", function (response) {

                                                                            if(response.result == "ERROR")
                                                                                logger.error("[WAMP] --> Error updating Socat status (board "+wrong_board+"): " +response.message);
                                                                            //else logger.debug(" --> Socat status set to 'noactive'!");

                                                                        });


                                                                        logger.info("[SYSTEM] --> " + wrong_board + ": DB status updated!");
                                                                        
                                                                    }

                                                                });


                                                            })(w);

                                                        }



                                                    }else
                                                        logger.info("[WAMP] - No boards in wrong disconnection status!");


                                                }

                                            })(i);
                                        }

                                    }

                                });


                            }

                        );

                    }else{

                        logger.debug("[WAMP] --> No boards connected to 'board.connection' topic.");

                        db.getBoardsList(function (data) {

                            if (data.result == "ERROR") {

                                logger.error("[SYSTEM] --> Error getting boards list: " + data.message);

                            } else {

                                var db_board_list = data.message;

                                for (var i = 0; i < db_board_list.length; i++) {

                                    (function (i) {

                                        if (db_board_list[i]['session_id'] != "null") {

                                            logger.debug(db_board_list[i]['label'] + " - " + db_board_list[i]['session_id']);

                                            db.changeBoardState(db_board_list[i]['board_code'], 'null', 'D', function (data) {

                                                if (data.result == "ERROR") {

                                                    logger.error("[SYSTEM] --> " + data.message);

                                                } else {

                                                    db.updateSocatStatus(wrong_board, "noactive", function (response) {

                                                        if(response.result == "ERROR")
                                                            logger.error("[VNET] - Error updating Socat status: " +response.message);
                                                        else
                                                            logger.debug("[VNET] - Socat status of board " + wrong_board + " set to 'noactive' ");

                                                    });

                                                }

                                            });

                                        }

                                        if (i === (db_board_list.length - 1)) {

                                            logger.debug("[WAMP] --> Status boards connection to WAMP syncronized.")

                                        }


                                    })(i);

                                }

                            }

                        });

                    }




                }
            );
            // ---------------------------------------------------------------------------------------------------------------------------------------------


            var onLeave_function = function (session_id) {

                //var board_alert = null;
                var alert_count = 0;


                logger.info("[WAMP] - Board session closed: ");

                db.findBySessionId(session_id, function (data_find) {
                    
                    if (data_find.result == "ERROR") {

                        logger.error("[SYSTEM] --> " + data_find.message);
                        res.send(JSON.stringify(data_find));

                    } else {

                        if (data_find.message.length == 0) {
                            logger.warn("[WAMP] --> A board in wrong status disconnected!");
                        }
                        else{

                            var board = data_find.message[0].board_code;
                            var label = data_find.message[0].label;

                            logger.debug("[WAMP] --> Session ID: " + session_id + " - Board: " +board);

                            db.changeBoardState(board, 'null', 'D', function (data) {

                                if (data.result == "ERROR") {

                                    logger.error("[SYSTEM] --> " + data.message);
                                    res.send(JSON.stringify(data));

                                } else {

                                    logger.info("[SYSTEM] - Board " + label + " (" + board + ") DISCONNECTED!");
                                    
                                    db.updateSocatStatus(board, "noactive", function (response) {

                                        if(response.result == "ERROR")
                                            logger.error("[VNET] - Error updating Socat status: " +response.message);
                                        else {
                                            logger.debug("[VNET] - Socat status of board " + board + " (" + label + ") updated.");

                                        }

                                    });


                                    if(enable_notify == "true"){

                                        db.getUserByBoard(board, function (response) {

                                            if(response.result == "ERROR")
                                                logger.error("[SYSTEM] - Error getting user and board information: " +response.message);

                                            else {

                                                var board_notify = response.message[0].notify;
                                                var notify_rate = response.message[0].notify_rate;
                                                var notify_retry = response.message[0].notify_retry;

                                                if(board_notify == 0){

                                                    logger.debug("[NOTIFY] - Alarm is DISABLED for the board " + label );

                                                }else{

                                                    logger.debug("[NOTIFY] - Alarm ACTIVATED for the board " + label + " - rate (sec): " + notify_rate + " - retry: " + notify_retry);

                                                    var user = response.message[0].username;
                                                    var user_email = response.message[0].email;

                                                    logger.debug("[NOTIFY] --> Owner user of board " + label + " (" + board + "): " + user + " ("+user_email+")");

                                                    boards_disconnected[board] = setInterval(function(){

                                                        alert_count++;

                                                        if (alert_count <= notify_retry){

                                                            logger.debug("[NOTIFY] --> Alarm check ["+alert_count+"]:  Board " + board + " - User: "+user + " - Email: "+user_email); //+" - Cache: " + JSON.stringify(boards_disconnected));

                                                            utility.sendEmail(smtpConfig, user_email, label, board);

                                                        }

                                                        if (alert_count == notify_retry){

                                                            clearInterval( boards_disconnected[board] );
                                                            delete boards_disconnected[board];
                                                            logger.debug("[NOTIFY] - Alarm DEACTIVATED for the board: " + board);


                                                        }
                                                        

                                                    }, notify_rate * 1000);

                                                }


                                            }

                                        }); 
                                        
                                    }
                                    





                                }

                            });
                            
                        }
                        
                    }

                    
                });




            };

            var onJoin_function = function (info) {
                //logger.info("[WAMP] - Board Join:\n" + JSON.stringify(info, null, 4));
                logger.info("[WAMP] - Board Join:");
                logger.info("[WAMP] --> Session ID: " + info[0]['session']);
                logger.info("[WAMP] --> Source IP: " + info[0]['transport']['peer']);
            };

            session.subscribe('wamp.session.on_join', onJoin_function);

            session.subscribe('wamp.session.on_leave', onLeave_function);


        } else {

            logger.error("[SYSTEM] - SERVER IP UNDEFINED: please specify a valid network interface in settings.json");
            logger.info('Bye!');
            process.exit();

        }


    };


    // Actions to perform on disconnection
    connection.onclose = function (reason, details) {
        logger.info("[WAMP] - Connection close reason: " + reason);
        logger.debug("[WAMP] - Connection close details:");
        logger.debug("[WAMP]\n" + JSON.stringify(details, null, "\t"));

        //logger.info("[REST] - Server REST stopping...");
        server_rest.close(function () {
            logger.info("[REST] - Server REST stopped.");
        });

    }


};





module.exports = iotronic_standalone;
