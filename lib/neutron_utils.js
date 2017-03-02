/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2016, Nicola Peditto, Fabio Verboso
*/
  
var logger = log4js.getLogger('neutron');
logger.setLevel(loglevel); 


var Q = require("q");

//var _ = require('lodash');

neutron_utils = function(){
}

var neutron_client = require('pkgcloud').network.createClient({
    provider: 'openstack', // required
    username: 'neutron', // required
    password: 'neutron', // required
    authUrl: 'controller:35357', // required,
    tenantId : '962d6affcea84f29a97c4b82fbc05397', //serviceF
    region: 'RegionOne',
});

neutron_utils.prototype.getNetworks = function(callback){
  
    logger.info("[NEUTRON] - Getting data for networks");
    
    neutron_client.getNetworks(function(err, nets){
        callback(err,nets);
    }); 

}


neutron_utils.prototype.getSubNetwork = function(subnet_uuid){

	var defered = Q.defer();
  
    	logger.info("[NEUTRON] - Getting data for subnetwork "+subnet_uuid);
    
    	neutron_client.getSubnet(subnet_uuid,function(err, net){
		if(err){
           		defered.reject(err);
       		}	
       		else{
           		defered.resolve(net);
       		}
	
    	}); 
	return defered.promise;

}


neutron_utils.prototype.getSubNetwork_data = function(subnet_uuid, callback){

    logger.info("[NEUTRON] - Getting data for subnetwork "+subnet_uuid);

    neutron_client.getSubnet(subnet_uuid,function(err, net){
        callback(err,net);
    });

}


neutron_utils.prototype.getNetwork = function(net_uuid, callback){
  
    logger.info("[NEUTRON] - Getting data for network "+net_uuid);
    
    neutron_client.getNetwork(net_uuid,function(err, net){
        callback(err,net);
    }); 

}


neutron_utils.prototype.createPort = function(net_uuid, callback){
  
    logger.info("[NEUTRON] - Creating port on neutron for network "+net_uuid);
    
    var opts={
        //name: 'yunnnnnn', // optional
        //adminStateUp : true,  // optional, The administrative status of the router. Admin-only
        networkId : net_uuid,  // required, The ID of the attached network.
        //tenantId : 'tenantId'     // optional, The ID of the tenant who owns the network. Admin-only
        //macAddress: 'mac address'     // optional
        //fixedIps : ['ip address1', 'ip address 2'], // optional.
        //securityGroups : ['security group1', 'security group2'] // optional, Specify one or more security group IDs.
    }
    
    neutron_client.createPort(opts,function(err, port){
        callback(err,port);
    });   
}


neutron_utils.prototype.getPort = function(port_uuid, callback){
  
    logger.info("[NEUTRON] - getting port on neutron "+port_uuid);
    
    neutron_client.getPort(port_uuid,function(err, port){
        callback(err,port);
    });   
}



neutron_utils.prototype.destroyPort = function(port_uuid, callback){
  
    logger.info("[NEUTRON] - Destroying port on neutron "+port_uuid);
    
    neutron_client.destroyPort(port_uuid,function(err, port){
        callback(err,port);
    });  

}


module.exports = neutron_utils;
