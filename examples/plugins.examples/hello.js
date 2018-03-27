//pluginjsonschema = {"name": "IoTronic"}

exports.main = function (arguments){ 
  
    var name = arguments.name;
  
    var LIGHTNINGROD_HOME = process.env.LIGHTNINGROD_HOME;
    api = require(LIGHTNINGROD_HOME + '/modules/plugins-manager/plugin-apis');
    logger = api.getLogger();

    logger.info("Hello plugin starting...");
  
    setInterval(function(){ 
	logger.info('Hello '+name+'!'); 
      
    }, 3000); 
  
};