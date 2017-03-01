/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2015 2016 Nicola Peditto
*/


//service logging configuration: "ckan_db_utils"   
var logger = log4js.getLogger('ckan_db_utils');
logger.setLevel(loglevel);

var requestify = require('requestify');
var Q = require("q");

var db_utils = require('./mysql_db_utils');
var db = new db_utils;

var ckan_addr = '';
var ckan_host = 'http://' + ckan_addr;
var ckan_datastore_search = "http://" + ckan_addr + "/api/3/action/datastore_search";
ckan_utils = function () {

    var ckan_host = 'http://' + ckan_addr;
    var ckan_datastore_search = "http://" + ckan_addr + "/api/3/action/datastore_search";


};

var spawn = require('child_process').spawn;

ckan_utils.prototype.CkanBoardRegistration = function (board, board_label, latitude, longitude, altitude, callback) {

    var response = {
        message: {},
        result: ''
    };

    logger.info("CKAN board registration...");

    var ckan = spawn('python', ['./lib/ckan_register_board.py', board, board_label, altitude, latitude, longitude]);

    ckan.stdout.on('data', function (data) {
        response.result = "SUCCESS";
        response.message = 'stdout: ' + data;
        logger.info(response);

    });
    ckan.stderr.on('data', function (data) {
        response.result = "ERROR";
        response.message = 'stderr: ' + data;
        logger.error(response);

    });
    ckan.on('close', function (code) {
        response.result = "SUCCESS";
        response.message = "CKAN registration process successfully completed [Exit code " + code + "]";
        logger.info(response.message);
        callback(response);
    });

};


ckan_utils.prototype.getCKANdataset = function (id) {

    var d = Q.defer();

    logger.info(ckan_host + '/api/rest/dataset/' + id);
    requestify.get(ckan_host + '/api/rest/dataset/' + id).then(function (response) {

        var dataCKAN = response.getBody();

        d.resolve(dataCKAN);

    });

    return d.promise;
};


ckan_utils.prototype.queryCKANdatastore = function (restParams) {

    var d1 = Q.defer();

    //console.log("--> REST CALL "+ ckan_datastore_search + " " + JSON.stringify(restParams));
    requestify.get(ckan_datastore_search, {params: restParams}).then(function (response) {

            // Get the response body (JSON parsed)
            dataCKAN = response.getBody()
            //console.log(JSON.stringify(dataCKAN));
            //console.log("--> REST RESPONSE METRICS: "+JSON.stringify(dataCKAN.result.records));

            d1.resolve(dataCKAN.result.records);
        }
    );
    return d1.promise;
};


module.exports = ckan_utils;
