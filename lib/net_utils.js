
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
    
    
    
}

/*
 * FUNZIONE MAI ANALIZZATA RISALE ALLAVERSIONE DEL NETWORK DI ARTHUR**************
 * 
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

*/




function destroyVLAN(net_uuid, res, response) {


	db.destroyVLAN(net_uuid, function(db_response){   


	      logger.info("--> Destroying VLAN response: "+ JSON.stringify(db_response));
	      
	      if(db_response.result == "SUCCESS"){

		  response.result="NETWORK " + net_uuid + " DESTROIED!";
		  res.send(JSON.stringify(response,null,"\t"));
		  logger.info("NETWORK " + net_uuid + " DESTROIED!");
	    
		  
	      }else{
		
		  logger.info("--> ERROR Destroying VLAN: "+ JSON.stringify(db_response.message));
		  response.result=db_response.message;
		  res.send(JSON.stringify(response,null,"\t"));
		
	      }
	      
	});  
  

}


net_utils.prototype.destroyNetwork = function(net_uuid, res){
  
    logger.info("Destroying VLAN: "+net_uuid);
   
    var response = {
      message:"Destroying network",
      result:""
    }
    
    if(net_uuid == undefined) {
      
      response.message = "Please specify a network UUID!";
      
    } else {
      
      
      
      
      
      
      db.showBoards(net_uuid, function(boardsList){   

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
	    logger.info("--> Boards in this network: "+ boardsNumber);
	    
	    if(boardsNumber != 0){
	      
		//logger.info("--> SHOW BOARDS response: "+ JSON.stringify(boardsList));

	    
		for(var i = 0; i < boardsNumber; i++) {
	  
		  (function(i) {
		      
			
			//logger.info("----> VLAN "+boardsList.message[i].BOARD_ID+" - "+ boardsList.message[i].vlan_IP+" - "+ boardsList.message[i].vlan_ID+" - "+ boardsList.message[i].vlan_NAME );
			

			//UNTAG
			//bridge vlan del dev gre-lr<port> vid <vlan>
			var untag_bridge_iface = spawn('bridge',['vlan', 'del', 'dev', 'gre-lr'+boardsList.message[i].socat_PORT, 'vid', boardsList.message[i].vlan_ID]);
			logger.info('--> NETWORK COMMAND: bridge vlan del dev gre-lr'+boardsList.message[i].socat_PORT+ ' vid '+boardsList.message[i].vlan_ID);
			
			untag_bridge_iface.stdout.on('data', function (data) {
			  logger.info('----> stdout - untag_bridge_iface: ' + data);
			});
			
			untag_bridge_iface.stderr.on('data', function (data) {
			  logger.info('----> stderr - untag_bridge_iface: ' + data);
			});
			
			untag_bridge_iface.on('close', function (code) {
			  
			      logger.info('--> BOARD '+boardsList.message[i].BOARD_ID+' REMOVED FROM VLAN '+ boardsList.message[i].vlan_NAME +' WITH IP '+ boardsList.message[i].vlan_IP);
			      
			      
			      session_wamp.publish(topic_command, [boardsList.message[i].BOARD_ID, 'remove-from-network', boardsList.message[i].vlan_ID, boardsList.message[i].vlan_NAME]);
			      

			});

			
			if( i == (boardsNumber - 1) ){
			  
			    destroyVLAN(net_uuid, res, response);

			}

		  })(i); 

		}
		
		
		
		
	    }else{
	      
		logger.info("--> NO BOARDS IN THIS NETWORK!");
		destroyVLAN(net_uuid, res, response);
	      
	    }
	    
      });
      
      
      
      
      


      
      
      
    }
    
    
}



function createEstablishTunnels(elem, res, response) {

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
	      
	      
	      db.insertVLANConnection(elem.greIP, elem.net_uuid, elem.board, function(db_result){
		
		  logger.info("VLAN CONNECTION ON "+elem.board+" SUCCESSFULLY ESTABLISHED!");
	    
		  //LATEST
		  response.log=elem;
		  response.result = "VLAN CONNECTION ON "+elem.board+" SUCCESSFULLY ESTABLISHED!";
		  res.send(JSON.stringify(response,null,"\t"));

	      
	      });
	      

	});
	
	
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
			  
			  db.getSocatConn(board, function(result){
				
				var socatID = result[0].id;
				var socatPort = result[0].port;
				logger.info("--> socatPort: " + socatPort);
				logger.info("--> socatID: " + socatID)
				
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
					    socatID: socatID,
					    socatPort: socatPort,
					    greIP: hostAddress,
					    greMask: network[0].vlan_mask,
					    vlanID: network[0].id,
					    vlan_name: network[0].vlan_name,
					    net_uuid: network[0].net_uuid
					}
					  
					createEstablishTunnels(elem, res, response);
					
					
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
					      socatID: socatID,
					      socatPort: socatPort,
					      greIP: hostAddress,
					      greMask: network[0].vlan_mask,
					      vlanID: network[0].id,
					      vlan_name: network[0].vlan_name,
					      net_uuid: network[0].net_uuid
					  }
					  
					  createEstablishTunnels(elem, res, response);

					
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

    
    
    
    
    

}





net_utils.prototype.removeFromNetwork = function(net_uuid, board, res){
  
    var response = {
      message:"Removing boards from a network",
      result:"",
      log:""
    }
    
    if(net_uuid == undefined) {
      response.result = "You must specify the network UUID!";
      logger.warn("You must specify the network UUID!");
      
    } else {
      
      

	  
	  db.checkBoardIntoVLAN(board, net_uuid, function(response){   
		    
		logger.info("checkBoardIntoVLAN response: "+ JSON.stringify(response));
		logger.info("--> checkBoardIntoVLAN: " + response.message[0].found);
		    
		//check if the board is in that VLAN
		if(response.message[0].found == 1) { 
		  
		  
		      db.getVlan(net_uuid, function(network){
	
			    //NETWORK SELECTED: [{"id":1,"vlan_name":"netX","vlan_ip":"192.168.1.0","vlan_mask":"24","net_uuid":"6c5bbb63-2e01-4ad5-b594-e860d3f0ef22"}]
			    logger.info("NETWORK SELECTED: "+ JSON.stringify(network));
			    
			    var vlanID = network[0].id;
			    var vlanName = network[0].vlan_name;
			    
			    
			    db.getSocatConn(board, function(result){
		
				  //var socatID = result[0].id;
				  var socatPort = result[0].port;
				  logger.info("--> socatPort: " + socatPort);
				  //logger.info("--> socatID: " + socatID)
				  
				  
				  //bridge vlan del dev gre-lr<port> vid <vlan>
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
				    
					db.removeBoardFromVlan(board, net_uuid, function(result){
					  
					      session_wamp.publish(topic_command, [board, 'remove-from-network', vlanID, vlanName]);

					      logger.info('--> BOARD '+board+' REMOVED FROM VLAN '+vlanName);
					      response.result = 'BOARD '+board+ ' REMOVED FROM VLAN '+vlanName;
					      response.log = result;
					      res.send(JSON.stringify(response,null,"\t"));
					  
					});
					
					
					
			

				  });		
				  
				  
			    });
				  
				  
		    
		      });
		  
		  
		  
		} else {

		      response.result = "Board " + board + " is not connected to the specified network!";
		      
		      logger.warn("--> Board " + board + " is not connected to the specified network!");
		      res.send(JSONstringify(response,null,"\t"));
		}
		
		
	  });
	
      
    }
	  
	  
    
}



/*
 * FUNZIONE MAI ANALIZZATA RISALE ALLAVERSIONE DEL NETWORK DI ARTHUR**************
 * 
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



*/


net_utils.prototype.showBoards = function(net_uuid, res){
  
    logger.info("Showing boards in the network: "+net_uuid);
    
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
      message:"Showing boards in a network",
      result:"",
      log:""
    }
    

    if(net_uuid == undefined) {
      
      response.result.push("You must specify the network uuid");
      logger.warn("You must specify the network uuid");
      
    } else {
      
      
      
	  
      db.showBoards(net_uuid, function(db_response){   

	    
	    if(db_response.message.length != 0){
	      
		logger.info("--> SHOW BOARDS response: "+ JSON.stringify(db_response));
		response.result=db_response.message;
		res.send(JSON.stringify(response,null,"\t"));
		
	    }else{
	      
		logger.info("--> NO BOARDS IN THIS NETWORK!");
		response.result="NO BOARDS IN THIS NETWORK!";
		res.send(JSON.stringify(response,null,"\t"));
	      
	    }
	    
      });
      
      
      
    }


    
}







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