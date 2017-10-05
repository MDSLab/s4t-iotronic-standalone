/*
 Apache License
 Version 2.0, January 2004
 http://www.apache.org/licenses/

 Copyright (c) 2017 Nicola Peditto

*/

var bcrypt = require('bcrypt');

var encryptPassword = function (user_pw, callback) {

    var response = {
        message: '',
        result: ''
    };

    bcrypt.hash(user_pw, 5, function(err, bcryptedPassword) {

        if (err) {
            response.message = "Error encrypting user password: " + err.message;
            response.result = "ERROR";
            callback(response);

        } else {
            response.message = bcryptedPassword;
            response.result = "SUCCESS";
            callback(response);
        }

    });


};


args = process.argv;
console.log("Password:" + args[2]);
admin_pw = args[2];

encryptPassword(admin_pw, function (response) {

    console.log("Encrypted Admin Token: " + response.message)

});
