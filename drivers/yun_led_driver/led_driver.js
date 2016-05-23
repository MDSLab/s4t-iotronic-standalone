var fs = require('fs');

/* ONLY FOR Arduino YUN */
var pin = 'D13';

/*
cd /sys/class/gpio/
echo 115 > export
echo out > D13/direction
echo 1 > D13/value
*/

exports.read_led = function(cb){
    var led = fs.readFileSync('/sys/class/gpio/'+pin+'/value', 'utf8')
    cb(led);
}

exports.write_led = function(content, cb){
    fs.writeFileSync('/sys/class/gpio/'+pin+'/value', content, 'utf8')
    cb(); 
}



