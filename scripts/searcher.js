var _ui_search_buttons = [];
var _ui_search_buttons_ids = [];

function onSearchTextChanged() {
    var text = _ui_search.value;
    if (text.length === 0) {
        _ui_search_table.innerHTML = "";
    } else {
        search(text);
    }
}

function search(string) {
    // Header
    _ui_search_table.innerHTML = "<tr>"
                               + "<th>Name</th>"
                               + "<th>Type</th>"
                               + "<th>Selected</th>"
                               + "</tr>";

    _ui_search_buttons = [];
    _ui_search_buttons_ids = [];

    string = string.toUpperCase();
    for (var i = 0, j = 0; i < sat_data.length && j < 100; i++) {
        var data = sat_data[i];

        if (data.name.toUpperCase().includes(string)) {
            var row = document.createElement("tr");
            row.innerHTML = "<td>" + data.name + "</td>"
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
            _ui_search_buttons_ids.push(i);

            _ui_search_table.appendChild(row);
            j++;
        }
    }
}

function onTableSelectButtonClicked(sat_id) {
    toggleSelectedSatellites([sat_id], false);
    updateSearchSelectButtons();
}

function updateSearchSelectButtons() {
    for (var i = 0; i < _ui_search_buttons_ids.length; i++) {
        var index = _ui_search_buttons_ids[i];
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

function initializeSearcher() {
    /*
    var html = "<tr>"
             + "<th>Name</th>"
             + "<th>Type</th>"
             + "<th>Selected</th>"
             + "</tr>";

    _ui_search_table.innerHTML = html;

    _ui_table_rows_array = [];
    for (var i = 0; i < sat_data.length; i++) {

        var data = sat_data[i];

        var button = document.createElement("button");

        var row = document.createElement("tr");
        row.innerHTML = "<td>" + data.name + "</td>"
                     +  "<td>" + data.type + "</td>"
                     +  "<td>" + _SAT_IDS_SELECTED[i] + "</td>";

        _ui_table_rows_array.push(row);
        _ui_search_table.appendChild(row);
    }
    */
}