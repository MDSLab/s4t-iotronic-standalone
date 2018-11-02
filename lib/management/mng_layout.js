//###############################################################################
//##
//# Copyright (C) 2017 Nicola Peditto
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

//service logging configuration: "layout_utils"
var logger = log4js.getLogger('mng_layout');
logger.setLevel(loglevel);


var db_utils = require('./mng_db');
var db = new db_utils;
var board_utility = require('./mng_board');

layout_utils = function (session, rest) {

    // LAYOUT MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //GET board layouts list
    /**
     * @swagger
     * /v1/layouts/:
     *   get:
     *     tags:
     *       - Layouts
     *     description: It returns IoTronic layouts list
     *     summary: get IoTronic layouts list
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: List of device supported by IoTronic
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of layout"
     *                  items:
     *                      title: layout info
     *                      type: object
     *                      properties:
     *                          id_layout:
     *                              type: integer
     *                              description: "The IoTronic layout ID"
     *                          model:
     *                              type: string
     *                              description: "device model name"
     *                          manufacturer:
     *                              type: string
     *                              description: "device manufacturer name"
     *                          image:
     *                              type: string
     *                              description: "OS distribution image used by device"
     *                          layout:
     *                              type: string
     *                              description: "Iotronic device layout"      
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
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
                res.status(500).send(response);

            } else {
                res.status(200).send(data);
            }

        });

    });
    

    //CREATE board layout
    /**
     * @swagger
     * /v1/layouts/:
     *   post:
     *     tags:
     *       - Layouts
     *     description:  create new IoTronic board layout
     *     summary: create IoTronic layout
     *     produces:
     *       - application/json
     *     parameters:
     *      -  name: body
     *         in: body
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - model
     *              properties:
     *                  model:
     *                      type: string
     *                      description: "device model name"
     *                  manufacturer:
     *                      type: string
     *                      description: "evice manufacturer name"
     *                  image:
     *                      type: string
     *                      description: "OS distribution image used by device"
     *                  layout:
     *                      type: string
     *                      description: "Iotronic device layout"
     *     responses:
     *       200:
     *         description: A Json IoTronic response
     *         schema:
     *           $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.post('/v1/layouts/', function (req, res) {

        logger.info("[API] - Create board layout - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var model = req.body.model;
        var manufacturer = req.body.manufacturer;
        var image = req.body.image;
        var layout = req.body.layout;

        var ApiRequired= {"model":model, "manufacturer":manufacturer, "layout":layout};

        board_utility.checkRequired(ApiRequired, function (check){

            if(check.result == "ERROR"){

                res.status(500).send(check);

            }else {
                
                layout_utils.prototype.createLayout(model, manufacturer, image, layout, res);
                
            }

        });


    });


    //DELETE board layout
    /**
     * @swagger
     * /v1/layouts/{layout}:
     *   delete:
     *     tags:
     *       - Layouts
     *     description: Delete an IoTronic board layout
     *     summary: delete IoTronic layout
     *     parameters:
     *      - in: path
     *        name: layout
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic layout ID
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.delete('/v1/layouts/:layout', function (req, res) {


        logger.info("[API] - Delete board layout - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var layout_id = req.params.layout;

        layout_utils.prototype.deleteLayout(layout_id, res);

    });


    //UPDATE board layout
    /**
     * @swagger
     * /v1/layouts/{layout}:
     *   patch:
     *     tags:
     *       - Layouts
     *     description: Update an IoTronic board layout
     *     summary: update IoTronic layout
     *     parameters:
     *      - in: path
     *        name: layout
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic layout ID
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              properties:
     *                  model:
     *                      type: string
     *                      description: "device model name"
     *                  manufacturer:
     *                      type: string
     *                      description: "device manufacturer name"
     *                  image:
     *                      type: string
     *                      description: "OS distribution image used by device"
     *                  layout:
     *                      type: string
     *                      description: "Iotronic device layout"
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         $ref: "#/definitions/IoTronicResponse"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.patch('/v1/layouts/:layout', function (req, res) {

        logger.info("[API] - Update board layout - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var layout_id = req.params.layout;
        var model = req.body.model;
        var manufacturer = req.body.manufacturer;
        var image = req.body.image;
        var layout = req.body.layout;

        var ApiRequired= {"model":model, "manufacturer":manufacturer, "layout":layout};

        board_utility.checkRequired(ApiRequired, function (check){

            if(check.result == "ERROR"){

                res.status(500).send(check);

            }else {

                layout_utils.prototype.updateLayout(layout_id, model, manufacturer, image, layout, res);


            }

        });


    });


    //GET IoTronic board layout details
    /**
     * @swagger
     * /v1/layouts/{layout}:
     *   get:
     *     tags:
     *       - Layouts
     *     description: It returns IoTronic board layout information
     *     summary: get layout details
     *     parameters:
     *      - in: path
     *        name: layout
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic layout ID
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: Project information
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                      type: object
     *                      properties:
     *                          id_layout:
     *                              type: integer
     *                              description: "The IoTronic layout ID"
     *                          model:
     *                              type: string
     *                              description: "device model name"
     *                          manufacturer:
     *                              type: string
     *                              description: "device manufacturer name"
     *                          image:
     *                              type: string
     *                              description: "OS distribution image used by device"
     *                          layout:
     *                              type: string
     *                              description: "Iotronic device layout"  
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
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
                res.status(500).send(response);

            }
            else {

                if (data.result == "ERROR") {
                    response.message = "Error getting layout details: " + data.message;
                    response.result = "ERROR";
                    logger.error("[LAYOUT] --> " + response.message);
                    res.status(500).send(response);

                } else {
                    response.message = data.message[0];
                    response.result = "SUCCESS";
                    logger.info("[LAYOUT] --> " + JSON.stringify(response.message));
                    res.status(200).send(response);

                }

            }

        });

    });
    
    logger.debug("[REST-EXPORT] - Layout management APIs exposed!");



};



layout_utils.prototype.createLayout = function (model, manufacturer, image, layout, res) {

    logger.info("[LAYOUT] - Creating board layout:");
    logger.info("[LAYOUT] --> model " + model);
    logger.info("[LAYOUT] --> manufacturer " + manufacturer);
    logger.info("[LAYOUT] --> image " + image);
    logger.info("[LAYOUT] --> layout " + layout);


    var response = {
        message: '',
        result: ''
    };

    db.createLayout(model, manufacturer, image, layout, function (result_db) {

        if (result_db.result == "ERROR") {
            logger.error("[LAYOUT] --> createLayout - DB write error: " + result_db.message);
            response.message = result_db.message;
            response.result = "ERROR";
            res.status(500).send(response);

        } else {

            response.message = "Board layout " + model + " successfully created in IoTronic!";
            response.result = "SUCCESS";
            logger.info("[LAYOUT] --> " +response.message);
            res.status(200).send(response);

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
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "Board layout with ID '" + layout_id + "' does not exist!";
                logger.error("[LAYOUT] --> " + response.message);
                res.status(500).send(response);

            }
            else {

                var model = data.message[0].model;

                logger.debug("[LAYOUT] --> deleting board model: " + model);

                db.deleteLayoutById(layout_id, function (data) {

                    if (data.result == "ERROR") {
                        response.message = "Error deleting board layout: " + data.message;
                        response.result = "ERROR";
                        logger.error("[LAYOUT] --> " + response.message);
                        res.status(500).send(response);

                    } else {
                        response.message = "Board layout " + model + " (id = "+layout_id+") deleted.";
                        response.result = "SUCCESS";
                        logger.info("[LAYOUT] --> " + response.message);
                        res.status(200).send(response);
                    }

                });

            }



        }

    });


};


layout_utils.prototype.updateLayout = function (layout_id, model, manufacturer, image, layout, res) {

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
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "Board layout with ID '" + layout_id + "' does not exist!";
                logger.error("[LAYOUT] --> " + response.message);
                res.status(500).send(response);

            }
            else {

                logger.debug("[LAYOUT] --> updating board model with ID = " + layout_id);

                db.updateLayoutById(layout_id, model, manufacturer, image, layout, function (result_db) {

                    if (result_db.result == "ERROR") {
                        logger.error("[LAYOUT] --> updateLayoutById - DB write error: " + result_db.message);
                        response.message = result_db.message;
                        response.result = "ERROR";
                        res.status(500).send(response);

                    } else {

                        response.message = "Board layout with ID " + layout_id + " successfully updated!";
                        response.result = "SUCCESS";
                        logger.info("[LAYOUT] --> " +response.message);
                        res.status(200).send(response);

                    }

                });

            }



        }

    });




};



module.exports = layout_utils;