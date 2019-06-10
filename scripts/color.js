var _COLOR_MODE_TYPE = 0;
var _COLOR_MODE_ALTITUDE = 1;
var _COLOR_MODE_DISTANCE = 2;

var color_mode = null;
var transfer_function_base = null;

// Function: setColorMode
//
// sets the color mode of the satellitzes
//
// Parameters:
//      mode - an ID representing the color mode, 0 = Type, 1 = Altitude, 2 = Distance
//
function setColorMode(mode) {
    if (color_mode === mode) return;

    color_mode = mode;
    switch (mode) {
        case _COLOR_MODE_TYPE:
            initializeColorModeType();
            return;

        case _COLOR_MODE_ALTITUDE:
            initializeColorModeAltitude();
            return;

        case _COLOR_MODE_DISTANCE:
            initializeColorModeDistance();
            return;
    }
    throw "Undefined color mode: " + mode;
}

// Function: getSelectedColorModeFromUi
// takes the selected color mode from the UI
function getSelectedColorModeFromUi() {
    switch(_ui_color_select.value) {
        case "type": return _COLOR_MODE_TYPE;
        case "altitude": return _COLOR_MODE_ALTITUDE;
        case "distance": return _COLOR_MODE_DISTANCE;
    }
    throw "Undefined color mode string: " + _ui_color_select.value;
}

// Function: updateSatellitesColor
// updates the THREE.js color buffers of the satellites
function updateSatellitesColor() {
    var mode = getSelectedColorModeFromUi();
    if (mode !== color_mode) {
        setColorMode(mode);
        return;
    }

    var colorsObj = sat_points.geometry.attributes.color;
    var colors = colorsObj.array;
    for (var i = 0; i < sat_data.length; i++) {
        var color = colorFunction(i);
        colors[i*4]   = color.r;
        colors[i*4+1] = color.g;
        colors[i*4+2] = color.b;
        colors[i*4+3] = alphaFunction(i);
    }
    colorsObj.needsUpdate = true;
}

var color_type_prev = -1;
var COLORS_TYPE = [ //http://colorbrewer2.org/#type=qualitative&scheme=Set1&n=8
    new THREE.Color(0xe41a1c),
    new THREE.Color(0x377eb8),
    new THREE.Color(0x4daf4a),
    new THREE.Color(0x984ea3),
    new THREE.Color(0xff7f00),
    new THREE.Color(0xffff33),
    new THREE.Color(0xa65628),
    new THREE.Color(0xf781bf)
];

// Function: nextColorType
// returns the next color of the categorical colors list
function nextColorType() { return COLORS_TYPE[(++color_type_prev) % COLORS_TYPE.length] };

var COLORS_RANGE = [
    new THREE.Color(0xffffb2),
    new THREE.Color(0xfecc5c),
    new THREE.Color(0xfd8d3c),
    new THREE.Color(0xf03b20),
    new THREE.Color(0xbd0026)
];

var COLOR_UNDEFINED = new THREE.Color(0x000000);
var COLOR_SELECTED = new THREE.Color(0xffffff);
var COLOR_UNSELECTED = new THREE.Color(0x444444);

// Function: buildStringFromRange
//
// builds the string displaying the color information of numerical ranges, given the full range
//
// Parameters:
//      bottom - the lowest value of the range
//      step - the size of each bin
//      top -  the highest value of the range
//
// Returns:
//      the html table containing the color information
//
function buildStringFromRange(bottom, step, top) {
    var tableInnerHtml = "";
    var max = top;
    top = bottom;
    for (var i = 0; i < COLORS_RANGE.length-1; i++) { // Stops at length-1 !!! Last element is calculated separately
        bottom = top;
        top = bottom + step;
        tableInnerHtml += addColorHtml(COLORS_RANGE[i], "[" + bottom + ", " + top + ")");
    }
    tableInnerHtml += addColorHtml(COLORS_RANGE[COLORS_RANGE.length - 1], "[" + top + ", " + max + "]");
    return tableInnerHtml;
}

// Function: buildStringFromConstantStep
//
// builds the string displaying the color information of numerical ranges, given the start and step size
//
// Parameters:
//      start - the lowest value of the range
//      step - the size of each bin
//
// Returns:
//      the html table containing the color information
//
function buildStringFromConstantStep(start, step) {
    var tableInnerHtml = "";
    for (var i = 0; i < COLORS_RANGE.length; i++) {
        var min = (start + i * step) + "";
        var max = (start + ((i+1) * step)) + "";
        if (i === COLORS_RANGE.length-1) max = "Infinity";
        tableInnerHtml += addColorHtml(COLORS_RANGE[i], "[" + min + " - " + max + ") km");
    }
    return tableInnerHtml;
}

// Function: addColorHtml
//
// adds a table row of one color bin to the color dispaly
//
// Parameters:
//      color - the color of the bin
//      descr - textual description of the bin
//
// Returns:
//      the html row containing the color bin information
//
function addColorHtml(color, descr) {
    var row = "<tr><td style='width: 5em; background-color: #" + color.getHexString() + ";'></td>";
    row += "<td>" + descr + "</td></tr>";
    return row;
}

// Initialization ------------------------------------------------------------------------------------------------------

var satTypesCache = null;
var satTypesColorCache = null;
// Function: initializeColorModeType
// initialization for the "type" color mode
function initializeColorModeType() {
    var tableInnerHtml = "";
    if (satTypesCache == null) {
        satTypesCache = [];
        satTypesColorCache = [];
        for (var i = 0; i < sat_data.length; i++) {
            if (satTypesCache.indexOf(sat_data[i].type) === -1) {
                var color = nextColorType();
                var type = sat_data[i].type

                satTypesCache.push(type);
                satTypesColorCache.push(color);

                tableInnerHtml += addColorHtml(color, type);
            }
        }
    } else {
        for (var i = 0; i < satTypesCache.length; i++) {
            var type = satTypesCache[i];
            var color = satTypesColorCache[i];
            tableInnerHtml += addColorHtml(color, type);
        }
    }

    _ui_color_info_table.innerHTML = tableInnerHtml;
    transfer_function_base = transferType;
    updateSatellitesColor();
}

// Function: initializeColorModeAltitude
// initialization for the "altitude" color mode
function initializeColorModeAltitude() {
    _ui_color_info_table.innerHTML = buildStringFromConstantStep(0, 10000);
    transfer_function_base = transferAltitude;
    updateSatellitesColor();
}

// Function: initializeColorModeDistance
// initialization for the "distance" color mode
function initializeColorModeDistance() {
    _ui_color_info_table.innerHTML = buildStringFromConstantStep(0, 10000);
    transfer_function_base = transferDistance;
    updateSatellitesColor();
}


// Transfer functions --------------------------------------------------------------------------------------------------

// Function: colorFunction
//
// gets the color (RGB) of the given satellite
//
// Parameters:
//      sat_id - the id of the satellite
//
// Returns:
//      the RGB color
//
function colorFunction(sat_id) {
    return transfer_function_base(sat_id);
}

// Function: alphaFunction
//
// gets the alpha value of the given satellite, depending on the selection
//
// Parameters:
//      sat_id - the id of the satellite
//
// Returns:
//      the alpha value
//
function alphaFunction(sat_id) {
    return _SAT_IDS_SELECTED[sat_id] ? 1 : 0.15;
}

// Function: getIndexFromRange
//
// gets the index of the bin given a value and a range
//
// Parameters:
//      value - the value for which the index should be determined
//      min - the lowest value of the range
//      range - the size of the range
//
// Returns:
//      the corresponding index of the color bin
//
function getIndexFromRange(value, min, range) {
    var index = Math.floor( ((value - min) / range) * COLORS_RANGE.length);
    var lastIndex = COLORS_RANGE.length - 1;
    return index < 0 ? 0 : (index > lastIndex ? lastIndex : index);
}

// Function: getIndexFromConstantStep
//
// gets the index of the bin given a value and a constant step range
//
// Parameters:
//      value - the value for which the index should be determined
//      start - the lowest value of the range
//      step - the step size of a bin
//
// Returns:
//      the corresponding index of the color bin
//
function getIndexFromConstantStep(value, start, step) {
    var end = start + step * COLORS_RANGE.length;
    return value <= start ? 0 : (value >= end ? COLORS_RANGE.length-1 : Math.floor((value - start) / step));
}

// Function: transferType
//
// transfer function for the "type" color mode
//
// Parameters:
//      sat_id - the id of the satellite
//
// Returns:
//      the corresponding color
//
function transferType(sat_id) {
    if (sat_id >= sat_data.length) {
        console.error("Sat ID too big: " + sat_id + " (length=" + sat_data.length + ")");
    } else if (sat_data[sat_id] == null) {
        console.error("Sat data undefined with ID " + sat_id + "(length=" + sat_data.length + ")");
    }
    var index = satTypesCache.indexOf(sat_data[sat_id].type);
    return satTypesColorCache[index];
}

// Function: transferAltitude
//
// transfer function for the "altitude" color mode
//
// Parameters:
//      sat_id - the id of the satellite
//
// Returns:
//      the corresponding color
//
function transferAltitude(sat_id) {
    var alt = sat_geo[sat_id*3+2];
    if (!isNaN(alt) && alt > 0) {
        var index = getIndexFromConstantStep(alt, 0, 10000);
        return COLORS_RANGE[index];
    } else {
        return COLOR_UNDEFINED;
    }
}

// Function: transferAltitude
//
// transfer function for the "distance" color mode
//
// Parameters:
//      sat_id - the id of the satellite
//
// Returns:
//      the corresponding color
//
function transferDistance(sat_id) {
    var x = sat_pos[sat_id*3];
    var y = sat_pos[sat_id*3+1];
    var z = sat_pos[sat_id*3+2];
    var dis = Math.sqrt(x*x + y*y + z*z);
    if (!isNaN(dis) && dis > 0) {
        return COLORS_RANGE[getIndexFromConstantStep(dis, 0, 10000)];
    } else {
        return COLOR_UNDEFINED;
    }
}