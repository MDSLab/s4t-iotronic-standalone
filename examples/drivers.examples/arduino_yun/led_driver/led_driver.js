var fs = require('fs');

var pin = 'D13';

/* ONLY FOR Arduino YUN 
cd /sys/class/gpio/
echo 115 > export
echo out > D13/direction
echo 1 > D13/value
*/


exports.init = function(cb){
 
    /* ONLY FOR Arduino YUN */
    
    var init_response = {};

    init_response.message = "Initialization completed!";
    init_response.result = "SUCCESS";
    cb(init_response);
    
};

exports.finalize = function(cb){
  
    var end_result = "Pre-unmounting procedures completed!";
    cb(end_result);
    
};


exports.read_led = function(cb){
    var led = fs.readFileSync('/sys/class/gpio/'+pin+'/value', 'utf8');
    cb(led);
};

exports.write_led = function(content, cb){
    fs.writeFileSync('/sys/class/gpio/'+pin+'/value', content, 'utf8');
    cb(); 
};



