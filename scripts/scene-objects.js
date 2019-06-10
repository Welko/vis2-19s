var SPACE_ORBIT_SEGMENTS = 1024;

var sample_orbit;
var bodies = [];
var equatorial_to_ecliptic; 

var sun_light;

function createSceneBody(radius, height, color) {
    var body_geometry = new THREE.SphereGeometry(1, 48, 24);
    body_geometry.scale(radius, height, radius); // https://en.wikipedia.org/wiki/Moon
    var body_material = new THREE.MeshStandardMaterial({color: color});
    var sphere = new THREE.Mesh(body_geometry, body_material);

    var line_material = new THREE.LineBasicMaterial({ color: new THREE.Color(color) });
    var line_geometry = new THREE.Geometry();
    line_geometry.vertices.push(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 100000, 0),
    );
    
    var line = new THREE.Line(line_geometry, line_material);

    var group = new THREE.Group();
    group.add(sphere);
    group.add(line);
    return group;
}

function createBody(astronomy_body, radius, height, color) {
    var scene_body = createSceneBody(radius, height, color);
    scene.add(scene_body);
    addBodyOrbit(scene, astronomy_body, color);
    bodies.push({ astronomy_body: astronomy_body, scene_object: scene_body });
}

function fillSceneWithObjects(scene) {
    // grid
    var grid = new THREE.GridHelper(1000, 10, 0x666666, 0x333333);
    grid.material.opacity = 0.5;
    grid.material.transparent = true,
    scene.add(grid);
    
    var polar_grid = new THREE.PolarGridHelper(200, 16, 20, 64, 0x666666, 0x666666);
    polar_grid.material.opacity = 0.5;
    polar_grid.material.transparent = true,
    scene.add(polar_grid);

    sun_light = new THREE.DirectionalLight(0xffffff, 0.5);
    scene.add(sun_light);

    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SPACE_ORBIT_SEGMENTS*3), 3));
    var material = new THREE.LineBasicMaterial({
        color: 0x999999,
        opacity: 0.5,
        transparent: true,
    });
    sample_orbit = new THREE.Line(geometry, material);

    var obliquity = 23.43676 / 180 * Math.PI;
    var cos_o = Math.cos(obliquity);
    var sin_o = Math.sin(obliquity);
    equatorial_to_ecliptic = new THREE.Matrix3();
    equatorial_to_ecliptic.set(
        1, 0, 0,
        0, -cos_o, -sin_o,
        0, sin_o, -cos_o
    );

    // earth
    fillSceneWithEarth(scene);

    createBody(Astronomy.Moon, 1.7381, 1.7360, 0xdddddd);
    createBody(Astronomy.Sun, 695.700, 695.700, 0xffff55);
    
    createBody(Astronomy.Mercury, 2.4397, 2.4397, 0x404348);
    createBody(Astronomy.Venus, 6.0518, 6.0518, 0xf6c660);
    createBody(Astronomy.Mars, 3.3962, 3.3762, 0xff2200);
    createBody(Astronomy.Jupiter, 69.911, 69.911, 0x9e7d74);
    createBody(Astronomy.Saturn, 60.268, 54.364, 0xe5c27d);
    createBody(Astronomy.Uranus, 25.559, 24.973, 0xbee4e7);
    createBody(Astronomy.Neptune, 24.764, 24.341, 0x3952d3);

    continuousAstronomyCalculation();

    var r = "./resources/milky_way/";
    var urls = [
        r + "px.jpg", r + "nx.jpg",
        r + "py.jpg", r + "ny.jpg",
        r + "pz.jpg", r + "nz.jpg"
    ];
    var textureCube = new THREE.CubeTextureLoader().load(urls);
    textureCube.mapping = THREE.CubeRefractionMapping;
    
    scene.background = textureCube;
}

function updateSceneObjects(delta) {
    updateEarth(delta);
}

var AU_TO_KM = 149597870.7;
var KM_TO_WORLD_UNITS = 0.001;
var AU_TO_WORLD_UNITS = 149597.8707;

function addBodyOrbit(scene, body, color) {
    var orbit = sample_orbit.clone();
    orbit.material.color = new THREE.Color(color);

    var positions = new Float32Array(SPACE_ORBIT_SEGMENTS*3);

    var period = 1 / body.Mc * 360; //  Mc ("mean motion") = rate of change in deg/day = 360/period
    period *= 2;
    if (body.Name == "Sun") {
        period = 365.25; //https://en.wikipedia.org/wiki/Year
    }
    var day = Astronomy.DayValue(_datetime);

    for (var i = 0; i < SPACE_ORBIT_SEGMENTS; i++) {
        var segment = (i / SPACE_ORBIT_SEGMENTS) * period;
        var c = body.GeocentricCoordinates(day + segment); //https://en.wikipedia.org/wiki/Astronomical_unit
        var coordinates = new THREE.Vector3(c.x, c.y, c.z);
        coordinates.multiplyScalar(AU_TO_WORLD_UNITS);
        coordinates = EquatorialToEclipticPlane(coordinates);

        positions[i*3] = coordinates.x;
        positions[i*3+1] = coordinates.z; // y and z flipped
        positions[i*3+2] = coordinates.y;

        if (isNaN(positions[i*3]) || isNaN(positions[i*3+1]) || isNaN(positions[i*3+2])) {
            console.log(i, day, positions[i*3], positions[i*3+1], positions[i*3+2], coordinates.x, coordinates.z, coordinates.y);
        }
    }

    orbit.geometry.attributes.position.copyArray(positions);
    orbit.geometry.attributes.position.needsUpdate = true;

    scene.add(orbit);
}

function EquatorialToEclipticPlane(coordinates) {
    var cor = coordinates.applyMatrix3(equatorial_to_ecliptic);
    return cor;
}

function updateSceneObjectDateRelevantInfos() {
    astronomyCalculation();
}

function continuousAstronomyCalculation() {
    astronomyCalculation();
    setTimeout(astronomyCalculation, 1000);
}

function astronomyCalculation() {
    
    var day = Astronomy.DayValue(_datetime);

    for (var i = 0; i < bodies.length; i++) {
        var body = bodies[i].astronomy_body;
        var c = body.GeocentricCoordinates(day); //https://en.wikipedia.org/wiki/Astronomical_unit
        var coordinates = new THREE.Vector3(c.x, c.y, c.z);
        coordinates.multiplyScalar(AU_TO_WORLD_UNITS);
        coordinates = EquatorialToEclipticPlane(coordinates);

        var scene_object_pos = bodies[i].scene_object.position;
        scene_object_pos.x = coordinates.x;
        scene_object_pos.y = coordinates.z; // ATTENTION FLIP
        scene_object_pos.z = coordinates.y;

        if (body.Name == "Sun") {
            sun_light.position.x = scene_object_pos.x;
            sun_light.position.y = scene_object_pos.y;
            sun_light.position.z = scene_object_pos.z;
        }
    }
}