class_name ChunkMesher
extends RefCounted

const CELL: float=0.15
const NORMALS: Array[Vector3i]=[Vector3i(1,0,0),Vector3i(-1,0,0),Vector3i(0,1,0),Vector3i(0,-1,0),Vector3i(0,0,1),Vector3i(0,0,-1)]
const AXES: Array[int]=[0,0,1,1,2,2]
const CORNERS: Array=[
	[Vector3i(1,0,0),Vector3i(1,1,0),Vector3i(1,1,1),Vector3i(1,0,1)],
	[Vector3i(0,0,0),Vector3i(0,0,1),Vector3i(0,1,1),Vector3i(0,1,0)],
	[Vector3i(0,1,0),Vector3i(0,1,1),Vector3i(1,1,1),Vector3i(1,1,0)],
	[Vector3i(0,0,0),Vector3i(1,0,0),Vector3i(1,0,1),Vector3i(0,0,1)],
	[Vector3i(0,0,1),Vector3i(1,0,1),Vector3i(1,1,1),Vector3i(0,1,1)],
	[Vector3i(0,0,0),Vector3i(0,1,0),Vector3i(1,1,0),Vector3i(1,0,0)]
]
var world: VoxelWorld
var paints: Dictionary={}
var vertices: PackedVector3Array
var normals: PackedVector3Array
var colors: PackedColorArray
var custom_color: PackedFloat32Array
var custom_emit: PackedFloat32Array
var indices: PackedInt32Array

func _init(w: VoxelWorld) -> void:
	world=w
	for e in world.palette.values():
		var surface: Dictionary=world.bundle.look.surfaces[e.surface]
		var c: Color=Color(e.hex).srgb_to_linear()
		if e.role=='plant': c*=0.82
		if e.role in ['ground','road','sidewalk']: c*=0.88
		var emission: Color=Color(surface.get('emissionHex',e.hex)).srgb_to_linear()*float(surface.get('emission',0))*float(e.get('emitScale',1))
		paints[int(e.index)]={'color':c,'emission':emission,'hero':1.0 if e.surface in ['glass','glass_lattice','curtain','vend_display','vend_panel'] else 0.0,'jitter':float(surface.get('jitter',0)),'gap':float(surface.get('joint',world.bundle.look.jointDefault))/CELL}

static func vertex_ao(w: VoxelWorld,p: Vector3i,n: Vector3i,corner: Vector3i) -> float:
	var axes: Array[int]=[]
	for k in range(3):
		if n[k]==0: axes.append(k)
	var outside: Vector3i=p+n
	var occupied: int=0
	for mask in range(4):
		var q: Vector3i=outside
		for k in range(2):
			if mask & (1<<k): q[axes[k]]+=-1 if corner[axes[k]]==0 else 1
		if w.cell(q.x,q.y,q.z): occupied+=1
	return 1.0-0.58*float(occupied)/4.0

func quad(points: Array,n: Vector3,paint: Dictionary,jitter: float,ao: Array) -> void:
	var v: int=vertices.size()
	var base: Color=paint.color
	var emit: Color=paint.emission
	for k in range(4):
		vertices.append(points[k]*CELL)
		normals.append(n)
		var c: Color=base*(jitter*float(ao[k]))
		colors.append(Color(c.r,c.g,c.b,1))
		# COLOR is 8-bit in Godot. Float custom attributes retain the reference vertex colors.
		custom_color.append_array(PackedFloat32Array([c.r,c.g,c.b,1]))
		custom_emit.append_array(PackedFloat32Array([emit.r,emit.g,emit.b,paint.hero]))
	# Godot uses clockwise front faces, the opposite winding from Three.js.
	if ao[0]+ao[2]>ao[1]+ao[3]: indices.append_array(PackedInt32Array([v,v+3,v+1,v+1,v+3,v+2]))
	else: indices.append_array(PackedInt32Array([v,v+2,v+1,v,v+3,v+2]))

func build(key: Vector3i) -> ArrayMesh:
	vertices=PackedVector3Array()
	normals=PackedVector3Array()
	colors=PackedColorArray()
	custom_color=PackedFloat32Array()
	custom_emit=PackedFloat32Array()
	indices=PackedInt32Array()
	var lo: Vector3i=key*16
	var hi: Vector3i=lo+Vector3i(16,16,16)
	for z in range(lo.z,hi.z):
		for y in range(lo.y,hi.y):
			for x in range(lo.x,hi.x):
				var value: int=world.cell(x,y,z)
				if not value or world.cell_owner(x,y,z): continue
				var p: Vector3i=Vector3i(x,y,z)
				var global: Vector3i=p+world.origin
				var paint: Dictionary=paints[value]
				var jitter: float=1.0+float(paint.jitter)*(2.0*CellHash.u01(global.x,global.y,global.z)-1.0)
				for f in range(6):
					var n: Vector3i=NORMALS[f]
					var next: Vector3i=p+n
					if world.cell(next.x,next.y,next.z) and not world.cell_owner(next.x,next.y,next.z): continue
					var pts: Array=[]
					var ao: Array=[]
					for q in CORNERS[f]:
						pts.append(Vector3(p+q))
						ao.append(vertex_ao(world,p,n,q))
					quad(pts,Vector3(n),paint,jitter,ao)
	for piece in world.pieces:
		if not piece.active: continue
		var b: Array=piece.box
		var bottom: Vector3=Vector3(float(b[0]),float(b[1]),float(b[2]))
		var top: Vector3=Vector3(float(b[3]),float(b[4]),float(b[5]))
		if bottom.x>=hi.x or bottom.y>=hi.y or bottom.z>=hi.z or top.x<=lo.x or top.y<=lo.y or top.z<=lo.z: continue
		var paint: Dictionary=paints[int(piece.value)]
		var low: Vector3=bottom+Vector3.ONE*float(paint.gap)
		var high: Vector3=top-Vector3.ONE*float(paint.gap)
		var global: Vector3i=Vector3i(bottom)+world.origin
		var jitter: float=1.0+float(paint.jitter)*(2.0*CellHash.u01(global.x,global.y,global.z,1)-1.0)
		for f in range(6):
			var a: int=AXES[f]
			var n: Vector3i=NORMALS[f]
			var plane: float=high[a] if n[a]>0 else low[a]
			if plane<float(lo[a]) or plane>float(hi[a]): continue
			var clipped_low: Vector3=low.max(Vector3(lo))
			var clipped_high: Vector3=high.min(Vector3(hi))
			clipped_low[a]=plane
			clipped_high[a]=plane
			var invalid: bool=false
			for k in range(3):
				if k!=a and clipped_low[k]>=clipped_high[k]: invalid=true
			if invalid: continue
			var pts: Array=[]
			var ao: Array=[]
			for q in CORNERS[f]:
				var point: Vector3=Vector3(clipped_high.x if q.x else clipped_low.x,clipped_high.y if q.y else clipped_low.y,clipped_high.z if q.z else clipped_low.z)
				pts.append(point)
				var p: Vector3i=Vector3i(point.floor().max(bottom).min(top-Vector3.ONE))
				ao.append(vertex_ao(world,p,n,q))
			quad(pts,Vector3(n),paint,jitter,ao)
	var mesh := ArrayMesh.new()
	if vertices.is_empty(): return mesh
	var arrays: Array=[]
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX]=vertices
	arrays[Mesh.ARRAY_NORMAL]=normals
	arrays[Mesh.ARRAY_COLOR]=colors
	arrays[Mesh.ARRAY_CUSTOM0]=custom_color
	arrays[Mesh.ARRAY_CUSTOM1]=custom_emit
	arrays[Mesh.ARRAY_INDEX]=indices
	var flags: int=(Mesh.ARRAY_CUSTOM_RGBA_FLOAT<<Mesh.ARRAY_FORMAT_CUSTOM0_SHIFT)|(Mesh.ARRAY_CUSTOM_RGBA_FLOAT<<Mesh.ARRAY_FORMAT_CUSTOM1_SHIFT)
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES,arrays,[],{},flags)
	return mesh
