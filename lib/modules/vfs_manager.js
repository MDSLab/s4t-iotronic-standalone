//###############################################################################
//##
//# Copyright (C) 2016-2017 Nicola Peditto, Francesco Longo
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

var logger = log4js.getLogger('vfs_utils');
logger.setLevel(loglevel);

var db_utils = require('./../management/mng_db');
var db = new db_utils;
var fs = require('fs');
var board_utility = require('./../management/mng_board');

var session_wamp;

vfs_utils = function (session, rest) {

    session_wamp = session;

    // VFS MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //get mountpoints list
    /**
     * @swagger
     * /v1/vfs/:
     *   get:
     *     tags:
     *       - VFS
     *     description: It returns VFS mountpoints list
     *     summary: get IoTronic mountpoints list
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: List of VFS mountpoints
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of mountpoints"
     *                  items:
     *                      title: mountpoint info
     *                      type: object
     *                      properties:
     *                          src_board:
     *                              type: string
     *                              description: "The IoTronic board ID: source board that expose a folder"
     *                          dst_board:
     *                              type: string
     *                              description: "The IoTronic board ID: board that mounts a folder of the src_board"
     *                          src_path:
     *                              type: string
     *                              description: "Path of the folder exposed by the src_board"
     *                          dst_path:
     *                              type: string
     *                              description: "Path where the source folder is mounted"
     *                          status:
     *                              type: string
     *                              description: "Status of the mountpoint: 'mounted', 'unmounted', 'injected'"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/vfs/', function (req, res) {

        logger.info("[API] - Mountpoints list - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        db.getMountpointsList(function (data) {

            if(data.result=="ERROR"){
                response.message = data.message;
                response.result = "ERROR";
                logger.error("[VFS] --> " + JSON.stringify(response.message));
                res.status(500).send(response);

            }else{
                response.message = data.message;
                response.result = "SUCCESS";
                res.status(200).send(response);

            }

        });


    });


    //get mountpoints list on board
    /**
     * @swagger
     * /v1/boards/{board}/vfs:
     *   get:
     *     tags:
     *       - VFS
     *     description: It returns mountpoints list of a board
     *     summary: get board mountpoints list
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *          description: List of board VFS mountpoints
     *          properties:
     *              result:
     *                  type: string
     *                  description: "SUCCESS"
     *              message:
     *                  type: array
     *                  description: "List of mountpoints"
     *                  items:
     *                      title: mountpoint info
     *                      type: object
     *                      properties:
     *                          src_board:
     *                              type: string
     *                              description: "The IoTronic board ID: source board that expose a folder"
     *                          src_path:
     *                              type: string
     *                              description: "Path of the folder exposed by the src_board"
     *                          dst_path:
     *                              type: string
     *                              description: "Path where the source folder is mounted"
     *       403:
     *         description: "Wrong, expired or not specified token in request header."
     *       500:
     *         description: "API specific error message."
     */
    rest.get('/v1/boards/:board/vfs', function (req, res) {

        logger.info("[API] - Board Mountpoints list - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        var board = req.params.board;
        

        logger.debug("[VFS] - Mountpoints list for the board " + board);
        
        db.BoardMountpoints(board, function (data) {

            if (data.result == "ERROR") {
                logger.error("[DRIVER] --> " + data.message);
                res.status(500).send(data);

            } else {
                res.status(200).send(data);
            }

        });



    });
    
    
    //mount VFS in a board
    /**
     * @swagger
     * /v1/boards/{board}/vfs/mount:
     *   post:
     *     tags:
     *       - VFS
     *     description: It mounts a folder to another board.
     *     summary: mount folder to another board
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic board ID of the board where to mount a folder
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - src_board
     *                  - src_path
     *                  - dst_path
     *              properties:
     *                  src_board:
     *                      type: string
     *                      description: "board ID of the source board where there is the folder to export"
     *                  src_path:
     *                      type: string
     *                      description: "source folder to export from 'src_board' towards 'board'"
     *                  dst_path:
     *                      type: string
     *                      description: "destination folder where to mount the 'src_path' into the destination 'board'"
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
    rest.post('/v1/boards/:board/vfs/mount', function (req, res) {

        logger.info("[API] - VFS Mount - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var src_board = req.body.src_board;
                var src_path = req.body.src_path;
                var dst_path = req.body.dst_path;

                var ApiRequired= {"src_board":src_board, "src_path":src_path, "dst_path":dst_path};

                board_utility.checkRequired(ApiRequired, function (check){

                    if(check.result == "ERROR"){

                        res.status(500).send(check);

                    }else {
                        
                        vfs_utils.mountVFS(board, src_board, src_path, dst_path, res);
                        
                    }

                });
                
            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }

        });



    });

    
    //unmount VFS from a board
    /**
     * @swagger
     * /v1/boards/{board}/vfs/unmount:
     *   post:
     *     tags:
     *       - VFS
     *     description: It unmounts a mountpoint previously mounted from a board.
     *     summary: unmount folder from a board
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic board ID where to unmount a mountpoint
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - src_board
     *                  - src_path
     *                  - dst_path
     *              properties:
     *                  src_board:
     *                      type: string
     *                      description: "board ID of the source board where there is the folder exported"
     *                  src_path:
     *                      type: string
     *                      description: "source folder exported from 'src_board' towards 'board'"
     *                  dst_path:
     *                      type: string
     *                      description: "destination folder to unmount from the destination 'board'"
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
    rest.post('/v1/boards/:board/vfs/unmount', function (req, res) {

        logger.info("[API] - VFS Unmount - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var src_board = req.body.src_board;
                var src_path = req.body.src_path;
                var dst_path = req.body.dst_path;

                var ApiRequired= {"src_board":src_board, "src_path":src_path, "dst_path":dst_path};

                board_utility.checkRequired(ApiRequired, function (check){

                    if(check.result == "ERROR"){

                        res.status(500).send(check);

                    }else {

                        vfs_utils.unmountVFS(board, src_board, src_path, dst_path, res);
                        
                    }

                });

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }

        });


    });

    
    //force-mount VFS in a board
    /**
     * @swagger
     * /v1/boards/{board}/vfs/force-mount:
     *   post:
     *     tags:
     *       - VFS
     *     description: It forces the mounting of a folder to another board.
     *     summary: force mounting of a folder to another board
     *     parameters:
     *      - in: path
     *        name: board
     *        required: true
     *        schema:
     *        type: string
     *        description: The IoTronic board ID of the board where to mount a folder
     *      - name: body
     *        in: body
     *        required: true
     *        schema:
     *              type: object
     *              required:
     *                  - src_board
     *                  - src_path
     *                  - dst_path
     *              properties:
     *                  src_board:
     *                      type: string
     *                      description: "board ID of the source board where there is the folder to export"
     *                  src_path:
     *                      type: string
     *                      description: "source folder to export from 'src_board' towards 'board'"
     *                  dst_path:
     *                      type: string
     *                      description: "destination folder where to mount the 'src_path' into the destination 'board'"
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
    rest.post('/v1/boards/:board/vfs/force-mount', function (req, res) {

        logger.info("[API] - VFS Mount - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var src_board = req.body.src_board;
                var src_path = req.body.src_path;
                var dst_path = req.body.dst_path;

                var ApiRequired= {"src_board":src_board, "src_path":src_path, "dst_path":dst_path};

                board_utility.checkRequired(ApiRequired, function (check){

                    if(check.result == "ERROR"){

                        res.status(500).send(check);

                    }else {

                        db.deleteMountpoint(board, dst_path, src_board, src_path, function (check_result) {

                            if (check_result.result == "ERROR") {
                                logger.error("[SERVICE] --> DB insertMountpoint error for board " + board + ": " + check_result.message);
                                res.status(500).send(check_result);

                            } else {

                                vfs_utils.mountVFS(board, src_board, src_path, dst_path, res);

                            }

                        });


                    }

                });

            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.status(200).send(available);
            }

        });



    });

    
    logger.debug("[REST-EXPORT] - VFS's APIs exposed!");

};


vfs_utils.prototype.mountVFS = function (board, mirror_board, src_path, mountpoint, res) {

    var response = {
        message: '',
        result: ''
    };



    db.checkBoardConnected(mirror_board, function (check_result) {

        if (check_result.result == "ERROR") {
            response.result = check_result.result;
            response.message = "DB checkBoardConnected error for board " + board + ": " + check_result.message;
            logger.error("[SYSTEM] --> " + response.message);
            res.status(500).send(response);

        } else {

            var status = check_result.message[0].status;

            if (status === "D") {

                response.result = "ERROR";
                response.message = "MIRROR BOARD: "+mirror_board+" is disconnected!";
                logger.warn(response.message);
                res.status(500).send(response);

            } else {

         

                db.checkBoardMountpoint(board, mountpoint, function (check_result) {

                    if (check_result.result == "ERROR") {

                        logger.error("[SERVICE] --> DB checkBoardMountpoint error for board " + board + ": " + check_result.message);
                        res.status(500).send(check_result);

                    } else {

                        if (check_result.message.length == 0){

                            session_wamp.call('s4t.' + board + '.fs.mountFS', [mirror_board, src_path, mountpoint]).then(
                                function (fs_result) {

                                    if (fs_result.result === "SUCCESS") {

                                        db.insertMountpoint(board, mountpoint, mirror_board, src_path, "mounted", function (check_result) {

                                            if (check_result.result == "ERROR") {
                                                logger.error("[SERVICE] --> DB insertMountpoint error for board " + board + ": " + check_result.message);
                                                res.status(500).send(check_result);

                                            } else {
                                                response.result = "SUCCESS";
                                                response.message = "Mounted "+ src_path + " of " + mirror_board +" IN "+ mountpoint +" of "+ board;
                                                logger.info("[VFS] - "+response.message);
                                                res.status(200).send(response);

                                            }

                                        });

                                    }
                                    else{

                                        response.result = "WARNING";
                                        response.message = JSON.stringify(fs_result);
                                        logger.warn("[VFS] - "+JSON.stringify(fs_result));
                                        res.status(200).send(response);

                                    }
                                }
                            );

                        }else{

                            response.result = "ERROR";
                            response.message = mountpoint + " already mounted in board " + board;
                            logger.error("[VFS] - "+JSON.stringify(response.message));
                            res.status(500).send(response);

                        }



                    }

                });






            }
            
        }

        

    });







};

vfs_utils.prototype.unmountVFS = function (board, mirror_board, src_path, mountpoint, res) {

    var response = {
        message: "",
        result: ""
    };

    db.checkBoardConnected(board, function (check_result) {

        if (check_result.result == "ERROR") {
            response.result = check_result.result;
            response.message = "DB checkBoardConnected error for board " + board + ": " + check_result.message;
            logger.error("[SYSTEM] --> " + response.message);
            res.status(500).send(response);

        } else {

            var status = check_result.message[0].status;

            if (status === "D") {

                response.result = "ERROR";
                response.message = "Board: "+board+" is disconnected!";
                logger.error(response.message);
                res.status(500).send(response);

            } else {


                db.checkBoardMountpoint(board, mountpoint, function (check_result) {

                    if (check_result.result == "ERROR") {

                        logger.error("[SERVICE] --> DB checkBoardMountpoint error for board " + board + ": " + check_result.message);
                        res.status(500).send(check_result);

                    } else {

                        /*
                        if (check_result.message.length == 0){

                            response.result = "WARNING";
                            response.message = mountpoint + " already unmounted in board " + board;
                            logger.warn("[VFS] - "+JSON.stringify(response.message));
                            res.status(500).send(response);

                        }else{
                        */
                            session_wamp.call('s4t.' + board + '.fs.unmountFS', [mountpoint]).then(

                                function (fs_result) {

                                    if (fs_result.result === "SUCCESS") {

                                        db.deleteMountpoint(board, mountpoint, mirror_board, src_path, function (check_result) {

                                            if (check_result.result == "ERROR") {
                                                logger.error("[SERVICE] --> DB insertMountpoint error for board " + board + ": " + check_result.message);
                                                res.status(500).send(check_result);

                                            } else {

                                                response.result = fs_result.result;
                                                response.message = "Unmounted "+ mountpoint +" from "+ board;
                                                logger.info("[VFS] - "+response.message);
                                                res.status(200).send(response);

                                            }

                                        });

                                    }
                                    else{
                                        response.result = fs_result.result;
                                        response.message = fs_result.message;
                                        logger.error("[VFS] - " + response.message);
                                        res.status(500).send(response);
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
