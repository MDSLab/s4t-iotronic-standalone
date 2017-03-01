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

    // SERVICES MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //mount VFS in a node
    rest.post('/v1/vfs/:node/mount', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var node = req.params.node;
        var node_src = req.body.node_src;
        var path_src = req.body.path_src;
        var path_dst = req.body.path_dst;

        node_utility.checkNodeAvailable(node, res, function (available){

            if(available == true){

                vfs_utils.prototype.mountVFS(node, node_src, path_src, path_dst, res);

            }

        });


    });

    //unmount VFS from a node
    rest.post('/v1/vfs/:node/unmount', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var node = req.params.node;
        var path_dst = req.body.path_dst;

        node_utility.checkNodeAvailable(node, res, function (available){

            if(available == true){

                vfs_utils.prototype.unmountVFS(node, path_dst, res);

            }

        });


    });

    logger.debug("[REST-EXPORT] - VFS's APIs exposed!");

};










vfs_utils.prototype.mountVFS = function (board, mirror_board, path_org, path_dest, res) {

    var response = {
        message: '',
        result: ''
    };


    db.checkBoardConnected(mirror_board, function (check_result) {

        var status = check_result[0].status;

        if (status === "D") {

            response.result = "ERROR";
            response.message = "MIRROR NODE: "+mirror_board+" is disconnected!";
            logger.warn(response.message);
            res.send(response);

        } else {

            session_wamp.call('s4t.' + board + '.fs.mountFS', [mirror_board, path_org, path_dest]).then(
                function (fs_result) {

                    if (fs_result.result === "SUCCESS") {

                        response.result = "SUCCESS";
                        response.message = "Mounted "+ path_dest + " of " + mirror_board +" IN "+ path_org +" of "+ board;
                        logger.info("[VFS] - "+response.message);
                        res.send(response);

                    }
                    else{
                        response.result = "ERROR";
                        response.message = JSON.stringify(fs_result);
                        logger.error("[VFS] - "+JSON.stringify(fs_result));
                        res.send(response);
                    }
                }
            );


        }

    });







};






vfs_utils.prototype.unmountVFS = function (board, path_dest, res) {

    var response = {
        message: "",
        result: ""
    };


    db.checkBoardConnected(board, function (check_result) {

        var status = check_result[0].status;

        if (status === "D") {

            response.result = "ERROR";
            response.message = "Node: "+board+" is disconnected!";
            logger.warn(response.message);
            res.send(response);


        } else {

            session_wamp.call('s4t.' + board + '.fs.unmountFS', [path_dest]).then(

                function (fs_result) {

                    if (fs_result.result === "SUCCESS") {

                        response.result = fs_result.result;
                        response.message = "Unmounted "+ path_dest +" from "+ board;
                        logger.info("[VFS] - "+response.message);
                        res.send(response);

                    }
                    else{
                        response.result = fs_result.result;
                        response.message = fs_result.message;
                        logger.error("[VFS] - " + response.message);
                        res.send(response);
                    }

                }
            );


        }

    });




};





module.exports = vfs_utils;
