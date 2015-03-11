/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright (c) 2014 Andrea Rocco Lotronto
*/

var networkInterfaces = require('os').networkInterfaces();

module.exports = function (interface, version) {
    var ip ;
    for (var ifName in networkInterfaces){
        if(ifName == interface){
            var ifDetails = networkInterfaces[ifName];
            for (var i = 0; ifDetails[i].family == version; i++){
                ip = ifDetails[i].address;
            }
        }
    }

    return ip;
};
