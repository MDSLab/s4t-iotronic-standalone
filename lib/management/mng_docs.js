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

//service logging configuration: "docs"
var logger = log4js.getLogger('docs');
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
    var swaggerUi = require('swagger-ui-express');

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

    // serve swagger
    rest.get('/v1/api-docs/swagger.json', function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });


    //swagger-ui-express VERSION
    var showExplorer = false;
    var customCss = '#header { display: none }';
    //rest.use('/v1/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, showExplorer, customCss));
    rest.use('/v1/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition, showExplorer, options, customCss));


    /*
    // swagger-ui dist VERSION
    
    rest.get('/v1/api-docs', function(req, res) {
        res.sendFile("/opt/stack4things/iotronic-standalone/dist/index.html");
    });

    rest.get('/v1/api-docs/swagger-ui.css', function(req, res) {
        res.sendFile("/opt/stack4things/iotronic-standalone/dist/swagger-ui.css");
    });
    rest.get('/v1/api-docs/swagger-ui-bundle.js', function(req, res) {
        res.sendFile("/opt/stack4things/iotronic-standalone/dist/swagger-ui-bundle.js");
    });
    rest.get('/v1/api-docs/swagger-ui-standalone-preset.js', function(req, res) {
        res.sendFile("/opt/stack4things/iotronic-standalone/dist/swagger-ui-standalone-preset.js");
    });
    */

    logger.info("[API-DOCS] - Documentation available at http://"+IPLocal+":8888/v1/api-docs/");


    
};







module.exports.genApiDocs = genApiDocumentation;