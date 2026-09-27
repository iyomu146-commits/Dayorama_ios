shader_type spatial;
render_mode specular_disabled, ambient_light_disabled;
varying vec3 base_color;
varying vec4 emission_hero;
varying vec3 world_normal;
varying vec3 story_world;
uniform float story_light=1.0;
uniform vec3 sky_top = vec3(0.5457,0.4910,0.6239);
uniform vec3 sky_bottom = vec3(0.1356,0.0723,0.1274);
uniform float sky_power = 1.3;
uniform float exposure = 1.62450479;
uniform vec3 gain = vec3(1.005,1.025,.975);
uniform vec3 lift = vec3(.06,.042,.06);
uniform vec3 grade_gamma = vec3(1.0);
uniform float saturation = 1.15;
uniform float white_point = 8.0;
uniform vec3 sun_color = vec3(1.0,.8,.6);
uniform float sun_power = 3.52;
vec3 hable(vec3 x) { return ((x*(.22*x+.03)+.004)/(x*(.22*x+.30)+.06))-.033333333333; }
vec3 to_srgb(vec3 c) { return mix(12.92*c,1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-.055,step(vec3(.0031308),c)); }
vec3 to_linear(vec3 c) { return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c)); }
void vertex() {
 base_color=CUSTOM0.rgb;
 emission_hero=CUSTOM1;
 world_normal=normalize(MODEL_NORMAL_MATRIX*NORMAL);
 story_world=(MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;
}
void fragment() { ALBEDO=vec3(1.0); ROUGHNESS=1.0; }
void light() {
 // Exactly one directional light. Godot supplies the shadow attenuation.
 vec3 hemi=mix(sky_bottom,sky_top,clamp(world_normal.z*.5+.5,0.0,1.0))*sky_power;
 float lamp=all(greaterThanEqual(story_world,vec3(9.15,4.35,2.25)))&&all(lessThanEqual(story_world,vec3(14.1,12.0,8.85)))?story_light:1.0;
 vec3 radiance=base_color*(hemi+sun_color*sun_power*max(dot(NORMAL,LIGHT),0.0)*ATTENUATION)/PI+emission_hero.rgb*lamp;
 vec3 c=to_srgb(hable(max(radiance,vec3(0.0))*exposure)/hable(vec3(white_point)));
 float l=dot(c,vec3(.2126,.7152,.0722));
 c+=vec3(.027,.008,.04)*(1.0-smoothstep(.12,.60,l));
 c=pow(clamp(c*gain+lift*(1.0-c),0.0,1.0),1.0/grade_gamma);
 l=dot(c,vec3(.2126,.7152,.0722));
 c=clamp(vec3(l)+(c-vec3(l))*saturation,0.0,1.0);
 l=dot(c,vec3(.2126,.7152,.0722)); c*=min(1.0,.76/max(.00001,l));
 if (emission_hero.a>.5) c=mix(vec3(.20,.19,.24),mix(vec3(.985,.925,.705),vec3(1.0,.985,.83),clamp(dot(emission_hero.rgb,vec3(.2126,.7152,.0722)),0.0,1.0)),lamp);
 // Godot 4.7 Compatibility converts linear lighting output to sRGB itself.
 DIFFUSE_LIGHT=to_linear(c);
}
