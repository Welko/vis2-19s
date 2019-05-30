// manual imports
var Matrix4 = THREE.Matrix4;
var Vector3 = THREE.Vector3;

var container;
var camera, scene, renderer;
var cameraControls;

var mouse, raycaster, intersects, INTERSECTED;

var PARTICLE_SIZE = 4; // remove later

var clock = new THREE.Clock();

var earth, satellites;

function init() {

  container = document.getElementById('canvas');

  // camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1000);
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

  // events
  window.addEventListener('resize', onWindowResize, false);
  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('mousemove', onDocumentMouseMove, false);

  // controls
  cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  cameraControls.update();

  fillScene();
}

function onDocumentMouseMove( event ) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
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
};

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  var delta = clock.getDelta();

  cameraControls.update(delta);

  // satellite raycast (change size)
  var geometry = satellites.geometry;
  var attributes = geometry.attributes;
  raycaster.setFromCamera( mouse, camera );
  intersects = raycaster.intersectObject(satellites);
  if (intersects.length > 0) {
    if (INTERSECTED != intersects[0].index) {
      attributes.size.array[INTERSECTED] = PARTICLE_SIZE;
      INTERSECTED = intersects[0].index;
      attributes.size.array[INTERSECTED] = PARTICLE_SIZE * 1.5;
      attributes.size.needsUpdate = true;
    }
  } else if (INTERSECTED !== null) {
    attributes.size.array[INTERSECTED] = PARTICLE_SIZE;
    attributes.size.needsUpdate = true;
    INTERSECTED = null;
  }

  // render scene
  renderer.render(scene, camera);
}

function fillScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050505, 2000, 3500);
  scene.add(camera);

  // lights
  scene.add(new THREE.AmbientLight(0x222222));

  var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  scene.add(directionalLight);

  // grid
  scene.add(new THREE.GridHelper(100, 10));

  // earth
  var earth_geometry = new THREE.SphereGeometry( 1, 48, 24 );
  earth_geometry.scale(6.378137, 6.356752, 6.378137); //earth is ellipsoid: https://en.wikipedia.org/wiki/Figure_of_the_Earth#Volume
  var earth_material = new THREE.MeshStandardMaterial({color: 0xff0000});
  earth = new THREE.Mesh(earth_geometry, earth_material);
  scene.add(earth);

  scene.add(generateSatellites());
}

function generateSatellites() {
  var particles = 10000;
  var geometry = new THREE.BufferGeometry();
  var positions = [];
  var colors = [];
  var sizes = [];
  var color = new THREE.Color();
  
  var min_r = 30;
  var max_r = 40;
  var max_phi = 2*Math.PI;
  var max_theta = Math.PI;

  for ( var i = 0; i < particles; i ++ ) {
    // positions
    var r = Math.random() * (max_r - min_r) + min_r;
    var phi = Math.random() * max_phi;
    var theta = Math.random() * max_theta;

    var x = r * Math.sin(theta) * Math.cos(phi);
    var y = r * Math.sin(theta) * Math.sin(phi);
    var z = r * Math.cos(theta);
    positions.push( x, y, z );
    // colors
    var vx = ( x / max_r ) + 0.5;
    var vy = ( y / max_r ) + 0.5;
    var vz = ( z / max_r ) + 0.5;
    color.setRGB( vx, vy, vz );
    colors.push( color.r, color.g, color.b );

    sizes.push(PARTICLE_SIZE);
  }

  geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
  geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
  geometry.addAttribute( 'size', new THREE.Float32BufferAttribute( sizes, 1 ) );
  geometry.computeBoundingSphere();
  //
  // var material = new THREE.PointsMaterial({ 
  //   size: 1, 
  //   vertexColors: THREE.VertexColors,
  //   map: new THREE.TextureLoader().load( 'circle.png' )} );

  var material = new THREE.ShaderMaterial( {
    uniforms: {
      mainColor: { value: new THREE.Color( 0xffffff ) },
      texture: { value: new THREE.TextureLoader().load( "circle.png" ) }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    alphaTest: 0.9
  } );

  // material.blending = THREE.AdditiveBlending;
  
  satellites = new THREE.Points(geometry, material);
  return satellites;
}

window.addEventListener('load', function() {
  init();
  animate();
});