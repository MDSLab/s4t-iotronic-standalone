/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2016 Nicola Peditto
*/


//service logging configuration: "gpio_utils"
var logger = log4js.getLogger('service_utils');
logger.setLevel(loglevel);

var db_utils = require('./mysql_db_utils');
var db = new db_utils;
var board_utility = require('./board_utils');

var session_wamp;

var response = {
    message: '',
    result: ''
};


services_utils = function (session, rest) {

    session_wamp = session;

    // SERVICES MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //GET services list
    rest.get('/v1/services/', function (req, res) {

        logger.debug("[API] - Services list - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var response = {
            message: '',
            result: ''
        };

        db_utils.prototype.getServicesList(function (data) {
            if(data.result=="ERROR"){
                response.message = data.message;
                response.result = "ERROR";
                logger.error("[SERVICE] --> " + JSON.stringify(response.message));
                res.send(JSON.stringify(response));

            }else{
                response.message = data.message;
                response.result = "SUCCESS";
                res.send(JSON.stringify(response));

            }
        });


    });

    //CREATE service in Iotronic
    rest.post('/v1/services/', function (req, res) {

        logger.debug("[API] - Create service - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var service_name = req.body.service_name;
        var port = req.body.port;
        var protocol = req.body.protocol;


        var APIparamsList= {"service_name":service_name, "port":port, "protocol":protocol};

        board_utility.checkDefInputs(APIparamsList, function (check){

            if(check.result == "ERROR"){

                res.send(JSON.stringify(check));

            }else {

                board_utility.checkRestInputs(req, function (check){

                    if(check.result == "ERROR"){
                        res.send(JSON.stringify(check));

                    }else {

                        services_utils.prototype.createService(service_name, port, protocol, res);

                    }

                });

            }

        });


    });

    //UPDATE service in Iotronic
    rest.patch('/v1/services/:service', function (req, res) {

        logger.debug("[API] - Update service - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var service = req.params.service;
        var service_name = req.body.service_name;
        var port = req.body.port;
        var protocol = req.body.protocol;


        var APIparamsList= {"service_name":service_name, "port":port, "protocol":protocol};

        board_utility.checkDefInputs(APIparamsList, function (check){

            if(check.result == "ERROR"){

                res.send(JSON.stringify(check));

            }else {

                board_utility.checkRestInputs(req, function (check){

                    if(check.result == "ERROR"){
                        res.send(JSON.stringify(check));

                    }else {

                        services_utils.prototype.updateService(service, service_name, port, protocol, res);

                    }

                });

            }

        });


    });

    //DELETE service from Iotronic
    rest.delete('/v1/services/:service', function (req, res) {

        logger.debug("[API] - Destroy service - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var service_name = req.params.service;

        services_utils.prototype.deleteService(service_name, res);


    });

    //ACTION service on board
    rest.post('/v1/boards/:board/services/:service/action', function (req, res) {

        logger.debug("[API] - Service Operation - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;
        var service_name = req.params.service;  // ssh | tty | ideino | osjs

        var response = {
            message: '',
            result: {}
        };

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var service_action = req.body.service_action; // enable | disable

                if (service_action == "enable" || service_action == "disable" || service_action == "restore") {

                    var APIparamsList = {"service_action": service_action};

                    board_utility.checkDefInputs(APIparamsList, function (check) {

                        if (check.result == "ERROR") {

                            res.send(JSON.stringify(check));

                        } else {


                            
                            board_utility.checkRestInputs(req, function (check) {

                                if (check.result == "ERROR") {
                                    res.send(JSON.stringify(check));

                                } else {

                                    services_utils.prototype.manageService(board, service_name, null, service_action, res);
                                    //services_utils.prototype.manageService(board, service_name, service_action, res);
                                }

                            });

                        }

                    });

                } else {

                    response.result = "ERROR";
                    response.message = "Service action " + service_action + " is not supported! [ 'enable' | 'disable' ]";
                    logger.error("[API] --> " + response.message);
                    res.send(JSON.stringify(response.message));

                }


            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }

        });

    });

    //GET services list inside a board
    rest.get('/v1/boards/:board/services', function (req, res) {

        logger.debug("[API] - Board services list - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;

        var response = {
            message: '',
            result: ''
        };

        logger.debug("[SERVICE] - Services list for the board " + board);

        db.getBoardServices(board, function (data) {

            if(data.result=="ERROR"){
                response.message = data.message;
                response.result = "ERROR";
                logger.error("[SERVICE] --> " + response.message);
                res.send(JSON.stringify(response));

            }else{
                response.message = data.message;
                response.result = "SUCCESS";
                res.send(JSON.stringify(response));

            }

        });


    });
    

    logger.debug("[REST-EXPORT] - Services's APIs exposed!");


};





services_utils.prototype.createService = function (service_name, port, protocol, res) {

    logger.info("[SERVICE] - CREATING service " + service_name + "...");

    var response = {
        message: '',
        result: ''
    };

    try{

        db.getServiceByName(service_name, function (data) {

            if (data.result == "ERROR") {

                response.message = data.message;
                response.result = "ERROR";
                logger.warn("[SERVICE] --> " + response.message);
                res.send(response);

            } else {

                if (data.message[0] === undefined) {

                    db.registerService(service_name, port, protocol, function (result_db) {

                        if (result_db.result == "ERROR") {
                            logger.error("[SERVICE] --> createService - DB write error: " + result_db.message);
                            response.message = result_db.message;
                            response.result = "ERROR";
                            res.send(response);

                        } else {

                            response.message = "Service " + service_name + " successfully created in IoTronic!";
                            response.result = "SUCCESS";
                            logger.info("[SERVICE] --> " +response.message);
                            res.send(JSON.stringify(response));

                        }

                    });



                }
                else {

                    response.message = "Service " + service_name + " already exist!";
                    response.result = "ERROR";
                    logger.warn("[SERVICE] --> " + response.message);
                    res.send(JSON.stringify(response));

                }

            }

        });

    }
    catch (err) {
        response.message = "Plugin config is not a JSON: " + err;
        response.result = "ERROR";
        logger.error("[PLUGIN] --> " + response.message);
        res.send(JSON.stringify(response));
    }


};


services_utils.prototype.updateService = function (service, service_name, port, protocol, res) {

    logger.info("[SERVICE] - UPDATING service " + service + "...");

    var response = {
        message: '',
        result: ''
    };

    try{

        db.getServiceByName(service, function (data) {

            if (data.result == "ERROR") {

                response.message = data.message;
                response.result = "ERROR";
                logger.warn("[SERVICE] --> " + response.message);
                res.send(response);

            } else {

                if (data.message[0] === undefined) {


                    response.message = "Service " + service + " does not exist!";
                    response.result = "ERROR";
                    logger.warn("[SERVICE] --> " + response.message);
                    res.send(JSON.stringify(response));


                }
                else {
                    
                    db.updateService(service, service_name, port, protocol, function (result_db) {

                        if (result_db.result == "ERROR") {
                            logger.error("[SERVICE] --> updateService - DB write error: " + result_db.message);
                            response.message = result_db.message;
                            response.result = "ERROR";
                            res.send(response);

                        } else {

                            response.message = "Service " + service_name + " successfully updated!";
                            response.result = "SUCCESS";
                            logger.info("[SERVICE] --> " +response.message);
                            res.send(JSON.stringify(response));

                        }

                    });

                }

            }

        });

    }
    catch (err) {
        response.message = "Plugin config is not a JSON: " + err;
        response.result = "ERROR";
        logger.error("[PLUGIN] --> " + response.message);
        res.send(JSON.stringify(response));
    }


};


services_utils.prototype.deleteService = function (service_name, res) {

    logger.info("[SERVICE] - Deleting service " + service_name + " from Iotronic...");

    var response = {
        message: '',
        result: ''
    };

    db.getServiceByName(service_name, function (data) {

        if (data.result == "ERROR") {
            response.message = data.message;
            response.result = "ERROR";
            logger.warn("[PLUGIN] --> " + response.message);
            res.send(response);

        } else {

            if (data.message[0] === undefined) {
                response.message = "Service " + service_name + " does not exist!";
                response.result = "ERROR";
                logger.warn("[SERVICE] --> " + response.message);
                res.send(JSON.stringify(response));

            }
            else {

                db.deleteService(service_name, function (result_db) {

                    if (result_db.result == "ERROR") {
                        logger.warn("[SERVICE] --> Delete DB error: " + result_db.message);
                        response.message = result_db.message;
                        response.result = "ERROR";
                        res.send(response);

                    } else {

                        response.message = "Service " + service_name + " successfully deleted from IoTronic!";
                        response.result = "SUCCESS";
                        logger.info("[SERVICE] --> " +response.message);
                        res.send(JSON.stringify(response));

                    }

                });


            }

        }



    });

};


services_utils.prototype.manageService = function (board_id, service_name, service_id, service_action, res) {

    var response = {
        message: '',
        result: {}
    };

    var service_msg = {
        ip: IPLocal,
        public_port: "",
        service: ""
    };

    getServiceInfo(service_name, service_id, function (service_info) {

        if (service_info.result == "ERROR") {

            logger.error("[SERVICE] --> getServiceInfo error: " + service_info.message);
            if(res != false)
                res.send(JSON.stringify(service_info.message));

        } else {

            service_name = service_info.message.name;
            var localport = service_info.message.localport;
            service_id = service_info.message.id;

            switch (service_action) {

                case 'restore':

                    logger.info("[SERVICE] - Restoring tunnel of '" + service_name + "' service of the board " + board_id + "...");

                    db.getActiveService(service_id, board_id, function (data_p) {

                        if (data_p.result == "ERROR") {

                            response.result = data_p.result;
                            response.message = "DB getActiveService error for " + service_name + ": " + data_p.message;
                            logger.error("[SERVICE] --> " + response.message);

                        } else {

                            var publicPort = data_p.message[0].public_port;
                            //logger.info("[SERVICE] --> Public port to restore: " + publicPort);
                            
                            var restore = true;

                            session_wamp.call('s4t.' + board_id + '.service.enable', [service_name, localport, publicPort, restore]).then(

                                function (service_result) {

                                    if (service_result.result === "SUCCESS") {

                                        response.message = service_msg;
                                        response.result = "SUCCESS";
                                        logger.info("[SERVICE] --> " + service_result.message);

                                    } else {

                                        response.result = "ERROR";
                                        response.message = "Problem exposing service: " + service_result.message;
                                        logger.error("[SERVICE] --> " + response.message);

                                    }

                                }
                            );

                        }

                    });



                    break;

                case 'enable':

                    logger.info("[SERVICE] - Exposing '" + service_name + "' service of the board " + board_id + "...");

                    db.getActiveService(service_id, board_id, function (data_p) {

                        if (data_p.result == "ERROR") {

                            response.result = data_p.result;
                            response.message = "DB getActiveService error for " + service_name + ": " + data_p.message;
                            logger.error("[SERVICE] --> " + response.message);
                            if(res != false)
                                res.send(JSON.stringify(response));

                        } else {


                            if (data_p.message[0] != undefined) {

                                session_wamp.call('s4t.' + board_id + '.service.checkService', [service_name]).then(

                                    function (service_result) {

                                        if (service_result.result === "WARNING") {

                                            if (service_result.message.status === "ACTIVE") {

                                                response.message = "Service " + service_name + " already exposed!";
                                                response.result = "WARNING";
                                                logger.warn("[SERVICE] --> " + response.message);
                                                if(res != false)
                                                    res.send(JSON.stringify(response));

                                            }

                                        }else{

                                            if (service_result.result === "SUCCESS") {

                                                if (service_result.message.status === "INACTIVE") {

                                                    logger.warn("[SERVICE] --> " + service_name + " service of board " + board_id + " is in wrong state.. Updating...");

                                                    //UPDATE DB
                                                    db.removeTunnel(service_id, board_id, function (check_result) {

                                                        if (check_result.result == "ERROR") {
                                                            response.result = check_result.result;
                                                            response.message = check_result.message;
                                                            logger.error("[SERVICE] --> DB removeTunnel error for board " + board_id + ": " + response.message);
                                                            if(res != false)
                                                                res.send(JSON.stringify(response));

                                                        } else {

                                                            response.message = service_name + " service status of board " + board_id + " updated! Please try enabling the service again!";
                                                            response.result = "SUCCESS";
                                                            logger.info("[SERVICE] --> " + response.message);
                                                            if(res != false)
                                                                res.send(JSON.stringify(response));

                                                        }

                                                    });

                                                }

                                            }



                                        }

                                    }
                                );


                            } else {

                                //newPort function is used because we need a TCP port not already used
                                newPort(function (publicPort) {

                                    if (publicPort.result == "ERROR") {

                                        logger.error("[SERVICE] --> getServiceInfo error: " + publicPort.message);
                                        if(res != false)
                                            res.send(JSON.stringify(publicPort));

                                    } else {

                                        logger.debug("[SERVICE] --> Public port generated: " + publicPort.message);

                                        session_wamp.call('s4t.' + board_id + '.service.enable', [service_name, localport, publicPort.message]).then(

                                            function (service_result) {

                                                if (service_result.result === "SUCCESS") {

                                                    //UPDATE DB
                                                    db.registerTunnel(service_name, board_id, publicPort.message, function (check_result) {

                                                        if (check_result.result == "ERROR") {
                                                            response.result = check_result.result;
                                                            response.message = check_result.message;
                                                            logger.error("[SERVICE] --> DB registerTunnel error for board " + board_id + ": " + response.message);
                                                            if(res != false)
                                                                res.send(JSON.stringify(response));

                                                        } else {

                                                            service_msg.public_port = publicPort.message;
                                                            service_msg.service = service_name;

                                                            if (service_name === "SSH"){

                                                                response.message = "SSH command:   ssh -p " + publicPort.message + " root@"+IPLocal;

                                                            }else
                                                                response.message = service_msg;

                                                            response.result = "SUCCESS";
                                                            logger.info("[SERVICE] --> " + service_result.message);
                                                            if(res != false)
                                                                res.send(JSON.stringify(response));
                                                            

                                                        }

                                                    });



                                                } else {

                                                    response.result = "ERROR";
                                                    response.message = "Problem exposing service: " + service_result.message;
                                                    logger.info("[SERVICE] --> " + response.message);
                                                    if(res != false)
                                                        res.send(JSON.stringify(response));

                                                }

                                            }
                                        );


                                    }

                                });

                            }



                        }



                    });



                    break;


                case 'disable':

                    logger.info("[SERVICE] - Disabling tunnel for service " + service_name + " in the board " + board_id +" ( local port = "+localport+" )");

                    db.getActiveService(service_id, board_id, function (data_p) {

                        if (data_p.result == "ERROR") {

                            response.result = data_p.result;
                            response.message = "DB getActiveService error for " + service_name + ": " + data_p.message;
                            logger.error("[SERVICE] --> " + response.message);
                            if(res != false)
                                res.send(JSON.stringify(response));

                        } else {


                            if (data_p.message[0] == undefined) {

                                response.message = "Service " + service_name + " not exposed for the board " + board_id;
                                response.result = "WARNING";
                                logger.warn("[SERVICE] --> " + response.message);
                                if(res != false)
                                    res.send(JSON.stringify(response));

                            } else {

                                var publicPort = data_p.message[0].public_port;

                                session_wamp.call('s4t.' + board_id + '.service.disable', [service_name]).then(

                                    function (service_result) {

                                        if (service_result.result === "SUCCESS") {

                                            //UPDATE DB
                                            db.removeTunnel(service_id, board_id, function (check_result) {

                                                if (check_result.result == "ERROR") {
                                                    response.result = check_result.result;
                                                    response.message = check_result.message;
                                                    logger.error("[SERVICE] --> DB removeTunnel error for board " + board_id + ": " + response.message);
                                                    if(res != false)
                                                        res.send(JSON.stringify(response));

                                                } else {

                                                    response.message = "Tunnel for service " + service_name + " disabled on board " + board_id + " (public port = "+publicPort+")";
                                                    response.result = "SUCCESS";
                                                    logger.info("[SERVICE] --> " + response.message);
                                                    if(res != false)
                                                        res.send(JSON.stringify(response));

                                                }

                                            });



                                        } else {

                                            if (service_result.result === "ERROR") {

                                                response.result = "ERROR";
                                                response.message = "Problem exposing service: " + service_result.message;
                                                logger.info("[SERVICE] --> " + response.message);
                                                if(res != false)
                                                    res.send(JSON.stringify(response));

                                            }else if (service_result.result === "WARNING"){

                                                logger.warn("[SERVICE] --> " + service_name + " service of board " + board_id + " is in wrong state.. Updating...");

                                                if (service_result.message.status === "INACTIVE"){

                                                    //UPDATE DB
                                                    db.removeTunnel(service_id, board_id, function (check_result) {

                                                        if (check_result.result == "ERROR") {
                                                            response.result = check_result.result;
                                                            response.message = check_result.message;
                                                            logger.error("[SERVICE] --> DB removeTunnel error for board " + board_id + ": " + response.message);
                                                            if(res != false)
                                                                res.send(JSON.stringify(response));

                                                        } else {

                                                            response.result = "WARNING";
                                                            response.message = service_result.message.message + " - Database updated!";
                                                            logger.info("[SERVICE] --> " + response.message);
                                                            if(res != false)
                                                                res.send(JSON.stringify(response));
                                                        }

                                                    });




                                                }

                                            }



                                        }

                                    }
                                );



                            }

                        }

                    });

                    break;

                default:
                    response.result = "ERROR";
                    response.message = "Service action " + service_action + " is not supported! [ 'enable' | 'disable' ]";
                    logger.warn("[SERVICE] --> " + response.message);
                    if(res != false)
                        res.send(JSON.stringify(response.message));

                    break;

            }






        }
        
    });



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
            logger.error("[SERVICE] --> DB checkPort error: " + data.message);
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


// Function to get information about a service registered in Iotronic specifying its name or id
function getServiceInfo(service_name, service_id, callback) {

    var response = {
        message: '',
        result: ''
    };

    var service = {
        name: '',
        localport: '',
        id:''
    };
    
    if(service_id == null){
        
        db.getServiceByName(service_name, function (data) {

            if (data.result == "ERROR") {

                response.message = data.message;
                response.result = "ERROR";
                logger.warn("[SERVICE] --> " + response.message);
                res.send(response);

            } else {

                if (data.message[0] === undefined) {

                    response.message = "Service " + service_name + " does not exist!";
                    response.result = "ERROR";
                    logger.error("[SERVICE] --> " + response.message);
                    callback(response);

                } else {

                    service.id = data.message[0].id;
                    service.localport = data.message[0].port;
                    service.name = service_name;

                    response.message = service;
                    response.result = "SUCCESS";

                    callback(response);

                }


            }

        });
        
    } else if (service_name == null){

        db.getServiceById(service_id, function (data) {

            if (data.result == "ERROR") {

                response.message = data.message;
                response.result = "ERROR";
                logger.warn("[SERVICE] --> " + response.message);
                res.send(response);

            } else {

                if (data.message[0] === undefined) {

                    response.message = "Service " + service_id + " does not exist!";
                    response.result = "ERROR";
                    logger.error("[SERVICE] --> " + response.message);
                    callback(response);

                } else {

                    service.id = service_id;
                    service.localport = data.message[0].port;
                    service.name = data.message[0].name;

                    response.message = service;
                    response.result = "SUCCESS";
                    callback(response);


                }


            }

        });


    }




}


module.exports = services_utils;