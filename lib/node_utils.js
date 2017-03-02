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

        db.getNodesList(function (data) {
            res.send(JSON.stringify(data));
            logger.debug("[SYSTEM] - Nodes list called.");
        });

    });

    //get node info
    rest.get('/v1/nodes/:node', function (req, res) {

        var node = req.params.node;

        logger.debug("[SYSTEM] - Node info called!");

        db_utils.prototype.NodeInfo(node, function (result) {
            res.send(result); //JSON.stringify(result));
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
        
        try {

            logger.info("[SYSTEM] - NEW BOARD " + node_label + " (" + node + ") - REGISTRATION INFO:\n" + JSON.stringify(req.body, null, "\t"));

            if (req.body.extra != undefined) {
                try{
                    var extra = JSON.parse(req.body.extra);
                    var ckan_enabled = extra.ckan_enabled;
                }
                catch (err) {
                    var extra = req.body.extra;
                    var ckan_enabled = extra.ckan_enabled;
                }
            }
            else
                logger.debug("[SYSTEM] --> No extra data.");

            db.regNode(node, node_label, latitude, longitude, altitude, net_enabled, sensorslist, function (db_result) {

                if (db_result.result === "SUCCESS") {

                    if (ckan_enabled === "true") {

                        logger.info("CKAN enabled registration: ");

                        ckan.CkanBoardRegistration(node, node_label, latitude, longitude, altitude, function (ckan_result) {
                            res.send(JSON.stringify(ckan_result));
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

            var response = {
                result: "ERROR",
                message: err.toString()
            };
            logger.error('[SYSTEM] - ' + err);
            res.send(JSON.stringify(response));

        }

    });

    //update node
    rest.patch('/v1/nodes/:node', function (req, res) {

        var node = req.params.node;
        var node_label = req.body.node_label;
        var latitude = req.body.latitude;
        var longitude = req.body.longitude;
        var altitude = req.body.altitude;
        var net_enabled = req.body.net_enabled;
        var sensorslist = req.body.sensorslist;

        logger.info("[SYSTEM] - BOARD " + node_label + " (" + node + ") UPDATING...");
        
        db.updateNode(node, node_label, latitude, longitude, altitude, net_enabled, sensorslist, function (db_result) {

            var response = {
                result: "",
                message: ""
            };
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

        db_utils.prototype.getSensorList(function (data) {
            res.send(JSON.stringify(data));
            logger.debug("[SYSTEM] - Sensor list called.");
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