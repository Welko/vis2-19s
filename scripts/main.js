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
let f_ctrl_down = false;
let f_ctrl_drag = false;

function init() {

  container = document.getElementById('canvas');
  satellite_nameplate = document.getElementById('satellite-nameplate');
  satellite_info_box = document.getElementById('satellite-info-box');
  var color_info = document.getElementById('color-info');
  var color_select = document.getElementById('color-select');
  color_select.addEventListener('change', function() { changeSatelliteColors(color_select.value, color_info); }, false);

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
        case 17: // CTRL (sketch on earth)
            f_ctrl_down = true;
            break;

        case 82: // R (quick page reload)
            location.reload();
            break;
    }
}

function onKeyUp(event) {
  switch (event.keyCode) {
      case 17: // CTRL (sketch on earth)
          f_ctrl_down = false;
          break;
  }
}

function onMouseDown(event) {
  switch (event.button) {
      case 0: // Left mouse button
          if (f_ctrl_down) {
            cameraControls.enabled = false;
              f_ctrl_drag = true;
          } else {
            selectSatellite(satellite_info_box);
          }
  }
}

function onMouseUp(event) {
    f_ctrl_drag = false;
    cameraControls.enabled = true;
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
  let delta = clock.getDelta();

  cameraControls.update(delta);
  raycaster.setFromCamera(mouse, camera);
  // threshold depeniding on distance
  raycaster.params.Points.threshold = Math.pow(camera.position.lengthSq(), 0.6)*0.005;

  let plsIntersect = true; // Please intersect!

  if (plsIntersect && f_ctrl_drag && earth != null) {
    plsIntersect = ! intersectEarth(raycaster);
  }

  if (plsIntersect && sat_points != null) { // not good to use sat_points here! (bc assume global scale)
    plsIntersect = ! intersectSatellites(raycaster, scene, container);
  }

  updateSatellites(delta);

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