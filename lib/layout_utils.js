/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2017 Nicola Peditto

*/

//service logging configuration: "layout_utils"
var logger = log4js.getLogger('layout_utils');
logger.setLevel(loglevel);


var db_utils = require('./mysql_db_utils');
var db = new db_utils;
var board_utility = require('./board_utils');

var Q = require("q");


var session_wamp;

layout_utils = function (session, rest) {

    session_wamp = session;

    // LAYOUT MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //get layouts list
    rest.get('/v1/layouts/', function (req, res) {

        logger.debug("[API] - Layouts list called - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var response = {
            message: '',
            result: ''
        };

        db.getLayoutList(function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting layouts list: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                res.send(JSON.stringify(data));
            }

        });

    });


    //CREATE layout in IoTronic
    rest.post('/v1/layouts/', function (req, res) {

        logger.debug("[API] - Create board layout - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var model = req.body.model;
        var manufacturer = req.body.manufacturer;
        var image = req.body.image;


        var APIparamsList= {"model":model};

        board_utility.checkDefInputs(APIparamsList, function (check){

            if(check.result == "ERROR"){

                res.send(JSON.stringify(check));

            }else {

                board_utility.checkRestInputs(req, function (check){

                    if(check.result == "ERROR"){
                        res.send(JSON.stringify(check));

                    }else {

                        layout_utils.prototype.createLayout(model, manufacturer, image, res);

                    }

                });

            }

        });


    });


    //delete layout
    rest.delete('/v1/layouts/:layout', function (req, res) {

        var layout_id = req.params.layout;

        logger.info("[SYSTEM] - DELETING LAYOUT '" + layout_id + "'...");

        var response = {
            message: '',
            result: ''
        };

        db.getLayoutById(layout_id, function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting board layout: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {

                if (data.message[0] === undefined) {
                    response.result = "ERROR";
                    response.message = "Board layout with ID " + layout_id + " does not exist!";
                    logger.error("[SYSTEM] --> " + response.message);
                    res.send(JSON.stringify(response));

                }
                else {

                    var model = data.message[0].model;

                    logger.debug("[SYSTEM] --> deleting layout " + model);

                    db.deleteLayoutById(layout_id, function (data) {

                        if (data.result == "ERROR") {
                            response.message = "Error deleting board layout: " + data.message;
                            response.result = "ERROR";
                            logger.error("[SYSTEM] --> " + response.message);
                            res.send(JSON.stringify(response));

                        } else {
                            response.message = "Board layout " + model + " deleted.";
                            response.result = "SUCCESS";
                            logger.error("[SYSTEM] --> " + response.message);
                            res.send(JSON.stringify(response));
                        }

                    });

                }



            }

        });




    });

    logger.debug("[REST-EXPORT] - Layout management APIs exposed!");



};



layout_utils.prototype.createLayout = function (model, manufacturer, image, res) {

    logger.info("[LAYOUT] - Creating board layout:");
    logger.info("[LAYOUT] --> model " + model);
    logger.info("[LAYOUT] --> manufacturer " + manufacturer);
    logger.info("[LAYOUT] --> image " + image);


    var response = {
        message: '',
        result: ''
    };

    db.createLayout(model, manufacturer, image, function (result_db) {

        if (result_db.result == "ERROR") {
            logger.error("[LAYOUT] --> createLayout - DB write error: " + result_db.message);
            response.message = result_db.message;
            response.result = "ERROR";
            res.send(response);

        } else {

            response.message = "Board layout " + model + " successfully created in IoTronic!";
            response.result = "SUCCESS";
            logger.info("[LAYOUT] --> " +response.message);
            res.send(JSON.stringify(response));

        }

    });



};




module.exports = layout_utils;