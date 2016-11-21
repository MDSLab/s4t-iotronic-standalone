/*

 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2016 Nicola Peditto

*/


//service logging configuration: "fs_utils"   
var logger = log4js.getLogger('fs_utils');
logger.setLevel(loglevel);

var db_utils = require('./mysql_db_utils');
var db = new db_utils;
var fs = require('fs');

var session_wamp;

fs_utils = function (session) {
    session_wamp = session;
};




fs_utils.prototype.mountfs = function (board, mirror_board, path_org, path_dest, res) {

    logger.info("[FS] - MOUNTING: "+ board +" - "+ mirror_board +" - "+ path_org +" - "+ path_dest);


    var response = {
        message: 'Exporting FS',
        result: {}
    };


    db.checkBoardConnected(board, function (check_result) {

        var status = check_result[0].status;

        if (status === "D") {

            response.result = "BOARD: "+board+" is disconnected!";
            logger.warn(response.result);
            res.send(response);


        } else {

            db.checkBoardConnected(mirror_board, function (check_result) {

                var status = check_result[0].status;

                if (status === "D") {

                    response.result = "MIRROR BOARD: "+mirror_board+" is disconnected!";
                    logger.warn(response.result);
                    res.send(response);

                } else {



                    session_wamp.call('s4t.' + board + '.fs.mountFS', [mirror_board, path_org, path_dest]).then(
                        function (fs_result) {

                            if (fs_result.result === "SUCCESS") {

                                response.result = "MOUNTED "+ board +" - "+ mirror_board +" - "+ path_org +" - "+ path_dest;
                                logger.info("[FS] - "+response.result);
                                res.send(response);

                            }
                        }
                    );






                }

            });


        }

    });




};









fs_utils.prototype.unmountfs = function (board, path_dest, res) {

    logger.info("[FS] - UNMOUNTING: "+ board +" - "+ path_dest);


    var response = {
        message: 'Unmounting FS',
        result: {}
    };


    db.checkBoardConnected(board, function (check_result) {

        var status = check_result[0].status;

        if (status === "D") {

            response.result = "BOARD: "+board+" is disconnected!";
            logger.warn(response.result);
            res.send(response);


        } else {

            session_wamp.call('s4t.' + board + '.fs.unmountFS', [path_dest]).then(
                function (fs_result) {

                    if (fs_result.result === "SUCCESS") {

                        response.result = "UNMOUNTED FS "+ path_dest +" from "+ board;
                        logger.info("[FS] - "+response.result);
                        res.send(response);

                    }
                }
            );


        }

    });




};











module.exports = fs_utils;
