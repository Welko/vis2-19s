var earth = null;
var _earth_scale;
var _earth_scale_km;

var cone_angle = 0;
var cone_lookAt_point_normalized = null;

var selection_cone;
var satellites_in_cone;

var _SELECTION_CONE_COLOR_ADD = new THREE.Color(0x44ff44);
var _SELECTION_CONE_COLOR_REM = new THREE.Color(0xff4444);

// Function: fillSceneWithEarth
//
// fills the scene with earth 🌍
//
// Parameters:
//      scene - the THREE.js scene object
//
function fillSceneWithEarth(scene) {
    var earth_geometry = new THREE.SphereGeometry( 1, 48, 24 );
    // _earth_scale = [6.378137, 6.356752, 6.378137];
    _earth_scale = [6.378137, 6.378137, 6.378137];
    _earth_scale_km = [_earth_scale[0] / KM_TO_WORLD_UNITS, _earth_scale[1] / KM_TO_WORLD_UNITS, _earth_scale[2] / KM_TO_WORLD_UNITS];
    earth_geometry.scale(_earth_scale[0], _earth_scale[1], _earth_scale[2]); // earth is ellipsoid: https://en.wikipedia.org/wiki/Figure_of_the_Earth#Volume
    // earth_geometry.rotateY(Math.PI*0.5);

    var earth_material = new THREE.MeshToonMaterial({
        map: new THREE.TextureLoader().load('./resources/earth.jpg'),
        gradientMap: new THREE.TextureLoader().load('./resources/gradient_map.png'),
        bumpScale: 0.1,
    });
    earth = new THREE.Mesh(earth_geometry, earth_material);

    var axesHelper = new THREE.AxesHelper(100);
    earth.add(axesHelper);

    scene.add(earth);

    generateSelectionCone();
}

// Function: generateSelectionCone
// generates the brush selection cone
function generateSelectionCone() {
    var h = 10000000;
    var r_ratio = 0.1; // find correct value!
    var r = h * r_ratio;

    cone_angle = Math.atan(r / h);
    console.log("Cone angle in rad: " + cone_angle);

    // radius, height, radial_segments, heightSegments, openEnded
    var geometry = new THREE.ConeBufferGeometry(r, h, 128, 1, true);

    var material = new THREE.MeshBasicMaterial( {
        color: 0xffff00,
        opacity: 0.2,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    } );

    geometry.translate(0, h * -0.5, 0);
    geometry.rotateX(-Math.PI / 2);

    selection_cone = new THREE.Mesh(geometry, material);
}

// Function: intersectEarth
//
// intersects the earth using the given raycaster, used for deciding the brush position, called in <render>
//
// Parameters:
//      raycaster - THREE.js raycaster object of the scene
//
// Returns:
//      reference to the earth if it got hit, otherwise null
//
function intersectEarth(raycaster) {
    if (earth == null) {
        return null;
    }

    let intersects = raycaster.intersectObject(earth);

    if (intersects.length > 0) {
        return intersects[0];
    } else {
        return null;
    }
}

// Function: intersectEarth
//
// positions the brush cone, called from <render>
//
// Parameters:
//      p - the position of the intersection
//
function positionCone(p) {
    cone_lookAt_point_normalized = p;
    cone_lookAt_point_normalized.normalize();

    selection_cone.lookAt(p);
    scene.add(selection_cone);
}

// Function: updateEarth
//
// updates the rotation of the earth according to the current time
// gets called every frame in the rendering loop!
//
// Parameters:
//      delta - passed delta time since last frame in seconds
//
function updateEarth(delta) {
    var gmst = satellite.gstime(_datetime);
    earth.setRotationFromAxisAngle(new THREE.Vector3(0,1,0), gmst);
}

// Function: removeCone
// removes the selection cone from the scene
function removeCone() {
    scene.remove(selection_cone);
}

// Function: findSatellitesInCone
// 
// calculates which satellites are insise the selection cone
//
// Returns:
//  	a sorted list with the indexes of all satellites that are inside the cone
//
function findSatellitesInCone() {
    if (cone_angle <= 0 || cone_lookAt_point_normalized == null) return [];

    var sat_indexes = [];
    for (var i = 0; i < sat_pos.length; i++) {
        var p = new THREE.Vector3(sat_pos[i*3], sat_pos[i*3+2], -sat_pos[i*3+1]);
        p.normalize();

        var c = cone_lookAt_point_normalized;
        //var c = cone_lookAt_point.clone();
        //c.normalize();

        var angle = Math.acos(p.dot(c));

        if (angle < cone_angle) {
            sat_indexes.push(i);
        }
    }

    return sat_indexes;
}

// Function: setSelectionConeFunctionToAdd
// 
// calculates which satellites are insise the selection cone
//
// Parameters:
//  	add - boolean, decides if satellites inside the cone should be added or removed from the selection
//
function setSelectionConeFunctionToAdd(add) {
    if (selection_cone == null) return;
    selection_cone.material.color = add ? _SELECTION_CONE_COLOR_ADD : _SELECTION_CONE_COLOR_REM;
}