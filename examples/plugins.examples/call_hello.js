exports.main = function (arguments, callback){ 

  var api = require('../plugin-apis');
  var logger = api.getLogger();
    
  var result = 'Hello by LR!';

  logger.info(result);
  console.log(result); 
  
  callback("OK", result);
  
  
}