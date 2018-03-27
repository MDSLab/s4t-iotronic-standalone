//pluginjsonschema = {"says": "BlaBlaBla..."}

exports.main = function (arguments, callback){ 
  
  var says = arguments.says;
  
  var LIGHTNINGROD_HOME = process.env.LIGHTNINGROD_HOME;
  api = require(LIGHTNINGROD_HOME + '/modules/plugins-manager/plugin-apis');
  logger = api.getLogger();
  
  logger.info(says); 
  
  callback("OK", says);
  
};