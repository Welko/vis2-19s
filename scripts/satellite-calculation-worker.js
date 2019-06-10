//https://github.com/jeyoder/ThingsInSpace/blob/master/web-root/scripts/sat-cruncher.js
/* global satellite */
importScripts('../libs/satellite.js');

var tle_cache = [];
var sat_pos, sat_vel, sat_geo;

var datetime;
var datetime_j_difference;

// Function: onmessage
//
// calculates the position, velocity and other positional data of all satellites
//
// Parameters:
//      m - message object, contains request data
//
onmessage = function(m) {

    datetime = new Date(m.data.datetime);
    datetime_j_difference = satellite.jday(datetime) - satellite.jday(new Date());

    if (m.data.date_update) return; // just updating datetime

    var tle_data = m.data.tle_data;
    var len = tle_data.length;

    var extra_data = [];
    for(var i = 0; i < len; i++) {
    var extra = {};
    var satrec = satellite.twoline2satrec(
        tle_data[i].TLE_LINE1, tle_data[i].TLE_LINE2
    );

    tle_cache.push(satrec);

    // //keplerian elements
    extra.inclination  = satrec.inclo;  //rads
    extra.eccentricity = satrec.ecco;
    extra.raan         = satrec.nodeo;   //rads
    extra.argPe        = satrec.argpo;  //rads
    extra.meanMotion   = satrec.no * 60 * 24 / (2 * Math.PI);     // convert rads/minute to rev/day

    //fun other data
    extra.semiMajorAxis = Math.pow(8681663.653 / extra.meanMotion, (2/3));
    extra.semiMinorAxis = extra.semiMajorAxis * Math.sqrt(1 - Math.pow(extra.eccentricity, 2));   
    extra.apogee = extra.semiMajorAxis * (1 + extra.eccentricity) - 6371;
    extra.perigee = extra.semiMajorAxis * (1 - extra.eccentricity) - 6371;
    extra.period = 1440.0 / extra.meanMotion;

    extra_data.push(extra);
    }

    sat_pos = new Float32Array(len * 3);
    sat_vel = new Float32Array(len * 3);
    sat_geo = new Float32Array(len * 3);

    postMessage({
    extra_data : JSON.stringify(extra_data),
    });

    propagate();
};

// Function: propagate
// calculates current position, velocity and other positional data of all satellites and sends it back to satellites.js
// calls itself twice a second
function propagate() {
  
    var j = satellite.jday(new Date()) + datetime_j_difference;  
    var gmst = satellite.gstime(j);

    for(var i = 0; i < tle_cache.length; i++) {
    var m = (j - tle_cache[i].jdsatepoch) * 1440.0; //1440 = minutes_per_day
    var pv = satellite.sgp4(tle_cache[i], m); 
    var x,y,z,vx,vy,vz,lat,lon,alt;
    try{
        x = pv.position.x;
        y = pv.position.y;
        z = pv.position.z;
        vx = pv.velocity.x;
        vy = pv.velocity.y;
        vz = pv.velocity.z;

        if (isNaN(x) || isNaN(y) || isNaN(z)) throw "position contains NaN";
        var geodetic = satellite.eciToGeodetic(pv.position, gmst);
        lat = geodetic.latitude;
        lon = geodetic.longitude;
        alt = geodetic.height;

    } catch(e) {
        x = 0;
        y = 0;
        z = 0;
        vx = 0;
        vy = 0;
        vz = 0;
        alt = 0;
        lat = 0;
        lon = 0;
    }

    sat_pos[i*3] = x;
    sat_pos[i*3+1] = y;
    sat_pos[i*3+2] = z;

    sat_vel[i*3] = vx;
    sat_vel[i*3+1] = vy;
    sat_vel[i*3+2] = vz;

    sat_geo[i*3] = lat;
    sat_geo[i*3+1] = lon;
    sat_geo[i*3+2] = alt;
    }
 
    postMessage({sat_pos: sat_pos.buffer, sat_vel: sat_vel.buffer, sat_geo: sat_geo.buffer}, [sat_pos.buffer, sat_vel.buffer, sat_geo.buffer]);
    sat_pos = new Float32Array(tle_cache.length * 3);
    sat_vel = new Float32Array(tle_cache.length * 3);
    sat_geo = new Float32Array(tle_cache.length * 3);

    setTimeout(propagate, 500);
}