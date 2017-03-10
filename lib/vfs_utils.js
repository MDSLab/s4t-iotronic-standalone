/*

 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2016 Nicola Peditto

*/


//service logging configuration: "vfs_utils"
var logger = log4js.getLogger('vfs_utils');
logger.setLevel(loglevel);

var db_utils = require('./mysql_db_utils');
var db = new db_utils;
var fs = require('fs');
var node_utility = require('./node_utils');

var session_wamp;

vfs_utils = function (session, rest) {

    session_wamp = session;

    // VFS MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //get mountpoints list
    rest.get('/v1/vfs/', function (req, res) {


        logger.debug("[API] - Mountpoints list - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        db_utils.prototype.getMountpointsList(function (data) {

            res.send(JSON.stringify(data));

        });


    });

    //get mountpoints list on node
    rest.get('/v1/vfs/:node', function (req, res) {

        logger.debug("[API] - Node Mountpoints list - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var node = req.params.node;
        var response = {};

        node_utility.checkNodeAvailable(node, res, function (available){

            if(available.result != "ERROR"){

                logger.debug("[SYSTEM] - Mountpoints list for the node " + node + " called.");
                db_utils.prototype.NodeMountpoints(node, function (data) {
                    response = data;
                    res.send(JSON.stringify(response, null, "\t"));

                });

            }

        });



    });
    
    //mount VFS in a node
    rest.post('/v1/vfs/:node/mount', function (req, res) {

        logger.debug("[API] - VFS Mount - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var node = req.params.node;

        node_utility.checkNodeAvailable(node, res, function (available){

            if(available.result == "SUCCESS"){

                var node_src = req.body.node_src;
                var path_src = req.body.path_src;
                var path_dst = req.body.path_dst;

                var APIparamsList= {"node_src":node_src, "path_src":path_src, "path_dst":path_dst};

                node_utility.checkDefInputs(APIparamsList, function (check){

                    if(check.result == "ERROR"){

                        res.send(JSON.stringify(check));

                    }else {

                        node_utility.checkRestInputs(req, function (check){

                            if(check.result == "ERROR"){
                                res.send(JSON.stringify(check));

                            }else {

                                vfs_utils.prototype.mountVFS(node, node_src, path_src, path_dst, res);

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

    //unmount VFS from a node
    rest.post('/v1/vfs/:node/unmount', function (req, res) {

        logger.debug("[API] - VFS Unmount - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var node = req.params.node;

        node_utility.checkNodeAvailable(node, res, function (available){

            if(available.result == "SUCCESS"){

                var node_src = req.body.node_src;
                var path_src = req.body.path_src;
                var path_dst = req.body.path_dst;

                var APIparamsList= {"node_src":node_src, "path_src":path_src, "path_dst":path_dst};

                node_utility.checkDefInputs(APIparamsList, function (check){

                    if(check.result == "ERROR"){

                        res.send(JSON.stringify(check));

                    }else {

                        node_utility.checkRestInputs(req, function (check){

                            if(check.result == "ERROR"){
                                res.send(JSON.stringify(check));

                            }else {

                                vfs_utils.prototype.unmountVFS(node, node_src, path_src, path_dst, res);

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

    logger.debug("[REST-EXPORT] - VFS's APIs exposed!");

};


vfs_utils.prototype.mountVFS = function (node, mirror_node, path_src, mountpoint, res) {

    var response = {
        message: '',
        result: ''
    };



    db.checkNodeConnected(mirror_node, function (check_result) {

        if (check_result.result == "ERROR") {
            response.result = check_result.result;
            response.message = "DB checkNodeConnected error for node " + node + ": " + check_result.message;
            logger.error("[SYSTEM] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            var status = check_result.message[0].status;

            if (status === "D") {

                response.result = "ERROR";
                response.message = "MIRROR NODE: "+mirror_node+" is disconnected!";
                logger.warn(response.message);
                res.send(response);

            } else {

         

                db.checkNodeMountpoint(node, mountpoint, function (check_result) {

                    if (check_result.result == "ERROR") {

                        logger.error("[SERVICE] --> DB checkNodeMountpoint error for node " + node + ": " + check_result.message);
                        res.send(JSON.stringify(check_result));

                    } else {

                        if (check_result.message.length == 0){

                            session_wamp.call('s4t.' + node + '.fs.mountFS', [mirror_node, path_src, mountpoint]).then(
                                function (fs_result) {

                                    if (fs_result.result === "SUCCESS") {

                                        db.insertMountpoint(node, mountpoint, mirror_node, path_src, "mounted", function (check_result) {

                                            if (check_result.result == "ERROR") {
                                                logger.error("[SERVICE] --> DB insertMountpoint error for node " + node + ": " + check_result.message);
                                                res.send(JSON.stringify(check_result));

                                            } else {
                                                response.result = "SUCCESS";
                                                response.message = "Mounted "+ path_src + " of " + mirror_node +" IN "+ mountpoint +" of "+ node;
                                                logger.info("[VFS] - "+response.message);
                                                res.send(response);

                                            }

                                        });

                                    }
                                    else{

                                        response.result = "WARNING";
                                        response.message = JSON.stringify(fs_result);
                                        logger.warn("[VFS] - "+JSON.stringify(fs_result));
                                        res.send(response);

                                    }
                                }
                            );

                        }else{

                            response.result = "ERROR";
                            response.message = mountpoint + " already mounted in node " + node;
                            logger.error("[VFS] - "+JSON.stringify(response.message));
                            res.send(response);

                        }



                    }

                });






            }
            
        }

        

    });







};

vfs_utils.prototype.unmountVFS = function (node, mirror_node, path_src, mountpoint, res) {

    var response = {
        message: "",
        result: ""
    };

    db.checkNodeConnected(node, function (check_result) {

        if (check_result.result == "ERROR") {
            response.result = check_result.result;
            response.message = "DB checkNodeConnected error for node " + node + ": " + check_result.message;
            logger.error("[SYSTEM] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            var status = check_result.message[0].status;

            if (status === "D") {

                response.result = "ERROR";
                response.message = "Node: "+node+" is disconnected!";
                logger.error(response.message);
                res.send(JSON.stringify(response));

            } else {


                db.checkNodeMountpoint(node, mountpoint, function (check_result) {

                    if (check_result.result == "ERROR") {

                        logger.error("[SERVICE] --> DB checkNodeMountpoint error for node " + node + ": " + check_result.message);
                        res.send(JSON.stringify(check_result));

                    } else {

                        if (check_result.message.length == 0){

                            response.result = "WARNING";
                            response.message = mountpoint + " already unmounted in node " + node;
                            logger.warn("[VFS] - "+JSON.stringify(response.message));
                            res.send(response);

                        }else{

                            session_wamp.call('s4t.' + node + '.fs.unmountFS', [mountpoint]).then(

                                function (fs_result) {

                                    if (fs_result.result === "SUCCESS") {

                                        db.deleteMountpoint(node, mountpoint, mirror_node, path_src, function (check_result) {

                                            if (check_result.result == "ERROR") {
                                                logger.error("[SERVICE] --> DB insertMountpoint error for node " + node + ": " + check_result.message);
                                                res.send(JSON.stringify(check_result));

                                            } else {

                                                response.result = fs_result.result;
                                                response.message = "Unmounted "+ mountpoint +" from "+ node;
                                                logger.info("[VFS] - "+response.message);
                                                res.send(JSON.stringify(response));

                                            }

                                        });

                                    }
                                    else{
                                        response.result = fs_result.result;
                                        response.message = fs_result.message;
                                        logger.error("[VFS] - " + response.message);
                                        res.send(JSON.stringify(response));
                                    }

                                }
                            );

                        }

                    }

                });





            }

        }

    });

};





module.exports = vfs_utils;
