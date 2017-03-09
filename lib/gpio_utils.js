/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2016 Nicola Peditto
*/


//service logging configuration: "gpio_utils"
var logger = log4js.getLogger('gpio_utils');
logger.setLevel(loglevel);

var node_utility = require('./node_utils');

var session_wamp;

var response = {
    message: '',
    result: ''
};


gpio_utils = function (session, rest) {

    session_wamp = session;

    // GPIO MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //set PIN mode
    rest.post('/v1/gpio/mode/:node', function (req, res) {

        logger.debug("[API] - GPIO Set Mode - " + Object.keys( req.route.methods ) + " - " + req.route.path);
        
        var node = req.params.node;

        node_utility.checkNodeAvailable(node, res, function (available){

            if(available.result == "SUCCESS" ){

                var mode = req.body.mode;
                var pin = req.body.pin;

                var APIparamsList= {"mode":mode, "pin":pin};

                node_utility.checkDefInputs(APIparamsList, function (check){

                    if(check.result == "ERROR"){

                        res.send(JSON.stringify(check));

                    }else {

                        node_utility.checkRestInputs(req, function (check){

                            if(check.result == "ERROR"){
                                res.send(JSON.stringify(check));

                            }else {

                                logger.info("[GPIO] - Set pin "+pin+" mode ("+mode+") on node " + node);

                                session.call(node + '.command.rpc.setmode', [pin, mode]).then(
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



        





    });

    //read/write analog PIN
    rest.post('/v1/gpio/analog/:node', function (req, res) {

        logger.debug("[API] - GPIO Analog Operation - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var node = req.params.node;
        
        node_utility.checkNodeAvailable(node, res, function (available){

            if(available.result == "SUCCESS"){

                var op = req.body.op;
                var pin = req.body.pin;
                var value = req.body.value;

                var APIparamsList= {"op":op, "pin":pin};

                var checkOp = true;

                var response = {
                    message: '',
                    result: {}
                };

                if (op == "write" ){
                    
                    if(value == "" || value == undefined){

                        logger.info("[API] --> GPIO write operation needs a value!");
                        checkOp = false

                    }

                }

                if(checkOp){

                    node_utility.checkDefInputs(APIparamsList, function (check) {

                        if (check.result == "ERROR") {

                            res.send(JSON.stringify(check));

                        } else {

                            node_utility.checkRestInputs(req, function (check) {

                                if (check.result == "ERROR") {
                                    res.send(JSON.stringify(check));

                                } else {

                                    if (op == "write") {

                                        logger.info('[GPIO] - ANALOG WRITE on node: ' + node + ' - pin ' + pin + ' with value ' + value);
                                        session.call(node + '.command.rpc.write.analog', [node, "analog", pin, value]).then(
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
                                    else if (op == "read") {

                                        logger.info('[GPIO] - ANALOG READ on node: ' + node + ' - pin ' + pin);
                                        session.call(node + '.command.rpc.read.analog', [node, "analog", pin]).then(
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

                                    }
                                    else {
                                        var message = 'Wrong analog PIN operation: ' + op + ' operation not supported!';
                                        var result = 'ERROR';
                                        logger.warn('[GPIO] - ' + message);
                                        response.message = message;
                                        response.result = result;
                                        res.send(JSON.stringify(response));
                                    }
                                }

                            });

                        }

                    });

                }else{
                    response.result = "ERROR";
                    response.message = "You need to specify a value when perform a write operation!";
                    logger.error("[API] --> " + response.message);
                    res.send(JSON.stringify(response));
                }


            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }

        });
        
        



    });

    //read/write digital PIN
    rest.post('/v1/gpio/digital/:node', function (req, res) {

        logger.debug("[API] - GPIO Digital Operation - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var node = req.params.node;

        node_utility.checkNodeAvailable(node, res, function (available){

            if(available.result == "SUCCESS"){

                var op = req.body.op;
                var value = req.body.value;
                var pin = req.body.pin;

                var APIparamsList= {"op":op, "pin":pin};
                
                node_utility.checkDefInputs(APIparamsList, function (check) {

                    if (check.result == "ERROR") {

                        res.send(JSON.stringify(check));

                    } else {

                        node_utility.checkRestInputs(req, function (check) {

                            if (check.result == "ERROR") {
                                res.send(JSON.stringify(check));

                            } else {

                                if (op == "write") {

                                    logger.info('[GPIO] - DIGITAL WRITE on node: ' + node + ' - digital pin ' + pin + ' with value ' + value);

                                    session.call(node + '.command.rpc.write.digital', [node, "digital", pin, value]).then(

                                        function (rpc_response) {

                                            if(rpc_response.result == "ERROR"){
                                                logger.error("[GPIO] - Write Digital PIN: " + rpc_response.message);
                                                res.send(JSON.stringify(rpc_response));
                                            }
                                            else{
                                                logger.debug("[GPIO] - Write Digital PIN: " + rpc_response.message);
                                                res.send(JSON.stringify(rpc_response));
                                            }
                                        }

                                    );
                                }
                                else if (op == "read") {

                                    logger.info('[GPIO] - DIGITAL READ on node: ' + node + ' - digital pin ' + pin);
                                    session.call(node + '.command.rpc.read.digital', [node, "digital", pin]).then(

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
                                }
                                else {
                                    var message = 'Wrong digital PIN operation: ' + op + ' operation not supported!';
                                    var result = 'ERROR';
                                    logger.warn('[GPIO] - ' + message);
                                    response.message = message;
                                    response.result = result;
                                    res.send(JSON.stringify(response));
                                }




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

    
    logger.debug("[REST-EXPORT] - GPIO's APIs exposed!");


};


module.exports = gpio_utils;