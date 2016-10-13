//this shader was written for panda3d

#version 130
 
// Uniform inputs
uniform mat4 p3d_ModelViewProjectionMatrix;
uniform mat4 p3d_ModelMatrix; 
uniform mat4 shadow_matrix;
// Vertex inputs
in vec4 p3d_Vertex;
in vec3 p3d_Normal;
out vec4 shadow_coord;
//in vec2 p3d_MultiTexCoord0;

in vec2 p3d_MultiTexCoord0;
// Output to fragment shader
out vec2 texcoord;
out vec3 nor;
out vec3 pos;
out vec4 sco;

void main() {
    gl_Position = p3d_ModelViewProjectionMatrix * p3d_Vertex;
    sco = p3d_ModelViewProjectionMatrix * p3d_Vertex;//vec3(gl_Position.xy, gl_Position.w);
   // sco.xyz/=sco.w;
    texcoord = p3d_MultiTexCoord0;//+0.5;
    nor =  (p3d_ModelMatrix *  vec4(p3d_Normal,0)).xyz;
    pos =  (p3d_ModelMatrix * p3d_Vertex).xyz;
    
    shadow_coord = shadow_matrix*vec4(pos,1);
    shadow_coord.xyz= shadow_coord.xyz*0.5+0.5;
}
