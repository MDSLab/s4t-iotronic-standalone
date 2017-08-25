exports.main = function (arguments){ 
  
    var api = require('../plugin-apis');
    var logger = api.getLogger();
  
    setInterval(function(){ 
      
	logger.info('Hello by LR!');  // OR console.log('Hello by LR!'); 
      
    }, 3000); 
  
}
