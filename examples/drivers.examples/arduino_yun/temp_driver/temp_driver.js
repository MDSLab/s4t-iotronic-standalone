var fs = require('fs');

var ADCres = 1023.0 ;
var Beta = 3950;
var Kelvin = 273.15;
var Rb = 10000;
var Ginf = 120.6685;
var pin = 'A0';


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

exports.read_ADCres = function(cb){
    cb(ADCres);
};

exports.write_ADCres = function(content, cb){
    ADCres = content;
    cb();
};

exports.read_Beta = function(cb){
    cb(Beta);
};

exports.write_Beta = function(content, cb){
    Beta = content;
    cb();
};

exports.read_Kelvin = function(cb){
    cb(Kelvin);
};

exports.write_Kelvin = function(content, cb){
    Kelvin = content;
    cb(); 
};


exports.read_Rb = function(cb){
    cb(Rb);
};

exports.write_Rb = function(content, cb){
    Rb = content;
    cb(); 
};


exports.read_Ginf = function(cb){
    cb(Ginf);
};

exports.write_Ginf = function(content, cb){
    Ginf = content;
    cb(); 
};


exports.read_pin = function(cb){
    cb(pin);
};

exports.write_pin = function(content, cb){
    pin = content;
    cb(); 
};


exports.read_temperature = function(cb){
    var sensor = fs.readFileSync('/sys/bus/iio/devices/iio:device0/in_voltage_'+pin+'_raw', 'utf8'); 

    var Rthermistor = Rb * (ADCres / sensor - 1);
    var _temperatureC = Beta / (Math.log( Rthermistor * Ginf )) ;
    var cel = _temperatureC - Kelvin;
    cb(cel);
};

