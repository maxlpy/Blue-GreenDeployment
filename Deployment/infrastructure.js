var http      = require('http');
var httpProxy = require('http-proxy');
var exec = require('child_process').exec;
var request = require("request");
var redis = require("redis");

var GREEN = 'http://127.0.0.1:5060';
var BLUE  = 'http://127.0.0.1:9090';

var blueClient = redis.createClient(6379, '127.0.0.1', {})
var greenClient = redis.createClient(6380, '127.0.0.1', {})

var mirrorFlag=true;  // true: turn flag on, false: turn flag off.
var TARGET = BLUE;

var infrastructure =
{
  setup: function()
  {
    // Proxy.
    blueClient.del("myPicture");
    blueClient.del("switch");
    greenClient.del("myPicture");
	greenClient.del("switch");

    var options = {};
    var proxy   = httpProxy.createProxyServer(options);

    var server  = http.createServer(function(req, res)
    {
      proxy.web( req, res, {target: TARGET } );
    });
    server.listen(8383);

    // Launch green slice
    exec('forever start -w --watchDirectory ../blue-www ../blue-www/main.js 9090');
    console.log("Blue slice instance.");

    // Launch blue slice
    exec('forever start -w --watchDirectory ../green-www ../green-www/main.js 5060');
    console.log("Green slice instance.");


      function trigger(){
          blueClient.get("switch",function(err,value){
              if(value=="1"){
                  TARGET=GREEN;
                  server = http.createServer(function (req, res) {
                      proxy.web(req, res, {target: TARGET});
                  });
                  console.log("Switch to green instance "+GREEN);
                  blueClient.del("switch");
                  if(mirrorFlag==false) dataMigrate(GREEN);
              }
          })
          greenClient.get("switch",function(err,value){
              if(value=="1"){
                  TARGET=BLUE;
                  server = http.createServer(function (req, res) {
                      proxy.web(req, res, {target: TARGET});
                  });
                  console.log("Switch to blue instance "+BLUE);
                  greenClient.del("switch");

                  if(mirrorFlag==false) dataMigrate(BLUE);
              }
          })
      }

      // Mirror Flag features
      var initGreen=0;
      var initBlue=0;
      blueClient.llen('myPicture',function(err,data){
              initBlue=data;
          }
      )
      greenClient.llen('myPicture',function(err,data){
              initGreen=data;
          }
      )
      blueFlag=0;
      greenFlag=0;
      add=0;
      function dup(){
          blueClient.llen('myPicture',function(err,data){
                  if(data>initBlue){
                      blueFlag=1;
                      initBlue=data;
                      add=data-initBlue;
                  }
              }
          );
          greenClient.llen('myPicture',function(err,data){
                  if(data>initGreen){
                      greenFlag=1;
                      initGreen=data;
                      add=data-initGreen;
                  }
              }
          );
          if(blueFlag==1 && greenFlag==0){
              blueClient.lrange("myPicture",0,add,function(err,items){
                  console.log("Blue instance.")
                  if(err) throw err;
                  items.forEach(function(item){
                      greenClient.lpush('myimg',item);
                      initGreen++;
                  })
              })
              blueFlag=0;
          }
          if(greenFlag==1 && blueFlag==0){
              console.log("Green instance.");
              greenClient.lrange("myPicture",0,add,function(err,items){
                  if(err) throw err;
                  items.forEach(function(item){
                      blueClient.lpush('myPicture',item);
                      initBlue++;
                  })
              })
              greenFlag=0;
          }
      }

      var check= setInterval(trigger, 3*1000);

      if(mirrorFlag==true){
          var onChange=setInterval(dup,1*1000);
      }

	function dataMigrate(target){
			if(target==GREEN){
                blueClient.llen("myPicture",function(error,data){
                    console.log("Migrate from Blue to Green.");

                    // Start to migrate data when data list is not null.
                    if(data!=0){
                        (blueClient.lrange("myPicture",0,-1,function(err,items){
                            if(err) throw err;
                            items.forEach(function(item){
                                greenClient.lpush('myPicture',item);
                            })
                        }))
                    }
                });
			}
			else{
                greenClient.llen("myPicture",function(error,data){
                    console.log("Migrate from Green to Blue.");

                    // Start to migrate data when data list is not null.
                    if(data!=0){
                        (greenClient.lrange("myPicture",0,-1,function(err,items){
                            if(err) throw err;
                            items.forEach(function(item){
                                blueClient.lpush('myPicture',item);
                            })
                        }))
                    }
                });
			}
		}

  },

  teardown: function()
  {
    exec('forever stopall', function()
    {
      console.log("infrastructure shutdown");
      process.exit();
    });
  }
}

infrastructure.setup();

// Make sure to clean up.
process.on('exit', function(){infrastructure.teardown();} );
process.on('SIGINT', function(){infrastructure.teardown();} );
process.on('uncaughtException', function(err){
  console.log(err);
  infrastructure.teardown();} );
