exports.main = function (arguments){
    
    var timer = arguments.timer;
    
    var pin_temp = arguments.temp_sensor.pin;
    var pin_hum = arguments.hum_sensor.pin;

    var m_authid = arguments.m_authid;
    var ckan_enabled = arguments.ckan_enabled;

    var temp_resourceid = null;
    var hum_resourceid = null;
    
    var api = require('../plugin-apis');
    var position = api.getPosition();
    
    var logger = api.getLogger();

    logger.info("Museo-Guttuso plugin starting...");
    
    api.getCKANdataset(api.getBoardId(), function(ckan_result){
      
	  console.log("RESOURCES: \n" + JSON.stringify(ckan_result,null,"\t"));
	  
	  logger.info("CKAN Data recovered:");
	  
	  for(var resource=0; resource < ckan_result.resources.length; resource++) {
	    
	    (function(resource) {
	      
		//setTimeout(function(){

				    
		  if (ckan_result.resources[resource].name == "temperature"){
		    
		      temp_resourceid = ckan_result.resources[resource].id;
		      logger.info("--> TEMP R_id: "+temp_resourceid);
		    
		  } else if (ckan_result.resources[resource].name == "humidity"){
		    
		      hum_resourceid = ckan_result.resources[resource].id;
		      logger.info("--> HUM R_id: "+hum_resourceid);

		  }   

		    
		//}, 100*resource);  // end of setTimeout function

	      })(resource); 
			  
	  }
	  
	  
	  
	  
	  var linino = require('ideino-linino-lib');
	  var board = new linino.Board();
	  
	  var sensor_list = ['temp', 'hum'];
	  
	  
	  logger.info("--> Museo-Guttuso plugin started!");
	  
	  board.connect(function() {


		setInterval(function(){
		  
		  
		      /*FOR TEMP SENSOR*/
		      var ADCres = 1023.0;
		      var Beta = 3950;		 
		      var Kelvin = 273.15;	  
		      var Rb = 10000;		       
		      var Ginf = 120.6685;
		      var temp_volt = board.analogRead(pin_temp);
		      var Rthermistor = Rb * (ADCres / temp_volt - 1);
		      var _temperatureC = Beta / (Math.log( Rthermistor * Ginf )) ;
		      var temp = _temperatureC - Kelvin;
		      
		      
		      /*FOR HUM SENSOR*/
		      var degreesCelsius = temp; 
		      var supplyVolt = 4.64;
		      var HIH4030_Value = board.analogRead(pin_hum);
		      var voltage = HIH4030_Value/1023. * supplyVolt; 
		      var sensorRH = 161.0 * voltage / supplyVolt - 25.8;
		      var relativeHumidity = sensorRH / (1.0546 - 0.0026 * degreesCelsius);  


		      
		      var timestamp = api.getLocalTime();

		      for(var i = 0; i < sensor_list.length; i++) {
			  (function(i) {
			    
			      if (sensor_list[i] == "temp"){
				
				    var record = [];
				    
				    record.push({
					Date: timestamp,
					Temperature: temp,
					Altitude: position.altitude,
					Latitude: position.latitude, 
					Longitude: position.longitude  
				    });
				    if(ckan_enabled == "true"){

					      api.sendToCKAN(m_authid, temp_resourceid, record, function(payloadJSON){ console.log("\n\nTemperature " + temp + " °C"); });
				    }else{
					      console.log("\n\nTemperature " + temp + " °C");
				    }
			      }
			      else if (sensor_list[i] == "hum"){
				  var record = [];
				  record.push({
				      Date: timestamp,
				      Humidity: relativeHumidity,
				      Altitude: position.altitude,
				      Latitude: position.latitude, 
				      Longitude: position.longitude  
				  });	
				  if(ckan_enabled == "true")
					      api.sendToCKAN(m_authid, hum_resourceid, record, function(payloadJSON){ console.log("Humidity " + relativeHumidity + " percent (with "+temp+" °C)"); });
				  else
					      console.log("Humidity " + relativeHumidity + " percent (with "+temp+" °C)");		    
			      }
			      else{
				logger.warn("NO SENSORS!\n\n");
			      }
			      
			  })(i);  
		      } 

		},timer);
	    
	  });	
	  
    });
    
}


