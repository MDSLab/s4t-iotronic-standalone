/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2014 2015 Andrea Rocco Lotronto, Nicola Peditto, Fabio Verboso
 */

//service logging configuration: "net_utils"   
var logger = log4js.getLogger('net_utils');
logger.setLevel(loglevel);

var db = new db_utils;
var utility = require('./utility');
var board_utility = require('./board_utils');

var spawn = require('child_process').spawn;
var ip = require('ip');
var uuid = require('node-uuid');
var Q = require("q");

var IotronicHome = "/var/lib/iotronic";

var nconf = require('nconf');
nconf.file({file: IotronicHome + '/settings.json'});
var socatNetwork = nconf.get('config:socat:ip');
var basePort = nconf.get('config:socat:server:port');


var vlanID = 0; //IN PROGRESS
var greDevices = [];
//var socatBoards = [];
var networksArray = [];

var session_wamp;

net_utils = function (session, rest) {

    session_wamp = session;

    // VNET MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //get vnets list
    rest.get('/v1/vnets/', function (req, res) {

        logger.debug("[API] - VNETs list - " + Object.keys( req.route.methods ) + " - " + req.route.path);
        net_utils.prototype.showNetwork(res);

    });

    //get board vnets list
    rest.get('/v1/boards/:board/vnets', function (req, res) {

        logger.debug("[API] - Board VNETs list - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var board = req.params.board;
        net_utils.prototype.showBoardNetwork(board, res);

    });

    //show vnet boards list
    rest.get('/v1/vnets/:vnet', function (req, res) {

        logger.debug("[API] - VNET Boards - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var vnet = req.params.vnet;

        net_utils.prototype.getVnetBoardsInfo(vnet, res);

    });

    //create vnet in Iotronic
    rest.post('/v1/vnets/', function (req, res) {

        logger.debug("[API] - VNET creation - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var netname = req.body.netname;
        var value = req.body.value;

        var APIparamsList= {"netname":netname, "value":value};

        board_utility.checkDefInputs(APIparamsList, function (check){

            if(check.result == "ERROR"){

                res.send(JSON.stringify(check));

            }else {

                board_utility.checkRestInputs(req, function (check){

                    if(check.result == "ERROR"){
                        res.send(JSON.stringify(check));

                    }else {

                        net_utils.prototype.createNetwork(netname, value, res);

                    }

                });

            }

        });


    });

    //delete vnet from Iotronic
    rest.delete('/v1/vnets/:vnet', function (req, res) {

        logger.debug("[API] - VNET destroy - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var netuuid = req.params.vnet;

        net_utils.prototype.destroyNetwork(netuuid, res);

    });

    //add board to vnet
    rest.put('/v1/boards/:board/vnets/:vnet', function (req, res) {

        logger.debug("[API] - VNET Add Board - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var vnet = req.params.vnet;
        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                var value = req.body.value; //OPTIONAL
                var restore = "false";

                net_utils.prototype.addToNetwork(vnet, board, value, res, restore);


            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }

        });







    });

    //remove board from vnet
    rest.delete('/v1/boards/:board/vnets/:vnet', function (req, res) {

        logger.debug("[API] - VNET Remove Board - " + Object.keys( req.route.methods ) + " - " + req.route.path);

        var vnet = req.params.vnet;
        var board = req.params.board;

        board_utility.checkBoardAvailable(board, res, function (available) {

            if (available.result == "SUCCESS") {

                net_utils.prototype.removeFromNetwork(vnet, board, res);

            } else if (available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }

        });

    });


    //force vnet on board
    rest.put('/v1/vnets/:board/force', function (req, res) {

        var board = req.params.board;
        var restore = "true";

        logger.info("[VNET] - Activating VNETs on board " + board + "...");

        board_utility.checkBoardAvailable(board, res, function (available) {

            if(available.result == "SUCCESS"){
                
                net_utils.prototype.activateBoardNetwork(board, res, restore);
                
            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }

        });


    });
    

    logger.debug("[REST-EXPORT] - VNET's APIs exposed!");

};




net_utils.prototype.showBoardNetwork = function (board, res) {

    var response = {
        message: '',
        result: ''
    };

    db.getBoardVLAN(board, function (data) {


        if (data.result == "ERROR") {

            logger.error("[VNET] --> " + data.message);
            res.send(JSON.stringify(data));

        } else {

            if (data.message.length != 0) {

                logger.debug("[VNET] --> " + JSON.stringify(data.message));
                res.send(JSON.stringify(data.message));

            }else {
                response.result = "SUCCESS";
                response.message = data.message;
                logger.debug("[VNET] --> The "+board+" is not in any VNET!");
                res.send(JSON.stringify(response));

            }

        }

    });



};

net_utils.prototype.showNetwork = function (res) {

    var response = {
        message: '',
        result: ''
    };

    db.getVnetsList(function (data) {

        if (data.result == "ERROR") {

            response.message = "Error getting VNET list: " + data.message;
            response.result = "ERROR";
            logger.error("[VNET] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            var networksList = data.message;

            if (networksList.length == 0){

                response.message = "No VNETs created!";
                response.result = "SUCCESS";
                res.send(JSON.stringify(response));

            }else{

                response.message = [];

                for (var i = 0; i < networksList.length; i++) {
                    (function (i) {

                        var temporary = {
                            uuid: networksList[i].net_uuid,
                            vlan_ip: networksList[i].vlan_ip,
                            vlan_mask: networksList[i].vlan_mask,
                            vlan_name: networksList[i].vlan_name,
                            vlan_id: networksList[i].id
                        };
                        response.message.push(temporary);

                        if (i == (networksList.length - 1)) {

                            response.result = "SUCCESS";
                            res.send(JSON.stringify(response));

                        }

                    })(i);
                }

            }




        }


    });


};

net_utils.prototype.createNetwork = function (netname, value, res) {

    var response = {
        message: '',
        result: ""
    };

    logger.info("[VNET] - Creating a new VNET: " + netname);

    if (netname == undefined || netname == "") {
        response.message = "VNET creation: Please specify a network name!";
        response.result = "ERROR";
        logger.error("[VNET] --> " + response.message);
        res.send(JSON.stringify(response));

    } else if (value == undefined || value == "") {
        response.message = "VNET creation: Please specify a network address!";
        response.result = "ERROR";
        logger.error("[VNET] --> " + response.message);
        res.send(JSON.stringify(response));

    } else {

        try {
            var network = ip.cidrSubnet(value);
            logger.debug("[VNET] --> VNET configuration:\n" + JSON.stringify(network, null, "\t"));
            var first = ip.toLong(network.networkAddress);
            var last = ip.toLong(network.broadcastAddress);
            var overlap = false;

            var vlan_name = netname;
            var vlan_ip = network.networkAddress;
            var vlan_mask = network.subnetMaskLength;

        }catch (err){
            response.message = "Error elaborate address: " + err;
            response.result = "ERROR";
            logger.error("[VNET] --> " + response.message);
            res.send(JSON.stringify(response));


        }

        var idArray = {};
        uuid.v4(null, idArray, 0);
        var net_uuid = uuid.unparse(idArray);


        if (response.result != "ERROR"){


            //CHECK OVERLAPPING NETs
            db.getVnetsList(function (networksList) {

                if (networksList.result == "ERROR") {
                    response.message = "Error getting VNET list: " + networksList.message;
                    response.result = "ERROR";
                    logger.error("[VNET] --> " + response.message);
                    res.send(JSON.stringify(response));

                } else {

                    //OVERLAP CHECK

                    if (!overlap) {

                        logger.debug("[VNET] --> VNET " + netname + ": NO OVERLAP!");

                        var list_ip = [];
                        var temp = first;

                        // Free addresses pool creation: IP from first+1 to last-1; e.g. with a netmask /24 we obtain IP from .1 to .254
                        for (var i = 0; i < network.numHosts; i++) {

                            (function (i) {
                                temp = temp + 1;

                                list_ip.push(ip.fromLong(temp));

                            })(i);

                        }

                        db.insertVNET(vlan_ip, vlan_mask, net_uuid, vlan_name, function (data) {

                            if (data.result == "ERROR") {
                                response.message = "Error inserting new VNET into DB: " + data.message;
                                response.result = "ERROR";
                                logger.error("[VNET] --> " + response.message);
                                res.send(JSON.stringify(response));

                            } else {

                                //logger.debug("[VNET] --> New VNET DB result: " + JSON.stringify(data));

                                var vlanID = data.message;//[0].id;

                                db.insertAddresses(list_ip, net_uuid, function (data_pool) {

                                    if (data_pool.result == "ERROR") {

                                        response.message = "Error creating VNET addresses pool: " + data_pool.message;
                                        response.result = "ERROR";
                                        logger.error("[VNET] --> " + response.message);
                                        res.send(JSON.stringify(response));

                                    } else {


                                        //logger.debug("Addresses pool created: " + JSON.stringify(data_pool));
                                        var newNW = {
                                            vlanid: vlanID,
                                            uuid: net_uuid,
                                            name: netname,
                                            netaddr: network.networkAddress,
                                            netmask: network.subnetMaskLength
                                        };

                                        logger.info("[VNET] - NETWORK CREATED SUCCESSFULLY: \n" + JSON.stringify(newNW, null, "\t"));
                                        response.message = newNW;
                                        response.result = "SUCCESS";
                                        res.send(JSON.stringify(response, null, "\t"));

                                    }


                                });

                            }


                        });

                    } else {
                        logger.error("[VNET] --> " + response.message);
                        res.send(JSON.stringify(response));
                        //res.send(JSON.stringify(response, null, "\t"));
                    }
                }


            });

        }



    }

};

net_utils.prototype.destroyNetwork = function (net_uuid, res) {

    logger.info("[VNET] - Destroying VNET " + net_uuid + "...");

    var response = {
        message: '',
        result: ''
    };

    if (net_uuid == undefined) {

        response.message = "Please specify a network UUID!";
        response.result = "ERROR";
        logger.error("[VNET] --> " + response.message);
        res.send(JSON.stringify(response));

    } else {

        db.getVnet(net_uuid, function (db_response) {

            if (db_response.result == "ERROR") {
                response.message = "Error getting VNET for board " + board;
                response.result = "ERROR";
                logger.error("[VNET] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {

                // VNET selected example: [{"id":1,"vlan_name":"netX","vlan_ip":"192.168.1.0","vlan_mask":"24","net_uuid":"6c5bbb63-2e01-4ad5-b594-e860d3f0ef22"}]
                logger.debug("[VNET] --> VNET selected: " + JSON.stringify(db_response));

                if (db_response.message.length == 0){
                    response.message = "The VNET " +net_uuid+ " does not exist!";
                    response.result = "ERROR";
                    logger.error("[VNET] --> " + response.message);
                    res.send(JSON.stringify(response));
                }
                else{

                    db.getVnetBoardsInfo(net_uuid, function (boardsList) {

                        /*
                         [
                             {
                                 "BOARD_ID": "14144545",
                                 "vlan_NAME": "net0",
                                 "vlan_ID": 1,
                                 "vlan_IP": "192.168.1.3",
                                 "socat_ID": 1,
                                 "socat_IP": "10.0.0.1",
                                 "socat_PORT": 10000
                             },
                             ...
                         ]
                         */

                        if (boardsList.result == "ERROR") {
                            response.message = "Error getting boards VNET info: " + boardsList.message;
                            response.result = "ERROR";
                            logger.error("[VNET] --> " + response.message);
                            res.send(JSON.stringify(response));

                        } else {

                            var boardsNumber = boardsList.message.length;

                            if (boardsNumber != 0) {

                                logger.debug("[VNET] --> Boards in this network: " + boardsNumber);

                                for (var i = 0; i < boardsNumber; i++) {

                                    (function (i) {

                                        //UNTAG
                                        // bridge vlan del dev gre-lr<port> vid <vlan>
                                        var untag_bridge_iface = spawn('bridge', ['vlan', 'del', 'dev', 'gre-lr' + boardsList.message[i].socat_PORT, 'vid', boardsList.message[i].vlan_ID]);
                                        logger.debug('[VNET] --> NETWORK COMMAND: bridge vlan del dev gre-lr' + boardsList.message[i].socat_PORT + ' vid ' + boardsList.message[i].vlan_ID);

                                        untag_bridge_iface.stdout.on('data', function (data) {
                                            logger.debug('[VNET] ----> stdout - untag_bridge_iface: ' + data);
                                        });

                                        untag_bridge_iface.stderr.on('data', function (data) {
                                            logger.warn('[VNET] ----> stderr - untag_bridge_iface: ' + data);
                                        });

                                        untag_bridge_iface.on('close', function (code) {

                                            logger.info('[VNET] --> BOARD ' + boardsList.message[i].BOARD_ID + ' REMOVED FROM VLAN ' + boardsList.message[i].vlan_NAME + ' WITH IP ' + boardsList.message[i].vlan_IP);


                                            //session_wamp.publish(topic_command, [boardsList.message[i].BOARD_ID, 'remove-from-network', boardsList.message[i].vlan_ID, boardsList.message[i].vlan_NAME]);

                                            session_wamp.call(elem.board + '.command.rpc.network.removeFromNetwork', [boardsList.message[i].BOARD_ID, boardsList.message[i].vlan_ID, boardsList.message[i].vlan_NAME]).then(

                                                function (result) {

                                                    response.message = 'Board ' + board + ' REMOVED FROM VLAN ' + vlanName;
                                                    response.result = "SUCCESS";
                                                    logger.info('[VNET] --> ' + response.message);
                                                    //res.send(JSON.stringify(response));

                                                }


                                            );


                                        });


                                        if (i == (boardsNumber - 1)) {

                                            destroyVLAN(net_uuid, res, response);

                                        }

                                    })(i);

                                }


                            } else {

                                logger.debug("[VNET] --> No boards to remove from this VNET!");
                                destroyVLAN(net_uuid, res, response);

                            }


                        }


                    });

                }

            }

        });




    }


};

function destroyVLAN(net_uuid, res, response) {

    db.destroyVNET(net_uuid, function (db_response) {

        if (db_response.result == "ERROR") {

            logger.error("[VNET] --> Error destroying VNET: " + JSON.stringify(db_response.message));
            res.send(JSON.stringify(db_response, null, "\t"));

        } else {
            response.message = "VNET " + net_uuid + " DESTROYED!";
            response.result = db_response.result;
            logger.info("[VNET] --> " + response.message);
            res.send(JSON.stringify(response, null, "\t"));
        }

    });


}

net_utils.prototype.getVnetBoardsInfo = function (net_uuid, res) {

    logger.info("[VNET] - Showing boards in the VNET: " + net_uuid);

    /*
     [
     {
     "BOARD_ID": "14144545",
     "vlan_NAME": "net0",
     "vlan_ID": 1,
     "vlan_IP": "192.168.1.3",
     "socat_ID": 1,
     "socat_IP": "10.0.0.1",
     "socat_PORT": 10000
     },
     ...
     ]
     */

    var response = {
        message: '',
        result: ''
    };

    if (net_uuid == undefined) {
        response.message = "You must specify the VNET UUID";
        response.result = "ERROR";
        logger.error("[VNET] --> " + response.message);
        res.send(JSON.stringify(response));

    } else {

        db.getVnet(net_uuid, function (network) {

            if (network.result == "ERROR") {
                response.message = "Error getting information for VNET" + net_uuid;
                response.result = "ERROR";
                logger.error("[VNET] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {

                if (network.message.length == 0) {
                    response.message = "VNET " + net_uuid + " does not exist!";
                    response.result = "ERROR";
                    logger.error("[VNET] --> " + response.message);
                    res.send(JSON.stringify(response));

                }else{

                    db.getVnetBoardsInfo(net_uuid, function (db_response) {

                        if (db_response.result == "ERROR") {
                            response.message = "Error getting boards VNET info: " + db_response.message;
                            response.result = "ERROR";
                            logger.error("[VNET] --> " + response.message);
                            res.send(JSON.stringify(response));

                        } else {

                            if (db_response.message.length != 0) {
                                logger.info("[VNET] --> VNET Boards info: " + JSON.stringify(db_response.message, null, "\t"));
                                res.send(JSON.stringify(db_response, null, "\t"));

                            } else {
                                response.result = "SUCCESS";
                                response.message = db_response.message; //"No boards in this VNET!";
                                logger.info("[VNET] --> No boards in this VNET!");
                                res.send(JSON.stringify(response));

                            }

                        }

                    });

                }

            }
        });

    }

};

net_utils.prototype.addToNetwork = function (netuuid, board, value, res, restore) {

    var response = {
        message: '',
        result: ''
    };

    var add;

    if (value == "") {

        add = true;

    } else if (value == undefined){

        add = false;

    }else{

        var isAddr = ip.isV4Format(value);

        if (isAddr == true)
            add = true;

    }


    if (add){

        if (netuuid == undefined) {

            response.message = "You must specify the VNET UUID";
            response.result = "ERROR";
            logger.error("[VNET] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            db.getNetEnabledId(board, function (data) {

                if (data.result == "ERROR") {
                    response.message = "Error getting net-enabled flag for board " + board +": " +response.message;
                    response.result = "ERROR";
                    logger.error("[VNET] --> " + response.message);
                    res.send(JSON.stringify(response));

                } else {

                    var net_enabledID = data.message[0].net_enabled;

                    if (net_enabledID == 1) {

                        if (value == "") {
                            logger.info("[VNET] - Adding board " + board + " to VNET " + netuuid + "...");
                        } else {
                            logger.info("[VNET] - Adding board " + board + " to VNET " + netuuid + " with " + value + " ...");
                        }

                        logger.debug("[VNET] - Board " + board + " is network enabled!");

                        db.checkAddressPool(netuuid, function (free_address) {

                            if(free_address.result == "ERROR"){
                                response.message = "Error obtaining an IP for board " + board;
                                response.result = "ERROR";
                                logger.error("[VNET] --> " + response.message);
                                res.send(JSON.stringify(response));
                            }
                            else if (free_address.result == "NO-IP" && restore == "false"){

                                //NO IP available
                                logger.warn("[VNET] --> Adding board: No IP available for this VNET " + netuuid + " !!!");
                                response.result = "WARNING";
                                response.message = "No IP available for this VNET " + netuuid;
                                res.send(JSON.stringify(response, null, "\t"));

                            }
                            else {

                                logger.debug("[VNET] --> Free address selected: " + JSON.stringify(free_address.message));

                                db.getVnet(netuuid, function (network) {

                                    if (network.result == "ERROR") {
                                        response.message = "Error getting VNET for board " + board;
                                        response.result = "ERROR";
                                        logger.error("[VNET] --> " + response.message);
                                        res.send(JSON.stringify(response));

                                    } else {

                                        // VNET selected example: [{"id":1,"vlan_name":"netX","vlan_ip":"192.168.1.0","vlan_mask":"24","net_uuid":"6c5bbb63-2e01-4ad5-b594-e860d3f0ef22"}]
                                        logger.info("[VNET] --> VNET selected: " + JSON.stringify(network));

                                        //logger.info("NETWORK DIM: "+ network.length);
                                        if (network.message.length != 0) {

                                            logger.info("[VNET] ----> VNET uuid: " + network.message[0].net_uuid);

                                            //var netsize = ip.cidrSubnet(networksList[i].vlan_ip+"/"+networksList[i].vlan_mask).numHosts;
                                            var netsize = ip.cidrSubnet(network.message[0].vlan_ip + "/" + network.message[0].vlan_mask).numHosts;
                                            logger.debug("[VNET] ----> subnet size: " + netsize);

                                            // check the VNET subnet
                                            if (netsize >= 1) {

                                                logger.debug("[VNET] ----> subnet size is good: " + netsize);

                                                // check if the board is already in this VNET
                                                db.checkBoardIntoVLAN(board, netuuid, function (response_db) {

                                                    if (response_db.result == "ERROR") {
                                                        response.message = "Error checking board ("+board+") in a VNET ";
                                                        response.result = "ERROR";
                                                        logger.error("[VNET] --> " + response.message);
                                                        res.send(JSON.stringify(response));

                                                    } else {

                                                        logger.debug("[VNET] ----> Board in VNET: " + response_db.message[0].found);

                                                        if (response_db.message[0].found == 0 || restore == "true") {

                                                            logger.debug("[VNET] .......the board isn't configured yet!");

                                                            db.getSocatConn(board, function (soc_result) {

                                                                if (soc_result.result == "ERROR") {
                                                                    response.message = "Error checking board ("+board+") in a VNET ";
                                                                    response.result = "ERROR";
                                                                    logger.error("[VNET] --> " + response.message);
                                                                    res.send(JSON.stringify(response));

                                                                } else {

                                                                    var socatID = soc_result.message[0].id;
                                                                    var socatPort = soc_result.message[0].port;
                                                                    logger.debug("[VNET] ----> socatPort: " + socatPort);
                                                                    logger.debug("[VNET] ----> socatID: " + socatID);

                                                                    var hostAddress;

                                                                    if (value != "") {

                                                                        //If the user specifies an IP for the VNET
                                                                        logger.info("[VNET] --> IP specified: " + value + " for the network " + network.message[0].id);

                                                                        if (restore == "false") {

                                                                            db.checkAssignedVlanIP(value, network.message[0].id, function (response_db) {

                                                                                if (response_db.result == "ERROR") {
                                                                                    response.message = "Error checking IP for board "+board;
                                                                                    response.result = "ERROR";
                                                                                    logger.error("[VNET] --> " + response.message);
                                                                                    res.send(JSON.stringify(response));
                                                                                } else {

                                                                                    if (response_db.message[0].found == 1) {

                                                                                        hostAddress = value; // IP specified by user

                                                                                        var elem = {
                                                                                            board: board,
                                                                                            socatID: socatID,
                                                                                            socatPort: socatPort,
                                                                                            greIP: hostAddress,
                                                                                            greMask: network.message[0].vlan_mask,
                                                                                            vlanID: network.message[0].id,
                                                                                            vlan_name: network.message[0].vlan_name,
                                                                                            net_uuid: network.message[0].net_uuid
                                                                                        };

                                                                                        createEstablishTunnels(elem, res, response, restore);

                                                                                    } else {
                                                                                        response.result = "WARNING";
                                                                                        response.message = "IP " + value + " is not available!";
                                                                                        logger.error("[VNET] --> " + response.message);
                                                                                        res.send(JSON.stringify(response, null, "\t"));
                                                                                    }
                                                                                }

                                                                            });

                                                                        } else {

                                                                            //VNET RESTORING after network failure
                                                                            var elem = {
                                                                                board: board,
                                                                                socatID: socatID,
                                                                                socatPort: socatPort,
                                                                                greIP: value,
                                                                                greMask: network.message[0].vlan_mask,
                                                                                vlanID: network.message[0].id,
                                                                                vlan_name: network.message[0].vlan_name,
                                                                                net_uuid: network.message[0].net_uuid
                                                                            };

                                                                            logger.info("[VNET] --> IP " + value + " restoring...");
                                                                            createEstablishTunnels(elem, res, response, restore);

                                                                        }

                                                                    } else {

                                                                        //If the user does not specify an IP for the VNET

                                                                        logger.debug("[VNET] --> Selecting an IP from the pool...");

                                                                        db.getFreeAddress(netuuid, function (response_db) {

                                                                            if (response_db.result == "ERROR") {
                                                                                response.message = "Error getting free IP for board "+board+": "+response_db.message;
                                                                                response.result = "ERROR";
                                                                                logger.error("[VNET] --> " + response.message);
                                                                                res.send(JSON.stringify(response));

                                                                            } else {

                                                                                if (response_db.message.length == 0) {

                                                                                    logger.error("[VNET] --> Adding board: No IP available for this VNET " + network.message[0].net_uuid + " !!!");
                                                                                    response.result = "ERROR";
                                                                                    response.message = "No IP available for this VNET!";
                                                                                    res.send(JSON.stringify(response));

                                                                                } else {

                                                                                    hostAddress = response_db.message[0].ip;

                                                                                    logger.info("[VNET] --> Selected IP is " + hostAddress);

                                                                                    var elem = {
                                                                                        board: board,
                                                                                        socatID: socatID,
                                                                                        socatPort: socatPort,
                                                                                        greIP: hostAddress,
                                                                                        greMask: network.message[0].vlan_mask,
                                                                                        vlanID: network.message[0].id,
                                                                                        vlan_name: network.message[0].vlan_name,
                                                                                        net_uuid: network.message[0].net_uuid
                                                                                    };

                                                                                    createEstablishTunnels(elem, res, response, restore);

                                                                                }

                                                                            }

                                                                        });

                                                                    }

                                                                }

                                                            });


                                                        } else {
                                                            response.result = "WARNING";
                                                            response.message = "Board "+board+" is already in this network!";
                                                            logger.warn("[VNET] --> " + response.message );
                                                            res.send(JSON.stringify(response, null, "\t"));

                                                        }

                                                    }

                                                });

                                            } else {
                                                response.result = "ERROR";
                                                response.message = "You need a bigger subnet!";
                                                logger.error("[VNET] --> " + response.message );
                                                res.send(JSON.stringify(response, null, "\t"));
                                            }

                                        } else {
                                            response.result = "ERROR";
                                            response.message = "This VNET uuid does not exist!";
                                            logger.error("[VNET] --> " + response.message );
                                            res.send(JSON.stringify(response, null, "\t"));
                                        }

                                    }

                                });

                            }

                        });


                    } else {

                        response.result = "ERROR";
                        response.message = "BOARD " + board + " NO NETWORK ENABLED!";
                        logger.error("[VNET] - " + response.message );
                        res.send(JSON.stringify(response));

                    }

                }

            });

        }


    }else{

        if(value == undefined)
            response.message = "Error: "+value+" is not a valid IP address!";
        else
            response.message = "Error: "+value+" is not a valid IP address!";

        response.result = "ERROR";
        logger.error("[VNET] --> " + response.message);
        res.send(JSON.stringify(response));

    }

};

function createEstablishTunnels(elem, res, response, restore) {

    var response = {
        message: '',
        result: ''
    };

    session_wamp.call(elem.board + '.command.rpc.network.addToNetwork', [elem.board, elem.vlanID, elem.greIP, elem.greMask, elem.vlan_name]).then(

        function (result) {

            //bridge vlan add dev gre-lr<port> vid <vlan>
            var tag_bridge_iface = spawn('bridge', ['vlan', 'add', 'dev', 'gre-lr' + elem.socatPort, 'vid', elem.vlanID]);
            logger.debug('[VNET] --> NETWORK COMMAND: bridge vlan add dev gre-lr' + elem.socatPort + ' vid ' + elem.vlanID);

            tag_bridge_iface.stdout.on('data', function (data) {
                logger.debug('[VNET] ----> stdout - tag_bridge_iface: ' + data);
            });

            tag_bridge_iface.stderr.on('data', function (data) {
                logger.error('[VNET] ----> stderr - tag_bridge_iface: ' + data);
            });

            tag_bridge_iface.on('close', function (code) {

                logger.info('[VNET] --> Board ' + elem.board + ' added to VNET ' + elem.vlan_name + ' with IP ' + elem.greIP);

                if (restore == "false") {

                    db.insertVnetConnection(elem.greIP, elem.net_uuid, elem.board, function (db_result) {

                        if (db_result.result == "ERROR") {
                            response.message = "Error inserting new VNET: " + db_result.message;
                            response.result = "ERROR";
                            logger.error("[VNET] --> " + response.message);
                            res.send(JSON.stringify(response));

                        } else {
                            response.message = elem;
                            response.result = "SUCCESS"; //"VLAN CONNECTION ON " + elem.board + " SUCCESSFULLY ESTABLISHED!";
                            logger.info("[VNET] - VNET connection on " + elem.board + " successfully established!");
                            res.send(JSON.stringify(response));

                        }

                    });

                }


            });


        }
        
    );




/*
    session_wamp.publish(topic_command, [elem.board, 'add-to-network', elem.vlanID, elem.greIP, elem.greMask, elem.vlan_name]);


    //bridge vlan add dev gre-lr<port> vid <vlan>
    var tag_bridge_iface = spawn('bridge', ['vlan', 'add', 'dev', 'gre-lr' + elem.socatPort, 'vid', elem.vlanID]);
    logger.debug('[VNET] --> NETWORK COMMAND: bridge vlan add dev gre-lr' + elem.socatPort + ' vid ' + elem.vlanID);

    tag_bridge_iface.stdout.on('data', function (data) {
        logger.debug('[VNET] ----> stdout - tag_bridge_iface: ' + data);
    });

    tag_bridge_iface.stderr.on('data', function (data) {
        logger.error('[VNET] ----> stderr - tag_bridge_iface: ' + data);
    });

    tag_bridge_iface.on('close', function (code) {

        logger.info('[VNET] --> Board ' + elem.board + ' added to VNET ' + elem.vlan_name + ' with IP ' + elem.greIP);

        if (restore == "false") {

            db.insertVnetConnection(elem.greIP, elem.net_uuid, elem.board, function (db_result) {

                if (db_result.result == "ERROR") {
                    response.message = "Error inserting new VNET: " + db_result.message;
                    response.result = "ERROR";
                    logger.error("[VNET] --> " + response.message);
                    res.send(JSON.stringify(response));

                } else {
                    response.message = elem;
                    response.result = "SUCCESS"; //"VLAN CONNECTION ON " + elem.board + " SUCCESSFULLY ESTABLISHED!";
                    logger.info("[VNET] - VNET connection on " + elem.board + " successfully established!");
                    res.send(JSON.stringify(response, null, "\t"));

                }

            });

        }


    });
*/
    
    

}

net_utils.prototype.removeFromNetwork = function (net_uuid, board, res) {

    logger.info("[VNET] - REMOVING from network " + net_uuid + " the board " + board);

    var response = {
        message: '',
        result: ''
    };

    if (net_uuid == undefined) {

        response.message = "You must specify the VNET UUID";
        response.result = "ERROR";
        logger.error("[VNET] --> " + response.message);
        res.send(JSON.stringify(response));

    } else {

        db.BoardInfo(board, function (response_db) {

            if (response_db.result == "ERROR") {
                response.message = "Error checking board ("+board+") information.";
                response.result = "ERROR";
                logger.error("[VNET] --> " + response.message);
                res.send(JSON.stringify(response));

            } else {

                var board_label = response_db.message.info[0].label;

                logger.debug("[VNET] --> Board label: " + JSON.stringify(board_label));

                db.checkBoardIntoVLAN(board, net_uuid, function (response_db) {

                    if (response_db.result == "ERROR") {
                        response.message = "Error checking board ("+board+") in a VNET ";
                        response.result = "ERROR";
                        logger.error("[VNET] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {

                        logger.debug("[VNET] --> Board "+board_label+" in VNET: " + response_db.message[0].found);

                        //check if the board is in that VNET
                        if (response_db.message[0].found == 1) {

                            db.getVnet(net_uuid, function (response_db) {

                                if (response_db.result == "ERROR") {
                                    response.message = "Error getting VNET info: "+response_db.message;
                                    response.result = "ERROR";
                                    logger.error("[VNET] --> " + response.message);
                                    res.send(JSON.stringify(response));

                                } else {

                                    //NETWORK SELECTED: [{"id":1,"vlan_name":"netX","vlan_ip":"192.168.1.0","vlan_mask":"24","net_uuid":"6c5bbb63-2e01-4ad5-b594-e860d3f0ef22"}]
                                    logger.debug("[VNET] --> Network selected: " + JSON.stringify(response_db));

                                    var vlanID = response_db.message[0].id;
                                    var vlanName = response_db.message[0].vlan_name;

                                    db.getSocatConn(board, function (response_db) {

                                        if (response_db.result == "ERROR") {
                                            response.message = "Error getting VNET info: "+response_db.message;
                                            response.result = "ERROR";
                                            logger.error("[VNET] --> " + response.message);
                                            res.send(JSON.stringify(response));

                                        } else {

                                            var socatPort = response_db.message[0].port;
                                            logger.debug("[VNET] --> socatPort: " + socatPort);

                                            //bridge vlan del dev gre-lr<port> vid <vlan>
                                            var tag_bridge_iface = spawn('bridge', ['vlan', 'del', 'dev', 'gre-lr' + socatPort, 'vid', vlanID]);
                                            logger.debug('[VNET] --> NETWORK COMMAND: bridge vlan del dev gre-lr' + socatPort + ' vid ' + vlanID);

                                            tag_bridge_iface.stdout.on('data', function (data) {
                                                logger.debug('[VNET] ----> stdout - untag_bridge_iface: ' + data);
                                            });

                                            tag_bridge_iface.stderr.on('data', function (data) {
                                                logger.warn('[VNET] ----> stderr - untag_bridge_iface: create link: ' + data);
                                            });

                                            tag_bridge_iface.on('close', function (code) {

                                                //Data structures cleaning.......................

                                                db.removeBoardFromVlan(board, net_uuid, function (response_db) {

                                                    if (response_db.result == "ERROR") {
                                                        response.message = "Error removing board from VNET: "+response_db.message;
                                                        response.result = "ERROR";
                                                        logger.error("[VNET] --> " + response.message);
                                                        res.send(JSON.stringify(response));

                                                    } else {

                                                        session_wamp.call(board + '.command.rpc.network.removeFromNetwork', [board, vlanID, vlanName]).then(

                                                            function (result) {

                                                                response.message = 'Board ' + board + ' REMOVED FROM VLAN ' + vlanName;
                                                                response.result = "SUCCESS";
                                                                logger.info('[VNET] --> ' + response.message);
                                                                res.send(JSON.stringify(response));

                                                            }

                                                        );

                                                        /*
                                                        session_wamp.publish(topic_command, [board, 'remove-from-network', vlanID, vlanName]);

                                                        response.message = 'Board ' + board + ' REMOVED FROM VLAN ' + vlanName;
                                                        response.result = "SUCCESS";
                                                        logger.info('[VNET] --> ' + response.message);
                                                        res.send(JSON.stringify(response));
                                                        */

                                                    }

                                                });

                                            });
                                        }

                                    });

                                }

                            });

                        } else {
                            response.message = "Board " + board_label + " is not connected to the specified network!";
                            response.result = "WARNING";
                            logger.warn("[VNET] --> Board " + board_label + " is not connected to the specified network: "+net_uuid);
                            res.send(JSON.stringify(response));
                        }

                    }

                });

            }
        });



    }

};

net_utils.prototype.activateBoardNetwork = function (board, res, restore) {

    var db_board_id = board;

    var response = {
        message: '',
        result: ''
    };

    //logger.debug("[VNET] - Checking net-enabled flag...");
    
    db.getNetEnabledId(db_board_id, function (data) {

        var net_enabledID = data.message[0].net_enabled;

        if (data.result == "ERROR") {
            response.message = "Error getting net-enabled flag for board " + db_board_id;
            response.result = "ERROR";
            logger.error("[VNET] --> " + response.message);
            res.send(JSON.stringify(response));

        } else {

            if (net_enabledID == 1) {

                logger.info("[VNET] - Board " + db_board_id + " is network enabled!");

                db.getSocatStatus(db_board_id, function (data) {

                    if (data.result == "ERROR") {
                        response.message = "Error getting Socat status for board " + db_board_id;
                        response.result = "ERROR";
                        logger.error("[VNET] --> " + response.message);
                        res.send(JSON.stringify(response));

                    } else {

                        //if the board has status="undefined" OR we have to reconnect a board "noactive"
                        if (data.message[0] == undefined || data.message[0].status == "noactive" || restore == "true" ) {

                            //NETWORK INIT
                            logger.info("[VNET] - Socat initialization...");

                            var socatNetwork = nconf.get('config:socat:ip');
                            var basePort = nconf.get('config:socat:server:port');

                            if (data.message[0] == undefined) {
                                logger.debug("[VNET] --> New board " + db_board_id);
                            }
                            else {
                                logger.debug("[VNET] --> Board " + db_board_id + " Socat status: " + data.message[0].status);
                            }

                            db.getSocatConf(db_board_id, basePort, socatNetwork, function (data) {
                                
                                if (data.result == "ERROR") {
                                    response.message = "Error getting Socat configuration for board " + db_board_id;
                                    response.result = "ERROR";
                                    logger.error("[VNET] --> " + response.message);
                                    res.send(JSON.stringify(response));
                                    
                                } else {

                                    //logger.info("[VNET] --> Socat configuration:\n" + JSON.stringify(data.message, null, "\t"));

                                    var bSocatNum = data.message["socatID"];
                                    var socatServAddr = data.message["serverIP"];
                                    var socatBoardAddr = data.message["boardIP"];
                                    var socatPort = data.message["port"];

                                    logger.info("[VNET] --> Injecting Socat parameters into board " + db_board_id + ":\n"+JSON.stringify(data.message, null, "\t"));
                                    //{ Server:" + socatServAddr + ":" + socatPort + ", BoardIP: " + socatBoardAddr + ", socat_index: " + bSocatNum + " }");

                                    
                                    // Inject Socat parameters into the board calling "setSocatOnBoard" RPC
                                    session_wamp.call(db_board_id + '.command.rpc.network.setSocatOnBoard', [socatServAddr, socatPort, socatBoardAddr, net_backend]).then(
                                        
                                        function (result) {

                                            // response from the board --> result = boardCode + " - Server:" + socatServer_ip + ":" + socatServer_port + " - Board: " + socatBoard_ip

                                            logger.info("[VNET] --> Socat result from board:\n" + JSON.stringify(result, null, "\t"));

                                            // EXEC SOCAT ---------------------------------------------------------------------------------------------------------------------------------------------
                                            var servSocat = utility.execute('socat -d -d TCP:localhost:' + socatPort + ',reuseaddr,forever,interval=10 TUN:' + socatServAddr + '/31,tun-name=soc' + socatPort + ',tun-type=tap,up', '[VNET] --> SOCAT');
                                            //logger.debug('[VNET] --> SOCAT COMMAND: socat -d -d TCP:localhost:'+socatPort+',reuseaddr,forever,interval=10 TUN:'+socatServAddr+'/31,tun-name=soc'+socatPort+',tun-type=tap,up');
                                            //---------------------------------------------------------------------------------------------------------------------------------------------------------


                                            // INIT of the shared GRE tunnel

                                            //ip link add gre-lr<port> type gretap remote <ipboard> local <serverip>
                                            var greIface = spawn('ip', ['link', 'add', 'gre-lr' + socatPort, 'type', 'gretap', 'remote', socatBoardAddr, 'local', socatServAddr]);
                                            logger.debug('[VNET] --> GRE IFACE CREATION: ip link add gre-lr' + socatPort + ' type gretap remote ' + socatBoardAddr + ' local ' + socatServAddr);

                                            greIface.stdout.on('data', function (data) {
                                                logger.debug('[VNET] --> GRE IFACE CREATION stdout: ' + data);
                                            });
                                            greIface.stderr.on('data', function (data) {
                                                logger.warn('[VNET] --> GRE IFACE CREATION stderr: ' + data);
                                            });
                                            greIface.on('close', function (code) {

                                                logger.debug("[VNET] --> GRE IFACE CREATED!");

                                                //ip link set gre-lr<port> up
                                                var greIface_up = spawn('ip', ['link', 'set', 'gre-lr' + socatPort, 'up']);
                                                logger.debug('[VNET] --> GRE IFACE UP COMMAND: ip link set gre-lr' + socatPort + ' up');

                                                greIface_up.stdout.on('data', function (data) {
                                                    logger.debug('[VNET] --> GRE IFACE UP stdout: ' + data);
                                                });
                                                greIface_up.stderr.on('data', function (data) {
                                                    logger.warn('[VNET] --> GRE IFACE UP stderr: ' + data);
                                                });
                                                greIface_up.on('close', function (code) {

                                                    logger.debug("[VNET] --> GRE IFACE UP!");

                                                    //ip link set gre-lr<port> master br-gre
                                                    var add_to_brgre = spawn('ip', ['link', 'set', 'gre-lr' + socatPort, 'master', 'br-gre']);
                                                    logger.debug('[VNET] --> GRE IFACE ADDED TO BRIDGE: ip link set gre-lr' + socatPort + ' master br-gre');

                                                    add_to_brgre.stdout.on('data', function (data) {
                                                        logger.debug('[VNET] --> GRE IFACE ADDED TO BRIDGE stdout: ' + data);
                                                    });
                                                    add_to_brgre.stderr.on('data', function (data) {
                                                        logger.warn('[VNET] --> GRE IFACE ADDED TO BRIDGE stderr: ' + data);
                                                    });
                                                    add_to_brgre.on('close', function (code) {

                                                        logger.debug("[VNET] --> GRE IFACE ADDED TO GRE BRIDGE!");

                                                        //bridge vlan add vid <freevlantag> dev gre-lr<port> pvid
                                                        var freevlantag = 2048 + bSocatNum;

                                                        var tag_vlan = spawn('bridge', ['vlan', 'add', 'vid', freevlantag, 'dev', 'gre-lr' + socatPort, 'pvid']);
                                                        logger.debug('[VNET] --> TAG VLAN: bridge vlan add vid ' + freevlantag + ' dev gre-lr' + socatPort + ' pvid');

                                                        tag_vlan.stdout.on('data', function (data) {
                                                            logger.debug('[VNET] --> TAG VLAN stdout: ' + data);
                                                        });
                                                        tag_vlan.stderr.on('data', function (data) {
                                                            logger.warn('[VNET] --> TAG VLAN stderr: ' + data);
                                                        });
                                                        tag_vlan.on('close', function (code) {

                                                            logger.debug("[VNET] --> TAG VLAN COMPLETED!");

                                                            db.updateSocatStatus(db_board_id, "active", function (data) {
                                                                if (data.result == "ERROR") {
                                                                    response.message = "Error updating Socat status for board " + db_board_id;
                                                                    response.result = "ERROR";
                                                                    logger.error("[VNET] --> " + response.message);
                                                                    res.send(JSON.stringify(response));

                                                                } else {

                                                                    logger.info("[VNET] - TUNNELS CONFIGURATION SERVER SIDE FOR BOARD " + db_board_id + " COMPLETED!");

                                                                    if (restore == "true") {
                                                                        response.message = "TUNNELS CONFIGURATION FROM SERVER SIDE COMPLETED!";
                                                                        response.result = "SUCCESS";
                                                                        res.send(JSON.stringify(response));
                                                                        logger.info("[VNET] - Board " + db_board_id + " network restored!");

                                                                    }

                                                                }

                                                            });

                                                        });

                                                    });

                                                });

                                            });

                                        }
                                    );
                                    
                                }
                                
                            });
                            //NETWORK INIT END


                        } else {
                            logger.info("[VNET] - BOARD " + db_board_id + " ALREADY CONNECTED TO SOCAT - status: " + data.message[0].status);
                            response.message = "BOARD " + db_board_id + " ALREADY CONNECTED TO SOCAT - status: " + data.message[0].status;
                            response.result = "SUCCESS";
                            res.send(JSON.stringify(response));
                        }
                        
                    }

                });

            } else {

                response.message = "Board " + db_board_id + " is not VNET enabled!";
                response.result = "ERROR";
                logger.debug("[VNET] - " + response.message);
                res.send(JSON.stringify(response));

            }

        }

    });

};



process.on('SIGINT', function () {
    for (var i = 0; i < networksArray.length; i++) {
        spawn('ip', ['link', 'set', 'br' + networksArray[i].uuid.substring(0, 6), 'down']);
        spawn('brctl', ['delbr', 'br' + networksArray[i].uuid.substring(0, 6)]);
    }
    for (i = 0; i < greDevices.length; i++) {
        spawn('ip', ['link', 'del', greDevices[i]]);
    }
    process.exit();
});

process.on('SIGTERM', function () {
    for (var i = 0; i < networksArray.length; i++) {
        spawn('ip', ['link', 'set', 'br' + networksArray[i].uuid.substring(0, 6), 'down']);
        spawn('brctl', ['delbr', 'br' + networksArray[i].uuid.substring(0, 6)]);
    }
    for (i = 0; i < greDevices.length; i++) {
        spawn('ip', ['link', 'del', greDevices[i]]);
    }
    process.exit();
});


var initVNET = function () {

    try {
        //IOTRONIC NETWORK DEVICE CREATION-------------------------------------------------------------

        logger.info("[VNET] - Iotronic Virtual Network (VNET) initialization...");
        var brgre_creation = spawn('ip', ['link', 'add', 'br-gre', 'type', 'bridge']);  //ip link add name br-gre type bridge
        logger.debug('   - GRE BRIDGE CREATION:  ip link add br-gre type bridge');

        brgre_creation.stdout.on('data', function (data) {
            logger.debug('   - bridge creation stdout: ' + data);
        });
        brgre_creation.stderr.on('data', function (data) {

            //RTNETLINK answers: File exists
            logger.warn('   - bridge creation stderr: ' + data);
        });
        brgre_creation.on('close', function (code) {

            logger.debug("   - BRIDGE br-gre SUCCESSFULLY CREATED!");

            //ip link set br-gre up
            var brgre_up = spawn('ip', ['link', 'set', 'br-gre', 'up']);
            logger.debug('   - GRE BRIDGE UP: ip link set br-gre up');

            brgre_up.stdout.on('data', function (data) {
                logger.debug('   - gre bridge up stdout: ' + data);
            });
            brgre_up.stderr.on('data', function (data) {
                logger.error('   - gre bridge up stderr: ' + data);
            });
            brgre_up.on('close', function (code) {
                logger.debug("   - BRIDGE br-gre UP!");
                logger.info("   - GRE BRIDGE br-gre SUCCESSFULLY CONFIGURED!");
            });


        });

        //----------------------------------------------------------------------------------------------

    }
    catch (err) {

        logger.warn('[SYSTEM] - ' + err);

    }

};


module.exports = net_utils;
module.exports.initVNET = initVNET;
