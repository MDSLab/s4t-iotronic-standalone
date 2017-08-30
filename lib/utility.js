/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2014 2015 Andrea Rocco Lotronto, Nicola Peditto, Fabio Verboso
 */

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
                            response.message = {command: "wstt", log:"WSTT is ALIVE"};
                            response.result = "SUCCESS";
                            callback(response);
                        }else{
                            response.message = {command: "wstt", log:"WSTT is DEAD"};
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
    
                        response.message = "WSTT is ALIVE";
                        response.result = "SUCCESS";

                        callback(response);



                        
                    }else{
                        response.message = "WSTT is DEAD";
                        response.result = "ERROR";
                        callback(response);
                    }

                }
            });*/


        });


    //return d.promise;
};



var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
// Function to send email
var sendEmail = function (smtpConfig, email, label, board) {

    //var d = Q.defer();

    /*
    var smtpConfig = {
        host: 'out.unime.it',
        port: 465,
        secure: true,
        auth: {
            user: '***@unime.it',
            pass: '***'
        }
    };
    */

    var transporter = nodemailer.createTransport(smtpTransport(smtpConfig));

    var subject = 'ALERT by SMARTME BOX '+ label;
    var message = "Your SmartME box '"+label+"' ("+board+") is offline!";

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
            logger.debug('[SYSTEM] --> Message sent: ' + info.response);


        }
    });

    //return d.promise;

};

module.exports.sendEmail = sendEmail;
module.exports.execute = execute;
module.exports.getIP = getIP;
module.exports.checkProcessName = checkProcessName;
