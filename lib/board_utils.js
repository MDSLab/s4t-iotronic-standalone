/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2016 Nicola Peditto

 */


//service logging configuration: "board_utils"
var logger = log4js.getLogger('board_utils');
logger.setLevel(loglevel);

var db_utils = require('./mysql_db_utils');
var db = new db_utils;
var ckan = new ckan_utils;

var Q = require("q");
var fs = require("fs");

var session_wamp;

board_utils = function (session, rest) {

    session_wamp = session;

    // BOARDS MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //get boards list
    rest.get('/v1/boards/', function (req, res) {

        logger.debug("[API] - Boards list called - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var response = {
            message: '',
            result: ''
        };

        db.getBoardsList(function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting boards list: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                res.send(JSON.stringify(data));
            }

        });

    });

    //get board info
    rest.get('/v1/boards/:board', function (req, res) {

        logger.debug("[API] - Board info called - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;

        var response = {
            message: '',
            result: ''
        };

        db.BoardInfo(board, function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting board info: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                res.send(data); //JSON.stringify(data));
            }

        });

        
    });

    //create board
    rest.post('/v1/boards/', function (req, res) {

        checkRestInputs(req, function (check){

            if(check.result == "ERROR"){
                res.send(JSON.stringify(check));

            }else {

                var board_label = req.body.board_label;
                var board = req.body.board;
                var latitude = req.body.latitude;
                var longitude = req.body.longitude;
                var altitude = req.body.altitude;
                var net_enabled = req.body.net_enabled;
                var sensorslist = req.body.sensorslist;

                var response = {
                    result: '',
                    message: ''
                };

                if (board == undefined) {
                    response.message = "Board creation: Please specify a board UUID!";
                    response.result = "ERROR";
                    logger.error("[SYSTEM] --> " + response.message);
                    res.send(JSON.stringify(response));

                } else if(board_label == undefined){
                    response.message = "Board creation: Please specify a board label!";
                    response.result = "ERROR";
                    logger.error("[SYSTEM] --> " + response.message);
                    res.send(JSON.stringify(response));

                } else if(net_enabled == undefined){
                    response.message = "Board creation: Please specify the net-enabled flag: [ true | false ]";
                    response.result = "ERROR";
                    logger.error("[SYSTEM] --> " + response.message);
                    res.send(JSON.stringify(response));

                }else if(net_enabled != "true" && net_enabled != "false"){
                    response.message = "Board creation: wrong value of net-enabled flag: [ true | false ] - Specified: "+ net_enabled;
                    response.result = "ERROR";
                    logger.error("[SYSTEM] --> " + response.message);
                    res.send(JSON.stringify(response));

                }else{

                    try {

                        logger.info("[SYSTEM] - New board " + board_label + " (" + board + ") - registration parameters:\n" + JSON.stringify(req.body, null, "\t"));

                        if (req.body.extra != undefined) {

                            var isJSON = req.body.extra instanceof Object;

                            if(isJSON){

                                var extra = req.body.extra;
                                var ckan_enabled = extra.ckan_enabled;
                                logger.debug("[SYSTEM] --> ckan_enabled: " + ckan_enabled);

                                db.regBoard(board, board_label, latitude, longitude, altitude, net_enabled, sensorslist, function (db_result) {

                                    if (db_result.result === "SUCCESS") {

                                        if (ckan_enabled === "true") {

                                            logger.info("CKAN enabled registration: ");

                                            ckan.CkanBoardRegistration(board, board_label, latitude, longitude, altitude, function (ckan_result) {

                                                if (ckan_result.result == "ERROR") {
                                                    response.message = "Error CKAN registering board: " + ckan_result.message;
                                                    response.result = "ERROR";
                                                    logger.error("[VNET] --> " + response.message);
                                                    res.send(JSON.stringify(response));

                                                } else {
                                                    res.send(JSON.stringify(ckan_result));
                                                }

                                            });

                                        }
                                        else {
                                            res.send(JSON.stringify(db_result));
                                        }

                                    } else {
                                        res.send(JSON.stringify(db_result));
                                    }


                                });

                            }else{

                                try{

                                    var extra = JSON.parse(req.body.extra);
                                    var ckan_enabled = extra.ckan_enabled;
                                    logger.debug("[SYSTEM] --> ckan_enabled: " + ckan_enabled);

                                    db.regBoard(board, board_label, latitude, longitude, altitude, net_enabled, sensorslist, function (db_result) {

                                        if (db_result.result === "SUCCESS") {

                                            if (ckan_enabled === "true") {

                                                logger.info("CKAN enabled registration: ");

                                                ckan.CkanBoardRegistration(board, board_label, latitude, longitude, altitude, function (ckan_result) {

                                                    if (ckan_result.result == "ERROR") {
                                                        response.message = "Error CKAN registering board: " + ckan_result.message;
                                                        response.result = "ERROR";
                                                        logger.error("[VNET] --> " + response.message);
                                                        res.send(JSON.stringify(response));

                                                    } else {
                                                        res.send(JSON.stringify(ckan_result));
                                                    }

                                                });

                                            }
                                            else {
                                                res.send(JSON.stringify(db_result));
                                            }

                                        } else {
                                            res.send(JSON.stringify(db_result));
                                        }


                                    });

                                }
                                catch (err) {
                                    response.message = "Parsing 'extra' JSON payload: " + err;
                                    response.result = "ERROR";
                                    logger.error("[SYSTEM] --> " + response.message);
                                    res.send(JSON.stringify(response));
                                }

                            }

                        }
                        else
                            logger.debug("[SYSTEM] --> No extra data.");



                    }
                    catch (err) {

                        response.result = "ERROR";
                        response.message = err.toString();
                        logger.error('[SYSTEM] - ' + response.message);
                        res.send(JSON.stringify(response));

                    }

                }

            }


        });







    });

    //update board
    rest.patch('/v1/boards/:board', function (req, res) {

        var board = req.params.board;

        checkBoardAvailable(board, res, function (available) {

            if (available.result != "ERROR") {
                
                var board_label = req.body.board_label;
                var latitude = req.body.latitude;
                var longitude = req.body.longitude;
                var altitude = req.body.altitude;
                var net_enabled = req.body.net_enabled;
                var sensorslist = req.body.sensorslist;

                var response = {
                    result: "",
                    message: ""
                };

                logger.info("[SYSTEM] - BOARD " + board_label + " (" + board + ") UPDATING...");

                db.updateBoard(board, board_label, latitude, longitude, altitude, net_enabled, sensorslist, function (db_result) {

                    if (db_result.result == "ERROR") {
                        logger.error("[SYSTEM] --> " + db_result.message);
                        res.send(JSON.stringify(db_result));

                    } else {

                        var position = {
                            "altitude": altitude,
                            "longitude": longitude,
                            "latitude": latitude
                        };

                        db.checkBoardConnected(board, function (check_result) {

                            if (check_result.result == "ERROR") {
                                response.result = check_result.result;
                                response.message = "DB checkBoardConnected error for board " + board + ": " + check_result.message;
                                logger.error("[SYSTEM] --> " + response.message);
                                res.send(JSON.stringify(response));

                            } else {

                                var status = check_result.message[0].status;

                                if (status === "C") {

                                    logger.debug('[SYSTEM] - RPC call towards: ' + board + '.command.setBoardPosition \n with parameters: ' + JSON.stringify(position));
                                    session.call(board + '.command.setBoardPosition', [position]).then(
                                        function (conf_result) {
                                            response.message = db_result.message + " - " + conf_result;
                                            response.result = "SUCCESS";
                                            res.send(JSON.stringify(response));
                                        }
                                        , session.log);

                                } else {
                                    response.message = db_result.message + " - !!! WARNING: POSITION ON BOARD NOT UPDATED !!!";
                                    response.result = "WARNING";
                                    res.send(JSON.stringify(response));
                                }
                                
                            }

                            

                        });



                    }


                });

            }

        });




    });

    //delete board
    rest.delete('/v1/boards/:board', function (req, res) {


        var board = req.params.board;

        logger.info("[SYSTEM] - UNREGISTERING BOARD " + board + "...");

        var response = {
            message: '',
            result: ''
        };
        
        db.unRegBoard(board, function (data) {

            if (data.result == "ERROR") {
                response.message = "Error unregistering board: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                
                res.send(JSON.stringify(data));
            }

        });

    });

    //get sensors list
    rest.get('/v1/sensors/', function (req, res) {

        db.getSensorList(function (data) {

            logger.debug("[SYSTEM] - Sensors list called.");

            var response = {
                message: '',
                result: ''
            };

            if (data.result == "ERROR") {
                response.message = "Error getting sensors list: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                res.send(JSON.stringify(data));
            }

        });

    });

    //Execute action on board
    rest.post('/v1/boards/:board/action', function (req, res) {

        var board = req.params.board;
        
        logger.debug("[API] - Board Operation - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        checkBoardAvailable(board, res, function (available) {

            if (available.result == "SUCCESS") {
                
                var action = req.body.action; // reboot | etc..
                var parameters = req.body.parameters; // OPTIONAL

                var APIparamsList= {"action":action};

                checkDefInputs(APIparamsList, function (check) {

                    if (check.result == "ERROR") {

                        res.send(JSON.stringify(check));

                    } else {

                        checkRestInputs(req, function (check){

                            if(check.result == "ERROR"){
                                res.send(JSON.stringify(check));

                            }else {

                                execActionOnBoard(board, action, parameters, res);

                            }

                        });

                    }
                    
                });
                

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }


        });
        



    });    


    logger.debug("[REST-EXPORT] - Board's APIs exposed!");


};


var execActionOnBoard = function (board, action, parameters, res) {

    var response = {
        message: {},
        result: ""
    };

    session_wamp.call(board + '.command.execAction', [action, parameters]).then(

        function (rpc_response) {

            if (rpc_response.result == "ERROR") {

                response.message = rpc_response.message;
                response.result = "ERROR";
                res.send(JSON.stringify(response));
                logger.error("[SYSTEM] --> Action result on board '" + board + "': " + response.message);

            }else {
                response.message = rpc_response.message;
                response.result = rpc_response.result;
                res.send(JSON.stringify(response));
                logger.warn("[SYSTEM] --> Action result on board '" + board + "': " + response.message);

            }


        });

    
};

var checkBoardAvailable = function (board, res, callback) {

    var response = {
        message: {},
        result: ""
    };

    db.checkBoardConnected(board, function (data) {

        if (data.result == "ERROR") {

            response.result = data.result;
            response.message = "DB checkBoardConnected error for board " + board + ": " + data.message;
            logger.error("[SYSTEM] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {


            if (data.message.length == 1) {

                if (data.message[0].status == 'D') {

                    response.result = "WARNING";
                    response.message = "Board " + board + " is disconnected!";
                    callback(response);

                }
                else {

                    response.result = "SUCCESS";
                    response.message = "Board " + board + " is connected!";
                    callback(response);

                }

            }
            else {

                logger.error("[API] - Board " + board + " does not exist!");

                response.result = "ERROR";
                response.message = "Board " + board + " doesn't exist!";
                res.send(JSON.stringify(response));

                callback(response);
            }
            
        }

        

    });
};

var checkRestInputs = function (req, callback){

    var response = {
        message: '',
        result: ''
    };
    
    var wrongParams = [];

    var restBodyParams = Object.keys( req.body );

    if (restBodyParams.length == 0){

        response.result = "ERROR";
        response.message = "No paramaters in your request!";
        logger.error("[API] ----> " + response.message);
        callback(response);

    }else{

        for (var i = 0; i < restBodyParams.length; i++) {

            (function (i) {

                var restValue = req.body[restBodyParams[i]];

                if (restValue == "") {
                    wrongParams.push(restBodyParams[i]);
                    response.result = "ERROR";
                }

                if (i === (restBodyParams.length - 1)) {
                    if (response.result == "ERROR"){

                        response.message = "The following parameters are not specified: " + wrongParams.toString();
                        logger.error("[API] ----> " + response.message);
                    }
                    //logger.debug("[API] --> Rest parameters analyzed...")
                    callback(response);
                }

            })(i);
        }

    }
    


};

var checkDefInputs  = function (APIparams, callback){

    var response = {
        message: '',
        result: ''
    };

    var wrongParams = [];

    var restBodyParams = Object.keys(APIparams);

    for (var i = 0; i < restBodyParams.length; i++) {

        (function (i) {

            var restValue = APIparams[restBodyParams[i]];

            if (restValue == undefined) {
                wrongParams.push(restBodyParams[i]);
                response.result = "ERROR";
            }

            if (i === (restBodyParams.length - 1)) {
                
                if (response.result == "ERROR"){

                    logger.debug("[API] ----> Parameters required:");
                    logger.debug(APIparams);

                    response.message = "The following parameters are undefined: " + wrongParams.toString();
                    logger.error("[API] ----> " + response.message);
                }
                callback(response);
                
            }

        })(i);
    }


};

module.exports = board_utils;
module.exports.checkBoardAvailable = checkBoardAvailable;
module.exports.checkRestInputs = checkRestInputs;
module.exports.checkDefInputs = checkDefInputs;