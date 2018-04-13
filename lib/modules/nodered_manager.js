//############################################################################################
//##
//# Copyright (C) 2018 Nicola Peditto
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
//############################################################################################


var logger = log4js.getLogger('nodered_utils');
logger.setLevel(loglevel);

var fs = require('fs');

var db_utils = require('./../management/mng_db');
var db = new db_utils;
var board_utility = require('./../management/mng_board');

var session_wamp;

var NODERED_STORE = process.env.IOTRONIC_HOME + '/flows/';

nodered_utils = function (session, rest) {

    session_wamp = session;


    rest.get('/v1/nodered/flows', function (req, res) {
        
        logger.info("[API] - Flows list - " + Object.keys( req.route.methods ) + " - " + req.route.path + " - " + req.IotronicUser);

        var response = {
            message: '',
            result: ''
        };

        db.getPluginList(function (data) {
            if(data.result=="ERROR"){
                response.message = data.message;
                response.result = "ERROR";
                logger.error("[PLUGIN] --> " + JSON.stringify(response.message));
                res.status(500).send(response);

            }else{
                response.message = data.message;
                response.result = "SUCCESS";
                res.status(200).send(response);

            }
        });


    });

};


module.exports = nodered_utils;
