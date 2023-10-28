var sWord = ["twelve", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
var sWordFive = ["error", "five", "ten", "fifteen", "twenty", "twenty-five", "thirty", "thirty-five", "forty", "forty-five", "fifty", "fifty-five"];
var sLazyFive = ["error", "five", "ten", "quarter", "twenty", "twenty-five", "half", "twenty-five", "twenty", "quarter", "ten", "five"];

//Convert Millitary time to Fuzzy Time
export function makeFuzzy(hours,mins) {
  var strhours = "00";
  var strmins = "00";

  var buffer = "";

  var random = Math.floor(Math.random() * 100);
  var random2 = Math.floor(Math.random() * 100);
  var random3 = Math.floor(Math.random() * 100);
  
  //*** Testing Area ***
  //random=99; //random >70 + random2>80 makes an -ish; random >70 & random2<80 makes an about
  //random2=50;  //random2 <= 40 allows "just before" or "just after"
  //random3=15;  //random3 < 75 will use midnight or noon

  var ihours = hours;
  var imin = mins;
  
  if (ihours>12) ihours=ihours-12; 
  var fminfuz = imin;
  var iminfuz = Math.ceil((imin-1.0)/5.0-0.25)*5;
  
  var iminrem = imin%5;
  
  var sHour = sWord[ihours];
  
  var inexthour = ihours + 1;
  if (inexthour==13) inexthour=1;
  var sNextHour = sWord[inexthour];
    
  
  var sMid = "error";
  if (hours==12 || hours==0){
    if (hours==0) {
      sMid = "midnight";
    } else {
      sMid = "noon";
    }
  }
  
  let sNextMid = "nexterror";
  if (inexthour==12){
   if(hours==23) {
      sNextMid="midnight";
    } else {
      sNextMid="noon";
    }
  }
  
  
  if (random2<=40 && ((imin>56 || (imin<5 && imin!=0) || (imin>25 && imin<35 && imin!=30)))) {
    if (imin>=56) {
      buffer = "just before\n";
      if(random3<75 && inexthour==12) {
        buffer += sNextMid;
      } else {
        buffer += sNextHour;
      }
    } else if (imin>0 && imin<5) {
        buffer = "just after\n";
        if (random3<75 && (hours==0 || hours==12)) {
          buffer += sMid;
        } else {
          buffer += sHour;
        }
    } else if (imin>25 && imin<30) {
        buffer = "just before\n";
        buffer += sHour;
        buffer += "\nthirty";
    } else if (imin>30 && imin<35) {
        buffer = "just after\n";
        buffer += sHour;
        buffer += "\nthirty";
    } else if (imin==0) {
      buffer = sHour;
    } else if (imin==30) {
      buffer = sHour;
      buffer += "\nthirty";
    } else {
      buffer = "i\ndon`t\nknow";
    }
  } else {
    if (random>70) {    
      if (iminrem > 0 && random2<80) {
        buffer = "about\n";
      }
      if (iminfuz==60) {
        buffer += sNextHour;
      } else {
        buffer += sHour;
      }
      if(imin<58 && imin>2) { 
        if(imin>2 && imin<8) {
          buffer += "\noh five";
        } else {
          buffer += "\n";
          buffer += sWordFive[iminfuz/5];
        }
        if (iminrem>0 && random2>=80) {
          buffer += "ish";
        }
      }    
    } else {
      if (iminfuz>0 && iminfuz<60) {
        buffer = sLazyFive[iminfuz/5];
        if (iminfuz>30) {
          if (random2<50 || iminfuz==45 || iminfuz==15) {
            buffer += "\nto\n";
          } else {
            buffer += "\nbefore\n";
          }
          buffer += sNextHour;
        } else {
          if (random2>=50 || iminfuz==30) {
            buffer += "\npast\n";
          } else {
            buffer += "\nafter\n";
          }
          buffer += sHour;
        }
      }
      if (ihours<12 && (ihours==11 && imin<57)) {
        if (iminfuz==0 || iminfuz==60) {
          if (imin>2 && imin<=59) {
            buffer += sNextHour;
          } else {
            buffer += sHour;
          }
          buffer += "\no'clock";
        }
      } else {
        if (iminfuz==0 || iminfuz==60) {
          if(random3>=50) {
            if (imin<3) {
              if (ihours==12) {
                buffer += sMid;
              } else {
                buffer += sHour;
              }
            } else {
              if (ihours==11) {
                buffer += sNextMid;
              } else {
                buffer += sNextHour;
              }
            }
          
          } else {
            if (imin>2 && imin<=59) {
              buffer += sNextHour;
            } else {
              buffer += sHour;
            }
            buffer += "\no'clock";
          }
        }
      }
    }
  }
  return(buffer);
}