var satellite_frag = /* glsl */`

uniform vec3 mainColor;
uniform sampler2D texture;
varying vec3 vColor;
void main() {
    gl_FragColor = vec4( mainColor * vColor, 1.0 );
    gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );
    if ( gl_FragColor.a < ALPHATEST ) discard;
}

`;