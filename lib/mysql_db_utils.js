/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2014 2015 2016 Andrea Rocco Lotronto, Nicola Peditto, Fabio Verboso

 */

var mysql = require('mysql');

var ip = require('ip');

var util = require('util');

//service logging configuration: "mysql_db_utils"   
var logger = log4js.getLogger('mysql_db_utils');
logger.setLevel(loglevel);

//var IotronicHome = "/var/lib/iotronic";
var IotronicHome = process.env.IOTRONIC_HOME;

var nconf = require('nconf');
nconf.file({file: IotronicHome + '/settings.json'});

var db_host = nconf.get('config:server:db:host');
var db_user = nconf.get('config:server:db:user');
var db_pass = nconf.get('config:server:db:password');
var db_name = nconf.get('config:server:db:db_name');

var connection;

db_utils = function () {
    var db_host = nconf.get('config:server:db:host');
    var db_user = nconf.get('config:server:db:user');
    var db_pass = nconf.get('config:server:db:password');
    var db_name = nconf.get('config:server:db:db_name');
};

function conn() {
    connection = mysql.createConnection({
        host: db_host,
        port: '3306',
        user: db_user,
        password: db_pass,
        database: db_name
    });
}

function disconn() {
    connection.end();
}








//////////////////////////////////////
//         BOARD MANAGEMENT         //
//////////////////////////////////////

//Function to get boards list
db_utils.prototype.getBoardsList = function (callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM boards", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn();
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }

    });

};

//Function to get the sensors list
db_utils.prototype.getSensorList = function (callback) {
    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM sensors", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });

};

//Function to get board info
db_utils.prototype.BoardInfo = function (board, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT " +
        "boards.board_code, " +
        "boards.label, " +
        "boards.latest_update, " +
        "boards.description, " +
        "boards.mobile, " +
        "boards.notify, " +
        "users.username as user, " +
        "projects.name as project, " +
        "layouts.id_layout as layout, " +
        "layouts.model, " +
        "layouts.manufacturer, " +
        "layouts.image, " +
        "boards.net_enabled, " +
        "coordinates.altitude, " +
        "coordinates.longitude, " +
        "coordinates.latitude " +
        "FROM boards, coordinates, layouts, users, projects " +
        "WHERE board_code = '" + board + "' AND coordinates.board_id = boards.board_code AND boards.type = layouts.id_layout AND boards.projects_id = projects.uuid AND boards.users_id = users.uuid", function (err_info, result_info) {

        if (err_info != null) {
            response.result = "ERROR";
            response.message = err_info;
            logger.error(response.result + " - " + err_info);
            disconn();
            callback(response);

        }
        else {


            connection.query("SELECT plugins.name, plugins.id, plugins.category, plugins_injected.state FROM plugins_injected, plugins WHERE plugins_injected.board_id = '" + board + "' AND plugins_injected.plugin_id = plugins.id", function (err_plugin, result_plugin) {

                if (err_plugin != null) {
                    response.result = "ERROR";
                    response.message = err_plugin;
                    logger.error(response.result + " - " + err_plugin);
                    disconn();
                    callback(response);
                }
                else {

                    connection.query("SELECT sensors.type, sensors.model, sensors.id FROM sensors, sensors_on_board WHERE sensors_on_board.id_board = '" + board + "' AND sensors_on_board.id_sensor = sensors.id", function (err_sensor, result_sensor) {

                        if (err_sensor != null) {
                            response.result = "ERROR";
                            response.message = err_sensor;
                            logger.error(response.result + " - " + err_sensor);
                            disconn();
                            callback(response);
                        } else {


                            connection.query("SELECT drivers.name, drivers_injected.state, drivers_injected.latest_change FROM drivers_injected, drivers WHERE drivers.id = drivers_injected.driver_id AND drivers_injected.board_id = '" + board + "'", function (err_driver, result_driver) {

                                if (err_driver != null) {
                                    response.result = "ERROR";
                                    response.message = err_driver;
                                    logger.error(response.result + " - " + err_driver);
                                    disconn();
                                    callback(response);
                                } else {

                                    connection.query("SELECT services.name, active_services.public_port FROM services, active_services WHERE services.id = active_services.service_id AND active_services.board_id = '" + board + "'", function (err_service, result_service) {

                                        if (err_service != null) {
                                            response.result = "ERROR";
                                            response.message = err_service;
                                            logger.error(response.result + " - " + err_service);
                                            disconn();
                                            callback(response);
                                        } else {

                                            var layout = {
                                                info: result_info,
                                                sensors: result_sensor,
                                                plugins: result_plugin,
                                                drivers: result_driver,
                                                services: result_service
                                            };

                                            response.result = "SUCCESS";
                                            response.message = layout;
                                            disconn();
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

};

//Function to register a new board
db_utils.prototype.regBoard = function (board, board_label, latitude, longitude, altitude, net_enabled, sensorsList, type, description, project_id, user_id, mobile, position_refr_time, notify, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    logger.debug("[SYSTEM] --> Sensors list: " + sensorsList);
    if (sensorsList != "empty")
        var sensorsList2 = sensorsList.split(",");
    else
        sensorsList = [];


    //check if the board already exists
    logger.debug("[SYSTEM] --> Board ID check...");

    connection.query("SELECT board_code FROM boards WHERE board_code =  '" + board + "'", function (err, result) {

        if (result.length == 0) {

            //logger.debug("[SYSTEM] ----> Board " + board_label + " ("+board+") is not registered." );


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

                    connection.query("INSERT INTO boards (board_code, label, session_id, status, net_enabled, type, description, projects_id, users_id, mobile, position_refresh_time, notify) " +
                        "VALUES ('" + board + "', " +
                        "'" + board_label + "'," +
                        "'null'," +
                        "'D', " +
                        "'" + net_enabled + "', " +
                        "'" + type + "', " +
                        "'" + description + "', " +
                        "'" + project_id + "', " +
                        "'" + user_id + "', " +
                        "'" + mobile + "', " +
                        "'" + position_refr_time + "'," +
                        "'" + notify +"')"
                        , function (err, latest_result) {


                        if (err != null) {

                            connection.rollback(function() {
                                logger.error("[SYSTEM] --> Registration error in boards table: " + err);
                                response.result = "ERROR";
                                response.message = "Registration error in boards table!";
                                callback(response);

                            });

                        }
                        else {


                            connection.query("INSERT INTO coordinates (board_id, altitude, longitude, latitude) VALUES ('" + board + "', '" + altitude + "', '" + longitude + "', '" + latitude + "')" , function (err, latest_result) {

                                if (err != null) {

                                    logger.error("[SYSTEM] --> error in coordinates table: " + err);
                                    response.result = "ERROR";
                                    response.message = "Error in coordinates table!";
                                    callback(response);

                                }else{


                                    var values = [];

                                    var query = "INSERT INTO sensors_on_board (id_sensor, id_board) VALUES ?"; //('" + sensorsList2[i] + "', '" + board + "')

                                    if (sensorsList.length > 0) {


                                        for (var i = 0; i < sensorsList2.length; i++) {

                                            (function (i) {

                                                var val = [ sensorsList2[i], board];
                                                values.push(val);

                                                if (i == sensorsList2.length - 1) {

                                                    connection.query(query, [values], function (err, latest_result) {

                                                        if (err != null) {

                                                            connection.rollback(function() {
                                                                logger.error("[SYSTEM] --> Registration error in sensors_on_board table: " + err);
                                                                response.result = "ERROR";
                                                                response.message = "Registration error in sensors_on_board table!";
                                                                callback(response);

                                                            });


                                                        }else{

                                                            connection.commit(function(err) {

                                                                if (err) {

                                                                    connection.rollback(function() {
                                                                        response.result = "ERROR";
                                                                        response.message = err;
                                                                        callback(response);
                                                                    });

                                                                }else{

                                                                    response.result = "SUCCESS";
                                                                    response.message = "Registration successfully completed!";
                                                                    disconn();
                                                                    callback(response);
                                                                }

                                                            });


                                                        }



                                                    });


                                                }


                                            })(i);
                                        }


                                    }else {
                                        
                                        connection.commit(function(err) {

                                            if (err) {

                                                connection.rollback(function() {
                                                    response.result = "ERROR";
                                                    response.message = err;
                                                    callback(response);
                                                });

                                            }else{
                                                
                                                response.result = "SUCCESS";
                                                response.message = "Registration successfully completed!";
                                                disconn();
                                                callback(response);
                                            }

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
            response.message = "The board " + board_label + " ("+board+") already exists!";
            logger.warn("[SYSTEM] ----> " + response.message);
            disconn();
            callback(response);
        }

    });


};

//Function to update a new board
db_utils.prototype.updateBoard = function (board, board_label, latitude, longitude, altitude, net_enabled, sensorList, type, description, project_id, user_id, mobile, position_refr_time, notify, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    //check if the board exists
    logger.debug("[SYSTEM] --> Board ID check...");

    connection.query("SELECT board_code FROM boards WHERE boards.board_code ='" + board + "'", function (err, result) {

        if (result.length != 0) {

            logger.debug("[SYSTEM] --> Updating Iotronic DB for board " + board + "...");

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

                    connection.query("UPDATE boards, coordinates SET boards.label='" + board_label + "', boards.type='" + type + "', boards.description='" + description + "', boards.projects_id='" + project_id + "', " +
                        "coordinates.altitude='" + altitude + "', coordinates.longitude='" + longitude + "', coordinates.latitude='" + latitude + "', " +
                        "boards.users_id='" + user_id + "', boards.mobile='" + mobile + "', boards.net_enabled='" + net_enabled + "', boards.position_refresh_time='" + position_refr_time + "', notify='"+notify+"' " +
                        "WHERE boards.board_code='" + board + "' AND coordinates.board_id='" + board + "'", function (err, latest_result) {

                        if (err != null) {

                            connection.rollback(function() {

                                logger.error("[SYSTEM] --> Updating board data error: " + err);
                                response.result = "ERROR";
                                response.message = "Updating board data error!";
                                callback(response);

                            });

                        }
                        else {

                            logger.debug("[SYSTEM] --> Updating sensor list for board " + board + "...");

                            var sensorList2 = sensorList.split(",");

                            connection.query("DELETE FROM sensors_on_board WHERE id_board='" + board + "';", function (err, result3) {

                                if (err != null) {

                                    connection.rollback(function() {
                                        logger.error("[SYSTEM] --> Cleaning sensor list error in sensors_on_board table: " + err);
                                        response.result = "ERROR";
                                        response.message = "Cleaning sensor list error in sensors_on_board table!";
                                        callback(response);
                                    });

                                }
                                else {

                                    logger.debug("[SYSTEM] --> Cleaning sensor list successfully completed!");

                                    var values = [];
                                    var val = [];
                                    var query = "INSERT INTO sensors_on_board (id_sensor, id_board) VALUES ?"; //('" + sensorList2[i] + "', '" + board + "')


                                    for (var i = 0; i < sensorList2.length; i++) {

                                        (function (i) {

                                            var val = [ sensorList2[i], board];
                                            values.push(val);

                                            if (i == sensorList2.length - 1) {

                                                //logger.warn(values);

                                                connection.query(query, [values], function (err, latest_result) {

                                                    if (err != null) {

                                                        connection.rollback(function() {
                                                            logger.error("[SYSTEM] --> Updating sensor list error in sensors_on_board: " + err);
                                                            response.result = "ERROR";
                                                            response.message = "Updating sensor list error in sensors_on_board table!";
                                                            callback(response);

                                                        });

                                                    }else{

                                                        connection.commit(function(err) {

                                                            if (err) {

                                                                connection.rollback(function() {
                                                                    response.result = "ERROR";
                                                                    response.message = err;
                                                                    callback(response);
                                                                });

                                                            }else{

                                                                disconn();
                                                                logger.info("[SYSTEM] --> Updating board successfully completed!");
                                                                response.result = "SUCCESS";
                                                                response.message = "Board successfully updated in Iotronic!";
                                                                callback(response);
                                                            }

                                                        });

                                                    }


                                                });

                                            }


                                        })(i);

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
            logger.warn("--> The board " + board + " does not exist!");
            disconn();
            response.result = "ERROR";
            response.message = "The board " + board + " does not exist!";
            callback(response);
        }

    });


};

//Function to unregister a new board in IoTronic
db_utils.prototype.unRegBoard = function (board, callback) {

    conn();

    var response = {
        message: {},
        result: ''
    };

    //check if the board already exists
    logger.debug("[SYSTEM] --> Board ID check...");

    connection.query("SELECT board_code FROM boards WHERE board_code =  '" + board + "'", function (err, result) {

        if (result.length != 0) {

            connection.query("DELETE FROM board_codes WHERE code='" + board + "';", function (err, result3) {

                if (err != null) {
                    logger.error("[SYSTEM] --> Unregistration error in board_codes: " + err);
                    response.message = "Unregistration error in board_codes table: " + err;
                    response.result = "ERROR";
                    disconn();
                    callback(response);

                }
                else {
                    logger.info("[SYSTEM] --> Unregistration of the board " + board + " ssuccessfully completed!");
                    response.message = "Unregistration successfully completed!";
                    response.result = "SUCCESS";
                    disconn();
                    callback(response);
                }

            });


        }
        else {

            logger.warn("[SYSTEM] --> The board " + board + " does not exist!");
            response.message = "The board " + board + " does not exist!";
            response.result = "WARNING";
            disconn();
            callback(response);
        }

    });


};

//Function to check if a board exists in IoTronic
db_utils.prototype.checkBoard = function (board_id, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM boards WHERE boards.board_code ='" + board_id + "'", function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn();
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
    
};

//Function to check if a board is connected to Iotronic (WAMP)
db_utils.prototype.checkBoardConnected = function (board_id, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT status FROM boards WHERE boards.board_code ='" + board_id + "'", function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn();
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });

};

//Function to get the information of a board
db_utils.prototype.getBoard = function (board_id, callback) {
    conn();

    var response = {
        message: '',
        result: ''
    };
    
    connection.query("SELECT * FROM boards WHERE boards.board_code ='" + board_id + "'", function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn();
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
        
    });

};

//Function to change the status of the board in DB
db_utils.prototype.changeBoardState = function (board_id, session, state, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("UPDATE boards SET board_code='" + board_id + "',session_id='" + session + "',status='" + state + "' WHERE board_code='" + board_id + "'", function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn();
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
    
};

//Function to get the name and code of a generic driver
db_utils.prototype.getBoardPosition = function (board_id, samples, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT altitude, longitude, latitude, timestamp FROM coordinates WHERE coordinates.board_id = '" + board_id + "' ORDER BY timestamp DESC LIMIT " + samples, function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn();
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};

//Function to find board using session ID
db_utils.prototype.findBySessionId = function (session_id, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM boards WHERE boards.session_id = '" + session_id + "'", function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn();
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};

//Function to add the new board position
db_utils.prototype.addBoardPosition = function (board, latitude, longitude, altitude, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("INSERT INTO coordinates (board_id, latitude, longitude, altitude) VALUES (" + mysql.escape(board) + " , " + mysql.escape(latitude) + " , " + mysql.escape(longitude) + " , " + mysql.escape(altitude) + ")", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};

//Function to get the name and code of a generic driver
db_utils.prototype.getBoardPositionHistory = function (board_id, interval, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT altitude, longitude, latitude, timestamp FROM coordinates WHERE coordinates.board_id = '" + board_id + "' AND timestamp between (CURDATE() - INTERVAL "+interval+" ) and CURDATE()", function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn();
            callback(response);

        }
        else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};








///////////////////////////////////////////
//           LAYOUTS MANAGEMENT          //
///////////////////////////////////////////
//Function to get board layouts list managed by IoTronic
db_utils.prototype.getLayoutList = function (callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM layouts", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn();
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }

    });

};

//Function to get the board layout details
db_utils.prototype.getLayoutById = function (layout_id, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM layouts WHERE id_layout = '" + layout_id + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }



    });

};

//Function to create a new board layout
db_utils.prototype.createLayout = function (model, manufacturer, image, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("INSERT INTO layouts (model, manufacturer, image) VALUES (" + mysql.escape(model) + " , " + mysql.escape(manufacturer) + " , " + mysql.escape(image) + ")", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};

//Function to delete a board layout from IoTronic
db_utils.prototype.deleteLayoutById = function (layout_id, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("DELETE FROM layouts WHERE id_layout=" + layout_id, function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};

//Function to update a board layout
db_utils.prototype.updateLayoutById = function  (layout_id, model, manufacturer, image, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("UPDATE layouts SET model = '" + model + "', manufacturer = '" + manufacturer + "', image = '" + image + "' WHERE id_layout=" + layout_id, function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = "UPDATE error in layout table: " + err;
            logger.error(response.message);
            disconn();
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn();
            callback(response);
        }
    })
};

//Function to get the board layout details by board ID
db_utils.prototype.getLayoutByBoardId = function (board_id, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT layouts.id_layout, layouts.model, layouts.manufacturer, layouts.image FROM layouts, boards WHERE boards.type = layouts.id_layout AND boards.board_code = '" + board_id + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }



    });

};



///////////////////////////////////////////
//           PROJECTS MANAGEMENT         //
///////////////////////////////////////////
//Function to get IoTronic projects list
db_utils.prototype.getProjectList = function (callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM projects", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn();
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }

    });

};

//Function to create a new IoTronic project
db_utils.prototype.createProject = function (project_id, name, description, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("INSERT INTO projects (uuid, name, description) VALUES (" + mysql.escape(project_id) + " , " + mysql.escape(name) + " , " + mysql.escape(description) + ")", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};

//Function to get the IoTronic project details
db_utils.prototype.getProject = function (project_id, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM projects WHERE uuid = '" + project_id + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }



    });

};

//Function to delete an IoTronic project
db_utils.prototype.deleteProject = function (project_id, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("DELETE FROM projects WHERE uuid='" + project_id +"'", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};

//Function to update an IoTronic project
db_utils.prototype.updateProject = function  (project_id, name, description, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("UPDATE projects SET name = '" + name + "', description = '" + description + "' WHERE uuid='" + project_id +"'", function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = "UPDATE error in projects table: " + err;
            disconn();
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn();
            callback(response);
        }
    })
};






///////////////////////////////////////////
//             USERS MANAGEMENT          //
///////////////////////////////////////////
//Function to get projects list
db_utils.prototype.getUserList = function (callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM users", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn();
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }

    });

};

//Function to create a new IoTronic user
db_utils.prototype.createUser = function (user_id, username, password, email, f_name, l_name, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("INSERT INTO users (uuid, username, password, email, first_name, last_name) VALUES (" + mysql.escape(user_id) + " , " + mysql.escape(username) + " , " + mysql.escape(password) + " , " + mysql.escape(email) + " , " + mysql.escape(f_name) + " , " + mysql.escape(l_name) + ")", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};

//Function to get the IoTronic user details
db_utils.prototype.getUser = function (user_id, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM users WHERE uuid = '" + user_id + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }



    });

};

//Function to delete an IoTronic user
db_utils.prototype.deleteUser = function (user_id, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("DELETE FROM users WHERE uuid='" + user_id +"'", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};

//Function to update an IoTronic user
db_utils.prototype.updateUser = function  (user_id, username, password, email, f_name, l_name, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("UPDATE users SET username = '" + username + "', password = '" + password + "', email = '" + email + "', first_name = '" + f_name + "', last_name = '" + l_name + "' WHERE uuid='" + user_id +"'", function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = "UPDATE error in users table: " + err;
            disconn();
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn();
            callback(response);
        }
    })
};

//Function to get user by board ID
db_utils.prototype.getUserByBoard = function (board_id, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM users, boards WHERE boards.users_id = users.uuid AND boards.board_code = '"+board_id+"'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn();
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }

    });

};



///////////////////////////////////////////
//           SERVICES MANAGEMENT         //
///////////////////////////////////////////

//Function to get the services list
db_utils.prototype.getServicesList = function (callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM services", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getServicesList: " + err);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });

};

//Function to get the service details
db_utils.prototype.getServiceByName = function (serviceName, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM services WHERE name = '" + serviceName + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getServiceByName: " + err);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }



    });

};

//Function to get the service details
db_utils.prototype.getServiceById = function (serviceId, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM services WHERE id = '" + serviceId + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getServiceById: " + err);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }



    });

};

//Function to register a new service
db_utils.prototype.registerService = function (serviceName, port, protocol, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("INSERT INTO services (name, port, protocol) VALUES (" + mysql.escape(serviceName) + " , " + mysql.escape(port) + " , " + mysql.escape(protocol) + ")", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};

//Function to update a service
db_utils.prototype.updateService = function  (service, serviceName, port, protocol, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("UPDATE services SET name = '" + serviceName + "', port = '" + port + "', protocol = '" + protocol + "' WHERE name='" + service + "'", function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = "UPDATE error in service table: " + err;
            logger.error(response.message);
            disconn();
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn();
            callback(response);
        }
    })
};

//Function to delete a service from IoTronic
db_utils.prototype.deleteService = function (serviceName, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("DELETE FROM services WHERE name=" + mysql.escape(serviceName), function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};

//Function to get the list of active services
db_utils.prototype.getActiveService = function (service_id, board_id, callback) {
    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM active_services WHERE board_id = '" + board_id + "' AND service_id = '" + service_id + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getActiveService: " + response.message);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }

    });

};

//Function to get the list of active services for a board
db_utils.prototype.getBoardServices = function (board_id, callback) {
    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT services.name as service_name, active_services.service_id, active_services.public_port, services.port as local_port, services.protocol, active_services.last_update  FROM active_services, services WHERE active_services.service_id = services.id AND active_services.board_id = '" + board_id + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getActiveService: " + response.message);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }

    });

};

//Function to register a new tunnel for a service of a board
db_utils.prototype.registerTunnel = function (service_name, board_id, public_port, callback) {
    conn();

    //Find the id of the plugin whose name is pluginname
    var service_id;

    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT id FROM services WHERE name = '" + service_name + "'", function (err, result) {

        if (err) {
            logger.error("registerTunnel: " + err);
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);

        } else {

            service_id = result[0].id;

            connection.query("INSERT INTO active_services (service_id, board_id, public_port) VALUES ('" + service_id + "','" + board_id + "','" + public_port + "')", function (err, result) {
                if (err) {
                    logger.error("registerTunnel: " + err);
                    response.message = err;
                    response.result = "ERROR";
                    disconn();
                    callback(response);

                } else {
                    response.message = "Tunnel for service " + service_name + " registered!"
                    response.result = "SUCCESS";
                    disconn();
                    callback(response);

                }

            });

        }

    });
};

//Fuction to disable the tunnel for a service of a specific board
db_utils.prototype.removeTunnel = function (service_id, board_id, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
     
    connection.query("DELETE FROM active_services WHERE  service_id ='" + service_id + "' AND board_id ='" + board_id + "'" , function (err, result) {

        if (err != null) {
            logger.error("removeTunnel: " + err);
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }

    });
    

};

//Function to check if a specific port is already used
db_utils.prototype.checkPort = function (s_port, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM reverse_cloud_services WHERE reverse_cloud_services.public_port='" + s_port + "'", function (err, result) {

        if (err != null) {
            logger.error("checkPort: " + err);
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        }
        else{
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }

    });


};





///////////////////////////////////////////
//           PLUGINS MANAGEMENT          //
///////////////////////////////////////////

//Function to get the sensors list
db_utils.prototype.getPluginList = function (callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM plugins", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getPluginList: " + err);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
    
};

//Function to insert a plugin into the database
db_utils.prototype.insertCreatedPlugin = function (pluginname, plugincategory, pluginjsonschema, plugincode, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("INSERT INTO plugins (name, category, jsonschema, code) VALUES (" + mysql.escape(pluginname) + " , " + mysql.escape(plugincategory) + " , " + mysql.escape(pluginjsonschema) + " , " + mysql.escape(plugincode) + ")", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};

//Function to delete a plugin from database
db_utils.prototype.deletePlugin = function (pluginname, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("DELETE FROM plugins WHERE name=" + mysql.escape(pluginname), function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};

//Function to get the plugin details
db_utils.prototype.getPlugin = function (pluginName, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    //connection.query("SELECT id, name, code FROM plugins WHERE name = '" + pluginName + "'", function (err, result) {
    connection.query("SELECT * FROM plugins WHERE name = '" + pluginName + "'", function (err, result) {
        
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getPlugin: " + err);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }


        
    });
    
};

//Function to get the key boardId-pluginId from table plugins_injected
db_utils.prototype.getInjectedPlugin = function (plugin_id, board, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT * FROM plugins_injected WHERE board_id = '" + board + "' AND plugin_id = '" + plugin_id + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getInjectedPlugin: " + err);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
        
    });
    
};

//Function to update the plugin status of a specific board
db_utils.prototype.updatePluginStatus = function (board, pluginname, status, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    //Find the id of the plugin whose name is pluginname
    var plugin_id;
    connection.query("SELECT id FROM plugins WHERE name = '" + pluginname + "'", function (err, result) {

        if (err) {
            response.message = "updatePluginStatus (select): " + err;
            response.result = "ERROR";
            logger.error(response.message);
            disconn();
            callback(response);
            
        } else {
            plugin_id = result[0].id;
            connection.query("UPDATE plugins_injected SET state = '" + status + "', latest_change=NOW() WHERE board_id='" + board + "' AND plugin_id='" + plugin_id + "'", function (err, result) {
                if (err) {
                    response.message = "updatePluginStatus (update): " + err;
                    response.result = "ERROR";
                    disconn();
                    callback(response);
                    
                } else {
                    response.message = "Plugin \"" + pluginname + "\" status updated: " + status;
                    response.result = "SUCCESS";
                    disconn();
                    callback(response);
                }
                
            });

        }

    });
};

//Function to get the plugin list on a board
db_utils.prototype.BoardPlugins = function (board, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT plugins.name, plugins.id, plugins.category, plugins_injected.state FROM plugins_injected, plugins WHERE plugins_injected.board_id = '" + board + "' AND plugins_injected.plugin_id = plugins.id", function (err_plugin, result_plugin) {

        if (err_plugin != null) {
            response.result = "ERROR";
            response.message = err_plugin;
            logger.error(response.result + " - " + err_plugin);
            disconn();
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result_plugin;
            disconn();
            callback(response);
        }

    });

};

//Function to get the id of a plugin
db_utils.prototype.getPluginCategory = function (pluginName, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT category FROM plugins WHERE name = '" + pluginName + "' ORDER BY id desc limit 1", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getPluginCategory: " + err);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
        
    });
    
};

//Function to remove a plugin that was injected in a board
db_utils.prototype.deleteInjectedPlugin = function (board, plugin_id, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("DELETE FROM plugins_injected WHERE board_id='" + board + "' AND plugin_id='" + plugin_id + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("deleteInjectedPlugin: " + err);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
        
    });


};

//Function to write that a plugin has been injected in a board to the proper table
db_utils.prototype.insertInjectedPlugin = function (board, pluginname, callback) {
    conn();
    //Find the id of the plugin whose name is pluginname
    var plugin_id;
    
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT id FROM plugins WHERE name = '" + pluginname + "'", function (err, result) {

        if (err) {
            logger.error("insertInjectedPlugin: " + err);
            response.message = err;
            response.result = "ERROR";
            disconn();
            callback(response);

        } else {
            plugin_id = result[0].id;

            connection.query("INSERT INTO plugins_injected (board_id, plugin_id, state) VALUES ('" + board + "','" + plugin_id + "', 'injected')", function (err, result) {
                if (err) {
                    logger.error("insertInjectedPlugin: " + err);
                    response.message = err;
                    response.result = "ERROR";
                    disconn();
                    callback(response);
                    
                } else {
                    response.message = "plugin_id: " + plugin_id;
                    response.result = "SUCCESS";
                    disconn();
                    callback(response);
                    
                }
                
            });

        }

    });
};












//////////////////////////////////////
//         VNET MANAGEMENT          //
//////////////////////////////////////

//Function to get the VNETs list
db_utils.prototype.getVnetsList = function (callback) {
    conn();
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
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
};

//Function to insert new VNET
db_utils.prototype.insertVNET = function (vlan_ip, vlan_mask, net_uuid, vlan_name, callback) {

    conn();

    logger.debug("[VNET] --> registering new VNET in DB...");

    var response = {
        message: '',
        result: ''
    };

    //socat ID creation related to the new board FOREVER
    connection.query("INSERT INTO vlans (vlan_ip, vlan_mask, net_uuid, vlan_name) VALUES ('" + vlan_ip + "', '" + vlan_mask + "', '" + net_uuid + "', '" + vlan_name + "' )", function (err, result) {

        if (err != null) {

            response.message = err;
            response.result = "ERROR";
            logger.error("[VNET] ----> insertVNET - INSERT error in vlans tables: " + response.message);
            disconn();
            callback(response);

        } else {

            response.message = result.insertId;
            response.result = "SUCCESS";
            logger.debug("[VNET] ----> insertVNET - new vlan ID ("+result.insertId+") selected from DB.");
            disconn();
            callback(response);

        }

    });


};

//Function to insert new Addresses of a new VNET
db_utils.prototype.insertAddresses = function (list_ip, net_uuid, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    logger.debug("[VNET] --> Creating the addresses poll for the new VLAN " + net_uuid);

    var query = "INSERT INTO free_addresses (vlans_id, ip, insert_date) VALUES ";
    var getVID = "SELECT id FROM vlans WHERE net_uuid='" + net_uuid + "' ";
    
    connection.query(getVID, function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("[VNET] ----> insertAddresses - Error getting VNET id in vlans table: " + response.message);
            disconn();
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
                                disconn();
                                callback(response);

                            } else {

                                response.message = result;
                                response.result = "SUCCESS";
                                logger.debug("[VNET] ----> insertAddresses - New addresses pool successfully created for VNET "+net_uuid);
                                disconn();
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

    conn();

    var response = {
        message: '',
        result: ''
    };
    
    connection.query("select boards.label AS board_NAME, id_board AS board_ID, vlans.vlan_name AS vlan_NAME, vlans_connection.id_vlan AS vlan_ID, vlans_connection.ip_vlan AS vlan_IP,  socat_connections.id AS socat_ID, socat_connections.ip_board AS socat_IP, socat_connections.port AS socat_PORT from socat_connections,vlans_connection, vlans, boards where socat_connections.id = vlans_connection.id_socat_connection AND boards.board_code = socat_connections.id_board AND id_vlan = vlans.id AND vlans.net_uuid='" + net_uuid + "'", function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn();
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result;
            disconn();
            callback(response);
        }

    });


};

//Function to destroy a VNET
db_utils.prototype.destroyVNET = function (net_uuid, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("DELETE FROM vlans WHERE vlans.net_uuid='" + net_uuid + "'", function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn();
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result;
            disconn();
            callback(response);
        }

    });


};

//Function to get the net_enabled id of a board
db_utils.prototype.getNetEnabledId = function (board, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };
    
    //select net_enabled from user_boards where board_code=30303030
    connection.query("SELECT net_enabled FROM boards WHERE board_code = '" + board + "'", function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("SELECT error in user_boards tables: " + err);
            disconn();
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result;
            disconn();
            callback(response);
        }

    });
    
};

//Function to get first valid address
db_utils.prototype.checkAddressPool = function (net_uuid, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    query = "select ip from free_addresses where vlans_id = (SELECT id FROM vlans WHERE net_uuid='" + net_uuid + "' ) ORDER BY insert_date, ip ASC limit 1";

    connection.query(query, function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("[VNET] --> checkAddressPool " + response.result + ": " + err);
            disconn();
            callback(response);
        }
        else {

            response.message = result;

            if (result.length != 0) {
                response.result = "SUCCESS";
                logger.debug("[VNET] --> " + JSON.stringify(result));
                disconn();
                callback(response);
            }
            else {
                response.result = "NO-IP";
                logger.debug("[VNET] --> " + JSON.stringify(result));
                disconn();
                callback(response);
            }

        }

    });


};

//Function to get VNET info
db_utils.prototype.getVnet = function (net_uuid, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };
    
    //get the socat ID just created before
    connection.query("SELECT * FROM vlans WHERE net_uuid='" + net_uuid + "'", function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("getVnet - Error selecting vlans: " + err);
            disconn();
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn();
            callback(response);
        }


    });


};

//Function to check if a board is already connected to a VNET
db_utils.prototype.checkBoardIntoVLAN = function (board, net_uuid, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT EXISTS(  SELECT id_vlan, id_socat_connection FROM vlans_connection WHERE id_vlan = (SELECT id FROM vlans WHERE net_uuid='" + net_uuid + "' )  AND id_socat_connection=(SELECT id FROM socat_connections WHERE id_board='" + board + "' )  ) AS found", function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("Error checking board in VNET: " + err);
            disconn();
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result;
            disconn();
            callback(response);
        }
    });

};

//Function to get the socat ID of a board
db_utils.prototype.getSocatConn = function (board, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT id, port FROM socat_connections WHERE id_board='" + board + "'", function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("SELECT error in socat_connection tables: " + err);
            disconn();
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn();
            callback(response);
        }

    });

};

//Function to check if the USER ip is free
db_utils.prototype.checkAssignedVlanIP = function (user_ip, vlan_id, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT EXISTS(  SELECT vlans_id, ip FROM free_addresses WHERE vlans_id ='" + vlan_id + "' AND ip ='" + user_ip + "' ) AS found", function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("--> checkAssignedVlanIP ERROR: " + err);
            disconn();
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
                        disconn();
                        callback(response);
                    }
                    else {
                        response.result = "SUCCESS";
                        response.message = result;
                        disconn();
                        callback(response);
                    }

                });

            } else {
                response.result = "NOT-AVAILABLE";
                response.message = result;
                disconn();
                callback(response);
            }


        }

    });


};

//Function to get first valid address
db_utils.prototype.getFreeAddress = function (net_uuid, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    //SELECT id, ip  FROM vlans, free_addresses WHERE net_uuid='85268bf8-55d6-42b2-8ce5-fb89cc2101ae' AND vlans.id=free_addresses.vlans_id;
    query = "select ip from free_addresses where vlans_id = (SELECT id FROM vlans WHERE net_uuid='" + net_uuid + "' ) ORDER BY insert_date, ip ASC limit 1";

    connection.query(query, function (err, ip_result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("[VNET] --> " + response.result + " - " + err);
            disconn();
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
                        disconn();
                        callback(response);
                    }
                    else {
                        response.message = ip_result;
                        response.result = "SUCCESS";
                        disconn();
                        callback(response);
                    }

                });

            }
            else {
                response.result = "NO-IP";
                response.message = ip_result;
                logger.warn(response.result + " - " + JSON.stringify(ip_result) + " err " + err);
                disconn();
                callback(response);
            }

        }

    });


};

//Function to insert new VNET connection
db_utils.prototype.insertVnetConnection = function (vlan_ip, net_uuid, id_board, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT EXISTS(SELECT 1 FROM vlans_connection WHERE ip_vlan ='" + vlan_ip + "' LIMIT 1) AS found", function (err, result) {
        if (err != null) {
            logger.warn("[VNET] ----> insertVnetConnection - Select error in checking ip_vlans table: " + err);
            response.message = err;
            response.result = 'ERROR';
            disconn();
            callback(response);

        } else {

            if (result[0].found == 1) {
                logger.debug("[VNET] ----> insertVnetConnection - VNET connection already exists: " + result[0].id);
                response.message = result;
                response.result = result[0].found;
                disconn();
                callback(response);
            }
            else {
                
                //Socat ID related to the new board assigned "forever"
                connection.query("INSERT INTO vlans_connection (id_vlan, id_socat_connection,ip_vlan) VALUES ((select id from vlans where net_uuid='" + net_uuid + "'), (select id from socat_connections where id_board='" + id_board + "'), '" + vlan_ip + "')", function (err, result) {

                    if (err != null) {

                        logger.warn("[VNET] ----> insertVnetConnection - INSERT error in vlans_connection tables: " + err);
                        response.message = err;
                        response.result = 'ERROR';
                        disconn();
                        callback(response);

                    } else {
                        logger.debug("[VNET] ----> insertVnetConnection - registering new VNET connection completed!");
                        response.message = result;
                        response.result = 'SUCCESS';
                        disconn();
                        callback(response);

                    }

                });

            }


        }

    });


};

//Function to get the socat status of a board
db_utils.prototype.getSocatStatus = function (board, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };
    
    connection.query("SELECT status FROM socat_connections WHERE id_board='" + board + "'", function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("SELECT error in socat_connection tables: " + err);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }


    });
};

//Function to get the net_enabled id of a board
db_utils.prototype.getSocatConf = function (board, basePort, socatNetwork, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT id FROM socat_connections WHERE id_board='" + board + "'", function (err, result) {

        if (err != null) {

            response.result = "ERROR";
            response.message = err;
            logger.error("Error selecting id in socat_connections table: " + err);
            disconn();
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
                        disconn();
                        callback(response);

                    }else{

                        //socat ID creation related to the new board FOREVER
                        connection.query("INSERT INTO socat_connections (id_board, status, port, ip_board, ip_server) VALUES ('" + board + "', 'noactive', 0, 'None', 'None' )", function (err, result) {

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
                                                disconn();
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
                connection.query("SELECT id, ip_board, ip_server, port FROM socat_connections WHERE id_board='" + board + "'", function (err, result) {

                    if (err != null) {
                        response.result = "ERROR";
                        response.message = err;
                        logger.error("Error selecting Socat connection info in socat_connections table: " + err);
                        disconn();
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
                        
                        disconn();
                        callback(response);

                    }
                    
                });

            }

        }
    });

};

//Function to update the Socat status of a board
db_utils.prototype.updateSocatStatus = function (board, status, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("UPDATE socat_connections SET status = '" + status + "' WHERE id_board='" + board + "'", function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = "UPDATE error in socat_connection tables: " + err;
            logger.error(response.message);
            disconn();
            callback(response);
        } else {
            response.result = "SUCCESS";
            response.message = result;
            disconn();
            callback(response);
        }
    })
};

//Function to remove board from a VNET
db_utils.prototype.removeBoardFromVlan = function (board_id, net_uuid, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    query = "select ip_vlan from vlans_connection where id_vlan = (SELECT id FROM vlans WHERE net_uuid='" + net_uuid + "' )  and id_socat_connection = (SELECT id FROM socat_connections WHERE id_board='" + board_id + "' )";

    connection.query(query, function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error("removeBoardFromVlan - Error getting VNET info: " + err);
            disconn();
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

                                connection.query("INSERT INTO free_addresses (vlans_id, ip, insert_date) VALUES ( (SELECT id FROM vlans WHERE net_uuid='" + net_uuid + "' ), '" + board_ip + "', NOW())", function (err, result) {

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
                                                disconn();
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
                disconn();
                callback(response);
            }
            
        }

    });


};

//Function to get VLANs of a board
db_utils.prototype.getBoardVLAN = function (board, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT vlan_name, ip_vlan, net_uuid FROM vlans, vlans_connection, socat_connections WHERE id_socat_connection = (select id from socat_connections where id_board='" + board + "') AND vlans_connection.id_socat_connection = socat_connections.id AND vlans_connection.id_vlan = vlans.id", function (err, result) {
        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            disconn();
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result;
            disconn();
            callback(response);
        }

    });
};






/*
//Function to get the socat ID of a board
db_utils.prototype.getSocatPort = function (board, callback) {

    conn();

    connection.query("SELECT port FROM socat_connections WHERE id_board='" + board + "'", function (err, result) {

        if (err != null) {
            logger.error("SELECT error in socat_connection tables: " + err);
            disconn();
            //callback(result);
        } else {
            disconn();
            callback(result);
        }


    });

};

//Function to delete a VLAN
db_utils.prototype.deleteVlan = function (net_uuid, callback) {

    conn();

    //delete from vlans where vlan
    connection.query("DELETE FROM vlans WHERE net_uuid='" + net_uuid + "'", function (err, result) {

        if (err != null) {
            logger.error("deleteVlan - DELETE error in vlans tables: " + err);
            disconn();
        } else {

            logger.info("--> Deleted VLAND with ID: " + result[0].id);

            disconn();
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

    conn();
    logger.info("[VNET] --> Saving the port into the db " + port.id);

    var query = util.format("INSERT INTO ports (uuid,mac_address,ip_address,board_uuid,net_uuid) VALUES ('%s','%s','%s','%s','%s')", port.id, port.macAddress, port.fixedIps[0].ip_address, board_uuid, port.networkId);

    logger.debug("[VNET] --> query: " + query);

    connection.query(query, function (err, result) {
        callback(err, result)
        disconn();
    });


}

//Function to get Port
db_utils.prototype.getPort = function (net_uuid, board_uuid, callback) {
    conn();
    logger.info("[VNET] --> Getting the port for the board " + board_uuid + " on the network " + net_uuid);

    var query = util.format("select uuid from ports where board_uuid='%s' and net_uuid='%s'", board_uuid, net_uuid);

    logger.debug("[VNET] --> query: " + query);

    connection.query(query, function (err, result) {
        callback(err, result)
        disconn();
    });


}

//Function to delete Port
db_utils.prototype.deletePort = function (port, callback) {

    conn();
    logger.info("[VNET] --> Deleting the port into the db " + port);


    var query = util.format("delete from ports where uuid='%s'", port);

    logger.debug("[VNET] --> query: " + query);

    connection.query(query, function (err, result) {
        callback(err, result)
        disconn();
    });


};

//Function to get all Ports for a board
db_utils.prototype.getAllPorts = function (board_uuid, callback) {
    conn();
    logger.info("[VNET] --> Getting all the ports for the board " + board_uuid);

    var query = util.format("select * from ports where board_uuid='%s'", board_uuid);
    logger.debug("[VNET] --> query: " + query);

    connection.query(query, function (err, result) {
        disconn();
        callback(err, result)
    });
};










///////////////////////////////////////////
//           DRIVERS MANAGEMENT          //
///////////////////////////////////////////

//Function to get the drivers list
db_utils.prototype.getDriverList = function (callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM drivers", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getDriverList: " + response.message);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });

};

//Function to get the of injected driver of a board
db_utils.prototype.getBoardDriverList = function (board, callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT drivers.name, drivers_injected.state, drivers_injected.latest_change FROM drivers_injected, drivers WHERE drivers.id = drivers_injected.driver_id AND drivers_injected.board_id = '" + board + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getBoardDriverList: " + response.message);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }

    });

};

//Function to get the id of a driver
db_utils.prototype.getDriverId = function (drivername, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT id, name FROM drivers WHERE name = '" + drivername + "'", function (err, result) {

        if (err != null) {
            disconn();
            response.result = "ERROR";
            response.message = err;
            logger.error("getDriverId: " + response.message);
            callback(response);
        }
        else {
            disconn();
            response.result = "SUCCESS";
            response.message = result;
            callback(response);
        }

    });

};

//Function to insert a driver into the database
db_utils.prototype.insertCreatedDriver = function (drivername, driverjson, drivercode, callback) {
    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("INSERT INTO drivers (name, jsonschema, code) VALUES (" + mysql.escape(drivername) + " , " + mysql.escape(driverjson) + " , " + mysql.escape(drivercode) + ")", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("insertCreatedDriver: " + response.message);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }


    });
};

//Function to get the key boardId-driverId from table drivers_injected
db_utils.prototype.getInjectedDriver = function (driver_id, board, callback) {
    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT board_id, driver_id, state, latest_change FROM drivers_injected WHERE board_id = '" + board + "' AND driver_id = '" + driver_id + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getInjectedDriver: " + response.message);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }

    });

};

//Function to remove a driver that was injected in a board
db_utils.prototype.deleteInjectedDriver = function (board, driver_id, callback) {
    conn();

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
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });


};

//Function to get the name and code of a generic driver
db_utils.prototype.getDriver = function (driverId, callback) {
    conn();

    var response = {
        message: '',
        result: ''
    };
    
    connection.query("SELECT name, code, jsonschema FROM drivers WHERE id = '" + driverId + "'", function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getDriver: " + response.message);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
        
    });
    disconn();
};

//Function to write that a driver has been injected in a board to the proper table
db_utils.prototype.insertInjectedDriver = function (board, drivername, callback) {
    conn();


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
            disconn();
            callback(response);

        } else {

            driver_id = result[0].id;

            connection.query("INSERT INTO drivers_injected (board_id, driver_id, state) VALUES ('" + board + "','" + driver_id + "', 'injected')", function (err, result) {
                if (err) {
                    response.message = err;
                    response.result = "ERROR";
                    logger.error("insertInjectedDriver INSERT: " + response.message);
                    disconn();
                    callback(response);
                } else {
                    response.message = driver_id;
                    response.result = "SUCCESS";
                    disconn();
                    callback(response);

                }

            });

        }

    });
};

//Function to delete a driver from Iotronic database
db_utils.prototype.deleteDriver = function (drivername, callback) {
    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("DELETE FROM drivers WHERE name=" + mysql.escape(drivername), function (err, result) {

        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getDriver: " + response.message);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
        
    });
};

//Function to update the driver status of a specific board
db_utils.prototype.updateDriverStatus = function (board, drivername, status, callback) {
    conn();

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
            disconn();
            callback(response);

        } else {
            driver_id = result[0].id;
            connection.query("UPDATE drivers_injected SET state = '" + status + "', latest_change=NOW() WHERE board_id='" + board + "' AND driver_id='" + driver_id + "'", function (err, result) {

                if (err) {
                    response.message = err;
                    response.result = "ERROR";
                    logger.error("updateDriverStatus UPDATE: " + response.message);
                    disconn();
                    callback(response);
                } else {
                    response.message = "driver " + drivername + " status: " + status;
                    response.result = "SUCCESS";
                    disconn();
                    callback(response);

                }

            });

        }

    });
};

//Function to remove a driver that was injected in a board
db_utils.prototype.deleteInjectedDriver = function (board, driver_id, callback) {
    conn();
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
            disconn();
            callback(response);
            
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
            
        }
        
    });


};






///////////////////////////////////////
//          VFS MANAGEMENT          //
//////////////////////////////////////

//Function to insert a mountpoint into the database
db_utils.prototype.insertMountpoint = function (board, mountpoint, src_board, src_path, status, callback) {
    
    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("INSERT INTO mountpoints (src_board, src_path, dst_board, dst_path, status) VALUES ('" + src_board + "','" + src_path + "','" + board + "','" + mountpoint + "','" + status + "')", function (err, result) {
        if (err) {
            response.message = err;
            response.result = "ERROR";
            logger.error("insertMountpoint INSERT: " + response.message);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);

        }

    });
    
};

//Function to delete a mountpoint from Iotronic database
db_utils.prototype.deleteMountpoint = function (board, mountpoint, src_board, src_path, callback) {
    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("DELETE FROM mountpoints WHERE dst_board='" + board + "' AND src_board='" + src_board + "' AND dst_path='" + mountpoint + "' AND src_path='" + src_path + "' ;", function (err, result) {
        
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error(response.result + " - " + err);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });
    
};

//Function to get the mountpoints list
db_utils.prototype.getMountpointsList = function (callback) {

    conn();

    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT * FROM mountpoints", function (err, result) {
        if (err != null) {
            response.message = err;
            response.result = "ERROR";
            logger.error("getDriverList: " + response.message);
            disconn();
            callback(response);
        } else {
            response.message = result;
            response.result = "SUCCESS";
            disconn();
            callback(response);
        }
    });

};

//Function to get the mountpoints list on a board
db_utils.prototype.BoardMountpoints = function (board, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };
    connection.query("SELECT dst_path, src_board, src_path FROM mountpoints WHERE dst_board = '" + board + "';", function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error(response.result + " - " + err);
            disconn();
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result;
            disconn();
            callback(response);
        }

    });

};

//check if mountpoint is already mounted
db_utils.prototype.checkBoardMountpoint = function (board, mountpoint, callback) {
    conn();
    var response = {
        message: '',
        result: ''
    };

    connection.query("SELECT dst_path, src_board, src_path FROM mountpoints WHERE dst_board = '" + board + "' AND dst_path = '" + mountpoint + "' AND status = 'mounted';" , function (err, result) {

        if (err != null) {
            response.result = "ERROR";
            response.message = err;
            logger.error(response.result + " - " + err);
            disconn();
            callback(response);
        }
        else {
            response.result = "SUCCESS";
            response.message = result;
            disconn();
            callback(response);
        }

    });

};





module.exports = db_utils;
