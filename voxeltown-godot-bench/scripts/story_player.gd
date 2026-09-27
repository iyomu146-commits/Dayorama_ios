class_name StoryPlayer
extends RefCounted

var host: Control
var spec: Dictionary
var root:=Node3D.new()
var actor:=Node3D.new()
var parts: Dictionary={}
var originals: Dictionary={}
var contexts: Dictionary={}
var instances:=MultiMeshInstance3D.new()
var material: ShaderMaterial
var active: bool=false
var playing: bool=false
var time: float=0.0
var last_usec: int=0
var final_shown: bool=true
var muted: bool=false
var frames: Array=[]
var phase_frames: Dictionary={}
var prepare_ms: float=0.0
var sounds: Dictionary={}
var last_pop: int=-1
var last_step: int=-1
var complete_played: bool=false
var spill_material: ShaderMaterial
var timeline: AnimationPlayer
var interrupted: bool=false

func _init(app: Control) -> void:
	host=app

static func state(s: Dictionary,t: float) -> Dictionary:
	var n: int=clampi(int(floor((t-float(s.buildStart)-float(s.fallDuration))/float(s.buildDuration)*(s.cells.size()-1)))+1,0,s.cells.size())
	var walk: float=clampf((t-float(s.residentTime))/float(s.actor.walkDuration),0,1)
	var walking: bool=walk>0 and walk<1
	var wave_time: float=t-float(s.actor.waveStart)
	var wave: float=sin(wave_time*PI/float(s.actor.waveDuration)) if wave_time>=0 and wave_time<float(s.actor.waveDuration) else 0.0
	var phase: String='開始' if t<float(s.buildStart) else '建築中' if t<float(s.finishTime) else '完成' if t<float(s.lightsTime) else '灯り' if t<float(s.residentTime) else '暮らし' if t<float(s.duration) else '再生終了'
	var route: Array=s.actor.waypoints;var a: Array=route[0];var b: Array=route[1]
	for i in range(1,route.size()):
		a=route[i-1];b=route[i]
		if walk<=float(b[0]): break
	var fraction: float=clampf((walk-float(a[0]))/(float(b[0])-float(a[0])),0,1)
	var pos: Vector3=Vector3(float(a[1]),float(a[2]),float(a[3])).lerp(Vector3(float(b[1]),float(b[2]),float(b[3])),fraction)
	var heading: float=atan2(float(b[1])-float(a[1]),-(float(b[2])-float(a[2])))
	return {'n':n,'finished':t>=float(s.finishTime),'light':smoothstep(0.0,1.1,t-float(s.lightsTime)),'walk':walk,'walking':walking,'step':sin((t-float(s.residentTime))*PI*3.6) if walking else 0.0,'wave':wave,'actorVisible':t>=float(s.residentTime),'actorPosition':pos,'heading':heading,'zoom':lerpf(float(s.camera.zoom),float(s.camera.finishZoom),smoothstep(0,1.5,t-float(s.finishTime))),'phase':phase}

func prepare() -> bool:
	var start: int=Time.get_ticks_usec()
	spec=VoxelWorld.json_file('res://story/story.json')
	if not spec.has_all(['cells','instances','contextPatch','contextPieces','sourceGridSha256']): return false
	if host.world.grid_hash()!=spec.sourceGridSha256:
		host.set_status('Reset scene before story playback')
		return false
	var w:=VoxelWorld.new()
	w.bundle=host.world.bundle;w.size=host.world.size;w.origin=host.world.origin;w.palette=host.world.palette
	w.grid=host.world.grid.duplicate();w.owner=host.world.owner.duplicate()
	for p in spec.contextPieces: w.pieces.append(p)
	for row in spec.contextPatch:
		w.grid[int(row[0])]=int(row[1]);w.owner[int(row[0])]=int(row[2])
	if w.grid_hash()!=spec.contextGridSha256: return false
	var mesher:=ChunkMesher.new(w)
	for key in host.town.meshes:
		originals[key]=host.town.meshes[key].mesh
		contexts[key]=mesher.build(key)
	material=host.town.material.duplicate()
	var shader:=Shader.new()
	var source: String=host.town.material.shader.code
	source=source.replace('void vertex() {','uniform float story_time=0.0;\nvoid vertex() {\n float age=story_time-INSTANCE_CUSTOM.r;\n float p=clamp(age/.32,0.0,1.0);\n VERTEX.z+=INSTANCE_CUSTOM.b*.60/max(.0001,length(MODEL_MATRIX[2].xyz))*(1.0-p)*(1.0-p);\n if(age<0.0 || story_time>=INSTANCE_CUSTOM.g) VERTEX=vec3(0.0);')
	source=source.replace('base_color=CUSTOM0.rgb;','base_color=COLOR.rgb;').replace('emission_hero=CUSTOM1;','emission_hero=vec4(0.0);')
	shader.code=source;material.shader=shader
	for uniform in host.town.material.shader.get_shader_uniform_list():
		var value: Variant=host.town.material.get_shader_parameter(uniform.name)
		if value!=null: material.set_shader_parameter(uniform.name,value)
	var mm:=MultiMesh.new();mm.transform_format=MultiMesh.TRANSFORM_3D;mm.use_colors=true;mm.use_custom_data=true
	var cube:=BoxMesh.new();cube.size=Vector3.ONE;mm.mesh=cube;mm.instance_count=spec.instances.size()
	mm.custom_aabb=AABB(Vector3(8,3,1),Vector3(8,11,11))
	for i in range(spec.instances.size()):
		var row: Array=spec.instances[i]
		var scale_vec:=Vector3(float(row[3]),float(row[4]),float(row[5]))
		mm.set_instance_transform(i,Transform3D(Basis.from_scale(scale_vec),Vector3(float(row[0]),float(row[1]),float(row[2]))))
		mm.set_instance_color(i,Color(float(row[6]),float(row[7]),float(row[8]),1))
		mm.set_instance_custom_data(i,Color(float(row[9]),float(row[10]),float(row[11]),1))
	instances.multimesh=mm;instances.material_override=material;root.add_child(instances)
	for box in spec.actor.boxes:
		var part:=MeshInstance3D.new();var geo:=BoxMesh.new();geo.size=TownScene.vec(box[2]);part.mesh=geo
		var mat:=StandardMaterial3D.new();mat.albedo_color=Color(box[3]);mat.roughness=1;part.material_override=mat
		part.position=TownScene.vec(box[1]);part.set_meta('base',part.position);actor.add_child(part);parts[box[0]]=part
	root.add_child(actor);host.town.add_child(root);root.visible=false
	var spill:=MeshInstance3D.new();var plane:=QuadMesh.new();plane.size=Vector2(2.1,2.0);spill.mesh=plane;spill.position=Vector3(11.55,5.6,2.407)
	spill.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	spill_material=ShaderMaterial.new();spill_material.shader=Shader.new()
	spill_material.shader.code='shader_type spatial;render_mode unshaded,depth_draw_never,cull_disabled;uniform float power=0.0;void fragment(){vec2 p=UV*2.0-1.0;ALBEDO=vec3(1.0,.367,.059);ALPHA=pow(max(0.0,1.0-dot(p,p)),2.0)*.18*power;}'
	spill.material_override=spill_material;root.add_child(spill)
	for id in ['place','complete','step']:
		var player:=AudioStreamPlayer.new();player.stream=load('res://story/'+id+'.wav');player.max_polyphony=4;root.add_child(player);sounds[id]=player
	prepare_ms=float(Time.get_ticks_usec()-start)/1000.0
	timeline=AnimationPlayer.new();var library:=AnimationLibrary.new();library.add_animation('build',load('res://story/timeline.tres'));timeline.add_animation_library('',library);host.add_child(timeline)
	return true

func play_sound(id: String,gain: float) -> void:
	if muted: return
	var p: AudioStreamPlayer=sounds[id];p.volume_db=linear_to_db(gain);p.play()

func silence() -> void:
	for p in sounds.values(): p.stop()

func start() -> void:
	active=true;playing=true;frames=[];phase_frames={};last_usec=0;complete_played=false;last_pop=-1;last_step=-1
	timeline.play('build')
	root.visible=true;DisplayServer.screen_set_keep_on(true);OS.low_processor_usage_mode=false
	host.continuous=true;host.viewport.render_target_update_mode=SubViewport.UPDATE_ALWAYS
	seek(0.0)
	interrupted=false

func seek(t: float) -> void:
	interrupted=true
	time=clampf(t,0,float(spec.duration));host.story_clock=time;timeline.seek(time,true);last_usec=0;silence();complete_played=time>=float(spec.finishTime);last_pop=int(floor(time*7));update()

func update() -> void:
	var s: Dictionary=state(spec,time)
	material.set_shader_parameter('story_time',time)
	if final_shown!=bool(s.finished):
		for key in host.town.meshes: host.town.meshes[key].mesh=originals[key] if s.finished else contexts[key]
		final_shown=s.finished
	instances.visible=not s.finished;host.town.material.set_shader_parameter('story_light',s.light)
	actor.visible=s.actorVisible;actor.position=s.actorPosition;actor.rotation.z=s.heading
	spill_material.set_shader_parameter('power',s.light)
	for id: String in parts:
		var part: MeshInstance3D=parts[id];part.position=part.get_meta('base');part.rotation=Vector3.ZERO
		var side: float=1.0 if id.ends_with('L') else -1.0
		if id.begins_with('leg') or id.begins_with('shoe'):
			part.position.y+=float(s.step)*.095*side;part.position.z+=maxf(0,float(s.step)*side)*.04
		if id.begins_with('arm') or id.begins_with('hand'):
			var pivot:=Vector3(-.285 if side==1 else .285,0,1.095)
			var rotation_vec:=Vector3(-float(s.step)*.22*side,-2.2*float(s.wave) if side==-1 else 0.0,0)
			part.rotation=rotation_vec
			part.position=Basis.from_euler(rotation_vec,EULER_ORDER_XYZ)*(part.position-pivot)+pivot
	host.town.target=TownScene.vec(spec.camera.target);host.town.zoom=s.zoom;host.town.update_camera()
	host.story_position.set_value_no_signal(time)
	host.set_status('%s / %d of %d' % [s.phase,s.n,spec.cells.size()])
	host.invalidate()

func tick() -> void:
	if not active or not playing: return
	var now: int=Time.get_ticks_usec();var dt: float=float(now-last_usec)/1000.0 if last_usec else 0.0;last_usec=now
	if dt>0:
		frames.append(dt);var phase: String=state(spec,time).phase
		if not phase_frames.has(phase): phase_frames[phase]=[]
		phase_frames[phase].append(dt)
	time=clampf(float(host.story_clock),0,float(spec.duration));update()
	var pop: int=int(floor(time*7))
	if time>=float(spec.buildStart)+float(spec.fallDuration) and time<float(spec.finishTime) and pop!=last_pop:
		play_sound('place',.28);last_pop=pop
	if time>=float(spec.finishTime) and not complete_played:
		play_sound('complete',.65);complete_played=true
	var s: Dictionary=state(spec,time);var step: int=int(floor((time-float(spec.residentTime))*3.6))
	if s.walking and step!=last_step: play_sound('step',.7);last_step=step
	if time>=float(spec.duration):
		playing=false;host.continuous=false;host.invalidate();OS.low_processor_usage_mode=true
		host.bench.report.story={'id':spec.id,'sourceGridSha256':spec.sourceGridSha256,'prepareMs':prepare_ms,'intervalsMs':frames,'phaseIntervalsMs':phase_frames,'finalCells':s.n,'completed':true,'resolution':[host.viewport.size.x,host.viewport.size.y],'mode':'instanced-order-presentation-v1','note':'Preparation outside timed playback. Cached context/full geometry. CPU process cadence, not GPU presentation.'}
		host.bench.report.story.continuousPlayback=not interrupted and frames.reduce(func(a,b): return a+b,0.0)>=31000.0
		host.bench.save();host.story_play.text='Play'

func pause() -> void:
	interrupted=true
	playing=false;last_usec=0;timeline.pause();silence();host.continuous=false;OS.low_processor_usage_mode=true;host.invalidate()

func resume() -> void:
	if time>=float(spec.duration): start();return
	playing=true;last_usec=0;timeline.play();host.continuous=true;OS.low_processor_usage_mode=false;host.invalidate()

func leave() -> void:
	pause();active=false;root.visible=false;host.town.material.set_shader_parameter('story_light',1.0)
	for key in host.town.meshes: host.town.meshes[key].mesh=originals[key]
	final_shown=true;host.town.target=Vector3(8.4,5.9,4.4);host.town.reset_view();DisplayServer.screen_set_keep_on(false);host.invalidate()
