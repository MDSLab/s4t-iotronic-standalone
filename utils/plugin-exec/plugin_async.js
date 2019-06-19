var fs = require("fs");
const {PythonShell} = require('python-shell');
var net = require('net');

var LIGHTNINGROD_HOME = process.env.LIGHTNINGROD_HOME;

var PLUGINS_STORE = process.env.IOTRONIC_HOME + '/plugins/';

console.log("LR Home:",LIGHTNINGROD_HOME)

const args = process.argv;
//console.log(args);

// Inputs
plugin_source = args[1]
plugin_name = args[2]
version = args[3]
plugin_json = args[4]


console.log(plugin_source,plugin_name,version,plugin_json);


var pyshell = null;
var s_server = null;
var socketPath = '/tmp/plugin-'+plugin_name;

var response = {
    message: '',
    result: ''
};


// Callback for socket
var handler = function(socket){

    // Listen for data from client
    socket.on('data',function(bytes){

        var data = bytes.toString(); 			// Decode byte string
        var data_parsed = JSON.parse(data); 	// Parse JSON response

        if(data_parsed.result == "ERROR"){

            response.result = "ERROR";
            response.message = data_parsed.payload;
            console.log('[PLUGIN] - Error in '+plugin_name + ':\n'+JSON.stringify(response.message, null, "\t"));

        }else{

            response.result = "SUCCESS";
            response.message = data_parsed.payload;
            console.log('[PLUGIN] - '+plugin_name + ': '+ JSON.stringify(response.message, null, "\t"));

        }

    });

    // On client close
    socket.on('end', function() {
        console.log('[PLUGIN-SOCKET] - Socket disconnected');
        s_server.close(function(){
            console.log('[PLUGIN-SOCKET] - Server socket closed');
        });

    });


};



// Remove an existing socket
fs.unlink(socketPath, function(){
    // Create the server, give it our callback handler and listen at the path

    s_server = net.createServer(handler).listen(socketPath, function(){
        console.log('[PLUGIN-SOCKET] - Socket in listening...');
        console.log('[PLUGIN-SOCKET] --> socket: '+socketPath);
    })

});


var options = {
    mode: 'text',
    pythonPath: '/usr/bin/python3',
    pythonOptions: ['-u'],
    //scriptPath: __dirname,
    args: [plugin_name, version, plugin_json]
};


//var pyshell = new PythonShell('./python/async-wrapper.py', options);
pyshell = new PythonShell('/usr/lib/node_modules/@mdslab/iotronic-lightning-rod/modules/plugins-manager/python/async-wrapper.py', options);

PY_PID = pyshell.childProcess.pid;
console.log("[PLUGIN-SHELL] - PID wrapper: "+ PY_PID);



pyshell.on('message', function (message) {
    // received a message sent from the Python script (a simple "print" statement)
    console.log("[PLUGIN-WRAPPER] - PYTHON: "+message);
});

// end the input stream and allow the process to exit
pyshell.end(function (err, code, signal) {

    if (err){

        //console.log("Plugin '"+plugin_name+"' error logs: \n" + JSON.stringify(err, null, "\t"));

        response.result = "ERROR";
        response.message = "Error plugin execution: please check plugin logs: \n" + err.traceback;

        console.log(response)


    }
    else{

        console.log('[PLUGIN-SHELL] - Python shell of "'+plugin_name+'" plugin terminated: {signal: '+ signal+', code: '+code+'}');

        if(signal == null && code == 0){

            console.log("[PLUGIN-SHELL] --> unexpected '"+plugin_name+"' plugin termination!");
            
        }else{
            console.log("[PLUGIN-SHELL] --> Python plugin '"+plugin_name+"' terminated!")
        }

    }



});


