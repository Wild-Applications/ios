var Router = require('restify-router').Router,
router = new Router(),
verifyToken = require('restify-jwt'),
tokenHelper = require('../helpers/token.helper.js'),
restify = require('restify'),
grpc = require("grpc");

var secret = process.env.JWT_SECRET;


var menuDescriptor = grpc.load(__dirname + '/../proto/menu.proto').menu;
var menuClient = new menuDescriptor.MenuService('service.menu:1295', grpc.credentials.createInsecure());

var premisesDescriptor = grpc.load(__dirname + '/../proto/premises.proto').premises;
var premisesClient = new premisesDescriptor.PremisesService('service.premises:1295', grpc.credentials.createInsecure());

var accountDescriptor = grpc.load(__dirname + '/../proto/account.proto').account;
var accountClient = new accountDescriptor.AccountService('service.account:1295', grpc.credentials.createInsecure());

var orderDescriptor = grpc.load(__dirname + '/../proto/order.proto').order;
var orderClient = new orderDescriptor.FulfilmentService('service.fulfilment:1295', grpc.credentials.createInsecure());

var paymentDescriptor = grpc.load(__dirname + '/../proto/payment.proto').payment;
var paymentClient =  new paymentDescriptor.PaymentService('service.payment:1295', grpc.credentials.createInsecure());

router.get('/scan/:table', function(req, res, next){
  //table&premises
  //get table owner from table service
  //get menu from menu service

  var tableDescriptor = grpc.load(__dirname + '/../proto/table.proto').table;
  var tableClient = new tableDescriptor.TableService('service.table:1295', grpc.credentials.createInsecure());
  tableClient.get({_id:req.params.table}, function(err, table){
    if(err){
      res.status(401);
      res.send(err);
    }else{

      var requests = [];
      requests[requests.length] = premisesCall(table.owner);
      requests[requests.length] = menuCall(table.owner);
      Promise.all(requests).then(allData => {
        console.log(allData);
        var returnObj = {};
        returnObj.table = table;
        returnObj.premises = allData[0];
        returnObj.menu = allData[1];
        res.send(returnObj);
      }, error => {
        console.log(error);
        res.send("TEST " + JSON.stringify(error));
      })
    }
  });
});


var premisesCall = function(ownerId){
  return new Promise(function(resolve, reject){
    premisesClient.getFromOwner({_id: ownerId}, function(err, premises){
      console.log('Premises call ', err);
      if(err){return reject(err)}
      return resolve(premises);
    })
  });
}

var menuCall = function(ownerId){
  return new Promise(function(resolve, reject){
    menuClient.getActiveMenuByOwner({owner: ownerId}, function(err, menu){
      console.log('menu call ', err);
        if(err){return reject(err)}
        return resolve(menu);
    });
  });
}


router.post('/order', function(req, res, next){
  var token = req.header('Authorization');
  tokenHelper.getTokenContent(token, secret, function(err, decodedToken){
    if(err){
      res.status(400);
      res.send(err);
      return;
    }
    var metadata = new grpc.Metadata();
    metadata.add('authorization', tokenHelper.getRawToken(token));

    //parse order contents
    //current comes through as objects with quantities attached
    //needs to be multiple stroings
    var order = req.body;
    var formatted = [];
    for(var item in order.contents){
      var nextProd = order.contents[item];
      console.log(nextProd);
      for(var i=0;i<nextProd.quantity;i++){
        formatted[formatted.length] = nextProd.product._id;
      }
    }
    order.products = formatted;
    delete order.contents;
    var orderToCreate = order;
    orderToCreate.owner = decodedToken.sub;
    orderToCreate.source = order.source;
    orderToCreate.storePaymentDetails = order.storePaymentDetails;
    console.log("source ", order.source);
    orderClient.create(orderToCreate, metadata, function(err, result){
      if(err){
        res.status(400);
        res.send(err);
        return;
      }
      res.send(result);
    });
  });
});

router.post("/register", function(req,res,next){
  //res.send("Create user - Not Implemented");
  if( req.body
    && req.body.password
    && req.body.email ){
      var userToCreate = {};
      userToCreate.username = req.body.email;
      userToCreate.password = req.body.password;
      userToCreate.email = req.body.email;
      userToCreate.accountType = "CUSTOMER";

    accountClient.create(userToCreate, function(err, response){
      if(err){
        res.status(400);
        res.send(JSON.parse(err.message));
      }else{
        res.send("Success" + JSON.stringify(response));
        //res.send(response);
      }
    });
  }else{
    var error = {message:'Not all parameters were supplied', code: '0007'};
    res.status = 400;
    res.send(error);
  }
});

router.post("/login", function(req,res,next){
  if( req.body && req.body.email && req.body.password ){
    req.body.username = req.body.email;
    req.body.accountType = 'CUSTOMER';
    delete req.body.email;
    accountClient.authenticate(req.body, function(err, response){
      if(err)
      {
        res.status(401);
        res.send(err);
      }else{
        res.send(response);
      }
    });
  }else{
    var error = {message:'Username or Password was not supplied', code: '0006'};
    res.status(400);
    res.send(error);
  }
});

router.get("/user", verifyToken({secret:secret}), function(req, res, next){
  var token = req.header('Authorization');
  var metadata = new grpc.Metadata();
  metadata.add('authorization', tokenHelper.getRawToken(token));
  accountClient.get({}, metadata, function(err, user){
    if(err){
      res.status(500).send(err);
    }
    res.send(user);
  })
});

router.get('/payments/stored', verifyToken({secret:secret}), function(req,res,next){
  var token = req.header('Authorization');
  tokenHelper.getTokenContent(token, secret, function(err, decodedToken){
    if(err){
      res.status(400);
      res.send(err);
      return;
    }
    var metadata = new grpc.Metadata();
    metadata.add('authorization', tokenHelper.getRawToken(token));

    paymentClient.getStoredPaymentMethods({}, metadata, function(err, customer){
      if(err){
        return res.send(err);
      }
      res.send(customer);
    })
  });
});

router.get('/token', verifyToken({secret:secret}), function(req,res,next){
  res.json(204);
});

router.get('/orders', verifyToken({secret:secret}), function(req,res,next){
  var token = req.header('Authorization');
  var metadata = new grpc.Metadata();
  metadata.add('authorization', tokenHelper.getRawToken(token));
  orderClient.get({}, metadata, function(orderErr, results){
    if(orderErr){
      res.send(orderErr);
    }else{
      res.send(results);
    }
  });
});


module.exports = router;
