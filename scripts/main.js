// manual imports
var Matrix4 = THREE.Matrix4;
var Vector3 = THREE.Vector3;

var container;
var camera, scene, renderer;
var cameraControls;
var satellite_nameplate;

var mouse, mouse_screen, raycaster, intersects, INTERSECTED;

var PARTICLE_SIZE = 2; // TODO remove later

var clock = new THREE.Clock();

var earth, moon;

function init() {

  container = document.getElementById('canvas');
  satellite_nameplate = document.getElementById('satellite-nameplate');

  // camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100000);
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
  raycaster.params.Points.threshold = 0.5;
  mouse = new THREE.Vector2();
  mouse_screen = new THREE.Vector2();

  // events
  window.addEventListener('resize', onWindowResize, false);
  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('mousemove', onDocumentMouseMove, false);

  // controls
  cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  cameraControls.update();

  fillScene();
}

function onDocumentMouseMove(event) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
  mouse_screen.x = event.clientX;
  mouse_screen.y = event.clientY;
}

function onWindowResize(event) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
  switch(event.keyCode) {
    // quick page reload by pressing "R"
    case 82:
      location.reload(); 
      break;
  }
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  let delta = clock.getDelta();

  cameraControls.update(delta);

  if (_sats_points != null) {
    // satellite raycast (change size)
    let geometry = _sats_points.geometry;
    let attributes = geometry.attributes;
    raycaster.setFromCamera(mouse, camera);
    intersects = raycaster.intersectObject(_sats_points);
    if (intersects.length > 0) {

      // selected new satellite
      if (INTERSECTED !== intersects[0].index) {

        // reset old satellite
        attributes.size.array[INTERSECTED] = PARTICLE_SIZE;

        // change new satellite
        INTERSECTED = intersects[0].index;
        attributes.size.array[INTERSECTED] = PARTICLE_SIZE * 1.5;
        attributes.size.needsUpdate = true;

        satellite_nameplate.innerHTML = _sats[INTERSECTED].name;
        satellite_nameplate.style.left = mouse_screen.x + "px";
        satellite_nameplate.style.top = mouse_screen.y + "px";
      }
    } else if (INTERSECTED !== null) {
      attributes.size.array[INTERSECTED] = PARTICLE_SIZE;
      attributes.size.needsUpdate = true;
      INTERSECTED = null;
      satellite_nameplate.innerHTML = "";
    }

    updateSatellites(delta);
  }

  // render scene
  renderer.render(scene, camera);
}

function fillScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050505, 2000, 3500);
  scene.add(camera);

  scene.fog = new THREE.Fog(0x050505, 2000, 3500);

  // lights
  scene.add(new THREE.AmbientLight(0x222222));
  let directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  scene.add(directionalLight);

  fillSceneObjects(scene);

  getSatellites(function() {
    scene.add(_sats_points);
  });
}

window.addEventListener('load', function() {
  init();
  animate();
});