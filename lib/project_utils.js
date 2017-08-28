/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2017 Nicola Peditto

*/

//service logging configuration: "project_utils"
var logger = log4js.getLogger('project_utils');
logger.setLevel(loglevel);


var db_utils = require('./mysql_db_utils');
var db = new db_utils;
var board_utility = require('./board_utils');

var uuid = require('node-uuid');


project_utils = function (session, rest) {


    // IoTronic project management APIs
    //---------------------------------------------------------------------------------------------------

    //GET projects list
    rest.get('/v1/projects/', function (req, res) {

        logger.debug("[API] - projects list called - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var response = {
            message: '',
            result: ''
        };

        db.getProjectList(function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting projects list: " + data.message;
                response.result = "ERROR";
                logger.error("[PROJECT] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                res.send(JSON.stringify(data));
            }

        });

    });
    
    
    //CREATE a IoTronic project
    rest.post('/v1/projects/', function (req, res) {

        logger.debug("[API] - Create an IoTronic project - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var name = req.body.name;
        var description = req.body.description;

        var APIparamsList= {"name":name};

        board_utility.checkDefInputs(APIparamsList, function (check){

            if(check.result == "ERROR"){

                res.send(JSON.stringify(check));

            }else {

                board_utility.checkRestInputs(req, function (check){

                    if(check.result == "ERROR"){
                        res.send(JSON.stringify(check));

                    }else {

                        project_utils.prototype.createProject(name, description, res);

                    }

                });

            }

        });


    });


    //DELETE IoTronic project
    rest.delete('/v1/projects/:project', function (req, res) {

        logger.debug("[API] - Delete IoTronic project - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var project_id = req.params.project;

        project_utils.prototype.deleteProject(project_id, res);

    });


    //UPDATE IoTronic project
    rest.patch('/v1/projects/:project', function (req, res) {

        logger.debug("[API] - Update IoTronic project - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var project_id = req.params.project;

        var name = req.body.name;
        var description = req.body.description;

        var APIparamsList= {"name":name};

        board_utility.checkDefInputs(APIparamsList, function (check){

            if(check.result == "ERROR"){

                res.send(JSON.stringify(check));

            }else {

                board_utility.checkRestInputs(req, function (check){

                    if(check.result == "ERROR"){
                        res.send(JSON.stringify(check));

                    }else {

                        project_utils.prototype.updateProject(project_id, name, description, res);

                    }

                });

            }

        });


    });


    //GET IoTronic project details
    rest.get('/v1/projects/:project', function (req, res) {

        logger.debug("[API] - Get IoTronic project details - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var response = {
            message: '',
            result: ''
        };

        var project_id = req.params.project;

        db.getProject(project_id, function (data) {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "IoTronic project with ID '" + project_id + "' does not exist!";
                logger.error("[PROJECT] --> " + response.message);
                res.send(JSON.stringify(response));

            }
            else {

                if (data.result == "ERROR") {
                    response.message = "Error getting project details: " + data.message;
                    response.result = "ERROR";
                    logger.error("[PROJECT] --> " + response.message);
                    res.send(JSON.stringify(response));

                } else {
                    response.message = data.message[0];
                    response.result = "SUCCESS";
                    logger.info("[PROJECT] --> " + JSON.stringify(response.message));
                    res.send(JSON.stringify(response));

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
            res.send(response);

        } else {

            response.message = "IoTronic project '" + name + "' (id = "+project_id+") successfully created!";
            response.result = "SUCCESS";
            logger.info("[PROJECT] --> " +response.message);
            res.send(JSON.stringify(response));

        }

    });



};

project_utils.prototype.deleteProject = function (project_id, res) {

    logger.info("[PROJECT] - Deleting IoTronic project with ID '" + project_id + "'...");
 
    var response = {
        message: '',
        result: ''
    };

    db.getProject(project_id, function (data) {

        if (data.result == "ERROR") {
            response.message = "Error getting project details: " + data.message;
            response.result = "ERROR";
            logger.error("[PROJECT] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "IoTronic project with ID '" + project_id + "' does not exist!";
                logger.error("[PROJECT] --> " + response.message);
                res.send(JSON.stringify(response));

            }
            else {

                var name = data.message[0].name;

                logger.info("[PROJECT] --> deleting '" + name + "' IoTronic project.");

                db.deleteProject(project_id, function (data) {

                    if (data.result == "ERROR") {
                        response.message = "Error deleting IoTronic project: " + data.message;
                        response.result = "ERROR";
                        logger.error("[PROJECT] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {
                        response.message = "IoTronic project '" + name + "' (id = "+project_id+") deleted.";
                        response.result = "SUCCESS";
                        logger.info("[PROJECT] --> " + response.message);
                        res.send(JSON.stringify(response));
                    }

                });

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
            res.send(JSON.stringify(response));

        } else {

            if (data.message[0] === undefined) {
                response.result = "ERROR";
                response.message = "IoTronic project with ID '" + project_id + "' does not exist!";
                logger.error("[PROJECT] --> " + response.message);
                res.send(JSON.stringify(response));

            }
            else {

                var prj_name_to_update = data.message[0].name;
                logger.debug("[LAYOUT] --> IoTronic project to update: " + prj_name_to_update);

                db.updateProject(project_id, name, description, function (result_db) {

                    if (result_db.result == "ERROR") {
                        logger.error("[PROJECT] --> updateProject - DB write error: " + result_db.message);
                        response.message = result_db.message;
                        response.result = "ERROR";
                        res.send(response);

                    } else {

                        response.message = "IoTronic project with ID " + project_id + " successfully updated!";
                        response.result = "SUCCESS";
                        logger.info("[PROJECT] --> " +response.message);
                        res.send(JSON.stringify(response));

                    }

                });

            }



        }

    });




};




module.exports = project_utils;