var SEARCH_LIMIT = 100;

var _ui_search_buttons = [];
var search_results_ids = [];
var search_results_showing = 0;

function onSearchParamsChanged() {
    var text = _ui_search.value;
    search(text);
}

function search(string) {
    _ui_search.value = string;
    if (string.length === 0) {
        _ui_search_table.innerHTML = "";
        _ui_search_results.innerHTML = "0 / " + sat_data.length;
        _ui_search_showing.innerHTML = "0";

        _ui_search_results_row.style.display = "none";
        _ui_search_showing_row.style.display = "none";

        return;
    }

    _ui_search_showing_row.style.display = "";
    _ui_search_results_row.style.display = "";

    var search_selected_only = _ui_search_selected_only.checked;

    // Trim: remove leading and trailing spaces
    var parts = string.trim().toUpperCase().split(" ");
    var incl = [];
    var lack = [];

    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (part.length > 0) {
            if (part.startsWith("\\")) {
                if (part.length > 1) { // Maybe the whole string is just '\'
                    lack.push(part.substring(1));
                }
            } else {
                incl.push(part);
            }
        }
    }

    // Header
    _ui_search_table.innerHTML = "<tr>"
                               + "<th>Name</th>"
                               + "<th>Type</th>"
                               + "<th onclick='onTableSelectAllClicked()' class='clickable'>Selected</th>"
                               + "</tr>";

    _ui_search_buttons = [];
    search_results_ids = [];

    var i = 0, j = 0;
    for (; i < sat_data.length && j < SEARCH_LIMIT; i++) {

        if (search_selected_only && !_SAT_IDS_SELECTED[i]) {
            continue;
        }

        var data = sat_data[i];
        if (matches(data, incl, lack)) {
            var row = document.createElement("tr");
            row.innerHTML = "<td class='clickable' onclick='onTableNameClicked(" + i + ")'>" + data.name + "</td>"
                          + "<td>" + data.type + "</td>";

            var button = document.createElement("button");
            var onclick = document.createAttribute("onclick");
            onclick.value = "onTableSelectButtonClicked(" + i + ")";
            button.setAttributeNode(onclick);
            if (_SAT_IDS_SELECTED[i]) button.classList.add("search-select-button-yes");
            button.innerHTML = _SAT_IDS_SELECTED[i] ? "Yes" : "No";
            var buttonCell = document.createElement("td");
            buttonCell.appendChild(button);
            row.appendChild(buttonCell);

            _ui_search_buttons.push(button);
            search_results_ids.push(i);

            _ui_search_table.appendChild(row);
            j++;
        }
    }
    var showing = j;
    search_results_showing = j-1;

    // Continue search, but don't add to DOM
    for (; i < sat_data.length; i++) {
        var data = sat_data[i];
        if (matches(data, incl, lack)) {
            search_results_ids.push(i);
            j++;
        }
    }
    _ui_search_results.innerHTML = j + " / " + sat_data.length;
    _ui_search_showing.innerHTML = showing;
}

function onTableNameClicked(sat_id) {
    addSatelliteToList(sat_id);
}

function onTableSelectButtonClicked(sat_id) {
    toggleSelectedSatellites([sat_id]);
    //addSatelliteToList(sat_id);
}

function onTableSelectAllClicked() {
    if (areAllSatellitesSelected(search_results_ids)) {
        removeSelectedSatellites(search_results_ids);
    } else {
        addSelectedSatellites(search_results_ids);
    }
    //addSatellitesToList(search_results_ids);
}

function updateSearchSelectButtons() {
    for (var i = 0; i < search_results_ids.length; i++) {
        var index = search_results_ids[i];
        updateSearchSelectButton(_ui_search_buttons[i], _SAT_IDS_SELECTED[index]);
    }
}

// Value is 'true' or 'false'
function updateSearchSelectButton(button, selected) {
    var yesNo;
    if (selected) {
        yesNo = "Yes";
        button.classList.add("search-select-button-yes");
    } else {
        yesNo = "No";
        button.classList.remove("search-select-button-yes");
    }
    button.innerHTML = yesNo;

}

function matches(data, incl, lack) {
    var name = data.name.toUpperCase();
    var type = data.type.toUpperCase();
    return includesAll([name, type], incl) && lacksAll(name, lack) && lacksAll(type, lack);
}

// String 'a' includes all strings in array 'b'
function includesAll(a, b) {
    var inclCount = 0;
    for (var i = 0; i < b.length; i++) {
        for (var j = 0; j < a.length; j++) {
            if (a[j].includes(b[i])) {
                inclCount++;
                break;
            }
        }
    }
    return inclCount === b.length;
}

// String 'a' includes no string in array 'b'
function lacksAll(a, b) {
    for (var i = 0; i < b.length; i++) {
        if (a.includes(b[i])) {
            return false;
        }
    }
    return true;
}

function initializeSearcher() {
    onSearchParamsChanged();
}