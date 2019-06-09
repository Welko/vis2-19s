var _SAT_IDS_SELECTED_COUNT = 0;
var _SAT_IDS_SELECTED = [];

function initializeSatelliteSelectorIfNotInitialized() {
    if (sat_pos == null) return;

    // Set up selected satellites array. Make all 'false'
    // This assumes that the number of satellites never changes (only on initialization)
    if (sat_pos.length !== _SAT_IDS_SELECTED.length) {
        _SAT_IDS_SELECTED = new Array(sat_pos.length);
        for (var i = 0; i < _SAT_IDS_SELECTED.length; i++) {
            _SAT_IDS_SELECTED[i] = false;
        }
    }
}

// Returns the number of satellites that changed state
function setSelectedSatellites(sat_indexes, value) {
    initializeSatelliteSelectorIfNotInitialized();

    //_SAT_IDS_SELECTED = mergeSorted(_SAT_IDS_SELECTED, sat_ids_sorted);

    var colorsObj = sat_points.geometry.attributes.color;
    var colors = colorsObj.array;

    var count = 0;

    for (var i = 0; i < sat_indexes.length; i++) {
        var index = sat_indexes[i];
        var old = _SAT_IDS_SELECTED[index];

        if (old !==  value) {
            _SAT_IDS_SELECTED[index] = value;
            count++;

            var c = transferFunction(index);
            colors[index*3]   = c.r;
            colors[index*3+1] = c.g;
            colors[index*3+2] = c.b;
        }
    }

    colorsObj.needsUpdate = true;

    return count;
}

function addSelectedSatellites(sat_indexes) {
    var changedCount = setSelectedSatellites(sat_indexes, true);
    _SAT_IDS_SELECTED_COUNT += changedCount;
    updateSatellitesCount()
}

function removeSelectedSatellites(sat_indexes) {
    var changedCount = setSelectedSatellites(sat_indexes, false);
    _SAT_IDS_SELECTED_COUNT -= changedCount;
    updateSatellitesCount();
}

function clearSatelliteSelection() {
    initializeSatelliteSelectorIfNotInitialized();
    var colorsObj = sat_points.geometry.attributes.color;
    var colors = colorsObj.array;
    for (var i = 0; i < _SAT_IDS_SELECTED.length; i++) {
        _SAT_IDS_SELECTED[i] = false;
        var c = transferFunction(i);
        colors[i*3]   = c.r;
        colors[i*3+1] = c.g;
        colors[i*3+2] = c.b;
    }
    colorsObj.needsUpdate = true;
    _SAT_IDS_SELECTED_COUNT = 0;
    updateSatellitesCount();
}

function updateSatellitesCount() {
    _ui_satellites_count.innerHTML = _SAT_IDS_SELECTED_COUNT;
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