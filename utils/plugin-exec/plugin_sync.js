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
    socket.on('data', function(bytes){

        var data = bytes.toString(); 			// Decode byte string
        var data_parsed = JSON.parse(data); 	// Parse JSON response

        if(data_parsed.result == "ERROR"){

            response.result = "ERROR";
            response.message = "Error in plugin execution: " + data_parsed.payload;
            console.log('[PLUGIN] - Error in '+plugin_name + ':\n'+JSON.stringify(response.message, null, "\t"));

        }else{
            
            try{

                response.result = "SUCCESS";
                response.message = data_parsed.payload;
                console.log('[PLUGIN] - '+plugin_name + ': '+ JSON.stringify(response.message, null, "\t"));

            }
            catch(err){
                response.result = "ERROR";
                response.message = JSON.stringify(err);
                console.log('Error parsing '+plugin_name + ' plugin response: '+ response.message);
            }


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

// Remove an existing plugin socket
fs.unlink(socketPath, function(){

        var plugin_folder = PLUGINS_STORE + plugin_name;
        var schema_outputFilename = plugin_folder + "/" + plugin_name + '.json';

        // Create the server, give it our callback handler and listen at the path
        s_server = net.createServer(handler).listen(socketPath, function() {
            console.log('[PLUGIN-SOCKET] - Socket in listening...');
            console.log('[PLUGIN-SOCKET] --> socket: '+socketPath);


            // after socket creation we will start the plugin wrapper
            var options = {
                mode: 'text',
                pythonPath: '/usr/bin/python3',
                pythonOptions: ['-u'],
                //scriptPath: __dirname,
                args: [plugin_name, version, plugin_json]
            };

            let pyshell = new PythonShell('/usr/lib/node_modules/@mdslab/iotronic-lightning-rod/modules/plugins-manager/python/sync-wrapper.py', options);
            // it will create a python instance like this:
            // python -u /opt/stack4things/lightning-rod/modules/plugins-manager/python/sync-wrapper.py py_sync {"name":"S4T"}

            console.log("[PLUGIN-SHELL] - PID wrapper: "+pyshell.childProcess.pid);

            // listening 'print' output
            pyshell.on('message', function (message) {
                // received a message sent from the Python script (a simple "print" statement)
                console.log("[PLUGIN-WRAPPER] - PYTHON: "+message);
            });


            // end the input stream and allow the process to exit
            pyshell.end(function (err, code, signal) {

                if (err){

                    response.result = "ERROR";
                    response.message = err;
                    console.log(response);

                }else{
                    console.log('[PLUGIN-SHELL] - Python shell terminated: {signal: '+ signal+', code: '+code+'}');
                }

            });



        })


    }

);