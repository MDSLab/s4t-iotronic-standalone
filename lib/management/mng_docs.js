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
    
    logger.info("[API-DOCS] - Starting doc generation...");

    var swaggerJSDoc = require('swagger-jsdoc');

    // swagger definition
    var swaggerDefinition = {
        info: {
            title: 'IoTronic API',
            version: '2.0.0',
            description: 'IoTronic-standalone API by Stack4Things.'
        },
        host: IPLocal+':8888',
        basePath: '/',
        licence:{
            name: 'Apache v2',
            url: 'https://www.apache.org/licenses/LICENSE-2.0'
        },
        //schemes:["http"],
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
    
    // initialize swagger-jsdoc
    var swaggerSpec = swaggerJSDoc(options);

    exposeApiDocumentation(rest, swaggerSpec)

    
};


var exposeApiDocumentation  = function (rest, swaggerSpec){

    logger.debug("[API-DOCS] - Exposing API documentaion...");

    // serve swagger
    rest.get('/v1/iotronic-swagger.json', function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });

    rest.get('/v1/', function (req, res) {

        res.status(200).redirect("http://" + IPLocal + ":" + server_rest_port + "/v1/iotronic-api-docs/");

    });



    //swagger-ui-express VERSION
    var swaggerUi = require('swagger-ui-express');
    var showExplorer = false;
    var customCss = '#header { display: none }';
    rest.use('/v1/iotronic-api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, showExplorer, customCss));

    /*
    // swagger-ui dist VERSION
    rest.get('/v1/iotronic-api-docs', function(req, res) {
        res.sendFile("/opt/stack4things/iotronic-standalone/docs/swagger/dist/index.html");
    });

    rest.get('/v1/iotronic-api-docs/swagger-ui.css', function(req, res) {
        res.sendFile("/opt/stack4things/iotronic-standalone/docs/swagger/dist/swagger-ui.css");
    });
    rest.get('/v1/iotronic-api-docs/swagger-ui-bundle.js', function(req, res) {
        res.sendFile("/opt/stack4things/iotronic-standalone/docs/swagger/dist/swagger-ui-bundle.js");
    });
    rest.get('/v1/iotronic-api-docs/swagger-ui-standalone-preset.js', function(req, res) {
        res.sendFile("/opt/stack4things/iotronic-standalone/docs/swagger/dist/swagger-ui-standalone-preset.js");
    });
    */

    logger.info("[API-DOCS] - Documentation available at http://"+IPLocal+":8888/v1/iotronic-api-docs");

    
};




module.exports.genApiDocs = genApiDocumentation;
module.exports.exposeApiDocs = exposeApiDocumentation;