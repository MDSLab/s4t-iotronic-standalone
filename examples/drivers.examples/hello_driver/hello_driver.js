var fs = require('fs');

var user_ans = "";
var hello_extra = "";

exports.init = function(cb){
    
    var init_response = {};

    init_response.message = "Initialization completed!";
    init_response.result = "SUCCESS";
    cb(init_response);
    
};

exports.finalize = function(cb){
  
    var end_result = "Pre-unmounting procedures completed!";
    cb(end_result);
    
};


exports.read_hello = function(cb){
    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
    if (user_ans != "" && user_ans != undefined)
        hello_extra = "\nUser answer me: " + user_ans;
    var hello = "Hello by IoTronic driver at " + localISOTime + "\n" + hello_extra;
    cb(hello);
};

exports.write_hello = function(content, cb){
    user_ans = content;
    cb();
};



