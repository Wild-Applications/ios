//Authentication Service
//Entry Point
var secret = process.env.JWT_SECRET;
//imports
var restify = require('restify'),
restifyPlugins = require('restify-plugins'),
Logger = require('bunyan'),
corsMiddleware = require('restify-cors-middleware'),
verifyToken = require('restify-jwt-community'),
jwt = require('jsonwebtoken'),
iosHelper = require('./helpers/ios.helper.js');

//
//
//Logging setup
//
//
var log = new Logger.createLogger({
  name:'MAIN',
  //define where to write each log
  streams:[
    {
      level:'info',
      path: __dirname + '/logs/info.log'
    },
    {
      level:'error',
      path: __dirname + '/logs/error.log'
    },
    {
      level:'fatal',
      path: __dirname + '/logs/error.log'
    },
    {
      level:'warn',
      path: __dirname + '/logs/error.log'
    },
    {
      level:'debug',
      stream: process.stdout
    },
    {
      level:'trace',
      path: __dirname + '/logs/trace.log'
    }
  ],
  //how to serialise messages
  serializers: {
    req: Logger.stdSerializers.req,
    res: Logger.stdSerializers.res,
  }
});


//
//
//Server Setup
//
//
var server = restify.createServer({
  name:'ios',
  version:'0.0.0',
  //certificate:fs.readFileSync('../certificate'),
  //key:fs.readFileSync('../key')
  log:log
});

//use body parser to deal with JSON
server.use(restifyPlugins.bodyParser());
server.use(restifyPlugins.queryParser());
server.use(restifyPlugins.fullResponse());


const cors = corsMiddleware({
  preflighMaxAge: 5,
  origins: ['*'],
  allowHeaders: ['authorization']
});
server.pre(cors.preflight);
server.use(cors.actual);



var webappRoutes = require('./routes/webapp.routes.js');
webappRoutes.applyRoutes(server, '/webapp');


//
//
//Server routes
//
//
//version request
//return latest default version
server.get("/version", function(req,res,next){
  server.log.info("Version Request");
  res.send(server.name + " is running on v" + server.versions);
});




//
//
//
//
//


//
//
//
//begin listening on port 8080
//
//
server.listen(8080, function(){
  console.log(server.name + " listening on ", server.url);
});
