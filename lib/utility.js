/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2014 2015 Andrea Rocco Lotronto, Nicola Peditto, Fabio Verboso
 */

//service logging configuration: "utility"   
var logger = log4js.getLogger('utility');
logger.setLevel(loglevel);

var db_utils = require('./mysql_db_utils');
var db = new db_utils;
var board_utility = require('./board_utils');


var networkInterfaces = require('os').networkInterfaces();

var session_wamp;

var spawn = require('child_process').spawn;

var Q = require("q");

/*
utility = function (session, rest) {

    session_wamp = session;

    // SERVICES MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //start|stop services on board
    rest.post('/v1/boards/:board/services/action', function (req, res) {

        logger.debug("[API] - Service Operation - " + Object.keys(req.route.methods) + " - " + req.route.path);

        var board = req.params.board;


        board_utility.checkBoardAvailable(board, res, function (available) {

            if (available.result == "SUCCESS") {

                var command = req.body.command; // ssh | tty | ideino | osjs
                var op = req.body.op;  // start | stop

                var APIparamsList = {"command": command, "op": op};

                board_utility.checkDefInputs(APIparamsList, function (check) {

                    if (check.result == "ERROR") {

                        res.send(JSON.stringify(check));

                    } else {


                        board_utility.checkRestInputs(req, function (check) {

                            if (check.result == "ERROR") {
                                res.send(JSON.stringify(check));

                            } else {

                                utility.prototype.exportService(board, command, op, res);

                            }

                        });

                    }

                });

            } else if (available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }

        });

    });


    //GET services list inside a board
    rest.get('/v1/boards/:board/services', function (req, res) {

        logger.debug("[API] - Board services list - " + Object.keys(req.route.methods) + " - " + req.route.path);

        var board = req.params.board;

        var response = {
            message: '',
            result: ''
        };

        logger.debug("[SERVICE] - Services list for the board " + board);

        db.BoardServices(board, function (data) {

            if (data.result == "ERROR") {
                response.message = data.message;
                response.result = "ERROR";
                logger.error("[SERVICE] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                response.message = data.message;
                response.result = "SUCCESS";
                res.send(JSON.stringify(response));

            }

        });


    });


    logger.debug("[REST-EXPORT] - Utility's APIs exposed!");


};


utility.prototype.exportService = function (board, command, op, res) {

    var service_msg = {
        ip: IPLocal,
        port: {},
        service: command
    };

    var response = {
        message: '',
        result: ''
    };


    if (op == "start" || op == "stop") {

        logger.debug("[SERVICE] - Service called: " + command);

        if (op == "start") {

            db.checkService(board, command, function (data) {

                if (data.result == "ERROR") {
                    response.result = data.result;
                    response.message = data.message;
                    logger.error("[SERVICE] --> DB checkService error for board " + board + ": " + response.message);
                    res.send(JSON.stringify(response));

                } else {

                    if (data.message.length == 0) {

                        //newPort function is used because we need a TCP port not already used
                        newPort(function (port) {

                            if (port.result == "ERROR") {

                                logger.error("[SERVICE] --> DB checkService error for board " + board + ": " + port.message);
                                res.send(JSON.stringify(port));

                            } else {

                                logger.info("[SERVICE] - " + topic_command + ' ' + board + ' ' + command + ' ' + port.message + ' ' + op);

                                session_wamp.publish(topic_command, [board, command, port.message, op], {}, {acknowledge: true}).then(
                                    function (publication) {

                                        //logger.debug('[SERVICE] --> WAMP publication OK!');

                                        logger.info("[SERVICE] - Service " + command + " started on board " + board + "!");

                                        db.insertService(board, command, IPLocal, port.message, function (check_result) {

                                            if (check_result.result == "ERROR") {
                                                response.result = check_result.result;
                                                response.message = check_result.message;
                                                logger.error("[SERVICE] --> DB insertService error for board " + board + ": " + response.message);
                                                res.send(JSON.stringify(response));

                                            } else {

                                                service_msg.port = port.message;
                                                service_msg.status = op;

                                                if (command === "ssh") {

                                                    response.message = "SSH command:   ssh -p " + port.message + " root@" + IPLocal;

                                                } else
                                                    response.message = service_msg;

                                                response.result = "SUCCESS";
                                                res.send(JSON.stringify(response));

                                            }

                                        });

                                    },
                                    function (error) {

                                        logger.error("[SERVICE] --> WAMP publication error (service start) on board " + board + "!");

                                        response.result = check_result.result;
                                        response.message = "WAMP communication error: " + error;
                                        logger.error("[SERVICE] --> " + response.message);
                                        res.send(JSON.stringify(response));

                                    }
                                );

                            }


                        });

                    }
                    else {

                        response.message = command + " service is already started on the board " + board + "!";
                        response.result = "WARNING";

                        logger.warn("[SERVICE] - " + response.message);

                        res.send(JSON.stringify(response));

                    }

                }


            });


        }


        if (op == "stop") {

            db.checkService(board, command, function (data) {

                if (data.result == "ERROR") {
                    response.result = data.result;
                    response.message = data.message;
                    logger.error("[SERVICE] --> DB checkService error for board " + board + ": " + response.message);
                    res.send(JSON.stringify(response));

                } else {

                    if (data.message.length == 0) {

                        response.message = command + " service is already stopped on the board " + board + "!";
                        response.result = "WARNING";
                        logger.warn("[SERVICE] - " + response.message);

                        res.send(JSON.stringify(response));

                    }
                    else {

                        var port = data.message[0].public_port;

                        session_wamp.publish(topic_command, [board, command, port, op], {}, {acknowledge: true}).then(
                            function (publication) {

                                //logger.debug('[SERVICE] --> WAMP publication OK!');

                                db.removeService(board, command, function (check_result) {

                                    if (check_result.result == "ERROR") {
                                        response.result = check_result.result;
                                        response.message = check_result.message;
                                        logger.error("[SERVICE] --> DB removeService error for board " + board + ": " + response.message);
                                        res.send(JSON.stringify(response));

                                    } else {
                                        response.message = "Service " + command + " stopped on board " + board + " (port = " + port + ")";
                                        response.result = "WARNING";
                                        logger.info("[SERVICE] - " + response.message);
                                        res.send(JSON.stringify(response));

                                    }

                                });

                            },
                            function (error) {

                                logger.error("[SERVICE] --> WAMP publication error (service stop) on board " + board + "!");

                                response.result = check_result.result;
                                response.message = "WAMP communication error: " + error;
                                logger.error("[SERVICE] --> " + response.message);
                                res.send(JSON.stringify(response));

                            }
                        );


                    }

                }


            });
        }


    }
    else {

        response.message = "Operation '" + op + "' not supported!";
        response.result = "ERROR";

        logger.error("[SERVICE] - " + response.message);

        res.send(JSON.stringify(response));


    }
};




//This function returns a pseudo random number in a range
function randomIntInc(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}


//Function to calculate a new tcp port not already used
function newPort(callback) {

    var port = randomIntInc(6000, 7000);

    var response = {
        message: '',
        result: ''
    };

    db.checkPort(port, function (data) {

        if (data.result == "ERROR") {
            logger.error("[SERVICE] --> DB removeService error for board " + board + ": " + data.message);
            callback(data)

        } else {

            if (data.message.length == 0) {
                response.message = port;
                response.result = "SUCCESS";
                callback(response);
            }
            else
                newPort();

        }

    });

}

//This function return true if an array contains another array
function arrayContainsAnotherArray(needle, haystack) {
    for (var i = 0; i < needle.length; i++) {
        if (haystack[needle[i]] == undefined)
            return false;
    }
    return true;
}
*/

var execute = function (command, label) {

    cmd = command.split(' ');
    logger.debug(label + ' COMMAND: ' + command);
    var result = spawn(cmd[0], cmd.slice(1));

    result.stdout.on('data', function (data) {
        logger.debug(label + ' stdout: ' + data);
    });

    result.stderr.on('data', function (data) {
        if (command.indexOf('socat') > -1)
            logger.info(label + ' stderr: ' + data);
        else
            logger.error(label + ' stderr: ' + data);
    });

    return result;

};

//Function to get the IP associated to the NIC specified in the settings.json
var getIP = function (interface, version) {
    var ip = null;
    for (var ifName in networkInterfaces) {
        if (ifName == interface) {
            var ifDetails = networkInterfaces[ifName];
            for (var i = 0; ifDetails[i].family == version; i++) {
                ip = ifDetails[i].address;
            }
        }
    }

    return ip;
};


var ps = require('ps-node');

var checkProcessName = function (name, subcommand, callback) {

    //var d = Q.defer();

    var response = {
        message: '',
        result: ''
    };

    var alive = false;

    ps.lookup(
        {
            command: name,
            psargs: 'ux'
        }, 
        function(err, resultList ) {
            
            if (err) {
                throw new Error( err );
            }


            for(var key=0; key < resultList.length; key++) {

                (function(key) {

                    /*
                    console.log('PID: %s, COMMAND: %s, ARGUMENTS: %s', resultList[key].pid, resultList[key].command, resultList[key].arguments);
                    console.log(resultList[key].arguments[0])
                    console.log(resultList[key].arguments[0].indexOf(subcommand))
                    */

                    if ( resultList[key].arguments[0].indexOf(subcommand) > -1) {

                        alive = true;

                    }

                    if (key == resultList.length -1){
                        if(alive){
                            response.message = {command: "wstt", log:"WSTT is ALIVE"};
                            response.result = "SUCCESS";
                            callback(response);
                        }else{
                            response.message = {command: "wstt", log:"WSTT is DEAD"};
                            response.result = "ERROR";
                            callback(response);
                        }
                        
                    }

                })(key);

            }

             /*
            resultList.forEach(function( process ){

                if( process ) {

                    console.log('PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments);
                    console.log(process.arguments[0])
                    console.log(process.arguments[0].indexOf(subcommand));

                    if ( process.arguments[0].indexOf(subcommand) > -1) {
    
                        response.message = "WSTT is ALIVE";
                        response.result = "SUCCESS";

                        callback(response);



                        
                    }else{
                        response.message = "WSTT is DEAD";
                        response.result = "ERROR";
                        callback(response);
                    }

                }
            });*/


        });


    //return d.promise;
};


//module.exports = utility;
module.exports.execute = execute;
module.exports.getIP = getIP;
module.exports.checkProcessName = checkProcessName;
