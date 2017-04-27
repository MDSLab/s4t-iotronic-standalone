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
var board_utility = require('./board_utils');

var session_wamp;

vfs_utils = function (session, rest) {

    session_wamp = session;

    // VFS MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //get mountpoints list
    rest.get('/v1/vfs/', function (req, res) {

        logger.debug("[API] - Mountpoints list - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var response = {
            message: '',
            result: ''
        };

        db.getMountpointsList(function (data) {

            if(data.result=="ERROR"){
                response.message = data.message;
                response.result = "ERROR";
                logger.error("[VFS] --> " + JSON.stringify(response.message));
                res.send(JSON.stringify(response));

            }else{
                response.message = data.message;
                response.result = "SUCCESS";
                res.send(JSON.stringify(response));

            }

        });


    });

    //get mountpoints list on board
    rest.get('/v1/boards/:board/vfs', function (req, res) {

        logger.debug("[API] - Board Mountpoints list - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var response = {
            message: '',
            result: ''
        };

        var board = req.params.board;
        

        logger.debug("[VFS] - Mountpoints list for the board " + board);
        
        db.BoardMountpoints(board, function (data) {

            if (data.result == "ERROR") {
                logger.error("[DRIVER] --> " + data.message);
                res.send(JSON.stringify(data));

            } else {
                res.send(JSON.stringify(data));
            }

        });



    });
    
    //mount VFS in a board
    rest.post('/v1/boards/:board/vfs/mount', function (req, res) {

        logger.debug("[API] - VFS Mount - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var board_src = req.body.board_src;
                var path_src = req.body.path_src;
                var path_dst = req.body.path_dst;

                var APIparamsList= {"board_src":board_src, "path_src":path_src, "path_dst":path_dst};

                board_utility.checkDefInputs(APIparamsList, function (check){

                    if(check.result == "ERROR"){

                        res.send(JSON.stringify(check));

                    }else {

                        board_utility.checkRestInputs(req, function (check){

                            if(check.result == "ERROR"){
                                res.send(JSON.stringify(check));

                            }else {

                                vfs_utils.prototype.mountVFS(board, board_src, path_src, path_dst, res);

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

    //unmount VFS from a board
    rest.post('/v1/boards/:board/vfs/unmount', function (req, res) {

        logger.debug("[API] - VFS Unmount - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var board_src = req.body.board_src;
                var path_src = req.body.path_src;
                var path_dst = req.body.path_dst;

                var APIparamsList= {"board_src":board_src, "path_src":path_src, "path_dst":path_dst};

                board_utility.checkDefInputs(APIparamsList, function (check){

                    if(check.result == "ERROR"){

                        res.send(JSON.stringify(check));

                    }else {

                        board_utility.checkRestInputs(req, function (check){

                            if(check.result == "ERROR"){
                                res.send(JSON.stringify(check));

                            }else {

                                vfs_utils.prototype.unmountVFS(board, board_src, path_src, path_dst, res);

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

    //force-mount VFS in a board
    rest.post('/v1/boards/:board/vfs/force-mount', function (req, res) {

        logger.debug("[API] - VFS Mount - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var board_src = req.body.board_src;
                var path_src = req.body.path_src;
                var path_dst = req.body.path_dst;

                var APIparamsList= {"board_src":board_src, "path_src":path_src, "path_dst":path_dst};

                board_utility.checkDefInputs(APIparamsList, function (check){

                    if(check.result == "ERROR"){

                        res.send(JSON.stringify(check));

                    }else {

                        board_utility.checkRestInputs(req, function (check){

                            if(check.result == "ERROR"){
                                res.send(JSON.stringify(check));

                            }else {

                                db.deleteMountpoint(board, path_dst, board_src, path_src, function (check_result) {

                                    if (check_result.result == "ERROR") {
                                        logger.error("[SERVICE] --> DB insertMountpoint error for board " + board + ": " + check_result.message);
                                        res.send(JSON.stringify(check_result));

                                    } else {

                                        vfs_utils.prototype.mountVFS(board, board_src, path_src, path_dst, res);

                                    }

                                });


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


vfs_utils.prototype.mountVFS = function (board, mirror_board, path_src, mountpoint, res) {

    var response = {
        message: '',
        result: ''
    };



    db.checkBoardConnected(mirror_board, function (check_result) {

        if (check_result.result == "ERROR") {
            response.result = check_result.result;
            response.message = "DB checkBoardConnected error for board " + board + ": " + check_result.message;
            logger.error("[SYSTEM] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            var status = check_result.message[0].status;

            if (status === "D") {

                response.result = "ERROR";
                response.message = "MIRROR BOARD: "+mirror_board+" is disconnected!";
                logger.warn(response.message);
                res.send(response);

            } else {

         

                db.checkBoardMountpoint(board, mountpoint, function (check_result) {

                    if (check_result.result == "ERROR") {

                        logger.error("[SERVICE] --> DB checkBoardMountpoint error for board " + board + ": " + check_result.message);
                        res.send(JSON.stringify(check_result));

                    } else {

                        if (check_result.message.length == 0){

                            session_wamp.call('s4t.' + board + '.fs.mountFS', [mirror_board, path_src, mountpoint]).then(
                                function (fs_result) {

                                    if (fs_result.result === "SUCCESS") {

                                        db.insertMountpoint(board, mountpoint, mirror_board, path_src, "mounted", function (check_result) {

                                            if (check_result.result == "ERROR") {
                                                logger.error("[SERVICE] --> DB insertMountpoint error for board " + board + ": " + check_result.message);
                                                res.send(JSON.stringify(check_result));

                                            } else {
                                                response.result = "SUCCESS";
                                                response.message = "Mounted "+ path_src + " of " + mirror_board +" IN "+ mountpoint +" of "+ board;
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
                            response.message = mountpoint + " already mounted in board " + board;
                            logger.error("[VFS] - "+JSON.stringify(response.message));
                            res.send(response);

                        }



                    }

                });






            }
            
        }

        

    });







};

vfs_utils.prototype.unmountVFS = function (board, mirror_board, path_src, mountpoint, res) {

    var response = {
        message: "",
        result: ""
    };

    db.checkBoardConnected(board, function (check_result) {

        if (check_result.result == "ERROR") {
            response.result = check_result.result;
            response.message = "DB checkBoardConnected error for board " + board + ": " + check_result.message;
            logger.error("[SYSTEM] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            var status = check_result.message[0].status;

            if (status === "D") {

                response.result = "ERROR";
                response.message = "Board: "+board+" is disconnected!";
                logger.error(response.message);
                res.send(JSON.stringify(response));

            } else {


                db.checkBoardMountpoint(board, mountpoint, function (check_result) {

                    if (check_result.result == "ERROR") {

                        logger.error("[SERVICE] --> DB checkBoardMountpoint error for board " + board + ": " + check_result.message);
                        res.send(JSON.stringify(check_result));

                    } else {

                        /*
                        if (check_result.message.length == 0){

                            response.result = "WARNING";
                            response.message = mountpoint + " already unmounted in board " + board;
                            logger.warn("[VFS] - "+JSON.stringify(response.message));
                            res.send(response);

                        }else{
                        */
                            session_wamp.call('s4t.' + board + '.fs.unmountFS', [mountpoint]).then(

                                function (fs_result) {

                                    if (fs_result.result === "SUCCESS") {

                                        db.deleteMountpoint(board, mountpoint, mirror_board, path_src, function (check_result) {

                                            if (check_result.result == "ERROR") {
                                                logger.error("[SERVICE] --> DB insertMountpoint error for board " + board + ": " + check_result.message);
                                                res.send(JSON.stringify(check_result));

                                            } else {

                                                response.result = fs_result.result;
                                                response.message = "Unmounted "+ mountpoint +" from "+ board;
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

                        //}

                    }

                });





            }

        }

    });

};


module.exports = vfs_utils;
