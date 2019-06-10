var SATELLITE_SIZE = 6;
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
var empty_hover_buffers = {};
var position_projection_line;
var satellite_transform;

var intersected_satellite = null;
var orbit_selection_group = null;
var selected_satellite_objects = [];

var selected_orbit_material;
var selected_proj_material;

var finished_loading = false;

// Function: loadJSON
//
// loads the TLE json
//
// Parameters:
//      callback - callback that will get invoked on completion
//      path - path to the TLE file
//
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


// Function: startSatelliteLoading
//
// starts loading satellite data (local for now)
//
// Parameters:
//      scene - reference to the THREE.js scene
//
function startSatelliteLoading(scene) {
    
    var path;
    
    if (window.location.href.endsWith("live")) {
        path = "http://stuffin.space/TLE.json?fakeparameter=to_avoid_browser_cache2"; // thx to stuffin.space <3
    } else {
        path = "./resources/TLE.json";
    }
    loadJSON(function(text) { getSatellites(scene, text); }, path);
}

// Function: getSatellites
//
// parses the satellites from the given TLE data
//
// Parameters:
//      scene - reference to the THREE.js scene
//      tle_text - string containing a json of TLE data
//
function getSatellites(scene, tle_text) {
    tle_json = JSON.parse(tle_text);

    var sat_count = tle_json.length;

    sat_data = [];
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

    prepareOrbitBuffers();
    prepareSatellitePoints(sat_count);

    hover_orbit_line.applyMatrix(satellite_transform);
    scene.add(hover_orbit_line);
    
    hover_proj_line.applyMatrix(satellite_transform);
    scene.add(hover_proj_line); // dont' do that mayb?

    position_projection_line.applyMatrix(satellite_transform);
    scene.add(position_projection_line);

    orbit_selection_group = new THREE.Group();
    scene.add(orbit_selection_group);

    satelliteWorker.postMessage({
        tle_data : tle_json,
        datetime : _datetime,
        date_update : false,
    });

    var ground_track_margin_km = 10;

    orbitWorker.postMessage({
        is_init : true,
        tle_data : tle_json,
        segments : ORBIT_SEGMENTS,
        datetime : _datetime,
        earth_scale : [
            _earth_scale_km[0] + ground_track_margin_km,
            _earth_scale_km[1] + ground_track_margin_km,
            _earth_scale_km[2] + ground_track_margin_km]
    });
}

// Function: prepareSatellitePoints
//
// initializes the THREE.js buffers for rendering the satellite point cloud
//
// Parameters:
//      sat_count - number of satellites to be stored
//
function prepareSatellitePoints(sat_count) {

    var sizes = [];
    for (var i = 0; i < sat_count; i++) {
        sizes.push(SATELLITE_SIZE);
    }

    let geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(sat_count*3), 3).setDynamic(true));
    geometry.addAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(sat_count*4), 4).setDynamic(true));
    geometry.addAttribute('size', new THREE.Float32BufferAttribute(sizes, 1).setDynamic(true));
    //geometry.computeBoundingSphere();

    var material = new THREE.ShaderMaterial( {
        uniforms: {
            texture: { value: new THREE.TextureLoader().load("./resources/circle.png") }
        },
        vertexShader: satellite_vert,
        fragmentShader: satellite_frag,
        // blending: THREE.AdditiveBlending, depthTest: true,
        depthWrite: false,
        alphaTest: 0.5, 
        transparent: true
    } );

    sat_points = new THREE.Points(geometry, material);
}

// Function: prepareSatellitePoints
// prepares the THREE.js buffers for rendering the orbits
function prepareOrbitBuffers() {

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
    empty_hover_buffers.orbit_buffer = new Float32Array((ORBIT_SEGMENTS+1)*3);
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(empty_hover_buffers.orbit_buffer, 3).setDynamic(true));

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
    empty_hover_buffers.position_line_buffer = new Float32Array(2*3);
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(empty_hover_buffers.position_line_buffer, 3).setDynamic(true));

    material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        opacity: 0.75,
        transparent: true,
    });

    position_projection_line = new THREE.Line(geometry, material);
}


// Function: updateOrbitBuffer
//
// requests the orbit worker to get an update of the given satellite's orbit
//
// Parameters:
//      sat_id - id of the satellite whose orbit should get updated
//
function updateOrbitBuffer(sat_id) {
    if(in_progress[sat_id]) return; // cancel because orbit is currently calculated

    orbitWorker.postMessage({
        datetime : _datetime,
        is_init : false,
        sat_id : sat_id
    });

    in_progress[sat_id] = true;
};

// Function: updateSatelliteDateRelevantInfos
// updates the date dependent code for the satellites
function updateSatelliteDateRelevantInfos() {
    updateSatelliteCalculationWorker();
}

// Function: updateSatelliteCalculationWorker
// updates the satellites calculation worker by giving it the current time
function updateSatelliteCalculationWorker() {
    satelliteWorker.postMessage({
        datetime : _datetime,
        date_update : true,
    });
}

var got_extra_data = false;

// Function: satelliteWorker.onmessage
//
// handles incoming messages from the satelliteWorker, which are updates on
// position, velocity and geo information of all satellites
// gets called approx. twice a second
//
// Parameters:
//      m - message object from the worker, contains position, velocity and geo information arrays
//
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

        initializeSatelliteSelectorIfNotInitialized();
        initializeSearcher();

        sat_points.applyMatrix(satellite_transform);
        scene.add(sat_points); 

        setColorMode(_COLOR_MODE_TYPE);

        addAllSatellites();

        // Visibility
        setPlanetsVisibility(_ui_checkbox_show_planets.checked);
        setGridsVisibility(_ui_checkbox_show_grids.checked);
        setEarthAxesVisibility(_ui_checkbox_show_axes.checked);
    }

    var position = sat_points.geometry.attributes.position;
    position.copyArray(sat_pos);
    position.needsUpdate = true;

    updateSatellitesUi();
};

// Function: orbitWorker.onmessage
//
// handles incoming messages from the orbitWorker
// which are updates of the orbit and ground track of one satellite
//
// Parameters:
//      m - message object from the worker, contains orbit and ground track (proj) points
//
orbitWorker.onmessage = function(m) {
    var sat_id = m.data.sat_id;
    var orbit_points = new Float32Array(m.data.orbit_points);
    var proj_points = new Float32Array(m.data.proj_points);

    var orbit_position;
    var proj_position;

    if (sat_id == intersected_satellite) {
        orbit_position = hover_orbit_line.geometry.attributes.position;
        proj_position = hover_proj_line.geometry.attributes.position;
    } else {
        if (selected_satellite_objects[sat_id] == null) {
            // console.error("no receiver for orbit points");
            return;
        }

        orbit_position = selected_satellite_objects[sat_id].orbit.geometry.attributes.position;
        proj_position = selected_satellite_objects[sat_id].proj.geometry.attributes.position;
    }

    orbit_position.copyArray(orbit_points);
    orbit_position.needsUpdate = true;

    proj_position.copyArray(proj_points);
    proj_position.needsUpdate = true;
    

    in_progress[sat_id] = false;
};

// Function: updateSatellites
//
// updates the position of all satellites by adding the delta time scaled velocity vector
// gets called every frame in the rendering loop!
//
// Parameters:
//      delta - passed delta time since last frame in seconds
//
function updateSatellites(delta) {
    if (!finished_loading) return;

    var position = sat_points.geometry.attributes.position;
    var positions = position.array;
    var now = new Date();
    for (var i = 0; i < sat_vel.length; i++) {
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
}

// Function: resetSatellite
//
// resets a selected satellite
//
// Parameters:
//      sat_id - the id of the satellite which should henceforth be displayed as just a simple satellite, trying to make its way in the universe. 🛰
//      sizes - THREE.js buffer for updating the satellites size
//
function resetSatellite(sat_id, sizes) {
    sizes.array[sat_id] = SATELLITE_SIZE;
    sizes.needsUpdate = true;
}

// Function: highlightSatellite
//
// highlights a satellite, that is the satellite currently under the cursor (hovered)
//
// Parameters:
//      sat_id - the id of the satellite which is now going to be amongst the stars 🤩
//      sizes - THREE.js buffer for updating the satellites size
//
function highlightSatellite(sat_id, sizes) {
    updateOrbitBuffer(sat_id);

    sizes.array[sat_id] = SATELLITE_SIZE * 1.5;
    sizes.needsUpdate = true;
    
    satellite_nameplate.innerHTML = sat_data[intersected_satellite].name;
    satellite_nameplate.style.left = mouse_screen.x + "px";
    satellite_nameplate.style.top = mouse_screen.y + "px";
    satellite_nameplate.style.display = "inherit";
}

// Function: unhighlightSatellites
//
// unhighlights - for the lack of a better word - a satellite, that is the satellite that was previously under the cursor is under it no more
//
// Parameters:
//      sat_id - the id of the satellite which is now going to be amongst the stars ✨
//      sizes - THREE.js buffer for updating the satellites size
//
function unhighlightSatellites() {
    satellite_nameplate.innerHTML = "";
    satellite_nameplate.style.display = "none";

    var position = hover_orbit_line.geometry.attributes.position;
    position.copyArray(empty_hover_buffers.orbit_buffer);
    position.needsUpdate = true;
    
    position = hover_proj_line.geometry.attributes.position;
    position.copyArray(empty_hover_buffers.orbit_buffer);
    position.needsUpdate = true;

    position = position_projection_line.geometry.attributes.position;
    position.copyArray(empty_hover_buffers.position_line_buffer);
    position.needsUpdate = true;
}

// Function: intersectSatellites
//
// intersects the satellite cloud using the given raycaster, used for deciding which satellite is below the cursor
//
// Parameters:
//      raycaster - THREE.js raycaster object of the scene
//      container - DOM element handle for changing the cursor
//
// Returns:
//      a boolean indicating whether the ray hit something
//
function intersectSatellites(raycaster, container) {
    if (!finished_loading) return false;

    var geometry = sat_points.geometry;
    var attributes = geometry.attributes;
    var intersects = raycaster.intersectObject(sat_points);

    for (var i = 0; i < intersects.length; i++) {
        var index = intersects[i].index;
        if (_SAT_IDS_SELECTED[index]) {
            if (intersected_satellite !== index) {
                // This satellite is selected AND it's a different satellite than the one intersected previously
                resetSatellite(intersected_satellite, attributes.size);
                intersected_satellite = index;
                highlightSatellite(intersected_satellite, attributes.size);
            }
            container.style.cursor = "pointer";
            return true;
        }
    }

    if (intersected_satellite !== null) {
        container.style.cursor = "auto";
        resetSatellite(intersected_satellite, attributes.size);
        unhighlightSatellites();
        intersected_satellite = null;
    }

    return false;
}

// Function: selectSatellite
//
// selects a satellite - that is displaying its orbit, ground track and information continously even if not hovered over
// called only when hovering + click (because then we already have the orbit and projection line)
//
// Parameters:
//      sat_id - id of the satellite that should become selected
//
function selectSatellite(sat_id) {
    if (selected_satellite_objects[sat_id] != null) return; // cancel if satellite is already selected

    selected_satellite_id = sat_id;
    cloneOrbitAndProjection(sat_id);

    addSatelliteToList(sat_id);
}

// Function: cloneOrbitAndProjection
//
// clones the THREE.js buffers of the orbit and the projection line so they can be displayed
//
// Parameters:
//      sat_id - id of the satellite that should become selected
//
function cloneOrbitAndProjection(sat_id) {
    if (selected_satellite_objects[sat_id] != null) return; // cancel if satellite is already selected

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
}

// Function: displaySatelliteOrbit
//
// display a satellites orbit, ground track and information continously even if not hovered over,
// called if added to the details list (also from the outside)
//
// Parameters:
//      sat_id - id of the satellite that should become selected
//
function displaySatelliteOrbit(sat_id) {
    if (selected_satellite_objects[sat_id] != null) return; // cancel if satellite is already selected (when clicked from ui)

    cloneOrbitAndProjection(sat_id);
    updateOrbitBuffer(sat_id);
}

// Function: removeSatellite
//
// removes a selected satellite - orbit, ground track and information will not be shown anymore
//
// Parameters:
//      sat_id - id of the satellite whose orbit, ground track and information should not be visible anymore
//
function removeSatellite(sat_id) {
    if (selected_satellite_objects[sat_id] == null) return; // canel if satellite is not selected
    
    orbit_selection_group.remove(selected_satellite_objects[sat_id].orbit);
    orbit_selection_group.remove(selected_satellite_objects[sat_id].proj);

    selected_satellite_objects[sat_id] = null;
}