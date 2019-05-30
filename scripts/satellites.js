// Source: https://github.com/shashwatak/satellite-js

let _sats = null;
let _sats_pos = null;
let _sats_vel = null;

let _sats_points = null;

let _scaling_factor = 0.001;

let intersectedSatellite = null;

function getSatellites(callback) {
    if (areSatellitesGood()) {
        callback();
    } else {
        fetchSatellites(callback);
    }
}

function fetchSatellites(callback, address = null) {
    if (address == null) {
        address = "./resources/TLE.json";
    }
    fetch(address)
        .then(function(response) {
            return response.json();
        })
        .then(function(satList) {
            buildSatellites(satList);
            callback();
        });
}

function areSatellitesGood() {
    return _sats != null;
}

// Source: https://github.com/shashwatak/satellite-js
function buildSatellites(satList) {
    let now = new Date();

    // Greenwich Mean Sidereal Time: https://en.wikipedia.org/wiki/Sidereal_time#Definition
    let gmst = satellite.gstime(now);

    let colors = [];
    let sizes = [];

    let typesCache = [];
    let colorsCache = [];

    let sats = [];
    let poss = [];
    let vels = [];
    for (let i = 0; i < satList.length; i++) {

        let sati = satList[i];

        let satrec = satellite.twoline2satrec(sati.TLE_LINE1, sati.TLE_LINE2); // Satellite record

        // ECI: https://en.wikipedia.org/wiki/Earth-centered_inertial
        let positionAndVelocity_eci = satellite.propagate(satrec, now);

        let posEcf, velEcf;
        if (!positionAndVelocity_eci.hasOwnProperty('position') ||
            !positionAndVelocity_eci.hasOwnProperty('velocity') ||
            isNaN(positionAndVelocity_eci.position.x) ||
            isNaN(positionAndVelocity_eci.velocity.x) ||
            typeof positionAndVelocity_eci.position !== "object" ||
            typeof positionAndVelocity_eci.velocity !== "object"
        ) {
            //console.log("Type of position: " + typeof positionAndVelocity_eci.position);
            //console.log("Is object? " + (typeof positionAndVelocity_eci.position === "object"));
            posEcf = {x: 0, y: 0, z: 0};
            velEcf = {x: 0, y: 0, z: 0};
        } else {
            posEcf = satellite.eciToEcf(positionAndVelocity_eci.position, gmst);
            velEcf = satellite.eciToEcf(positionAndVelocity_eci.velocity, gmst);

            posEcf.x *= _scaling_factor;
            posEcf.y *= _scaling_factor;
            posEcf.z *= _scaling_factor;

            let f = _scaling_factor * 100;
            velEcf.x *= f;
            velEcf.y *= f;
            velEcf.z *= f;
        }

        let sat = {
            intldes:  sati.INTLDES,// LM: I couldn't find what this means :/
            name: sati.OBJECT_NAME,
            type: sati.OBJECT_TYPE
        };

        // Debug TODO: remove
        if (i < 10) console.log(posEcf.x, posEcf.y, posEcf.z);
        if (isNaN(posEcf.x) || isNaN(posEcf.y) || isNaN(posEcf.z)) {
            console.error("NaN in satellite position: ", i, posEcf.x, posEcf.y, posEcf.z, sat);
            posEcf.x = 0.0;
            posEcf.y = 0.0;
            posEcf.z = 0.0;
        }

        // three.js stuff
        let index = typesCache.indexOf(sat.type);
        if (index === -1) {
            typesCache.push(sat.type);
            colorsCache.push(next_color());
            index = typesCache.length - 1;
        }
        let c = colorsCache[index];

        sats.push(sat);
        poss.push(posEcf.x, posEcf.y, posEcf.z);
        vels.push(velEcf.x, velEcf.y, velEcf.z);

        colors.push(c[0], c[1], c[2]);
        sizes.push(PARTICLE_SIZE);
    }

    let geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(poss, 3).setDynamic(true));
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

    let points = new THREE.Points(geometry, material);

    _sats = sats;
    _sats_pos = poss;
    _sats_vel = vels;

    _sats_points = points;

    console.log("Loaded " + _sats.length + " satellites, " + typesCache.length + " types!")
}

function updateSatellites(delta) {
    if (_sats_vel == null || _sats_pos == null) {
        return;
    }

    let position = _sats_points.geometry.attributes.position;
    let positions = position.array;
    for (let i = 0; i < _sats_vel.length; i++) {
        positions[i] += delta * _sats_vel[i];
    }

    position.needsUpdate = true;
}

let color_satellites_prev = -1;
let color_satellites = [
    [0.89411765, 0.10196078, 0.10980392],
    [0.21568627, 0.49411765, 0.72156863],
    [0.30196078, 0.68627451, 0.29019608],
    [0.59607843, 0.30588235, 0.63921569]
];
function next_color() { return color_satellites[(++color_satellites_prev) % color_satellites.length] }

function intersectSatellites(raycaster) {
    let geometry = _sats_points.geometry;
    let attributes = geometry.attributes;
    let intersects = raycaster.intersectObject(_sats_points);
    if (intersects.length > 0) {
        // selected new satellite
        if (intersectedSatellite !== intersects[0].index) {

            // reset old satellite
            attributes.size.array[intersectedSatellite] = PARTICLE_SIZE;

            // change new satellite
            intersectedSatellite = intersects[0].index;
            attributes.size.array[intersectedSatellite] = PARTICLE_SIZE * 1.5;
            attributes.size.needsUpdate = true;

            satellite_nameplate.innerHTML = _sats[intersectedSatellite].name;
            satellite_nameplate.style.left = mouse_screen.x + "px";
            satellite_nameplate.style.top = mouse_screen.y + "px";
        }
        return true;

    } else if (intersectedSatellite !== null) {
        attributes.size.array[intersectedSatellite] = PARTICLE_SIZE;
        attributes.size.needsUpdate = true;
        intersectedSatellite = null;
        satellite_nameplate.innerHTML = "";
        // TODO make nameplate invisible
    }

    return false;
}