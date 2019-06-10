var selected_satellite_id = null;
var selected_satellites_uis = [];
var selected_satellites_ids = [];

// Satellite added to list and its extra information
function addSatelliteToList(sat_id) {

    var data = sat_data[selected_satellite_id];
    var extra = sat_extra[selected_satellite_id];

    var sat_info = document.createElement("div");
    sat_info.setAttribute("id", "info-" + selected_satellite_id);
    sat_info.classList.add("satellite-info");

    var h1 = document.createElement("h1");
    h1.innerHTML = sat_data[selected_satellite_id].name;
    h1.classList.add("clickable");
    h1.setAttribute("onclick", "onSelectedSatelliteNameClicked(" + selected_satellite_id + ")");
    sat_info.appendChild(h1);

    var div = "<div class='info-buttons'>";
    div += "<button class='flip-button' onclick='flipInfo(" + selected_satellite_id + ")'></button>";
    div += "<button class='remove-button' onclick='removeInfo(" + selected_satellite_id + ")'></button>";
    div += "</div><table>";

        div += "<tr><td>Type</td><td>" + data.type + "</td></tr>";

        div += "<tr><td>Latitude</td><td id='lat-"+selected_satellite_id+"'></td></tr>";
        div += "<tr><td>Longitude</td><td id='lon-"+selected_satellite_id+"'></td></tr>";
        div += "<tr><td>Altitude</td><td id='alt-"+selected_satellite_id+"'></td></tr>";

        div += "<tr><td>Inclination</td><td>" + extra.inclination + "</td></tr>";
        div += "<tr><td>Eccentricity</td><td>" + extra.eccentricity + "</td></tr>";
        div += "<tr><td>Raan</td><td>" + extra.raan + "</td></tr>";
        div += "<tr><td>AargPe</td><td>" + extra.argPe + "</td></tr>";
        div += "<tr><td>Mean Motion</td><td>" + extra.meanMotion + "</td></tr>";
        div += "<tr><td>Inclination</td><td>" + extra.inclination + "</td></tr>";
        div += "<tr><td>Inclination</td><td>" + extra.inclination + "</td></tr>";

        div += "<tr><td>Semi Major Axis</td><td>" + extra.semiMajorAxis + "</td></tr>";
        div += "<tr><td>Semi Minor Axis</td><td>" + extra.semiMinorAxis + "</td></tr>";
        div += "<tr><td>Apogee</td><td>" + extra.apogee + "</td></tr>";
        div += "<tr><td>Perigee</td><td>" + extra.perigee + "</td></tr>";
        div += "<tr><td>Period</td><td>" + extra.period + "</td></tr>";

    div += "</table></div>";

    sat_info.innerHTML += div;

    satellite_info_box.appendChild(sat_info);

    selected_satellites_ids.push(intersected_satellite);
    selected_satellites_uis.push(document.getElementById("info-" + selected_satellite_id));

    if (selected_satellites_uis.length > 1) {
        for (var i = 0; i < selected_satellites_uis.length; i++) {
            selected_satellites_uis[i].classList.toggle('full', false);
        }
    }
}

function flipInfo(sat_id) {
    document.getElementById("info-" + sat_id).classList.toggle("full");
}

function removeInfo(sat_id) {
    removeSatellite(sat_id);

    var index = selected_satellites_ids.indexOf(sat_id);
    selected_satellites_ids.splice(index, 1);
    selected_satellites_uis.splice(index, 1);

    var reme = document.getElementById("info-" + sat_id);
    reme.parentElement.removeChild(reme);
}

function updateSatellitesUi() {
    for (var i = 0; i < selected_satellites_ids.length; i++) {
        updateSatelliteUi(i);
    }
}

function updateSatelliteUi(index) {
    var id = selected_satellites_ids[index];
    var lat = document.getElementById("lat-" + id);
    var lon = document.getElementById("lon-" + id);
    var alt = document.getElementById("alt-" + id);

    var a = sat_geo[index*3];
    var b = sat_geo[index*3 + 1];
    var c = sat_geo[index*3 + 2];

    lat.innerHTML = sat_geo[index*3];
    lon.innerHTML = sat_geo[index*3 + 1];
    alt.innerHTML = sat_geo[index*3 + 2];
}

function onSelectedSatelliteNameClicked(sat_id) {
    search(sat_data[sat_id].name);
}