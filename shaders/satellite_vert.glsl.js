var satellite_vert = /* glsl */`

attribute float size;
attribute vec4 color;
varying vec4 vColor;

void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    gl_PointSize = size * 4.0; // * ( pow(1000.0 / -(mvPosition.z), 0.6) );
    gl_Position = projectionMatrix * mvPosition;
}

`;