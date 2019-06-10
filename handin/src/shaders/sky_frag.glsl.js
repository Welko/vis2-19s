var sky_frag = /* glsl */`

uniform sampler2D texture;  
varying vec2 vUV;

void main() {  
  vec4 sample = texture2D(texture, vUV);
  gl_FragColor = vec4(sample.xyz * 0.5, sample.w);
}

`;