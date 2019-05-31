https://github.com/jeyoder/ThingsInSpace/blob/master/web-root/scripts/sat-cruncher.js
/* global satellite */
importScripts('../libs/satellite.js');

var tle_cache = [];
var sat_pos, sat_vel, sat_alt;

onmessage = function(m) {
  var start = Date.now();
  
  var tle_data = m.data.tle_data;
  var len = tle_data.length;

  var extra_data = [];
  for(var i = 0; i < len; i++) {
    var extra = {};
    tle_cache.push(satellite.twoline2satrec(
        tle_data[i].TLE_LINE1, tle_data[i].TLE_LINE2
    ));
    
    // //keplerian elements
    // extra.inclination  = satrec.inclo;  //rads
    // extra.eccentricity = satrec.ecco;
    // extra.raan         = satrec.nodeo;   //rads
    // extra.argPe        = satrec.argpo;  //rads
    // extra.meanMotion   = satrec.no * 60 * 24 / (2 * Math.PI);     // convert rads/minute to rev/day
    
    // //fun other data
    // extra.semiMajorAxis = Math.pow(8681663.653 / extra.meanMotion, (2/3));
    // extra.semiMinorAxis = extra.semiMajorAxis * Math.sqrt(1 - Math.pow(extra.eccentricity, 2));   
    // extra.apogee = extra.semiMajorAxis * (1 + extra.eccentricity) - 6371;
    // extra.perigee = extra.semiMajorAxis * (1 - extra.eccentricity) - 6371;
    // extra.period = 1440.0 / extra.meanMotion;
    
    extra_data.push(extra);
  }
  
  sat_pos = new Float32Array(len * 3);
  sat_vel = new Float32Array(len * 3);
  sat_alt = new Float32Array(len);
  
  var postStart = Date.now();
  postMessage({
    extra_data : JSON.stringify(extra_data),
  });
  console.log('satellite calculation worker init: ' + (Date.now() - start) + ' ms  (incl post: ' + (Date.now() - postStart) + ' ms)');
  propagate();
};

function propagate() {
//  var start = Date.now();
  
  var now = new Date();   
  var j = jday(now.getUTCFullYear(), 
               now.getUTCMonth() + 1, // Note, this function requires months in range 1-12. 
               now.getUTCDate(),
               now.getUTCHours(), 
               now.getUTCMinutes(), 
               now.getUTCSeconds());
  j += now.getUTCMilliseconds() * 1.15741e-8; //days per millisecond     
  var gmst = satellite.gstime(j);
  
  for(var i = 0; i < tle_cache.length; i++) {
    var m = (j - tle_cache[i].jdsatepoch) * 1440.0; //1440 = minutes_per_day
    var pv = satellite.sgp4(tle_cache[i], m); 
    var x,y,z,vx,vy,vz,alt;
    try{
       x = pv.position.x;
       y = pv.position.y;
       z = pv.position.z;
       vx = pv.velocity.x;
       vy = pv.velocity.y;
       vz = pv.velocity.z;

       if (isNaN(x) || isNaN(y) || isNaN(z)) throw "position contains NaN";
       alt = satellite.eciToGeodetic(pv.position, gmst).height;
    } catch(e) {
       x = 0;
       y = 0;
       z = 0;
       vx = 0;
       vy = 0;
       vz = 0;
       alt = 0;
    }

    sat_pos[i*3] = x;
    sat_pos[i*3+1] = y;
    sat_pos[i*3+2] = z;
    
    sat_vel[i*3] = vx;
    sat_vel[i*3+1] = vy;
    sat_vel[i*3+2] = vz;
    
    sat_alt[i] = alt;
  }
 
  postMessage({sat_pos: sat_pos.buffer, sat_vel: sat_vel.buffer, sat_alt: sat_alt.buffer}, [sat_pos.buffer, sat_vel.buffer, sat_alt.buffer]);
  sat_pos = new Float32Array(tle_cache.length * 3);
  sat_vel = new Float32Array(tle_cache.length * 3);
  sat_alt = new Float32Array(tle_cache.length);
  
  setTimeout(propagate, 500);
}

function jday(year, mon, day, hr, minute, sec){ //from satellite.js
  'use strict';
  return (367.0 * year -
        Math.floor((7 * (year + Math.floor((mon + 9) / 12.0))) * 0.25) +
        Math.floor( 275 * mon / 9.0 ) +
        day + 1721013.5 +
        ((sec / 60.0 + minute) / 60.0 + hr) / 24.0  //  ut in days
        //#  - 0.5*sgn(100.0*year + mon - 190002.5) + 0.5;
        );
}