var _SAT_IDS_SELECTED_COUNT = 0;
var _SAT_IDS_SELECTED = [];

// Function: initializeSatelliteSelectorIfNotInitialized
// checks if the satellite selector is initialized and initializes it if it is not the case
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

// Function: setSelectedSatellites
//
// sets the selection of the given satellites to the given value, calculates the number of satellites that changed state
//
// Parameters:
//      sat_indices - array of satellite indices
//      value - boolean, the new value
//
// Returns:
//      the number of satellites that changed state
//
function setSelectedSatellites(sat_indices, value) {
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

    for (var i = 0; i < sat_indices.length; i++) {
        var index = sat_indices[i];
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

// Function: setAllSatellites
//
// sets all satellites to the given value
//
// Parameters:
//      value - boolean, the value all satellites will be set to 
//      update_search - default: true, whether the search should be updated
//
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

// Function: addAllSatellites
// adds all satellites to the selection
function addAllSatellites() {
    setAllSatellites(true);
}

// Function: removeAllSatellites
// removes all satellites from the selection
function removeAllSatellites() {
    removeAllSatellites(false);
}

// Function: toggleSelectedSatellites
//
// toggles the selection of the given satellites
//
// Parameters:
//      sat_indices - array of satellite indices
//      update_search - default: true, whether the search should be updated
//
function toggleSelectedSatellites(sat_indices, update_search=true) {
    var add = [];
    var remove = [];
    for (var i = 0; i < sat_indices.length; i++) {
        var index = sat_indices[i];
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

// Function: addSelectedSatellites
//
// adds the given satellites to the selection
//
// Parameters:
//      sat_indices - array of satellite indices
//      update_search - default: true, whether the search should be updated
//
function addSelectedSatellites(sat_indices, update_search=true) {
    var changedCount = setSelectedSatellites(sat_indices, true);
    _SAT_IDS_SELECTED_COUNT += changedCount;
    updateSatellitesCount()
    if (update_search) {
        onSearchParamsChanged();
    }
}

// Function: removeSelectedSatellites
//
// removes the given satellites from the selection
//
// Parameters:
//      sat_indices - array of satellite indices
//      update_search - default: true, whether the search should be updated
//
function removeSelectedSatellites(sat_indices, update_search=true) {
    var changedCount = setSelectedSatellites(sat_indices, false);
    _SAT_IDS_SELECTED_COUNT -= changedCount;
    updateSatellitesCount();
    if (update_search) {
        onSearchParamsChanged();
    }
}

// Function: clearSatelliteSelections
//
// clears the satellite selection
//
// Parameters:
//      update_search - default: true, whether the search should be updated
//
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

// Function: updateSatellitesCount
// updates the displayed number of selected satellites
function updateSatellitesCount() {
    _ui_satellites_count.innerHTML = _SAT_IDS_SELECTED_COUNT;
}

// Function: areAllSatellitesSelected
//
// checks if all given satellites are selected
//
// Parameters:
//      sat_indices - array of satellite indices
//
// Returns:
//      boolean, whether all given satellites are selected
//
function areAllSatellitesSelected(sat_indices) {
    for (var i = 0; i < sat_indices.length; i++) {
        var index = sat_indices[i];
        if (!_SAT_IDS_SELECTED[index]) {
            return false;
        }
    }
    return true;
}

// Function: mergeSorted
//
// merges two sorted arrays so that the merged array only includes common elements once (union)
//
// Parameters:
//      a1 - a sorted array with no repeating elements
//      a2 - a sorted array with no repeating elements
//
// Returns:
//      an array which is the union of the two given arrays
//
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