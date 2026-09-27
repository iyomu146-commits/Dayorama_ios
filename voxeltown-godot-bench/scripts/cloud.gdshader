shader_type spatial;
render_mode unshaded, cull_front, depth_draw_never, shadows_disabled, fog_disabled;
uniform vec3 source_position;
uniform vec3 source_forward;
uniform vec3 source_up;
uniform vec2 source_shift;
uniform float tan_half_fov;
uniform float aspect=1.0;
varying vec3 tint;
void vertex() {
 vec3 relative=VERTEX-source_position;
 vec3 right=normalize(cross(source_forward,source_up));
 float depth=dot(relative,source_forward);
 vec2 xy=vec2(dot(relative,right)/(depth*tan_half_fov*aspect),dot(relative,source_up)/(depth*tan_half_fov))-2.0*source_shift;
 // Offscreen Compatibility viewport uses a flipped projection Y.
 POSITION=vec4(xy.x,-xy.y,-.99999,1.0);
 tint=COLOR.rgb;
}
void fragment() { ALBEDO=tint; ALPHA=.6; }
