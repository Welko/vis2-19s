var sky_vert = /* glsl */`

varying vec2 vUV;

void main() {  
  vUV = uv;
  vec4 pos = vec4(position, 1.0);
  gl_Position = pos.xyww;
}

`;