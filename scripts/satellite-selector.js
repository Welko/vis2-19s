var _SAT_IDS_SELECTED_COUNT = 0;
var _SAT_IDS_SELECTED = [];

function initializeSatelliteSelectorIfNotInitialized() {
    if (sat_pos == null) return;

    // Set up selected satellites array. Make all 'false'
    // This assumes that the number of satellites never changes (only on initialization)
    if (sat_data.length !== _SAT_IDS_SELECTED.length) {
        _SAT_IDS_SELECTED = new Array(sat_data.length);
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

    // Debug TODO remove
    var trues = [];
    for (var i = 0; i < _SAT_IDS_SELECTED.length; i++) {
        if (_SAT_IDS_SELECTED[i]) {
            trues.push(i);
        }
    }

    for (var i = 0; i < sat_indexes.length; i++) {
        var index = sat_indexes[i];
        var old = _SAT_IDS_SELECTED[index];

        if (old !== value) {
            _SAT_IDS_SELECTED[index] = value;
            count++;

            var c = colorFunction(index);
            colors[index*4]   = c.r;
            colors[index*4+1] = c.g;
            colors[index*4+2] = c.b;
            colors[index*4+3] = alphaFunction(index);
        }
    }

    // Debug TODO remove
    var trues = [];
    for (var i = 0; i < _SAT_IDS_SELECTED.length; i++) {
        if (_SAT_IDS_SELECTED[i]) {
            trues.push(i);
        }
    }

    colorsObj.needsUpdate = true;

    return count;
}

function setAllSatellites(value, update_search=true) {
    var all = new Array(_SAT_IDS_SELECTED.length);;
    for (var i = 0; i < _SAT_IDS_SELECTED.length; i++) {
        all[i] = i;
    }
    setSelectedSatellites(all, value);
    _SAT_IDS_SELECTED_COUNT = value ? _SAT_IDS_SELECTED.length : 0;
    updateSatellitesCount()
    if (update_search) {
        onSearchParamsChanged();
    }
}

function addAllSatellites() {
    setAllSatellites(true);
}

function removeAllSatellites() {
    removeAllSatellites(false);
}

function toggleSelectedSatellites(sat_indexes, update_search=true) {
    var add = [];
    var remove = [];
    for (var i = 0; i < sat_indexes.length; i++) {
        var index = sat_indexes[i];
        if (_SAT_IDS_SELECTED[index]) {
            remove.push(index);
        } else {
            add.push(index);
        }
    }

    addSelectedSatellites(add, false);
    removeSelectedSatellites(remove, false);
    if (update_search) {
        onSearchParamsChanged();
    }
}

function addSelectedSatellites(sat_indexes, update_search=true) {
    var changedCount = setSelectedSatellites(sat_indexes, true);
    _SAT_IDS_SELECTED_COUNT += changedCount;
    updateSatellitesCount()
    if (update_search) {
        onSearchParamsChanged();
    }
}

function removeSelectedSatellites(sat_indexes, update_search=true) {
    var changedCount = setSelectedSatellites(sat_indexes, false);
    _SAT_IDS_SELECTED_COUNT -= changedCount;
    updateSatellitesCount();
    if (update_search) {
        onSearchParamsChanged();
    }
}

function clearSatelliteSelection(update_search=true) {
    initializeSatelliteSelectorIfNotInitialized();
    var colorsObj = sat_points.geometry.attributes.color;
    var colors = colorsObj.array;
    for (var i = 0; i < _SAT_IDS_SELECTED.length; i++) {
        _SAT_IDS_SELECTED[i] = false;
        var c = colorFunction(i);
        colors[i*4]   = c.r;
        colors[i*4+1] = c.g;
        colors[i*4+2] = c.b;
        colors[i*4+3] = alphaFunction(i);
    }
    colorsObj.needsUpdate = true;
    _SAT_IDS_SELECTED_COUNT = 0;
    updateSatellitesCount();
    if (update_search) {
        onSearchParamsChanged();
    }
}

function updateSatellitesCount() {
    _ui_satellites_count.innerHTML = _SAT_IDS_SELECTED_COUNT;
}

function areAllSatellitesSelected(sat_indexes) {
    for (var i = 0; i < sat_indexes.length; i++) {
        var index = sat_indexes[i];
        if (!_SAT_IDS_SELECTED[index]) {
            return false;
        }
    }
    return true;
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