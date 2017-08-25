exports.main = function (arguments){

    var http = require('http');
    var requestify = require('requestify');
    var Promise = require('es6-promise').Promise;

    var LIGHTNINGROD_HOME = process.env.LIGHTNINGROD_HOME;

    var timer = arguments.timer;
    var m_authid = arguments.m_authid;
    var ckan_enabled = arguments.ckan_enabled;
    var board_pool = arguments.board_pool;

    var ckan_addr = 'smartme-data.unime.it';
    var ckan_host = 'http://'+ckan_addr;
    var pool = [];


    api = require(LIGHTNINGROD_HOME + '/modules/plugins-manager/plugin-apis');
    position = api.getPosition();
    logger = api.getLogger();

    logger.info("HOME plugin starting...");
    logger.info("Endpoints:\n" + JSON.stringify(board_pool,null,"\t"));
    logger.info("Board in the pool: " + board_pool.length);


    setInterval(function(){

        var timestamp = api.getLocalTime();
        logger.info("Hello by Home plugin at " + timestamp);

        pool = [];

        for(var board=0; board < board_pool.length; board++) {

            (function(board) {

                pool.push(new Promise(
                    function (resolve) {
                        getHomeData(board_pool[board], resolve)
                    }
                ));

                if (board == board_pool.length - 1) {

                    Promise.all(pool).then(

                        function (values) {

                            var status = {};

                            for(var key=0; key < values.length; key++) {

                                (function(key) {

                                    var leonardo = Object.keys(values[key]);
                                    //logger.info(leonardo[0]);
                                    status[leonardo[0]] = values[key][leonardo[0]];

                                    if (key == values.length - 1) {

                                        logger.info("FROM Home:\n"+ JSON.stringify(status, null, "\t"));
                                        sendData(status, verbose=false);

                                    }

                                })(key);

                            }


                        },
                        function (reason) {
                            console.log(reason);
                        }

                    );


                }

            })(board);

        }








        /*
        var async = require("async");
        var request = require("request");

        // create request objects
        var requests = [
            { url: board_pool[0].url, headers: {}, timeout: 1500 },
            { url: board_pool[1].url, headers: {}, timeout: 1500 },
            { url: board_pool[2].url, headers: {}, timeout: 1500 }
        ];
        var res = [];
        async.map(requests,
            function(obj, callback) {
                // iterator function
                request(obj, function(error, response, body) {

                    if (!error && response.statusCode == 200) {
                        // transform data here or pass it on
                        var body = JSON.parse(body);
                        //console.log("response " + JSON.stringify(response))
                        res.push(body);
                        callback(null, body);


                    } else {
                        //var res_err = {error:error}

                        for (var i=0 ; i < board_pool.length ; i++)
                        {
                            if (board_pool[i]['url'] == obj.url) {
                                var res_err = "{"+JSON.stringify(board_pool[i].name)+": {\"error\": "+JSON.stringify(error.code)+"}}"
                                res_err = JSON.parse(res_err)
                                res.push(res_err);
                                callback(error || response.statusCode);
                            }
                        }


                    }

                });
            }, function(err, results) {
                // all requests have been made
                //console.log(res);
                if (err) {
                    // handle your error
                    //console.log("ERROR --> " + err)
                    //console.log(res);

                    managePromiseResult(res)

                } else {

                    managePromiseResult(results)
                }
            }
        );

*/

    },timer);

    function managePromiseResult(res){

        var status = {};

        for(var key=0; key < res.length; key++) {

            (function(key) {

                var leonardo = Object.keys(res[key]);
                //logger.info(leonardo[0]);
                status[leonardo[0]] = res[key][leonardo[0]];

                if (key == res.length - 1) {

                    logger.info(status);
                    //sendData(status)

                }




            })(key);

        }

    };

    function getHomeData(board, callback){

        requestify.get(board.url, {timeout:1500}).then(
            function(response) {

                //console.log(response);
                var res = response.getBody();
                callback(res);

            },function (err) {

                //console.log(err);
                var res_err = "{"+JSON.stringify(board.name)+": {\"error\": "+JSON.stringify(err)+"}}";
                res_err = JSON.parse(res_err);
                callback(res_err);

            }
        );

    };

    function sendData(status, verbose){

        var timestamp = api.getLocalTime();
        var datastore_id = "55436011-c037-4dbc-9098-899b0d90215d"; //datastore house-01

        /*
        var status = {
            "leonardo-01": {
                "temperature":{
                    "t1": 30.0,
                    "t2": 30.3,
                    "t3": 30.1
                },
                "humidity":{
                    "h1": 40.0,
                    "h2": 40.2,
                    "h3": 39.9
                }
            },
            "leonardo-02": {
                "temperature":{
                    "t1": 30.0,
                    "t2": 30.3,
                    "t3": 30.1
                },
                "humidity":{
                    "h1": 40.0,
                    "h2": 40.2,
                    "h3": 39.9
                }
            },
            "leonardo-03": {
                "temperature":{
                    "t1": 30.0,
                    "t2": 30.3,
                    "t3": 30.1
                },
                "humidity":{
                    "h1": 40.0,
                    "h2": 40.2,
                    "h3": 39.9
                }
            }

        };
        */

        var record = [];

        //ckan_data='{"resource_id":"'+str(resource_id)+'", "method":"insert", "records":[{"status":"'+str(status)+'", "timestamp":"'+meter_timestamp+'"}]}'
        record.push({
            timestamp: timestamp,
            status: status
        });

        if(ckan_enabled == "true"){
            sendToCKAN(m_authid, datastore_id, record, function(payloadJSON){
                if (verbose)
                    console.log("\n\nMeasures " + JSON.stringify(status));
            });

        }else{
            if (verbose)
                console.log("\n\nMeasures:\n " + status);
        }

    }

    function sendToCKAN (m_authid, m_resourceid, record, callback){

        var payload = {
            resource_id : m_resourceid,
            method: 'insert',
            records : record
        };

        var payloadJSON = JSON.stringify(payload);

        var header = {
            'Content-Type': "application/json",
            'Authorization' : m_authid,
            'Content-Length': Buffer.byteLength(payloadJSON)
        };

        var options = {
            host: ckan_addr,
            port: 80,
            path: '/api/3/action/datastore_upsert',
            method: 'POST',
            headers: header
        };


        var req = http.request(options, function(res) {

            res.setEncoding('utf-8');

            var responseString = '';

            res.on('data', function(data) {
                console.log('SENT TO CKAN:\n' + data);
            });

            res.on('end', function() {});

        });

        req.on('error', function(e) {
            console.log('On Error:' + e);
        });

        req.write(payloadJSON);

        req.end();

        callback(payloadJSON);

    };




};


