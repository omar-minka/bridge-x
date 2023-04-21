var bitcoin = require('bitcoin-rpc-api');
var express = require('express');
var app = express();
 
//Username and password relate to those set in the bitcoin.conf file
 
var node = {
  protocol: 'http',
  host: 'localhost',
  port: 19332,
};
 
bitcoin.setup(node);
app.use('/', bitcoin.api); //Bind the middleware to any chosen url
 
app.listen(3000);