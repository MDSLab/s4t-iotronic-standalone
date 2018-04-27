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

//service logging configuration: "project_utils"
var logger = log4js.getLogger('mng_project');
logger.setLevel(loglevel);


var db_utils = require('./mng_db');
var db = new db_utils;
var board_utility = require('./mng_board');

var uuid = require('node-uuid');


project_utils = function (session, rest) {


    // IoTronic project management APIs
    //---------------------------------------------------------------------------------------------------

    //GET projects list
    /**
     * @swagger
     * /v1/projects/:
     *   get:
     *     tags:
     *       - Projects
     *     description: It returns IoTronic projects list
     *     summary: get IoTronic projects list
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: List of IoTronic projects
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of projects"
     *                  items:
     *                      title: project info
     *                      type: object
     *                      properties:
     *                          uuid:
     *                              type: string
     *                              description: "The IoTronic project ID"
     *                          name:
     *                              type: string
     *                          description:
     *                              type: string
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/projects/', function (req, res) {

        logger.info("[API] - projects list called - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        db.getProjectList(function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting projects list: " + data.message;
                response.result = "ERROR";
                logger.error("[PROJECT] --> " + response.message);
                res.status(500).send(response);

            } else {
                res.status(200).send(data);
            }

        });

    });
    
    
    //CREATE a IoTronic project
    /**
     * @swagger
     * /v1/projects/:
     *   post:
     *     tags:
     *       - Projects
     *     description:  create new IoTronic project
     *     summary: create IoTronic project
     *     produces:
     *       - application/json
     *     parameters:
     *      -  name: body
     *         in: body
     *         required: true
     *         schema:
     *              type: object
     *              required:
     *                  - name
     *              properties:
     *                  name:
     *                      type: string
     *                  description:
     *                      type: string
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
    rest.post('/v1/projects/', function (req, res) {

        logger.info("[API] - Create an IoTronic project - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var name = req.body.name;
        var description = req.body.description;

        var ApiRequired= {"name":name};

        board_utility.checkRequired(ApiRequired, function (check){

            if(check.result == "ERROR"){

                res.status(500).send(check);

            }else {

                project_utils.prototype.createProject(name, description, res);
                
            }

        });


    });


    //DELETE IoTronic project
    /**
     * @swagger
     * /v1/projects/{project}:
     *   delete:
     *     tags:
     *       - Projects
     *     description: Delete an IoTronic project
     *     summary: delete IoTronic project
     *     parameters:
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic project ID
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
    rest.delete('/v1/projects/:project', function (req, res) {

        logger.info("[API] - Delete IoTronic project - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var project_id = req.params.project;

        project_utils.prototype.deleteProject(project_id, res);

    });


    //UPDATE IoTronic project
    /**
     * @swagger
     * /v1/projects/{project}:
     *   patch:
     *     tags:
     *       - Projects
     *     description: Update an IoTronic project
     *     summary: update IoTronic project
     *     parameters:
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic project ID
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - name
     *              properties:
     *                  name:
     *                      type: string
     *                  description:
     *                      type: string
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
    rest.patch('/v1/projects/:project', function (req, res) {

        logger.info("[API] - Update IoTronic project - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var project_id = req.params.project;

        var name = req.body.name;
        var description = req.body.description;

        var ApiRequired= {"name":name};

        board_utility.checkRequired(ApiRequired, function (check){

            if(check.result == "ERROR"){

                res.status(500).send(check);

            }else {

                project_utils.prototype.updateProject(project_id, name, description, res);

            }

        });


    });


    //GET IoTronic project details
    /**
     * @swagger
     * /v1/projects/{project}:
     *   get:
     *     tags:
     *       - Projects
     *     description: It returns IoTronic project information
     *     summary: get project details
     *     parameters:
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *        type: string
     *        description: "The IoTronic project ID or NAME"
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: "IoTronic projects details"
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: object
     *                  properties:
     *                          uuid:
     *                              type: string
     *                              description: "The IoTronic project ID"
     *                          name:
     *                              type: string
     *                              description: "The IoTronic project NAME"
     *                          description:
     *                              type: string
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/projects/:project', function (req, res) {

        logger.info("[API] - Get IoTronic project details - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        var project = req.params.project;

        db.getProject(project, function (data) {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "IoTronic project '" + project + "' does not exist!";
                logger.error("[PROJECT] --> " + response.message);
                res.status(500).send(response);

            }
            else {

                if (data.result == "ERROR") {
                    response.message = "Error getting project details: " + data.message;
                    response.result = "ERROR";
                    logger.error("[PROJECT] --> " + response.message);
                    res.status(500).send(response);

                } else {
                    response.message = data.message[0];
                    response.result = "SUCCESS";
                    logger.info("[PROJECT] --> " + JSON.stringify(response.message));
                    res.status(200).send(response);

                }

            }

        });

    });


    //GET IoTronic project's boards
    /**
     * @swagger
     * /v1/projects/{project}/boards:
     *   get:
     *     tags:
     *       - Projects
     *     description: It returns IoTronic project's boards list
     *     summary: get project's boards list
     *     parameters:
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic project ID or NAME
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: List of IoTronic boards in the project
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "Boards list of the project"
     *                  items:
     *                      title: "board information"
     *                      type: object
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/projects/:project/boards', function (req, res) {

        logger.info("[API] - Get IoTronic project's boards - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        var project = req.params.project;

        db.getProject(project, function (data) {

            if (data.message[0] === undefined) {

                response.result = "ERROR";
                response.message = "IoTronic project '" + project + "' does not exist!";
                logger.error("[PROJECT] --> " + response.message);
                res.status(500).send(response);

            }
            else {

                if (data.result == "ERROR") {

                    response.message = "Error getting project details: " + data.message;
                    response.result = "ERROR";
                    logger.error("[PROJECT] --> " + response.message);
                    res.status(500).send(response);

                } else {

                    db.getProjectBoards(project, function (data) {

                        if (data.message[0] === undefined) {

                            response.result = "SUCCESS";
                            response.message = "There are not boards in the project '" + project + "'!";
                            logger.error("[PROJECT] --> " + response.message);
                            res.status(200).send(response);

                        }
                        else {

                            if (data.result == "ERROR") {

                                response.message = "Error getting project's boards list: " + data.message;
                                response.result = "ERROR";
                                logger.error("[PROJECT] --> " + response.message);
                                res.status(500).send(response);

                            } else {

                                response.message = data.message;
                                response.result = "SUCCESS";
                                logger.info("[PROJECT] --> " + JSON.stringify(response.message));
                                res.status(200).send(response);

                            }

                        }

                    });

                }

            }

        });

    });



    //GET IoTronic project's users
    /**
     * @swagger
     * /v1/projects/{project}/users:
     *   get:
     *     tags:
     *       - Projects
     *     description: It returns IoTronic project's users list
     *     summary: get project's users list
     *     parameters:
     *      - in: path
     *        name: project
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic project ID or NAME
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: List of IoTronic users in the project
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "Users list of the project"
     *                  items:
     *                      title: "user information"
     *                      type: object
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/projects/:project/users', function (req, res) {

        logger.info("[API] - Get IoTronic project's users - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        var project = req.params.project;

        db.getProject(project, function (data) {

            if (data.message[0] === undefined) {

                response.result = "ERROR";
                response.message = "IoTronic project '" + project + "' does not exist!";
                logger.error("[PROJECT] --> " + response.message);
                res.status(500).send(response);

            }
            else {

                if (data.result == "ERROR") {

                    response.message = "Error getting project details: " + data.message;
                    response.result = "ERROR";
                    logger.error("[PROJECT] --> " + response.message);
                    res.status(500).send(response);

                } else {

                    db.getProjectUsers(project, function (data) {

                        if (data.message[0] === undefined) {

                            response.result = "SUCCESS";
                            response.message = "There are not users in the project '" + project + "'!";
                            logger.error("[PROJECT] --> " + response.message);
                            res.status(200).send(response);

                        }
                        else {

                            if (data.result == "ERROR") {

                                response.message = "Error getting project's users list: " + data.message;
                                response.result = "ERROR";
                                logger.error("[PROJECT] --> " + response.message);
                                res.status(500).send(response);

                            } else {

                                response.message = data.message;
                                response.result = "SUCCESS";
                                logger.info("[PROJECT] --> " + JSON.stringify(response.message));
                                res.status(200).send(response);

                            }

                        }

                    });

                }

            }

        });

    });

    logger.debug("[REST-EXPORT] - IoTronic projects management APIs exposed!");


};




project_utils.prototype.createProject = function (name, description, res) {

    logger.info("[PROJECT] - Creating IoTronic project: " + name);

    var response = {
        message: '',
        result: ''
    };

    var project_id = uuid.v4();

    db.createProject(project_id, name, description, function (result_db) {

        if (result_db.result == "ERROR") {
            logger.error("[PROJECT] --> createProject - DB write error: " + result_db.message);
            response.message = result_db.message;
            response.result = "ERROR";
            res.status(500).send(response);

        } else {

            response.message = "IoTronic project '" + name + "' (id = "+project_id+") successfully created!";
            response.result = "SUCCESS";
            logger.info("[PROJECT] --> " +response.message);
            res.status(200).send(response);

        }

    });



};

project_utils.prototype.deleteProject = function (project_id, res) {

    logger.info("[PROJECT] - Deleting IoTronic project with ID '" + project_id + "'...");
 
    var response = {
        message: '',
        result: ''
    };

    var project = project_id;

    db.getProject(project_id, function (data) {

        if (data.result == "ERROR") {
            response.message = "Error getting project details: " + data.message;
            response.result = "ERROR";
            logger.error("[PROJECT] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "IoTronic project with ID '" + project + "' does not exist!";
                logger.error("[PROJECT] --> " + response.message);
                res.status(500).send(response);

            }
            else {

                var name = data.message[0].name;
                var project_id = data.message[0].uuid;

                db.getProjectBoards(project_id, function (data) {

                    if (data.result == "ERROR") {
                        response.message = "Error getting project boards: " + data.message;
                        response.result = "ERROR";
                        logger.error("[PROJECT] --> " + response.message);
                        res.status(500).send(response);

                    } else {

                        if(data.message.length == 0){

                            logger.info("[PROJECT] --> deleting '" + name + "' IoTronic project.");

                            db.deleteProject(project_id, function (data) {

                                if (data.result == "ERROR") {
                                    response.message = "Error deleting IoTronic project: " + data.message;
                                    response.result = "ERROR";
                                    logger.error("[PROJECT] --> " + response.message);
                                    res.status(500).send(response);

                                } else {
                                    response.message = "IoTronic project '" + name + "' (id = "+project_id+") deleted.";
                                    response.result = "SUCCESS";
                                    logger.info("[PROJECT] --> " + response.message);
                                    res.status(200).send(response);
                                }

                            });

                        }
                        else{
                            response.message = "The project is not empty!";
                            response.result = "ERROR";
                            logger.error("[PROJECT] --> " + response.message);
                            res.status(500).send(response);
                        }

                    }

                });

                /*


                */

            }



        }

    });


};

project_utils.prototype.updateProject = function (project_id, name, description, res) {

    logger.info("[PROJECT] - Updating IoTronic project with ID " + project_id + "...");

    var response = {
        message: '',
        result: ''
    };

    db.getProject(project_id, function (data) {

        if (data.result == "ERROR") {
            response.message = "Error getting IoTronic project: " + data.message;
            response.result = "ERROR";
            logger.error("[PROJECT] --> " + response.message);
            res.status(500).send(response);

        } else {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "IoTronic project with ID '" + project_id + "' does not exist!";
                logger.error("[PROJECT] --> " + response.message);
                res.status(500).send(response);

            }
            else {

                var prj_name_to_update = data.message[0].name;
                logger.debug("[LAYOUT] --> IoTronic project to update: " + prj_name_to_update);

                db.updateProject(project_id, name, description, function (result_db) {

                    if (result_db.result == "ERROR") {
                        logger.error("[PROJECT] --> updateProject - DB write error: " + result_db.message);
                        response.message = result_db.message;
                        response.result = "ERROR";
                        res.status(500).send(response);

                    } else {

                        response.message = "IoTronic project with ID " + project_id + " successfully updated!";
                        response.result = "SUCCESS";
                        logger.info("[PROJECT] --> " +response.message);
                        res.status(200).send(response);

                    }

                });

            }



        }

    });




};




module.exports = project_utils;