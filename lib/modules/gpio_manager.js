//###############################################################################
//##
//# Copyright (C) 2016-2017 Nicola Peditto
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

//service logging configuration: "gpio_utils"
var logger = log4js.getLogger('gpio_utils');
logger.setLevel(loglevel);

var board_utility = require('./../management/mng_boards');
var db_utils = require('./../management/mng_db');
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

        logger.info("[API] - GPIO Analog Read - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

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

                if(board_type === 1){ //is an Arduino YUN

                    board_utility.checkBoardAvailable(board, res, function (available){

                        if(available.result == "SUCCESS"){

                            var pin = req.query.pin;

                            if( pin != "" && pin != undefined){

                                logger.info('[GPIO] - ANALOG READ on board ' + board + ' - PIN: ' + pin);

                                session.call('s4t.'+ board + '.gpio.read.analog', [board, "analog", pin]).then(
                                    function (rpc_response) {

                                        if(rpc_response.result == "ERROR"){
                                            logger.error("[GPIO] --> Error reading analog PIN " + pin + ": " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }
                                        else{
                                            logger.debug("[GPIO] --> Value read from analog PIN " + pin + ": " + rpc_response.message);
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

        logger.info("[API] - GPIO Digital Read - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

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

                if(board_type === 1){ //is an Arduino YUN

                    board_utility.checkBoardAvailable(board, res, function (available){

                        if(available.result == "SUCCESS"){

                            var pin = req.query.pin;

                            if( pin != "" && pin != undefined){

                                logger.info('[GPIO] - DIGITAL READ on board ' + board + ' - digital PIN: ' + pin);

                                session.call('s4t.'+ board + '.gpio.read.digital', [board, "digital", pin]).then(

                                    function (rpc_response) {

                                        if(rpc_response.result == "ERROR"){
                                            logger.error("[GPIO] --> Error reading digital PIN " + pin + ": " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }
                                        else{
                                            logger.debug("[GPIO] --> Value read from digital PIN " + pin + ": " + rpc_response.message);
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

        logger.info("[API] - GPIO Analog Write - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

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

                if(board_type === 1){ //is an Arduino YUN

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

                                logger.info('[GPIO] - ANALOG WRITE on board ' + board + ' - PIN ' + pin + ' with value ' + value);

                                session.call('s4t.'+ board + '.gpio.write.analog', [board, "analog", pin, value]).then(
                                    function (rpc_response) {

                                        if(rpc_response.result == "ERROR"){
                                            logger.error("[GPIO] --> Error writing analog PIN " + pin + ": " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }
                                        else{
                                            logger.debug("[GPIO] --> Write Analog: " + rpc_response.message);
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

        logger.info("[API] - GPIO Digital Write - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

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

                                logger.info('[GPIO] - DIGITAL WRITE on board ' + board + ' - digital PIN ' + pin + ' with value ' + value);

                                session.call('s4t.'+ board + '.gpio.write.digital', [board, "digital", pin, value]).then(
                                    function (rpc_response) {

                                        if (rpc_response.result == "ERROR") {
                                            logger.error("[GPIO] --> Error writing digital PIN " + pin + ": " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }
                                        else {
                                            logger.debug("[GPIO] --> Write digital: " + rpc_response.message);
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

        logger.info("[API] - GPIO Set Mode - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

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

                if(board_type === 1){ //is an Arduino YUN

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

                                logger.info("[GPIO] - Set PIN "+pin+" mode ("+mode+") on board " + board);

                                session.call('s4t.'+ board + '.gpio.setmode', [pin, mode]).then(
                                    function (rpc_response) {

                                        if(rpc_response.result == "ERROR"){
                                            logger.error("[GPIO] --> Error in SetMode: " + rpc_response.message);
                                            res.send(JSON.stringify(rpc_response));
                                        }
                                        else{
                                            logger.debug("[GPIO] --> SetMode: " + rpc_response.message);
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