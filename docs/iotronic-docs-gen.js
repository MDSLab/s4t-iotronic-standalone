//###############################################################################
//##
//# Copyright (C) 2017 Nicola Peditto
//##
//# Licensed under the Apache License, Version 2.0 (the "License");
//# you may not use this file except in compliance with the License.
//# You may obtain a copy of the License at
//##
//# http://www.apache.org/licenses/LICENSE-2.0
//##
//# Unless required by applicable law or agreed to in writing, software
//# distributed under the License is distributed on an "AS IS" BASIS,
//# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//# See the License for the specific language governing permissions and
//# limitations under the License.
//##
//###############################################################################


var swaggerJSDoc = require('swagger-jsdoc');
var fs = require('fs');
nconf = require('nconf');

var optimist = require('optimist').usage("IoTronic API documentation generator.")
    .string("iotronic").alias('t', "iotronic").describe('t', 'IoTronic suorce code path.')
    .boolean("embedded").alias('e', "embedded").describe('e', 'true | false to spawn API webpage documentation.')
    .string("port").alias('p', "port").describe('p', '[only with --embedded=true] Listening port.')

var argv = optimist.argv;

//console.log(argv)

/**
 * @swagger
 * definitions:
 *   IoTronicResponse:
 *     properties:
 *       result:
 *         type: string
 *         description: "possible results: [ SUCCESS | ERROR | WARNING ]"
 *       message:
 *         type: object
 *         description: "API return messagge"
 */

var getIP = function (interface, version) {

    var ip = null;

    var networkInterfaces = require('os').networkInterfaces();

    for (var ifName in networkInterfaces) {
        if (ifName == interface) {
            var ifDetails = networkInterfaces[ifName];
            for (var i = 0; ifDetails[i].family == version; i++) {
                ip = ifDetails[i].address;
            }
        }
    }

    return ip;
};

var genApiDocumentation  = function (){

    var swaggerJSDoc = require('swagger-jsdoc');

    console.log("[API-DOCS] - Starting doc generation...");

    // swagger definition
    var swaggerDefinition = {
        info: {
            title: 'IoTronic API',
            version: '2.0.0',
            description: 'IoTronic-standalone API by Stack4Things.'
        },
        host: IPLocal+':8443',
        basePath: '/',
        licence:{
            name: 'Apache v2',
            url: 'https://www.apache.org/licenses/LICENSE-2.0'
        },
        //schemes:["http", "https"],
        securityDefinitions: {
            jwt: {
                type: 'apiKey',
                name: 'X-Auth-Token',
                in: 'header'
            }
        },
        security: [
            { jwt: [] }
        ]
    };

    // options for the swagger docs
    var options = {

        // import swaggerDefinitions
        swaggerDefinition: swaggerDefinition,
        // path to the API docs
        apis: [
            IOTRONIC_CODE +'docs/iotronic-docs-gen.js',
            IOTRONIC_CODE +'lib/management/mng_auth.js',
            IOTRONIC_CODE +'lib/management/mng_board.js',
            IOTRONIC_CODE +'lib/management/mng_user.js',
            IOTRONIC_CODE +'lib/management/mng_layout.js',
            IOTRONIC_CODE +'lib/management/mng_project.js',
            IOTRONIC_CODE +'lib/modules/service_manager.js',
            IOTRONIC_CODE +'lib/modules/vnet_iotronic_manager.js',
            IOTRONIC_CODE +'lib/modules/plugin_manager.js',
            IOTRONIC_CODE +'lib/modules/driver_manager.js',
            IOTRONIC_CODE +'lib/modules/gpio_manager.js',
            IOTRONIC_CODE +'lib/modules/vfs_manager.js'
        ]

    };

    // initialize swagger-jsdoc
    var swaggerSpec = swaggerJSDoc(options);

    if(embedded == true ){

        exposeApiDocumentation(swaggerSpec);

    }else{

        fs.writeFile(swaggerJSONfile, JSON.stringify(swaggerSpec), function (err) {

            if (err) {

                console.log("[API-DOCS] - Error writing iotronic-swagger.json: " + err);

            } else {

                console.log("[API-DOCS] - iotronic-swagger.json successfully created!");

                // MOD INDEX.HTML webpage
                var replace = require("replace");

                replace({
                    //regex: 'url: "http://petstore.swagger.io/v2/swagger.json"',
                    //replacement: 'url: "'+url_swagger+'",\n\tvalidatorUrl: null',
                    regex: 'url: *',
                    replacement: 'url: "'+url_swagger+'"',
                    paths: [docs_path+"/index.html"],
                    recursive: true,
                    silent: true,
                });

                console.log("[API-DOCS] - iotronic-swagger.json file available here: " +  docs_path);

                /*
                fs.readFile(docs_path+"/index.html", 'utf8', function (err,data) {

                    if (err) {
                        return console.log(err);
                    }

                    console.log("[API-DOCS] - iotronic-swagger.json file available here: " +  docs_path);

                });
                */

            }

        });

    }




};


var exposeApiDocumentation  = function (swaggerSpec){

    console.log("[API-DOCS] - Exposing API documentaion...");

    var express = require('express');
    var bodyParser = require('body-parser');

    var rest = express();

    // serve swagger
    rest.get('/v1/iotronic-swagger.json', function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
        //res.sendFile(swaggerJSONfile);
    });

    rest.get('/', function (req, res) {
        res.status(200).redirect(link_docs);
    });

    rest.get('/v1/', function (req, res) {
        res.status(200).redirect(link_docs);
    });

    // swagger-ui web-api VERSION
    rest.get('/v1/iotronic-api-docs', function(req, res) {
        res.sendFile(docs_path+"/index.html");
    });
    rest.get('/v1/iotronic-api-docs/swagger-ui.css', function(req, res) {
        res.sendFile(docs_path+"/swagger-ui.css");
    });
    rest.get('/v1/iotronic-api-docs/swagger-ui-bundle.js', function(req, res) {
        res.sendFile(docs_path+"/swagger-ui-bundle.js");
    });
    rest.get('/v1/iotronic-api-docs/swagger-ui-standalone-preset.js', function(req, res) {
        res.sendFile(docs_path+"/swagger-ui-standalone-preset.js");
    });

    // Configuring REST server
    rest.use(bodyParser.json()); // support json encoded bodies
    rest.use(bodyParser.urlencoded({extended: true})); // support encoded bodies
    rest.all('/*', function(req, res, next) {
        res.type('application/json');
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", 'GET, POST, DELETE, PATCH, PUT');
        next();
    });

    // START REST SERVER
    if (https_enable == "true"){
        //HTTPS
        var https = require('https');

        var s4t_key = fs.readFileSync(https_key, 'utf8');
        var s4t_cert = fs.readFileSync(https_cert, 'utf8');

        var credentials = {
            key: s4t_key,
            cert: s4t_cert
        };

        https.createServer(credentials, rest).listen(https_port, function(){});

    }else{

        //HTTP
        var http = require('http');
        http.createServer(rest).listen(http_port, function(){});

    }

    console.log("[API-DOCS] - " + link_docs);


};


if (argv.t != undefined && argv.e != undefined){

    IOTRONIC_CODE = argv.t;
    embedded = argv.e;
    port = argv.p;

    if(embedded == true && port == undefined){

        // Wrong options
        return console.log(optimist.help());

    }else {

        // Load settings
        try{

            IOTRONIC_CFG = process.env.IOTRONIC_HOME + "/settings.json";
            nconf.file({file: IOTRONIC_CFG});
            iface = nconf.get('config:server:interface');
            https_enable = nconf.get('config:server:https:enable');
            https_key = nconf.get('config:server:https:key');
            https_cert = nconf.get('config:server:https:cert');
            docs_path = nconf.get('config:server:docs:path');
        }
        catch (err) {
            console.log('[API-DOCS] - ' + err);
            process.exit();
        }

        IPLocal = getIP(iface, 'IPv4');
        http_port = port;
        https_port = port;

        swaggerJSONfile = docs_path + "/iotronic-swagger.json";

        if (https_enable == "true"){
            url_swagger = "https://" + IPLocal + ":" + https_port + "/v1/iotronic-swagger.json";
            link_docs = "https://" + IPLocal + ":" + https_port + "/v1/iotronic-api-docs/";
        }else{
            url_swagger = "http://" + IPLocal + ":" + http_port + "/v1/iotronic-swagger.json";
            link_docs = "http://" + IPLocal + ":" + restPort + "/v1/iotronic-api-docs/";
        }

        genApiDocumentation();

    }




} else {

    // Wrong options
    return console.log(optimist.help());

}