exports.main = function (arguments, callback){ 
  
  var result = 'PLUGIN ALIVE!';
  console.log(result); 
  callback("OK", result);
  
}