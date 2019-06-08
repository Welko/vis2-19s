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

var orbit_line;
var position_projection_line;
var satellite_transform;

var intersected_satellite = null;
var orbit_selection_group = null;
var selected_orbit_material;

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

function addColor(color, descr) {
    var row = "<tr><td style='width: 5em; background-color: #" + color.getHexString() + ";'></td>";
    row += "<td>" + descr + "</td></tr>";
    return row;
}

function changeSatelliteColors(value, table) {
    if (!finished_loading) return;

    table.innerHTML = "";
    var new_content = "";
    var colors = sat_points.geometry.attributes.color;

    var range_colors = [
        new THREE.Color(0xffffb2),
        new THREE.Color(0xfecc5c),
        new THREE.Color(0xfd8d3c),
        new THREE.Color(0xf03b20),
        new THREE.Color(0xbd0026)
    ];

    if (value === "selection") {
        colorAllSatellitesBasedOnSelection();
        new_content += addColor(_SAT_COLOR_SELECTED, "Selected");
        new_content += addColor(_SAT_COLOR_NOT_SELECTED, "Not selected");

    } else if (value === "altitude" || value === "distance") { // DOES NOT UPDATE continuously!

        var range = [];
        if (value === "distance") {
            for (var i = 0; i < sat_pos.length; i++) {
                var x = sat_pos[i*3];
                var y = sat_pos[i*3+1];
                var z = sat_pos[i*3+2];
                range.push(Math.sqrt(x*x + y*y + z*z));
            }
        } else {
            //range = sat_alt; // sat_alt changed to sat_geo TODO reimplement
        }

        for(var i = 0; i < range.length; i++) {
            var d = range[i];
            var r = Math.min(Math.floor(d / 10000), range_colors.length-1);
            var color = range_colors[r];

            colors.array[i*3] = color.r,
            colors.array[i*3+1] = color.g;
            colors.array[i*3+2] = color.b;
        }

        for (var i = 0; i < range_colors.length; i++) {
            var min = (i * 10000) + "";
            var max = (((i+1) * 10000)) + "";
            if (i == range_colors.length-1) max = "Infinity";
            new_content += addColor(range_colors[i], "[" + min + " - " + max + "[ km");
        }

    } else if (value === "type") {
        colors.copyArray(type_colors);

        for (var i = 0; i < typesCache.length; i++) {
            new_content += addColor(colorsCache[i], typesCache[i]);
        }
    }

    table.innerHTML = new_content;

    colors.needsUpdate = true;
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

    orbit_selection_group = new THREE.Group();
    scene.add(orbit_selection_group);

    satelliteWorker.postMessage({
        tle_data : tle_json
    });

    orbitWorker.postMessage({
        is_init : true,
        tle_data : tle_json,
        segments : ORBIT_SEGMENTS
    });
}

var typesCache = [];
var colorsCache = [];
function prepareSatellitePoints(sat_data) {
    
    let color_satellites_prev = -1;

    //http://colorbrewer2.org/#type=qualitative&scheme=Set1&n=8
    let color_satellites = [
        new THREE.Color(0xe41a1c),
        new THREE.Color(0x377eb8),
        new THREE.Color(0x4daf4a),
        new THREE.Color(0x984ea3),
        new THREE.Color(0xff7f00),
        new THREE.Color(0xffff33),
        new THREE.Color(0xa65628),
        new THREE.Color(0xf781bf)
    ];
    function next_color() { return color_satellites[(++color_satellites_prev) % color_satellites.length] };

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
        
        colors.push(c.r, c.g, c.b);
    }

    type_colors = new Float32Array(colors);

    let geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(sat_data.length*3), 3).setDynamic(true));
    geometry.addAttribute('color', new THREE.Float32BufferAttribute(type_colors, 3).setDynamic(true));
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
        color: 0xffffff,
        linewidth: 2,
    });

    selected_orbit_material = new THREE.LineBasicMaterial({
        color: 0xaaaaaa,
        opacity: 0.75,
        transparent: true,
    });

    orbit_line = new THREE.Line(geometry, material);


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

        changeSatelliteColors("type", document.getElementById('color-info')); // call once so the text ist written
    }

    var position = sat_points.geometry.attributes.position;
    position.copyArray(sat_pos);
    position.needsUpdate = true;

    updateSatellitesUi();
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
    let now = new Date();
    for (let i = 0; i < sat_data.length; i++) {
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

    updateSatellitesUi();
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
    addSatelliteToList(sat_id);
}