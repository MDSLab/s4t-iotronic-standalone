//###############################################################################
//##
//# Copyright (C) 2014-2015 Andrea Rocco Lotronto 
//# Copyright (C) 2015-2017 Nicola Peditto, Fabio Verboso
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

var mysql = require('mysql');
var ip = require('ip');
var util = require('util');
var md5 = require('md5');

var logger = log4js.getLogger('mng_db');
logger.setLevel(loglevel);

var IotronicHome = process.env.IOTRONIC_HOME;

var nconf = require('nconf');
nconf.file({file: IotronicHome + '/settings.json'});

db_host = nconf.get('config:server:db:host');
db_port = nconf.get('config:server:db:port');
db_user = nconf.get('config:server:db:user');
db_pass = nconf.get('config:server:db:password');
db_name = nconf.get('config:server:db:db_name');

if(db_host == "env" && db_port == "env" && db_user == "env" && db_pass == "env" && db_name == "env"){

    logger.debug("[SYSTEM] - DB (env) configurations.");

    db_host = process.env.DB_HOST;
    db_port = process.env.DB_PORT;
    db_user = process.env.DB_USER;
    db_pass = process.env.DB_PW;
    db_name = process.env.DB_NAME;

    //logger.debug(process.env.DB_HOST, process.env.DB_PORT, process.env.DB_USER, process.env.DB_PW, process.env.DB_NAME);

}else{

    logger.debug("[SYSTEM] - DB (file) configurations.");

}




var connection;

db_utils = function () {

    /*
     var db_host = nconf.get('config:server:db:host');
     var db_port = nconf.get('config:server:db:port');
     var db_user = nconf.get('config:server:db:user');
     var db_pass = nconf.get('config:server:db:password');
     var db_name = nconf.get('config:server:db:db_name');
     */

};

function conn() {
    
    var connection = mysql.createConnection({
        host: db_host,
        port: db_port,
        user: db_user,
        password: db_pass,
        database: db_name
    });
    
    return connection
}

function disconn(connection) {
    connection.end();
}








//////////////////////////////////////
//         BOARD MANAGEMENT         //
//////////////////////////////////////

//Function to get boards list
db_utils.prototype.getBoardsList = function (project, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };


    if(project == "all" || project == undefined){
        var query_list = "SELECT * FROM layouts, boards b LEFT JOIN coordinates c ON c.board_id = b.board_id WHERE b.layout_id=layouts.id_layout AND timestamp = (SELECT MAX(timestamp) FROM coordinates c2 WHERE c2.board_id = b.board_id)";
    }
    else
        var query_list = "SELECT * FROM layouts, boards b LEFT JOIN coordinates c ON c.board_id = b.board_id WHERE b.layout_id=layouts.id_layout AND b.projects_id = " + mysql.escape(project) + " && timestamp = (SELECT MAX(timestamp) FROM coordinates c2 WHERE c2.board_id = b.board_id)";

    
    connection.query(query_list, function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        }
        else{

            if (result.length != 0){

                for (var i = 0; i < result.length; i++) {

                    (function (i) {

                        try{
                            if(result[i]["extra"] != "" && result[i]["extra"] != undefined)
                                result[i]["extra"] = JSON.parse(result[i]["extra"]);
                        }
                        catch (err) {
                            response.message = "Error parsing board list: " + err;
                            response.result = "ERROR";
                            logger.error("[PLUGIN] --> " + response.message);
                        }

                        if (i == result.length - 1){
                            response.message = result;
                            response.result = "SUCCESS";
                            disconn(connection);
                            callback(response);
                        }

                    })(i);
                }

            }else{
                response.message = result;
                response.result = "SUCCESS";
                disconn(connection);
                callback(response);
            }


        }

    });

};

//2.3.3->2.4.0
//Function to get the sensors list
db_utils.prototype.getSensorStatus = function (callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM sensors", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });

};


//2.3.3
//Function to get board info
db_utils.prototype.BoardInfo = function (board, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };
    
    connection.query("SELECT " +
        "boards.board_id, " +
        "boards.label, " +
        "boards.status, " +
        "boards.conn_time, " +
        "boards.state, " +
        "boards.latest_update, " +
        "boards.description, " +
        "boards.net_enabled, " +
        "boards.mobile, " +
        "boards.notify, " +
        "boards.notify_rate, " +
        "boards.notify_retry, " +
        "boards.extra, " +
        "boards.pubkey, " +
        "boards.lr_version, " +
        "boards.position_refresh_time, " +
        "users.username as user, " +
        "projects.name as project, " +
        "layouts.id_layout as layout_id, " +
        "layouts.model, " +
        "layouts.manufacturer, " +
        "layouts.image, " +
        "layouts.distro, " +
        "layouts.layout " +
        "FROM boards, coordinates, layouts, users, projects " +
        "WHERE boards.board_id = " + mysql.escape(board) +
        " AND coordinates.board_id = boards.board_id AND boards.layout_id = layouts.id_layout" +
        " AND boards.projects_id = projects.uuid AND boards.users_id = users.uuid", function (err_info, result_info) {

        if (err_info != null) {

            response.result = "ERROR";
            response.message = err_info;
            logger.error(response.result + " - " + err_info);
            disconn(connection);
            callback(response);

        }
        else {

            connection.query("SELECT altitude, longitude, latitude, timestamp FROM coordinates WHERE coordinates.board_id = " + mysql.escape(board) + " ORDER BY timestamp DESC LIMIT 1", function (err_coord, coord) {

                if (err_coord != null) {
                    response.result = "ERROR";
                    response.message = err_coord;
                    logger.error(response.result + " - " + err_coord);
                    disconn(connection);
                    callback(response);
                }
                else {

                    result_info[0]["coordinates"] = coord[0];
                    result_info[0]["extra"] = JSON.parse(result_info[0]["extra"]);

                    connection.query("SELECT plugins.name, plugins.version, plugins.id, plugins.category, plugins_injected.state, plugins_injected.parameters FROM plugins_injected, plugins WHERE plugins_injected.board_id = " + mysql.escape(board) + " AND plugins_injected.plugin_id = plugins.id", function (err_plugin, result_plugin) {

                        if (err_plugin != null) {
                            response.result = "ERROR";
                            response.message = err_plugin;
                            logger.error(response.result + " - " + err_plugin);
                            disconn(connection);
                            callback(response);
                        }
                        else {

                            connection.query("SELECT drivers.name, drivers_injected.state, drivers_injected.latest_change FROM drivers_injected, drivers WHERE drivers.id = drivers_injected.driver_id AND drivers_injected.board_id = " + mysql.escape(board), function (err_driver, result_driver) {

                                if (err_driver != null) {
                                    response.result = "ERROR";
                                    response.message = err_driver;
                                    logger.error(response.result + " - " + err_driver);
                                    disconn(connection);
                                    callback(response);

                                } else {


                                    connection.query("SELECT connectivity.conn_id, connectivity_types.c_type, connectivity.main, connectivity.metadata FROM connectivity, connectivity_types WHERE connectivity_types.id=connectivity.conn_id AND connectivity.board_id=" + mysql.escape(board), function (err_cty, result_cty) {
                                        if (err_cty != null) {
                                            response.result = "ERROR";
                                            response.message = err_cty;
                                            logger.error(response.result + " - " + err_cty);
                                            disconn(connection);
                                            callback(response);
                                        }
                                        else {


                                            connection.query("SELECT vlan_name, ip_vlan, net_uuid FROM vlans, vlans_connection, socat_connections WHERE id_socat_connection = (select id from socat_connections where id_board=" + mysql.escape(board) + ") AND vlans_connection.id_socat_connection = socat_connections.id AND vlans_connection.id_vlan = vlans.id", function (err_vnet, result_vnet) {
                                                if (err_vnet != null) {
                                                    response.result = "ERROR";
                                                    response.message = err_vnet;
                                                    logger.error(response.result + " - " + err_vnet);
                                                    disconn(connection);
                                                    callback(response);
                                                }
                                                else {

                                                    connection.query("SELECT services.name, active_services.public_port, services.port as local_port, services.protocol FROM services, active_services WHERE services.id = active_services.service_id AND active_services.board_id = " + mysql.escape(board), function (err_service, result_service) {

                                                        if (err_service != null) {
                                                            response.result = "ERROR";
                                                            response.message = err_service;
                                                            logger.error(response.result + " - " + err_service);
                                                            disconn(connection);
                                                            callback(response);
                                                        } else {

                                                            var layout = {
                                                                info: result_info[0],
                                                                plugins: result_plugin,
                                                                drivers: result_driver,
                                                                services: result_service,
                                                                vnets: result_vnet,
                                                                connectivity: result_cty
                                                            };

                                                            response.result = "SUCCESS";
                                                            response.message = layout;
                                                            disconn(connection);
                                                            callback(response);

                                                        }

                                                    });


                                                }

                                            });




                                        }

                                    });


                                }


                            });

                        }

                    });
                }

            });

        }


    });

};





//2.3.3
//Function to register a new board
db_utils.prototype.regBoard = function (board, board_label, latitude, longitude, altitude, net_enabled, layout_id, description, connectivity, extra, project_id, user_id, mobile,
                                        position_refr_time, notify, notify_rate, notify_retry, b_pub_key, b_pw, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };
    
    //check if the board already exists
    //logger.debug("[SYSTEM] --> Board ID check...");

    connection.query("SELECT board_id FROM boards WHERE board_id =  " + mysql.escape(board) , function (err, result) {

        if (result.length == 0) {
            
            /* Begin transaction */
            connection.beginTransaction(function(err) {

                if (err) {

                    response.result = "ERROR";
                    response.message = err;
                    logger.error("[SYSTEM] --> Registration Board transaction error: " + err);
                    callback(response);

                } else {

                    if (net_enabled == "true")
                        net_enabled = 1;
                    else
                        net_enabled = 0;

                    if (mobile == "true")
                        mobile = 1;
                    else
                        mobile = 0;

                    if (notify == "true")
                        notify = 1;
                    else
                        notify = 0;

                    connection.query("INSERT INTO boards (board_id, label, session_id, status, net_enabled, layout_id, description, extra, projects_id, users_id, mobile, position_refresh_time, " +
                        "notify, notify_rate, notify_retry, state, pubkey, password) " +
                        "VALUES (" + mysql.escape(board) + ", " +
                        mysql.escape(board_label) + "," +
                        "'null'," +
                        "'D', " +
                        mysql.escape(net_enabled) + "," +
                        mysql.escape(layout_id) + "," +
                        mysql.escape(description) + "," +
                        mysql.escape(extra) + "," +
                        mysql.escape(project_id) + "," +
                        mysql.escape(user_id) + "," +
                        mysql.escape(mobile) + "," +
                        mysql.escape(position_refr_time) + "," +
                        mysql.escape(notify) + "," +
                        mysql.escape(notify_rate) + "," +
                        mysql.escape(notify_retry) + "," +
                        "'new'," +
                        mysql.escape(b_pub_key) + "," +
                        mysql.escape(b_pw) + ")"
                        , function (err, latest_result) {


                        if (err != null) {

                            connection.rollback(function() {
                                logger.error("[SYSTEM] --> Registration error in boards table: " + err);
                                response.result = "ERROR";
                                response.message = "Registration error in boards table: " + err;
                                callback(response);

                            });

                        }
                        else {


                            connection.query("INSERT INTO coordinates (board_id, altitude, longitude, latitude) VALUES (" + mysql.escape(board) + ", " + mysql.escape(altitude) + ", " +  mysql.escape(longitude) + ", " + mysql.escape(latitude) + ")" , function (err, latest_result) {

                                if (err != null) {

                                    connection.rollback(function() {
                                        logger.error("[SYSTEM] --> error in coordinates table: " + err);
                                        response.result = "ERROR";
                                        response.message = "Error in coordinates table!";
                                        callback(response);
                                    });

                                }else{

                                    try{

                                        if(connectivity == undefined || connectivity == ""){

                                            connection.commit(function (err) {

                                                if (err) {

                                                    connection.rollback(function () {
                                                        response.result = "ERROR";
                                                        response.message = err;
                                                        callback(response);
                                                    });

                                                } else {

                                                    response.result = "SUCCESS";
                                                    response.message = "Registration successfully completed!";
                                                    disconn(connection);
                                                    callback(response);

                                                }

                                            });

                                        }
                                        else{


                                            var cty = JSON.parse(connectivity);

                                            if(cty.length == 0){

                                                connection.commit(function (err) {

                                                    if (err) {

                                                        connection.rollback(function () {
                                                            response.result = "ERROR";
                                                            response.message = err;
                                                            callback(response);
                                                        });

                                                    } else {

                                                        response.result = "SUCCESS";
                                                        response.message = "Registration successfully completed!";
                                                        disconn(connection);
                                                        callback(response);

                                                    }

                                                });

                                            }
                                            else{

                                                var query = "INSERT INTO connectivity (conn_id, board_id, main, metadata) VALUES ?";
                                                var values = [];

                                                for (var i = 0; i < cty.length; i++) {

                                                    (function (i) {

                                                        console.log(board, cty[i]);

                                                        if (cty[i].main == "true" || cty[i].main == true)
                                                            cty[i].main = 1;
                                                        else
                                                            cty[i].main = 0;

                                                        var val = [ cty[i].type, board, cty[i].main, JSON.stringify(cty[i].metadata) ];
                                                        values.push(val);

                                                        if (i == cty.length - 1){

                                                            connection.query(query, [values], function (err, result) {

                                                                if (err != null) {

                                                                    connection.rollback(function() {
                                                                        logger.error("[SYSTEM] --> error in connectivity table: " + err);
                                                                        response.result = "ERROR";
                                                                        response.message = "Error in connectivity table!";
                                                                        callback(response);
                                                                    });

                                                                } else {

                                                                    connection.commit(function (err) {

                                                                        if (err) {

                                                                            connection.rollback(function () {
                                                                                response.result = "ERROR";
                                                                                response.message = err;
                                                                                callback(response);
                                                                            });

                                                                        } else {

                                                                            response.result = "SUCCESS";
                                                                            response.message = "Registration successfully completed!";
                                                                            disconn(connection);
                                                                            callback(response);

                                                                        }

                                                                    });
                                                                }

                                                            });

                                                        }


                                                    })(i);

                                                }

                                            }



                                        }




                                    }
                                    catch (err) {

                                        connection.rollback(function() {
                                            logger.error("[SYSTEM] --> error connectivity parsing: " + err);
                                            response.result = "ERROR";
                                            response.message = "Error in parsing connectivity metadata!";
                                            callback(response);
                                        });

                                    }



                                }

                            });



                        }

                    });

                }


            });
            /* End transaction */



        }
        else {
            response.result = "WARNING";
            response.message = "A board with ID '"+board+"' already exists!";
            logger.warn("[SYSTEM] ----> " + response.message);
            disconn(connection);
            callback(response);
        }

    });


};

//2.3.3
//Function to update a new board
db_utils.prototype.updateBoard = function (board, board_label, latitude, longitude, altitude, net_enabled, layout_id, description, connectivity, extra, project_id, user_id, mobile,
                                           position_refr_time, notify, notify_rate, notify_retry, state, b_pub_key, hash_b_pw, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    //check if the board exists
    //logger.debug("[SYSTEM] --> Board ID check...");

    connection.query("SELECT board_id FROM boards WHERE boards.board_id ='" + board + "'", function (err, result) {

        if (result.length != 0) {

            //logger.debug("[SYSTEM] --> Updating Iotronic DB for board " + board + "...");

            if (net_enabled == "true")
                net_enabled = 1;
            else
                net_enabled = 0;

            if (mobile == "true")
                mobile = 1;
            else
                mobile = 0;

            if (notify == "true")
                notify = 1;
            else
                notify = 0;


            /* Begin transaction */
            connection.beginTransaction(function(err) {

                if (err) {

                    response.result = "ERROR";
                    response.message = err;
                    logger.error("[SYSTEM] --> Updating transaction error: " + err);
                    callback(response);

                } else {

                    if( auth_lr_mode == "password" ){

                        if(hash_b_pw != "" && hash_b_pw != undefined){

                            logger.debug("[SYSTEM] --> updating password...");

                            var up_query = "UPDATE boards, coordinates SET " +
                                "boards.label=" + mysql.escape(board_label) + ", " +
                                "boards.layout_id=" + mysql.escape(layout_id) + ", " +
                                "boards.description=" + mysql.escape(description) + ", " +
                                "boards.extra=" + mysql.escape(extra) + ", " +
                                "boards.state=" + mysql.escape(state) + ", " +
                                "boards.projects_id=" + mysql.escape(project_id) + ", " +
                                "coordinates.altitude=" + mysql.escape(altitude) + ", " +
                                "coordinates.longitude=" + mysql.escape(longitude) + ", " +
                                "coordinates.latitude=" + mysql.escape(latitude) + ", " +
                                "boards.users_id=" + mysql.escape(user_id) + ", " +
                                "boards.mobile=" + mysql.escape(mobile) + ", " +
                                "boards.net_enabled=" + mysql.escape(net_enabled) + ", " +
                                "boards.position_refresh_time=" + mysql.escape(position_refr_time) + ", " +
                                "notify=" + mysql.escape(notify) + ", " +
                                "notify_rate=" + mysql.escape(notify_rate) + ", " +
                                "notify_retry=" + mysql.escape(notify_retry) + ", " +
                                "pubkey=" + mysql.escape(b_pub_key) + ", " +
                                "password=" + mysql.escape(hash_b_pw) + " " +
                                "WHERE boards.board_id=" + mysql.escape(board) + " AND coordinates.board_id=" + mysql.escape(board);
                        }
                        else {
                            
                            var up_query = "UPDATE boards, coordinates SET " +
                                "boards.label=" + mysql.escape(board_label) + ", " +
                                "boards.layout_id=" + mysql.escape(layout_id) + ", " +
                                "boards.description=" + mysql.escape(description) + ", " +
                                "boards.extra=" + mysql.escape(extra) + ", " +
                                "boards.state=" + mysql.escape(state) + ", " +
                                "boards.projects_id=" + mysql.escape(project_id) + ", " +
                                "coordinates.altitude=" + mysql.escape(altitude) + ", " +
                                "coordinates.longitude=" + mysql.escape(longitude) + ", " +
                                "coordinates.latitude=" + mysql.escape(latitude) + ", " +
                                "boards.users_id=" + mysql.escape(user_id) + ", " +
                                "boards.mobile=" + mysql.escape(mobile) + ", " +
                                "boards.net_enabled=" + mysql.escape(net_enabled) + ", " +
                                "boards.position_refresh_time=" + mysql.escape(position_refr_time) + ", " +
                                "notify=" + mysql.escape(notify) + ", " +
                                "notify_rate=" + mysql.escape(notify_rate) + ", " +
                                "notify_retry=" + mysql.escape(notify_retry) + ", " +
                                "pubkey=" + mysql.escape(b_pub_key) +
                                "WHERE boards.board_id=" + mysql.escape(board) + " AND coordinates.board_id=" + mysql.escape(board);
                        }

                    }
                    else if( auth_lr_mode == "certs" ){

                        if(b_pub_key != "" && b_pub_key != undefined){

                            logger.debug("[SYSTEM] --> updating public key...");

                            var up_query = "UPDATE boards, coordinates SET " +
                                "boards.label=" + mysql.escape(board_label) + ", " +
                                "boards.layout_id=" + mysql.escape(layout_id) + ", " +
                                "boards.description=" + mysql.escape(description) + ", " +
                                "boards.extra=" + mysql.escape(extra) + ", " +
                                "boards.state=" + mysql.escape(state) + ", " +
                                "boards.projects_id=" + mysql.escape(project_id) + ", " +
                                "coordinates.altitude=" + mysql.escape(altitude) + ", " +
                                "coordinates.longitude=" + mysql.escape(longitude) + ", " +
                                "coordinates.latitude=" + mysql.escape(latitude) + ", " +
                                "boards.users_id=" + mysql.escape(user_id) + ", " +
                                "boards.mobile=" + mysql.escape(mobile) + ", " +
                                "boards.net_enabled=" + mysql.escape(net_enabled) + ", " +
                                "boards.position_refresh_time=" + mysql.escape(position_refr_time) + ", " +
                                "notify=" + mysql.escape(notify) + ", " +
                                "notify_rate=" + mysql.escape(notify_rate) + ", " +
                                "notify_retry=" + mysql.escape(notify_retry) + ", " +
                                "pubkey=" + mysql.escape(b_pub_key) + ", " +
                                "password=" + mysql.escape(hash_b_pw) + " " +
                                "WHERE boards.board_id=" + mysql.escape(board) + " AND coordinates.board_id=" + mysql.escape(board);
                        }
                        else {

                            var up_query = "UPDATE boards, coordinates SET " +
                                "boards.label=" + mysql.escape(board_label) + ", " +
                                "boards.layout_id=" + mysql.escape(layout_id) + ", " +
                                "boards.description=" + mysql.escape(description) + ", " +
                                "boards.extra=" + mysql.escape(extra) + ", " +
                                "boards.state=" + mysql.escape(state) + ", " +
                                "boards.projects_id=" + mysql.escape(project_id) + ", " +
                                "coordinates.altitude=" + mysql.escape(altitude) + ", " +
                                "coordinates.longitude=" + mysql.escape(longitude) + ", " +
                                "coordinates.latitude=" + mysql.escape(latitude) + ", " +
                                "boards.users_id=" + mysql.escape(user_id) + ", " +
                                "boards.mobile=" + mysql.escape(mobile) + ", " +
                                "boards.net_enabled=" + mysql.escape(net_enabled) + ", " +
                                "boards.position_refresh_time=" + mysql.escape(position_refr_time) + ", " +
                                "notify=" + mysql.escape(notify) + ", " +
                                "notify_rate=" + mysql.escape(notify_rate) + ", " +
                                "notify_retry=" + mysql.escape(notify_retry) + ", " +
                                "password=" + mysql.escape(hash_b_pw) + " " +
                                "WHERE boards.board_id=" + mysql.escape(board) + " AND coordinates.board_id=" + mysql.escape(board);
                        }

                    }
                    else if( auth_lr_mode == "basic" ){

                        var up_query = "UPDATE boards, coordinates SET " +
                            "boards.label=" + mysql.escape(board_label) + ", " +
                            "boards.layout_id=" + mysql.escape(layout_id) + ", " +
                            "boards.description=" + mysql.escape(description) + ", " +
                            "boards.extra=" + mysql.escape(extra) + ", " +
                            "boards.state=" + mysql.escape(state) + ", " +
                            "boards.projects_id=" + mysql.escape(project_id) + ", " +
                            "coordinates.altitude=" + mysql.escape(altitude) + ", " +
                            "coordinates.longitude=" + mysql.escape(longitude) + ", " +
                            "coordinates.latitude=" + mysql.escape(latitude) + ", " +
                            "boards.users_id=" + mysql.escape(user_id) + ", " +
                            "boards.mobile=" + mysql.escape(mobile) + ", " +
                            "boards.net_enabled=" + mysql.escape(net_enabled) + ", " +
                            "boards.position_refresh_time=" + mysql.escape(position_refr_time) + ", " +
                            "notify=" + mysql.escape(notify) + ", " +
                            "notify_rate=" + mysql.escape(notify_rate) + ", " +
                            "notify_retry=" + mysql.escape(notify_retry) + ", " +
                            "pubkey=" + mysql.escape(b_pub_key) + ", " +
                            "password=" + mysql.escape(hash_b_pw) + " " +
                            "WHERE boards.board_id=" + mysql.escape(board) + " AND coordinates.board_id=" + mysql.escape(board);

                    }


                    connection.query(up_query, function (err, latest_result) {

                        if (err != null) {

                            connection.rollback(function() {

                                logger.error("[SYSTEM] --> Updating board data error: " + err);
                                response.result = "ERROR";
                                response.message = "Updating board data error!";
                                callback(response);

                            });

                        }
                        else {

                            if(connectivity == undefined || connectivity == ""){

                                connection.commit(function (err) {

                                    if (err) {

                                        connection.rollback(function () {
                                            response.result = "ERROR";
                                            response.message = err;
                                            callback(response);
                                        });

                                    } else {

                                        disconn(connection);
                                        response.result = "SUCCESS";
                                        response.message = "Board successfully updated in Iotronic!";
                                        logger.info("[SYSTEM] --> " + response.message + " (no connectivity info)");
                                        callback(response);
                                    }

                                });


                            }
                            else{

                                connection.query("DELETE FROM connectivity WHERE board_id=" + mysql.escape(board) , function (err, clean_cty_result) {

                                    if (err != null) {

                                        connection.rollback(function() {
                                            logger.error("[SYSTEM] --> error cleaning connectivity table: " + err);
                                            response.result = "ERROR";
                                            response.message = "(select) Error cleaning connectivity table!";
                                            callback(response);
                                        });

                                    }else {

                                        try{

                                            var cty = JSON.parse(connectivity);

                                            var query = "INSERT INTO connectivity (conn_id, board_id, main, metadata) VALUES ?";
                                            var values = [];

                                            for (var i = 0; i < cty.length; i++) {

                                                (function (i) {

                                                    console.log(board, cty[i]);

                                                    if (cty[i].main == "true" || cty[i].main == true)
                                                        cty[i].main = 1;
                                                    else
                                                        cty[i].main = 0;

                                                    var val = [ cty[i].type, board, cty[i].main, JSON.stringify(cty[i].metadata) ];
                                                    values.push(val);

                                                    if (i == cty.length - 1){

                                                        connection.query(query, [values], function (err, result) {

                                                            if (err != null) {

                                                                connection.rollback(function() {
                                                                    logger.error("[SYSTEM] --> error updating connectivity table: " + err);
                                                                    response.result = "ERROR";
                                                                    response.message = "Error updating connectivity table!";
                                                                    callback(response);
                                                                });

                                                            } else {

                                                                connection.commit(function (err) {

                                                                    if (err) {

                                                                        connection.rollback(function () {
                                                                            response.result = "ERROR";
                                                                            response.message = err;
                                                                            callback(response);
                                                                        });

                                                                    } else {

                                                                        disconn(connection);
                                                                        response.result = "SUCCESS";
                                                                        response.message = "Board successfully updated in Iotronic!";
                                                                        logger.info("[SYSTEM] --> " + response.message);
                                                                        callback(response);
                                                                    }

                                                                });

                                                            }

                                                        });

                                                    }


                                                })(i);

                                            }

                                        }
                                        catch (err) {

                                            connection.rollback(function() {
                                                logger.error("[SYSTEM] --> error connectivity parsing: " + err);
                                                response.result = "ERROR";
                                                response.message = "Error in parsing connectivity metadata!";
                                                callback(response);
                                            });

                                        }

                                    }



                                });

                            }





                        }

                    });

                }

            });
            /* End transaction */


        }
        else {
            disconn(connection);
            response.result = "ERROR";
            response.message = "The board '" + board + "' does not exist!";
            logger.warn("--> " + response.message);

            callback(response);
        }

    });


};




//2.3.3
//Function to unregister a board
db_utils.prototype.unRegBoard = function (board, callback) {

    var connection = conn();

    var response = {
        message: {},
        result: ''
    };

    //check if the board already exists
    //logger.debug("[SYSTEM] --> Board ID check...");

    connection.query("SELECT board_id FROM boards WHERE board_id = " + mysql.escape(board), function (err, result) {

        if (result.length != 0) {

            connection.query("DELETE FROM boards WHERE board_id=" + mysql.escape(board), function (err, result3) {

                if (err != null) {
                    //logger.error("[SYSTEM] --> Unregistration error in board_ids: " + err);
                    response.message = "Unregistration error for the board '" + board + "' in 'boards' table: " + err;
                    response.result = "ERROR";
                    disconn(connection);
                    callback(response);

                }
                else {
                    //logger.info("[SYSTEM] --> Unregistration of the board " + board + " ssuccessfully completed!");
                    response.message = "Unregistration of the board '" + board + "' successfully completed!";
                    response.result = "SUCCESS";
                    disconn(connection);
                    callback(response);
                }

            });


        }
        else {

            logger.warn("[SYSTEM] --> The board '" + board + "' does not exist!");
            response.message = "The board " + board + " does not exist!";
            response.result = "WARNING";
            disconn(connection);
            callback(response);
        }

    });


};

//Function to unregister boards of a project
db_utils.prototype.unRegProjectBoards = function (project_id, callback) {

    var connection = conn();

    var response = {
        message: {},
        result: ''
    };

    connection.query("DELETE FROM boards WHERE projects_id=" + mysql.escape(project_id) , function (err, result3) {

        if (err != null) {
            response.message = "Unregistration error in boards table: " + err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);

        }
        else {
            response.message = "Unregistration successfully completed!";
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });


};

//Function to check if a board exists in IoTronic
db_utils.prototype.checkBoard = function (board_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM boards WHERE boards.board_id=" + mysql.escape(board_id), function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn(connection);
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
    
};

//Function to check if a board is connected to Iotronic (WAMP)
db_utils.prototype.checkBoardConnected = function (board_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT status, session_id, state, label FROM boards WHERE boards.board_id =" + mysql.escape(board_id), function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn(connection);
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });

};

//Function to get the information of a board
db_utils.prototype.getBoard = function (board_id, callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };
    
    connection.query("SELECT * FROM boards WHERE boards.board_id=" + mysql.escape(board_id), function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn(connection);
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
        
    });

};

//Function to change the status of the board in DB
db_utils.prototype.changeBoardWampStatus = function (board_id, session, status, callback) {
    
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("UPDATE boards SET board_id=" + mysql.escape(board_id) + ", session_id=" + mysql.escape(session) + ", status=" + mysql.escape(status) + " WHERE board_id=" + mysql.escape(board_id), function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn(connection);
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
    
};

//Function to update the connection status, LR version and registration state of the board in DB
db_utils.prototype.changeBoardStatus = function (board_id, session, status, state, lr_version, callback) {

    var connection = conn();
    var response = {
        message: '',
        result: ''
    };

    var conn_time = new Date().toISOString().replace(/\..+/, '');
    //    var conn_time = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

    connection.query("UPDATE boards SET conn_time=" + mysql.escape(conn_time) + ", board_id=" + mysql.escape(board_id) + ", session_id=" + mysql.escape(session) + ", status=" + mysql.escape(status) + ", state=" + mysql.escape(state) + ", lr_version=" + mysql.escape(lr_version) + " WHERE board_id=" + mysql.escape(board_id), function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn(connection);
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });

};

//Function to update the LR version and registration state of the board in DB
db_utils.prototype.changeBoardState = function (board_id, state, lr_version, callback) {

    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("UPDATE boards SET state=" + mysql.escape(state) + ", lr_version=" + mysql.escape(lr_version) + " WHERE board_id=" + mysql.escape(board_id), function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn(connection);
            callback(response);
        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });

};

//Function to get the name and code of a generic driver
db_utils.prototype.getBoardPosition = function (board_id, samples, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT altitude, longitude, latitude, timestamp FROM coordinates WHERE coordinates.board_id =" + mysql.escape(board_id) + " ORDER BY timestamp DESC LIMIT " + samples, function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn(connection);
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to find board using session ID
db_utils.prototype.findBySessionId = function (session_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM boards WHERE boards.session_id = " + mysql.escape(session_id), function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn(connection);
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to add the new board position
db_utils.prototype.addBoardPosition = function (board, latitude, longitude, altitude, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("INSERT INTO coordinates (board_id, latitude, longitude, altitude) VALUES (" + mysql.escape(board) + " , " + mysql.escape(latitude) + " , " + mysql.escape(longitude) + " , " + mysql.escape(altitude) + ")", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to get the name and code of a generic driver
db_utils.prototype.getBoardPositionHistory = function (board_id, interval, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT altitude, longitude, latitude, timestamp FROM coordinates WHERE coordinates.board_id = " + mysql.escape(board_id) + " AND timestamp between (CURDATE() - INTERVAL "+interval+" ) and CURDATE()", function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn(connection);
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};








///////////////////////////////////////////
//           LAYOUTS MANAGEMENT          //
///////////////////////////////////////////
//Function to get board layouts list managed by IoTronic
db_utils.prototype.getLayoutList = function (callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM layouts", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to get the board layout details
db_utils.prototype.getLayoutById = function (layout_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM layouts WHERE id_layout = " + mysql.escape(layout_id), function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }



    });

};

//Function to create a new board layout
db_utils.prototype.createLayout = function (model, manufacturer, image, layout, distro, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("INSERT INTO layouts (model, manufacturer, image, layout, distro) VALUES (" + mysql.escape(model) + " , " + mysql.escape(manufacturer) + " , " + mysql.escape(image) + " , " + mysql.escape(layout) + " , " + mysql.escape(distro) + " )", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to delete a board layout from IoTronic
db_utils.prototype.deleteLayoutById = function (layout_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("DELETE FROM layouts WHERE id_layout=" + mysql.escape(layout_id), function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to update a board layout
db_utils.prototype.updateLayoutById = function  (layout_id, model, manufacturer, image, layout, distro, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("UPDATE layouts SET model = " + mysql.escape(model) + ", manufacturer = " + mysql.escape(manufacturer) + ", image = " + mysql.escape(image) + ", layout = "+mysql.escape(layout)+", distro ="+ mysql.escape(distro)+" WHERE id_layout=" + mysql.escape(layout_id), function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = "UPDATE error in layout table: " + err;
            logger.error(response.message);
            disconn(connection);
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }
    })
};

//Function to get the board layout details by board ID
db_utils.prototype.getLayoutByBoardId = function (board_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT layouts.id_layout, layouts.model, layouts.manufacturer, layouts.image FROM layouts, boards " +
        "WHERE boards.layout_id = layouts.id_layout AND boards.board_id =" + mysql.escape(board_id) , function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }



    });

};



///////////////////////////////////////////
//           PROJECTS MANAGEMENT         //
///////////////////////////////////////////
//Function to get IoTronic projects list
db_utils.prototype.getProjectList = function (callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM projects", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to create a new IoTronic project
db_utils.prototype.createProject = function (project_id, name, description, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("INSERT INTO projects (uuid, name, description) VALUES (" + mysql.escape(project_id) + " , " + mysql.escape(name) + " , " + mysql.escape(description) + ")", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to get the IoTronic project details
db_utils.prototype.getProject = function (project, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    
    connection.query("SELECT * FROM projects WHERE uuid = " + mysql.escape(project) + " OR name = " + mysql.escape(project), function (err, result) {
        
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }



    });

};

//Function to delete an IoTronic project
db_utils.prototype.deleteProject = function (project_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("DELETE FROM projects WHERE uuid=" + mysql.escape(project_id), function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to update an IoTronic project
db_utils.prototype.updateProject = function  (project_id, name, description, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("UPDATE projects SET name = " + mysql.escape(name) + ", description = " + mysql.escape(description) + " WHERE uuid=" + mysql.escape(project_id), function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = "UPDATE error in projects table: " + err;
            disconn(connection);
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }
    })
};

//Function to get the IoTronic project's boards
db_utils.prototype.getProjectBoards = function (project, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    
    connection.query("SELECT boards.* FROM projects, boards WHERE (projects.uuid = " + mysql.escape(project) + " OR projects.name = " + mysql.escape(project) +") AND projects.uuid = boards.projects_id", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }



    });

};

//Function to get the IoTronic project's boards
db_utils.prototype.getProjectUsers = function (project, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    
    connection.query("SELECT users.* FROM projects, users, boards WHERE (projects.uuid = " + mysql.escape(project) + " OR projects.name = " + mysql.escape(project) +") AND projects.uuid = boards.projects_id AND boards.users_id = users.uuid GROUP BY users.username", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to get all request for all Iotronic projects
db_utils.prototype.getGlobalRequestsList = function (callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM requests", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to get the request's info
db_utils.prototype.getRequest = function (request_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM requests WHERE id_request=" + mysql.escape(request_id) , function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Funcion to get the results of a request
db_utils.prototype.getRequestResults = function (request_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT board_id, result, message, timestamp FROM results WHERE request_id=" + mysql.escape(request_id) , function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to get all request's info of a Iotronic project
db_utils.prototype.getProjectRequestsList = function (project_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT id_request, subject, result, timestamp FROM requests WHERE project_id=" + mysql.escape(project_id), function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to create a new IoTronic request
db_utils.prototype.insertRequest = function (request_id, project, subject, req_result, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("INSERT INTO requests (id_request, project_id, subject, result) VALUES (" + mysql.escape(request_id) + " ," + mysql.escape(project) + " , " + mysql.escape(subject) + " , " + mysql.escape(req_result) + ")", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to insert a new IoTronic request result
db_utils.prototype.insertRequestResult = function (request_id, board_id, result, message, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("INSERT INTO results (request_id, board_id, result, message) VALUES (" + mysql.escape(request_id) + " ," + mysql.escape(board_id) + " , " + mysql.escape(result) + " , " + mysql.escape(message) + ")", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to update an IoTronic request
db_utils.prototype.updateRequestStatus = function  (request_id, result, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("UPDATE requests SET result = " + mysql.escape(result) + " WHERE id_request = " + mysql.escape(request_id) , function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = "Error updating request: " + err;
            disconn(connection);
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }
    })
};

//Function to update an IoTronic request result
db_utils.prototype.updateResultStatus = function  (request_id, board_id, result, message, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    
    connection.query("UPDATE results SET result = " + mysql.escape(result) + ", message = \""+mysql.escape(message)+"\" WHERE request_id =" + mysql.escape(request_id) +" AND board_id =" + mysql.escape(board_id), function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = "Error updating request result: " + err;
            disconn(connection);
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }
    })
};

//Function to delete an IoTronic request
db_utils.prototype.deleteRequest = function (request_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("DELETE FROM requests WHERE id_request=" + mysql.escape(request_id), function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to delete all IoTronic requests
db_utils.prototype.deleteAllRequests = function (callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("DELETE FROM requests", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to delete requests of a project
db_utils.prototype.deleteProjectRequests = function (project_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("DELETE FROM requests WHERE project_id=" + mysql.escape(project_id) , function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};




///////////////////////////////////////////
//             USERS MANAGEMENT          //
///////////////////////////////////////////

//Function to get users list
db_utils.prototype.getUserList = function (callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM users", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to create a new IoTronic user
db_utils.prototype.createUser = function (user_id, username, password, email, f_name, l_name, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("INSERT INTO users (uuid, username, password, email, first_name, last_name) VALUES (" + mysql.escape(user_id) + " , " + mysql.escape(username) + " , " + mysql.escape(password) + " , " + mysql.escape(email) + " , " + mysql.escape(f_name) + " , " + mysql.escape(l_name) + ")", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to get the IoTronic user details
db_utils.prototype.getUser = function (user, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    
    connection.query("SELECT * FROM users WHERE uuid = " + mysql.escape(user) + " OR username = " + mysql.escape(user) , function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }



    });

};

//Function to delete an IoTronic user
db_utils.prototype.deleteUser = function (user_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("DELETE FROM users WHERE uuid=" + mysql.escape(user_id), function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to update an IoTronic user
db_utils.prototype.updateUser = function  (user_id, username, password, email, f_name, l_name, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("UPDATE users SET username = " + mysql.escape(username) + ", password = " + mysql.escape(password) + ", email = " + mysql.escape(email) + ", first_name = " + mysql.escape(f_name) + ", last_name = " + mysql.escape(l_name) + " WHERE uuid=" + mysql.escape(user_id) , function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = "UPDATE error in users table: " + err;
            disconn(connection);
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }
    })
};

//Function to get user by board ID
db_utils.prototype.getUserByBoard = function (board_id, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM users, boards WHERE boards.users_id = users.uuid AND boards.board_id = " + mysql.escape(board_id) , function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to get the IoTronic user details
db_utils.prototype.getUserBoards = function (user, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT boards.* FROM users, boards WHERE (users.uuid = " + mysql.escape(user) + " OR users.username = " + mysql.escape(user) +") AND users.uuid = boards.users_id", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }



    });

};




///////////////////////////////////////////
//           SERVICES MANAGEMENT         //
///////////////////////////////////////////

//Function to get the services list
db_utils.prototype.getServicesList = function (callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM services", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getServicesList: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });

};



//Function to get the service details
db_utils.prototype.getService = function (service, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };

    if (isNaN(service))
        var query = "SELECT * FROM services WHERE name=" + mysql.escape(service);
    else
        var query = "SELECT * FROM services WHERE id=" + mysql.escape(service);

    connection.query(query, function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getServiceByName: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }



    });

};


//Function to register a new service
db_utils.prototype.registerService = function (serviceName, port, protocol, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("INSERT INTO services (name, port, protocol) VALUES (" + mysql.escape(serviceName) + " , " + mysql.escape(port) + " , " + mysql.escape(protocol) + ")", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to update a service
db_utils.prototype.updateService = function  (service, serviceName, port, protocol, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    if (isNaN(service))
        var query = "UPDATE services SET name = " + mysql.escape(serviceName) + ", port = " + mysql.escape(port) + ", protocol = " + mysql.escape(protocol) + " WHERE name=" + mysql.escape(service);
    else
        var query = "UPDATE services SET name = " + mysql.escape(serviceName) + ", port = " + mysql.escape(port) + ", protocol = " + mysql.escape(protocol) + " WHERE id=" + mysql.escape(service);

    connection.query(query, function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = "UPDATE error in service table: " + err;
            logger.error(response.message);
            disconn(connection);
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }
    })
};

//Function to delete a service from IoTronic
db_utils.prototype.deleteService = function (service, callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    if (isNaN(service))
        var query = "DELETE FROM services WHERE name=" + mysql.escape(service);
    else
        var query = "DELETE FROM services WHERE id=" + mysql.escape(service);

    connection.query(query, function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to get the list of active services
db_utils.prototype.getActiveService = function (service_id, board_id, callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM active_services WHERE board_id = " + mysql.escape(board_id) + " AND service_id = " + mysql.escape(service_id), function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getActiveService: " + response.message);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to get the list of active services for a board
db_utils.prototype.getBoardServices = function (board_id, callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT services.name as service_name, active_services.service_id, active_services.public_port, services.port as local_port, services.protocol, active_services.last_update, active_services.pid  FROM active_services, services " +
        "WHERE active_services.service_id = services.id AND active_services.board_id = " + mysql.escape(board_id), function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getActiveService: " + response.message);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Fuction to get the boards of a project that expose a service
db_utils.prototype.getBoardsPerService = function (service_id, callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT boards.label, boards.board_id, active_services.public_port, services.name, services.protocol FROM boards, services, active_services " +
        "WHERE boards.board_id = active_services.board_id AND active_services.service_id = services.id AND active_services.service_id = " + mysql.escape(service_id), function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getActiveService: " + response.message);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};


//Fuction to get the boards of a project that expose a service
db_utils.prototype.getProjectBoardsPerService = function (project_id, service_id, callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT boards.label, boards.board_id, active_services.public_port, services.name, services.protocol FROM boards, services, active_services " +
        "WHERE boards.board_id = active_services.board_id AND active_services.service_id = services.id AND boards.projects_id = " + mysql.escape(project_id) + " AND active_services.service_id = " + mysql.escape(service_id), function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getActiveService: " + response.message);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to register a new tunnel for a service of a board
db_utils.prototype.registerTunnel = function (service_name, board_id, public_port, pid, callback) {
    var connection = conn();

    //Find the id of the plugin whose name is pluginname
    var service_id;

    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT id FROM services WHERE name = " + mysql.escape(service_name), function (err, result) {

        if (err) {
            logger.error("registerTunnel: " + err);
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);

        } else {

            service_id = result[0].id;

            connection.query("INSERT INTO active_services (service_id, board_id, public_port, pid) VALUES (" + mysql.escape(service_id) + "," + mysql.escape(board_id) + "," + mysql.escape(public_port) + "," + mysql.escape(pid) + ")", function (err, result) {
                if (err) {
                    logger.error("registerTunnel: " + err);
                    response.message = err;
                    response.result = "ERROR";
                    disconn(connection);
                    callback(response);

                } else {
                    response.message = "Tunnel for service " + service_name + " registered!";
                    response.result = "SUCCESS";
                    disconn(connection);
                    callback(response);

                }

            });

        }

    });
};

//Fuction to disable the tunnel for a service of a specific board
db_utils.prototype.removeTunnel = function (service_id, board_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
     
    connection.query("DELETE FROM active_services WHERE  service_id =" + mysql.escape(service_id) + " AND board_id =" + mysql.escape(board_id), function (err, result) {

        if (err != null) {
            logger.error("removeTunnel: " + err);
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });
    

};

//Function to update the plugin status of a specific board
db_utils.prototype.updateTunnelPid = function (service_id, board_id, pid, callback) {

    var connection = conn();
    var response = {
        message: '',
        result: ''
    };

    connection.query("UPDATE active_services SET pid = '" + pid + "', last_update=NOW() WHERE  service_id =" + mysql.escape(service_id) + " AND board_id =" + mysql.escape(board_id), function (err, result) {
        if (err) {
            response.message = "updateTunnelPid (update): " + err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);

        } else {
            response.message = "PID ["+pid+"] updated!";
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};


// Get busy ports

db_utils.prototype.getBusyPorts = function (callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT public_port FROM active_services", function (err, result) {

        if (err != null) {
            logger.error("getBusyPorts: " + err);
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });


};


//Function to check if a specific port is already used
db_utils.prototype.checkPort = function (s_port, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM active_services WHERE active_services.public_port=" + mysql.escape(s_port), function (err, result) {

        if (err != null) {
            logger.error("checkPort: " + err);
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });


};

//Function to get the number of the active tunnels
db_utils.prototype.getTunnels = function (callback) {
    
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT COUNT(*) as num_tun FROM active_services", function (err, result) {

        if (err != null) {
            logger.error("getTunnels: " + err);
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });


};



///////////////////////////////////////////
//           PLUGINS MANAGEMENT          //
///////////////////////////////////////////

//Function to get the sensors list
db_utils.prototype.getPluginList = function (callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM plugins", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getPluginList: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
    
};

//Function to get all the plugins checksum of a board
db_utils.prototype.getPluginsChecksums = function (board_id, callback) {

    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT plugins.name, plugins.checksum FROM plugins, plugins_injected WHERE plugins.id = plugins_injected.plugin_id AND plugins_injected.board_id = " + mysql.escape(board_id),

        function (err, result) {
            if (err != null) {
                response.message = err;
                response.result = "ERROR";
                disconn(connection);
                callback(response);
            } else {
                response.message = result;
                response.result = "SUCCESS";
                disconn(connection);
                callback(response);
            }
        });
};

//Function to insert a plugin into the database
db_utils.prototype.insertCreatedPlugin = function (name, category, parameters, code, version, type, description, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };
    
    var checksum = md5(code);

    connection.query("INSERT INTO plugins (name, category, version, checksum, type_id, tag_id, code, defaults, description, created_at) VALUES (" +
        mysql.escape(name) + " , " +
        mysql.escape(category) + " , " +
        mysql.escape(version) + " , " +
        mysql.escape(checksum) + " , " +
        mysql.escape(type) + " , " +
        mysql.escape("2") + " , " +   //tag_id '2' -> "unreleased" by default at creation time
        mysql.escape(code) + " , " +
        mysql.escape(parameters) + " , " +
        mysql.escape(description) + " , " +
        "NOW())",
        
        function (err, result) {
            if (err != null) {
                response.message = err;
                response.result = "ERROR";
                disconn(connection);
                callback(response);
            } else {
                response.message = result;
                response.result = "SUCCESS";
                disconn(connection);
                callback(response);
            }
        }
    );

};

//Function to delete a plugin from database
db_utils.prototype.deletePlugin = function (plugin, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };

    if (isNaN(plugin))
        var query = "DELETE FROM plugins WHERE name=" + mysql.escape(plugin);
    else
        var query = "DELETE FROM plugins WHERE id=" + mysql.escape(plugin);

    connection.query(query, function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to get the plugin details
db_utils.prototype.getPlugin = function (plugin, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    /*
    if (isNaN(plugin))
        var query = "SELECT plugins.id, plugins.name, plugins.category, plugins.version, plugins.checksum, plugins.code, plugins.defaults, plugins.checksum, plugin_tags.tag, plugin_types.type, plugins.type_id, " +
            "plugins.created_at, plugins.updated_at, plugins.description " +
            "FROM plugins, plugin_tags, plugin_types " +
            "WHERE plugin_types.id = plugins.type_id AND plugins.tag_id = plugin_tags.id AND plugins.version=" + mysql.escape(version) + " AND plugins.name=" + mysql.escape(plugin);
    else
        */
        var query = "SELECT plugins.id, plugins.name, plugins.category, plugins.version, plugins.checksum, plugins.code, plugins.defaults, plugins.checksum, plugin_tags.tag, plugin_tags.id as tag_id, plugin_types.type, plugins.type_id, " +
            "plugins.created_at, plugins.updated_at, plugins.description " +
            "FROM plugins, plugin_tags, plugin_types " +
            "WHERE plugin_types.id = plugins.type_id AND plugins.tag_id = plugin_tags.id AND plugins.id=" + mysql.escape(plugin);


    connection.query(query, function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getPlugin: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });
    
};

//Function to check if a plugin exists
db_utils.prototype.checkPluginExists = function (name, version, category, type, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    var query = "SELECT * FROM plugins WHERE category=" + mysql.escape(category) + " AND type_id=" + mysql.escape(type) + " AND version=" + mysql.escape(version) + " AND name=" + mysql.escape(name);

    connection.query(query, function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("checkPluginExists: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to get the key boardId-pluginId from table plugins_injected
db_utils.prototype.getInjectedPlugin = function (plugin_id, board, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM plugins_injected WHERE board_id = " + mysql.escape(board) + " AND plugin_id = " + mysql.escape(plugin_id) , function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getInjectedPlugin: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
        
    });
    
};

//Function to know if a plugin is injected/used in/by some board
db_utils.prototype.getUsedPlugin = function (plugin_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM plugins_injected WHERE plugin_id = " + mysql.escape(plugin_id) , function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getInjectedPlugin: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to get the version of a plugin by name
db_utils.prototype.getPluginVersions = function (plugin_name, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT id, version FROM plugins WHERE name = " + mysql.escape(plugin_name) , function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getPluginVersions: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to update the plugin status of a specific board
db_utils.prototype.updatePluginStatus = function (board, plugin_id, status, callback) {
    
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };

    connection.query("UPDATE plugins_injected SET state = " + mysql.escape(status) + ", latest_change=NOW() WHERE board_id=" + mysql.escape(board) + " AND plugin_id=" + mysql.escape(plugin_id) , function (err, result) {
        if (err) {
            response.message = "updatePluginStatus (update): " + err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);

        } else {
            response.message = "Plugin '" + plugin_id + "' status set to '" + status+"'";
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });
    
};


//Function to insert plugin parameters specified at "run" or "call" time
db_utils.prototype.insertPluginParameters = function (board_id, plugin_id, parameters, callback) {

    var connection = conn();
    var response = {
        message: '',
        result: ''
    };

    connection.query("UPDATE plugins_injected SET parameters = " + mysql.escape(parameters) + ", latest_change=NOW() WHERE board_id=" + mysql.escape(board_id) + " AND plugin_id=" + mysql.escape(plugin_id) , function (err, result) {
        if (err) {
            response.message = "insertPluginParameters: " + err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);

        } else {
            response.message = "Plugin '" + plugin_id + "' parameters saved.";
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to tag a plugin
db_utils.prototype.tagPlugin = function (plugin_id, tag_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };

    connection.query("UPDATE plugins SET tag_id = " + mysql.escape(tag_id) + ", updated_at=NOW() WHERE id=" + mysql.escape(plugin_id), function (err, result) {

        if (err) {
            response.message = "tagPlugin: " + err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);

        } else {

            connection.query("SELECT tag FROM plugin_tags WHERE id = '" + tag_id + "'", function (err, result) {
                if (err) {
                    response.message = "resolveTagId (update): " + err;
                    response.result = "ERROR";
                    disconn(connection);
                    callback(response);

                } else {
                    response.message = "Plugin '" + plugin_id + "' tag set to '" + result[0].tag+"'";
                    response.result = "SUCCESS";
                    disconn(connection);
                    callback(response);
                }

            });

        }

    });


};

//Function to get the plugins list on a board
db_utils.prototype.BoardPlugins = function (board, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT plugins.name, plugins.version, plugins.id, plugins.description, plugins.category, plugins_injected.state, plugin_tags.tag, plugin_types.type FROM plugins_injected, plugins, plugin_tags, plugin_types WHERE " +
        "plugins_injected.board_id = " + mysql.escape(board) + " AND plugins_injected.plugin_id = plugins.id AND plugins.tag_id = plugin_tags.id AND plugins.type_id = plugin_types.id ", function (err_plugin, result_plugin) {

        if (err_plugin != null) {
            response.result = "ERROR";
            response.message = err_plugin;
            logger.error(response.result + " - " + err_plugin);
            disconn(connection);
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result_plugin;
            disconn(connection);
            callback(response);
        }

    });

};

//Function to get the id of a plugin
db_utils.prototype.getPluginCategory = function (pluginName, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT category FROM plugins WHERE name = " + mysql.escape(pluginName) + " ORDER BY id desc limit 1", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getPluginCategory: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
        
    });
    
};

//Function to remove a plugin that was injected in a board
db_utils.prototype.deleteInjectedPlugin = function (board, plugin_name, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };

    connection.query("DELETE FROM plugins_injected WHERE board_id=" + mysql.escape(board) + " AND plugin_name=" + mysql.escape(plugin_name) , function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("deleteInjectedPlugin: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });
    /*
    connection.query("DELETE FROM plugins_injected WHERE board_id='" + board + "' AND plugin_id='" + plugin_id + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("deleteInjectedPlugin: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
        
    });
*/

};

//Function to write that a plugin has been injected in a board to the proper table
db_utils.prototype.insertInjectedPlugin = function (board, plugin_id, plugin_name, callback) {
    
    var connection = conn();
    
    var response = {
        message: '',
        result: ''
    };

    connection.query("INSERT INTO plugins_injected (board_id, plugin_id, plugin_name, state) VALUES (" + mysql.escape(board) + "," + mysql.escape(plugin_id) + "," + mysql.escape(plugin_name) + ", 'injected')", function (err, result) {
        if (err) {
            logger.error("insertInjectedPlugin: " + err);
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);

        } else {
            response.message = "plugin_id: " + plugin_id;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);

        }

    });

    /*
    //Find the id of the plugin whose name is pluginname
    connection.query("SELECT id FROM plugins WHERE name = '" + pluginname + "'", function (err, result) {

        if (err) {
            logger.error("selectInjectingPlugin: " + err);
            response.message = err;
            response.result = "ERROR";
            disconn(connection);
            callback(response);

        } else {
            
            var plugin_id = result[0].id;

            connection.query("INSERT INTO plugins_injected (board_id, plugin_id, state) VALUES ('" + board + "','" + plugin_id + "', 'injected')", function (err, result) {
                if (err) {
                    logger.error("insertInjectedPlugin: " + err);
                    response.message = err;
                    response.result = "ERROR";
                    disconn(connection);
                    callback(response);
                    
                } else {
                    response.message = "plugin_id: " + plugin_id;
                    response.result = "SUCCESS";
                    disconn(connection);
                    callback(response);
                    
                }
                
            });

        }

    });
    */
    
};

//Function to the type name from the id
db_utils.prototype.getTypeId = function (type, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    if (isNaN(type)) {

        connection.query("SELECT id, type FROM plugin_types WHERE type =" + mysql.escape(type) , function (err, result) {

            if (err != null) {
                response.result = "ERROR";
                response.message = err;
                logger.error("SELECT error in plugin_types tables: " + err);
                disconn(connection);
                callback(response);
            }
            else {
                response.result = "SUCCESS";
                response.message = [result[0].id, result[0].type];
                disconn(connection);
                callback(response);
            }

        });
        
    }
    else{

        connection.query("SELECT id, type FROM plugin_types WHERE id=" + mysql.escape(type) , function (err, result) {

            if (err != null) {
                response.result = "ERROR";
                response.message = err;
                logger.error("SELECT error in plugin_types tables: " + err);
                disconn(connection);
                callback(response);
            }
            else {
                response.result = "SUCCESS";
                response.message = [result[0].id, result[0].type];
                disconn(connection);
                callback(response);
            }

        });
        
    }



};

//Function to update a plugin
db_utils.prototype.updatePlugin = function (plugin_id, name, version, tag_id, code, parameters, description, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    var checksum = md5(code);

    connection.query("UPDATE plugins SET " +
        "name='" + name + "', " +
   //     "category='" + category + "', " +
        "version=" + mysql.escape(version) + ", " +
        "checksum=" + mysql.escape(checksum) + ", " +
   //     "type_id='" + type_id + "', " +
        "tag_id='" + tag_id + "', " +
        "code=" + mysql.escape(code) + ", " +
        "defaults=" + mysql.escape(parameters) + ", " +
        "description=" + mysql.escape(description) + ", " +
        "updated_at=NOW()" +
        "WHERE id='" + plugin_id + "'", function (err, result) {

            if (err != null) {
                response.message = err;
                response.result = "ERROR";
                logger.error("updatePlugin: " + err);
                disconn(connection);
                callback(response);
            } else {
                response.message = result;
                response.result = "SUCCESS";
                disconn(connection);
                callback(response);
            }

        }

    );


};

// Function get plugin ID from name and version
db_utils.prototype.getPluginFromVersion = function (plugin_name, plugin_version, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM plugins WHERE version = " + mysql.escape(plugin_version) + " AND name = " + mysql.escape(plugin_name) , function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getPluginFromVersion: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};








//////////////////////////////////////
//         VNET MANAGEMENT          //
//////////////////////////////////////

//Function to get the VNETs list
db_utils.prototype.getVnetsList = function (callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    //get the socat ID just created before
    connection.query("SELECT * FROM vlans", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getVnetsList - " + response.result + ": " + response.message);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
};

//Function to insert new VNET
db_utils.prototype.insertVNET = function (vlan_ip, vlan_mask, net_uuid, vlan_name, callback) {

    var connection = conn();

    logger.debug("[VNET] --> registering new VNET in DB...");

    var response = {
        message: '',
        result: ''
    };

    //socat ID creation related to the new board FOREVER
    connection.query("INSERT INTO vlans (vlan_ip, vlan_mask, net_uuid, vlan_name) VALUES (" + mysql.escape(vlan_ip) + ", " + mysql.escape(vlan_mask) + ", " + mysql.escape(net_uuid) + ", " +
        "" + mysql.escape(vlan_name) + " )", function (err, result) {

        if (err != null) {

            response.message = err;
            response.result = "ERROR";
            logger.error("[VNET] ----> insertVNET - INSERT error in vlans tables: " + response.message);
            disconn(connection);
            callback(response);

        } else {

            response.message = result.insertId;
            response.result = "SUCCESS";
            logger.debug("[VNET] ----> insertVNET - new vlan ID ("+result.insertId+") selected from DB.");
            disconn(connection);
            callback(response);

        }

    });


};

//Function to insert new Addresses of a new VNET
db_utils.prototype.insertAddresses = function (list_ip, net_uuid, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    logger.debug("[VNET] --> Creating the addresses poll for the new VLAN " + net_uuid);

    var query = "INSERT INTO free_addresses (vlans_id, ip, insert_date) VALUES ";
    var getVID = "SELECT id FROM vlans WHERE net_uuid=" + mysql.escape(net_uuid);
    
    connection.query(getVID, function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("[VNET] ----> insertAddresses - Error getting VNET id in vlans table: " + response.message);
            disconn(connection);
            callback(response);

        } else {


            var values = [];
            var val = [];

            var query = "INSERT INTO free_addresses (vlans_id, ip, insert_date) VALUES ?";
            
            for (var i = 0; i < list_ip.length; i++) {

                (function (i) {

                    var val_time = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                    var val = [ result[0].id, list_ip[i], val_time];
                    values.push(val);

                    if (i == list_ip.length - 1){

                        //logger.debug(values);
                        
                        connection.query(query, [values], function (err, result) {

                            if (err != null) {

                                response.message = err;
                                response.result = "ERROR";
                                logger.error("[VNET] ----> insertAddresses - INSERT error in free_addresses table: " + response.message);
                                disconn(connection);
                                callback(response);

                            } else {

                                response.message = result;
                                response.result = "SUCCESS";
                                logger.debug("[VNET] ----> insertAddresses - New addresses pool successfully created for VNET "+net_uuid);
                                disconn(connection);
                                callback(response);

                            }

                        });

                    }


                })(i);

            }

        }
    });


};

//Function to get boards info in a VNET
db_utils.prototype.getVnetBoardsInfo = function (net_uuid, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };
    
    connection.query("select boards.label AS board_name, id_board AS board_id, vlans.vlan_name AS vlan_name, vlans_connection.id_vlan AS vlan_id, vlans_connection.ip_vlan AS vlan_ip,  socat_connections.id AS socat_id, socat_connections.ip_board AS socat_ip, socat_connections.port AS socat_port from socat_connections,vlans_connection, vlans, boards " +
        "WHERE socat_connections.id = vlans_connection.id_socat_connection AND boards.board_id = socat_connections.id_board AND id_vlan = vlans.id AND vlans.net_uuid=" + mysql.escape(net_uuid), function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn(connection);
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }

    });


};

//Function to destroy a VNET
db_utils.prototype.destroyVNET = function (net_uuid, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("DELETE FROM vlans WHERE vlans.net_uuid=" + mysql.escape(net_uuid), function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn(connection);
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }

    });


};

//Function to get the net_enabled id of a board
db_utils.prototype.getNetEnabledId = function (board, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };
    
    //select net_enabled from user_boards where board_id=30303030
    connection.query("SELECT net_enabled FROM boards WHERE board_id =" + mysql.escape(board), function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("SELECT error in user_boards tables: " + err);
            disconn(connection);
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }

    });
    
};

//Function to get first valid address
db_utils.prototype.checkAddressPool = function (net_uuid, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    query = "select ip from free_addresses where vlans_id = (SELECT id FROM vlans WHERE net_uuid=" + mysql.escape(net_uuid) + " ) ORDER BY insert_date, ip ASC limit 1";

    connection.query(query, function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("[VNET] --> checkAddressPool " + response.result + ": " + err);
            disconn(connection);
            callback(response);
        }
        else {

            response.message = result;

            if (result.length != 0) {
                response.result = "SUCCESS";
                logger.debug("[VNET] --> " + JSON.stringify(result));
                disconn(connection);
                callback(response);
            }
            else {
                response.result = "NO-IP";
                logger.debug("[VNET] --> " + JSON.stringify(result));
                disconn(connection);
                callback(response);
            }

        }

    });


};

//Function to get VNET info
db_utils.prototype.getVnet = function (net_uuid, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };
    
    //get the socat ID just created before
    connection.query("SELECT * FROM vlans WHERE net_uuid=" + mysql.escape(net_uuid), function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("getVnet - Error selecting vlans: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }


    });


};

//Function to check if a board is already connected to a VNET
db_utils.prototype.checkBoardIntoVLAN = function (board, net_uuid, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT EXISTS(  SELECT id_vlan, id_socat_connection FROM vlans_connection " +
        "WHERE id_vlan = (SELECT id FROM vlans WHERE net_uuid=" + mysql.escape(net_uuid) + " )  AND id_socat_connection=(SELECT id FROM socat_connections WHERE id_board=" + mysql.escape(board) + " )  ) AS found", function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("Error checking board in VNET: " + err);
            disconn(connection);
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }
    });

};

//Function to get the socat ID of a board
db_utils.prototype.getSocatConn = function (board, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT id, port FROM socat_connections WHERE id_board=" + mysql.escape(board), function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("SELECT error in socat_connection tables: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }

    });

};

//Function to check if the USER ip is free
db_utils.prototype.checkAssignedVlanIP = function (user_ip, vlan_id, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT EXISTS(  SELECT vlans_id, ip FROM free_addresses WHERE vlans_id =" + mysql.escape(vlan_id) + " AND ip =" + mysql.escape(user_ip) + " ) AS found", function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("--> checkAssignedVlanIP ERROR: " + err);
            disconn(connection);
            callback(response);
        }
        else {

            logger.debug("--> checkAssignedVlanIP found: " + result[0].found);

            if (result[0].found == 1) {

                query = "Delete from free_addresses where ip='" + user_ip + "'";

                logger.debug("Found - " + result[0].found + " query: " + query);

                connection.query(query, result, function (del_err, del_result) {

                    //logger.debug("FOUND DELETE - " + result[0].found + " - " + user_ip);

                    if (del_err != null) {
                        response.result = "ERROR";
                        response.message = del_err;
                        disconn(connection);
                        callback(response);
                    }
                    else {
                        response.result = "SUCCESS";
                        response.message = result;
                        disconn(connection);
                        callback(response);
                    }

                });

            } else {
                response.result = "NOT-AVAILABLE";
                response.message = result;
                disconn(connection);
                callback(response);
            }


        }

    });


};

//Function to get first valid address
db_utils.prototype.getFreeAddress = function (net_uuid, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    query = "select ip from free_addresses where vlans_id = (SELECT id FROM vlans WHERE net_uuid=" + mysql.escape(net_uuid) + " ) ORDER BY insert_date, ip ASC limit 1";

    connection.query(query, function (err, ip_result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("[VNET] --> " + response.result + " - " + err);
            disconn(connection);
            callback(response);

        }
        else {
            
            if (ip_result.length != 0) {

                query = "DELETE from free_addresses where ip='" + ip_result[0].ip + "'";

                connection.query(query, function (err, result) {

                    if (err != null) {
                        response.result = "ERROR";
                        response.message = err;
                        logger.error("[VNET] --> " + response.result + " - " + err);
                        disconn(connection);
                        callback(response);
                    }
                    else {
                        response.message = ip_result;
                        response.result = "SUCCESS";
                        disconn(connection);
                        callback(response);
                    }

                });

            }
            else {
                response.result = "NO-IP";
                response.message = ip_result;
                logger.warn(response.result + " - " + JSON.stringify(ip_result) + " err " + err);
                disconn(connection);
                callback(response);
            }

        }

    });


};

//Function to insert new VNET connection
db_utils.prototype.insertVnetConnection = function (vlan_ip, net_uuid, id_board, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT EXISTS(SELECT 1 FROM vlans_connection WHERE ip_vlan =" + mysql.escape(vlan_ip) + " LIMIT 1) AS found", function (err, result) {
        if (err != null) {
            logger.warn("[VNET] ----> insertVnetConnection - Select error in checking ip_vlans table: " + err);
            response.message = err;
            response.result = 'ERROR';
            disconn(connection);
            callback(response);

        } else {

            if (result[0].found == 1) {
                logger.debug("[VNET] ----> insertVnetConnection - VNET connection already exists: " + result[0].id);
                response.message = result;
                response.result = result[0].found;
                disconn(connection);
                callback(response);
            }
            else {
                
                //Socat ID related to the new board assigned "forever"
                connection.query("INSERT INTO vlans_connection (id_vlan, id_socat_connection,ip_vlan) VALUES ((select id from vlans where net_uuid=" + mysql.escape(net_uuid) + "), (select id from socat_connections where id_board=" + mysql.escape(id_board) + "), " + mysql.escape(vlan_ip) + ")", function (err, result) {

                    if (err != null) {

                        logger.warn("[VNET] ----> insertVnetConnection - INSERT error in vlans_connection tables: " + err);
                        response.message = err;
                        response.result = 'ERROR';
                        disconn(connection);
                        callback(response);

                    } else {
                        logger.debug("[VNET] ----> insertVnetConnection - registering new VNET connection completed!");
                        response.message = result;
                        response.result = 'SUCCESS';
                        disconn(connection);
                        callback(response);

                    }

                });

            }


        }

    });


};

//Function to get the socat status of a board
db_utils.prototype.getSocatStatus = function (board, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };
    
    connection.query("SELECT status FROM socat_connections WHERE id_board=" + mysql.escape(board), function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("SELECT error in socat_connection tables: " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }


    });
};

//Function to get the net_enabled id of a board
db_utils.prototype.getSocatConf = function (board, basePort, socatNetwork, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT id FROM socat_connections WHERE id_board=" + mysql.escape(board), function (err, result) {

        if (err != null) {

            response.result = "ERROR";
            response.message = err;
            logger.error("Error selecting id in socat_connections table: " + err);
            disconn(connection);
            callback(response);
            
        } else {

            // If the board is new
            if (result[0] == undefined) {
                
                logger.debug("[VNET] --> registering new board in DB...");



                /* Begin transaction */
                connection.beginTransaction(function(err) {

                    if (err) {

                        response.result = "ERROR";
                        response.message = err;
                        logger.error("[VNET] --> getSocatConf transaction error: " + err);
                        disconn(connection);
                        callback(response);

                    }else{

                        //socat ID creation related to the new board FOREVER
                        connection.query("INSERT INTO socat_connections (id_board, status, port, ip_board, ip_server) VALUES (" + mysql.escape(board) + ", 'noactive', 0, 'None', 'None' )", function (err, result) {

                            if (err != null) {

                                connection.rollback(function() {
                                    response.result = "ERROR";
                                    response.message = err;
                                    logger.error("[VNET] --> Error inserting new Socat connection in socat_connections table: " + err);
                                    callback(response);

                                });


                            } else {

                                var bSocatNum = result.insertId - 1;
                                logger.debug("[VNET] --> selecting new Socat board ID from DB: bSocatNum = " + bSocatNum);

                                var socatPort = parseInt(basePort) + bSocatNum;
                                var socatNetAddr = ip.toLong(socatNetwork) + (bSocatNum * 2);
                                var socatServAddr = ip.fromLong(socatNetAddr);
                                var socatBoardAddr = ip.fromLong(socatNetAddr + 1);

                                logger.debug("[VNET] --> creating new NET parameters in DB for board " + board + "..." + " port = '" + socatPort + "', ip_board='" + socatBoardAddr + "', ip_server='" + socatServAddr);

                                connection.query("UPDATE socat_connections SET port = '" + socatPort + "', ip_board='" + socatBoardAddr + "', ip_server='" + socatServAddr + "'  WHERE id_board='" + board + "'", function (err, result_insert) {

                                    if (err != null) {

                                        connection.rollback(function() {
                                            response.result = "ERROR";
                                            response.message = err;
                                            logger.error("[VNET] --> Error updating new connection in socat_connections table: " + err);
                                            callback(response);

                                        });

                                    } else {

                                        connection.commit(function(err) {

                                            if (err) {

                                                connection.rollback(function() {
                                                    response.result = "ERROR";
                                                    response.message = err;
                                                    logger.error("[VNET] --> getSocatConf commit error: " + err);
                                                    callback(response);
                                                });

                                            }else{

                                                response.message = {
                                                    socatID: bSocatNum,
                                                    port: socatPort,
                                                    serverIP: socatServAddr,
                                                    boardIP: socatBoardAddr
                                                };
                                                response.result = "SUCCESS";
                                                disconn(connection);
                                                callback(response);

                                            }

                                        });


                                    }

                                });


                            }

                        });

                    }

                });
                /* End transaction */


            } else {

                // If the board is already registered

                //get the socat ID created before
                connection.query("SELECT id, ip_board, ip_server, port FROM socat_connections WHERE id_board=" + mysql.escape(board), function (err, result) {

                    if (err != null) {
                        response.result = "ERROR";
                        response.message = err;
                        logger.error("Error selecting Socat connection info in socat_connections table: " + err);
                        disconn(connection);
                        callback(response);
                        
                    } else {

                        var bSocatNum = result[0].id - 1;
                        //logger.debug("[VNET] --> Selecting Socat board ID from DB: bSocatNum = " + bSocatNum);

                        var socatPort = result[0].port;
                        var socatServAddr = result[0].ip_server;
                        var socatBoardAddr = result[0].ip_board;
                        
                        response.message = {
                            socatID: bSocatNum,
                            port: socatPort,
                            serverIP: socatServAddr,
                            boardIP: socatBoardAddr
                        };
                        response.result = "SUCCESS";
                        
                        disconn(connection);
                        callback(response);

                    }
                    
                });

            }

        }
    });

};

//Function to update the Socat status of a board
db_utils.prototype.updateSocatStatus = function (board, status, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("UPDATE socat_connections SET status =" + mysql.escape(status) + " WHERE id_board=" + mysql.escape(board), function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = "UPDATE error in socat_connection tables: " + err;
            logger.error(response.message);
            disconn(connection);
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }
    })
};


//Function to insert an IP addressin the free pool
db_utils.prototype.restoreIpAddress = function (board_ip, net_uuid, callback) {

    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("INSERT INTO free_addresses (vlans_id, ip, insert_date) VALUES ( (SELECT id FROM vlans WHERE net_uuid=" + mysql.escape(net_uuid) + " ), " + mysql.escape(board_ip) + ", NOW())", function (err, result) {

        if (err != null) {
            
            response.result = "ERROR";
            response.message = "restoreIpAddress - Error: " + err;
            disconn(connection);
            callback(response);

        } else {
            
            response.message = "restoreIpAddress - Reinsert IP '" + board_ip + "' into free_addresses table: SUCCESS!";
            response.result = 'SUCCESS';
            disconn(connection);
            callback(response);

        }

    });

};


//Function to remove board from a VNET
db_utils.prototype.removeBoardFromVlan = function (board_id, net_uuid, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    query = "select ip_vlan from vlans_connection where id_vlan = (SELECT id FROM vlans WHERE net_uuid=" + mysql.escape(net_uuid) + " )  and id_socat_connection = (SELECT id FROM socat_connections WHERE id_board=" + mysql.escape(board_id) + " )";

    connection.query(query, function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("removeBoardFromVlan - Error getting VNET info: " + err);
            disconn(connection);
            callback(response);
        }
        else {

            response.message = result;
            var board_ip = result[0].ip_vlan;

            if (result.length != 0) {


                /* Begin transaction */
                connection.beginTransaction(function(err) {

                    if (err) {

                        response.result = "ERROR";
                        response.message = err;
                        logger.error("[VNET] --> removeBoardFromVlan transaction error: " + err);
                        callback(response);

                    } else {

                        connection.query("DELETE from vlans_connection where ip_vlan='" + board_ip + "'", function (err, result) {

                            if (err != null) {
                                connection.rollback(function() {
                                    response.result = "ERROR";
                                    response.message = err;
                                    callback(response);
                                });
                            }
                            else {

                                connection.query("INSERT INTO free_addresses (vlans_id, ip, insert_date) VALUES ( (SELECT id FROM vlans WHERE net_uuid=" + mysql.escape(net_uuid) + " ), '" + board_ip + "', NOW())", function (err, result) {

                                    if (err != null) {

                                        connection.rollback(function() {
                                            logger.error("[VNET] --> removeBoardFromVlan - ERROR INSERT into free_addresses table: " + err);
                                            response.message = err;
                                            response.result = 'ERROR';
                                            callback(response);
                                        });


                                    } else {

                                        connection.commit(function(err) {

                                            if (err) {

                                                connection.rollback(function() {
                                                    response.result = "ERROR";
                                                    response.message = err;
                                                    callback(response);
                                                });

                                            }else{

                                                logger.debug("[VNET] --> removeBoardFromVlan - INSERT into free_addresses table SUCCESS!");
                                                response.message = result;
                                                response.result = 'SUCCESS';
                                                disconn(connection);
                                                callback(response);

                                            }

                                        });

                                    }

                                });


                            }

                        });



                    }

                });
                /* End transaction */




            }
            else {
                response.result = "ERROR";
                disconn(connection);
                callback(response);
            }
            
        }

    });


};

//Function to get VLANs of a board
db_utils.prototype.getBoardVLAN = function (board, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT vlan_name, ip_vlan, net_uuid FROM vlans, vlans_connection, socat_connections WHERE id_socat_connection = (select id from socat_connections where id_board=" + mysql.escape(board) + ") AND vlans_connection.id_socat_connection = socat_connections.id AND vlans_connection.id_vlan = vlans.id", function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn(connection);
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }

    });
};






/*
//Function to get the socat ID of a board
db_utils.prototype.getSocatPort = function (board, callback) {

    var connection = conn();

    connection.query("SELECT port FROM socat_connections WHERE id_board='" + board + "'", function (err, result) {

        if (err != null) {
            logger.error("SELECT error in socat_connection tables: " + err);
            disconn(connection);
            //callback(result);
        } else {
            disconn(connection);
            callback(result);
        }


    });

};

//Function to delete a VLAN
db_utils.prototype.deleteVlan = function (net_uuid, callback) {

    var connection = conn();

    //delete from vlans where vlan
    connection.query("DELETE FROM vlans WHERE net_uuid='" + net_uuid + "'", function (err, result) {

        if (err != null) {
            logger.error("deleteVlan - DELETE error in vlans tables: " + err);
            disconn(connection);
        } else {

            logger.info("--> Deleted VLAND with ID: " + result[0].id);

            disconn(connection);
            callback(result);

        }


    });


};
 */


///////////////////////////////////////////
//           NEUTRON MANAGEMENT          //
///////////////////////////////////////////

//Function to insert Port
db_utils.prototype.insertPort = function (port, board_uuid, callback) {

    var connection = conn();
    logger.info("[VNET] --> Saving the port into the db " + port.id);

    var query = util.format("INSERT INTO ports (uuid,mac_address,ip_address,board_uuid,net_uuid) VALUES ('%s','%s','%s','%s','%s')", port.id, port.macAddress, port.fixedIps[0].ip_address, board_uuid, port.networkId);

    logger.debug("[VNET] --> query: " + query);

    connection.query(query, function (err, result) {
        callback(err, result)
        disconn(connection);
    });


}

//Function to get Port
db_utils.prototype.getPort = function (net_uuid, board_uuid, callback) {
    var connection = conn();
    logger.info("[VNET] --> Getting the port for the board " + board_uuid + " on the network " + net_uuid);

    var query = util.format("select uuid from ports where board_uuid='%s' and net_uuid='%s'", board_uuid, net_uuid);

    logger.debug("[VNET] --> query: " + query);

    connection.query(query, function (err, result) {
        callback(err, result)
        disconn(connection);
    });


}

//Function to delete Port
db_utils.prototype.deletePort = function (port, callback) {

    var connection = conn();
    logger.info("[VNET] --> Deleting the port into the db " + port);


    var query = util.format("delete from ports where uuid='%s'", port);

    logger.debug("[VNET] --> query: " + query);

    connection.query(query, function (err, result) {
        callback(err, result)
        disconn(connection);
    });


};

//Function to get all Ports for a board
db_utils.prototype.getAllPorts = function (board_uuid, callback) {
    var connection = conn();
    logger.info("[VNET] --> Getting all the ports for the board " + board_uuid);

    var query = util.format("select * from ports where board_uuid='%s'", board_uuid);
    logger.debug("[VNET] --> query: " + query);

    connection.query(query, function (err, result) {
        disconn(connection);
        callback(err, result)
    });
};










///////////////////////////////////////////
//           DRIVERS MANAGEMENT          //
///////////////////////////////////////////

//Function to get the drivers list
db_utils.prototype.getDriverList = function (callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM drivers", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getDriverList: " + response.message);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });

};

//Function to get the of injected driver of a board
db_utils.prototype.getBoardDriverList = function (board, callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT drivers.name, drivers_injected.state, drivers_injected.latest_change FROM drivers_injected, drivers WHERE drivers.id = drivers_injected.driver_id AND drivers_injected.board_id = '" + board + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getBoardDriverList: " + response.message);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};


//Function to insert a driver into the database
db_utils.prototype.insertCreatedDriver = function (drivername, driverjson, drivercode, callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("INSERT INTO drivers (name, jsonschema, code) VALUES (" + mysql.escape(drivername) + " , " + mysql.escape(driverjson) + " , " + mysql.escape(drivercode) + ")", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("insertCreatedDriver: " + response.message);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }


    });
};

//Function to get the key boardId-driverId from table drivers_injected
db_utils.prototype.getInjectedDriver = function (driver_id, board, callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT board_id, driver_id, state, latest_change FROM drivers_injected WHERE board_id = '" + board + "' AND driver_id = '" + driver_id + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getInjectedDriver: " + response.message);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }

    });

};

//Function to remove a driver that was injected in a board
db_utils.prototype.deleteInjectedDriver = function (board, driver_id, callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    //delete from drivers_injected where driver_id=X;
    connection.query("DELETE FROM drivers_injected WHERE board_id='" + board + "' AND driver_id='" + driver_id + "'", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("deleteInjectedDriver: " + response.message);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });


};

//Function to get the name and code of a generic driver
db_utils.prototype.getDriver = function (driver, callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    if (isNaN(driver))
        var query = "SELECT * FROM drivers WHERE name=" + mysql.escape(driver);
    else
        var query = "SELECT * FROM drivers WHERE id=" + mysql.escape(driver);

    connection.query(query, function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getDriver: " + response.message);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
        
    });

};

//Function to write that a driver has been injected in a board to the proper table
db_utils.prototype.insertInjectedDriver = function (board, drivername, callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };
    
    //Find the id of the driver whose name is drivername
    var driver_id;
    
    connection.query("SELECT id FROM drivers WHERE name = '" + drivername + "'", function (err, result) {

        if (err) {
            response.message = err;
            response.result = "ERROR";
            logger.error("insertInjectedDriver SELECT: " + response.message);
            disconn(connection);
            callback(response);

        } else {

            driver_id = result[0].id;

            connection.query("INSERT INTO drivers_injected (board_id, driver_id, state) VALUES ('" + board + "','" + driver_id + "', 'injected')", function (err, result) {
                if (err) {
                    response.message = err;
                    response.result = "ERROR";
                    logger.error("insertInjectedDriver INSERT: " + response.message);
                    disconn(connection);
                    callback(response);
                } else {
                    response.message = driver_id;
                    response.result = "SUCCESS";
                    disconn(connection);
                    callback(response);

                }

            });

        }

    });
};

//Function to delete a driver from Iotronic database
db_utils.prototype.deleteDriver = function (driver, callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    if (isNaN(driver))
        var query = "DELETE FROM drivers WHERE name=" + mysql.escape(driver);
    else
        var query = "DELETE FROM drivers WHERE id=" + mysql.escape(driver);

    connection.query(query, function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("deleteDriver: " + response.message);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
        
    });
};

//Function to update the driver status of a specific board
db_utils.prototype.updateDriverStatus = function (board, drivername, status, callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    //Find the id of the driver whose name is drivername
    var driver_id;
    connection.query("SELECT id FROM drivers WHERE name = '" + drivername + "'", function (err, result) {

        if (err) {
            response.message = err;
            response.result = "ERROR";
            logger.error("updateDriverStatus SELECT: " + response.message);
            disconn(connection);
            callback(response);

        } else {
            driver_id = result[0].id;
            connection.query("UPDATE drivers_injected SET state = '" + status + "', latest_change=NOW() WHERE board_id='" + board + "' AND driver_id='" + driver_id + "'", function (err, result) {

                if (err) {
                    response.message = err;
                    response.result = "ERROR";
                    logger.error("updateDriverStatus UPDATE: " + response.message);
                    disconn(connection);
                    callback(response);
                } else {
                    response.message = "driver " + drivername + " status: " + status;
                    response.result = "SUCCESS";
                    disconn(connection);
                    callback(response);

                }

            });

        }

    });
};

//Function to remove a driver that was injected in a board
db_utils.prototype.deleteInjectedDriver = function (board, driver_id, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    //delete from drivers_injected where driver_id=X;
    connection.query("DELETE FROM drivers_injected WHERE board_id='" + board + "' AND driver_id='" + driver_id + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("deleteInjectedDriver: " + response.message);
            disconn(connection);
            callback(response);
            
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
            
        }
        
    });


};






///////////////////////////////////////
//          VFS MANAGEMENT          //
//////////////////////////////////////

//Function to insert a mountpoint into the database
db_utils.prototype.insertMountpoint = function (board, mountpoint, src_board, src_path, status, callback) {
    
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("INSERT INTO mountpoints (src_board, src_path, dst_board, dst_path, status) VALUES ('" + src_board + "','" + src_path + "','" + board + "','" + mountpoint + "','" + status + "')", function (err, result) {
        if (err) {
            response.message = err;
            response.result = "ERROR";
            logger.error("insertMountpoint INSERT: " + response.message);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);

        }

    });
    
};

//Function to delete a mountpoint from Iotronic database
db_utils.prototype.deleteMountpoint = function (board, mountpoint, src_board, src_path, callback) {
    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("DELETE FROM mountpoints WHERE dst_board='" + board + "' AND src_board='" + src_board + "' AND dst_path='" + mountpoint + "' AND src_path='" + src_path + "' ;", function (err, result) {
        
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });
    
};

//Function to get the mountpoints list
db_utils.prototype.getMountpointsList = function (callback) {

    var connection = conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM mountpoints", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getDriverList: " + response.message);
            disconn(connection);
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn(connection);
            callback(response);
        }
    });

};

//Function to get the mountpoints list on a board
db_utils.prototype.BoardMountpoints = function (board, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT src_board, src_path, dst_path FROM mountpoints WHERE dst_board = '" + board + "';", function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }

    });

};

//check if mountpoint is already mounted
db_utils.prototype.checkBoardMountpoint = function (board, mountpoint, callback) {
    var connection = conn();
    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT dst_path, src_board, src_path FROM mountpoints WHERE dst_board = '" + board + "' AND dst_path = '" + mountpoint + "' AND status = 'mounted';" , function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error(response.result + " - " + err);
            disconn(connection);
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result;
            disconn(connection);
            callback(response);
        }

    });

};





module.exports = db_utils;
