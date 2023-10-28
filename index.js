//Funky Fuzzy beta
//Version 1.2.07 - started Oct 7, 2018
var version="1.2.07";

import clock from "clock";
import document from "document";
import * as util from "../common/utils";
import userActivity from "user-activity";
import { preferences } from "user-settings";
import { units } from "user-settings";
import { battery } from "power";
import { HeartRateSensor } from "heart-rate";
import * as messaging from "messaging";
import * as fuzzy from "fuzzy";
import * as fs from "fs";
import { me } from "appbit";

var bTest = false;
var bConTest = false;
var bWTest = false;

let settings = {
  version: "",
  tr: {tBattery: true, tSteps: true, tHRM: true},
  br: {tDigiTime: true, tTemp: false, tDate: true},
  
  tAMPM: false,
  tSet12h: true,
  tBatType: false,
  
  tTextBig: false,
  tAbstract: false, tBurst: true, tFunky: false, tColor: false,
  
  sBackgrounds: 1,
  
  cText: ["#00FF00","#FFFF00"],
	cBurst: ["#ff00ff", "#000022"],
  cFunky: ["#000080", "#000000", "#006400", "#ff00ff"],
  cBkgd: "#000022",
  
  oWS: {xWKey1: "", xWKey2: "", sServer: 0, tImp: false},
  objWeather: {temp: -500, lat: "42.3223", lon: "-83.1763",
               time: 0, bkey: false, bgps: false, bworked: false},

}

settings.tSet12h = (preferences.clockDisplay == "12h");
settings.oWS.tImp = (units.temperature == "F");
if (bTest) settings.oWS.xWKey1 = "6db928a4bab0443eca257039b89f83d6";
if (bTest) settings.oWS.xWKey2 = "45f584d0ecd6c43eef89aa13393ce76f";

const strSaveFile = "fuzzSettings.cbor";
var objSavedFile;
var iRepeat = 0;
var gloKey = "";
// Counter used to limit the amount of messages sent
var counter = 0;

let objSend = {key: "" , value: false}

let weatherTimeout;
let weatherInterval;
const seconds = 1000;
const minutes = seconds * 60;
const hours = minutes * 60;
const days = hours * 24;

var nSecs=0;
var lastMin=-1;
var firstTime=true;
var aso=false;


// Get a handle on the <text> element
const myFuzzy = document.getElementById("myFuzzy");
const iconBat = document.getElementById("iconBat");
const rectBat = document.getElementById("rectBat");
const myBat = document.getElementById("myBat");
const mySteps = document.getElementById("mySteps");
const iconSteps = document.getElementById("iconSteps");
const myHRM = document.getElementById("myHRM");
const iconHRM = document.getElementById("iconHRM");
const myDigiTime = document.getElementById("myDigiTime");
if (bWTest) const myTStats = document.getElementById("myTStats");
const myTemperature = document.getElementById("myTemperature");
const myDate = document.getElementById("myDate");
const screen = document.getElementById("screen");
const myGradient = document.getElementById("myGradient");
const pngBackground = document.getElementById("pngBackground");
const myBackground = document.getElementById("myBackground");
const TRelements = document.getElementsByClassName("tr");
const BRelements = document.getElementsByClassName("br");
if (bConTest || bWTest) const TESTelements = document.getElementsByClassName("test");
if (bConTest) const areYouThere = document.getElementById("areYouThere");
if (bWTest) myTStats.text=""; 
if (bConTest) areYouThere.text="x";

var hrm = new HeartRateSensor();
if (settings.tr.tHRM) hrm.start();

var sDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var queue = [];
let qTime = null;

//delSaveFile(); //TEST PURPOSES ONLY

restoreSettings();

clock.granularity = "minutes"; // Update the clock every minute

clock.ontick = (evt) => { // Update the <text> elements every tick with the current time
  let today = evt.date;
  let tickTime = new Date();
  var hours =today.getHours();
  var mins = today.getMinutes();
  var secs = tickTime.getSeconds();
  //var time = today.getTime();
    //*** Testing Area ***
    //hours=21;
    //mins=9;
  updateMinData();
  console.log("ontick: lastMin = " + lastMin + ", mins = " + mins);
  if (lastMin != mins) {
    lastMin=mins;
    myFuzzy.text = fuzzy.makeFuzzy(hours, mins);
  }
}

function updateMinData() {
  var today = new Date();
  if (settings.br.tDigiTime) setDigiTime();
  if (settings.br.tDate) myDate.text = sDays[today.getDay()] + " " + util.zeroPad(today.getDate());
  if (settings.tr.tBattery) {
    if (settings.tBatType) setIconBattery(); else setPercentBattery();}
  if (settings.br.tTemp) {
    processWeatherData();
  } else {
    myTemperature.text = "";
    if (bWTest) myTStats.text = "";
  }
}

function updateQuickData() {
  if (settings.tr.tSteps) {
    iconSteps.style.visibility = "visible";
    mySteps.text = (util.numberWithCommas(userActivity.today.adjusted.steps) || 0);
  } else iconSteps.style.visibility = "hidden";
  if (settings.tr.tHRM) {
      iconHRM.style.visibility = "visible";
      myHRM.text = JSON.stringify(hrm.heartRate);
  }
}

//-------------------------------------------
// Request weather data from the companion
function fetchWeather() {
  //console.log("fetchWeather called - sending to companion");
  clearTimeout(weatherTimeout);
  clearInterval(weatherInterval);
  enqueue("weather");
}

function setDigiTime() {
  var sDigiTime = "";
  var today = new Date();
  var mins = today.getMinutes();
  var hours= today.getHours();
  //*** Testing Area ***
    //hours=21; mins=9;  
  var ihours = util.pad0(hours);
  if (settings.tSet12h) ihours = util.pad0((hours % 12) || 12);
  mins = util.pad0(mins);
  sDigiTime = ihours + ":" + mins;
  if (settings.tAMPM) sDigiTime += (hours>11) ? "pm":"am";
  myDigiTime.text = sDigiTime;  
}

function processWeatherData() {
  let oW = settings.objWeather;
  let oWS = settings.oWS
  if (oW.temp == -500) return;
  //console.log("processWeatherData: oW = " + JSON.stringify(oW));
  if (bWTest) var strTStats = oWS.sServer.toString();
  let wstate = ["",  ".", ",",
                " ", "…", "¸",
                "ˆ", ":", ";",
                "~", "·", "‘"];
  var sdeg = wstate[oWS.sServer];
  var tTime = new(Date);
  if (oW.bworked) {
    if (bWTest) strTStats += "!"; else strTStats+= "x";
    if (oW.bgps) sdeg = wstate[oWS.sServer + 6]; else sdeg = wstate[oWS.sServer + 3];
  } else {
    console.log("Using last saved temperature");
    if (oW.bgps) sdeg = wstate[oWS.sServer + 9];
  }
  var elapsedTime = Math.round((tTime.getTime() - oW.time)/(minutes*1))
  var strTemp;
  //console.log("tImp = " + oWS.tImp);
  if (oWS.tImp) {
    strTemp = Math.round(oW.temp);
  } else {
    strTemp = (oW.temp - 32)*5/9
    if (oWS.sServer == 0) {
      strTemp = Math.round(strTemp);
    } else {
      strTemp = Math.round(strTemp*10)/10;
    }
  }
  if (elapsedTime>16) {
    oW.time=tTime.getTime();
    oW.bgps=false; oW.bworked=false;
    console.log("Forced Temp Update");
    fetchWeather();
  }
  if (oWS.sServer == 0 || oWS["xWKey" + oWS.sServer] > "") {
    myTemperature.text = strTemp + "°";
  } else {
    myTemperature.text = "nokey";
  }
  if (bWTest) myTStats.text = elapsedTime+sdeg;
}

function setIconBattery() {
  var fPercent = Number(battery.chargeLevel)/100;
  iconBat.style.visibility = "visible"; rectBat.style.visibility = "visible";
  rectBat.width = Math.ceil((1-fPercent)*24);
  if(fPercent>0.5) {
    var r = Math.floor((1-fPercent)*255*2); var g = 255;
  } else {
    var r = 255; var g = Math.floor(fPercent*255*2);
  }
  var strR = util.pad0(r.toString(16)); var strG = util.pad0(g.toString(16));
  //console.log("iconBattery: strR = " + strR + ", strG = " + strG);
  iconBat.style.fill = "#" + strR + strG + "00";  
}

function setPercentBattery() {
  var fPercent = battery.chargeLevel + "%"
  myBat.text = fPercent;
}

function updateFromKeyValue(key, value) {
  //console.log("updateFromKeyValue: " + key + ":" + value);
  if (value == "true") value = true;
  shiftElements();
  switch(key) { //decide what to do with each key
    case "cText":
			myFuzzy.style.fill = value[0];
			TRelements.forEach(function(element) {element.style.fill = value[1];});
      BRelements.forEach(function(element) {element.style.fill = value[1];});
      if (bWTest || bConTest) TESTelements.forEach(function(element) {element.style.fill = value[1];});
      break;
    case "tSteps":
      if (value) {iconSteps.style.visibility = "visible"; updateQuickData();
      } else {mySteps.text = ""; iconSteps.style.visibility = "hidden";}
      break;      
    case "tBattery":
      if (value) {
        if (settings.tBatType) {
          iconBat.style.visibility = "visible"; rectBat.style.visibility = "visible";
        } else {
          myBat.text="--%"; updateMinData();
        }
      } else {iconBat.style.visibility = "hidden"; rectBat.style.visibility = "hidden"; myBat.text="";}
      break;
    case "tBatType":
      if (settings.tr.tBattery) {
        if (value) {
          iconBat.style.visibility = "visible"; rectBat.style.visibility = "visible"; myBat.text="";
        } else {
          iconBat.style.visibility = "hidden"; rectBat.style.visibility = "hidden"; myBat.text="--%"
        }
        updateMinData();
      }
      break;
    case "tHRM":
      if (value) {hrm.start(); iconHRM.style.visibility = "visible"; myHRM.text = JSON.stringify(hrm.heartRate);
      } else {myHRM.text = ""; iconHRM.style.visibility = "hidden"; hrm.stop();}
      break;
    case "tDate": if (value) updateMinData(); else myDate.text = ""; break;
    case "tSet12h": updateMinData(); break;
    case "tTemp":
      updateMinData();
      if (value){
        weatherInterval = setInterval(fetchWeather, minutes * 15);
        fetchWeather();
      } else {
        updateMinData();
        myTemperature.text = "";
        clearInterval(weatherInterval);
      }
      break;
    case "tImp": updateMinData(); break;
    case "sServer": if (settings.br.tTemp) fetchWeather(); break;
    case "xWKey1": if (settings.oWS.sServer == 1 && settings.br.tTemp) fetchWeather(); break;
    case "xWKey2": if (settings.oWS.sServer == 2 && settings.br.tTemp) fetchWeather(); break;
    case "tDigiTime": if (value) updateMinData(); else myDigiTime.text = ""; break;
    case "tAMPM": updateMinData(); break;   
    case "tTextBig":
      var iSize; if (value) iSize = 32; else iSize = 24;
      iconBat.height = iSize - 10; if (iSize == 32) iconBat.y=4; else iconBat.y = 8;
      rectBat.height = iSize - 14; if (iSize == 32) rectBat.y=6; else rectBat.y = 10;
    	TRelements.forEach(function(element) {element.style.fontSize = iSize;});
      BRelements.forEach(function(element) {element.style.fontSize = iSize;});
      updateMinData(); updateQuickData();
      break;
    case "sBackgrounds":
      if (value == 0) { //tAbstract
        pngBackground.href = "images/abstract-fuzzy-1.png";
        pngBackground.style.visibility = "visible"; myBackground.style.visibility = "hidden";
        settings.tBurst=false; settings.tFunky=false; settings.tColor=false;
      }
      if (value == 1) { //"tBurst":
        let mG = myGradient.gradient;
        mG.type = "radial";
        mG.x1 = screen.width/2; mG.y1 = screen.height/2; mG.x2 = screen.width; mG.y2 = screen.height;
        var i; for (i=0; i<settings.cBurst.length; i++) {var iplus = i+1; mG.colors["c" + iplus] = settings.cBurst[i];console.log(settings.cBurst[i]);}
        pngBackground.style.visibility = "hidden"; myBackground.style.visibility = "hidden";
        settings.tFunky=false; settings.tColor=false; settings.tAbstract=false;
      }
      if (value == 2) { //"tFunky":
        //console.log(JSON.stringify(settings.cFunky));
        let mG = myGradient.gradient;
        mG.type = "bilinear";
        mG.x1 = 30; mG.y1 = 30; mG.x2 = screen.width-60; mG.y2 = screen.height-60;
        var i; 
        for (i=0; i<settings.cFunky.length; i++) {
          var iplus = i+1; mG.colors["c" + iplus] = settings.cFunky[i];
          console.log(settings.cFunky[i])
        }
        pngBackground.style.visibility = "hidden";  myBackground.style.visibility = "hidden";
        settings.tBurst=false; settings.tColor=false; settings.tAbstract=false;
      }
      if (value == 3) { //"tColor":
        pngBackground.style.visibility = "hidden"; myBackground.style.visibility = "visible";
        settings.tBurst=false; settings.tFunky=false; settings.tAbstract=false;
      }
      break;
    case "cBkgd": myBackground.style.fill = value; break;
  }
  saveToFile();
}

function shiftElements() {  
  var bBat=settings.tr.tBattery; var bStep=settings.tr.tSteps; var bHRM=settings.tr.tHRM
  var iTopCount = bBat + bStep + bHRM;
  
  var bTime=settings.br.tDigiTime; var bTemp=settings.br.tTemp; var bDate=settings.br.tDate;
  var iBottomCount = bTime + bTemp + bDate;
  
  var iLeft = 8; var iCent = screen.width/2; var iRight = screen.width-8;
  var wBat = iconBat.width; var wSteps = iconSteps.width; var wHRM = iconHRM.width;
  
  if (iTopCount == 3) {
    iconBat.x = iLeft; rectBat.x = iLeft+2; myBat.textAnchor="start"; myBat.x = iLeft;
    mySteps.textAnchor = "middle"; mySteps.x = iCent; iconSteps.x = iCent-wSteps/2;
    myHRM.textAnchor = "end"; myHRM.x = iRight; iconHRM.x = iRight-wHRM;
  }
  if (iTopCount == 2) {
    if (bBat) {iconBat.x = iLeft; rectBat.x = iLeft+2; myBat.textAnchor="start"; myBat.x = iLeft;}
    if (bBat && bStep) {mySteps.textAnchor = "end"; mySteps.x = iRight; iconSteps.x = iRight-wSteps;}
    if (bStep && bHRM) {mySteps.textAnchor = "start"; mySteps.x = iLeft; iconSteps.x  = iLeft;}  
    if (bHRM) {myHRM.textAnchor = "end"; myHRM.x = iRight; iconHRM.x = iRight-wHRM;}
  }
  if (iTopCount == 1) {
    if (bBat) {iconBat.x = iCent-wBat/2; rectBat.x = iCent-wBat/2+2; myBat.textAnchor="middle"; myBat.x = iCent;}
    if (bStep) {mySteps.textAnchor = "middle"; mySteps.x = iCent; iconSteps.x = iCent-(wSteps-2)/2;}
    if (bHRM) {myHRM.textAnchor = "middle"; myHRM.x = iCent; iconHRM.x = iCent-(wHRM-2)/2;}
  }
  
  if (iBottomCount == 3) {
    myDigiTime.textAnchor = "start"; myDigiTime.x = iLeft;
    myTemperature.textAnchor = "middle"; myTemperature.x = iCent; 
    if (bWTest) {myTStats.textAnchor = "middle"; myTStats.x = iCent;}
    myDate.textAnchor = "end"; myDate.x = iRight;
  }
  if (iBottomCount == 2) {
    if (bTime) {myDigiTime.textAnchor = "start"; myDigiTime.x = iLeft;}
    if (bTemp && bDate) {
      myTemperature.textAnchor = "start"; myTemperature.x = iLeft;
      if (bWTest) {myTStats.textAnchor = "start"; myTStats.x = iLeft;}
    }
    if (bTime && bTemp) {
      myTemperature.textAnchor = "end"; myTemperature.x = iRight;
      if (bWTest) {myTStats.textAnchor = "end"; myTStats.x = iRight;}
    }
    if (bDate) {myDate.textAnchor = "end"; myDate.x = iRight};    
  }
  if (iBottomCount == 1) {
    if (bTime) {myDigiTime.textAnchor = "middle"; myDigiTime.x = iCent;}
    if (bTemp) {
      myTemperature.textAnchor = "middle"; myTemperature.x = iCent;
      if (bWTest) {myTStats.textAnchor = "middle"; myTStats.x = iCent;}
    } 
    if (bDate) {myDate.textAnchor = "middle"; myDate.x = iCent;}
  }
}

function delSaveFile (){
  try {
    fs.unlinkSync(strSaveFile);
    console.log("Test Mode: Settings File Deleted");
  } catch (error) {
    console.log("Test Mode: No settings file to delete");
  }
}

function restoreSettings() {
    try {
      //set settings from locally saved file if it exists
      settings = fs.readFileSync(strSaveFile, 'cbor');
      updateToVersion();
      enqueue("setStorage");
      var now = new Date(); settings.objWeather.time = now.getTime();
      setSettings();
      return;
    } catch (error) {
      if (error == "Error: Couldn't find file: fuzzSettings.cbor"){
        console.log("restoreSettings: " + error);
        enqueue("setDefaults");
      } else {
        console.log("restoreSettings: " + error);
      }
    }
}

function updateToVersion() {
  if (settings.version === undefined) {
    settings.tBatType=true;
  }
  settings.version=version;
}

function setSettings() {
  console.log("Making screen mimic settings");
  var key;
  for (key in settings) if (key != "") updateFromKeyValue(key, settings[key]);
  for (key in settings.tr) updateFromKeyValue(key, settings.tr[key]);
  for (key in settings.br) updateFromKeyValue(key, settings.br[key]);
}
 
function sendJustSettings() {
  enqueue("justSettings");
}

function fnAreYouThere() {
  areYouThere.text = "";
  enqueue("Are You There?");
}

function enqueue(data) {
  if (queue.length > 10) return;
  queue.push(data);
  console.log("APP:ENQUEUE: qSize = " + queue.length + ", data = " + data);  
  if (qTime == null) {
    sendNextQ();
    qTime = setTimeout(sendNextQ, seconds/2);
  }
}

function sendNextQ() {
  if (queue.length == 0) {
    qTime = null; return;
  } else {
    if (aso || messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
      var data = queue.shift();
      console.log("APP:SENDNEXTQ: data = " + data + ", left in queue = " + queue.length);
      if (queue.length > 0) qTime = setTimeout(sendNextQ, seconds/2); else qTime = null;
      sendToCompanion(data);
    } else {
      clearTimeout(qTime);
      qTime = setTimeout(sendNextQ, seconds/2);
      console.log("APP: Waiting for socket to open");
    }
  }
}

function frontOfQ(data) {
  clearTimeout(qTime);
  queue.splice(0, 0, data);
  qTime = setTimeout(sendNextQ, seconds/2);
}

function sendToCompanion(key) {
  if (bConTest && key=="Are You There?") objSend.value = null; else objSend.value = settings;
	if (aso || messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    objSend.key = key;
    messaging.peerSocket.send(objSend);
    console.log("App:key sent = " + key);
  } else {
    console.log("APP:FRONTOFQ: trying again - ReadyState is not OPEN");
    frontOfQ(key);
  }
}

function saveToFile() {  // Save settings to the filesystem
  fs.writeFileSync(strSaveFile, settings, 'cbor');
}

messaging.peerSocket.onmessage = function(evt) {  // Message is received
  console.log("app/onmessage: key = " + evt.data.key + ", value = " + evt.data.value); // + " settings:" + JSON.stringify(settings));
  var key = evt.data.key;
  var value = evt.data.value;
  if (bConTest) if (key == "Yep!") {areYouThere.text = "*"; return;}
  if (value=="true") value=true;
  var kind = key.substr(0,1);
  if (kind=="s" || key == "tImp" || kind == "x" || key == "tTemp") {
    if (settings.br.tTemp && key == "tImp") processWeatherData();
    if (settings.br.tTemp && key == "tTemp") processWeatherData();
  }
  if (key == "weatherOW") { // treat the "weather" key differently
    //console.log("app/onmessage: tTemp = " + settings.br.tTemp + ", value = " + JSON.stringify(value));    
    if (settings.br.tTemp) {
      settings.objWeather = value;
      processWeatherData();
      //updateFromKeyValue("tTemp", true);
    }
  } else if (key == "setSettings") {
    settings = value;
    setSettings();
  } else if (key in settings.tr) {
    settings.tr[key] = value;
    updateFromKeyValue(key, value);
  } else if (key in settings.br) {
    settings.br[key] = value;
    updateFromKeyValue(key, value);
  } else if (key in settings.oWS) {
    settings.oWS[key] = value;
    updateFromKeyValue(key, settings.oWS[key]);
  } else {
		//var value = settings[key];
		if (key == "cBurst") {
      settings.cBurst = value;
      if (settings.sBackgrounds == 1) {key = "sBackgrounds"; value = 1;}
    } else if (key == "cFunky") {
      settings.cFunky = value;
      if (settings.sBackgrounds == 2) {key = "sBackgrounds"; value = 2;}
    } else {
      settings[key] = value;
    }
    updateFromKeyValue(key, value);
  }
  saveToFile();
}


messaging.peerSocket.onopen = function() { // Listen for the onopen event
  console.log("App: Socket Open");
  aso = true;
}

messaging.peerSocket.onclose = () => { // Message socket closes
  console.log("App: Socket Closed");
  aso = false;
}

me.addEventListener("unload", saveToFile); // Register for the unload event

messaging.peerSocket.onerror = function(err) { // Listen for the onerror event
  console.log("App: Connection error: " + err.code + " - " + err.message);
}

if (bConTest) setInterval(fnAreYouThere, seconds*20);

setInterval(updateQuickData, seconds*3); // Update heart rate and steps every 3 seconds