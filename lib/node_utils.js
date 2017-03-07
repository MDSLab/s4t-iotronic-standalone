/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2016 Nicola Peditto

 */


//service logging configuration: "node_utils"
var logger = log4js.getLogger('node_utils');
logger.setLevel(loglevel);

var db_utils = require('./mysql_db_utils');
var db = new db_utils;
var ckan = new ckan_utils;

var session_wamp;

node_utils = function (session, rest) {

    session_wamp = session;

    // NODES MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //get nodes list
    rest.get('/v1/nodes/', function (req, res) {

        var response = {
            message: '',
            result: ''
        };

        logger.debug("[SYSTEM] - Nodes list called.");

        db.getNodesList(function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting nodes list: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                res.send(JSON.stringify(data));
            }

        });

    });

    //get node info
    rest.get('/v1/nodes/:node', function (req, res) {

        var node = req.params.node;

        var response = {
            message: '',
            result: ''
        };

        logger.debug("[SYSTEM] - Node info called!");

        db.NodeInfo(node, function (data) {

            if (data.result == "ERROR") {
                response.message = "Error getting node info: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                res.send(data); //JSON.stringify(data));
            }

        });





    });

    //create node
    rest.post('/v1/nodes/', function (req, res) {

        var node_label = req.body.node_label;
        var node = req.body.node;
        var latitude = req.body.latitude;
        var longitude = req.body.longitude;
        var altitude = req.body.altitude;
        var net_enabled = req.body.net_enabled;
        var sensorslist = req.body.sensorslist;

        var response = {
            result: '',
            message: ''
        };

        if (node == undefined || node == "") {
            response.message = "Node creation: Please specify a node UUID!";
            response.result = "ERROR";
            logger.error("[SYSTEM] --> " + response.message);
            res.send(JSON.stringify(response));

        } else if(node_label == undefined || node_label == ""){
            response.message = "Node creation: Please specify a node label!";
            response.result = "ERROR";
            logger.error("[SYSTEM] --> " + response.message);
            res.send(JSON.stringify(response));

        } else if(net_enabled == undefined || net_enabled == ""){
            response.message = "Node creation: Please specify the net-enabled flag: [ true | false ]";
            response.result = "ERROR";
            logger.error("[SYSTEM] --> " + response.message);
            res.send(JSON.stringify(response));

        }else if(net_enabled != "true" && net_enabled != "false"){
            response.message = "Node creation: wrong value of net-enabled flag: [ true | false ] - Specified: "+ net_enabled;
            response.result = "ERROR";
            logger.error("[SYSTEM] --> " + response.message);
            res.send(JSON.stringify(response));

        }else{

            try {

                logger.info("[SYSTEM] - New node " + node_label + " (" + node + ") - registration parameters:\n" + JSON.stringify(req.body, null, "\t"));

                if (req.body.extra != undefined) {

                    var isJSON = req.body.extra instanceof Object;

                    if(isJSON){

                        var extra = req.body.extra;
                        var ckan_enabled = extra.ckan_enabled;
                        logger.debug("[SYSTEM] --> ckan_enabled: " + ckan_enabled);

                        db.regNode(node, node_label, latitude, longitude, altitude, net_enabled, sensorslist, function (db_result) {

                            if (db_result.result === "SUCCESS") {

                                if (ckan_enabled === "true") {

                                    logger.info("CKAN enabled registration: ");

                                    ckan.CkanBoardRegistration(node, node_label, latitude, longitude, altitude, function (ckan_result) {

                                        if (ckan_result.result == "ERROR") {
                                            response.message = "Error CKAN registering node: " + ckan_result.message;
                                            response.result = "ERROR";
                                            logger.error("[NETWORK] --> " + response.message);
                                            res.send(JSON.stringify(response));

                                        } else {
                                            res.send(JSON.stringify(ckan_result));
                                        }

                                    });

                                }
                                else {
                                    res.send(JSON.stringify(db_result));
                                }

                            } else {
                                res.send(JSON.stringify(db_result));
                            }


                        });

                    }else{

                        try{

                            var extra = JSON.parse(req.body.extra);
                            var ckan_enabled = extra.ckan_enabled;
                            logger.debug("[SYSTEM] --> ckan_enabled: " + ckan_enabled);

                            db.regNode(node, node_label, latitude, longitude, altitude, net_enabled, sensorslist, function (db_result) {

                                if (db_result.result === "SUCCESS") {

                                    if (ckan_enabled === "true") {

                                        logger.info("CKAN enabled registration: ");

                                        ckan.CkanBoardRegistration(node, node_label, latitude, longitude, altitude, function (ckan_result) {

                                            if (ckan_result.result == "ERROR") {
                                                response.message = "Error CKAN registering node: " + ckan_result.message;
                                                response.result = "ERROR";
                                                logger.error("[NETWORK] --> " + response.message);
                                                res.send(JSON.stringify(response));

                                            } else {
                                                res.send(JSON.stringify(ckan_result));
                                            }

                                        });

                                    }
                                    else {
                                        res.send(JSON.stringify(db_result));
                                    }

                                } else {
                                    res.send(JSON.stringify(db_result));
                                }


                            });

                        }
                        catch (err) {
                            response.message = "Parsing 'extra' JSON payload: " + err;
                            response.result = "ERROR";
                            logger.error("[SYSTEM] --> " + response.message);
                            res.send(JSON.stringify(response));
                        }

                    }

                }
                else
                    logger.debug("[SYSTEM] --> No extra data.");



            }
            catch (err) {

                response.result = "ERROR";
                response.message = err.toString();
                logger.error('[SYSTEM] - ' + response.message);
                res.send(JSON.stringify(response));

            }

        }



    });

    //update node
    rest.patch('/v1/nodes/:node', function (req, res)




    {

        var node = req.params.node;
        var node_label = req.body.node_label;
        var latitude = req.body.latitude;
        var longitude = req.body.longitude;
        var altitude = req.body.altitude;
        var net_enabled = req.body.net_enabled;
        var sensorslist = req.body.sensorslist;

        var response = {
            result: "",
            message: ""
        };

        logger.info("[SYSTEM] - BOARD " + node_label + " (" + node + ") UPDATING...");
        
        db.updateNode(node, node_label, latitude, longitude, altitude, net_enabled, sensorslist, function (db_result) {

            if (db_result.result == "ERROR") {
                logger.error("[SYSTEM] --> " + db_result.message);
                res.send(JSON.stringify(db_result));

            } else {

                var position = {
                    "altitude": altitude,
                    "longitude": longitude,
                    "latitude": latitude
                };

                db.checkNodeConnected(node, function (check_result) {

                    var status = check_result[0].status;

                    if (status === "C") {

                        logger.debug('[SYSTEM] - RPC call towards: ' + node + '.command.setBoardPosition \n with parameters: ' + JSON.stringify(position));
                        session.call(node + '.command.setBoardPosition', [position]).then(
                            function (conf_result) {
                                response.message = db_result.message + " - " + conf_result;
                                response.result = "SUCCESS";
                                res.send(JSON.stringify(response));
                            }
                            , session.log);

                    } else {
                        response.message = db_result.message + " - !!! WARNING: POSITION ON BOARD NOT UPDATED !!!";
                        response.result = "WARNING";
                        res.send(JSON.stringify(response));
                    }

                });



            }







        });

    });

    //delete node
    rest.delete('/v1/nodes/:node', function (req, res) {


        var node = req.params.node;

        logger.info("[SYSTEM] - UNREGISTERING NODE " + node + "...");
        db.unRegNode(node, function (response) {
            
            res.send(JSON.stringify(response));

        });

    });

    //get sensors list
    rest.get('/v1/sensors/', function (req, res) {

        db.getSensorList(function (data) {

            logger.debug("[SYSTEM] - Sensors list called.");

            var response = {
                message: '',
                result: ''
            };

            if (data.result == "ERROR") {
                response.message = "Error getting sensors list: " + data.message;
                response.result = "ERROR";
                logger.error("[SYSTEM] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {
                res.send(JSON.stringify(data));
            }

        });

    });


    logger.debug("[REST-EXPORT] - Node's APIs exposed!");


};


var checkNodeAvailable = function (node, res, callback) {

    var result;

    var response = {
        message: {},
        result: ""
    };

    db.checkNodeConnected(node, function (data) {

        if (data.length == 1) {

            if (data[0].status == 'D') {

                logger.warn("[API] - Node " + node + " is disconnected!");
                response.result = "ERROR";
                response.message = "Board " + node + " is disconnected!";
                res.send(JSON.stringify(response));

                callback(false);

            }
            else {

                callback(true);

            }

        }
        else {

            logger.warn("[API] - Node " + node + " does not exsist!");

            response.result = "ERROR";
            response.message = "Node " + node + " doesn't exsist!";
            res.send(JSON.stringify(response));

            callback(false);
        }

    });
};


module.exports = node_utils;
module.exports.checkNodeAvailable = checkNodeAvailable;