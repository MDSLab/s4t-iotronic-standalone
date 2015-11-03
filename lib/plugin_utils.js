/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Francesco Longo, Nicola Peditto
*/

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
            
            session_wamp.call(board+'.command.rpc.plugin.run', [pluginname, pluginjson]).then(
                function(result){
                    response.result = result;
                    res.send(JSON.stringify(response));
                } , session_wamp.log);
            
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
                            db.insertInjectedPlugin (board, pluginName, function(){
                                console.log("Plugin injected successfully"); 
                            });
                        } , session_wamp.log);
                }
            });
        });
    });
}

module.exports = plugin_utils;
