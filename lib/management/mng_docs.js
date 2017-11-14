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

var logger = log4js.getLogger('mng_docs');
logger.setLevel(loglevel);

var fs = require('fs');

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

var genApiDocumentation  = function (rest){

    var swaggerJSONfile = docs_path + "/iotronic-swagger.json";
    
    logger.info("[API-DOCS] - Starting doc generation...");

    var swaggerJSDoc = require('swagger-jsdoc');

    if (https_enable == "true"){
        server_rest_port = https_port;
    }else{
        server_rest_port = restPort;
    }

    // swagger definition
    var swaggerDefinition = {
        info: {
            title: 'IoTronic API',
            version: '2.0.0',
            description: 'IoTronic-standalone API by Stack4Things.'
        },
        host: IPLocal+':'+server_rest_port,
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
            __dirname+'/mng_docs.js',
            __dirname+'/mng_auth.js',
            __dirname+'/mng_board.js',
            __dirname+'/mng_user.js',
            __dirname+'/mng_layout.js',
            __dirname+'/mng_project.js',
            './lib/modules/service_manager.js',
            './lib/modules/vnet_iotronic_manager.js',
            './lib/modules/plugin_manager.js',
            './lib/modules/driver_manager.js',
            './lib/modules/gpio_manager.js',
            './lib/modules/vfs_manager.js'
        ]

    };

    // initialize iotronic-swagger.jsdoc
    var swaggerSpec = swaggerJSDoc(options);

    // create iotronic-swagger.jsdoc
    fs.writeFile(swaggerJSONfile, JSON.stringify(swaggerSpec), function (err) {

        if (err) {

            logger.error("[API-DOCS] - Error writing iotronic-swagger.json: " + err);

        } else {

            logger.info("[API-DOCS] - iotronic-swagger.json successfully created!");

            fs.readFile(docs_path+"/index.html", 'utf8', function (err,data) {
                
                if (err) {
                    return console.log(err);
                }

                var replace = require("replace");

                if (https_enable == "true"){
                    url_swagger = "https://" + IPLocal + ":" + https_port + "/v1/iotronic-swagger.json";
                }else{
                    url_swagger = "http://" + IPLocal + ":" + restPort + "/v1/iotronic-swagger.json";
                }

                replace({
                    regex: 'url: "http://petstore.swagger.io/v2/swagger.json"',
                    replacement: 'url: "'+url_swagger+'",\n\tvalidatorUrl: null',
                    paths: [docs_path+"/index.html"],
                    recursive: true,
                    silent: true,
                });

            });

        }
    });
    
    // expose via REST the API documentation
    exposeApiDocumentation(rest);
    
};


var exposeApiDocumentation  = function (rest){

    logger.info("[API-DOCS] - Exposing API documentaion...");

    if (https_enable == "true"){
        link_docs = "https://" + IPLocal + ":" + https_port + "/v1/iotronic-api-docs/";
    }else{
        link_docs = "http://" + IPLocal + ":" + restPort + "/v1/iotronic-api-docs/";
    }

    var swaggerJSONfile = docs_path + "/iotronic-swagger.json";

    // serve swagger
    rest.get('/v1/iotronic-swagger.json', function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        //res.send(swaggerSpec);
        res.sendFile(swaggerJSONfile);
    });
    

    rest.get('/v1/', function (req, res) {

        if (https_enable == "true"){
            res.status(200).redirect(link_docs);
        }else{
            res.status(200).redirect(link_docs);
        }

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

    logger.info("[API-DOCS] --> Documentation available at " + link_docs);


};




module.exports.genApiDocs = genApiDocumentation;
module.exports.exposeApiDocs = exposeApiDocumentation;