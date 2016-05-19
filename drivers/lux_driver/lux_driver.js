var fs = require('fs');

var pin = 'A1';

exports.read_pin = function(cb){
    cb(pin);
}

exports.write_pin = function(content, cb){
    pin = content;
    cb(); 
}


exports.read_ldr = function(cb){
    var voltage = fs.readFileSync('/sys/bus/iio/devices/iio:device0/in_voltage_'+pin+'_raw', 'utf8'); 
    
    var ldr = (2500/(5-voltage*0.004887)-500)/3.3;

    cb(ldr);
}

