/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2014 2015 Andrea Rocco Lotronto, Nicola Peditto, Fabio Verboso
 */

//service logging configuration: "net_utils"   
var logger = log4js.getLogger('net_neutron_utils');
logger.setLevel(loglevel);

var db_utils = require('./mysql_db_utils');
var db = new db_utils;

var IotronicHome = "/var/lib/iotronic";

var nconf = require('nconf');
nconf.file({file: IotronicHome + '/settings.json'});
var socatNetwork = nconf.get('config:socat:ip');
var basePort = nconf.get('config:socat:server:port');

var spawn = require('child_process').spawn;

var ip = require('ip');
var uuid = require('uuid');
var Q = require("q");

var neutron_utils = require('./neutron_utils');
var neutron = new neutron_utils;

var utility = require('./utility');
var board_utility = require('./board_utils');


var networksArray = [];
var vlanID = 0; //IN PROGRESS
var greDevices = [];
//var socatBoards = [];

var session_wamp;

net_utils = function (session, rest) {
    
    session_wamp = session;
    
    // VNET MANAGEMENT APIs
    //---------------------------------------------------------------------------------------------------

    //get vnets list
    rest.get('/v1/vnets/', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        net_utils.prototype.showNetwork(res);


    });

    //create vnet in Iotronic
    rest.put('/v1/vnets/', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var netname = req.body.netname;
        var value = req.body.value;

        net_utils.prototype.createNetwork(netname, value, res);

    });

    //delete driver from Iotronic
    rest.delete('/v1/vnets/', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var netuuid = req.body.netuuid;

        net_utils.prototype.destroyNetwork(netuuid, res);

    });

    //show boards in a vnet
    rest.get('/v1/vnets/:vnet', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var netuuid = req.params.vnet;

        net_utils.prototype.getVnetBoardsInfo(netuuid, res);

    });

    //add board to vnet
    rest.post('/v1/vnets/:vnet/:board', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var netuuid = req.params.vnet;
        var board = req.params.board;
        var value = req.body.value;
        var restore = "false";


        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                net_utils.prototype.addToNetwork(netuuid, board, value, res, restore);
                
            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }

        });



    });

    //remove board from vnet
    rest.delete('/v1/vnets/:vnet/:board', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var netuuid = req.params.vnet;
        var board = req.params.board;

        net_utils.prototype.removeFromNetwork(netuuid, board, res);


    });

    //force vnet on board
    rest.put('/v1/vnets/:board/active', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var board = req.params.board;
        var restore = "true";

        logger.info("[VNET] - Activating VNETs on board " + board + "...");

        board_utility.checkBoardAvailable(board, res, function (available){

            if(available.result == "SUCCESS"){

                net_utils.prototype.activateBoardNetwork(board, res, restore);
                
            }else if(available.result == "WARNING") {
                logger.error("[API] --> " + available.message);
                res.send(JSON.stringify(available));
            }

        });


    });


    logger.debug("[REST-EXPORT] - Openstack Neutron VNET's APIs exposed!");
    
};





net_utils.prototype.activateBoardNetwork = function (board, res, restore) {

    //args[0]=db_board_id --> board
    //session --> session_wamp
    var db_board_id = board;

    db.getNetEnabledId(db_board_id, function (data) {

        var net_enabledID = data[0].net_enabled;


        if (net_enabledID == 1) {

            logger.info("[VNET] - NEUTRON BACKEND ENABLED!");
            logger.info("[VNET] - BOARD " + db_board_id + " NETWORK ENABLED!");


            db.getSocatStatus(db_board_id, function (data) {


                //if the board is NEW="undefined" OR we have to reconnect a board "noactive"
                if (data[0] == undefined || data[0].status == "noactive" || restore == "true") {

                    //NETWORK INIT
                    logger.info("[VNET] - SOCAT INITIALIZATION: getting Socat parameters...");

                    var socatNetwork = nconf.get('config:socat:ip');
                    var basePort = nconf.get('config:socat:server:port');


                    if (data[0] == undefined) {
                        logger.info("[VNET] --> NEW BOARD " + db_board_id);
                    }
                    else {
                        logger.info("[VNET] --> BOARD " + db_board_id + " socat status: " + data[0].status);
                    }


                    //NETDB
                    db.getSocatConf(db_board_id, basePort, socatNetwork, function (data) {

                        logger.info("[VNET] --> SOCAT NET CONF = " + JSON.stringify(data));

                        var bSocatNum = data.socat_conf["socatID"];
                        //logger.info("--> SOCAT bSocatNum: "+bSocatNum);

                        //NEW-net
                        var socatServAddr = data.socat_conf["serverIP"];
                        var socatBoardAddr = data.socat_conf["boardIP"];
                        var socatPort = data.socat_conf["port"];


                        logger.info("[VNET] --> INJECTING SOCAT PARAMETERS IN " + db_board_id + ": { Server:" + socatServAddr + ":" + socatPort + ", BoardIP: " + socatBoardAddr + ", socat_index: " + bSocatNum + " }");

                        //NEW-net
                        session_wamp.call(db_board_id + '.command.rpc.network.setSocatOnBoard', [socatServAddr, socatPort, socatBoardAddr, net_backend]).then(
                            function (result) {

                                logger.info("[VNET] --> SOCAT BOARD RESULT: " + result);

                                //EXEC SOCAT ---------------------------------------------------------------------------------------------------------------------------------------------


                                //NEW-net
                                //socat -d -d TCP:localhost:$PORT,reuseaddr,forever,interval=10 TUN,tun-name=$TUNNAME,up &

                                var servSocat = utility.execute('socat -d -d TCP:localhost:' + socatPort + ',reuseaddr,forever,interval=10 TUN:' + socatServAddr + '/31,tun-name=soc' + socatPort + ',tun-type=tap,up', '[VNET] --> SOCAT');

                            }
                        );
                    });
                    //NETWORK INIT END


                } else {
                    logger.info("[VNET] - BOARD " + db_board_id + " ALREADY CONNECTED TO SOCAT - status: " + data[0].status);

                    var response = {
                        result: "BOARD " + db_board_id + " ALREADY CONNECTED TO SOCAT - status: " + data[0].status
                    }

                    res.send(JSON.stringify(response));
                }

            });


        } else {
            logger.info("[VNET] - BOARD " + db_board_id + " IS NOT NETWORK ENABLED!");

            var response = {
                result: "BOARD " + db_board_id + " NO NETWORK ENABLED!"
            }

            res.send(JSON.stringify(response));

        }

    });


};

net_utils.prototype.addToNetwork = function (netuid, board, value, res, restore) {

    var response = {
        message: "Adding boards to a network",
        result: "",
        log: ""
    }

    var network_data = ''

    neutron.getNetwork(netuid, function (err, net) {
        if (err) {
            response.result = err
            response.result = 'Get network data failed'
            logger.error("[NEUTRON] - Get network data " + netuid);
            res.send(JSON.stringify(response, null, "\t"));
        } else {
            logger.debug("[NEUTRON] - net data " + JSON.stringify(net, null, "\t"));
            logger.info("[NEUTRON] - net data " + net.id);
            var network_data = net;
            var subnet_id = net.subnets[0]


            neutron.getSubNetwork_data(subnet_id, function (err, subnet) {
                if (err) {
                    response.result = err
                    response.result = 'Get subnetwork data failed'
                    logger.error("[NEUTRON] - Get subnetwork data " + subnet_id);
                    res.send(JSON.stringify(response, null, "\t"));
                } else {
                    logger.debug("[NEUTRON] - subnet data " + JSON.stringify(subnet, null, "\t"));
                    logger.info("[NEUTRON] - subnet data " + subnet);

                    db.getNetEnabledId(board, function (data) {
                        var net_enabledID = data[0].net_enabled;
                        if (net_enabledID == 1) {
                            if (value == "")
                                logger.info("[VNET] - ADDING board " + board + " to network " + netuid + "...");
                            else
                                logger.info("[VNET] - ADDING board " + board + " to network " + netuid + " with " + value + " ...");

                            logger.info("[VNET] - BOARD " + board + " NETWORK ENABLED!");

                            if (netuid == undefined) {
                                response.result = "You must specify the network UUID!";
                                logger.warn("[VNET] --> You must specify the network UUID!");
                            } else {
                                neutron.createPort(netuid, function (err, port) {
                                    if (err) {
                                        response.result = err
                                        response.result = 'Port creation failed'
                                        logger.error("[NEUTRON] - Port creation FAILED " + port.id);
                                        res.send(JSON.stringify(response, null, "\t"));
                                    } else {

                                        logger.debug("[NEUTRON] - Port created " + JSON.stringify(port, null, "\t"));
                                        logger.info("[NEUTRON] - Port created " + port.id);

                                        db.insertPort(port, board, function (err, result_db) {
                                            if (err) {
                                                response.result = err
                                                response.log = 'Saving port failed'
                                                logger.error("[IOTRONIC DB] - Saving Port FAILED: " + err);
                                                res.send(JSON.stringify(response, null, "\t"));

                                            } else {
                                                logger.debug("[IOTRONIC DB] - Port saved " + JSON.stringify(result_db, null, "\t"));
                                                logger.info("[IOTRONIC DB] - Port saved " + port.id);


                                                db.getSocatConn(board, function (soc_result) {
                                                    var socatID = soc_result[0].id;
                                                    var socatPort = soc_result[0].port;
                                                    logger.debug("[VNET] --> socatPort: " + socatPort);
                                                    logger.debug("[VNET] --> socatID: " + socatID)

                                                    var elem = {
                                                        board: board,
                                                        socatID: socatID,
                                                        socatPort: socatPort,
                                                        vlanID: network_data.vlan_id,
                                                        net_uuid: netuid,
                                                        port: port,
                                                        cidr: subnet.cidr.substring(subnet.cidr.length - 2, subnet.cidr.length)
                                                    }

                                                    createEstablishTunnels(elem, res, response, restore);
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        }

                    });
                }
            });

        }


    });

};

net_utils.prototype.addToNetwork_restore = function (netuid, board, port_uuid, res, restore) {

    var response = {
        message: "Adding boards to a network",
        result: "",
        log: ""
    }

    var network_data = ''
    neutron.getNetwork(netuid, function (err, net) {
        if (err) {
            response.result = err
            response.result = 'Get network data failed'
            logger.error("[NEUTRON] - Get network data " + netuid);
            res.send(JSON.stringify(response, null, "\t"));
        } else {
            logger.debug("[NEUTRON] - net data " + JSON.stringify(net, null, "\t"));
            logger.info("[NEUTRON] - net data " + net.id);
            var network_data = net;
            var subnet_id = net.subnets[0]


            neutron.getSubNetwork_data(subnet_id, function (err, subnet) {
                if (err) {
                    response.result = err
                    response.result = 'Get subnetwork data failed'
                    logger.error("[NEUTRON] - Get subnetwork data " + subnet_id);
                    res.send(JSON.stringify(response, null, "\t"));
                } else {
                    logger.debug("[NEUTRON] - subnet data " + JSON.stringify(subnet, null, "\t"));
                    logger.info("[NEUTRON] - subnet data " + subnet);


                    neutron.getPort(port_uuid, function (err, port) {
                        if (err) {
                            response.result = err
                            response.result = 'Get port data failed'
                            logger.error("[NEUTRON] - Get port data " + port_uuid);
                            res.send(JSON.stringify(response, null, "\t"));
                        } else {
                            logger.debug("[NEUTRON] - port data " + JSON.stringify(port, null, "\t"));
                            logger.info("[NEUTRON] - port data " + port.id);

                            db.getSocatConn(board, function (soc_result) {
                                var socatID = soc_result[0].id;
                                var socatPort = soc_result[0].port;
                                logger.debug("[VNET] --> socatPort: " + socatPort);
                                logger.debug("[VNET] --> socatID: " + socatID)

                                var elem = {
                                    board: board,
                                    socatID: socatID,
                                    socatPort: socatPort,
                                    vlanID: network_data.vlan_id,
                                    net_uuid: netuid,
                                    port: port,
                                    cidr: subnet.cidr.substring(subnet.cidr.length - 2, subnet.cidr.length)
                                }

                                createEstablishTunnels(elem, res, response, restore);
                            });
                        }
                    });
                }
            });

        }


    });


};

net_utils.prototype.removeFromNetwork = function (net_uuid, board, res) {

    logger.info("[VNET] - REMOVING from network " + net_uuid + " the board " + board);

    var response = {
        message: "Removing boards from a network",
        result: "",
        log: ""
    }

    if (net_uuid == undefined) {
        response.result = "You must specify the network UUID!";
        logger.warn("[VNET] --> You must specify the network UUID!");

    } else {
        neutron.getNetwork(net_uuid, function (err, net) {
            if (err) {
                response.result = err
                response.result = 'Get network data failed'
                logger.error("[NEUTRON] - Get network data " + net_uuid);
                res.send(JSON.stringify(response, null, "\t"));
            } else {
                logger.debug("[NEUTRON] - net data " + JSON.stringify(net, null, "\t"));
                logger.info("[NEUTRON] - net data " + net.id);
                network_data = net;

                db.getPort(net_uuid, board, function (err, result_db) {
                    if (err) {
                        response.result = err
                        response.log = 'getting port failed'
                        logger.error("[IOTRONIC DB] - getting Port FAILED: " + err);
                        res.send(JSON.stringify(response, null, "\t"));

                    } else if (result_db.length == 0) {
                        response.result = 'Cannot find any port on the db'
                        logger.warn("[IOTRONIC DB] - getting Port: " + response.result);
                        res.send(JSON.stringify(response, null, "\t"));
                    }
                    else {
                        var port_uuid = result_db[0].uuid;
                        logger.info("[IOTRONIC DB] - getting Port uuid: " + port_uuid);
                        neutron.destroyPort(port_uuid, function (err, port) {
                            if (err) {
                                response.result = err
                                response.result = 'Port destroy failed'
                                logger.error("[NEUTRON] - Port destroy FAILED " + port_uuid);
                                res.send(JSON.stringify(response, null, "\t"));
                            } else {
                                logger.debug("[NEUTRON] - Port destroyed " + JSON.stringify(port, null, "\t"));
                                logger.info("[NEUTRON] - Port destroyed " + port);

                                db.deletePort(port_uuid, function (err, result_db) {
                                    if (err) {
                                        response.result = err
                                        response.log = 'deleting port failed'
                                        logger.error("[IOTRONIC DB] - deleting Port FAILED: " + err);
                                        res.send(JSON.stringify(response, null, "\t"));

                                    } else {
                                        logger.info("[IOTRONIC DB] - deleted Port uuid: " + port_uuid);
                                        db.getSocatConn(board, function (soc_result) {
                                            var socatID = soc_result[0].id;
                                            var socatPort = soc_result[0].port;
                                            logger.debug("[VNET] --> socatPort: " + socatPort);
                                            logger.debug("[VNET] --> socatID: " + socatID)

                                            var elem = {
                                                board: board,
                                                socatID: socatID,
                                                socatPort: socatPort,
                                                vlanID: network_data.vlan_id,
                                                net_uuid: net_uuid,
                                                //port: port
                                            }

                                            removeEstablishTunnels(elem, res, response);

                                        });
                                    }

                                });

                            }
                        });

                    }
                });

            }

        });
    }

};

function removeEstablishTunnels(elem, res, response) {

    logger.debug('[VNET] --> parameters: ' + elem);

    /* var elem = {
     board: board,
     socatID: socatID,
     socatPort: socatPort,
     vlanID: network_data.vlan_id,
     net_uuid: netuid,
     }
     */

    session_wamp.publish(topic_command, [elem.board, 'remove-from-network', elem.vlanID, elem.net_uuid]);

    iface = 'soc' + elem.socatPort + '.' + elem.vlanID;

    var remove_vlan_iface = utility.execute('ip link del ' + iface, '[VNET] --> NETWORK - remove_vlan_iface -');
    remove_vlan_iface.on('close', function (code) {
        logger.info('[VNET] --> removed ' + iface);
        response.log = "from the lan " + elem.net_uuid;
        response.result = "BOARD " + elem.board + " SUCCESSFULLY DETACHED";
        res.send(JSON.stringify(response, null, "\t"));

    });


}

function createEstablishTunnels(elem, res, response, restore) {

    logger.debug('[VNET] --> parameters: ' + JSON.stringify(elem, null, "\t"));

    /*  var elem = {
     board: board,
     socatID: socatID,
     socatPort: socatPort,
     vlanID: network_data.vlan_id,
     net_uuid: netuid,
     port: port
     }
     */

    session_wamp.publish(topic_command, [elem.board, 'add-to-network', elem.vlanID, elem.port, elem.cidr]);

    var br_name = 'brq' + elem.net_uuid.substring(0, 11);
    logger.debug('[VNET] --> network bridge: ' + br_name);

    iface = 'soc' + elem.socatPort + '.' + elem.vlanID;

    var add_vlan_iface = utility.execute('ip link add link soc' + elem.socatPort + ' name ' + iface + ' type vlan id ' + elem.vlanID, '[VNET] --> NETWORK - add_vlan_iface -');

    add_vlan_iface.on('close', function (code) {
        logger.info('[VNET] --> CREATED ' + iface);

        var add_iface_bridge = utility.execute('ip link set ' + iface + ' master ' + br_name, '[VNET] --> NETWORK - add_iface_bridge -');
        add_iface_bridge.on('close', function (code) {
            logger.info('[VNET] --> Added ' + iface + ' to ' + br_name);

            var iface_up = utility.execute('ip link set ' + iface + ' up', '[VNET] --> NETWORK - iface_up -');
            iface_up.on('close', function (code) {
                logger.info('[VNET] --> ' + iface + ' up');

                response.log = 'ip: ' + elem.port.fixedIps[0].ip_address;
                response.result = "VLAN CONNECTION ON " + elem.board + " SUCCESSFULLY ESTABLISHED!";
                res.send(JSON.stringify(response, null, "\t"));

            });

        });


    });
}

net_utils.prototype.createNetwork = function (netname, value, res) {

    var response = {
        message: {},
        result: "",
        log: ""
    }

    logger.warn("[VNET] --> Cannot create Neutron network");
    response.result = "Use Neutron to create the network";
    res.send(JSON.stringify(response, null, "\t"));
};

net_utils.prototype.showNetwork = function (res) {

    var response = {
        message: "list of networks",
        result: []
    }

    neutron.getNetworks(function (err, nets) {
        if (err) {
            response.result = err
            response.result = 'Get networks data failed'
            logger.error("[NEUTRON] - Get networks data failed");
            res.send(JSON.stringify(response, null, "\t"));
        } else {
            logger.debug("[NEUTRON] - net data " + JSON.stringify(nets, null, "\t"));
            logger.info("[NEUTRON] - net data " + nets);

            var promises = [];

            nets.forEach(function (net, i, list) {

                var network = net
                var subnet = net.subnets[0]

                var promise = neutron.getSubNetwork(subnet).then(
                    function (sub) {
                        logger.debug("[NEUTRON] - subnet data " + JSON.stringify(sub, null, "\t"));
                        logger.info("[NEUTRON] - subnet data " + sub);

                        var elem = {
                            uuid: network.id,
                            vlan_ip: sub.cidr,
                            vlan_mask: '',
                            vlan_name: network.name,
                            vlan_id: network.vlan_id
                        }
                        response.result.push(elem)
                        return Q(true);

                    }, function (err) {
                        response.result = err
                        response.result = 'Get subnet data failed for ' + sub
                        logger.error("[NEUTRON] - Get subnet data failed for " + sub);
                        res.send(JSON.stringify(response, null, "\t"));
                    }
                );
                promises.push(promise);


            });
            Q.all(promises).then(function () {
                res.send(JSON.stringify(response, null, "\t"));
                logger.debug("[VNET] - Show networks called.");
            });


        }

    });


};

net_utils.prototype.destroyNetwork = function (net_uuid, res) {
    var response = {
        message: {},
        result: "",
        log: ""
    }

    logger.warn("[VNET] --> Cannot destroy Neutron network");
    response.result = "Use Neutron to destry the network";
    res.send(JSON.stringify(response, null, "\t"));
};

net_utils.prototype.getVnetBoardsInfo = function (net_uuid, res) {

    logger.info("[VNET] - Showing boards in the network: " + net_uuid);

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
     }
     ]
     */


    var response = {
        message: "Showing boards in a network",
        result: "",
        log: ""
    }


    if (net_uuid == undefined) {

        response.result.push("You must specify the network uuid");
        logger.warn("[VNET] --> You must specify the network uuid!");

    } else {


        db.getVnetBoardsInfo(net_uuid, function (db_response) {


            if (db_response.message.length != 0) {

                logger.info("[VNET] --> SHOW BOARDS response: " + JSON.stringify(db_response));
                response.result = db_response.message;
                res.send(JSON.stringify(response, null, "\t"));

            } else {

                logger.info("[VNET] --> NO BOARDS IN THIS NETWORK!");
                response.result = "NO BOARDS IN THIS NETWORK!";
                res.send(JSON.stringify(response, null, "\t"));

            }
        });

    }

};

module.exports = net_utils;
