// manual imports
var Matrix4 = THREE.Matrix4;
var Vector3 = THREE.Vector3;

var KM_TO_WORLD_UNITS = 0.001;

var _datetime;

var container;
var camera, scene, renderer;
var cameraControls;
var satellite_nameplate;
var satellite_info_box;
var time_input;

var mouse, mouse_screen, raycaster;

var clock = new THREE.Clock();

// Flags
let f_shift_down = false;
let f_ctrl_down = false;
let f_drag = false;

// UI stuff
var _ui_renderer;
var _ui_satellites_count;
var _ui_color_select;
var _ui_color_info_table;
var _ui_search;
var _ui_search_table;
var _ui_search_results;
var _ui_search_showing;
var _ui_search_selected_only;
var _ui_search_results_row;
var _ui_search_showing_row;

// Function: init
// initializes the program by hooking up DOM elements with javscript callbacks as well as the canvas
function init() {

    _datetime = new Date();

    container = document.getElementById('canvas');
    satellite_nameplate = document.getElementById('satellite-nameplate');
    satellite_info_box = document.getElementById('satellite-info-box');
    _ui_satellites_count = document.getElementById('satellites-count');
    _ui_color_info_table = document.getElementById('color-info-table');

    time_input = document.getElementById('timeinput');

    time_input.oninput = updateTime;
    // time_input.onchange = updateTime;

    var now_button = document.getElementById("now-button");
    now_button.addEventListener("click", function () {
        time_input.value = 0;
        updateTime();
    });

    _ui_color_select = document.getElementById('color-select');
    _ui_color_select.addEventListener('change', function () {
        updateSatellitesColor();
    }, false);

    var button_clear_selection = document.getElementById("button-clear-selection");
    button_clear_selection.addEventListener("click", clearSatelliteSelection);

    var button_select_all = document.getElementById("button-add-all-selection");
    button_select_all.addEventListener("click", addAllSatellites);

    _ui_search = document.getElementById("search");
    _ui_search.addEventListener("input", onSearchParamsChanged);

    _ui_search_table = document.getElementById("search-table");
    _ui_search_results = document.getElementById("search-results");
    _ui_search_showing = document.getElementById("search-showing");

    _ui_search_selected_only = document.getElementById("checkbox-search-only-selected");
    _ui_search_selected_only.addEventListener("change", onSearchParamsChanged);

    _ui_search_results_row = document.getElementById("search-results-row");
    _ui_search_showing_row = document.getElementById("search-showing-row");

    // camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 10000000);
    camera.position.set(-40, 85, -5);

    // renderer
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    _ui_renderer = renderer.domElement;
    container.appendChild(_ui_renderer);

    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    // raycasting
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    mouse_screen = new THREE.Vector2();

    // events
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('keydown', onKeyDown, false);
    _ui_renderer.addEventListener('mousedown', onMouseDown, false);
    _ui_renderer.addEventListener('mouseup', onMouseUp, false);
    _ui_renderer.addEventListener('mousemove', onMouseMove, false);

    // controls
    cameraControls = new THREE.OrbitControls(camera, _ui_renderer);
    cameraControls.update();

    fillScene();
}

// Function: updateTime
// updates the time according to the slider value
function updateTime() {
    var minutes = time_input.value;
    _datetime = new Date(new Date().getTime() + minutes*60000);
    updateDateRelevantInfos();
}

// Function: onWindowResize
// called when window dimensions change, adjusts canvas size
function onWindowResize(event) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Function: updateDateRelevantInfos
// updates the date dependent code immediately
function updateDateRelevantInfos() {
    updateSceneObjectDateRelevantInfos();
    updateSatelliteDateRelevantInfos();
}

// Function: onKeyDown
// called when key is pressed
function onKeyDown(event) {
    switch (event.keyCode) {
        case 16: // SHIFT (add satellites to selection)
            setSelectionConeFunctionToAdd(true);
            f_shift_down = true;
            return true;

        case 17: // CTRL (remove satellites from selection)
            setSelectionConeFunctionToAdd(false);
            f_ctrl_down = true;
            return true;

    }
}

// Function: onKeyUp
// called when key is released
function onKeyUp(event) {
    switch (event.keyCode) {
        case 16: // SHIFT (add satellites to selection)
            f_shift_down = false;
            return true;

        case 17: // CTRL (remove satellites from selection)
            f_ctrl_down = false;
            return true;
    }
}

// Function: onMouseDown
// called when mouse button is pressed
function onMouseDown(event) {
    f_drag = true;
    switch (event.button) {
        case 0: // Left mouse button
            if (f_shift_down || f_ctrl_down) {
                cameraControls.enabled = false;
            } else if (intersected_satellite !== null) {
                selectSatellite(intersected_satellite);
            }
    }
}

// Function: onMouseUp
// called when mouse button is released
function onMouseUp(event) {
    f_drag = false;
    cameraControls.enabled = true;
    removeCone();
}

// Function: onMouseMove
// called when mouse is moved
function onMouseMove(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    mouse_screen.x = event.clientX;
    mouse_screen.y = event.clientY;
}

// Function: animate
// requests the animation frames for the canvas, starts the rendering process
function animate() {
    requestAnimationFrame(animate);
    render();
}

// Function: render
// renders a frame
function render() {
    //updateTime();
    let delta = clock.getDelta();

    if (_datetime === undefined) {
        _datetime = new Date();
    } else {
        _datetime = new Date(_datetime.getTime() + delta*1000);
    }

    cameraControls.update(delta);
    raycaster.setFromCamera(mouse, camera);
    // threshold depeniding on distance
    raycaster.params.Points.threshold = Math.pow(camera.position.lengthSq(), 0.6)*0.005;

    let plsIntersect = true; // Please intersect!

    // Intersect earth
    if (plsIntersect && (f_shift_down || f_ctrl_down) && f_drag && earth != null) {
        var intersection = intersectEarth(raycaster);
        if (intersection !== null) {
            positionCone(intersection.point);
            var sat_indexes_in_cone = findSatellitesInCone();
            if (f_shift_down) {
                addSelectedSatellites(sat_indexes_in_cone);
            } else { //if (f_ctrl_down) {
                removeSelectedSatellites(sat_indexes_in_cone);
            }
            plsIntersect = false;
        }
    }

    // Intersect satellites
    if (plsIntersect && !f_ctrl_down && !f_shift_down && sat_points != null) { // not good to use sat_points here! (bc assume global scale)
        plsIntersect = ! intersectSatellites(raycaster, container);
    }

    updateSatellites(delta);
    updateSceneObjects(delta);

    // render scene
    renderer.render(scene, camera);
}

// Function: fillScene
// fills the scene with objects (called once initially and if scene has to be populatet again like on context loss)
function fillScene() {
    scene = new THREE.Scene();
    scene.add(camera);

    fillSceneWithObjects(scene);
    startSatelliteLoading(scene);
}

window.addEventListener('load', function() {
    init();
    animate();
});