//this shader was written for panda3d

#version 130
 
uniform samplerCube env_map;
uniform samplerCube env_irr;  
uniform mat4 p3d_ViewMatrixInverse;
uniform sampler2D shadow_depth;
uniform sampler2D diffuse_tex;  
uniform sampler2D ao_tex;  

uniform vec2 ao_scale;
uniform vec3 light_dir;
uniform vec3 light_color;

in vec2 texcoord;
in vec3 nor;
in vec3 pos;
in vec4 shadow_coord;
in vec4 sco;

vec3 cm(vec3 v){ //cm does a rotation over the x axis, this was needed on this specific shader and specific problem, but may be unnecessary
    return vec3(v.x, -v.z,v.y);
}

uniform struct {//panda3d stuff
  vec4 ambient;
  vec4 diffuse;
  vec4 emission;
  vec3 specular;
  float shininess;
 
  // These properties are new in 1.10.
  vec4 baseColor;
  float roughness;
  float metallic;
  float refractiveIndex;
} p3d_Material;


vec3 FSchlick(vec3 SpecularColor,vec3 E,vec3 H) //fresnel 
{
    return SpecularColor + (1.0f - SpecularColor) * pow(1.0f - clamp(dot(E, H),0,1), 5);
}

void main() {
    
    vec3 color = p3d_Material.diffuse.rgb*texture2D(diffuse_tex, texcoord).rgb;
    vec3 sss = p3d_Material.ambient.rgb;
    
    vec3 eyep = p3d_ViewMatrixInverse[3].xyz; //eye position
    vec3 N = normalize(nor); //world space normal
    vec3 E = normalize(eyep -pos); //world space eye vector
    vec3 R = normalize(reflect(-E,N)); //world space reflection vector
    
    float gloss = p3d_Material.specular.g; //gloss 
    float Ks =  p3d_Material.specular.r;// surface reflection
    float ior = p3d_Material.specular.b; //metalness
    
    
    float Kd; //diffuse 
    vec3 F0; 
    
    //first , enviroment lighting
    float env_i = 1; //enviroment lighting intensity
    if(ior > 0.0001){//dielectric 
        F0 = vec3(0.03);
        Kd = 1 -Ks;
    }else{  //conductive (metalic)
        Kd = 0;
        F0 = color;
    }
    vec3 F =(F0+(1-F0)*clamp(pow(1-clamp(dot(E,N),0,1),5),0,1.0));
    
    vec4 diff, spec;
    int mipmaps = 9 ; //mipmaps count log2(cubemap_width) or something like that
    diff.a = p3d_Material.diffuse.a;
    
    vec2 sc = ((sco.xy/sco.w)*0.5+0.5)*ao_scale;//ambient occlusion computed in previous pass 
    float ao = texture2D(ao_tex, sc).r;    
    //here we add enviroment lighting:
    diff.xyz += ao*Kd*textureCube(env_irr, cm(N)).rgb*color*env_i;//env_irr is the irradiance environment map
    spec += ao*vec4(F,1)*Ks*textureCubeLod(env_map, cm(R),(mipmaps-1)*(1-gloss))*env_i;//env_map is the environment map


    //sun lighting 
    vec3 L = normalize(-light_dir);
    vec3 H = normalize(L+E);
	float NdotL = clamp(dot(N,L),0,1);
    float NdotH = clamp(dot(N,H),0,1);
    float SpecularPower = exp2(10 * gloss + 1);//specular power from gloss
    if(ior < 0.001){
		F0 = color;
		Kd = 0;
    }else{
		//F0 = vec3(abs ((1.0 - ior) / (1.0 + ior))); // actual ior
		//F0 = F0*F0;
        
        F0 = vec3(0.03);
        Kd = 1 -Ks; //we preserve energy making Kd + Ks = 1
    }
    F = FSchlick(F0, E, H);
    vec3 lcolor = light_color;
    
    //shadow
    vec3 shadcoord = shadow_coord.xyz/shadow_coord.w;    
    float shadow = 0;
    float shadow_bias = 0.001;
    float ismap_size =  1.0/512.0;
    //pcf shadow mapping with linear filtering, high order filtering is good too
    #define HQ
    #ifdef HQ
    for(int i=-1;i<1;i++){
        for(int j=-1;j<1;j++){
            vec2 shsam = shadcoord.xy+ vec2(i,j)* ismap_size  ;
            vec2 shatc=fract(shsam.xy/ismap_size);
            vec2 base_tc=shsam.xy-shatc*ismap_size;
            vec4 sam4 = -vec4(texture2D(shadow_depth, base_tc).x,
            texture2D(shadow_depth, base_tc+ vec2(ismap_size ,0)).x,
            texture2D(shadow_depth, base_tc+ vec2(ismap_size ,ismap_size)).x,
            texture2D(shadow_depth, base_tc+ vec2(0 , ismap_size)).x) + shadcoord.z-shadow_bias;
            vec4 sha =  vec4(lessThan(sam4,vec4(0)));
            shadow +=mix(mix(sha.x,sha.y,shatc.x),mix(sha.w,sha.z,shatc.x),shatc.y);
        }
    }
    shadow/=9;
    #else
    vec2 shatc=fract(shadcoord.xy/ismap_size);
    vec2 base_tc=shadcoord.xy-shatc*ismap_size;
    vec4 sam4 = -vec4(texture2D(shadow_depth, base_tc).x,
    texture2D(shadow_depth, base_tc+ vec2(ismap_size ,0)).x,
    texture2D(shadow_depth, base_tc+ vec2(ismap_size ,ismap_size)).x,
    texture2D(shadow_depth, base_tc+ vec2(0 , ismap_size)).x) + shadcoord.z-shadow_bias;
    vec4 sha =  vec4(lessThan(sam4,vec4(0)));
    shadow =mix(mix(sha.x,sha.y,shatc.x),mix(sha.w,sha.z,shatc.x),shatc.y);
    
    #endif
    
	spec += Ks*shadow*vec4(F,1)*((SpecularPower + 2) / 8 ) * pow(clamp(NdotH,0,1), SpecularPower)*vec4(lcolor,1) * NdotL;	
	diff.rgb += Kd*shadow*max(color-F,vec3(0))*min(vec3(1),max(vec3(0),vec3(NdotL)))*lcolor*(1/3.1415926);
 
    //in this shader i separate diffuse and specular lighting for doing screen space subsurface scattering later
    gl_FragData[0] = diff ; //diffuce
    gl_FragData[1] = spec;//specular    
    gl_FragData[2] = vec4(sss,1) ;//subsurface scattering coefficients, this is very general, if you plan to just support skin, this may be a single component 
}
