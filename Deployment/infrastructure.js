var http      = require('http');
var httpProxy = require('http-proxy');
var exec = require('child_process').exec;
var request = require("request");
var redis = require("redis");

var GREEN = 'http://127.0.0.1:5060';
var BLUE  = 'http://127.0.0.1:9090';
var greenclient = redis.createClient(6380, '127.0.0.1', {})
var blueclient = redis.createClient(6379, '127.0.0.1', {})

var mirror=false;
var TARGET = BLUE;

var infrastructure =
{
  setup: function()
  {
    // Proxy.
    blueclient.del("myPicture");
    greenclient.del("myPicture");
	blueclient.del("switch");
	greenclient.del("switch");
    var options = {};
    var proxy   = httpProxy.createProxyServer(options);

    var server  = http.createServer(function(req, res)
    {
      proxy.web( req, res, {target: TARGET } );
    });
    server.listen(8282);

    // Launch green slice
    exec('forever start -w --watchDirectory ../blue-www ../blue-www/main.js 9090');
    console.log("blue slice1");

    // Launch blue slice
    exec('forever start -w --watchDirectory ../green-www ../green-www/main.js 5060');
    console.log("green slice1");

	function migrate(target){
			if(target==GREEN){
                blueclient.llen("myPicture",function(error,num){
                    console.log("Migrating to Green Begin!! Copying "+num+" data")
                    if(num==0){
                        (blueclient.lrange("myPicture",0,-1,function(err,items){
                            if(err) throw err;
                            items.forEach(function(item){
                                greenclient.lpush('myPicture',item);
                            })
                        }))
                    }
                });
			}
			else{
                greenclient.llen("myPicture",function(error,num){
                    console.log("Migrating to Blue Begin!! Copying "+num+" data")
                    if(num==0){
                        (greenclient.lrange("myPicture",0,-1,function(err,items){
                            if(err) throw err;
                            items.forEach(function(item){
                                blueclient.lpush('myPicture',item);
                            })
                        }))
                    }
                });
			}
		}

    function trigger(){
			blueclient.get("switch",function(err,value){
				if(value=="1"){
                    //TARGET=GREEN;
                    //server = http.createServer(function (req, res) {
                    //    proxy.web(req, res, {target: TARGET});
                    //});
					console.log("switch to green "+GREEN);
					blueclient.del("switch");
					// blueclient.get("switch",function(err,value){console.log(value)});
					if(mirror==false) migrate(GREEN);
				}
			})
			greenclient.get("switch",function(err,value){
				if(value=="1"){
                    //TARGET=BLUE;
                    //server = http.createServer(function (req, res) {
                    //    proxy.web(req, res, {target: TARGET});
                    //});
					console.log("switch to blue "+BLUE);
					greenclient.del("switch");
					// greenclient.get("switch",function(err,value){console.log(value)})
					if(mirror==false) migrate(BLUE);
				}
			})
        }

        var init_green=0;
        var init_blue=0;
        blueclient.llen('myPicture',function(err,num){
                init_blue=num;
            }
        )
        greenclient.llen('myPicture',function(err,num){
                init_green=num;
            }
        )
		blue_flag=0;
		green_flag=0;
		add=0;
        function dup(){
            blueclient.llen('myPicture',function(err,num){
                    if(num>init_blue){
                        blue_flag=1;
                        init_blue=num;
						add=num-init_blue;
                        // console.log("####blue flag "+blue_flag+" green flag "+green_flag);
                    }
                }
            );
			// console.log("-------blue flag "+blue_flag+" green flag "+green_flag);
            greenclient.llen('myPicture',function(err,num){
                    if(num>init_green){
                        green_flag=1;
                        init_green=num;
						add=num-init_green;
                    }
                }
            );
            if(blue_flag==1 && green_flag==0){
                blueclient.lrange("myPicture",0,add,function(err,items){
                    console.log("in blue")
                    if(err) throw err;
                    items.forEach(function(item){
                        greenclient.lpush('myimg',item);
						init_green++;
                    })
                })
				blue_flag=0;
            }
            if(green_flag==1 && blue_flag==0){
                console.log("in green");
                greenclient.lrange("myPicture",0,add,function(err,items){
                    if(err) throw err;
                    items.forEach(function(item){
                        blueclient.lpush('myPicture',item);
						init_blue++;
                    })
                })
				green_flag=0;
            }
        }

        var check= setInterval(trigger, 3*1000);

        if(mirror==true){
            var onChange=setInterval(dup,1*1000);
        }


//setTimeout
//var options = 
//{
//  url: "http://localhost:8080",
//};
//request(options, function (error, res, body) {

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
