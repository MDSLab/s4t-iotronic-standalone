/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2016 Nicola Peditto

 */


//service logging configuration: "driver_utils"   
var logger = log4js.getLogger('driver_utils');
logger.setLevel(loglevel);

var db_utils = require('./mysql_db_utils');
var db = new db_utils;

var board_utility = require('./board_utils');

var fs = require('fs');
var Q = require("q");

var session_wamp;

driver_utils = function (session, rest) {
    
    session_wamp = session;
    session_wamp.register('s4t.board.driver.updateStatus', updateDriverStatus);
    logger.debug("[WAMP-EXPORT] - Driver's RPCs exported!");


    // DRIVER MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //GET drivers list
    rest.get('/v1/drivers/', function (req, res) {

        logger.debug("[API] - Drivers list - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var response = {
            message: '',
            result: ''
        };

        db_utils.prototype.getDriverList(function (data) {

            if(data.result=="ERROR"){
                response.message = data.message;
                response.result = "ERROR";
                logger.error("[DRIVER] --> " + JSON.stringify(response.message));
                res.send(JSON.stringify(response));

            }else{
                response.message = data.message;
                response.result = "SUCCESS";
                res.send(JSON.stringify(response));

            }

        });


    });

    //GET drivers list on board
    rest.get('/v1/boards/:board/drivers', function (req, res) {

        logger.debug("[API] - Board drivers list - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;

        var response = {
            message: '',
            result: ''
        };


        logger.debug("[DRIVER] - Driver list for the board " + board);

        db_utils.prototype.getBoardDriverList(board, function (data) {

            if (data.result == "ERROR") {
                response.result = data.result;
                response.message = data.message;
                logger.error("[DRIVER] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                response = data;
                res.send(JSON.stringify(response));
            }


        });




    });

    //CREATE driver in Iotronic
    rest.post('/v1/drivers/', function (req, res) {

        logger.debug("[API] - Driver creation - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var drivername = req.body.drivername;
        var driverjson = req.body.driverjson;
        var drivercode = req.body.drivercode;

        var APIparamsList= {"drivername":drivername, "driverjson":driverjson, "drivercode":drivercode};

        board_utility.checkDefInputs(APIparamsList, function (check){

            if(check.result == "ERROR"){

                res.send(JSON.stringify(check));

            }else {

                board_utility.checkRestInputs(req, function (check){

                    if(check.result == "ERROR"){
                        res.send(JSON.stringify(check));

                    }else {

                        driver_utils.prototype.createDriver(drivername, driverjson, drivercode, res);

                    }

                });

            }

        });






    });

    //DESTROY driver from Iotronic
    rest.delete('/v1/drivers/:driver', function (req, res) {

        logger.debug("[API] - Destroy driver - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var drivername = req.params.driver;

        driver_utils.prototype.destroyDriver(drivername, res);

    });

    //INJECT driver inside a board
    rest.put('/v1/boards/:board/drivers', function (req, res) {

        logger.debug("[API] - Inject driver - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var drivername = req.body.driver;
                var onboot = req.body.onboot;

                var APIparamsList= {"drivername":drivername, "onboot":onboot};

                board_utility.checkDefInputs(APIparamsList, function (check){

                    if(check.result == "ERROR"){

                        res.send(JSON.stringify(check));

                    }else {

                        board_utility.checkRestInputs(req, function (check){

                            if(check.result == "ERROR"){
                                res.send(JSON.stringify(check));

                            }else {

                                driver_utils.prototype.injectDriver(board, drivername, onboot, res);

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

    //REMOVE drivers from board
    rest.delete('/v1/boards/:board/drivers/:driver', function (req, res) {

        logger.debug("[API] - Remove driver - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;
        var drivername = req.params.driver;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                driver_utils.prototype.removeDriver(board, drivername, res);

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }

        });

        

    });

    //ACTION driver on board
    //rest.post('/v1/drivers/:board', function (req, res) {
    rest.post('/v1/boards/:board/drivers/:driver/action', function (req, res) {

        logger.debug("[API] - Driver Operation - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;

        var drivername = req.params.driver;

        var checkremote = true;

        var response = {
            message: '',
            result: {}
        };
        
        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var remote_driver = req.body.remote_driver;
                var driveroperation = req.body.driveroperation; // mount | unmount
                var mirror_board = req.body.mirror_board;  //OPTIONAL

                if (driveroperation == "mount"){

                    var APIparamsList= {"remote_driver":remote_driver, "driveroperation":driveroperation};

                } else if (driveroperation == "unmount"){

                    var APIparamsList= {"driveroperation":driveroperation};

                } else {

                    logger.error("[API] --> Error in driver operation field: driveroperation =" + driveroperation)
                }

                if(mirror_board != "" && mirror_board != undefined){

                    logger.info("[API] --> Remote mounting using mirror board "+mirror_board);

                    if (remote_driver == "false")
                        checkremote = false

                }

                if(checkremote){

                    board_utility.checkDefInputs(APIparamsList, function (check){

                        if(check.result == "ERROR"){

                            res.send(JSON.stringify(check));

                        }else {

                            board_utility.checkRestInputs(req, function (check){

                                if(check.result == "ERROR"){
                                    res.send(JSON.stringify(check));

                                }else {

                                    driver_utils.prototype.manageDrivers(board, drivername, driveroperation, remote_driver, mirror_board, res);

                                }

                            });

                        }

                    });

                }else{
                    response.result = "ERROR";
                    response.message = "If you are specifying 'mirror_board' you have to set 'remote' flag to true!";
                    logger.error("[API] --> " + response.message);
                    res.send(JSON.stringify(response));
                }




            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }

        });



    });

    //READ driver files
    //rest.post('/v1/drivers/:board/read', function (req, res) {
    rest.post('/v1/boards/:board/drivers/read', function (req, res) {

        logger.debug("[API] - Driver Read - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var drivername = req.body.drivername;
                var driver_exp_filename = req.body.driver_exp_filename;

                var APIparamsList= {"drivername":drivername, "driver_exp_filename":driver_exp_filename};

                board_utility.checkDefInputs(APIparamsList, function (check){

                    if(check.result == "ERROR"){

                        res.send(JSON.stringify(check));

                    }else {

                        board_utility.checkRestInputs(req, function (check){

                            if(check.result == "ERROR"){
                                res.send(JSON.stringify(check));

                            }else {

                                driver_utils.prototype.readRemoteFile(board, drivername, driver_exp_filename, res);

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

    //WRITE driver files
    //rest.post('/v1/drivers/:board/write', function (req, res) {
    rest.post('/v1/boards/:board/drivers/write', function (req, res) {

        logger.debug("[API] - Driver Write - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var drivername = req.body.drivername;
                var driver_exp_filename = req.body.driver_exp_filename;
                var filecontent = req.body.filecontent;

                var APIparamsList= {"drivername":drivername, "driver_exp_filename":driver_exp_filename, "filecontent":filecontent};

                board_utility.checkDefInputs(APIparamsList, function (check){

                    if(check.result == "ERROR"){

                        res.send(JSON.stringify(check));

                    }else {

                        board_utility.checkRestInputs(req, function (check){

                            if(check.result == "ERROR"){
                                res.send(JSON.stringify(check));

                            }else {

                                driver_utils.prototype.writeRemoteFile(board, drivername, driver_exp_filename, filecontent, res);

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


    logger.debug("[REST-EXPORT] - Driver's APIs exposed!");


};


driver_utils.prototype.createDriver = function (drivername, driverjson, drivercode, res) {

    logger.info("[DRIVER] - Inserting new driver " + drivername + " in Iotronic...");

    var response = {
        message: '',
        result: ''
    };

    db.getDriverId(drivername, function (data) {

        if (data.result == "ERROR") {
            response.result = data.result;
            response.message = "DB getDriverId error for " + drivername + ": " + data.message;
            logger.error("[DRIVER] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            if (data.message[0] === undefined) {

                try {

                    var drivers_folder = IotronicHome + '/drivers';
                    var driver_path = drivers_folder + '/' + drivername;
                    var fileNameDriver = driver_path + '/' + drivername + '.js';
                    var fileNameSchema = driver_path + '/' + drivername + '.json';

                    logger.debug("[DRIVER] --> drivername = " + drivername + "\n driverjson = " + driverjson + "\n\n drivercode = " + drivercode);

                    fs.mkdir(driver_path, function () {

                        db.insertCreatedDriver(drivername, fileNameSchema, fileNameDriver, function (response_db) {

                            if (response_db.result == "ERROR") {
                                response.result = response_db.result;
                                response.message = "DB insertCreatedDriver error for " + drivername + ": " + response_db.message;
                                logger.error("[DRIVER] --> " + response.message);
                                res.send(JSON.stringify(response));

                            } else {

                                fs.writeFile(fileNameDriver, drivercode, function (err) {

                                    if (err) {
                                        response.result = "ERROR";
                                        response.message  = "Error writeFile " + drivername + " driver file creation: " + err;
                                        logger.error("[DRIVER] --> " + response.message);
                                        res.send(JSON.stringify(response));

                                    } else {

                                        fs.writeFile(fileNameSchema, driverjson, function (err) {
                                            if (err) {
                                                response.result = "ERROR";
                                                response.message = "Error writeFile " + drivername + " driver JSON file creation: " + err;
                                                logger.error("[DRIVER] --> " + response.message);
                                                res.send(JSON.stringify(response));

                                            } else {
                                                response.result = "SUCCESS";
                                                response.message = "Driver " + drivername + " injected into Iotronic successfully";
                                                logger.info("[DRIVER] --> " + response.message);
                                                res.send(JSON.stringify(response));
                                            }
                                        });


                                    }
                                });


                            }

                        });


                    });


                } catch (err) {
                    response.result = "ERROR";
                    response.message = "Error " + drivername + " driver creation: " + err;
                    logger.error("[DRIVER] --> " + response.message);
                    res.send(JSON.stringify(response));
                }


            } else {

                response.result = "ERROR";
                response.message = "Driver creation failed: " + drivername + " already exists!";
                logger.error("[DRIVER] --> " + response.message);
                res.send(JSON.stringify(response));


            }
            
        }

        

    });


};

driver_utils.prototype.removeDriver = function (board, drivername, res) {

    logger.info("[DRIVER] - Removing driver " + drivername + " from board " + board);

    var response = {
        message: '',
        result: ''
    };

    var driverId;
    var drivername;

    //I need to read the name of the driver from the DB
    db.getDriverId(drivername, function (data) {

        if (data.result == "ERROR") {
            response.result = data.result;
            response.message = "DB getDriverId error for " + drivername + ": " + data.message;
            logger.error("[DRIVER] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            if (data.message[0] === undefined) {

                response.message = "Driver " + drivername + " does not exist!";
                response.result = "ERROR";
                logger.error("[DRIVER] --> " + response.message);
                res.send(JSON.stringify(response));


            } else {

                driverId = data.message[0].id;

                db.getInjectedDriver(driverId, board, function (data_p) {

                    if (data_p.result == "ERROR") {
                        response.result = data_p.result;
                        response.message = "DB getInjectedDriver error for " + drivername + ": " + data_p.message;
                        logger.error("[DRIVER] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {

                        if (data_p.message[0] === undefined) {

                            response.message = "Driver removal failed: " + drivername + " already removed!";
                            response.result = "ERROR";
                            logger.error("[DRIVER] --> " + response.message);
                            res.send(JSON.stringify(response));

                        } else {

                            //Now I can perform the RPC call
                            session_wamp.call('s4t.' + board + '.driver.removeDriver', [drivername]).then(
                                
                                function (result) {

                                    db.deleteInjectedDriver(board, driverId, function (data_p) {
                                        if (data_p.result == "ERROR") {
                                            response.result = data_p.result;
                                            response.message = "DB deleteInjectedDriver error for " + drivername + ": " + data_p.message;
                                            logger.error("[DRIVER] --> " + response.message);
                                            res.send(JSON.stringify(response));

                                        } else {

                                            response.message = "Driver " + drivername + " successfully removed from board " + board;
                                            response.result = "SUCCESS";
                                            logger.info("[DRIVER] --> " + response.message);
                                            res.send(JSON.stringify(response));
                                        }


                                    });

                                }, session_wamp.log);


                        }
                        
                    }

                    

                });

            }
            
        }

        


    });

};

driver_utils.prototype.injectDriver = function (board, drivername, onboot, res) {

    logger.info("[DRIVER] - INJECTING " + drivername + " driver into the board " + board + "...");

    var response = {
        message: '',
        result: ''
    };

    var driverId;
    var driverName;
    var driverFileName;

    //I need to read the name of the driver from the DB
    db.getDriverId(drivername, function (data) {

        if (data.result == "ERROR") {
            response.result = data.result;
            response.message = "DB getDriverId error for " + drivername + ": " + data.message;
            logger.error("[DRIVER] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            if (data.message[0] === undefined) {

                response.message = "Driver " + drivername + " does not exist!";
                response.result = "ERROR";
                logger.error("[DRIVER] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {

                driverId = data.message[0].id;

                db.getInjectedDriver(driverId, board, function (data_p) {

                    if (data_p.result == "ERROR") {
                        response.result = data_p.result;
                        response.message = "DB getInjectedDriver error for " + drivername + ": " + data_p.message;
                        logger.error("[DRIVER] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {

                        if (data_p.message[0] === undefined) {

                            //Then I can read the path of the driver code from the DB
                            db.getDriver(driverId, function (data) {

                                if (data.result == "ERROR") {
                                    response.result = data.result;
                                    response.message = "DB getDriverId error for " + drivername + ": " + data.message;
                                    logger.error("[DRIVER] --> " + response.message);
                                    res.send(JSON.stringify(response));

                                } else {

                                    driverName = data.message[0].name;
                                    driverFileName = data.message[0].code;
                                    driverSchemaName = data.message[0].jsonschema;

                                    fs.readFile(driverFileName, 'utf8', function (err, code_data) {

                                        if (err) {

                                            response.result = "ERROR";
                                            response.message = "Driver code file decoding error: " + err;
                                            logger.error("[DRIVER] --> " + response.message);
                                            res.send(JSON.stringify(response));

                                        } else {

                                            logger.debug("[DRIVER] --> File " + driverFileName + " successfully read.");

                                            var driverCode = code_data;

                                            fs.readFile(driverSchemaName, 'utf8', function (err, schema_data) {

                                                if (err) {

                                                    response.result = "ERROR";
                                                    response.message = "Driver schema file decoding error: " + err;
                                                    logger.error("[DRIVER] --> " + response.message);
                                                    res.send(JSON.stringify(response));

                                                } else {

                                                    logger.debug("[DRIVER] --> Configuration file " + driverSchemaName + " successfully read.");

                                                    var driverSchema = schema_data;

                                                    logger.debug('[DRIVER] --> Calling RPC injectDriver with name = ' + driverName + " onboot = " + onboot + " code = " + driverCode + " schema = " + driverSchema);

                                                    session_wamp.call('s4t.' + board + '.driver.injectDriver', [driverName, driverCode, driverSchema, onboot]).then(

                                                        function (result) {

                                                            db.insertInjectedDriver(board, driverName, function (out) {

                                                                if (out.result == "ERROR") {
                                                                    response.result = out.result;
                                                                    response.message = "DB insertInjectedDriver error for " + drivername + ": " + out.message;
                                                                    logger.error("[DRIVER] --> " + response.message);
                                                                    res.send(JSON.stringify(response));

                                                                } else {

                                                                    response.message = result;
                                                                    response.result = "SUCCESS";
                                                                    logger.info("[DRIVER] --> " + response.message);
                                                                    res.send(JSON.stringify(response));

                                                                }

                                                            });

                                                        }, session_wamp.log);

                                                }


                                            });


                                        }
                                    });

                                }


                            });

                        } else {

                            response.result = "WARNING";
                            response.message = "Driver " + drivername + " is already injected!";
                            logger.warn("[DRIVER] --> " + response.message);
                            res.send(JSON.stringify(response));

                        }

                    }


                });


            }

        }


    });
};

driver_utils.prototype.destroyDriver = function (drivername, res) {

    logger.info("[DRIVER] - REMOVING " + drivername + " driver from Iotronic...");

    var response = {
        message: '',
        result: ''
    };

    //I need to read the name of the driver from the DB
    db.getDriverId(drivername, function (data) {

        if (data.result == "ERROR") {
            response.result = data.result;
            response.message = "DB getDriverId error for " + drivername + ": " + data.message;
            logger.error("[DRIVER] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            if (data.message[0] === undefined) {

                response.message = "Driver " + drivername + " does not exist!";
                response.result = "ERROR";
                logger.error("[DRIVER] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {

                var driver_folder = IotronicHome + '/drivers/' + drivername;

                db.deleteDriver(drivername, function (result_db) {

                    if (result_db.result == "ERROR") {

                        response.message = "DB deleteDriver error for " + drivername + ": " + result_db.message;
                        response.result = "ERROR";
                        logger.error("[DRIVER] --> " + response.message);
                        res.send(JSON.stringify(response));


                    } else {

                        logger.debug('[DRIVER] --> Deleting files of ' + drivername + '...');

                        deleteFolderRecursive(driver_folder);

                        response.message = "Driver " + drivername + " successfully deleted from Iotronic!";
                        response.result = "SUCCESS";
                        logger.info("[DRIVER] --> " + response.message);
                        res.send(JSON.stringify(response));

                    }

                });

            }

        }




    });

};

driver_utils.prototype.manageDrivers = function (board, drivername, driveroperation, remote, mirror_board, res) {

    var response = {
        message: '',
        result: {}
    };
    
    switch (driveroperation) {

        case 'mount':

            logger.info("[DRIVER] - MOUNTING driver '" + drivername + "' into the board " + board + "...");

            //I need to read the name of the driver from the DB
            db.getDriverId(drivername, function (data) {
                
                if (data.result == "ERROR") {
                    response.result = data.result;
                    response.message = "DB getDriverId error for " + drivername + ": " + data.message;
                    logger.error("[DRIVER] --> " + response.message);
                    res.send(JSON.stringify(response));

                } else {

                    if (data.message[0] === undefined) {

                        response.message = "Driver " + drivername + " does not exist!";
                        response.result = "ERROR";
                        logger.error("[DRIVER] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {

                        var driverId = data.message[0].id;
                        
                        db.getInjectedDriver(driverId, board, function (data_p) {
                            
                            if (data_p.result == "ERROR") {
                                
                                response.result = data_p.result;
                                response.message = "DB getInjectedDriver error for " + drivername + ": " + data_p.message;
                                logger.error("[DRIVER] --> " + response.message);
                                res.send(JSON.stringify(response));

                            } else {

                                if (data_p.message[0] === undefined) {

                                    response.message = "Driver mounting failed: " + drivername + " is not injected!";
                                    response.result = "WARNING";
                                    logger.warn("[DRIVER] --> " + response.message);
                                    res.send(JSON.stringify(response));
                                    
                                } else {

                                    var driverState = data_p.message[0].state;

                                    if (driverState != "mounted") {

                                        if (remote === undefined || remote === null) remote = false;

                                        session_wamp.call('s4t.' + board + '.driver.mountDriver', [drivername, remote, mirror_board]).then(
                                            
                                            function (driver_result) {

                                                if (driver_result.result === "SUCCESS") {
                                                    
                                                    db.updateDriverStatus(board, drivername, "mounted", function (out) {

                                                        if (out.result == "ERROR") {

                                                            response.result = out.result;
                                                            response.message = "DB getInjectedDriver error for " + drivername + ": " + out.message;
                                                            logger.error("[DRIVER] --> " + response.message);
                                                            res.send(JSON.stringify(response));

                                                        } else {
                                                            logger.debug("[DRIVER] --> Update driver status result for " + drivername + ": " +  out.message);
                                                            logger.info("[DRIVER] --> " + driver_result.message);
                                                            res.send(JSON.stringify(driver_result));
                                                        }

                                                    });
                                                    
                                                } else {

                                                    logger.info("[DRIVER] --> " + driver_result.message);
                                                    res.send(JSON.stringify(driver_result));

                                                }

                                            }
                                            
                                        );

                                    } else {

                                        response.result = "WARNING";
                                        response.message = "Driver " + drivername + " is already mounted!";
                                        logger.warn("[DRIVER] --> driverState "+driverState+" - "+ response.message);
                                        res.send(JSON.stringify(response));

                                    }


                                }
                                
                            }

                            

                        });

                    }
                    
                }

                
            });

            break;


        case 'unmount':

            logger.info("[DRIVER] - UNMOUNTING driver \"" + drivername + "\" from the board " + board + "...");

            //I need to read the name of the driver from the DB
            db.getDriverId(drivername, function (data) {

                if (data.result == "ERROR") {
                    response.result = data.result;
                    response.message = "DB getDriverId error for " + drivername + ": " + data.message;
                    logger.error("[DRIVER] --> " + response.message);
                    res.send(JSON.stringify(response));

                } else {

                    if (data.message[0] === undefined) {

                        response.message = "Driver " + drivername + " does not exist!";
                        response.result = "ERROR";
                        logger.error("[DRIVER] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {

                        var driverId = data.message[0].id;

                        db.getInjectedDriver(driverId, board, function (data_p) {

                            if (data_p.result == "ERROR") {

                                response.result = data_p.result;
                                response.message = "DB getInjectedDriver error for " + drivername + ": " + data_p.message;
                                logger.error("[DRIVER] --> " + response.message);
                                res.send(JSON.stringify(response));

                            } else {

                                if (data_p.message[0] === undefined) {

                                    response.message = "Driver mounting failed: " + drivername + " is not injected!";
                                    response.result = "WARNING";
                                    logger.warn("[DRIVER] --> " + response.message);
                                    res.send(JSON.stringify(response));

                                } else {

                                    var driverState = data_p.message[0].state;

                                    if (driverState === "mounted") {

                                        session_wamp.call('s4t.' + board + '.driver.unmountDriver', [drivername]).then(
                                            function (driver_result) {

                                                if (driver_result.result === "SUCCESS") {

                                                    db.updateDriverStatus(board, drivername, "unmounted", function (out) {

                                                        if (out.result == "ERROR") {

                                                            response.result = out.result;
                                                            response.message = "DB getInjectedDriver error for " + drivername + ": " + out.message;
                                                            logger.error("[DRIVER] --> " + response.message);
                                                            res.send(JSON.stringify(response));

                                                        } else {
                                                            logger.debug("[DRIVER] --> Update driver status result for " + drivername + ": " +  out.message);
                                                            logger.info("[DRIVER] --> " + driver_result.message);
                                                            res.send(JSON.stringify(driver_result));
                                                        }

                                                    });

                                                } else {

                                                    logger.info("[DRIVER] --> " + driver_result.message);
                                                    res.send(JSON.stringify(driver_result));

                                                }

                                            }
                                        );

                                    } else {

                                        response.result = "WARNING";
                                        response.message = "Driver " + drivername + " is already unmounted!";
                                        logger.warn("[DRIVER] --> driverState "+driverState+" - "+ response.message);
                                        res.send(JSON.stringify(response));

                                    }


                                }
                            }



                        });

                    }

                }


            });

            break;

        default:
            response.result = "ERROR";
            response.message = "Driver operation " + driveroperation + " is not supported! ['mount' | 'unmount' ]";
            logger.warn("[DRIVER] --> " + response.message);
            res.send(JSON.stringify(response));

            break;

    }

};

driver_utils.prototype.readRemoteFile = function (board, drivername, filename, res) {

    logger.info("[DRIVER] - Remote file reading: " + drivername + "[" + filename + "] from board " + board);

    var response = {
        message: '',
        result: ''
    };

    //I need to read the name of the driver from the DB
    db.getDriverId(drivername, function (data) {

        if (data.result == "ERROR") {

            response.result = data.result;
            response.message = "DB getDriverId error for " + drivername + ": " + data.message;
            logger.error("[DRIVER] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            if (data.message[0] === undefined) {

                response.message = "Driver " + drivername + " does not exist!";
                response.result = "ERROR";
                logger.error("[DRIVER] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {

                var driverId = data.message[0].id;

                db.getInjectedDriver(driverId, board, function (data_p) {

                    if (data_p.result == "ERROR") {

                        response.result = data_p.result;
                        response.message = "DB getInjectedDriver error for " + drivername + ": " + data_p.message;
                        logger.error("[DRIVER] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {

                        if (data_p.message[0] === undefined || data_p.message[0].state != "mounted") {

                            if (data_p.message[0].state != "mounted")
                                response.message = "The driver " + drivername + " is not mounted in the board " + board + " !";
                            else if (data_p.message[0] === undefined)
                                response.message = "The driver " + drivername + " is not injected in the board " + board + " !";

                            response.result = "ERROR";
                            res.send(JSON.stringify(response));
                            logger.warn("[DRIVER] --> " + response.message );

                        } else {

                            logger.debug("[DRIVER] --> RPC call to read a remote file " + drivername + "[" + filename + "] ...");

                            session_wamp.call('s4t.' + board + '.driver.' + drivername + '.' + filename + '.read', [drivername, filename]).then(

                                function (result) {
                                    response.message = {"driver": drivername, "file": filename, "value": result};
                                    response.result = "SUCCESS";
                                    logger.info("[DRIVER] --> Remote file reading result " + drivername + "[" + filename + "] : " + result);
                                    res.send(JSON.stringify(response));

                                },
                                function (error) {
                                    // call failed
                                    var error_log = "ERROR: " + error["error"];
                                    response.message = {"driver": drivername, "file": filename, "response": error_log};
                                    response.result = "ERROR";
                                    logger.warn('[DRIVER] --> Remote file reading failed! - Error: ' + JSON.stringify(error));
                                    res.send(JSON.stringify(response));

                                }

                            );


                        }

                    }



                });


            }

        }


    });

};

driver_utils.prototype.writeRemoteFile = function (board, drivername, filename, filecontent, res) {

    logger.info("[DRIVER] - Remote file writing: " + drivername + "[" + filename + "] of the board " + board);

    var response = {
        message: '',
        result: ''
    };

    //I need to read the name of the driver from the DB
    db.getDriverId(drivername, function (data) {

        if (data.result == "ERROR") {

            response.result = data.result;
            response.message = "DB getDriverId error for " + drivername + ": " + data.message;
            logger.error("[DRIVER] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            if (data.message[0] === undefined) {

                response.message = "Driver " + drivername + " does not exist!";
                response.result = "ERROR";
                logger.error("[DRIVER] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {

                var driverId = data.message[0].id;

                db.getInjectedDriver(driverId, board, function (data_p) {

                    if (data_p.result == "ERROR") {

                        response.result = data_p.result;
                        response.message = "DB getInjectedDriver error for " + drivername + ": " + data_p.message;
                        logger.error("[DRIVER] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {

                        if (data_p.message[0] === undefined || data_p.message[0].state != "mounted") {

                            if (data_p.message[0].state != "mounted")
                                response.message = "The driver " + drivername + " is not mounted in the board " + board + " !";
                            else if (data_p.message[0] === undefined)
                                response.message = "The driver " + drivername + " is not injected in the board " + board + " !";

                            response.result = "ERROR";
                            res.send(JSON.stringify(response));

                            logger.warn("[DRIVER] --> " + response.message);

                        } else {

                            logger.debug("[DRIVER] --> RPC call to write a remote file " + drivername + "[" + filename + "] ...");

                            logger.debug('[DRIVER] --> RPC s4t.' + board + '.driver.' + drivername + '.' + filename + '.write -> ' + filecontent);

                            session_wamp.call('s4t.' + board + '.driver.' + drivername + '.' + filename + '.write', [drivername, filename, filecontent]).then(

                                function (result) {
                                    response.message = {"driver": drivername, "file": filename, "value": result};
                                    response.result = "SUCCESS";
                                    logger.info("[DRIVER] --> Remote file writing result " + drivername + "[" + filename + "] : " + result);
                                    res.send(JSON.stringify(response));

                                },
                                function (error) {
                                    // call failed
                                    var error_log = "ERROR: " + error["error"];
                                    response.message = {"driver": drivername, "file": filename, "response": error_log};
                                    response.result = "ERROR";
                                    logger.error('[DRIVER] --> Remote file writing failed! - Error: ' + JSON.stringify(error));
                                    res.send(JSON.stringify(response));

                                }


                            );


                        }

                    }



                });


            }

        }


    });

};


function updateDriverStatus(args) {
    // Parsing the input arguments
    var boardCode = String(args[0]);
    var drivername = String(args[1]);
    var status = String(args[2]);

    var d = Q.defer();

    logger.debug("[DRIVER] - Updating " + drivername + " status (" + status + ") for the board " + boardCode);

    db.updateDriverStatus(boardCode, drivername, status, function (out) {

        logger.debug("[DRIVER] --> Update driver status result for " + drivername + ": " + out);
        d.resolve("db_update_completed");

    });

    return d.promise;


}

function deleteFolderRecursive(path) {

    if (fs.existsSync(path)) {

        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) {
                // recurse
                deleteFolderRecursive(curPath);
            } else {
                // delete file
                fs.unlinkSync(curPath);
            }
        });

        fs.rmdirSync(path);

    }

}


module.exports = driver_utils;
