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
var node_utility = require('./node_utils');

var spawn = require('child_process').spawn;
var ip = require('ip');
var uuid = require('node-uuid');
var Q = require("q");

var nconf = require('nconf');
nconf.file({file: process.cwd() + '/lib/settings.json'});
var socatNetwork = nconf.get('config:socat:ip');
var basePort = nconf.get('config:socat:server:port');
var topic_command = nconf.get('config:wamp:topic_command');
var topic_connection = nconf.get('config:wamp:topic_connection');


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

    //show nodes in a vnet
    rest.get('/v1/vnets/:vnet', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var netuuid = req.params.vnet;

        net_utils.prototype.showBoards(netuuid, res);

    });

    //add node to vnet
    rest.post('/v1/vnets/:vnet/:node', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var netuuid = req.params.vnet;
        var node = req.params.node;
        var value = req.body.value;
        var restore = "false";


        node_utility.checkNodeAvailable(node, res, function (available){

            if(available == true){

                net_utils.prototype.addToNetwork(netuuid, node, value, res, restore);
            }

        });



    });

    //remove node from vnet
    rest.delete('/v1/vnets/:vnet/:node', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var netuuid = req.params.vnet;
        var node = req.params.node;

        net_utils.prototype.removeFromNetwork(netuuid, node, res);
        

    });

    //force vnet on node
    rest.put('/v1/vnets/:node/active', function (req, res) {

        res.type('application/json');
        res.header('Access-Control-Allow-Origin', '*');

        var node = req.params.node;
        var restore = "true";

        logger.info("[NETWORK] - Activating VNETs on node " + node + "...");

        node_utility.checkNodeAvailable(node, res, function (available){

            if(available == true){

                net_utils.prototype.activateBoardNetwork(node, res, restore);
            }

        });


    });

    logger.debug("[REST-EXPORT] - VNET's APIs exposed!");

};





net_utils.prototype.activateBoardNetwork = function (board, res, restore) {
    
    var db_board_id = board;
    
    db.getNetEnabledId(db_board_id, function (data) {

        var net_enabledID = data[0].net_enabled;
        //logger.info("net_enabledID: "+net_enabledID);

        if (net_enabledID == 1) {

            logger.info("[NETWORK] - IOTRONIC BACKEND ENABLED!");
            logger.info("[NETWORK] - BOARD " + db_board_id + " NETWORK ENABLED!");

            db.getSocatStatus(db_board_id, function (data) {
                
                //if the board is NEW="undefined" OR we have to reconnect a board "noactive"
                if (data[0] == undefined || data[0].status == "noactive" || restore == "true") {

                    //NETWORK INIT
                    logger.info("[NETWORK] - SOCAT INITIALIZATION: getting Socat parameters...");

                    var socatNetwork = nconf.get('config:socat:ip');
                    var basePort = nconf.get('config:socat:server:port');

                    if (data[0] == undefined) {
                        logger.debug("[NETWORK] --> NEW BOARD " + db_board_id);
                    }
                    else {
                        logger.debug("[NETWORK] --> BOARD " + db_board_id + " socat status: " + data[0].status);
                    }
                    
                    db.getSocatConf(db_board_id, basePort, socatNetwork, function (data) {

                        logger.info("[NETWORK] --> SOCAT NET CONF = " + JSON.stringify(data));

                        var bSocatNum = data.socat_conf["socatID"];
                        //logger.info("--> SOCAT bSocatNum: "+bSocatNum);

                        var socatServAddr = data.socat_conf["serverIP"];
                        var socatBoardAddr = data.socat_conf["boardIP"];
                        var socatPort = data.socat_conf["port"];
                        
                        logger.info("[NETWORK] --> INJECTING SOCAT PARAMETERS IN " + db_board_id + ": { Server:" + socatServAddr + ":" + socatPort + ", BoardIP: " + socatBoardAddr + ", socat_index: " + bSocatNum + " }");
                        
                        session_wamp.call(db_board_id + '.command.rpc.network.setSocatOnBoard', [socatServAddr, socatPort, socatBoardAddr, net_backend]).then(
                            function (result) {

                                logger.info("[NETWORK] --> SOCAT BOARD RESULT: " + result);

                                // EXEC SOCAT ---------------------------------------------------------------------------------------------------------------------------------------------
                                //var spawn = require('child_process').spawn;

                                //socat -d -d TCP:localhost:$PORT,reuseaddr,forever,interval=10 TUN,tun-name=$TUNNAME,up &
                                var servSocat = utility.execute('socat -d -d TCP:localhost:' + socatPort + ',reuseaddr,forever,interval=10 TUN:' + socatServAddr + '/31,tun-name=soc' + socatPort + ',tun-type=tap,up', '[NETWORK] --> SOCAT');
                                //var servSocat = spawn('socat',['-d','-d','TCP:localhost:'+socatPort+',reuseaddr,forever,interval=10','TUN:'+socatServAddr+'/31,tun-name=soc'+socatPort+', tun-type=tap,up']);
                                //logger.info('[NETWORK] --> SOCAT COMMAND: socat -d -d TCP:localhost:'+socatPort+',reuseaddr,forever,interval=10 TUN:'+socatServAddr+'/31,tun-name=soc'+socatPort+',tun-type=tap,up');
                                //---------------------------------------------------------------------------------------------------------------------------------------------------------

                                
                                // INIT of the shared GRE tunnel

                                //ip link add gre-lr<port> type gretap remote <ipboard> local <serverip>
                                var greIface = spawn('ip', ['link', 'add', 'gre-lr' + socatPort, 'type', 'gretap', 'remote', socatBoardAddr, 'local', socatServAddr]);
                                logger.debug('[NETWORK] --> GRE IFACE CREATION: ip link add gre-lr' + socatPort + ' type gretap remote ' + socatBoardAddr + ' local ' + socatServAddr);

                                greIface.stdout.on('data', function (data) {
                                    logger.debug('[NETWORK] --> GRE IFACE CREATION stdout: ' + data);
                                });
                                greIface.stderr.on('data', function (data) {
                                    logger.warn('[NETWORK] --> GRE IFACE CREATION stderr: ' + data);
                                });
                                greIface.on('close', function (code) {

                                    logger.debug("[NETWORK] --> GRE IFACE CREATED!");

                                    //ip link set gre-lr<port> up
                                    var greIface_up = spawn('ip', ['link', 'set', 'gre-lr' + socatPort, 'up']);
                                    logger.debug('[NETWORK] --> GRE IFACE UP COMMAND: ip link set gre-lr' + socatPort + ' up');

                                    greIface_up.stdout.on('data', function (data) {
                                        logger.debug('[NETWORK] --> GRE IFACE UP stdout: ' + data);
                                    });
                                    greIface_up.stderr.on('data', function (data) {
                                        logger.warn('[NETWORK] --> GRE IFACE UP stderr: ' + data);
                                    });
                                    greIface_up.on('close', function (code) {

                                        logger.debug("[NETWORK] --> GRE IFACE UP!");

                                        //ip link set gre-lr<port> master br-gre
                                        var add_to_brgre = spawn('ip', ['link', 'set', 'gre-lr' + socatPort, 'master', 'br-gre']);
                                        logger.debug('[NETWORK] --> GRE IFACE ADDED TO BRIDGE: ip link set gre-lr' + socatPort + ' master br-gre');

                                        add_to_brgre.stdout.on('data', function (data) {
                                            logger.debug('[NETWORK] --> GRE IFACE ADDED TO BRIDGE stdout: ' + data);
                                        });
                                        add_to_brgre.stderr.on('data', function (data) {
                                            logger.warn('[NETWORK] --> GRE IFACE ADDED TO BRIDGE stderr: ' + data);
                                        });
                                        add_to_brgre.on('close', function (code) {

                                            logger.debug("[NETWORK] --> GRE IFACE ADDED TO GRE BRIDGE!");

                                            //bridge vlan add vid <freevlantag> dev gre-lr<port> pvid
                                            var freevlantag = 2048 + bSocatNum;

                                            var tag_vlan = spawn('bridge', ['vlan', 'add', 'vid', freevlantag, 'dev', 'gre-lr' + socatPort, 'pvid']);
                                            logger.debug('[NETWORK] --> TAG VLAN: bridge vlan add vid ' + freevlantag + ' dev gre-lr' + socatPort + ' pvid');

                                            tag_vlan.stdout.on('data', function (data) {
                                                logger.debug('[NETWORK] --> TAG VLAN stdout: ' + data);
                                            });
                                            tag_vlan.stderr.on('data', function (data) {
                                                logger.warn('[NETWORK] --> TAG VLAN stderr: ' + data);
                                            });
                                            tag_vlan.on('close', function (code) {

                                                logger.debug("[NETWORK] --> TAG VLAN COMPLETED!");

                                                db.updateSocatStatus(db_board_id, "active", function (data) {
                                                });

                                                logger.info("[NETWORK] - TUNNELS CONFIGURATION SERVER SIDE FOR BOARD " + db_board_id + " COMPLETED!");

                                                if (restore == "true") {

                                                    var response = {
                                                        result: "TUNNELS CONFIGURATION FROM SERVER SIDE COMPLETED!"
                                                    };

                                                    res.send(JSON.stringify(response));
                                                    logger.info("[NETWORK] - Board " + board + " network restored!");

                                                }

                                            });

                                        });
                                        
                                    });
                                    
                                });
                                
                            }
                        );
                    });
                    //NETWORK INIT END


                } else {
                    logger.info("[NETWORK] - BOARD " + db_board_id + " ALREADY CONNECTED TO SOCAT - status: " + data[0].status);

                    var response = {
                        result: "BOARD " + db_board_id + " ALREADY CONNECTED TO SOCAT - status: " + data[0].status
                    };

                    res.send(JSON.stringify(response));
                }

            });


        } else {
            logger.debug("[NETWORK] - BOARD " + db_board_id + " IS NOT NETWORK ENABLED!");

            var response = {
                result: "BOARD " + db_board_id + " NO NETWORK ENABLED!"
            };

            res.send(JSON.stringify(response));

        }

    });


};


net_utils.prototype.createNetwork = function (netname, value, res) {

    var response = {
        message: {},
        result: "",
        log: ""
    }

    logger.info("[NETWORK] - CREATING a new VLAN: " + netname);

    if (netname == undefined) {
        response.message = "Please specify a network name";
        logger.warn("[NETWORK] - CREATION NETWORK: Please specify a network name!");

    } else if (value == undefined) {
        response.message = "Please specify a network address";
        logger.warn("[NETWORK] - CREATION NETWORK: Please specify a network address!");

    } else {


        var network = ip.cidrSubnet(value);
        var first = ip.toLong(network.networkAddress);
        var last = ip.toLong(network.broadcastAddress);
        var overlap = false;

        var vlan_name = netname;
        var vlan_ip = network.networkAddress;
        var vlan_mask = network.subnetMaskLength;

        var idArray = {};
        uuid.v4(null, idArray, 0);
        var net_uuid = uuid.unparse(idArray);


        //CHECK OVERLAPPING NETs

        db.getVlanList(function (networksList) {

            //DEBUG
            //logger.info("VLAN LIST: "+JSON.stringify(networksList)); //[{"id":1,"vlan_id":"","vlan_ip":"192.168.1.0","vlan_mask":"24","net_uuid":"b1aae3e7-0b8e-4802-8129-d2fb6bae9e65","vlan_name":"netY"}]
            //logger.info("VLAN LIST LENGTH: "+ networksList.length );


            //OVERLAP CHECK
            for (var i = 0; i < networksList.length; i++) {

                (function (i) {

                    //logger.info("VLAN "+networksList[i].id+" - "+ networksList[i].vlan_name );

                    var netsize = ip.cidrSubnet(networksList[i].vlan_ip + "/" + networksList[i].vlan_mask).numHosts;
                    var firstI = ip.toLong(networksList[i].vlan_ip);
                    var lastI = firstI + netsize;

                    if ((first >= firstI && first <= lastI) || (last >= firstI && last <= lastI)) {
                        overlap = true;
                        logger.warn("[NETWORK] --> VLAN " + netname + " OVERLAP with " + networksList[i].vlan_name + ": " + value);
                        response.log = "WARNING - VLAN " + netname + " OVERLAP with " + networksList[i].vlan_name + ": " + value;
                        //break; //no need to look further so leave the loop
                    }


                })(i);

            }


            if (!overlap) {

                logger.debug("[NETWORK] --> VLAN " + netname + " - NO OVERLAP!");

                var list_ip = [];

                var temp = first;


                //crea il pool di indirizzi liberi: otteniamo ip da first+1 a last-1 --> es: rete /24 otteniamo da .1 a .254
                for (var i = 0; i < network.numHosts; i++) {

                    (function (i) {
                        temp = temp + 1;

                        list_ip.push(ip.fromLong(temp));

                    })(i);

                }
                //logger.info("LIST "+JSON.stringify(list_ip) );


                db.insertNetVlan(vlan_ip, vlan_mask, net_uuid, vlan_name, function (data) {


                    db.insertAddresses(list_ip, net_uuid, function (data_pool) {


                        //logger.info("Addresses pool created: " + JSON.stringify(data_pool));

                        //logger.info("insertNetVlan: "+data[0].id);

                        var newNW = {
                            vlanid: data[0].id,
                            uuid: net_uuid,
                            name: netname,
                            netaddr: network.networkAddress,
                            netmask: network.subnetMaskLength,
                        }

                        response.message = "Network creation";
                        response.log = newNW;

                        logger.info("[NETWORK] - NETWORK CREATED: \n" + JSON.stringify(newNW, null, "\t"));
                        response.result = "NETWORK SUCCESSFULLY CREATED!";
                        res.send(JSON.stringify(response, null, "\t"));


                    });


                });


            } else {
                logger.warn("[NETWORK] --> VLAN " + netname + " OVERLAP!");
                response.result = "Network overlaps with other network(s)";
                res.send(JSON.stringify(response, null, "\t"));

            }


        });


    }


};


net_utils.prototype.showNetwork = function (res) {

    var response = {
        message: "list of networks",
        result: []
    }

    //[{"id":1,"vlan_id":"","vlan_ip":"192.168.1.0","vlan_mask":"24","net_uuid":"b1aae3e7-0b8e-4802-8129-d2fb6bae9e65","vlan_name":"netY"}]

    db.getVlanList(function (networksList) {

        for (var i = 0; i < networksList.length; i++) {
            (function (i) {

                var temporary = {
                    uuid: networksList[i].net_uuid,
                    vlan_ip: networksList[i].vlan_ip,
                    vlan_mask: networksList[i].vlan_mask,
                    vlan_name: networksList[i].vlan_name,
                    vlan_id: networksList[i].id
                }

                response.result.push(temporary);

            })(i);
        }

        res.send(JSON.stringify(response, null, "\t"));
        logger.debug("[NETWORK] - Show networks called.");

    });


};


function destroyVLAN(net_uuid, res, response) {


    db.destroyVLAN(net_uuid, function (db_response) {


        logger.info("[NETWORK] --> Destroying VLAN response: " + JSON.stringify(db_response));

        if (db_response.result == "SUCCESS") {

            response.result = "NETWORK " + net_uuid + " DESTROIED!";
            res.send(JSON.stringify(response, null, "\t"));
            logger.info("[NETWORK] - NETWORK " + net_uuid + " DESTROIED!");


        } else {

            logger.warn("[NETWORK] --> Error Destroying VLAN: " + JSON.stringify(db_response.message));
            response.result = db_response.message;
            res.send(JSON.stringify(response, null, "\t"));

        }

    });


}


net_utils.prototype.destroyNetwork = function (net_uuid, res) {

    logger.info("[NETWORK] - Destroying VLAN: " + net_uuid);

    var response = {
        message: "Destroying network",
        result: ""
    };

    if (net_uuid == undefined) {

        response.message = "Please specify a network UUID!";

    } else {

        db.showBoards(net_uuid, function (boardsList) {

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

            var boardsNumber = boardsList.message.length;

            logger.debug("[NETWORK] --> Boards in this network: " + boardsNumber);

            if (boardsNumber != 0) {

                //logger.info("--> SHOW BOARDS response: "+ JSON.stringify(boardsList));


                for (var i = 0; i < boardsNumber; i++) {

                    (function (i) {


                        //logger.info("----> VLAN "+boardsList.message[i].BOARD_ID+" - "+ boardsList.message[i].vlan_IP+" - "+ boardsList.message[i].vlan_ID+" - "+ boardsList.message[i].vlan_NAME );


                        //UNTAG
                        //bridge vlan del dev gre-lr<port> vid <vlan>
                        var untag_bridge_iface = spawn('bridge', ['vlan', 'del', 'dev', 'gre-lr' + boardsList.message[i].socat_PORT, 'vid', boardsList.message[i].vlan_ID]);
                        logger.debug('[NETWORK] --> NETWORK COMMAND: bridge vlan del dev gre-lr' + boardsList.message[i].socat_PORT + ' vid ' + boardsList.message[i].vlan_ID);

                        untag_bridge_iface.stdout.on('data', function (data) {
                            logger.debug('[NETWORK] ----> stdout - untag_bridge_iface: ' + data);
                        });

                        untag_bridge_iface.stderr.on('data', function (data) {
                            logger.warn('[NETWORK] ----> stderr - untag_bridge_iface: ' + data);
                        });

                        untag_bridge_iface.on('close', function (code) {

                            logger.info('[NETWORK] --> BOARD ' + boardsList.message[i].BOARD_ID + ' REMOVED FROM VLAN ' + boardsList.message[i].vlan_NAME + ' WITH IP ' + boardsList.message[i].vlan_IP);


                            session_wamp.publish(topic_command, [boardsList.message[i].BOARD_ID, 'remove-from-network', boardsList.message[i].vlan_ID, boardsList.message[i].vlan_NAME]);


                        });


                        if (i == (boardsNumber - 1)) {

                            destroyVLAN(net_uuid, res, response);

                        }

                    })(i);

                }


            } else {

                logger.info("[NETWORK] --> NO BOARDS IN THIS NETWORK!");
                destroyVLAN(net_uuid, res, response);

            }

        });


    }


};


function createEstablishTunnels(elem, res, response, restore) {

    session_wamp.publish(topic_command, [elem.board, 'add-to-network', elem.vlanID, elem.greIP, elem.greMask, elem.vlan_name]);

    //bridge vlan add dev gre-lr<port> vid <vlan>
    var tag_bridge_iface = spawn('bridge', ['vlan', 'add', 'dev', 'gre-lr' + elem.socatPort, 'vid', elem.vlanID]);
    logger.debug('[NETWORK] --> NETWORK COMMAND: bridge vlan add dev gre-lr' + elem.socatPort + ' vid ' + elem.vlanID);

    tag_bridge_iface.stdout.on('data', function (data) {
        logger.debug('[NETWORK] ----> stdout - tag_bridge_iface: ' + data);
    });

    tag_bridge_iface.stderr.on('data', function (data) {
        logger.warn('[NETWORK] ----> stderr - tag_bridge_iface: ' + data);
    });

    tag_bridge_iface.on('close', function (code) {

        logger.info('[NETWORK] --> BOARD ' + elem.board + ' ADDED TO VLAN ' + elem.vlan_name + ' WITH IP ' + elem.greIP);

        if (restore == "false") {

            db.insertVLANConnection(elem.greIP, elem.net_uuid, elem.board, function (db_result) {

                logger.info("[NETWORK] - VLAN CONNECTION ON " + elem.board + " SUCCESSFULLY ESTABLISHED!");

                response.log = elem;
                response.result = "VLAN CONNECTION ON " + elem.board + " SUCCESSFULLY ESTABLISHED!";
                res.send(JSON.stringify(response, null, "\t"));


            });

        }


    });


}


net_utils.prototype.addToNetwork = function (netuid, board, value, res, restore) {

    var response = {
        message: "Adding boards to a network",
        result: "",
        log: ""
    };

    db.getNetEnabledId(board, function (data) {

        var net_enabledID = data[0].net_enabled;

        if (net_enabledID == 1) {

            if (value == "") {
                logger.info("[NETWORK] - ADDING board " + board + " to network " + netuid + "...");
            } else {
                logger.info("[NETWORK] - ADDING board " + board + " to network " + netuid + " with " + value + " ...");
            }

            logger.info("[NETWORK] - BOARD " + board + " NETWORK ENABLED!");

            if (netuid == undefined) {

                response.result = "You must specify the network UUID!";

                logger.warn("[NETWORK] --> You must specify the network UUID!");

            } else {


                db.checkAddressPool(netuid, function (free_address) {

                    logger.debug("[NETWORK] --> free_address SELECTED: " + JSON.stringify(free_address));

                    if (free_address.result == "NO-IP" && restore == "false") {

                        //NO IP available
                        logger.warn("[NETWORK] --> ADDING board: NO IP AVAILABLE for this network " + netuid + " !!!");
                        response.result = "WARNING";
                        response.log = "NO IP AVAILABLE for this network!";
                        res.send(JSON.stringify(response, null, "\t"));


                    } else {


                        db.getVlan(netuid, function (network) {

                            //NETWORK SELECTED: [{"id":1,"vlan_name":"netX","vlan_ip":"192.168.1.0","vlan_mask":"24","net_uuid":"6c5bbb63-2e01-4ad5-b594-e860d3f0ef22"}]
                            logger.info("[NETWORK] --> NETWORK SELECTED: " + JSON.stringify(network));

                            //logger.info("NETWORK DIM: "+ network.length);
                            if (network.length != 0) {

                                logger.info("[NETWORK] --> NETWORK UUID: " + network[0].net_uuid);

                                //var netsize = ip.cidrSubnet(networksList[i].vlan_ip+"/"+networksList[i].vlan_mask).numHosts;
                                var netsize = ip.cidrSubnet(network[0].vlan_ip + "/" + network[0].vlan_mask).numHosts;
                                logger.debug("[NETWORK] --> subnet size: " + netsize);

                                //verifico se la subnet specificata sia sensata
                                if (netsize >= 1) {

                                    logger.debug("[NETWORK] --> subnet size good: " + netsize);

                                    //verifico che la board non sia già stata aggiunta in precedenza a questa VLAN
                                    db.checkBoardIntoVLAN(board, netuid, function (response_db) {

                                        logger.debug("[NETWORK] --> checkBoardIntoVLAN response: " + JSON.stringify(response_db));
                                        logger.debug("[NETWORK] ----> checkBoardIntoVLAN: " + response_db.message[0].found);

                                        if (response_db.message[0].found == 0 || restore == "true") { //if the board isn't configured

                                            logger.debug("[NETWORK] --> the board isn't configured yet!");

                                            db.getSocatConn(board, function (soc_result) {

                                                var socatID = soc_result[0].id;
                                                var socatPort = soc_result[0].port;
                                                logger.debug("[NETWORK] --> socatPort: " + socatPort);
                                                logger.debug("[NETWORK] --> socatID: " + socatID)

                                                var hostAddress;

                                                if (value != "") {

                                                    if (restore == "false") {

                                                        //IF the user specifies an IP for the VLAN
                                                        logger.info("[NETWORK] --> IP specified: " + value + " for the network " + network[0].id);

                                                        //params: value, network.[0].id
                                                        db.checkAssignedVlanIP(value, network[0].id, function (response_db) {

                                                            logger.debug("[NETWORK] --> checkAssignedVlanIP response: " + JSON.stringify(response_db));

                                                            if (response_db.message[0].found == 1) {

                                                                hostAddress = value; //from user

                                                                var elem = {
                                                                    board: board,
                                                                    socatID: socatID,
                                                                    socatPort: socatPort,
                                                                    greIP: hostAddress,
                                                                    greMask: network[0].vlan_mask,
                                                                    vlanID: network[0].id,
                                                                    vlan_name: network[0].vlan_name,
                                                                    net_uuid: network[0].net_uuid
                                                                }

                                                                createEstablishTunnels(elem, res, response, restore);

                                                            } else {


                                                                logger.warn("[NETWORK] --> IP " + value + " is NOT AVAILABLE!");

                                                                response.result = "WARNING";
                                                                response.log = "IP " + value + " is NOT AVAILABLE!";
                                                                res.send(JSON.stringify(response, null, "\t"));

                                                            }


                                                        });


                                                    } else {

                                                        //RESTORATION
                                                        var elem = {
                                                            board: board,
                                                            socatID: socatID,
                                                            socatPort: socatPort,
                                                            greIP: value,
                                                            greMask: network[0].vlan_mask,
                                                            vlanID: network[0].id,
                                                            vlan_name: network[0].vlan_name,
                                                            net_uuid: network[0].net_uuid
                                                        }

                                                        logger.info("[NETWORK] --> IP " + value + " restoring...");
                                                        createEstablishTunnels(elem, res, response, restore);

                                                    }


                                                } else {
                                                    //IF the user does not specify an IP for the VLAN

                                                    logger.debug("[NETWORK] --> Selecting an IP from the pool...");

                                                    db.getFreeAddress(netuid, function (response_db) {

                                                        if (response_db.message.length == 0) {

                                                            logger.warn("[NETWORK] --> ADDING board: NO IP AVAILABLE for this network " + network[0].net_uuid + " !!!");
                                                            response.result = "WARNING";
                                                            response.log = "NO IP AVAILABLE for this network!";
                                                            res.send(JSON.stringify(response, null, "\t"));

                                                        } else {
                                                            hostAddress = response_db.message[0].ip; //from pool

                                                            logger.info("[NETWORK] --> Selected IP is " + hostAddress);

                                                            var elem = {
                                                                board: board,
                                                                socatID: socatID,
                                                                socatPort: socatPort,
                                                                greIP: hostAddress,
                                                                greMask: network[0].vlan_mask,
                                                                vlanID: network[0].id,
                                                                vlan_name: network[0].vlan_name,
                                                                net_uuid: network[0].net_uuid
                                                            }

                                                            createEstablishTunnels(elem, res, response, restore);

                                                        }

                                                    });


                                                }


                                            });


                                        } else {

                                            logger.warn("[NETWORK] --> ADDING board: board already configured!");
                                            response.result = "WARNING";
                                            response.log = "Board already in this network!";
                                            res.send(JSON.stringify(response, null, "\t"));

                                        }

                                    });


                                } else {

                                    logger.warn("[NETWORK] --> You need a bigger subnet!");
                                    response.result = "WARNING";
                                    response.log = "You need a bigger subnet!";
                                    res.send(JSON.stringify(response, null, "\t"));
                                }


                            } else {

                                logger.warn("[NETWORK] --> That network uuid does not exist!");
                                response.result = "WARNING";
                                response.log = "That network uuid does not exist!";
                                res.send(JSON.stringify(response, null, "\t"));
                            }


                        });


                    }

                });


            }


        } else {

            logger.info("[NETWORK] - BOARD " + board + " NO NETWORK ENABLED!");

            response.result = "WARNING";
            response.log = "BOARD " + board + " NO NETWORK ENABLED!";
            res.send(JSON.stringify(response, null, "\t"));


        }

    });


};


net_utils.prototype.removeFromNetwork = function (net_uuid, board, res) {

    logger.info("[NETWORK] - REMOVING from network " + net_uuid + " the board " + board);

    var response = {
        message: "Removing boards from a network",
        result: "",
        log: ""
    };

    if (net_uuid == undefined) {
        response.result = "You must specify the network UUID!";
        logger.warn("[NETWORK] --> You must specify the network UUID!");

    } else {


        db.checkBoardIntoVLAN(board, net_uuid, function (response) {

            logger.debug("[NETWORK] --> checkBoardIntoVLAN response: " + JSON.stringify(response));
            logger.debug("[NETWORK] ----> checkBoardIntoVLAN: " + response.message[0].found);

            //check if the board is in that VLAN
            if (response.message[0].found == 1) {


                db.getVlan(net_uuid, function (network) {

                    //NETWORK SELECTED: [{"id":1,"vlan_name":"netX","vlan_ip":"192.168.1.0","vlan_mask":"24","net_uuid":"6c5bbb63-2e01-4ad5-b594-e860d3f0ef22"}]
                    logger.debug("[NETWORK] --> Network selected: " + JSON.stringify(network));

                    var vlanID = network[0].id;
                    var vlanName = network[0].vlan_name;


                    db.getSocatConn(board, function (result) {

                        //var socatID = result[0].id;
                        var socatPort = result[0].port;
                        logger.debug("[NETWORK] --> socatPort: " + socatPort);
                        //logger.debug("[NETWORK] --> socatID: " + socatID)


                        //bridge vlan del dev gre-lr<port> vid <vlan>
                        var tag_bridge_iface = spawn('bridge', ['vlan', 'del', 'dev', 'gre-lr' + socatPort, 'vid', vlanID]);
                        logger.debug('[NETWORK] --> NETWORK COMMAND: bridge vlan del dev gre-lr' + socatPort + ' vid ' + vlanID);

                        tag_bridge_iface.stdout.on('data', function (data) {
                            logger.debug('[NETWORK] ----> stdout - untag_bridge_iface: ' + data);
                        });

                        tag_bridge_iface.stderr.on('data', function (data) {
                            logger.warn('[NETWORK] ----> stderr - untag_bridge_iface: create link: ' + data);
                        });

                        tag_bridge_iface.on('close', function (code) {

                            //Data structures cleaning.......................

                            db.removeBoardFromVlan(board, net_uuid, function (result) {

                                session_wamp.publish(topic_command, [board, 'remove-from-network', vlanID, vlanName]);

                                logger.info('[NETWORK] --> BOARD ' + board + ' REMOVED FROM VLAN ' + vlanName);
                                response.result = 'BOARD ' + board + ' REMOVED FROM VLAN ' + vlanName;
                                response.log = result;
                                res.send(JSON.stringify(response, null, "\t"));

                            });


                        });


                    });


                });


            } else {

                response.result = "Board " + board + " is not connected to the specified network!";

                logger.warn("[NETWORK] --> Board " + board + " is not connected to the specified network!");
                res.send(JSONstringify(response, null, "\t"));
            }


        });


    }


};


net_utils.prototype.showBoards = function (net_uuid, res) {

    logger.info("[NETWORK] - Showing boards in the network: " + net_uuid);

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
        logger.warn("[NETWORK] --> You must specify the network uuid!");

    } else {


        db.showBoards(net_uuid, function (db_response) {


            if (db_response.message.length != 0) {

                logger.info("[NETWORK] --> SHOW BOARDS response: " + JSON.stringify(db_response));
                response.result = db_response.message;
                res.send(JSON.stringify(response, null, "\t"));

            } else {

                logger.info("[NETWORK] --> NO BOARDS IN THIS NETWORK!");
                response.result = "NO BOARDS IN THIS NETWORK!";
                res.send(JSON.stringify(response, null, "\t"));

            }

        });


    }


};


// myArray is the array being searched
// value is the value we want to find
// property is the name of the field in which to search
function findValue(myArray, value, property) {
    for (var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === value) {
            return i;
        }
    }
    return -1;
}

function findFirstFreeKey(myArray) {
    var found = -1, len = myArray.length;
    for (var i = 0; i < len; i++) {
        found = findValue(myArray, i, 'key');
        if (found == -1) {
            return i;
        }
    }
    return len;
}

net_utils.prototype.findFirstFreeKey = function (myArray) {
    var found = -1, len = myArray.length;
    for (var i = 0; i < len; i++) {
        found = findValue(myArray, i, 'key');
        if (found == -1) {
            return i;
        }
    }
    return len;
}


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

        logger.info("[NETWORK] - Iotronic Virtual Network (VNET) initialization...");
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
