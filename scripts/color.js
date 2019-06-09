var _COLOR_MODE_TYPE = 0;
var _COLOR_MODE_ALTITUDE = 1;
var _COLOR_MODE_DISTANCE = 2;
var _COLOR_MODE_SELECTION = 3;

var color_mode = null;
var transfer_function_base = null;

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

        case _COLOR_MODE_SELECTION:
            initializeColorModeSelection();
            return;
    }
    throw "Undefined color mode: " + mode;
}

function getSelectedColorModeFromUi() {
    switch(_ui_color_select.value) {
        case "type": return _COLOR_MODE_TYPE;
        case "altitude": return _COLOR_MODE_ALTITUDE;
        case "distance": return _COLOR_MODE_DISTANCE;
        case "selection": return _COLOR_MODE_SELECTION;
    }
    throw "Undefined color mode string: " + _ui_color_select.value;
}

function updateSatellitesColor() {
    var mode = getSelectedColorModeFromUi();
    if (mode !== color_mode) {
        setColorMode(mode);
        return;
    }

    var colorsObj = sat_points.geometry.attributes.color;
    var colors = colorsObj.array;
    for (var i = 0; i < sat_data.length; i++) {
        var color = transferFunction(i);
        colors[i*3]   = color.r;
        colors[i*3+1] = color.g;
        colors[i*3+2] = color.b;
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

// Initialization ------------------------------------------------------------------------------------------------------

function addColorHtml(color, descr) {
    var row = "<tr><td style='width: 5em; background-color: #" + color.getHexString() + ";'></td>";
    row += "<td>" + descr + "</td></tr>";
    return row;
}

var satTypesCache = null;
var satTypesColorCache = null;
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

function initializeColorModeAltitude() {
    _ui_color_info_table.innerHTML = buildStringFromConstantStep(0, 10000);
    transfer_function_base = transferAltitude;
    updateSatellitesColor();
}

function initializeColorModeDistance() {
    _ui_color_info_table.innerHTML = buildStringFromConstantStep(0, 10000);
    transfer_function_base = transferDistance;
    updateSatellitesColor();
}

function initializeColorModeSelection() {
    _ui_color_info_table.innerHTML = addColorHtml(_SAT_COLOR_SELECTED, "Selected")
                                   + addColorHtml(_SAT_COLOR_NOT_SELECTED, "Not selected");
    transfer_function_base = transferSelection;
    updateSatellitesColor();
}


// Transfer functions --------------------------------------------------------------------------------------------------

function transferFunction(sat_id) {
    if (_SAT_IDS_SELECTED[sat_id]) {
        return COLOR_SELECTED;
    } else {
        return transfer_function_base(sat_id);
    }
}

function getIndexFromRange(value, min, range) {
    var index = Math.floor( ((value - min) / range) * COLORS_RANGE.length);
    var lastIndex = COLORS_RANGE.length - 1;
    return index < 0 ? 0 : (index > lastIndex ? lastIndex : index);
}

function getIndexFromConstantStep(value, start, step) {
    var end = start + step * COLORS_RANGE.length;
    return value <= start ? 0 : (value >= end ? COLORS_RANGE.length-1 : Math.floor((value - start) / step));
}

function transferType(sat_id) {
    var index = satTypesCache.indexOf(sat_data[sat_id].type);
    return satTypesColorCache[index];
}

function transferAltitude(sat_id) {
    var alt = sat_geo[sat_id*3+2];
    if (!isNaN(alt) && alt > 0) {
        var index = getIndexFromConstantStep(alt, 0, 10000);
        return COLORS_RANGE[index];
    } else {
        return COLOR_UNDEFINED;
    }
}

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

function transferSelection(sat_id) {
    return _SAT_IDS_SELECTED[sat_id] ? COLOR_SELECTED : COLOR_UNSELECTED;
}