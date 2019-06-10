// https://github.com/jeyoder/ThingsInSpace/blob/master/web-root/scripts/orbit-calculation-worker.js
/* global satellite */
importScripts('../libs/satellite.js');

var NUM_SEGS;
var tle_cache = [];
var earth_scale;
var KM_TO_WORLD_UNITS = 0.001;
var ONE_OVER_KM_TO_WORLD_UNITS = 1 / KM_TO_WORLD_UNITS;

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
    
    var datetime = new Date(m.data.datetime);   
    // var end_datetime = new Date(datetime.valueOf());
    // end_datetime.setDate(end_datetime.getDate() + orbit_days);
    var j = satellite.jday(datetime);
    var start_gmst = satellite.gstime(j);
    // var end_j = satellite.jday(end_datetime);
    // var j_slice = (end_j - j) / NUM_SEGS;

    var now = (j - tle_cache[sat_id].jdsatepoch) * 1440.0; //in minutes 
    
    var period = (2 * Math.PI) / tle_cache[sat_id].no; //convert rads/min to min
    var timeslice = period / NUM_SEGS;
    
    for(var i = 0; i < NUM_SEGS + 1; i++) {
      var t = now + i*timeslice;
      var gmst = satellite.gstime(j + (i*timeslice / 1440.0)); //(i*timeslice / 1440.0)//i*j_slice
      var p = satellite.sgp4(tle_cache[sat_id], t).position;
      try {
        orbit_points[i*3]   = p.x;
        orbit_points[i*3+1] = p.y;
        orbit_points[i*3+2] = p.z;

        p = projectPointOntoEarth(p, gmst - start_gmst, earth_scale);
        proj_points[i*3]   = p[0];
        proj_points[i*3+1] = p[1];
        proj_points[i*3+2] = p[2];

      } catch (ex) {
        if (p != undefined) this.console.error(ex);
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

function projectPointOntoEarth(p, gmst, scale) {

  // transform points so length is more accurate (doesn't matter for normal)
  var x = p.x * KM_TO_WORLD_UNITS;
  var y = p.y * KM_TO_WORLD_UNITS;
  var z = p.z * KM_TO_WORLD_UNITS;

  var length = Math.sqrt(x*x + y*y + z*z); // length to normalize

  if (length === 0) return [0, 0, 0]; // break out if error

  var norm_x = x/length * scale[0];
  var norm_y = y/length * scale[1];
  var norm_z = z/length * scale[2];

  // https://github.com/shashwatak/satellite-js/blob/develop/src/transforms.js#L126
  x = (norm_x * Math.cos(gmst)) + (norm_y * Math.sin(gmst));
  y = (norm_x * (-Math.sin(gmst))) + (norm_y * Math.cos(gmst));
  z = norm_z;

  return [x, y, z];
}