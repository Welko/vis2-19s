function fillSceneWithObjects(scene) {
    // grid
    var grid = new THREE.GridHelper(1000, 10, 0x666666, 0x333333);
    grid.material.opacity = 0.5;
    grid.material.transparent = true,
    scene.add(grid);
    
    var polar_grid = new THREE.PolarGridHelper(200, 16, 20, 64, 0x666666, 0x666666);
    polar_grid.material.opacity = 0.5;
    polar_grid.material.transparent = true,
    scene.add(polar_grid);

    var axesHelper = new THREE.AxesHelper(100);
    scene.add( axesHelper );

    // earth
    fillSceneWithEarth(scene);

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