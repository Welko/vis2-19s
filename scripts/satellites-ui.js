var selected_satellite_id = null;
var selected_satellites_uis = [];
var selected_satellites_ids = [];

// Function: addSatellitesToList
//
// adds the given satellites to the details list
//
// Parameters:
//      sat_ids - array of satellite ids describing the satellites, which should be added to the detail list
//
function addSatellitesToList(sat_ids) {
    for (var i = 0; i < sat_ids.length; i++) {
        addSatelliteToList(sat_ids[i]);
    }
}

// Function: addSatelliteToList
//
// adds the given satellite to the details list
//
// Parameters:
//      sat_id - the id of the satellite which should be added to the detail list
//
function addSatelliteToList(sat_id) {

    if (detailsListContainsSatellide(sat_id)) {
         return;
    }

    var data = sat_data[sat_id];
    var extra = sat_extra[sat_id];

    var sat_info = document.createElement("div");
    sat_info.setAttribute("id", "info-" + sat_id);
    sat_info.classList.add("satellite-info");

    var h1 = document.createElement("h1");
    h1.innerHTML = sat_data[sat_id].name;
    h1.classList.add("clickable");
    h1.setAttribute("onclick", "onSelectedSatelliteNameClicked(" + sat_id + ")");
    sat_info.appendChild(h1);

    var div = "<div class='info-buttons'>";
    div += "<button class='flip-button' onclick='flipInfo(" + sat_id + ")'></button>";
    div += "<button class='remove-button' onclick='removeInfo(" + sat_id + ")'></button>";
    div += "</div><table>";

        div += "<tr><td>Type</td><td>" + data.type + "</td></tr>";

        div += "<tr><td>Latitude</td><td id='lat-"+sat_id+"'></td></tr>";
        div += "<tr><td>Longitude</td><td id='lon-"+sat_id+"'></td></tr>";
        div += "<tr><td>Altitude</td><td id='alt-"+sat_id+"'></td></tr>";

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

    selected_satellites_ids.push(sat_id);
    selected_satellites_uis.push(document.getElementById("info-" + sat_id));

    if (selected_satellites_uis.length > 1) {
        for (var i = 0; i < selected_satellites_uis.length; i++) {
            selected_satellites_uis[i].classList.toggle('full', false);
        }
    }
}

// Function: flipInfo
//
// toggles the "extended" detail info section in the UI for the given satellite
//
// Parameters:
//      sat_id - the id of the satellite
//
function flipInfo(sat_id) {
    document.getElementById("info-" + sat_id).classList.toggle("full");
}

// Function: removeInfo
//
// removes the given satellite from the details list
//
// Parameters:
//      sat_id - the id of the satellite
//
function removeInfo(sat_id) {
    removeSatellite(sat_id);

    var index = selected_satellites_ids.indexOf(sat_id);
    selected_satellites_ids.splice(index, 1);
    selected_satellites_uis.splice(index, 1);

    var reme = document.getElementById("info-" + sat_id);
    reme.parentElement.removeChild(reme);
}

// Function: updateSatellitesUi
// updates the information of the details list
function updateSatellitesUi() {
    for (var i = 0; i < selected_satellites_ids.length; i++) {
        updateSatelliteUi(i);
    }
}

// Function: detailsListContainsSatellide
//
// checks whether the given satellite is displayed in the details list
//
// Parameters:
//      sat_id - the id of the satellite
// 
// Returns:
//      boolean, whether the satellite is part of the list
//
function detailsListContainsSatellide(sat_id) {
    return document.getElementById("info-" + sat_id) != null;
}

// Function: updateSatelliteUi
//
// updates the satellite UI for the given satellite
//
// Parameters:
//      sat_id - the id of the satellite
//
function updateSatelliteUi(sat_id) {
    var id = selected_satellites_ids[sat_id];
    var lat = document.getElementById("lat-" + id);
    var lon = document.getElementById("lon-" + id);
    var alt = document.getElementById("alt-" + id);

    var a = sat_geo[sat_id*3];
    var b = sat_geo[sat_id*3 + 1];
    var c = sat_geo[sat_id*3 + 2];

    lat.innerHTML = sat_geo[sat_id*3];
    lon.innerHTML = sat_geo[sat_id*3 + 1];
    alt.innerHTML = sat_geo[sat_id*3 + 2];
}

// Function: onSelectedSatelliteNameClicked
//
// searches in the search field after satellites with the same name <search>
//
// Parameters:
//      sat_id - the id of the satellite
//
function onSelectedSatelliteNameClicked(sat_id) {
    search(sat_data[sat_id].name);
}