// Source: https://github.com/shashwatak/satellite-js

var SATELLITE_SIZE = 2;
var ORBIT_SEGMENTS = 255;
var KM_TO_WORLD_UNITS = 0.001;

var tle_json;
var sat_data;
var sat_pos;
var sat_vel;
var sat_alt;

var satelliteWorker = new Worker('./scripts/satellite-calculation-worker.js');
var orbitWorker = new Worker('./scripts/orbit-calculation-worker.js');

var time_index = 0;

var sat_points = [];
var sat_orbit_arrays = [];
var in_progress = [];

var orbit_line;
var position_projection_line;
var satellite_transform;

let intersected_satellite = null;

var finished_loading = false;

function loadJSON(callback, path) {   
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', path, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
          }
    };
    xobj.send(null);  
 }

function startSatelliteLoading(scene) {
    loadJSON(function(text) { getSatellites(scene, text); }, "./resources/TLE.json");
}

function getSatellites(scene, tle_text) {
    tle_json = JSON.parse(tle_text);

    var sat_count = tle_json.length;

    sat_data = [];
    for (var i = 0; i < sat_count; i++) {
        sat_data.push({
            intldes:  tle_json[i].INTLDES,// LM: I couldn't find what this means :/
            name: tle_json[i].OBJECT_NAME,
            type: tle_json[i].OBJECT_TYPE
        });
    }

    satellite_transform = new THREE.Matrix4().compose(
        new THREE.Vector3(), 
        new THREE.Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI * 0.5),
        new THREE.Vector3(KM_TO_WORLD_UNITS, KM_TO_WORLD_UNITS, KM_TO_WORLD_UNITS)
    );

    prepareOrbitBuffers(sat_count);
    prepareSatellitePoints(sat_data);

    orbit_line.applyMatrix(satellite_transform);
    scene.add(orbit_line);

    position_projection_line.applyMatrix(satellite_transform);
    scene.add(position_projection_line);

    satelliteWorker.postMessage({
        tle_data : tle_json
    });

    orbitWorker.postMessage({
        is_init : true,
        tle_data : tle_json,
        segments : ORBIT_SEGMENTS
    });
}

function prepareSatellitePoints(sat_data) {
    
    let color_satellites_prev = -1;
    let color_satellites = [
        [0.89411765, 0.10196078, 0.10980392],
        [0.21568627, 0.49411765, 0.72156863],
        [0.30196078, 0.68627451, 0.29019608],
        [0.59607843, 0.30588235, 0.63921569]
    ];
    function next_color() { return color_satellites[(++color_satellites_prev) % color_satellites.length] };

    let typesCache = [];
    let colorsCache = [];

    var sizes = [];
    var colors = [];
    for (var i = 0; i < sat_data.length; i++) {
        sizes.push(SATELLITE_SIZE);

        let index = typesCache.indexOf(sat_data[i].type);
        if (index === -1) {
            typesCache.push(sat_data[i].type);
            colorsCache.push(next_color());
            index = typesCache.length - 1;
        }
        let c = colorsCache[index];
        
        colors.push(c[0], c[1], c[2]);
    }

    let geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(sat_data.length*3), 3).setDynamic(true));
    geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3).setDynamic(true));
    geometry.addAttribute('size', new THREE.Float32BufferAttribute(sizes, 1).setDynamic(true));
    //geometry.computeBoundingSphere();

    let material = new THREE.ShaderMaterial( {
        uniforms: {
            mainColor: { value: new THREE.Color(0xffffff) },
            texture: { value: new THREE.TextureLoader().load("./resources/circle.png") }
        },
        vertexShader: satellite_vert,
        fragmentShader: satellite_frag,
        alphaTest: 0.9
    } );

    sat_points = new THREE.Points(geometry, material);
}

function prepareOrbitBuffers(count) {

    in_progress = [];
    for (var i = 0; i < ORBIT_SEGMENTS; i++) in_progress[i] = false; // fill with false
    
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((ORBIT_SEGMENTS+1)*3), 3).setDynamic(true));

    var material = new THREE.LineBasicMaterial({
        color: 0xaaaaaa,
        linewidth: 2,
    });

    orbit_line = new THREE.Line(geometry, material);


    geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(2*3), 3).setDynamic(true));

    material = new THREE.LineBasicMaterial({
        color: 0xaaaaaa,
        linewidth: 2,
        opacity: 0.75,
        transparent: true,
    });

    position_projection_line = new THREE.Line(geometry, material);
}

function updateOrbitBuffer(sat_id) {
    if(!in_progress[sat_id]) {
        orbitWorker.postMessage({
            is_init : false,
            sat_id : sat_id
            });
        in_progress[sat_id] = true;
    }
};

function displayOrbit(sat_id) {

}

var gotExtraData = false;
satelliteWorker.onmessage = function(m) {
    ///// 
    if(!gotExtraData) { // store extra data that comes from crunching     
    //   var start = performance.now();
      
    //   satExtraData = JSON.parse(m.data.extraData);
      
    //   for(var i=0; i < satSet.numSats; i++) {
    //     satData[i].inclination = satExtraData[i].inclination;
    //     satData[i].eccentricity = satExtraData[i].eccentricity;
    //     satData[i].raan = satExtraData[i].raan;
    //     satData[i].argPe = satExtraData[i].argPe;
    //     satData[i].meanMotion = satExtraData[i].meanMotion;
        
    //     satData[i].semiMajorAxis = satExtraData[i].semiMajorAxis;
    //     satData[i].semiMinorAxis = satExtraData[i].semiMinorAxis;
    //     satData[i].apogee = satExtraData[i].apogee;
    //     satData[i].perigee = satExtraData[i].perigee;
    //     satData[i].period = satExtraData[i].period;
    //   }
      
    //   console.log('sat.js copied extra data in ' + (performance.now() - start) + ' ms');
      gotExtraData = true;
      return;
    }

    sat_pos = new Float32Array(m.data.sat_pos);
    sat_vel = new Float32Array(m.data.sat_vel);
    sat_alt = new Float32Array(m.data.sat_alt);

    if (!finished_loading) {
        finished_loading = true;

        sat_points.applyMatrix(satellite_transform);
        scene.add(sat_points); 



        // var color = sat_points.geometry.attributes.color;
        // for (var i = 0; i < sat_alt.length; i++) {
        //     color.array[i*3] = sat_alt[i] * 0.000025;
        //     color.array[i*3+1] = 0.5;
        //     color.array[i*3+2] = 0.5;
        // }
        // color.needsUpdate = true;
    }

    var position = sat_points.geometry.attributes.position;
    position.copyArray(sat_pos);
    position.needsUpdate = true;
};

orbitWorker.onmessage = function(m) {
    var sat_id = m.data.sat_id;
    var orbit_points = new Float32Array(m.data.orbit_points);

    var position = orbit_line.geometry.attributes.position;
    position.copyArray(orbit_points);
    position.needsUpdate = true;

    in_progress[sat_id] = false;
};

function updateSatellites(delta) {
    if (!finished_loading) return;

    let position = sat_points.geometry.attributes.position;
    let positions = position.array;
    for (let i = 0; i < sat_vel.length; i++) {
        positions[i] += delta * sat_vel[i];
    }

    position.needsUpdate = true;

    if (intersected_satellite != null) {
        var projs = position_projection_line.geometry.attributes.position;
        projs.array[0] = positions[intersected_satellite*3];
        projs.array[1] = positions[intersected_satellite*3+1];
        projs.array[2] = positions[intersected_satellite*3+2];
        projs.needsUpdate = true;
    }
}

function resetSatellite(sat_id, scene, sizes) {
    sizes.array[sat_id] = SATELLITE_SIZE;
    sizes.needsUpdate = true;
}

function highlightSatellite(sat_id, scene, sizes) {
    updateOrbitBuffer(sat_id);
    displayOrbit(sat_id);

    sizes.array[sat_id] = SATELLITE_SIZE * 1.5;
    sizes.needsUpdate = true;
    
    satellite_nameplate.innerHTML = sat_data[intersected_satellite].name;
    satellite_nameplate.style.left = mouse_screen.x + "px";
    satellite_nameplate.style.top = mouse_screen.y + "px";
    satellite_nameplate.style.display = "inherit";
}

function unselectSatellites() {
    satellite_nameplate.innerHTML = "";
    satellite_nameplate.style.display = "none";
}

function intersectSatellites(raycaster, scene) {
    if (!finished_loading) return false;

    var geometry = sat_points.geometry;
    var attributes = geometry.attributes;
    var intersects = raycaster.intersectObject(sat_points);

    if (intersects.length > 0) {
        // selected new satellite
        if (intersected_satellite !== intersects[0].index) {

             // reset old satellite
            resetSatellite(intersected_satellite, scene, attributes.size);

            // change new satellite
            intersected_satellite = intersects[0].index;
            highlightSatellite(intersected_satellite, scene, attributes.size)
        }
        return true;

    } else if (intersected_satellite !== null) {
        resetSatellite(intersected_satellite, scene, attributes.size);
        unselectSatellites();

        intersected_satellite = null;
    }

    return false;
}