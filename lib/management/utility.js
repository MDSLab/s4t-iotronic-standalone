//###############################################################################
//##
//# Copyright (C) 2014-2015 Andrea Rocco Lotronto Nicola Peditto, Fabio Verboso
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

//service logging configuration: "utility"   
var logger = log4js.getLogger('utility');
logger.setLevel(loglevel);


var networkInterfaces = require('os').networkInterfaces();

var spawn = require('child_process').spawn;

var ps = require('ps-node');

//var Q = require("q");


// Function to execute a command 
var execute = function (command, label) {

    cmd = command.split(' ');
    logger.debug(label + ' COMMAND: ' + command);
    var result = spawn(cmd[0], cmd.slice(1));

    result.stdout.on('data', function (data) {
        logger.debug(label + ' stdout: ' + data);
    });

    result.stderr.on('data', function (data) {
        if (command.indexOf('socat') > -1)
            logger.info(label + ' stderr: ' + data);
        else
            logger.error(label + ' stderr: ' + data);
    });

    return result;

};


//Function to get the IP associated to the NIC specified in the settings.json
var getIP = function (interface, version) {
    var ip = null;
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


// Function to get information about a running process
var checkProcessName = function (name, subcommand, callback) {

    //var d = Q.defer();

    var response = {
        message: '',
        result: ''
    };

    var alive = false;

    ps.lookup(
        {
            command: name,
            psargs: 'ux'
        }, 
        function(err, resultList ) {
            
            if (err) {
                throw new Error( err );
            }


            for(var key=0; key < resultList.length; key++) {

                (function(key) {

                    /*
                    console.log('PID: %s, COMMAND: %s, ARGUMENTS: %s', resultList[key].pid, resultList[key].command, resultList[key].arguments);
                    console.log(resultList[key].arguments[0])
                    console.log(resultList[key].arguments[0].indexOf(subcommand))
                    */

                    if ( resultList[key].arguments[0].indexOf(subcommand) > -1) {

                        alive = true;

                    }

                    if (key == resultList.length -1){
                        if(alive){
                            response.message = {command: subcommand, log: subcommand + " is ALIVE"};
                            response.result = "SUCCESS";
                            callback(response);
                        }else{
                            response.message = {command: subcommand, log: subcommand + " is DEAD"};
                            response.result = "ERROR";
                            callback(response);
                        }
                        
                    }

                })(key);

            }

             /*
            resultList.forEach(function( process ){

                if( process ) {

                    console.log('PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments);
                    console.log(process.arguments[0])
                    console.log(process.arguments[0].indexOf(subcommand));

                    if ( process.arguments[0].indexOf(subcommand) > -1) {
    
                        response.message = "WSTUN is ALIVE";
                        response.result = "SUCCESS";

                        callback(response);



                        
                    }else{
                        response.message = "WSTUN is DEAD";
                        response.result = "ERROR";
                        callback(response);
                    }

                }
            });*/


        });


    //return d.promise;
};

// Function to send email
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var sendEmail = function (smtpConfig, email, subject, message) {

    var transporter = nodemailer.createTransport(smtpTransport(smtpConfig));

    var mailOptions = {
        from: smtpConfig['auth'].user, // sender address
        to: email, // list of receivers
        subject: subject, // Subject line
        text:  message //, // plaintext body
        // html: '<b>Hello world ✔</b>' // You can choose to send an HTML body instead
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            logger.error(error);

        } else {
            logger.debug('[NOTIFY] --> Email sent at '+email+': ' + info.response);
            
        }
    });
    
};

var getLocalTime = function (){

    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(Date.now() - tzoffset)).toISOString();

    return localISOTime

};


module.exports.getLocalTime = getLocalTime;
module.exports.sendEmail = sendEmail;
module.exports.execute = execute;
module.exports.getIP = getIP;
module.exports.checkProcessName = checkProcessName;
