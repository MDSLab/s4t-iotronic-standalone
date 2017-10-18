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

var fs = require("fs");

var session_wamp;

board_utils = function (session, rest) {

    session_wamp = session;

    // BOARDS MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //get boards list
    rest.get('/v1/boards/', function (req, res) {

        logger.info("[API] - Boards list called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

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

        logger.info("[API] - Board info called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        var response = {
            message: '',
            result: ''
        };

        checkBoardExists(board, res, function (available) {

            if (available.result == "SUCCESS") {

                db.BoardInfo(board, function (data) {

                    if (data.result == "ERROR") {
                        response.message = "Error getting board info: " + data.message;
                        response.result = "ERROR";
                        logger.error("[SYSTEM] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {
                        //res.send(data); //JSON.stringify(data));
                        //console.log(JSON.stringify(data, null, "\t"));
                        res.send(data);
                    }

                });

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }


        });
        
    });

    //create board
    rest.post('/v1/boards/', function (req, res) {

        checkRestInputs(req, function (check){

            if(check.result == "ERROR"){
                res.send(JSON.stringify(check));

            }else {

                var board_id = req.body.board_id;
                var board_label = req.body.board_label;
                var description = req.body.description;

                var latitude = req.body.latitude;
                var longitude = req.body.longitude;
                var altitude = req.body.altitude;
                var position_refr_time = req.body.position_refresh_time;

                var net_enabled = req.body.net_enabled;
                var sensorslist = req.body.sensorslist;
                var type = req.body.type_id;
                var mobile = req.body.mobile;

                var project_id = req.body.project_id;
                var user_id = req.body.user_id;

                var notify = req.body.notify;
                var notify_rate = req.body.notify_rate;
                var notify_retry = req.body.notify_retry;

                var response = {
                    result: '',
                    message: ''
                };

                var APIparamsList= {"board_label":board_label, "board_id":board_id, "latitude":latitude, "longitude":longitude, "altitude":altitude,
                    "net_enabled":net_enabled, "type":type, "user_id":user_id, "project_id":project_id, "mobile":mobile, "position_refr_time":position_refr_time, "notify":notify, "notify_rate":notify_rate, "notify_retry":notify_retry};

                checkDefInputs(APIparamsList, function (check){

                    if(check.result == "ERROR"){

                        res.send(JSON.stringify(check));

                    }else {

                        if(net_enabled != "true" && net_enabled != "false"){
                            response.message = "Board creation: wrong value of net-enabled flag: [ true | false ] - Specified: "+ net_enabled;
                            response.result = "ERROR";
                            logger.error("[SYSTEM] --> " + response.message);
                            res.send(JSON.stringify(response));

                        }else if(mobile != "true" && mobile != "false"){
                            response.message = "Board creation: wrong value of mobile flag: [ true | false ] - Specified: "+ net_enabled;
                            response.result = "ERROR";
                            logger.error("[SYSTEM] --> " + response.message);
                            res.send(JSON.stringify(response));

                        }else{
                            
                            try {

                                logger.info("[SYSTEM] - New board " + board_label + " (" + board_id + ") - registration parameters:\n" + JSON.stringify(req.body, null, "\t"));

                                var extra = req.body.extra;
                                var isJSON = req.body.extra instanceof Object;

                                if(isJSON){
                                    
                                    db.regBoard(board_id, board_label, latitude, longitude, altitude, net_enabled, sensorslist, type, description, extra, project_id, user_id, mobile, position_refr_time, notify, notify_rate, notify_retry, function (db_result) {

                                        if (db_result.result === "SUCCESS") {
                                   
                                            logger.info("[SYSTEM] --> Registration of board " + board_id + " successfully completed!");
                                            res.send(JSON.stringify(db_result));
                                            
                                        } else {
                                            res.send(JSON.stringify(db_result));
                                        }


                                    });

                                }else{
                                    
                                    try{

                                        var extra = JSON.parse(req.body.extra);

                                        db.regBoard(board_id, board_label, latitude, longitude, altitude, net_enabled, sensorslist, type, description, extra, project_id, user_id, mobile, position_refr_time, notify, notify_rate, notify_retry, function (db_result) {

                                            if (db_result.result === "SUCCESS") {

                                                logger.info("[SYSTEM] --> Registration of board '" + board_id + "' successfully completed!");
                                                res.send(JSON.stringify(db_result));
                                             
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
                            catch (err) {

                                response.result = "ERROR";
                                response.message = err.toString();
                                logger.error('[SYSTEM] - ' + response.message);
                                res.send(JSON.stringify(response));

                            }

                        }

                    }

                });


            }


        });







    });

    //update board
    rest.patch('/v1/boards/:board', function (req, res) {

        var board = req.params.board;

        checkBoardAvailable(board, res, function (available) {

            if (available.result != "ERROR") {
                
                var board_label = req.body.board_label;
                var description = req.body.description;
                var extra = req.body.extra;

                var latitude = req.body.latitude;
                var longitude = req.body.longitude;
                var altitude = req.body.altitude;
                var position_refr_time = req.body.position_refresh_time;

                var net_enabled = req.body.net_enabled;
                var sensorslist = req.body.sensorslist;
                var type = req.body.type_id;
                var mobile = req.body.mobile;

                var project_id = req.body.project_id;
                var user_id = req.body.user_id;

                var notify = req.body.notify;
                var notify_rate = req.body.notify_rate;
                var notify_retry = req.body.notify_retry;

                var response = {
                    result: "",
                    message: ""
                };

                logger.info("[SYSTEM] - BOARD " + board_label + " (" + board + ") UPDATING...");

                logger.debug("[SYSTEM] --> New configuration\n" + JSON.stringify(req.body, null, "\t"));
                logger.debug(extra);

                db.updateBoard(board, board_label, latitude, longitude, altitude, net_enabled, sensorslist, type, description, extra, project_id, user_id, mobile, position_refr_time, notify, notify_rate, notify_retry, function (db_result) {

                    if (db_result.result == "ERROR") {
                        logger.error("[SYSTEM] --> " + db_result.message);
                        res.send(JSON.stringify(db_result));

                    } else {


                        var position = {
                            "altitude": altitude,
                            "longitude": longitude,
                            "latitude": latitude
                        };

                        /*
                        var remote_conf = {
                            "notifier":{
                                "retry":1
                            }
                        };
                        */

                        db.checkBoardConnected(board, function (check_result) {

                            if (check_result.result == "ERROR") {
                                response.result = check_result.result;
                                response.message = "DB checkBoardConnected error for board " + board + ": " + check_result.message;
                                logger.error("[SYSTEM] --> " + response.message);
                                res.send(JSON.stringify(response));

                            } else {

                                var status = check_result.message[0].status;

                                if (status === "C") {

                                    logger.debug("[SYSTEM] - RPC call towards: '" + board + "'.command.setBoardPosition \n with parameters: " + JSON.stringify(position));


                                    session.call('s4t.' + board + '.board.setBoardPosition', [position]).then(
                                        function (conf_result) {
                                            response.message = db_result.message + " - " + conf_result;
                                            response.result = "SUCCESS";
                                            res.send(JSON.stringify(response));
                                        }, 
                                        session.log
                                    );

                                    /*
                                    session.call('s4t.' + board + '.board.updateConf', [remote_conf, position]).then(
                                        function (conf_result) {
                                            response.message = db_result.message + " - " + conf_result;
                                            response.result = "SUCCESS";
                                            res.send(JSON.stringify(response));
                                        }, 
                                        session.log
                                    );
                                    */

                                } else {
                                    response.message = db_result.message + " - !!! WARNING: REMOTE BOARD CONFIGURATION NOT UPDATED !!!";
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
        
        logger.info("[API] - Board Operation - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

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

    //Add board position
    rest.post('/v1/boards/:board/position', function (req, res) {

        var board_id = req.params.board;

        logger.info("[API] - Add board position - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var latitude = req.body.latitude;
        var longitude = req.body.longitude;
        var altitude = req.body.altitude;

        var APIparamsList= {"latitude":latitude, "longitude":longitude, "altitude":altitude};

        checkDefInputs(APIparamsList, function (check) {

            if (check.result == "ERROR") {

                res.send(JSON.stringify(check));

            } else {

                checkRestInputs(req, function (check){

                    if(check.result == "ERROR"){
                        res.send(JSON.stringify(check));

                    }else {

                        addBoardPosition(board_id, latitude, longitude, altitude, res);

                    }

                });

            }

        });






    });

    //Get board position
    rest.get('/v1/boards/:board/position', function (req, res) {

        var board_id = req.params.board;

        var samples = req.query.samples;

        var hour = req.query.hour;
        var day = req.query.day;
        var week = req.query.week;

        var response = {
            message: {},
            result: ""
        };


        logger.info("[API] - Get board position - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);


        if (samples != undefined && hour == undefined && day == undefined && week == undefined) {

            // Get last X samples
            db.getBoardPosition(board_id, samples, function (data) {

                if (data.result == "ERROR") {
                    response.message = "Error getting board position: " + data.message;
                    response.result = "ERROR";
                    logger.error("[SYSTEM] --> " + response.message);
                    res.send(JSON.stringify(response));

                } else {
                    res.send(JSON.stringify(data));
                }

            });

        }else if (samples == undefined && hour == undefined && day == undefined && week == undefined){

            //GET the last position

            db.getBoardPosition(board_id, 1, function (data) {

                if (data.result == "ERROR") {
                    response.message = "Error getting board position: " + data.message;
                    response.result = "ERROR";
                    logger.error("[SYSTEM] --> " + response.message);
                    res.send(JSON.stringify(response));

                } else {
                    res.send(JSON.stringify(data));
                }

            });

        }else if (samples == undefined || hour != undefined || day != undefined || week != undefined){

            //GET board position in a time window

            if (hour != undefined &&  day == undefined && week == undefined){
                var interval = hour + " HOUR";
            }else if (hour == undefined &&  day != undefined && week == undefined){
                var interval = day + " DAY";
            }else if (hour == undefined &&  day == undefined && week != undefined){
                var interval = week + " WEEK";
            }else{
                var interval = undefined;
            }

            if (interval != undefined){

                db.getBoardPositionHistory(board_id, interval, function (data) {

                    if (data.result == "ERROR") {
                        response.message = "Error getting board position: " + data.message;
                        response.result = "ERROR";
                        logger.error("[SYSTEM] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {
                        res.send(JSON.stringify(data));
                    }

                });

            }else{
                response.message = "Specify only 'hour' or 'day' or 'week' parameter!";
                response.result = "ERROR";
                logger.error("[API] --> " + response.message);
                res.send(JSON.stringify(response));
            }


        }else{
            response.message = "Specify or 'samples' or ['hour' | 'day' | 'week'] parameter!";
            response.result = "ERROR";
            logger.error("[API] --> " + response.message);
            res.send(JSON.stringify(response));
        }








    });

    logger.debug("[REST-EXPORT] - Board's APIs exposed!");


};

var addBoardPosition = function (board, latitude, longitude, altitude, res){
    
    var response = {
        message: {},
        result: ""
    };

    checkBoardExists(board, res, function (available) {

        if (available.result == "SUCCESS") {

            logger.debug("--> Board "+available.message.label+" (" + board + ") exists!");

            if (available.message.mobile == 1){

                db.addBoardPosition(board, latitude, longitude, altitude, function (data) {

                    if (data.result == "ERROR") {

                        response.result = data.result;
                        response.message = "DB addBoardPosition error for board " + board + ": " + data.message;
                        logger.error("[SYSTEM] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {
                        response.result = data.result;
                        response.message = "New position added for board "+available.result.label+" (" + board + ").";
                        logger.info("[SYSTEM] --> " + response.message);
                        res.send(JSON.stringify(response));

                    }



                });

            }else{

                response.result = "WARNING";
                response.message = "Board "+available.message.label+" (" + board + ") is not mobile: you can not add a new position... update board data!";
                logger.error("[SYSTEM] --> " + response.message);
                res.send(JSON.stringify(response));

            }



        }else if(available.result == "WARNING") {
            logger.error("[API] --> " + available.message);
            res.send(JSON.stringify(available));
        }


    });


    
};

var execActionOnBoard = function (board, action, parameters, res) {

    var response = {
        message: {},
        result: ""
    };

    session_wamp.call('s4t.' + board + '.board.execAction', [action, parameters]).then(

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
                logger.info("[SYSTEM] --> Action result on board '" + board + "': " + response.message);

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

var checkBoardExists = function (board, res, callback) {

    var response = {
        message: {},
        result: ""
    };

    db.checkBoard(board, function (data) {

        if (data.result == "ERROR") {

            response.result = data.result;
            response.message = "DB checkBoard error for board " + board + ": " + data.message;
            logger.error("[SYSTEM] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            if (data.message.length == 1) {
                    response.result = "SUCCESS";
                    response.message = data.message[0]; //"Board "+data.message[0].label+" (" + board + ") exists!";
                    callback(response);

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
                    //logger.info("[API] --> Rest parameters analyzed...")
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

                    logger.info("[API] ----> Parameters required:");
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
module.exports.execActionOnBoard = execActionOnBoard;
module.exports.addBoardPosition = addBoardPosition;