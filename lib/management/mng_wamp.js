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

var logger = log4js.getLogger('mng_wamp');
logger.setLevel(loglevel);

var db_utils = require('./mng_db');
var db = new db_utils;
var board_utility = require('./mng_board');


// SYNCHRONIZE BOARD LIST
var boardSync = function(){
    
    logger.info("[WAMP] - Status boards WAMP connection syncronizing...");
    logger.info("[WAMP]   --> Iotronic session ID: " + iotronic_session.id);
    logger.info("[WAMP]   --> retrieving boards connected to 'board.connection' topic...");
    
    //Get sessions list connected to "board.connection" topic.
    iotronic_session.call("wamp.subscription.match", [topic_connection]).then(

        function (subCommandId) {

            if (subCommandId != null){

                subID = subCommandId[0];

                //logger.debug("[WAMP] - Topic 'board.connection' ID: " + subID);

                // Get subscribers (boards) list
                iotronic_session.call("wamp.subscription.list_subscribers",[subID]).then(

                    function (subBoards) {

                        // Boards connected WAMP side
                        logger.info("[WAMP]   --> Active sessions in the topic: " + subBoards);
                        var iotronic_index = subBoards.indexOf(parseInt(iotronic_session.id));

                        subBoards.splice(iotronic_index, 1); //delete IoTronic session ID from boards list

                        if (subBoards.length == "0")
                            logger.info("[WAMP]   --> No boards connected to the topic.");
                        else
                            logger.info("[WAMP]   --> Board connected sessions to the topic: " + subBoards);


                        db.getBoardsList("all", function (data) {

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

                                                wrong_conn_boards.push(db_board_list[i]['board_id']);
                                                //logger.debug(db_board_list[i]['label'] + " is connected!")

                                            }else{

                                                wrong_disconn_boards.push(db_board_list[i]['board_id']);
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
                                                        net_utils.activateBoardNetwork(wrong_conn_boards[w], false, true);

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

                db.getBoardsList("all", function (data) {

                    if (data.result == "ERROR") {

                        logger.error("[SYSTEM] --> Error getting boards list: " + data.message);

                    } else {

                        var db_board_list = data.message;

                        for (var i = 0; i < db_board_list.length; i++) {

                            (function (i) {

                                if (db_board_list[i]['session_id'] != "null") {

                                    logger.debug(db_board_list[i]['label'] + " - " + db_board_list[i]['session_id']);

                                    db.changeBoardState(db_board_list[i]['board_id'], 'null', 'D', function (data) {

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

                                    logger.info("[WAMP] --> Status boards connection to WAMP syncronized.")

                                }


                            })(i);

                        }

                    }

                });

            }




        }
    );
    
};


// TO MANAGE BOARD CONNECTION EVENT
var onBoardConnected = function (args) {

    var board_id = args[0];
    var wamp_conn_status = args[1];
    var wamp_session = args[2];

    if (wamp_conn_status == 'connection') {

        //CHECK IF THE BOARD IS AUTHORIZED: IF IT EXISTS IN boards TABLE OR BY MEANS OF KEYSTONE SERVICE

        db.checkBoard(board_id, function (data) {

            if (data.result == "ERROR") {

                logger.error("[SYSTEM] --> " + data.message);

            } else {

                if (data.message.length == 0) {

                    // Board not registered in Iotronic

                    logger.warn("[SYSTEM] - A not authorized board has tried connecting to Iotronic!");

                    var response = {
                        message: "Board with UUID '"+board_id+"' not authorized!",
                        result: 'REJECTED'
                    };

                    iotronic_session.call('s4t.' + board_id + '.board.checkRegistrationStatus', [response]);

                }
                else {

                    // Board registered in Iotronic
                    logger.info("[SYSTEM] - Access granted for board " + board_id);

                    var response = {
                        message: 'Board with UUID '+board_id+' is authorized!',
                        result: 'SUCCESS'
                    };

                    
                    //Create conf file: board_utility.createBoardConf
                    
                    //Inject Board Conf
                    
                    iotronic_session.call('s4t.' + board_id + '.board.checkRegistrationStatus', [response]);
                    
                    db.changeBoardState(board_id, wamp_session, 'C', function (data) {

                        if (data.result == "ERROR") {

                            logger.error("[SYSTEM] --> " + data.message);

                        } else {

                            db.getBoard(board_id, function (data) {

                                if (data.result == "ERROR") {

                                    logger.error("[SYSTEM] --> " + data.message);

                                } else {

                                    var label = data.message[0].label;

                                    logger.info("[SYSTEM] - Board " + label + " (" + board_id + ") CONNECTED!");

                                    
                                    // ENABLE NETWORK MANAGER ----------------------------------------------------------
                                    
                                    //Input parameters: board_id - res = false - restore = false
                                    net_utils.activateBoardNetwork(board_id, false, "false");
                                    
                                    //----------------------------------------------------------------------------------
                                    

                                    //DISABLE DISCONNECTION ALARM
                                    if ( boards_disconnected[board_id] != undefined){
                                        // There was a disconnection alarm related to this board

                                        if(boards_disconnected[board_id]['interval'] != undefined)
                                            clearInterval( boards_disconnected[board_id]['interval'] );

                                        delete boards_disconnected[board_id]['interval'];

                                        if (boards_disconnected[board_id]['alert_count'] != 0){

                                            if(enable_notify == "true") {

                                                db.getUserByBoard(board_id, function (response) {

                                                    if (response.result == "ERROR")

                                                        logger.error("[SYSTEM] - Error getting user and board information: " + response.message);

                                                    else {

                                                        if (response.message[0].notify == 0) {

                                                            logger.debug("[NOTIFY] - Alarm is DISABLED for the board " + label);

                                                        } else {

                                                            var user_email = response.message[0].email;
                                                            var subject = 'NOTIFY by Stack4Things BOX '+ label;
                                                            var message = "Alarm DEACTIVATED for Stack4Things box '"+label+"': box is online again (@ "+utility.getLocalTime()+")";


                                                            if (boards_disconnected[board_id]['alert_count'] < response.message[0].notify_retry)
                                                                logger.debug("[SYSTEM] - Alarm DEACTIVATED for board " + label + " (" + board_id + ")");
                                                            else
                                                                logger.debug("[SYSTEM] - Sending notify sent at "+user_email+" for board " + label + " (" + board_id + ")");

                                                            utility.sendEmail(smtpConfig, user_email, subject, message);

                                                        }

                                                    }


                                                });
                                            }

                                        }



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


// TO MANAGE BOARD WAMP LEAVE EVENT
var onLeave_function = function (session_id) {

    logger.info("[WAMP] - Board session closed: ");

    db.findBySessionId(session_id, function (data_find) {

        if (data_find.result == "ERROR") {

            logger.error("[SYSTEM] --> " + data_find.message);

        } else {

            if (data_find.message.length == 0) {
                logger.warn("[WAMP] --> A board in wrong status disconnected!");
            }
            else{

                var board = data_find.message[0].board_id;
                var label = data_find.message[0].label;

                logger.debug("[WAMP] --> Session ID: " + session_id + " - Board: " +board);

                db.changeBoardState(board, 'null', 'D', function (data) {

                    if (data.result == "ERROR") {

                        logger.error("[SYSTEM] --> " + data.message);

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
                                        boards_disconnected[board]={};
                                        boards_disconnected[board]['alert_count'] = 0;

                                        boards_disconnected[board]['interval'] = setInterval(function(){

                                            if ( boards_disconnected[board] != undefined){

                                                boards_disconnected[board]['alert_count'] ++;

                                                if (boards_disconnected[board]['alert_count'] < notify_retry){

                                                    logger.debug("[NOTIFY] - Alarm check ["+boards_disconnected[board]['alert_count']+"]:  Board " + board + " - User: "+user + " - Email: "+user_email); //+" - Cache: " + JSON.stringify(boards_disconnected));

                                                    var subject = 'ALERT by Stack4Things BOX '+ label;
                                                    var message = "Your Stack4Things box '"+label+"' ("+board+") is offline (@ "+utility.getLocalTime()+")";
                                                    utility.sendEmail(smtpConfig, user_email, subject, message);

                                                }

                                                if (boards_disconnected[board]['alert_count'] == notify_retry){

                                                    logger.debug("[NOTIFY] - Alarm check ["+boards_disconnected[board]['alert_count']+"]:  Board " + board + " - User: "+user + " - Email: "+user_email); //+" - Cache: " + JSON.stringify(boards_disconnected));

                                                    clearInterval( boards_disconnected[board] );
                                                    //delete boards_disconnected[board];
                                                    logger.debug("[NOTIFY] --> Alarm DEACTIVATED for the board '" + board +"': max connection retries reached.");

                                                    var subject = 'ALERT by Stack4Things BOX '+ label;
                                                    var message = "Max connection retries for Stack4Things box '"+label+"' reached: your box is offline (@ "+utility.getLocalTime()+")";
                                                    utility.sendEmail(smtpConfig, user_email, subject, message);


                                                }

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


// TO MANAGE BOARD WAMP JOIN EVENT
var onJoin_function = function (info) {
    //logger.info("[WAMP] - Board Join:\n" + JSON.stringify(info, null, 4));
    logger.info("[WAMP] - Board Join:");
    logger.info("[WAMP] --> Session ID: " + info[0]['session']);
    logger.info("[WAMP] --> Source IP: " + info[0]['transport']['peer']);
};


// TO MANAGE IOTRONIC WAMP SUBSCRIPTIONS
var IoTronicSubscribe = function () {

    /**/
    iotronic_session.subscribe(topic_connection, onBoardConnected);
    logger.debug("[WAMP] - Subscribed to topic: " + topic_connection);
    iotronic_session.publish(topic_connection, ['Iotronic-connected', iotronic_session._id]);
    
    iotronic_session.subscribe('wamp.session.on_join', onJoin_function);

    iotronic_session.subscribe('wamp.session.on_leave', onLeave_function);

    logger.info("[WAMP] - IoTronic subscriptions completed!");
};



module.exports.IoTronicSubscribe = IoTronicSubscribe;
module.exports.boardSync = boardSync;
module.exports.onLeave_function = onLeave_function;
module.exports.onJoin_function = onJoin_function;
module.exports.onBoardConnected = onBoardConnected;