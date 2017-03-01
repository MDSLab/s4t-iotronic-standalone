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

gpio_utils = function (session, rest) {

    session_wamp = session;


    // GPIO MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //set PIN mode
    rest.post('/v1/gpio/mode/:node', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var node = req.params.node;
        var mode = req.body.mode;
        var pin = req.body.pin;

        node_utility.checkNodeAvailable(node, res, function (available){

            if(available == true){

                logger.info("[GPIO] - Set pin "+pin+" mode ("+mode+") on node " + node);
                var response = {
                    message: 'Set Mode',
                    result: {}
                };

                session.call(node + '.command.rpc.setmode', [pin, mode]).then(
                    function (result) {
                        response.error = result;
                        res.send(JSON.stringify(response));
                    }, session.log);
                
            }

        });



    });

    //read/write analog PIN
    rest.post('/v1/gpio/analog/:node', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var node = req.params.node;
        var op = req.body.op;
        var value = req.body.value;
        var pin = req.body.pin;


        node_utility.checkNodeAvailable(node, res, function (available){

            if(available == true){

                var response = {
                    message: '',
                    result: {}
                };

                if (op == "write") {
                    //DEBUG
                    logger.info('[GPIO] - ANALOG WRITE on node: ' + node + ' - pin ' + pin + ' with value ' + value);
                    response.message += ' Write';
                    session.call(node + '.command.rpc.write.analog', [node, "analog", pin, value]).then(
                        function (result) {
                            response.result = result;
                            res.send(JSON.stringify(response));
                        }, session.log);
                }
                else if (op == "read") {
                    //DEBUG message
                    logger.info('[GPIO] - ANALOG READ on node: ' + node + ' - pin ' + pin);
                    response.message += ' Read';
                    session.call(node + '.command.rpc.read.analog', [node, "analog", pin]).then(
                        function (result) {
                            response.result = result;
                            res.send(JSON.stringify(response));
                        }, session.log);
                }
                else {
                    var message = 'Wrong analog operation: ' + op + ' operation not supported!';
                    var result = 'ERROR';
                    logger.warn('[GPIO] - ' + message);
                    response.message = message;
                    response.result = result;
                    res.send(JSON.stringify(response));
                }

            }

        });
        
        



    });

    //read/write digital PIN
    rest.post('/v1/gpio/digital/:node', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var node = req.params.node;
        var op = req.body.op;
        var value = req.body.value;
        var pin = req.body.pin;
        
        node_utility.checkNodeAvailable(node, res, function (available){

            if(available == true){

                var response = {
                    message: '',
                    result: {}
                };

                if (op == "write") {
                    //DEBUG
                    logger.info('[GPIO] - DIGITAL WRITE on node: ' + node + ' - digital pin ' + pin + ' with value ' + value);
                    response.message += 'Write';
                    session.call(node + '.command.rpc.write.digital', [node, "digital", pin, value]).then(
                        function (result) {
                            response.result = result;
                            res.send(JSON.stringify(response));
                            //res.send("callback("+JSON.stringify(response)+")");  //JSONP callback
                        }, session.log);
                }
                else if (op == "read") {
                    //DEBUG Message
                    logger.info('[GPIO] - DIGITAL READ on node: ' + node + ' - digital pin ' + pin);
                    response.message += 'Read';
                    session.call(node + '.command.rpc.read.digital', [node, "digital", pin]).then(
                        function (result) {
                            response.result = result;
                            res.send(JSON.stringify(response));
                        }, session.log);
                }
                else {
                    var message = 'Wrong digital operation: ' + op + ' operation not supported!';
                    var result = 'ERROR';
                    logger.warn('[GPIO] - ' + message);
                    response.message = message;
                    response.result = result;
                    res.send(JSON.stringify(response));
                }
            }

        });


        

    });

    
    logger.debug("[REST-EXPORT] - GPIO's APIs exposed!");


};


module.exports = gpio_utils;