extends SceneTree

func _initialize() -> void:
	var started: int=Time.get_ticks_msec()
	var oracle: Dictionary=VoxelWorld.json_file('res://tests/python-reference.json')
	for p in oracle.hashes:
		assert(CellHash.h32(int(p[0]),int(p[1]),int(p[2]),int(p[3]))==int(p[4]),str(p))
		# Godot JSON's decimal parser rounds some doubles; the integer oracle is exact.
		assert(CellHash.u01(int(p[0]),int(p[1]),int(p[2]),int(p[3]))==float(int(p[4]))/4294967296.0,str(p))
		assert(absf(float(p[5])-float(int(p[4]))/4294967296.0)<1e-12,str(p))
	var w := VoxelWorld.new()
	w.load_data()
	assert(w.grid_hash()==oracle.gridSha256)
	var count: int=0
	for value in w.grid:
		if value: count+=1
	assert(count==int(oracle.occupied))
	var actual: Array=[]
	for p in w.pieces:
		if p.active: actual.append({'value':p.value,'box':p.box,'source':p.source})
	assert(actual.size()==oracle.pieces.size())
	for i in range(actual.size()):
		assert(actual[i].value==oracle.pieces[i].value)
		for k in range(6): assert(int(actual[i].box[k])==int(oracle.pieces[i].box[k]))
		assert(actual[i].source==oracle.pieces[i].source)
	var keys: Array[Vector3i]=w.occupied_chunks()
	assert(keys.size()==115)
	var mesher := ChunkMesher.new(w)
	var vertices: int=0
	var triangles: int=0
	for key in keys:
		mesher.build(key)
		# Headless's dummy RenderingServer does not expose GPU surface lengths.
		vertices+=mesher.vertices.size()
		triangles+=mesher.indices.size()/3
	assert(triangles==105456,'Voxel triangles differ from the Three.js baseline')
	var test_edit: Vector3i=Vector3i.ZERO
	for z in range(w.size.z-2,0,-1):
		if test_edit!=Vector3i.ZERO: break
		for y in range(2,w.size.y-2):
			if test_edit!=Vector3i.ZERO: break
			for x in range(2,w.size.x-2):
				if (x&15)<2 or (x&15)>12 or (y&15)<2 or (y&15)>12 or (z&15)<2 or (z&15)>12: continue
				if w.cell(x,y,z) and not w.cell_owner(x,y,z) and not w.cell(x,y,z+1):
					test_edit=Vector3i(x,y,z+1)
					break
	var original: String=w.grid_hash()
	var value: int=w.cell(test_edit.x,test_edit.y,test_edit.z-1)
	for i in range(10):
		assert(w.edit(test_edit,value).chunks.size()==1)
		assert(w.edit(test_edit,0).chunks.size()==1)
	assert(w.grid_hash()==original)
	var fixture:=VoxelWorld.new()
	fixture.size=Vector3i(32,32,32)
	fixture.grid.resize(32768); fixture.owner.resize(32768)
	fixture.palette=w.palette; fixture.bundle=w.bundle
	fixture.write(Vector3i(3,3,3),1)
	var fixture_mesher:=ChunkMesher.new(fixture)
	fixture_mesher.build(Vector3i.ZERO)
	assert(fixture_mesher.indices.size()==36,'Single cell has six faces')
	fixture.write(Vector3i(4,3,3),1)
	fixture_mesher.build(Vector3i.ZERO)
	assert(fixture_mesher.indices.size()==60,'Shared faces must be removed')
	assert(fixture.edit(Vector3i(15,15,15),1).chunks.size()==8,'AO corner invalidates eight chunks')
	for p in [Vector3i(3,3,4),Vector3i(4,3,4),Vector3i(3,4,4),Vector3i(4,4,4)]: fixture.write(p,1)
	assert(is_equal_approx(ChunkMesher.vertex_ao(fixture,Vector3i(3,3,3),Vector3i(0,0,1),Vector3i.ONE),.42),'Four AO samples')
	fixture.write(Vector3i(15,7,7),1); fixture.write(Vector3i(16,7,7),1)
	fixture.add_piece([15,7,7,17,8,8],'test')
	var broken: Dictionary=fixture.edit(Vector3i(15,7,7),0)
	assert(broken.brokenPiece==1 and broken.chunks.size()==2)
	assert(fixture.cell_owner(16,7,7)==0 and fixture.cell(16,7,7)==1,'Break piece without deleting surviving cell')
	var result: Dictionary={'passed':true,'hashVectors':oracle.hashes.size(),'gridSha256':original,'occupied':count,'pieces':actual.size(),'chunks':keys.size(),'vertices':vertices,'voxelTriangles':triangles,'editCell':[test_edit.x,test_edit.y,test_edit.z],'editRestoresGrid':true,'elapsedMs':Time.get_ticks_msec()-started,'source':'headless functional QA, not physical benchmark'}
	result.structuralChecks=['one-cell-6-faces','shared-face-culled','corner-8-chunks','four-sample-AO','piece-fragment-invalidation']
	FileAccess.open('res://reports/parity.json',FileAccess.WRITE).store_string(JSON.stringify(result,'  '))
	print(JSON.stringify(result))
	quit(0)
