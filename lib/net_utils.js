
/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Andrea Rocco Lotronto, Nicola Peditto, Fabio Verboso
*/

//service logging configuration: "net_utils"   
var logger = log4js.getLogger('net_utils');

var db = new db_utils;

var nconf = require('nconf');
nconf.file ({file: process.cwd()+'/lib/settings.json'});
var socatNetwork 	= nconf.get('config:socat:ip');
var basePort 		= nconf.get('config:socat:server:port');
var topic_command 	= nconf.get('config:wamp:topic_command');
var topic_connection 	= nconf.get('config:wamp:topic_connection');

var spawn = require('child_process').spawn;

var ip = require('ip');
var uuid = require('uuid');


var networksArray = [];

//IN PROGRESS
var vlanID=0;


var greDevices = [];
//var socatBoards = [];

var session_wamp;

net_utils = function(session){
	session_wamp = session;
}


var Q = require("q");




net_utils.prototype.createNetwork = function(netname, value, res){

    var response = {
      message:{},
      result:"",
      log:""
    }

    
    

      
    if(netname == undefined) {
	response.message = "Please specify a network name";
	logger.warn("CREATION NETWORK: Please specify a network name!");
      
    } else if(value == undefined) {
	response.message = "Please specify a network address";
	logger.warn("CREATION NETWORK: Please specify a network address!");
      
    } else {
      
      
      
      
      	var network = ip.cidrSubnet(value);
	var first = ip.toLong(network.networkAddress);
	var last = ip.toLong(network.broadcastAddress);
	var overlap = false;
	
	var vlan_name = netname;
	var vlan_ip = network.networkAddress;
	var vlan_mask = network.subnetMaskLength;
	
	var idArray = {};
	uuid.v4(null,idArray,0);
	var net_uuid = uuid.unparse(idArray);
	
	
	//CHECK OVERLAPPING NETs
	
	db.getVlanList(function(networksList){
  
	    //DEBUG
	    //logger.info("VLAN LIST: "+JSON.stringify(networksList)); //[{"id":1,"vlan_id":"","vlan_ip":"192.168.1.0","vlan_mask":"24","net_uuid":"b1aae3e7-0b8e-4802-8129-d2fb6bae9e65","vlan_name":"netY"}]
	    //logger.info("VLAN LIST LENGTH: "+ networksList.length );
	    
	    
	    //OVERLAP CHECK
	    for(var i = 0; i < networksList.length; i++) {
      
	      (function(i) {
		  
		    //logger.info("VLAN "+networksList[i].id+" - "+ networksList[i].vlan_name );
		    
		    var netsize = ip.cidrSubnet(networksList[i].vlan_ip+"/"+networksList[i].vlan_mask).numHosts;
		    var firstI = ip.toLong(networksList[i].vlan_ip);
		    var lastI = firstI + netsize;
		    
		    if((first >= firstI && first<=lastI) || (last >= firstI && last<=lastI)) {
		      overlap = true;
		      logger.info("VLAN "+netname+" OVERLAP with "+networksList[i].vlan_name+": "+value);
		      response.log="VLAN "+netname+" OVERLAP with "+networksList[i].vlan_name+": "+value;
		      //break; //no need to look further so leave the loop
		    }


	      })(i); 

	    }
			    
			    
			    
	    
            if(!overlap) {
                
		logger.info("VLAN "+netname+" - NO OVERLAP!" );
                
                var list_ip=[];
                
                var temp = first;
		
                
		//crea il pool di indirizzi liberi: otteniamo ip da first+1 a last-1 --> es: rete /24 otteniamo da .1 a .254
                for(var i = 0; i < network.numHosts; i++) {
        
		  (function(i) {
			  temp=temp+1;
			 
			  list_ip.push(ip.fromLong(temp));
			  
		  })(i); 

                }
                
                //logger.info("LIST "+JSON.stringify(list_ip) );
                
                
                
                db.insertNetVlan(vlan_ip, vlan_mask, net_uuid, vlan_name, function(data){
		  
		  
			db.insertAddresses(list_ip, net_uuid, function(data_pool){
				
			  
			  //logger.info("Addresses pool created: " + JSON.stringify(data_pool));
			  
			  //logger.info("insertNetVlan: "+data[0].id);
			  
			  var newNW = {
			      vlanid:data[0].id,
			      uuid:net_uuid,
			      name:netname,
			      netaddr:network.networkAddress,
			      netmask:network.subnetMaskLength,
			  }
		      
			  response.message="Network created";
			  response.log=newNW;
			  
			  logger.info("NETWORK CREATED: \n" + JSON.stringify(newNW,null,"\t"));
			  response.result="NETWORK SUCCESSFULLY CREATED!";
			  res.send(JSON.stringify(response,null,"\t"));
			
			
				
			});
					
			
		   
		
		});
                
                
		
		
	    } else {
		
                response.result="Network overlaps with other network(s)";
                res.send(JSON.stringify(response,null,"\t"));
                
	    }
	    

	    
	    
	}); 
	
	

	

	
	  

	 
	  
	  
	  
	  
	  
	  /*
	  //ARTHUR-NICOLA-FABIO works!------------------------------------------------------------------------------------------------------------
	  
		  var network = ip.cidrSubnet(value);
		  var first = ip.toLong(network.networkAddress);
		  var last = ip.toLong(network.broadcastAddress);
		  var overlap = false;
		  
		  for(var i = 0; i < networksArray.length; i++) {
		    
		    var firstI = ip.toLong(networksArray[i].netaddr);
		    var lastI = firstI + networksArray[i].netsize;
		    
		    if((first >= firstI && first<=lastI) || (last >= firstI && last<=lastI)) {
		      overlap = true;
		      break; //no need to look further so leave the loop
		    }
		    
		  }
		  
		  if(!overlap) {
		    
		    //IN PROGRESS
		    vlanID = vlanID+1;
		    
		    var newNW = {
		      key:findFirstFreeKey(networksArray),
		      uuid:"",
		      //IN PROGRESS
		      vlanID:vlanID,
		      name:netname,
		      netaddr:network.networkAddress,
		      netmask:network.subnetMaskLength,
		      netbc:network.broadcastAddress,
		      netsize:network.numHosts,
		      nethosts:[]
		    }
		    
		    var idArray = {};
		    uuid.v4(null,idArray,0);
		    newNW.uuid = uuid.unparse(idArray);
		    newNW.vlanID = networksArray.length +1
		    
		    networksArray.push(newNW);
		    response.message="Network created";
		    
		    //LATEST
		    //response.result=newNW;
		    response.log=newNW;
		    
		    var comodo = spawn('brctl',['addbr','br'+newNW.uuid.substring(0, 6)]);
		    
		    logger.info("NETWORK CREATED: \n" + JSON.stringify(newNW,null,"\t"));
		    response.result="NETWORK SUCCESSFULLY CREATED!";
		    res.send(JSON.stringify(response,null,"\t"));
		    
		    } else {
		      response.result="Network overlaps with other network(s)";
		      res.send(JSON.stringify(response,null,"\t"));
		      
		    }
	   
	  
	  //------------------------------------------------------------------------------------------------------------
	  */
	
      }
      
      
      
      
}


net_utils.prototype.showNetwork = function(res){
  
    var response = {
      message:"list of networks",
      result:[]
    }

    //[{"id":1,"vlan_id":"","vlan_ip":"192.168.1.0","vlan_mask":"24","net_uuid":"b1aae3e7-0b8e-4802-8129-d2fb6bae9e65","vlan_name":"netY"}]
    
    db.getVlanList(function(networksList){
      
        for(var i = 0; i < networksList.length; i++) {
            (function(i) {
                
                var temporary = {
                    uuid:networksList[i].net_uuid,
                    vlan_ip:networksList[i].vlan_ip,
                    vlan_mask:networksList[i].vlan_mask,
                    vlan_name:networksList[i].vlan_name,
                    vlan_id:networksList[i].id
                }

                response.result.push(temporary);
                
              })(i);
        } 
        
	res.send(JSON.stringify(response,null,"\t"));
	logger.info("SHOW NETWORKS CALLED.");
        
    });
    
    /*
    for(var i = 0; i < networksArray.length; i++) {
      
      var temporary = {
        uuid:networksArray[i]['uuid'],
	vlanId:networksArray[i]['vlanID'],
        name:networksArray[i]['name'],
        address:networksArray[i]['netaddr'],
        size:networksArray[i]['netsize'],
        hosts:networksArray[i]['nethosts']
      }

      response.result.push(temporary);
    }
    res.send(JSON.stringify(response,null,"\t"));
    logger.info("SHOW NETWORKS CALLED.");
    */

    
    
}


net_utils.prototype.updateNetwork = function(netname, netuid, value, res){
  
    //envoyer un push update-board a toutes les boards avec la nouvelle information
    //si changement d'ip et/ou de masque, changer d'abord dans le réseau, puis transmettre aux boards
    var response = {
      message:"Updating network",
      result:[]
    }
    if(netuid == undefined) {
      response.message = "Please specify a network name";
    } else {
      var position = findValue(networksArray,netuid,'uuid');
      if(position != -1){
        var temporary = networksArray[position];
        if(netname != undefined) {
          temporary['name'] = netname;
        }
        if(value != undefined) {
          var network = ip.cidrSubnet(value);
          var first = ip.toLong(network.networkAddress);
          var last = ip.toLong(network.broadcastAddress);
          var overlap = false;
          for(var i = 0; i < networksArray.length; i++) {
            if(i!=position) { //because the network might overlap with its old self, which is not a problem so we ignore that specific case
              var firstI = ip.toLong(networksArray[i].netaddr);
              var lastI = firstI + networksArray[i].netsize;
              if((first >= firstI && first<=lastI) || (last >= firstI && last<=lastI)) {
                overlap = true;
                break; //no need to look further so leave the loop
              }
            }
          }
          if(!overlap) {
            var newNetwork = ip.cidrSubnet(value);
            if(newNetwork.numHosts >= temporary.nethosts.length) {
              var oldMask = "/" + temporary.netmask;
              temporary.netaddr = newNetwork.networkAddress;
              temporary.netmask = newNetwork.subnetMaskLength;
              temporary.netbc = newNetwork.broadcastAddress;
              temporary.netsize = newNetwork.numHosts;

              for(var j = 0; j < temporary.nethosts.length; j++) {
                var tempHosts = temporary.nethosts[j];
                var oldAddrMask = tempHosts.addr + oldMask ;
                tempHosts.addr = ip.fromLong(ip.toLong(temporary.netaddr) + tempHosts.key + 1);
                session_wamp.publish(topic_command, [tempHosts['value'],'update-board',tempHosts.addr+"/"+temporary.netmask,tempHosts.device,oldAddrMask,temporary.netbc]);
              }

              response.result = {
                                  netuid: temporary.uuid,
                                  netname: temporary.name,
                                  netaddr: temporary.netaddr,
                                  netmask: temporary.netmask
                                }

            } else {
              response.result.push("Network too small to contain all of its hosts")
            }
          }
        }
      } else {
        response.result = "That network uid does not exist"
      }
    }
    res.send(JSON.stringify(response,null,"\t"));
}



net_utils.prototype.destroyNetwork = function(netuid, res){
  
    var response = {
      message:"Destroying network",
      result:[]
    }
    
    if(netuid == undefined) {
      
      response.message = "Please specify a network name!";
      
    } else {
      
      var position = findValue(networksArray,netuid, 'uuid');
      
      if(position != -1){
	
        var temporary = {
          uuid:networksArray[position]['uuid'],
          name:networksArray[position]['name'],
          address:networksArray[position]['netaddr'],
          size:networksArray[position]['netsize'],
          hosts:networksArray[position]['nethosts']
        }
        
        for(var j = 0; j < temporary.hosts.length; j++) {
          var tempHosts = temporary.hosts[j];
          session_wamp.publish(topic_command, [tempHosts['value'],'remove-from-network',tempHosts.device,tempHosts.socatMap]);
          socatBoards.splice(findValue(socatBoards,tempHosts.socatMap,'key'),1);
        }
        
        networksArray.splice(position,1);
        response.result.push(temporary);
	
        var testing = spawn('ip',['link','set','br'+temporary.uuid.substring(0, 6),'down']);
	
        testing.on('close',function(code) {
	  
          spawn('brctl', ['delbr','br'+temporary.uuid.substring(0, 6)] );
	  
        });
	
	
      } else {
        response.result = "That network uid does not exist"
	
      }
      
    }
    
    res.send(JSON.stringify(response,null,"\t"));
    logger.info("NETWORK " + netuid + " DESTROIED!");
    
    
    
    /*
    var response = {
      message:"Destroying network",
      result:[]
    }
    
    if(netuid == undefined) {
      
      response.message = "Please specify a network name!";
      
    } else {
      
      var position = findValue(networksArray,netuid, 'uuid');
      
      if(position != -1){
	
        var temporary = {
          uuid:networksArray[position]['uuid'],
          name:networksArray[position]['name'],
          address:networksArray[position]['netaddr'],
          size:networksArray[position]['netsize'],
          hosts:networksArray[position]['nethosts']
        }
        
        for(var j = 0; j < temporary.hosts.length; j++) {
          var tempHosts = temporary.hosts[j];
          session_wamp.publish(topic_command, [tempHosts['value'],'remove-from-network',tempHosts.device,tempHosts.socatMap]);
          socatBoards.splice(findValue(socatBoards,tempHosts.socatMap,'key'),1);
        }
        
        networksArray.splice(position,1);
        response.result.push(temporary);
	
        var testing = spawn('ip',['link','set','br'+temporary.uuid.substring(0, 6),'down']);
	
        testing.on('close',function(code) {
	  
          spawn('brctl', ['delbr','br'+temporary.uuid.substring(0, 6)] );
	  
        });
	
	
      } else {
        response.result = "That network uid does not exist"
	
      }
      
    }
    
    res.send(JSON.stringify(response,null,"\t"));
    logger.info("NETWORK " + netuid + " DESTROIED!");
    */
    
}


function createEstablishTunnels(session_wamp, topic_command, elem, res, response) {
	//createEstablishTunnels(session, topic_command, elem)----------------------------------------------------------------------------


	//INPUT: args[0]: boardID args[1]:'add-to-network' args[2]:vlanID - args[3]:boardVlanIP - args[4]:vlanMask - args[5]:vlanName
	session_wamp.publish(topic_command, [elem.board, 'add-to-network', elem.vlanID, elem.greIP, elem.greMask, elem.vlan_name]);

	//bridge vlan add dev gre-lr<port> vid <vlan>
	var tag_bridge_iface = spawn('bridge',['vlan', 'add', 'dev', 'gre-lr'+elem.socatPort, 'vid', elem.vlanID]);
	logger.info('--> NETWORK COMMAND: bridge vlan add dev gre-lr'+elem.socatPort+ ' vid '+elem.vlanID);
	
	tag_bridge_iface.stdout.on('data', function (data) {
	  logger.info('----> stdout - tag_bridge_iface: ' + data);
	});
	
	tag_bridge_iface.stderr.on('data', function (data) {
	  logger.info('----> stderr - tag_bridge_iface: ' + data);
	});
	
	tag_bridge_iface.on('close', function (code) {
	  
	      logger.info('--> BOARD '+elem.board+' ADDED TO VLAN '+ elem.vlan_name +' WITH IP '+ elem.greIP);

	      response.log=elem;

	      logger.info("GRE TUNNEL ON "+elem.board+" SUCCESSFULLY ESTABLISHED!");
	    
	      //LATEST
	      response.result = "GRE TUNNEL ON "+elem.board+" SUCCESSFULLY ESTABLISHED!";
	      res.send(JSON.stringify(response,null,"\t"));

	});
	//createEstablishTunnels(session, topic_command, elem)---------------------------------------------------------------------------- 
}

net_utils.prototype.addToNetwork = function(netuid, board, value, res){
  
    if(value == ""){
      logger.info("ADDING board "+ board + " to network " + netuid + "...");
    }else{
      logger.info("ADDING board "+ board + " to network " + netuid + " with "+ value + " ...");
    }
    
    var response = {
      message:"Adding boards to a network",
      result:"",
      log:""
    }
    
    if(netuid == undefined){
      
      response.result = "You must specify the network UUID!";
      
      logger.warn("You must specify the network UUID!");
      
    } else {
      
      
      db.getVlan(netuid, function(network){
	
	//NETWORK SELECTED: [{"id":1,"vlan_name":"netX","vlan_ip":"192.168.1.0","vlan_mask":"24","net_uuid":"6c5bbb63-2e01-4ad5-b594-e860d3f0ef22"}]
	logger.info("NETWORK SELECTED: "+ JSON.stringify(network));
	
	//logger.info("NETWORK DIM: "+ network.length);
	if(network.length != 0){

	  logger.info("NETWORK UUID: "+ network[0].net_uuid); 
	  
	  //var netsize = ip.cidrSubnet(networksList[i].vlan_ip+"/"+networksList[i].vlan_mask).numHosts;
	  var netsize = ip.cidrSubnet(network[0].vlan_ip+"/"+network[0].vlan_mask).numHosts;
	  logger.info("--> subnet size: " + netsize);
	  
	  //verifico se la subnet specificata sia sensata
	  if(netsize >= 1){

		  logger.info("--> subnet size good: " + netsize);
 
		  //verifico che la board non sia già stata aggiunta in precedenza a questa VLAN
		  db.checkBoardIntoVLAN(board, netuid, function(response){   
		    
		      logger.info("checkBoardIntoVLAN response: "+ JSON.stringify(response));
		      logger.info("--> checkBoardIntoVLAN: " + response.message[0].found);
		    
		      if(response.message[0].found == 0) { //if the board isn't configured
			
			  logger.info("--> the board isn't configured yet!");
			  
			  db.getSocatPort(board, function(result){
				
				var socatPort = result[0].port;
				logger.info("--> socatPort: " + socatPort);
				
				var hostAddress;
				
				if(value != "") {
	      
				    //IF the user specifies an IP for the VLAN
				  
				    logger.info("USER specified the IP: "+ value);
				    
				    //params: value, network.[0].id
				    db.checkAssignedVlanIP(value, network[0].id, function(response){
				      
				      if(response.message[0].found == 1){
					
					logger.info("IP "+ value +" is free!");
					
					hostAddress = value; //from user
					
					var elem = {
					    board: board,
					    socatPort: socatPort,
					    greIP: hostAddress,
					    greMask: network[0].vlan_mask,
					    vlanID: network[0].id,
					    vlan_name: network[0].vlan_name
					}
					  
					createEstablishTunnels(session_wamp, topic_command, elem, res, response);
					
					
				      }else{
					
					logger.info("IP "+ value +" is NOT free!");
					
					response.result = "IP "+ value +" is NOT free!";
					res.send(JSON.stringify(response,null,"\t"));
					
				      }
				      
				      
				    });
				    
				    
				    
				} else {
				    //IF the user does not specify an IP for the VLAN
				  
				    logger.info("Selecting an IP from the pool...");
				  
				    db.getFreeAddress(netuid, function(response){
					  
					  hostAddress = response.message[0].ip; //from pool
					  
					  logger.info("Selected IP is "+ hostAddress);
					  
					  var elem = {
					    board: board,
					    socatPort: socatPort,
					    greIP: hostAddress,
					    greMask: network[0].vlan_mask,
					    vlanID: network[0].id,
					    vlan_name: network[0].vlan_name
					  }
					  
					  createEstablishTunnels(session_wamp, topic_command, elem, res, response);

				
				
			      
					
				    });
					      
					    

				}
	    
	    
	    
				
			
            
		    
			  

		  
		
			
			
			
			});
		  
		  
		  
		  

		      } else {
			
			//NICOLA DEBUG
			logger.info("--> ADDING board: board already configured!");
			
		      }
		    
		  });
		  
	    
		  
		    
		    
		    
		  
	    

            
            
	      
	  } else {
	    response.result = "You need a bigger subnet!";
	    logger.warn("--> You need a bigger subnet!");
	    res.send(JSONstringify(response, null,"\t"));
	  }
	  
	  
	} else {
	  response.result = "That network uuid does not exist!";
	  logger.warn("--> That network uuid does not exist!");
	  res.send(JSONstringify(response,null,"\t"));
	}
	
	//CHECK if the user specified the IP (value) and add it into DB
	
	
	
      });
      
     
      
    }

    
    
    
    
    
 /*   
    
    if(value == undefined){
      logger.info("ADDING board "+ board + " to network " + netuid + "...");
    }else{
      logger.info("ADDING board "+ board + " to network " + netuid + " with "+ value + " ...");
    }
    
    var response = {
      message:"Adding boards to a network",
      result:"",
      log:""
    }
    
    if(netuid == undefined){
      
      response.result = "You must specify the network UUID!";
      
      logger.warn("You must specify the network UUID!");
      
    } else {
      
      var position = findValue(networksArray, netuid, 'uuid');
     
      if(position != -1){
	
        var network = networksArray[position];
        var temp = [];
	
        for(var j = 0; j < network['nethosts'].length; j++){
          temp.push(network['nethosts'][j]['value']);
        }


        if(network.netsize >= 1){
	  
	    var establishTunnels;

	    logger.info("--> Finding bSocatNum index in: " + JSON.stringify(socatBoards));
	    
            var bSocatNum = findValue(socatBoards, board, "value");
	    //var bSocatNum = findFirstFreeKey(socatBoards);
	    logger.info("--> bSocatNum: " + bSocatNum)
	    
	    
            var bGreNum = 0;
            var reqIp = -1;
	    
            if(value != undefined) {
	      
              reqIp = ip.toLong(value); //considering value is a valid ip
              var firstI = ip.toLong(network.netaddr);
              var lastI = firstI + network.netsize;
	      
              if(reqIp > firstI && reqIp <= lastI) { //the requested ip is in the network
		
                var reqGreNum = reqIp - (firstI+1); //firstI is the network address, so the first available is firstI+1
		
                if(findValue(network.nethosts,reqGreNum,'key') == -1) { //if that key is free
                  bGreNum = reqGreNum;
		  
                } else { //not available, default ip given
                  bGreNum = findFirstFreeKey(network.nethosts);
                  reqIp = -1;
		  
                }
                
              } else { //wrong ip, default ip given
		
                bGreNum = findFirstFreeKey(network.nethosts);
                reqIp = -1;
              }
              
            } else {
	      
              bGreNum = findFirstFreeKey(network.nethosts);
	      logger.info("--> bGreNum: " + bGreNum );
            }
            
            
            var hostAddress = ip.fromLong(ip.toLong(network.netaddr) + bGreNum + 1);
	    
            var socatNetAddr = ip.toLong(socatNetwork) + (bSocatNum*4);
            var socatHostAddr = ip.fromLong(socatNetAddr+2);
            var socatServAddr = ip.fromLong(socatNetAddr+1);
	    
	    var basePort = nconf.get('config:socat:server:port');
	    var socatPort = parseInt(basePort) + bSocatNum;
	    logger.info("--> socatPort: " + socatPort)
	    
            var elem = {
              board: board,
              //socatIP: socatHostAddr,
              socatPort: socatPort,
              //socatServ: socatServAddr,
              greIP: hostAddress,
              //greTap: network.uuid.substring(0, 6)+'-'+board.substring(0,6),
              //greBC: network.netbc,
              greMask: network.netmask,
              //netuid: network.uuid,
	      vlanID: network.vlanID,
	      //bSocatNum: bSocatNum
            }
            

            var positionB = findValue(network.nethosts,board,'value');
	    
            if(positionB == -1) { //if the board isn't configured

	      
		  //createEstablishTunnels(session, topic_command, elem)----------------------------------------------------------------------------
		  
		  
		  //INPUT: args[0]: boardID args[1]:'add-to-network' args[2]:vlanID - args[3]:boardVlanIP - args[4]:vlanMask - args[5]:vlanName
		  session_wamp.publish(topic_command, [elem.board, 'add-to-network', elem.vlanID, elem.greIP, elem.greMask, network.name]);

		  //bridge vlan add dev gre-lr<port> vid <vlan>
		  var tag_bridge_iface = spawn('bridge',['vlan', 'add', 'dev', 'gre-lr'+socatPort, 'vid', elem.vlanID]);
		  logger.info('--> NETWORK COMMAND: bridge vlan add dev gre-lr'+socatPort+ ' vid '+elem.vlanID);
		  
		  tag_bridge_iface.stdout.on('data', function (data) {
		    logger.info('----> stdout - tag_bridge_iface: ' + data);
		  });
		  
		  tag_bridge_iface.stderr.on('data', function (data) {
		    logger.info('----> stderr - tag_bridge_iface: ' + data);
		  });
		  
		  tag_bridge_iface.on('close', function (code) {
		    
			logger.info('--> BOARD '+board+' ADDED TO VLAN '+network.name+' WITH IP '+ elem.greIP);

			response.log=elem;
		  
			var map2 = {
			  key: bGreNum,
			  socatMap: bSocatNum,
			  value: elem.board,
			  addr: elem.greIP,
			  //device: elem.greTap,
			  state: 1
			}
			
			network.nethosts.push(map2);

			logger.info("GRE TUNNEL ON "+elem.board+" SUCCESSFULLY ESTABLISHED!");
		      
			//LATEST
			response.result = "GRE TUNNEL ON "+elem.board+" SUCCESSFULLY ESTABLISHED!";
			res.send(JSON.stringify(response,null,"\t"));

		  });
		  //createEstablishTunnels(session, topic_command, elem)----------------------------------------------------------------------------
		  
		  
		  
		  

	      
            } else if(network.nethosts[positionB].state == 1){
	      //LATEST
	      response.result = "Board "+board+" already configured!";
              //response.result.push("Board "+board+" already configured!");
	      
	      logger.info("--> ADDING board: board already configured!");
	      
            } else {
	      
	      //NICOLA DEBUG
	      logger.info("ADDING board: ELSE CASE SELECTED!");
	      
            }

          
	  
	  
        } else {
	  response.result = "You need a bigger subnet!";
	  logger.warn("--> You need a bigger subnet!");
	  res.send(JSONstringify(response,null,"\t"));
        }
        
      } else {
	response.result = "That network uuid does not exist!";
	logger.warn("--> That network uuid does not exist!");
	res.send(JSONstringify(response,null,"\t"));
      }
      
    }    
    
*/    
    

}





net_utils.prototype.removeFromNetwork = function(netuid, board, res){
  
    var response = {
      message:"Removing boards from a network",
      result:"",
      log:""
    }
    
    if(netuid == undefined) {
      response.result = "You must specify the network UUID!";
      logger.warn("You must specify the network UUID!");
      
    } else {
      
      var position = findValue(networksArray, netuid, 'uuid');
      
      if(position != -1) {
	
	  var network = networksArray[position];
	  var vlanName = network.name;

          var boardInNet = findValue(network.nethosts,board,'value');
	  
          if(boardInNet != -1) {
	    
	      logger.info("REMOVING BOARD "+board+" FROM VLAN "+vlanName+"...");
	      var hostBoard = network.nethosts[boardInNet];
	      
	      var bSocatNum = findValue(socatBoards, board, "value");
	      logger.info("--> bSocatNum: " + bSocatNum)
	      var basePort = nconf.get('config:socat:server:port');
	      var socatPort = parseInt(basePort) + bSocatNum;
	    
	      var vlanID = network.vlanID;
	      var boardAddr = network.nethosts[boardInNet].addr;
	      
	    
	      //bridge vlan add dev gre-lr<port> vid <vlan>
	      var tag_bridge_iface = spawn('bridge',['vlan', 'del', 'dev', 'gre-lr'+socatPort, 'vid', vlanID]);
	      logger.info('--> NETWORK COMMAND: bridge vlan del dev gre-lr'+socatPort+ ' vid '+ vlanID);
	      
	      tag_bridge_iface.stdout.on('data', function (data) {
		logger.info('----> stdout - untag_bridge_iface: ' + data);
	      });
	      
	      tag_bridge_iface.stderr.on('data', function (data) {
		logger.info('----> stderr - untag_bridge_iface: create link: ' + data);
	      });
	      
	      tag_bridge_iface.on('close', function (code) {
		
		    //Data structures cleaning.......................
		    network.nethosts.splice(boardInNet,1);
		    
		    //socatBoards.splice(bSocatNum,1);
		    //logger.info("--> Updated socatBoards list: " + JSON.stringify(socatBoards));
		    
		    
		    session_wamp.publish(topic_command, [board, 'remove-from-network', vlanID, boardAddr, vlanName]);

		    logger.info('--> BOARD '+board+' WITH IP '+ boardAddr +' REMOVED FROM VLAN '+vlanName);
		    response.result = 'BOARD '+board+' WITH IP '+ boardAddr +' REMOVED FROM VLAN '+vlanName;
		    response.log = hostBoard;
		    res.send(JSON.stringify(response,null,"\t"));

	      });
		  
		  


	    
          } else {

	    response.result = "Board " + board + " is not connected to the specified network!";
	    
	    logger.warn("--> Board " + board + " is not connected to the specified network!");
	    res.send(JSONstringify(response,null,"\t"));
          }

        
      } else {
        //response.result.push("That network uid does not exist!");
	response.result = "That network uid does not exist!";
	logger.warn("--> That network uid does not exist!");
	res.send(JSONstringify(response,null,"\t"));
      }
      
    }
    
    
    
}




net_utils.prototype.updataBoard = function(netuid, board, value, res){
    var response = {
      message:"Updating board",
      result:[]
    }
    if(netuid == undefined) {
      response.result.push("You must specify the network uid");
    } else {
      var position = findValue(networksArray,netuid,'uuid');
      if(position != -1) {
        var network = networksArray[position];
        var boardInNet = findValue(network.nethosts,board,'value');
        if(boardInNet != -1) {
          var hostBoard = network.nethosts[boardInNet];
          var firstI = ip.toLong(network.netaddr);
          var lastI = firstI + network.netsize;
          var reqIp = ip.toLong(value);
          if(reqIp > firstI && reqIp <= lastI) {//if req IP in range
            var reqGreNum = reqIp - (firstI+1); //firstI is the network address, so the first available is firstI+1
            if(findValue(network.nethosts,reqGreNum,'key') == -1) { //if that key is free
              hostBoard.key = reqGreNum;
              session_wamp.publish(topic_command,[board,'update-board',value+"/"+network.netmask,hostBoard.device,hostBoard.addr+"/"+network.netmask,network.netbc]);
              hostBoard.addr = value;
              response.result.push(hostBoard);
            }
            else {
              response.result.push("The requested ip is not available");
            }
          } else {
            response.result.push("The requested ip is not in the network range");
          }
        } else {
            response.result.push("Board " + board + " is not connected to the specified network");
        }
      } else {
        response.result.push("That network uid does not exist");
      }
    }
    res.send(JSON.stringify(response,null,"\t"));
}



net_utils.prototype.showBoards = function(netuid, res){
  
    logger.info("Showing boards in a network");
    var response = {
      message:"Showing boards in a network",
      result:""
    }

    if(netuid == undefined) {
      
      response.result.push("You must specify the network uuid");
      logger.warn("You must specify the network uuid");
      
    } else {
      
      var position = findValue(networksArray, netuid, 'uuid');
      
      if(position != -1) {
	
        var network = networksArray[position];
        response.result=network.nethosts;
	logger.info("SHOW BOARDS IN THE NETWORK: "+netuid + "- network.nethosts: " + JSON.stringify(network.nethosts));
	
      } else if(position == 0){
	
	logger.info("SHOW BOARDS IN THE NETWORK: EMPTY!");
	
      }else {
        response.result="That network uuid does not exist";
	logger.warn("That network uuid does not exist");
      }
      
    }

    res.send(JSON.stringify(response,null,"\t"));
    
    
    
}



/*
function createEstablishTunnels(session, topic_command, elem){
  
    
    var d = Q.defer();
    
    var basePort = nconf.get('config:socat:server:port');
    var socatPort = parseInt(basePort) + elem.bSocatNum;
    
    //INPUT: args[0]: boardID args[1]:'add-to-network' args[2]:vlanID - args[3]:boardVlanIP - args[4]:vlanMask
    session.publish(topic_command, [elem.board, 'add-to-network', elem.vlanID, elem.greIP, elem.greMask]);

    //bridge vlan add dev gre-lr<port> vid <vlan>
    var tag_bridge_iface = spawn('bridge',['vlan', 'add', 'dev', 'gre-lr'+socatPort, 'vid', elem.vlanID]);
    logger.info('--> NETWORK COMMAND: bridge vlan add dev gre-lr'+socatPort+ 'vid '+elem.vlanID);
    
    tag_bridge_iface.stdout.on('data', function (data) {
      logger.info('----> stdout - tag_bridge_iface: ' + data);
    });
    
    tag_bridge_iface.stderr.on('data', function (data) {
      logger.info('----> stderr - tag_bridge_iface: create link: ' + data);
    });
    
    tag_bridge_iface.on('close', function (code) {
      
	    d.resolve('OK-TUNNEL');
	    logger.info('--> VLAN CREATED!');

    });
      
      
  return d.promise;   
  
}
*/




// myArray is the array being searched
// value is the value we want to find
// property is the name of the field in which to search
function findValue(myArray, value, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
       if (myArray[i][property] === value) {
          return i;
       }
    }
    return -1;
}

function findFirstFreeKey(myArray){
    var found = -1, len = myArray.length;
    for(var i = 0; i < len; i++){
       found = findValue(myArray,i,'key');
       if(found == -1) {
          return i;
       }
    }
    return len;
}

net_utils.prototype.findFirstFreeKey = function(myArray){
    var found = -1, len = myArray.length;
    for(var i = 0; i < len; i++){
       found = findValue(myArray,i,'key');
       if(found == -1) {
          return i;
       }
    }
    return len;
}


process.on('SIGINT', function(){
	for(var i = 0; i < networksArray.length; i++) {
		spawn('ip',['link','set','br'+networksArray[i].uuid.substring(0, 6),'down']);
		spawn('brctl',['delbr','br'+networksArray[i].uuid.substring(0, 6)]);
	}
	for(i = 0; i < greDevices.length; i++) {
		spawn('ip',['link','del',greDevices[i]]);
	}
	process.exit();
});                                                                              

process.on('SIGTERM', function(){                                                        
	for(var i = 0; i < networksArray.length; i++) {
		spawn('ip',['link','set','br'+networksArray[i].uuid.substring(0, 6),'down']);
		spawn('brctl',['delbr','br'+networksArray[i].uuid.substring(0, 6)]);
	}
	for(i = 0; i < greDevices.length; i++) {
		spawn('ip',['link','del',greDevices[i]]);
	}
	process.exit();
});

module.exports = net_utils;