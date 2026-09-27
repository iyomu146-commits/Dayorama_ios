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
	var s: Dictionary=VoxelWorld.json_file('res://story/story.json')
	if not s.has_all(['cells','sourceGridSha256','contextPatch']): return 14
	var context:=VoxelWorld.new();context.grid=w.grid.duplicate()
	for row in s.contextPatch: context.grid[int(row[0])]=int(row[1])
	passed=passed and context.grid_hash()==s.contextGridSha256
	for row in s.cells: context.grid[w.index(int(row[0]),int(row[1]),int(row[2]))]=int(row[3])
	passed=passed and context.grid_hash()==before and int(StoryPlayer.state(s,32.0).n)==40540
	for file in ['place.wav','complete.wav','step.wav','timeline.tres']:
		if not ResourceLoader.exists('res://story/'+file) or load('res://story/'+file)==null: return 15
	var report: Dictionary={'releaseBuild':not OS.is_debug_build(),'passed':passed,'gridSha256':hash,'occupied':occupied,'pieces':w.pieces.size(),'chunks':w.occupied_chunks().size(),'editRestoresGrid':w.grid_hash()==before}
	print('RELEASE_SMOKE '+JSON.stringify(report))
	return 0 if passed else 13
