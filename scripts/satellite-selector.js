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

// Function: getSatellitesByAltitudeRange
//
// Parameters:
//      altMinIncl - the minimum altitude for selection (inclusive)
//      altMaxExcl - the maximum altitude for selection (exclusive)
//
// Returns:
//      a list with the indexes of the satellites that currently have an altitude in the range [altMinIncl, altMaxExcl)
function getSatellitesByAltitudeRange(altMinIncl, altMaxExcl) {
    var sats = [];
    for (var i = 0; i < sat_data.length; i++) {
        var alt = sat_geo[i*3+2];
        if (alt >= altMinIncl && alt < altMaxExcl) {
            sats.push(i);
        }
    }
    return sats;
}

// Function: getSatellitesByType
//
// Parameters:
//      types - a list with the types for selection
//
// Returns:
//      a list with the indexes of the satellites that have one of the types in the input array 'types'
function getSatellitesByTypes(types) {
    var types_upper = new Array(types.length);
    for (var i = 0; i < types.length; i++) {
        types_upper[i] = types[i].toUpperCase();
    }

    var sats = [];
    for (var i = 0; i < sat_data.length; i++) {
        var sat_type = sat_data[i].type.toUpperCase();
        if (types_upper.includes(sat_type)) {
            sats.push(i);
        }
    }

    return sats;
}

// Function: setSelectionByAltitudeRange
//
// sets the satellites selection based on whether their current altitude falls in a given range
//
// Parameters:
//      altMinIncl - the minimum altitude for selection (inclusive)
//      altMaxExcl - the maximum altitude for selection (exclusive)
//      value      - a boolean indicating what value to set
//
function setSelectionByAltitudeRange(altMinIncl, altMaxExcl, value) {
    var sat_ids = getSatellitesByAltitudeRange(altMinIncl, altMaxExcl);
    if (value) {
        addSelectedSatellites(sat_ids);
    } else {
        removeSelectedSatellites(sat_ids);
    }
}

// Function: setSelectionByTypes
//
// sets the satellites selection based on their type
//
// Parameters:
//      types - a list with the types for selection
//      value - a boolean indicating what value to set
//
function setSelectionByTypes(types, value) {
    var sat_ids = getSatellitesByTypes(types);
    if (value) {
        addSelectedSatellites(sat_ids);
    } else {
        removeSelectedSatellites(sat_ids);
    }
}