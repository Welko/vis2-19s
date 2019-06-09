// manual imports
var Matrix4 = THREE.Matrix4;
var Vector3 = THREE.Vector3;

var KM_TO_WORLD_UNITS = 0.001;

var container;
var camera, scene, renderer;
var cameraControls;
var satellite_nameplate;
var satellite_info_box;

var mouse, mouse_screen, raycaster;

var clock = new THREE.Clock();

// Flags
let f_shift_down = false;
let f_ctrl_down = false;
let f_drag = false;

// UI stuff
var UI_SATELLITES_COUNT;

function init() {

  container = document.getElementById('canvas');
  satellite_nameplate = document.getElementById('satellite-nameplate');
  satellite_info_box = document.getElementById('satellite-info-box');
  UI_SATELLITES_COUNT = document.getElementById('satellites-count');
  var color_info = document.getElementById('color-info');

  var color_select = document.getElementById('color-select');
  color_select.addEventListener('change', function() { changeSatelliteColors(color_select.value, color_info); }, false);

  var button_clear_selection = document.getElementById("button-clear-selection");
  button_clear_selection.addEventListener("click", function() {clearSatelliteSelection();});

  // camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 10000000);
  camera.position.set(-40, 85, -5);

  // renderer
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  container.appendChild(renderer.domElement);

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
  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('mouseup', onMouseUp, false);
  document.addEventListener('mousemove', onMouseMove, false);

  // controls
  cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  cameraControls.update();

  fillScene();
}

function onWindowResize(event) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    switch(event.keyCode) {
        case 16: // SHIFT (add satellites to selection)
            setSelectionConeFunctionToAdd(true);
            f_shift_down = true;
            break;

        case 17: // CTRL (remove satellites from selection)
            setSelectionConeFunctionToAdd(false);
            f_ctrl_down = true;
            break;

        case 82: // R (quick page reload)
            location.reload();
            break;
    }
}

function onKeyUp(event) {
  switch (event.keyCode) {
      case 16: // SHIFT (add satellites to selection)
          f_shift_down = false;
          break;

      case 17: // CTRL (remove satellites from selection)
          f_ctrl_down = false;
          break;
  }
}

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

function onMouseUp(event) {
    f_drag = false;
    cameraControls.enabled = true;
    removeCone();
}

function onMouseMove(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    mouse_screen.x = event.clientX;
    mouse_screen.y = event.clientY;
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  //updateTime();
  let delta = clock.getDelta();
  var datetime = new Date(); // TODO: change so every date value uses this an make it configurable

  cameraControls.update(delta);
  raycaster.setFromCamera(mouse, camera);
  // threshold depeniding on distance
  raycaster.params.Points.threshold = Math.pow(camera.position.lengthSq(), 0.6)*0.005;

  let plsIntersect = true; // Please intersect!

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

  if (plsIntersect && !f_ctrl_down && !f_shift_down && sat_points != null) { // not good to use sat_points here! (bc assume global scale)
    plsIntersect = ! intersectSatellites(raycaster, scene, container);
  }

  updateSatellites(delta);
  updateSceneObjects(delta, datetime);

  // render scene
  renderer.render(scene, camera);
}

function fillScene() {
  scene = new THREE.Scene();
  // scene.fog = new THREE.Fog(0x050505, 2000, 3500);
  scene.add(camera);

  // lights
  scene.add(new THREE.AmbientLight(0x222222));
  let directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  scene.add(directionalLight);

  fillSceneWithObjects(scene);

  startSatelliteLoading(scene);
}

window.addEventListener('load', function() {
  init();
  animate();
});