class_name TownScene
extends Node3D

var world: VoxelWorld
var mesher: ChunkMesher
var meshes: Dictionary={}
var camera: Camera3D
var sun: DirectionalLight3D
var material: ShaderMaterial
var cloud_material: ShaderMaterial
var target:=Vector3(8.4,5.9,4.4)
var yaw: float=atan2(-32.0,24.0)
var elevation: float=atan2(28.284,40.0)
var zoom: float=1.0
var render_count: int=0
var resolution:=Vector2i(1280,672)

func setup(w: VoxelWorld) -> void:
	world=w
	mesher=ChunkMesher.new(w)
	material=ShaderMaterial.new()
	material.shader=load('res://scripts/town.gdshader')
	var grade: Dictionary=world.bundle.look.grade
	for k in ['gain','lift','gamma']:
		material.set_shader_parameter('grade_gamma' if k=='gamma' else k,vec(grade[k]))
	material.set_shader_parameter('sky_top',Vector3(Color('#c3bacf').srgb_to_linear().r,Color('#c3bacf').srgb_to_linear().g,Color('#c3bacf').srgb_to_linear().b))
	var bottom: Color=Color('#674c64').srgb_to_linear()
	material.set_shader_parameter('sky_bottom',Vector3(bottom.r,bottom.g,bottom.b))
	material.set_shader_parameter('exposure',pow(2.0,float(grade.exposure))*2.0)
	material.set_shader_parameter('white_point',float(grade.white))
	material.set_shader_parameter('saturation',float(grade.saturation))
	material.set_shader_parameter('sky_power',float(world.bundle.look.sky.strength))
	material.set_shader_parameter('sun_color',vec(world.bundle.look.sun.color))
	material.set_shader_parameter('sun_power',float(world.bundle.look.sun.power)*float(world.bundle.look.lightClasses.sun))
	var env:=WorldEnvironment.new()
	env.environment=Environment.new()
	env.environment.background_mode=Environment.BG_COLOR
	env.environment.background_color=Color(0,0,0,0)
	env.environment.ambient_light_source=Environment.AMBIENT_SOURCE_DISABLED
	env.environment.tonemap_mode=Environment.TONE_MAPPER_LINEAR
	add_child(env)
	sun=DirectionalLight3D.new()
	sun.light_color=Color(1,.8,.6)
	sun.light_energy=3.52
	sun.shadow_enabled=true
	sun.directional_shadow_mode=DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance=70
	sun.shadow_bias=.1
	sun.shadow_normal_bias=1.0
	add_child(sun)
	sun.position=Vector3(8.4,6,4)-vec(world.bundle.look.sun.dir)*32.0
	sun.look_at(Vector3(8.4,6,4),Vector3(0,0,1))
	for key in world.occupied_chunks(): rebuild(key)
	add_wires()
	add_clouds()
	camera=Camera3D.new()
	camera.projection=Camera3D.PROJECTION_ORTHOGONAL
	camera.keep_aspect=Camera3D.KEEP_HEIGHT
	camera.near=.1
	camera.far=160
	add_child(camera)
	camera.current=true
	reset_view()

static func vec(a: Array) -> Vector3:
	return Vector3(float(a[0]),float(a[1]),float(a[2]))

func reset_view() -> void:
	yaw=atan2(-32.0,24.0)
	elevation=atan2(28.284,40.0)
	zoom=1.0
	update_camera()

func update_camera() -> void:
	var radius: float=sqrt(40.0*40.0+28.284*28.284)
	camera.position=target+Vector3(cos(yaw)*cos(elevation),sin(yaw)*cos(elevation),sin(elevation))*radius
	camera.look_at(target,Vector3(0,0,1))
	camera.size=18.0/zoom

func resize(buffer_size: Vector2i) -> void:
	resolution=buffer_size
	if cloud_material: cloud_material.set_shader_parameter('aspect',float(buffer_size.x)/buffer_size.y)

func rebuild(key: Vector3i) -> void:
	var geo: ArrayMesh=mesher.build(key)
	if meshes.has(key): meshes[key].mesh=geo
	else:
		var instance:=MeshInstance3D.new()
		instance.mesh=geo
		instance.material_override=material
		add_child(instance)
		meshes[key]=instance

func apply_edit(p: Vector3i,value: int) -> Dictionary:
	var start: int=Time.get_ticks_usec()
	var result: Dictionary=world.edit(p,value)
	var build_start: int=Time.get_ticks_usec()
	for key in result.chunks: rebuild(key)
	var end: int=Time.get_ticks_usec()
	return {'operation':'add' if value else 'remove','cell':[p.x,p.y,p.z],'value':value,'before':result.before,'chunks':result.chunks.map(func(k): return [k.x,k.y,k.z]),'brokenPiece':result.brokenPiece,'meshMs':float(end-build_start)/1000.0,'totalMs':float(end-start)/1000.0}

func pick(pixel: Vector2,adding: bool) -> Variant:
	# Grid DDA, with exact inset AABB intersections for declared finish pieces.
	var ro: Vector3=camera.project_ray_origin(pixel)/.15
	var rd: Vector3=camera.project_ray_normal(pixel)
	var nearest: float=INF
	var hit: Variant=null
	var seen: Dictionary={}
	var enter: float=0.0
	var leave: float=1000.0
	for k in range(3):
		if absf(rd[k])<.000001:
			if ro[k]<0 or ro[k]>=world.size[k]: return null
		else:
			var t1: float=-ro[k]/rd[k]
			var t2: float=(world.size[k]-ro[k])/rd[k]
			enter=maxf(enter,minf(t1,t2)); leave=minf(leave,maxf(t1,t2))
	if enter>leave: return null
	var p:=Vector3i((ro+rd*(enter+.00001)).floor())
	var step:=Vector3i(signi(int(signf(rd.x))),signi(int(signf(rd.y))),signi(int(signf(rd.z))))
	for iteration in range(500):
		if not world.inside(p.x,p.y,p.z): break
		var id: int=world.cell_owner(p.x,p.y,p.z)
		if world.cell(p.x,p.y,p.z) and (id==0 or not seen.has(id)):
			var low:=Vector3(p)
			var high:=low+Vector3.ONE
			if id:
				seen[id]=true
				var piece: Dictionary=world.pieces[id-1]
				var gap: float=mesher.paints[int(piece.value)].gap
				low=Vector3(piece.box[0],piece.box[1],piece.box[2])+Vector3.ONE*gap
				high=Vector3(piece.box[3],piece.box[4],piece.box[5])-Vector3.ONE*gap
			var near_t: float=-INF
			var far_t: float=INF
			var normal:=Vector3.ZERO
			for k in range(3):
				if absf(rd[k])<.000001:
					if ro[k]<low[k] or ro[k]>high[k]: far_t=-INF
					continue
				var a: float=(low[k]-ro[k])/rd[k]
				var b: float=(high[k]-ro[k])/rd[k]
				if minf(a,b)>near_t:
					near_t=minf(a,b); normal=Vector3.ZERO; normal[k]=-signf(rd[k])
				far_t=minf(far_t,maxf(a,b))
			if near_t>=0 and near_t<=far_t and near_t<nearest:
				nearest=near_t
				hit=Vector3i((ro+rd*near_t-normal*.001).floor())+(Vector3i(normal) if adding else Vector3i.ZERO)
		var next_t:=Vector3(INF,INF,INF)
		for k in range(3):
			if step[k]: next_t[k]=(float(p[k]+(1 if step[k]>0 else 0))-ro[k])/rd[k]
		var axis: int=0 if next_t.x<next_t.y else 1
		if next_t.z<next_t[axis]: axis=2
		if next_t[axis]>nearest: break
		p[axis]+=step[axis]
	return hit if hit!=null and world.inside(hit.x,hit.y,hit.z) else null

func add_wires() -> void:
	var st:=SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for w in world.bundle.tile.wires:
		var a: Vector3=vec(w.a)
		var b: Vector3=vec(w.b)
		var rings: Array=[]
		for i in range(40):
			var t: float=float(i)/39.0
			var centre: Vector3=a.lerp(b,t)-Vector3(0,0,4.0*float(w.sag)*t*(1.0-t))
			var direction: Vector3=(b-a-Vector3(0,0,4.0*float(w.sag)*(1.0-2.0*t))).normalized()
			var n: Vector3=direction.cross(Vector3(0,0,1)).normalized()
			var cross_n: Vector3=direction.cross(n).normalized()
			var ring: Array=[]
			for j in range(4): ring.append(centre+(n*cos(TAU*j/4.0)+cross_n*sin(TAU*j/4.0))*float(w.radius))
			rings.append(ring)
		for i in range(39):
			for j in range(4):
				var k: int=(j+1)%4
				for point in [rings[i][j],rings[i+1][k],rings[i+1][j],rings[i][j],rings[i][k],rings[i+1][k]]: st.add_vertex(point)
	st.generate_normals()
	var instance:=MeshInstance3D.new()
	instance.mesh=st.commit()
	var m:=StandardMaterial3D.new()
	m.albedo_color=Color('#211a29')
	m.roughness=1.0
	m.cull_mode=BaseMaterial3D.CULL_DISABLED
	instance.material_override=m
	add_child(instance)

func add_clouds() -> void:
	var st:=SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var entry: Dictionary={}
	for e in world.palette.values():
		if e.surface=='cloud': entry=e
	var i: int=0
	for cloud in world.bundle.tile.clouds:
		var low: Vector3=vec(cloud.min)
		var high: Vector3=vec(cloud.max)
		var c: Color=Color(entry.hex).srgb_to_linear()*(.9+.12*CellHash.u01(i,0,0,2))
		st.set_color(c.linear_to_srgb())
		for face in ChunkMesher.CORNERS:
			for k in [0,2,1,0,3,2]:
				var q: Vector3i=face[k]
				st.add_vertex(Vector3(high.x if q.x else low.x,high.y if q.y else low.y,high.z if q.z else low.z))
		i+=1
	var instance:=MeshInstance3D.new()
	instance.mesh=st.commit()
	instance.custom_aabb=AABB(Vector3(-500,-500,-500),Vector3(1000,1000,1000))
	instance.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	cloud_material=ShaderMaterial.new()
	cloud_material.shader=load('res://scripts/cloud.gdshader')
	var view: Dictionary=world.bundle.tile.views[0]
	for name in ['position','forward','up']: cloud_material.set_shader_parameter('source_'+name,vec(view[name]))
	cloud_material.set_shader_parameter('source_shift',Vector2(float(view.shift[0]),float(view.shift[1])))
	cloud_material.set_shader_parameter('tan_half_fov',float(view.sensorWidthMm)/(2.0*float(view.lensMm)))
	instance.material_override=cloud_material
	add_child(instance)

func stats() -> Dictionary:
	return {'baseChunks':world.bundle.tile.base.chunks.size(),'resolvedChunks':meshes.size(),'renderCount':render_count,'resolution':[resolution.x,resolution.y],'camera':{'yaw':yaw,'elevation':elevation,'zoom':zoom},'gridSha256':world.grid_hash(),'baselineVoxelTriangles':105456,'wireTriangles':2808,'cloudTriangles':240,'liveObjects':Performance.get_monitor(Performance.OBJECT_COUNT),'renderDrawCalls':get_viewport().get_render_info(Viewport.RENDER_INFO_TYPE_VISIBLE,Viewport.RENDER_INFO_DRAW_CALLS_IN_FRAME),'engine':'Godot '+Engine.get_version_info().string,'renderer':RenderingServer.get_current_rendering_method(),'gpu':RenderingServer.get_video_adapter_name()}
