var earth = null;

var cone_angle = 0;
var cone_lookAt_point_normalized = null;

var selection_cone;
var satellites_in_cone;

var _SELECTION_CONE_COLOR_ADD = new THREE.Color(0x44ff44);
var _SELECTION_CONE_COLOR_REM = new THREE.Color(0xff4444);

function fillSceneWithEarth(scene) {
    var earth_geometry = new THREE.SphereGeometry( 1, 48, 24 );
    earth_geometry.scale(6.378137, 6.356752, 6.378137); // earth is ellipsoid: https://en.wikipedia.org/wiki/Figure_of_the_Earth#Volume
    var earth_bump;// = new THREE.TextureLoader().load('./resources/earth_bump.png');
    var earth_material = new THREE.MeshStandardMaterial({
        map: new THREE.TextureLoader().load('./resources/earth.jpg'),
        bumpMap: earth_bump,
        bumpScale: 0.1,
        roughnessMap: earth_bump,
        metalnessMap: earth_bump,
    });
    earth = new THREE.Mesh(earth_geometry, earth_material);

    scene.add(earth);

    generateSelectionCone();
}

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
        side: THREE.DoubleSide
    } );

    geometry.translate(0, h * -0.5, 0);
    geometry.rotateX(-Math.PI / 2);

    selection_cone = new THREE.Mesh(geometry, material);
}

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

function positionCone(p) {
    cone_lookAt_point_normalized = p;
    cone_lookAt_point_normalized.normalize();

    selection_cone.lookAt(p);
    scene.add(selection_cone);
}

function removeCone() {
    scene.remove(selection_cone);
}

// Returns a sorted list with the indexes of all satellites that are inside the cone
function findSatellitesInCone() {
    if (cone_angle <= 0 || cone_lookAt_point_normalized == null) return [];

    var sat_indexes = [];
    for (var i = 0; i < sat_pos.length; i++) {
        var p = new THREE.Vector3(sat_pos[i*3], sat_pos[i*3+1], sat_pos[i*3+2]);
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

function setSelectionConeFunctionToAdd(add) {
    if (selection_cone == null) return;
    selection_cone.material.color = add ? _SELECTION_CONE_COLOR_ADD : _SELECTION_CONE_COLOR_REM;
}