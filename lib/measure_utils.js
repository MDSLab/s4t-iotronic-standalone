/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 2015 Francesco Longo
*/
var db_utils = require('./mysql_db_utils');
var db = new db_utils;

var nconf = require('nconf');
nconf.file ({file: process.cwd()+'/lib/settings.json'});

var commandTopic     = nconf.get('config:wamp:topic_command');
var connectionTopic  = nconf.get('config:wamp:topic_connection');

var session_wamp;

measure_utils = function(session){
  session_wamp = session;
};

measure_utils.prototype.manageMeasures = function(board, measurename, measureoperation, res){
    
    switch(measureoperation){
    
        case 'start':
            var response = {
                message : 'Start Measure',
                result: {}
            }
            
            session_wamp.call(board+'.command.rpc.measure.start', [measurename]).then(
                function(result){
                    response.result = result;
                    res.send(JSON.stringify(response));
                } , session_wamp.log);
            
            break
            
        case 'stop':
            var response = {
                message : 'Stop Measure',
                result: {}
            }
            
            session_wamp.call(board+'.command.rpc.measure.stop', [measurename]).then(
                function(result){
                    response.result = result;
                    res.send(JSON.stringify(response));
                } , session_wamp.log);
            
            break

        case 'startallmeasures':
            var response = {
                message : 'Start All Measures',
                result: {}
            }
            
            session_wamp.call(board+'.command.rpc.measure.startallmeasures', []).then(
                function(result){
                    response.result = result;
                    res.send(JSON.stringify(response));
                } , session_wamp.log);
            
            break

        case 'restartallactivemeasures':
            var response = {
                message : 'Stop All Active Measures',
                result: {}
            }
            
            session_wamp.call(board+'.command.rpc.measure.restartallactivemeasures', []).then(
                function(result){
                    response.result = result;
                    res.send(JSON.stringify(response));
                } , session_wamp.log);
            
            break
        
        case 'stopallmeasures':
            var response = {
                message : 'Stop All Measures',
                result: {}
            }
            
            session_wamp.call(board+'.command.rpc.measure.stopallmeasures', []).then(
                function(result){
                    response.result = result;
                    res.send(JSON.stringify(response));
                } , session_wamp.log);
            
            break
            
        default:
            
    }
    
}

measure_utils.prototype.createPlugin = function(pluginname, plugincategory, plugincode, res){
    
    var response = {
        message : 'Inject Plugin',
        result: {}
    }
    
    //console.log("pluginname = " + pluginname + " plugincategory = " + plugincategory + " plugincode = " + plugincode);
    
    db.insertCreatedPlugin (pluginname, plugincategory, plugincode, function(result){
        console.log("DB written successfully"); 
        response.result = result;
        res.send(JSON.stringify(response));
    });
    
}
measure_utils.prototype.createMeasure = function(measurename, readplugin, elaborateplugin, res){
    
    var response = {
        message : 'Inject Plugin',
        result: {}
    }
    
    var readpluginId;
    var elaboratepluginId;
    
    db.getPluginId(readplugin, function(data){
        readpluginId = data[0].id;
        db.getPluginId(elaborateplugin, function(data){
            elaboratepluginId = data[0].id;
            
            db.insertCreatedMeasure (measurename, readpluginId, elaboratepluginId, function(result){
                console.log("DB written successfully"); 
                response.result = result;
                res.send(JSON.stringify(response));
            });
        });
    });
}

measure_utils.prototype.injectMeasure = function(board, measurename, measurepin, measureperiod, res){
    
    var response = {
        message : 'Inject Measure',
        result: {}
    }
    
    var readPluginId;
    var elaboratePluginId;
    var readPluginName;
    var elaboratePluginName;
    var readPluginCode;
    var elaboratePluginCode;
    
    //I need to read the composition of the measure from the DB
    db.getReadPluginId(measurename, function(data){
        //DEBUG
        //console.log(data);
        readPluginId = data[0].read_plugin;
//         console.log("readPluginId = " + readPluginId);
        
        db.getReadPlugin(readPluginId, function(data){
            readPluginName = data[0].name;
            readPluginCode = data[0].code;
//             console.log("readPluginName = " + readPluginName);
//             console.log("readPluginCode = " + readPluginCode);
            
            db.getElaboratePluginId(measurename, function(data){
                //DEBUG
                //console.log(data);
                elaboratePluginId = data[0].elaborate_plugin;
//                 console.log("elaboratePluginId = " + elaboratePluginId);
                db.getElaboratePlugin(elaboratePluginId, function(data){
                    elaboratePluginName = data[0].name;
                    elaboratePluginCode = data[0].code;
//                     console.log("elaboratePluginName = " + elaboratePluginName);
//                     console.log("elaboratePluginCode = " + elaboratePluginCode);
                    
                    //Now I can call the RPC
                    
                    //console.log("Calling RPC with measure_name = " + measurename + ", pin = " + measurepin + ", period = " + measureperiod + ", read_plugin_name = " + readPluginName + ", elaborate_plugin_name = " + elaboratePluginName + ", read_plugin_code = " + readPluginCode + ", elaborate_plugin_code = " + elaboratePluginCode);
                    
                    session_wamp.call(board+'.command.rpc.injectmeasure', [measurename, measurepin, measureperiod, readPluginName, elaboratePluginName, readPluginCode, elaboratePluginCode]).then(
                        function(result){
                            response.result = result;
                            res.send(JSON.stringify(response));
                            //Now I can write to the DB that the measure has been injected
                            db.insertInjectedMeasure (board, measurename, measurepin, measureperiod, function(){
                               console.log("Measure injected successfully"); 
                            });
                        } , session_wamp.log);
                });
            });
        }); 
    });

}

module.exports = measure_utils;