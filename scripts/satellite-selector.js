var _SAT_IDS_SELECTED = [];

var _SAT_COLOR_SELECTED = new THREE.Color(0xff000);
var _SAT_COLOR_NOT_SELECTED = new THREE.Color(0x444444);

function initializeSatelliteSelectorIfNotInitialized() {
    if (sat_points == null) return;

    // Set up selected satellites array. Make all 'false'
    // This assumes that the number of satellites never changes (only on initialization)
    if (sat_pos.length !== _SAT_IDS_SELECTED.length) {
        _SAT_IDS_SELECTED = new Array(sat_pos.length);
        for (var i = 0; i < _SAT_IDS_SELECTED.length; i++) {
            _SAT_IDS_SELECTED[i] = false;
        }
    }
}

function getSatelliteColorBasedOnSelection(selected) {
    return selected ? _SAT_COLOR_SELECTED : _SAT_COLOR_NOT_SELECTED;
}

function setSelectedSatellites(sat_indexes, value) {
    initializeSatelliteSelectorIfNotInitialized();

    //_SAT_IDS_SELECTED = mergeSorted(_SAT_IDS_SELECTED, sat_ids_sorted);

    var colorsObj = sat_points.geometry.attributes.color;
    var colors = colorsObj.array;

    for (var i = 0; i < sat_indexes.length; i++) {
        var index = sat_indexes[i];
        _SAT_IDS_SELECTED[index] = value;

        var c = getSatelliteColorBasedOnSelection(value);
        colors[index*3]   = c.r;
        colors[index*3+1] = c.g;
        colors[index*3+2] = c.b;
    }

    colorsObj.needsUpdate = true;
}

function addSelectedSatellites(sat_indexes) {
    setSelectedSatellites(sat_indexes, true);
}

function removeSelectedSatellites(sat_indexes) {
    setSelectedSatellites(sat_indexes, false);
}

// Input: a1: a sorted array with no repeating elements
//        a2: a sorted array with no repeating elements
// Output: one sorted array, the union of a1 and a2 (=> common elements are discarded!)
function mergeSorted(a1, a2) {
    var out = [];
    var i = 0;
    var j = 0;

    var min = Math.min(a1.length, a2.length);
    while (i < min && j < min) {
        if      (a1[i] < a2[j]) out.push(a1[i++]);
        else if (a1[i] < a2[j]) out.push(a2[j++]);
    }

    if (i === a1.length) {
        a1 = a2;
        i = j;
    }
    for (; i < a1.length; i++) {
        out.push(a1[i]);
    }

    return out;
}