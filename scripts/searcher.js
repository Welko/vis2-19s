var  _ui_table_rows_array = [];

function onSearchTextChanged() {
    var text = _ui_search.value;
    search(text);
}

function search(string) {
    string = string.toUpperCase();
    for (var i = 0; i < sat_data.length; i++) {
        var data = sat_data[i];
        var row = _ui_table_rows_array[i];

        if (data.name.toUpperCase().includes(string)) {
            row.style.display = ""; // Show row
        } else {
            row.style.display = "none"; // Hide row
        }
    }
}

function initializeSearcher() {
    var html = "<tr>"
             + "<th>Name</th>"
             + "<th>Type</th>"
             + "<th>Selected</th>"
             + "</tr>";

    _ui_search_table.innerHTML = html;

    _ui_table_rows_array = [];
    for (var i = 0; i < sat_data.length; i++) {

        var data = sat_data[i];

        var row = document.createElement("tr");
        row.innerHTML = "<td>" + data.name + "</td>"
                     +  "<td>" + data.type + "</td>"
                     +  "<td>" + _SAT_IDS_SELECTED[i] + "</td>";

        _ui_table_rows_array.push(row);
        _ui_search_table.appendChild(row);
    }
}