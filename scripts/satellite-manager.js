// Source: https://github.com/shashwatak/satellite-js

var satellites = null;

function getSatellites(callback) {
    if (areSatellitesGood()) {
        callback(satellites);
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
            callback(buildSatellites(satList));
        });
}

function areSatellitesGood() {
    return satellites != null;
}

function buildSatellites(satList) {
    let now = new Date();

    // Greenwich Mean Sidereal Time: https://en.wikipedia.org/wiki/Sidereal_time#Definition
    let gmst = satellite.gstime(now);

    let sats = [];
    for (let i = 0; i < satList.length; i++) {
        let sat = buildSatellite(satList[i], now, gmst);
        if (sat != null) {
            sats.push(sat);
        }
    }
    return sats;
}

// Source: https://github.com/shashwatak/satellite-js
function buildSatellite(data, date, gmst) {
    let satrec = satellite.twoline2satrec(data.TLE_LINE1, data.TLE_LINE2); // Satellite record

    // ECI: https://en.wikipedia.org/wiki/Earth-centered_inertial
    let positionAndVelocity_eci = satellite.propagate(satrec, date);

    if (!positionAndVelocity_eci.hasOwnProperty('position') || !positionAndVelocity_eci.hasOwnProperty('velocity')) {
        return null;
    }

    // ECF: https://en.wikipedia.org/wiki/ECEF
    let positionEcf = satellite.eciToEcf(positionAndVelocity_eci.position, gmst);
    let velocityEcf = satellite.eciToEcf(positionAndVelocity_eci.velocity, gmst);

    return {
        intldes: data.INTLDES, // LM: I couldn't find what this means :/
        name: data.OBJECT_NAME,
        type: data.OBJECT_TYPE,

        // Position and velocity both on ECF coordinates
        pos: positionEcf,
        vel: velocityEcf
    };
}