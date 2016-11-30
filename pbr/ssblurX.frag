#version 130 
uniform sampler2D diffuse;  //diffuse texture
uniform sampler2D sss; //subsurface scattering coefficients per pixel  
uniform sampler2D depth;  
uniform float scale;//scale of the sss
in vec2 texcoord; 
uniform float zn,zf;//near plane, far plane
void main() {    
	 
    float w[6] = { 0.006,   0.061,   0.242,  0.242,  0.061, 0.006 };
    float samples[6] = {  -1.0, -0.6667, -0.3333, 0.3333, 0.6667,   1.0 };
   
	vec3 c = 0.382*texture2D(diffuse, texcoord).rgb;
    vec3 sss = texture2D(sss,texcoord).rgb*vec3(3.673,1.367,0.683);
    float z_n = 2.0 * texture2D(depth, texcoord).r - 1.0;//this is non linear depth
    float dep = 2.0 * zn * zf / (zf + zn - z_n * (zf - zn)); //this is linear depth
    vec2 finalStep =  vec2(scale,0)/dep;;
     
    for(int j=0;j<6;j++){
        c[0] += texture2D(diffuse,texcoord + finalStep*samples[j]*sss[0])[0]*w[j];
        c[1] += texture2D(diffuse,texcoord + finalStep*samples[j]*sss[1])[1]*w[j];
        c[2] += texture2D(diffuse,texcoord + finalStep*samples[j]*sss[2])[2]*w[j];
    }
    
    gl_FragColor =  vec4(c,1);
    
}
