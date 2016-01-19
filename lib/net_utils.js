
/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Andrea Rocco Lotronto
*/

//service logging configuration: "net_utils"   
var logger = log4js.getLogger('net_utils');

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
	
	for(var i = 0; i < networksArray.length; i++) {
	  
	  var firstI = ip.toLong(networksArray[i].netaddr);
	  var lastI = firstI + networksArray[i].netsize;
	  
	  if((first >= firstI && first<=lastI) || (last >= firstI && last<=lastI)) {
	    overlap = true;
	    break; //no need to look further so leave the loop
	  }
	  
	}
	
	if(!overlap) {
	  
	  var newNW = {
	    key:findFirstFreeKey(networksArray),
	    uuid:"",
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
	
      }
      
      
      
      
}


net_utils.prototype.showNetwork = function(res){
  
    var response = {
      message:"list of networks",
      result:[]
    }

    for(var i = 0; i < networksArray.length; i++) {
      
      var temporary = {
        uuid:networksArray[i]['uuid'],
        name:networksArray[i]['name'],
        address:networksArray[i]['netaddr'],
        size:networksArray[i]['netsize'],
        hosts:networksArray[i]['nethosts']
      }

      response.result.push(temporary);
    }
    
    res.send(JSON.stringify(response,null,"\t"));
    logger.info("SHOW NETWORKS CALLED.");
    
    
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
    
    
}




net_utils.prototype.addToNetwork = function(netuid, board, value, res){
  
    logger.info("ADDING board "+ board + " to network " + netuid + " ...");
    
    var response = {
      message:"Adding boards to a network",
      //result:[],
      result:"",
      log:""
    }
    
    if(netuid == undefined){
      
      response.result = "You must specify the network UUID!";
      //response.result.push("You must specify the network uuid!");
      
      logger.warn("You must specify the network UUID!");
      
    } else {
      
      var position = findValue(networksArray, netuid, 'uuid');
     
      if(position != -1){
	
        var network = networksArray[position];
        var temp = [];
	
        for(var j = 0; j < network['nethosts'].length; j++){
          temp.push(network['nethosts'][j]['value']);
        }

        //DEBUG
        //logger.info("ADD TO NET boardlist.concat(temp).unique()::"+boardlist.concat(temp).unique());
        //logger.info("ADD TO NET boardlist.concat(temp).unique().length::"+boardlist.concat(temp).unique().length);
        //logger.info("ADD TO NET network.netsize::"+network.netsize);
        //if(network.netsize >= boardlist.concat(temp).unique().length){
        if(network.netsize >= 1){
	  
          //var establishTunnels = [];
          var establishTunnels;
	  
          spawn('ip',['link','set','br'+network.uuid.substring(0, 6),'down']);
	  logger.info("--> NETWORK COMMAND: ip link set br"+network.uuid.substring(0, 6)+" down");

          //DEBUG
          //logger.info("ADD TO NET boardlist.length::"+boardlist.length);
          //for(var i = 0; i < boardlist.length; i++) {
	  
	  
	    logger.info("--> Finding bSocatNum index in: " + JSON.stringify(socatBoards));
	    
	    //NICOLA
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
	      
            }
            
            var hostAddress = ip.fromLong(ip.toLong(network.netaddr) + bGreNum + 1);
            var socatNetAddr = ip.toLong(socatNetwork) + (bSocatNum*4);
            var socatHostAddr = ip.fromLong(socatNetAddr+2);
            var socatServAddr = ip.fromLong(socatNetAddr+1);
	    
            var elem = {
              //board: boardlist[i],
              board: board,
              socatIP: socatHostAddr,
              socatPort: parseInt(basePort)+bSocatNum,
              socatServ: socatServAddr,
              greIP: hostAddress,
              //greTap: network.uuid.substring(0, 6)+'-'+boardlist[i].substring(0,6),
              greTap: network.uuid.substring(0, 6)+'-'+board.substring(0,6),
              greBC: network.netbc,
              greMask: network.netmask,
              netuid: network.uuid
            }
            
            //DEBUG 
            //logger.info("NETWORK PARAMETERS:\n"+JSON.stringify(elem,null,"\t"));
            
            //var positionB = findValue(network.nethosts,boardlist[i],'value');
            var positionB = findValue(network.nethosts,board,'value');
	    
            if(positionB == -1) { //if the board isn't configured
	      
              //establishTunnels[i] = createEstablishTunnels(session,topic_command, elem);
              //establishTunnels[i]();
	      
	      //NICOLA
              //establishTunnels = createEstablishTunnels(session_wamp, topic_command, elem);
              //establishTunnels()
	      createEstablishTunnels(session_wamp, topic_command, elem, network).then(
		
		function(resTunnel){
  
		  if (resTunnel==="OK-TUNNEL"){
		   
			//response.result.push(elem);
			response.log=elem;
			
			//commentato da NICOLA
			/*
			var map = {
			  key: bSocatNum,
			  value: elem.board
			};
			socatBoards.push(map);
			*/
			
			var map2 = {
			  key: bGreNum,
			  socatMap: bSocatNum,
			  value: elem.board,
			  addr: elem.greIP,
			  device: elem.greTap,
			  state: 1
			}
			network.nethosts.push(map2);
			
			spawn('ip',['link','set','br'+network.uuid.substring(0, 6),'up']);
			logger.info("--> NETWORK COMMAND: ip link set br"+network.uuid.substring(0, 6)+" up");
			
			logger.info("GRE TUNNEL ON "+elem.board+" SUCCESSFULLY ESTABLISHED!");
			
			//LATEST
			response.result = "GRE TUNNEL ON "+elem.board+" SUCCESSFULLY ESTABLISHED!";
			//response.result.push("GRE TUNNEL ON "+elem.board+" SUCCESSFULLY ESTABLISHED!");
			res.send(JSON.stringify(response,null,"\t"));
			
			
		  } else{
		    //LATEST
		    response.result = "PROBLEMS DURING GRE TUNNEL CREATION!";
		    //response.result.push("PROBLEMS DURING GRE TUNNEL CREATION!");
		    logger.info("--> PROBLEMS DURING GRE TUNNEL CREATION!");
		  }
		  
		  
	      } );
	      
              
	      
            } else if(network.nethosts[positionB].state == 1){
	      //LATEST
	      response.result = "Board "+board+" already configured!";
              //response.result.push("Board "+board+" already configured!");
	      
	      logger.info("--> ADDING board: board already configured!");
	      
            } else {
	      
	      //NICOLA DEBUG
	      logger.info("ADDING board: ELSE CASE SELECTED!");
	      
              bSocatNum = network.nethosts[positionB].socatMap;
	      
              if(reqIp == -1){
                bGreNum = network.nethosts[positionB].key;
              }
              
              socatNetAddr = ip.toLong(socatNetwork) + (bSocatNum*4);
              elem.socatIP = ip.fromLong(socatNetAddr+2);
              elem.socatPort = parseInt(basePort)+bSocatNum;
              elem.socatServ = ip.fromLong(socatNetAddr+1);
              elem.greIP = ip.fromLong(ip.toLong(network.netaddr) + bGreNum + 1);

              if(reqIp != -1) {
                network.nethosts[positionB].addr = elem.greIP;
              }

              network.nethosts[positionB].state = 1;
              //establishTunnels[i] = createEstablishTunnels(session,topic_command, elem);
              //establishTunnels[i]();
              establishTunnels = createEstablishTunnels(session_wamp,topic_command, elem, network);
              establishTunnels();
              response.result.push(elem);
	      
	      
            }
          //}
          
	  
	  
        } else {
	  response.result = "You need a bigger subnet!";
          //response.result.push("You need a bigger subnet!");
	  logger.warn("--> You need a bigger subnet!");
	  res.send(JSONstringify(response,null,"\t"));
        }
        
      } else {
	response.result = "That network uuid does not exist!";
        //response.result.push("That network uuid does not exist!");
	logger.warn("--> That network uuid does not exist!");
	res.send(JSONstringify(response,null,"\t"));
      }
      
    }
    //LATEST
    //res.send(JSONstringify(response,null,"\t"));.

}





net_utils.prototype.removeFromNetwork = function(netuid, board, res){
  
    var response = {
      message:"Removing boards from a network",
      //result:[]
      result:"",
      log:""
    }
    
    if(netuid == undefined) {
      response.result = "You must specify the network UUID!";
      //response.result.push("You must specify the network uuid!");
      logger.warn("You must specify the network UUID!");
      
    } else {
      
      var position = findValue(networksArray,netuid,'uuid');
      
      if(position != -1) {
	
        var network = networksArray[position];
        //for(var i = 0; i < boardlist.length; i++) {
          //var boardInNet = findValue(network.nethosts,boardlist[i],'value');
          var boardInNet = findValue(network.nethosts,board,'value');
	  
          if(boardInNet != -1) {
	    
	    logger.info("REMOVING BOARD "+board+" FROM NETWORK "+netuid+"...");
            var hostBoard = network.nethosts[boardInNet];
            //var greDev = network.uuid.substring(0, 6)+'-'+boardlist[i].substring(0,6);
            var greDev = network.uuid.substring(0, 6)+'-'+board.substring(0,6);

	    
	      var testing = spawn('ip',['link','del', greDev]);
	      logger.info('--> NETWORK COMMAND: ip link del ' +greDev);
	      
              testing.stdout.on('data', function (data) {
                logger.info('----> stdout - IP-LINK-DEL: ' + data);
              });
	      
              testing.stderr.on('data', function (data) {
                logger.info('----> stderr - IP-LINK-DEL: ' + data);
              });
	      
              testing.on('close', function (code) {
		
		  //response.result.push(hostBoard);
		  response.result=hostBoard;
		  
		  var boardSocatNum = findValue(socatBoards,hostBoard.socatMap,'key');
		  //session.publish(topic_command, [boardlist[i],'remove-from-network',greDev,hostBoard.socatMap]);
		  session_wamp.publish(topic_command, [board,'remove-from-network',greDev,hostBoard.socatMap]);
		  //socatBoards.splice(boardSocatNum,1);
		  network.nethosts.splice(boardInNet,1);
		  
		  logger.info("--> BOARD "+board+" REMOVED FROM "+network.uuid+ " NETWORK!");
		  
		  //LATEST
		  response.result = "BOARD "+board+" REMOVED FROM "+network.uuid+ " NETWORK!";
		  //response.result.push("BOARD "+board+" REMOVED FROM "+network.uuid+ " NETWORK!");
		  res.send(JSON.stringify(response,null,"\t"));
		  
	    
	      });
	    

	    
          } else {
            //response.result.push("Board " + boardlist[i] + " is not connected to the specified network");
	    
            //response.result.push("Board " + board + " is not connected to the specified network!");
	    response.result = "Board " + board + " is not connected to the specified network!";
	    
	    logger.warn("--> Board " + board + " is not connected to the specified network!");
	    res.send(JSONstringify(response,null,"\t"));
          }
        //}
        
      } else {
        //response.result.push("That network uid does not exist!");
	response.result = "That network uid does not exist!";
	logger.warn("--> That network uid does not exist!");
	res.send(JSONstringify(response,null,"\t"));
      }
      
    }
    
    //res.send(JSON.stringify(response,null,"\t"));
    
    
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




function createEstablishTunnels(session, topic_command, elem, network){
  
  //return function() {
    
    var d = Q.defer();
    
    //DEBUG 
    //logger.info("NETWORK PARAMETERS:\n\targ0 - board: "+ elem.board +"\n\targ1 - cmd: add-to-network" +"\n\targ2 - socatIP: "+ elem.socatIP +"\n\targ3 - socatServ: "+ elem.socatServ +"\n\targ4 - socatPort: "+ elem.socatPort +"\n\targ5 - greIP: "+ elem.greIP +"\n\targ6 - greBC: "+ elem.greBC +"\n\targ7 - greMask: "+ elem.greMask +"\n\targ8 - greTap: "+ elem.greTap +"\n\targ9 - socatPort-parseInt(basePort): "+ (elem.socatPort-parseInt(basePort)));
    
    
    session.publish(topic_command, [elem.board,'add-to-network',elem.socatIP,elem.socatServ,elem.socatPort,elem.greIP,elem.greBC,elem.greMask,elem.greTap,(elem.socatPort-parseInt(basePort))]);

              logger.info('--> SOCAT - creating gre tunnels: ' + JSON.stringify(elem));

              var testing = spawn('ip',['link','add',elem.greTap,'type','gretap','remote',elem.socatIP,'local',elem.socatServ]);
	      logger.info('--> NETWORK COMMAND: ip link add ' +elem.greTap+ ' type gretap remote '+elem.socatIP+' local '+elem.socatServ);
	      
              testing.stdout.on('data', function (data) {
                logger.info('----> IP-LINK-ADD: create link: ' + data);
              });
	      
              testing.stderr.on('data', function (data) {
                logger.info('----> IP-LINK-ADD: create link: ' + data);
              });
	      
              testing.on('close', function (code) {
		
                //logger.info('--> IP-LINK-ADD: create link child process exited with code ' + code);
		
                if(code == 0) {
		  
                  greDevices.push(elem.greTap);
		  
                  var testing2 = spawn('ip',['link','set',elem.greTap,'up']);
		  logger.info('--> NETWORK COMMAND: ip link set '+elem.greTap+' up');
		  
                  testing2.stdout.on('data', function (data) {
                    logger.info('----> IP-LINK-SET up: ' + data);
                  });
                  testing2.stderr.on('data', function (data) {
                    logger.info('----> IP-LINK-SET up: ' + data);
                  });
                  testing2.on('close', function (code) {
		    
                    //logger.info('--> IP-LINK-SET up - child process exited with code ' + code);
		    
                    var testing3 = spawn('brctl',['addif','br'+elem.greTap.substring(0, 6),elem.greTap]);
		    logger.info('--> NETWORK COMMAND: brctl addif br'+elem.greTap.substring(0, 6) + " " + elem.greTap);
		    
                    testing3.stdout.on('data', function (data) {
                      logger.info('----> ADD-TO-BRIDGE: ' + data);
                    });
                    testing3.stderr.on('data', function (data) {
                      logger.info('----> ADD-TO-BRIDGE: ' + data);
                    });
                    testing3.on('close', function (code) {

                      //logger.info('--> ADD-TO-BRIDGE - child process exited with code ' + code);
		      
		      d.resolve('OK-TUNNEL');
	  
                    });
		    
		    
                  });
		  
                }
                
              });

  
  return d.promise;   
  
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