// https://github.com/jeyoder/ThingsInSpace/blob/master/web-root/scripts/orbit-calculation-worker.js
/* global satellite */
importScripts('../libs/satellite.js');

var NUM_SEGS;
var tle_cache = [];
var earth_scale;

onmessage = function(m) {
  
  if(m.data.is_init) {
    
    var tle_data = m.data.tle_data;
    
    for(var i = 0; i < tle_data.length; i++) {
      tle_cache.push(satellite.twoline2satrec(
        tle_data[i].TLE_LINE1, tle_data[i].TLE_LINE2
      ));
    }

    NUM_SEGS = m.data.segments;
    earth_scale = m.data.earth_scale;
    
  } else {
    var sat_id = m.data.sat_id;
    var orbit_points = new Float32Array((NUM_SEGS + 1) * 3);
    var proj_points  = new Float32Array((NUM_SEGS + 1) * 3);
    
    var nowDate = new Date();
    var gmst = satellite.gstime(nowDate);
    var nowJ = jday(nowDate.getUTCFullYear(), 
                 nowDate.getUTCMonth() + 1, 
                 nowDate.getUTCDate(), 
                 nowDate.getUTCHours(), 
                 nowDate.getUTCMinutes(), 
                 nowDate.getUTCSeconds());
    nowJ += nowDate.getUTCMilliseconds() * 1.15741e-8; //days per millisecond    
    var now = (nowJ - tle_cache[sat_id].jdsatepoch) * 1440.0; //in minutes 
    
    var period = (2 * Math.PI) / tle_cache[sat_id].no; //convert rads/min to min
    var timeslice = period / NUM_SEGS;
    
    for(var i = 0; i < NUM_SEGS + 1; i++) {
      var t = now + i*timeslice;
      var p = satellite.sgp4(tle_cache[sat_id], t).position;
      try {
        orbit_points[i*3]   = p.x;
        orbit_points[i*3+1] = p.y;
        orbit_points[i*3+2] = p.z;

        p = projectPointOntoEarth(p, earth_scale);
        proj_points[i*3]   = p[0];
        proj_points[i*3+1] = p[1];
        proj_points[i*3+2] = p[2];

      } catch (ex) {
        orbit_points[i*3]   = 0;
        orbit_points[i*3+1] = 0;
        orbit_points[i*3+2] = 0;
        proj_points[i*3]   = 0;
        proj_points[i*3+1] = 0;
        proj_points[i*3+2] = 0;
      }
    }
    postMessage({
      orbit_points: orbit_points.buffer,
      proj_points: proj_points.buffer,
      sat_id : sat_id
    }, [orbit_points.buffer, proj_points.buffer]);
  }
};

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

function projectPointOntoEarth(p, scale) {
  var sum = Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z); // sum to normalize
  return sum === 0 ? [0,0,0] : [p.x/sum*scale[0], p.y/sum*scale[1], p.z/sum*scale[2]];
}