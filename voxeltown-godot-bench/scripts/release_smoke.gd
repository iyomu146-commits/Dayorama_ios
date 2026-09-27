class_name ReleaseSmoke
extends RefCounted

# Run from the actual release template, not the editor. Deliberately no assert().
static func run() -> int:
	if OS.is_debug_build():
		push_error('Release smoke requires a release template')
		return 10
	var w:=VoxelWorld.new()
	if not w.load_data():
		push_error('RELEASE_SMOKE_FAILED: data load')
		return 11
	var hash: String=w.grid_hash()
	var occupied: int=0
	for value in w.grid:
		if value!=0: occupied+=1
	var passed: bool=hash=='e536436480cda21dfc13c6ac196ad1ab98ee554c6491dee41fb55ed87138916f' and occupied==208359 and w.pieces.size()==650 and w.occupied_chunks().size()==115
	var before: String=hash
	var cell:=Vector3i(20,18,60)
	var value: int=w.cell(cell.x,cell.y,cell.z-1)
	if value==0 or w.cell(cell.x,cell.y,cell.z)!=0: return 12
	var add: Dictionary=w.edit(cell,value)
	var remove: Dictionary=w.edit(cell,0)
	passed=passed and w.grid_hash()==before and add.chunks.size()==1 and remove.chunks.size()==1
	var report: Dictionary={'releaseBuild':not OS.is_debug_build(),'passed':passed,'gridSha256':hash,'occupied':occupied,'pieces':w.pieces.size(),'chunks':w.occupied_chunks().size(),'editRestoresGrid':w.grid_hash()==before}
	print('RELEASE_SMOKE '+JSON.stringify(report))
	return 0 if passed else 13
