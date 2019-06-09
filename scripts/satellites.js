var SATELLITE_SIZE = 2;
var ORBIT_SEGMENTS = 255;
var KM_TO_WORLD_UNITS = 0.001;

// Real data!
var tle_json;
var sat_data;
var sat_extra;
var sat_pos; // Updated continuously
var sat_vel; // Updated continuously
var sat_geo; // Updated continuously

var satelliteWorker = new Worker('./scripts/satellite-calculation-worker.js');
var orbitWorker = new Worker('./scripts/orbit-calculation-worker.js');

var time_index = 0;

// Geometry stuff (three.js)
var sat_points = [];
var sat_orbit_arrays = [];
var in_progress = [];
var type_colors = null;

var hover_orbit_line;
var hover_proj_line;
var position_projection_line;
var satellite_transform;

var intersected_satellite = null;
var orbit_selection_group = null;
var selected_satellite_objects = [];

var selected_orbit_material;
var selected_proj_material;

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
    sat_coords = [];
    var now = new Date();
    for (var i = 0; i < sat_count; i++) {
        sat_data.push({
            intldes:  tle_json[i].INTLDES,// LM: I couldn't find what this means :/
            name: tle_json[i].OBJECT_NAME,
            type: tle_json[i].OBJECT_TYPE,
            tleLine1: tle_json[i].TLE_LINE1,
            tleLine2: tle_json[i].TLE_LINE2
        });
    }

    // satellite_transform = new THREE.Matrix4().compose(
    //     new THREE.Vector3(), 
    //     new THREE.Quaternion().setFromAxisAngle(new Vector3(-1, 0, 0), Math.PI * 0.5),
    //     new THREE.Vector3(KM_TO_WORLD_UNITS, KM_TO_WORLD_UNITS, KM_TO_WORLD_UNITS)
    // );
    satellite_transform = new THREE.Matrix4();
    satellite_transform.set( 
        1, 0, 0, 0,
        0, 0, 1, 0,
        0, -1, 0, 0,
        10, 0, 0, 1 
    ).scale(new THREE.Vector3(KM_TO_WORLD_UNITS, KM_TO_WORLD_UNITS, KM_TO_WORLD_UNITS));

    prepareOrbitBuffers(sat_count);
    prepareSatellitePoints(sat_data);

    hover_orbit_line.applyMatrix(satellite_transform);
    scene.add(hover_orbit_line);
    
    hover_proj_line.applyMatrix(satellite_transform);
    scene.add(hover_proj_line); // dont' do that mayb?

    position_projection_line.applyMatrix(satellite_transform);
    scene.add(position_projection_line);

    orbit_selection_group = new THREE.Group();
    scene.add(orbit_selection_group);

    satelliteWorker.postMessage({
        tle_data : tle_json
    });

    var ground_track_margin_km = 10;

    orbitWorker.postMessage({
        is_init : true,
        tle_data : tle_json,
        segments : ORBIT_SEGMENTS,
        earth_scale : [
            _earth_scale_km[0] + ground_track_margin_km,
            _earth_scale_km[1] + ground_track_margin_km,
            _earth_scale_km[2] + ground_track_margin_km]
    });
}

function prepareSatellitePoints(sat_data) {

    var sizes = [];
    for (var i = 0; i < sat_data.length; i++) {
        sizes.push(SATELLITE_SIZE);
    }

    let geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(sat_data.length*3), 3).setDynamic(true));
    geometry.addAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(sat_data.length*4), 4).setDynamic(true));
    geometry.addAttribute('size', new THREE.Float32BufferAttribute(sizes, 1).setDynamic(true));
    //geometry.computeBoundingSphere();

    let material = new THREE.ShaderMaterial( {
        uniforms: {
            texture: { value: new THREE.TextureLoader().load("./resources/circle.png") }
        },
        vertexShader: satellite_vert,
        fragmentShader: satellite_frag,
        alphaTest: 0.9
    } );

    sat_points = new THREE.Points(geometry, material);
}

function prepareOrbitBuffers(count) {

    selected_orbit_material = new THREE.LineBasicMaterial({
        color: 0xaaaaaa,
        opacity: 0.75,
        transparent: true,
    });

    selected_proj_material = new THREE.LineBasicMaterial({
        color: 0xaaaa33,
        opacity: 0.75,
        transparent: true,
    });

    in_progress = [];
    for (var i = 0; i < ORBIT_SEGMENTS; i++) in_progress[i] = false; // fill with false
    
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((ORBIT_SEGMENTS+1)*3), 3).setDynamic(true));

    var material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
    });

    hover_orbit_line = new THREE.Line(geometry, material);

    material = new THREE.LineBasicMaterial({
        color: 0xffff66,
    });
    hover_proj_line = new THREE.Line(geometry.clone(), material);


    geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(2*3), 3).setDynamic(true));

    material = new THREE.LineBasicMaterial({
        color: 0xffffff,
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
    // TODO fill up?
}

var got_extra_data = false;
satelliteWorker.onmessage = function(m) {

    if(!got_extra_data) {
      sat_extra = JSON.parse(m.data.extra_data);
      got_extra_data = true;
      return;
    }

    sat_pos = new Float32Array(m.data.sat_pos);
    sat_vel = new Float32Array(m.data.sat_vel);
    sat_geo = new Float32Array(m.data.sat_geo);

    if (!finished_loading) {

        finished_loading = true;

        sat_points.applyMatrix(satellite_transform);
        scene.add(sat_points); 

        setColorMode(_COLOR_MODE_TYPE);
    }

    var position = sat_points.geometry.attributes.position;
    position.copyArray(sat_pos);
    position.needsUpdate = true;

    updateSatellitesUi();
};

orbitWorker.onmessage = function(m) {
    var sat_id = m.data.sat_id;
    var orbit_points = new Float32Array(m.data.orbit_points);
    var proj_points = new Float32Array(m.data.proj_points);

    var position = hover_orbit_line.geometry.attributes.position;
    position.copyArray(orbit_points);
    position.needsUpdate = true;
    
    position = hover_proj_line.geometry.attributes.position;
    position.copyArray(proj_points);
    position.needsUpdate = true;

    in_progress[sat_id] = false;
};

function updateSatellites(delta) {
    if (!finished_loading) return;

    let position = sat_points.geometry.attributes.position;
    let positions = position.array;
    let now = new Date();
    for (let i = 0; i < sat_vel.length; i++) {
        //sat_coords[i] = getSatelliteCoords(i, now); // Too slow!
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

    //updateSatellitesUi();
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

function unhighlightSatellites() {
    satellite_nameplate.innerHTML = "";
    satellite_nameplate.style.display = "none";
}

function intersectSatellites(raycaster, scene, container) {
    if (!finished_loading) return false;

    var geometry = sat_points.geometry;
    var attributes = geometry.attributes;
    var intersects = raycaster.intersectObject(sat_points);

    if (intersects.length > 0) { // If there is an intersection

        container.style.cursor = "pointer"; 

        // selected new satellite
        if (intersected_satellite !== intersects[0].index) { // New satellite is different than previous one

             // reset old satellite
            resetSatellite(intersected_satellite, scene, attributes.size);

            // change new satellite
            intersected_satellite = intersects[0].index;
            highlightSatellite(intersected_satellite, scene, attributes.size)
        }
        return true;

    } else if (intersected_satellite !== null) { // No intersection AND no previous intersection

        container.style.cursor = "auto"; 

        resetSatellite(intersected_satellite, scene, attributes.size);
        unhighlightSatellites();

        intersected_satellite = null;
    }

    return false;
}

function selectSatellite(sat_id) {
    if (selected_satellite_objects[sat_id] != null) return; // cancel if satellite is already selected

    selected_satellite_id = sat_id;

    var orbit_line = hover_orbit_line.clone();
    orbit_line.material = selected_orbit_material;
    orbit_selection_group.add(orbit_line);

    var projection_line = hover_proj_line.clone();
    projection_line.material = selected_proj_material;
    orbit_selection_group.add(projection_line);

    selected_satellite_objects[sat_id] = {
        orbit: orbit_line,
        proj: projection_line
    }

    addSatelliteToList(sat_id);
}

function removeSatellite(sat_id) {
    if (selected_satellite_objects[sat_id] == null) return; // canel if satellite is not selected
    
    orbit_selection_group.remove(selected_satellite_objects[sat_id].orbit);
    orbit_selection_group.remove(selected_satellite_objects[sat_id].proj);

    selected_satellite_objects[sat_id] = null;

}