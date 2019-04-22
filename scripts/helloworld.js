// Source: https://www.npmjs.com/package/three

var camera, scene, renderer;
var geometry, material, mesh;

container = document.createElement( 'div' );
document.body.appendChild( container );

var container = document.getElementById("helloworld_container");

init();
animate();

// ---------------------------------------------------------------------------------------------------------------------
// Function definitions
// ---------------------------------------------------------------------------------------------------------------------

function init() {
    //var width = window.innerWidth;
    //var height = window.innerHeight;
    //var width = container.offsetWidth;
    //var height = container.offsetHeight;
    var width = getWidth();
    var height = getHeight();

    console.log("Width: " + width + " | Height: " + height);

    camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
    camera.position.z = 1;

    scene = new THREE.Scene();

    geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    material = new THREE.MeshNormalMaterial();

    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize(width, height);

    container.appendChild( renderer.domElement );

    // Register events
    window.addEventListener("resize", resize, false);
}

function resize() {
    var width = getWidth();
    var height = getHeight();
    console.log("Resized to " + width + " x " + height);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

function animate() {

    requestAnimationFrame( animate );

    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.02;

    renderer.render( scene, camera );

}

function getWidth() {
    //return container.offsetWidth;
    return window.innerWidth;
}

function getHeight() {
    //return container.offsetHeight;
    return window.innerHeight;
}