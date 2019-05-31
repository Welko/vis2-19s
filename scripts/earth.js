earth = null;

function fillSceneWithEarth(scene) {
    var earth_geometry = new THREE.SphereGeometry( 1, 48, 24 );
    earth_geometry.scale(6.378137, 6.356752, 6.378137); // earth is ellipsoid: https://en.wikipedia.org/wiki/Figure_of_the_Earth#Volume
    var earth_bump;// = new THREE.TextureLoader().load('./resources/earth_bump.png');
    var earth_material = new THREE.MeshStandardMaterial({
        map: null, //new THREE.TextureLoader().load('./resources/earth.jpg'),
        bumpMap: earth_bump,
        bumpScale: 0.1,
        roughnessMap: earth_bump,
        metalnessMap: earth_bump,
    });
    earth = new THREE.Mesh(earth_geometry, earth_material);

    scene.add(earth);
}

function intersectEarth(raycaster) {
    if (earth == null) {
        return null;
    }

    let intersects = raycaster.intersectObject(earth);

    if (intersects.length > 0) {
        console.log("Intersected!");
    }

    /*if (intersects.length > 0) {

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
    }*/

    return intersects.length > 0;
}