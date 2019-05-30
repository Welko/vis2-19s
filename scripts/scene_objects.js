function fillSceneObjects(scene) {
    // grid
    scene.add(new THREE.GridHelper(1000, 10));
    scene.add(new THREE.PolarGridHelper(100, 36, 10, 64, 0xcc5555, 0xcc5555));

    // earth
    scene.add(generateEarth());

    // moon
    var moon_geometry = new THREE.SphereGeometry( 1, 48, 24 );
    moon_geometry.scale(1.7381, 1.7360, 1.7381); // https://en.wikipedia.org/wiki/Moon
    moon_geometry.translate(384.402, 0, 0);
    var moon_material = new THREE.MeshStandardMaterial({color: 0xdddddd});
    moon = new THREE.Mesh(moon_geometry, moon_material);
    scene.add(moon);

    // try plotting moon orbit:
    var curve = new THREE.EllipseCurve(
        0,  0,            // ax, aY
        384, 400,           // xRadius, yRadius
        0,  2 * Math.PI,  // aStartAngle, aEndAngle
        false,            // aClockwise
        0                // aRotation
    );

    var points = curve.getPoints( 50 );
    var geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.rotateX(Math.PI * 0.67);
    var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
    // Create the final object to add to the scene
    var ellipse = new THREE.Line(geometry, material);
    scene.add(ellipse);

    // skysphere
    var geometry = new THREE.SphereGeometry(30000, 60, 40);  
    var uniforms = {  
    texture: { type: 't', value: new THREE.TextureLoader().load('./resources/milky_way.jpg') }
    };

    var material = new THREE.ShaderMaterial( {  
        uniforms:       uniforms,
        side:           THREE.BackSide,
        vertexShader:   sky_vert,
        fragmentShader: sky_frag
    });

    var skyBox = new THREE.Mesh(geometry, material);  
    skyBox.rotateX(Math.PI*0.5);
    skyBox.renderDepth = 1000.0;  
    scene.add(skyBox);  
}

function generateEarth() {
    var earth_geometry = new THREE.SphereGeometry( 1, 48, 24 );
    earth_geometry.scale(6.378137, 6.356752, 6.378137); // earth is ellipsoid: https://en.wikipedia.org/wiki/Figure_of_the_Earth#Volume
    var earth_bump = new THREE.TextureLoader().load('./resources/earth_bump.png');
    //var earth_oceans = new THREE.TextureLoader().load('./resources/oceans.png');
    var earth_material = new THREE.MeshStandardMaterial({
        map: new THREE.TextureLoader().load('./resources/earth.jpg'),
        bumpMap: earth_bump,
        bumpScale: 0.1,
        roughnessMap: earth_bump,
        metalnessMap: earth_bump,
        //roughness: 0.5
        // specular: 0x222222,
        // shininess: 25

    });
    earth = new THREE.Mesh(earth_geometry, earth_material);
    return earth;
}