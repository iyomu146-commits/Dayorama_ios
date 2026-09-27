shader_type canvas_item;
void fragment() {
 float t=UV.y;
 vec3 a=vec3(.52941,.34118,.51373),b=vec3(.80392,.49412,.53333),c=vec3(.90588,.66667,.57255),d=vec3(.79216,.55294,.62353);
 vec3 sky=t<.46?mix(a,b,t/.46):(t<.8?mix(b,c,(t-.46)/.34):mix(c,d,(t-.8)/.2));
 COLOR=vec4(sky,1.0);
}
