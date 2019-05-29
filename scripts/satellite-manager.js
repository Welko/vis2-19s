// Source: https://github.com/shashwatak/satellite-js

var satellites = null;

export function getSatellites(callback) {
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
        .then(function(json) {
            satellites = json;
            callback(json);
        });
}

function areSatellitesGood() {
    return satellites != null;
}