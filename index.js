/* ----------------
     Libraries & Vars
    ------------------- */
var csv = require('csv');
var fs = require('fs');
var keypress = require("keypress");
var five = require('johnny-five');
var BeagleBone = require('beaglebone-io');

var board = new five.Board({
  io: new BeagleBone()
}), led, imu, servos, distance;

//logger Setup (remember to run from root of git directory since using relative routes)
var gyroLogger= fs.createWriteStream('log/gyroData_' + Date.now() + '.txt', {
  flags: 'a'
});
var accLogger= fs.createWriteStream('log/accData_' + Date.now() + '.txt', {
  flags: 'a'
});

board.on("ready", function() {

/* ----------------------------------------------------------
        SETUP
    ------------------- */
//Setup RGB LED (status indicator)
  led = new five.Led.RGB({
  pins: {
      red: "P9_21",
      green: "P9_14",
      blue: "P9_16"
  },
  isAnode: true
  });

//Setup IMU (motion detector)
  imu = new five.IMU({
    controller: "MPU6050",
  freq: 100
  });
  gyroLogger.write("x,y,z,time");
  accLogger.write("x,y,z,pitch,roll,acceleration,inclination,orientation,time");

//Setup drivetrain
  servos = {};
  servos.right = new five.Servo ({
    pin: "P8_13",
    type: "continuous"
  });
  servos.left = new five.Servo({
      pin: "P8_19",
      type: "continuous",
      invert: true
  });
  servos.both = new five.Servos([servos.left, servos.right]);

//Setup distance sensors
  // distance = {};
  // distance.irRight = new five.Proximity({
  //   controller: "GP2Y0A21YK",
  //   pin: "P9_38"
  // });
  // distance.irLeft = new five.Proximity({
  //   controller: "GP2Y0A21YK",
  //   pin: "P9_37"
  // });
  
  /* ------------------------------------------------
        START
    ------------------- */

//After setup, status: green (good)
  led.on();
  led.color("green");
  
  // stop();
  // drive();
  // logIMU();
  // logIR();
  // keyPress();

  this.repl.inject({
    servos: servos,
  //   led: led
  //   imu: imu
  });

});//End ready

/* ------------------------------------------
        FUNCTIONS
    ------------------- */
function keyPress(){
  keypress(process.stdin);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  process.stdin.setRawMode(true);

  process.stdin.on("keypress", function(ch, key) {

    if (!key) {
      return;
    }

    if (key.name === "q") {
      console.log("Quitting");
      process.exit();
    } else if (key.name === "up") {
      console.log("CW");
      servos.both.cw();
    } else if (key.name === "down") {
      console.log("CCW");
      servos.both.ccw();
    } else if (key.name === "left") {
      console.log("Turn Left");
      servos.left.cw(0.1);
      servos.right.cw(1.0);
    } else if (key.name === "right") {
      console.log("Turn Right");
      servos.right.cw(0);
      servos.left.cw(1);
    } else if (key.name === "space") {
      console.log("Stopping");
      servos.both.stop();
    } 
  });
}

function logIR(){
  distance.irRight.on("data", function(){
    console.log("Right: " + distance.irRight.cm);
  });
  distance.irLeft.on("data", function(){
    console.log("Left: " + distance.irLeft.cm);
  });
}

function stop() {
  servos.both.cw();
  board.wait(500, function(){
    servos.both.stop();
  })  
}
  

function drive() {
  distance.irLeft.on("data", function(){
    distance.irRight.on('data', function(){
      if (distance.irLeft.cm < 6) {
        console.log(distance.irLeft.cm)
        led.color("purple");
        servos.right.stop();
      }
      else if (distance.irRight.cm < 6) {
        console.log(distance.irRight.cm)
        led.color("orange");
        servos.left.stop();
      }
      else {
        led.color("blue")
        servos.both.cw();
      }
    });
  });
}

function logIMU(){
  var count = 0;
  imu.on("change", function(){
    var gyroInput = this.gyro.x + "," + this.gyro.y  + "," + this.gyro.z + "," + Date.now() + "," + count.toString() + "\n"
    var accInput = this.accelerometer.x + "," + this.accelerometer.y + "," +  this.accelerometer.z + "," +  this.accelerometer.pitch + "," +  this.accelerometer.roll + "," +  this.accelerometer.acceleration + "," +  this.accelerometer.inclination + "," +  this.accelerometer.orientation + "," + Date.now() + "," + count.toString() + "\n"
    gyroLogger.write(gyroInput);
    accLogger.write(accInput);
    count ++
    if (count === 10000){
      led.color("blue");
      gyroLogger.end();
      accLogger.end();
      board.emit("exit")
    }
  });
}

/* -------------------------------------------------
        MISC.
    ------------------- */

board.on("info", function(event){

});

board.on("warn", function(event){ //Send warning when emergency Proximity sensors hit

});

board.on("message", function(event){

})
//Catch errors generally
board.on("error", function(err) {
  console.log("There was an error" + err);
  return; //keep going after loging
});
