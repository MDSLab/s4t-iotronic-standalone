/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2016 Nicola Peditto
*/


//service logging configuration: "gpio_utils"
var logger = log4js.getLogger('gpio_utils');
logger.setLevel(loglevel);

var board_utility = require('./board_utils');
var db_utils = require('./mysql_db_utils');
var db = new db_utils;

var response = {
    message: '',
    result: ''
};


gpio_utils = function (session, rest) {

    // GPIO MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //read analog PIN
    rest.get('/v1/boards/:board/gpio/analog/read', function (req, res) {

        logger.debug("[API] - GPIO Analog Read - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var response = {
            message: '',
            result: {}
        };

        var board = req.params.board;


        db.getLayoutByBoardId(board, function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting board data: " + data.message;
                response.result = "ERROR";
                logger.error("[GPIO] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {

                var board_type = data.message[0].id_layout;
                var board_model = data.message[0].model;
                logger.debug("[GPIO] - Board layout: " + board_type + " - " + board_model);

                if(board_type === "1"){ //is an Arduino YUN

                    board_utility.checkBoardAvailable(board, res, function (available){

                        if(available.result == "SUCCESS"){

                            var pin = req.query.pin;

                            if( pin != "" && pin != undefined){

                                logger.info('[GPIO] - ANALOG READ on board: ' + board + ' - pin ' + pin);

                                session.call('s4t'+ board + '.gpio.read.analog', [board, "analog", pin]).then(
                                    function (rpc_response) {

                                        if(rpc_response.result == "ERROR"){
                                            logger.error("[GPIO] - Read Analog PIN (voltage): " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }
                                        else{
                                            logger.debug("[GPIO] - Read Analog PIN: " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }

                                    }
                                );

                            }else{

                                response.message = "You need to specify a PIN.";
                                response.result = "ERROR";
                                logger.error("[API] --> " + response.message);
                                res.send(JSON.stringify(response));

                            }





                        }else if(available.result == "WARNING") {
                            logger.error("[API] --> " + available.message);
                            res.send(JSON.stringify(available));
                        }

                    });

                } else{

                    response.message = "Your device model does not support this API!";
                    response.result = "ERROR";
                    logger.warn("[GPIO] --> " + response.message);
                    res.send(JSON.stringify(response));

                }
                
                
            }

        });
        
        




    });


    //read digital PIN
    rest.get('/v1/boards/:board/gpio/digital/read', function (req, res) {

        logger.debug("[API] - GPIO Digital Read - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var response = {
            message: '',
            result: {}
        };

        var board = req.params.board;

        db.getLayoutByBoardId(board, function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting board data: " + data.message;
                response.result = "ERROR";
                logger.error("[GPIO] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {

                var board_type = data.message[0].id_layout;
                var board_model = data.message[0].model;
                logger.debug("[GPIO] - Board layout: " + board_type + " - " + board_model);

                if(board_type === "1"){ //is an Arduino YUN

                    board_utility.checkBoardAvailable(board, res, function (available){

                        if(available.result == "SUCCESS"){

                            var pin = req.query.pin;

                            if( pin != "" && pin != undefined){

                                logger.info('[GPIO] - DIGITAL READ on board: ' + board + ' - digital pin ' + pin);

                                session.call('s4t'+ board + '.gpio.read.digital', [board, "digital", pin]).then(

                                    function (rpc_response) {

                                        if(rpc_response.result == "ERROR"){
                                            logger.error("[GPIO] - Read Digital PIN: " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }
                                        else{
                                            logger.debug("[GPIO] - Read Digital PIN: " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }

                                    }

                                );

                            }else{

                                response.message = "You need to specify a PIN.";
                                response.result = "ERROR";
                                logger.error("[API] --> " + response.message);
                                res.send(JSON.stringify(response));

                            }



                        }else if(available.result == "WARNING") {
                            logger.error("[API] --> " + available.message);
                            res.send(JSON.stringify(available));
                        }

                    });


                } else{

                    response.message = "Your device model does not support this API!";
                    response.result = "ERROR";
                    logger.warn("[GPIO] --> " + response.message);
                    res.send(JSON.stringify(response));

                }


            }

        });

    });


    //write analog PIN
    rest.post('/v1/boards/:board/gpio/analog/write', function (req, res) {

        logger.debug("[API] - GPIO Analog Write - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;


        db.getLayoutByBoardId(board, function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting board data: " + data.message;
                response.result = "ERROR";
                logger.error("[GPIO] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {

                var board_type = data.message[0].id_layout;
                var board_model = data.message[0].model;
                logger.debug("[GPIO] - Board layout: " + board_type + " - " + board_model);

                if(board_type === "1"){ //is an Arduino YUN

                    board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var pin = req.body.pin;
                var value = req.body.value;

                var APIparamsList= {"pin":pin, "value":value};

                var response = {
                    message: '',
                    result: {}
                };


                board_utility.checkDefInputs(APIparamsList, function (check) {

                    if (check.result == "ERROR") {

                        res.send(JSON.stringify(check));

                    } else {

                        board_utility.checkRestInputs(req, function (check) {

                            if (check.result == "ERROR") {
                                res.send(JSON.stringify(check));

                            } else {

                                logger.info('[GPIO] - ANALOG WRITE on board: ' + board + ' - pin ' + pin + ' with value ' + value);

                                session.call('s4t'+ board + '.gpio.write.analog', [board, "analog", pin, value]).then(
                                    function (rpc_response) {

                                        if(rpc_response.result == "ERROR"){
                                            logger.error("[GPIO] - Write Analog PIN: " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }
                                        else{
                                            logger.debug("[GPIO] - Write Analog PIN: " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }

                                    }
                                );


                            }

                        });

                    }

                });



            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }

        });

                } else{

                    response.message = "Your device model does not support this API!";
                    response.result = "ERROR";
                    logger.warn("[GPIO] --> " + response.message);
                    res.send(JSON.stringify(response));

                }


            }

        });



    });


    //write digital PIN
    rest.post('/v1/boards/:board/gpio/digital/write', function (req, res) {

        logger.debug("[API] - GPIO Digital Write - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;

        db.getLayoutByBoardId(board, function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting board data: " + data.message;
                response.result = "ERROR";
                logger.error("[GPIO] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {

                var board_type = data.message[0].id_layout;
                var board_model = data.message[0].model;
                logger.debug("[GPIO] - Board layout: " + board_type + " - " + board_model);

                if(board_type == "1"){ //is an Arduino YUN

                    board_utility.checkBoardAvailable(board, res, function (available) {

            if (available.result == "SUCCESS") {

                var pin = req.body.pin;
                var value = req.body.value;

                var APIparamsList = {"pin": pin, "value": value};

                board_utility.checkDefInputs(APIparamsList, function (check) {

                    if (check.result == "ERROR") {

                        res.send(JSON.stringify(check));

                    } else {

                        board_utility.checkRestInputs(req, function (check) {

                            if (check.result == "ERROR") {
                                res.send(JSON.stringify(check));

                            } else {

                                logger.info('[GPIO] - DIGITAL WRITE on board: ' + board + ' - digital pin ' + pin + ' with value ' + value);

                                session.call('s4t'+ board + '.gpio.write.digital', [board, "digital", pin, value]).then(
                                    function (rpc_response) {

                                        if (rpc_response.result == "ERROR") {
                                            logger.error("[GPIO] - Write Digital PIN: " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }
                                        else {
                                            logger.debug("[GPIO] - Write Digital PIN: " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }
                                    }
                                );

                            }

                        });

                    }

                });

                
            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }

        });

                } else{

                    response.message = "Your device model does not support this API!";
                    response.result = "ERROR";
                    logger.warn("[GPIO] --> " + response.message);
                    res.send(JSON.stringify(response));

                }


            }

        });


    });


    //set PIN mode
    rest.post('/v1/boards/:board/gpio/mode', function (req, res) {

        logger.debug("[API] - GPIO Set Mode - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;

        db.getLayoutByBoardId(board, function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting board data: " + data.message;
                response.result = "ERROR";
                logger.error("[GPIO] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {

                var board_type = data.message[0].id_layout;
                var board_model = data.message[0].model;
                logger.debug("[GPIO] - Board layout: " + board_type + " - " + board_model);

                if(board_type === "1"){ //is an Arduino YUN

                    board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS" ){

                var mode = req.body.mode;
                var pin = req.body.pin;

                var APIparamsList= {"mode":mode, "pin":pin};

                board_utility.checkDefInputs(APIparamsList, function (check){

                    if(check.result == "ERROR"){

                        res.send(JSON.stringify(check));

                    }else {

                        board_utility.checkRestInputs(req, function (check){

                            if(check.result == "ERROR"){
                                res.send(JSON.stringify(check));

                            }else {

                                logger.info("[GPIO] - Set pin "+pin+" mode ("+mode+") on board " + board);

                                session.call('s4t'+ board + '.gpio.setmode', [pin, mode]).then(
                                    function (rpc_response) {

                                        if(rpc_response.result == "ERROR"){
                                            logger.error("[GPIO] - SetMode: " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }
                                        else{
                                            logger.debug("[GPIO] - SetMode: " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }


                                    }
                                );

                            }

                        });

                    }

                });


            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }

        });

                } else{

                    response.message = "Your device model does not support this API!";
                    response.result = "ERROR";
                    logger.warn("[GPIO] --> " + response.message);
                    res.send(JSON.stringify(response));

                }


            }

        });




    });

    

    logger.debug("[REST-EXPORT] - GPIO's APIs exposed!");


};


module.exports = gpio_utils;