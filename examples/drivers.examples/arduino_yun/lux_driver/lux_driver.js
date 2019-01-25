var fs = require('fs');

var pin = 'A1';

exports.init = function(cb){
 
    /* ONLY FOR Arduino YUN */
    
    var init_response = {};
    
    // ENABLING YUN DEVICE "device_0"
    var device0_file = '/sys/bus/iio/devices/iio:device0/enable';
    console.log('[DRIVER] --> Enabling GPIO device for '+device+': ' + device0_file);
    fs.writeFile(device0_file, '1', function(err) {
      
	if(err) {
	  
	    //console.log('[DRIVER] --> Error writing device0 file: ' + err);
	    init_response.message = "Error writing device0 file: " + err;
	    init_response.result = "ERROR";
	    cb(init_response);
	    
	} else {
	  
	    //console.log("[DRIVER] -->  device0 successfully enabled!");
	    init_response.message = "Initialization completed!";
	    init_response.result = "SUCCESS";
	    cb(init_response);
	}
	
    });

};

exports.finalize = function(cb){
  
    var end_result = "Pre-unmounting procedures completed!";
    cb(end_result);
    
};


exports.read_pin = function(cb){
    cb(pin);
};

exports.write_pin = function(content, cb){
    pin = content;
    cb(); 
};


exports.read_ldr = function(cb){
    var voltage = fs.readFileSync('/sys/bus/iio/devices/iio:device0/in_voltage_'+pin+'_raw', 'utf8'); 
    
    var ldr = (2500/(5-voltage*0.004887)-500)/3.3;

    cb(ldr);
}


