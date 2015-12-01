/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Francesco Longo, Nicola Peditto
*/

//service logging configuration: "plugin_utils"   
//var logger = log4js.getLogger('plugin_utils');


var db_utils = require('./mysql_db_utils');
var db = new db_utils;

var session_wamp;

plugin_utils = function(session){
  session_wamp = session;
};



plugin_utils.prototype.managePlugins = function(board, pluginname, pluginjson, pluginoperation, res){
    
    switch(pluginoperation){
    
        case 'run':
	  
            var response = {
                message : 'Run Plugin',
                result: {}
            }
            
            if(pluginjson === ""){
	      console.log("WARNING - RUNNER PLUGIN \""+pluginname+"\" has not parameters!");
	    }
	    else{
		console.log("RUNNER PLUGIN \""+pluginname+"\" CALLED with these parameters:\n "+ pluginjson);
		
		//I need to read the category of the plugin from the DB
		db.getPluginCategory(pluginname, function(data){
		    
		    var plugincategory = data[0].category;
		    console.log("RUNNER PLUGIN CATEGORY: "+ plugincategory);
		    
		    if (plugincategory === "async"){
		    
			session_wamp.call(board+'.command.rpc.plugin.run', [pluginname, pluginjson]).then(
			    function(result){
				response.result = result;
				res.send(JSON.stringify(response));
				console.log("RUN RESULT for \""+ pluginname +"\": " + result);
			    } , session_wamp.log);

		      
		    } else{
			result="Plugin category not supported!";
			response.result = result;
			res.send(JSON.stringify(response));
			console.log("RUN RESULT for \""+ pluginname +"\": " + result);    
		    }
		    
		});
	    
	    }
	    
            break


	    
	    
        case 'call':
	  
            var response = {
                message : 'Call Plugin',
                result: {}
            }
            
            if(pluginjson === ""){
	      console.log("WARNING - CALL PLUGIN \""+pluginname+"\" has not parameters!");
	    }
	    else{
		  console.log("CALL PLUGIN \""+pluginname+"\" CALLED with these parameters:\n "+ pluginjson);
		  
		  
		  //I need to read the category of the plugin from the DB
		  db.getPluginCategory(pluginname, function(data){
		    
		      var plugincategory = data[0].category;  
		      console.log("CALL PLUGIN CATEGORY: "+ plugincategory);
		      
		      if (plugincategory === "sync"){
			
			  session_wamp.call(board+'.command.rpc.plugin.call', [pluginname, pluginjson], {}, {receive_progress: true}).then(
			    
			      function(result){
				  response.result = result;
				  res.send(JSON.stringify(response));
				  console.log("COMMAND \""+ pluginname +"\" RESPONSE: " + JSON.stringify(result));
			      },
			      function (error) {
				  console.log("COMMAND \""+ pluginname +"\" ERROR: "+ JSON.stringify(error));
			      },
			      function (progress) {
				  console.log("COMMAND \""+ pluginname +"\" PROGRESS: "+ JSON.stringify(progress));
			      } //, session_wamp.log
													    
			    
			  );
			
		      } else{
			  result="Command category not supported!";
			  response.result = result;
			  res.send(JSON.stringify(response));
			  console.log("RUN RESULT for \""+ pluginname +"\": " + result);
		      }
		  });
		  
		  
	    }
	    
	    break
	    
	    
	    
        case 'kill':
            var response = {
                message : 'Kill Plugin',
                result: {}
            }
            
            session_wamp.call(board+'.command.rpc.plugin.kill', [pluginname]).then(
                function(result){
                    response.result = result;
                    res.send(JSON.stringify(response));
		    console.log("KILL RESULT for \""+ pluginname +"\": " + result);
                } , session_wamp.log);
            
            break
            
        default:
            
    }
    
}

plugin_utils.prototype.createPlugin = function(pluginname, plugincategory, pluginjsonschema, plugincode, res){
    
    var fs = require('fs');
    
    var response = {
        message : 'Create Plugin',
        result: {}
    }
    
    console.log("pluginname = " + pluginname + " plugincategory = " + plugincategory + " pluginjsonschema = " + pluginjsonschema + " plugincode = " + plugincode);
    
    var fileNamePlugin = './plugins/' + pluginname + '.js';
    fs.writeFile(fileNamePlugin, plugincode, function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("Plugin " + fileNamePlugin + " injected successfully");
        }
    });
    
    fileNameSchema = './schemas/' + pluginname + '.json';
    fs.writeFile(fileNameSchema, pluginjsonschema, function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("Schema " + fileNameSchema + " injected successfully");
        }
    });
    
    db.insertCreatedPlugin (pluginname, plugincategory, fileNameSchema, fileNamePlugin, function(result){
        console.log("DB written successfully"); 
        response.result = result;
        res.send(JSON.stringify(response));
    });
    
}


        
plugin_utils.prototype.injectPlugin = function(board, pluginname, autostart, res){
    
    var response = {
        message : 'Inject Plugin',
        result: {}
    }
    
    var pluginId;
    var pluginName;
    var pluginFileName;
    
    //I need to read the name of the plugin from the DB
    db.getPluginId(pluginname, function(data){
        
	if (data[0] === undefined){
	  response.result = "Plugin does not exist!";
	  res.send(JSON.stringify(response));
	  console.log("Plugin does not exist!");
	}
	else{
	      pluginId = data[0].id;
        
	      //Then I can read the path of the code of the plugin from the DB
	      db.getPlugin(pluginId, function(data){
		  
		  pluginName = data[0].name;
		  pluginFileName = data[0].code;
		  
		  var fs = require('fs');
		  
		  fs.readFile(pluginFileName, 'utf8', function(err, data) {
		      if(err) {
			  console.log(err);
		      } else {
			  console.log("Plugin " + pluginFileName + " read successfully");
			  
			  var pluginCode = data;
			  
			  console.log('Calling injectplugin with name = ' + pluginName +" autostart = "+ autostart +" code = " + pluginCode);
			  
			  //Now I can perform the RPC call
			  session_wamp.call(board+'.command.rpc.injectplugin', [pluginName, pluginCode, autostart]).then(
			      function(result){
				  response.result = result;
				  res.send(JSON.stringify(response));
				  //Now I can write to the DB that the plugin has been injected
				  db.insertInjectedPlugin (board, pluginName, function(out){
				      //console.log("Plugin injected successfully"); 
				      //console.log(out);
				      console.log("INJECT RESULT of "+ pluginName +": "+result + " ("+out+")");
				  });
				  
			      } , session_wamp.log);
		      }
		  });
	      });
	
	}
    });
}


module.exports = plugin_utils;
