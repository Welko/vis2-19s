var selected_satellite_id = null;
var selected_satellites_orbits = [];
var selected_satellites_uis = [];
var selected_satellites_ids = [];

// Satellite added to list and its extra information
function selectSatellite(satellite_info_box) {
    if (intersected_satellite == null) return;
    if (selected_satellites_ids.includes(intersected_satellite)) return;

    selected_satellite_id = intersected_satellite;

    var selection_line = orbit_line.clone();
    selection_line.material = selected_orbit_material;
    orbit_selection_group.add(selection_line);

    var extra = sat_extra[selected_satellite_id];

    var sat_info = "<div id='info-" + selected_satellite_id + "' class='satellite-info";
    sat_info += "'>";
    sat_info += "<h1>" + sat_data[selected_satellite_id].name + "</h1>";
    sat_info += "<div class='info-buttons'>";
    sat_info += "<button class='flip-button' onclick='flipInfo(" + selected_satellite_id + ")'></button>";
    sat_info += "<button class='remove-button' onclick='removeInfo(" + selected_satellite_id + ")'></button>";
    sat_info += "</div><table>";
    sat_info += "<tr><td>Inclination</td><td>" + extra.inclination + "</td></tr>";
    sat_info += "<tr><td>Eccentricity</td><td>" + extra.eccentricity + "</td></tr>";
    sat_info += "<tr><td>Raan</td><td>" + extra.raan + "</td></tr>";
    sat_info += "<tr><td>AargPe</td><td>" + extra.argPe + "</td></tr>";
    sat_info += "<tr><td>Mean Motion</td><td>" + extra.meanMotion + "</td></tr>";
    sat_info += "<tr><td>Inclination</td><td>" + extra.inclination + "</td></tr>";
    sat_info += "<tr><td>Inclination</td><td>" + extra.inclination + "</td></tr>";

    sat_info += "<tr><td>Semi Major Axis</td><td>" + extra.semiMajorAxis + "</td></tr>";
    sat_info += "<tr><td>Semi Minor Axis</td><td>" + extra.semiMinorAxis + "</td></tr>";
    sat_info += "<tr><td>Apogee</td><td>" + extra.apogee + "</td></tr>";
    sat_info += "<tr><td>Perigee</td><td>" + extra.perigee + "</td></tr>";
    sat_info += "<tr><td>Period</td><td>" + extra.period + "</td></tr>";
    sat_info += "</table></div>";

    satellite_info_box.innerHTML += sat_info;

    selected_satellites_ids.push(intersected_satellite);
    selected_satellites_orbits.push(selection_line);
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
    var index = selected_satellites_ids.indexOf(sat_id);
    var orbit = selected_satellites_orbits[index];
    selected_satellites_ids.splice(index, 1);
    selected_satellites_orbits.splice(index, 1);
    selected_satellites_uis.splice(index, 1);

    orbit_selection_group.remove(orbit);

    var reme = document.getElementById("info-" + sat_id);
    reme.parentElement.removeChild(reme);
}