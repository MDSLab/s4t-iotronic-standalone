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

layout_utils = function (session, rest) {

    // LAYOUT MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //GET board layouts list
    rest.get('/v1/layouts/', function (req, res) {

        logger.info("[API] - Layouts list called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        db.getLayoutList(function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting layouts list: " + data.message;
                response.result = "ERROR";
                logger.error("[LAYOUT] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                res.send(JSON.stringify(data));
            }

        });

    });


    //CREATE board layout
    rest.post('/v1/layouts/', function (req, res) {

        logger.info("[API] - Create board layout - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

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


    //DELETE board layout
    rest.delete('/v1/layouts/:layout', function (req, res) {


        logger.info("[API] - Delete board layout - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var layout_id = req.params.layout;

        layout_utils.prototype.deleteLayout(layout_id, res);

    });


    //UPDATE board layout
    rest.patch('/v1/layouts/:layout', function (req, res) {

        logger.info("[API] - Update board layout - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var layout_id = req.params.layout;
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

                        layout_utils.prototype.updateLayout(layout_id, model, manufacturer, image, res);

                    }

                });

            }

        });


    });


    //GET IoTronic board layout details
    rest.get('/v1/layouts/:layout', function (req, res) {

        logger.info("[API] - Get IoTronic board layout details - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        var layout_id = req.params.layout;

        db.getLayoutById(layout_id, function (data) {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "IoTronic layout with ID '" + layout_id + "' does not exist!";
                logger.error("[LAYOUT] --> " + response.message);
                res.send(JSON.stringify(response));

            }
            else {

                if (data.result == "ERROR") {
                    response.message = "Error getting layout details: " + data.message;
                    response.result = "ERROR";
                    logger.error("[LAYOUT] --> " + response.message);
                    res.send(JSON.stringify(response));

                } else {
                    response.message = data.message[0];
                    response.result = "SUCCESS";
                    logger.info("[LAYOUT] --> " + JSON.stringify(response.message));
                    res.send(JSON.stringify(response));

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


layout_utils.prototype.deleteLayout = function (layout_id, res) {

    logger.info("[LAYOUT] - DELETING BOARD LAYOUT '" + layout_id + "'...");

    var response = {
        message: '',
        result: ''
    };

    db.getLayoutById(layout_id, function (data) {

        if (data.result == "ERROR") {
            response.message = "Error getting board layout: " + data.message;
            response.result = "ERROR";
            logger.error("[LAYOUT] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "Board layout with ID '" + layout_id + "' does not exist!";
                logger.error("[LAYOUT] --> " + response.message);
                res.send(JSON.stringify(response));

            }
            else {

                var model = data.message[0].model;

                logger.debug("[LAYOUT] --> deleting board model: " + model);

                db.deleteLayoutById(layout_id, function (data) {

                    if (data.result == "ERROR") {
                        response.message = "Error deleting board layout: " + data.message;
                        response.result = "ERROR";
                        logger.error("[LAYOUT] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {
                        response.message = "Board layout " + model + " (id = "+layout_id+") deleted.";
                        response.result = "SUCCESS";
                        logger.info("[LAYOUT] --> " + response.message);
                        res.send(JSON.stringify(response));
                    }

                });

            }



        }

    });


};


layout_utils.prototype.updateLayout = function (layout_id, model, manufacturer, image, res) {

    logger.info("[LAYOUT] - UPDATING LAYOUT with ID " + layout_id + "...");

    var response = {
        message: '',
        result: ''
    };

    db.getLayoutById(layout_id, function (data) {

        if (data.result == "ERROR") {
            response.message = "Error getting board layout: " + data.message;
            response.result = "ERROR";
            logger.error("[LAYOUT] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "Board layout with ID '" + layout_id + "' does not exist!";
                logger.error("[LAYOUT] --> " + response.message);
                res.send(JSON.stringify(response));

            }
            else {

                logger.debug("[LAYOUT] --> updating board model with ID = " + layout_id);

                db.updateLayoutById(layout_id, model, manufacturer, image, function (result_db) {

                    if (result_db.result == "ERROR") {
                        logger.error("[LAYOUT] --> updateLayoutById - DB write error: " + result_db.message);
                        response.message = result_db.message;
                        response.result = "ERROR";
                        res.send(response);

                    } else {

                        response.message = "Board layout with ID " + layout_id + " successfully updated!";
                        response.result = "SUCCESS";
                        logger.info("[LAYOUT] --> " +response.message);
                        res.send(JSON.stringify(response));

                    }

                });

            }



        }

    });




};



module.exports = layout_utils;