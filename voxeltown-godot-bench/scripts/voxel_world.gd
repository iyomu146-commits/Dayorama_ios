class_name VoxelWorld
extends RefCounted

const CHUNK: int = 16
const CELL: float = 0.15
var bundle: Dictionary = {}
var size: Vector3i = Vector3i(112,112,96)
var origin: Vector3i = Vector3i(-112,0,-16)
var grid: PackedByteArray
var owner: PackedInt32Array
var pieces: Array[Dictionary] = []
var palette: Dictionary = {}

func index(x: int,y: int,z: int) -> int:
	return x + size.x * (y + size.y * z)
func inside(x: int,y: int,z: int) -> bool:
	return x>=0 and y>=0 and z>=0 and x<size.x and y<size.y and z<size.z
func cell(x: int,y: int,z: int) -> int:
	return grid[index(x,y,z)] if inside(x,y,z) else 0
func cell_owner(x: int,y: int,z: int) -> int:
	return owner[index(x,y,z)] if inside(x,y,z) else 0
func write(p: Vector3i,value: int) -> void:
	assert(inside(p.x,p.y,p.z),'Out of bounds')
	var i: int = index(p.x,p.y,p.z)
	grid[i]=value
	owner[i]=0
static func v3(a: Array) -> Vector3i:
	return Vector3i(int(a[0]),int(a[1]),int(a[2]))
static func json_file(path: String) -> Dictionary:
	var parser := JSON.new()
	# Assertions are omitted in release templates, including their expressions.
	# Parsing is required work, not a debug-only assertion side effect.
	var file: FileAccess=FileAccess.open(path,FileAccess.READ)
	if file==null:
		push_error('Cannot read JSON: '+path)
		return {}
	var error: Error=parser.parse(file.get_as_text())
	if error!=OK or not parser.data is Dictionary:
		push_error('Invalid JSON object: '+path+' '+parser.get_error_message())
		return {}
	return parser.data
static func decode(block: Dictionary) -> PackedByteArray:
	var s: Vector3i=v3(block.size)
	var out := PackedByteArray()
	out.resize(s.x*s.y*s.z)
	if block.encoding=='rows':
		assert(block.rows.size()==s.y*s.z)
		for row in range(block.rows.size()):
			var line: String=block.rows[row]
			if line.is_empty(): continue
			assert(line.length()==s.x*2)
			var bytes: PackedByteArray=line.hex_decode()
			assert(bytes.size()==s.x)
			for x in range(s.x): out[row*s.x+x]=bytes[x]
	elif block.encoding=='rle':
		var pos: int=0
		for token in str(block.rle).split(','):
			var pair: PackedStringArray=token.split('*')
			assert(pair.size()==2)
			var count: int=int(pair[0])
			assert(count>0 and pos+count<=out.size())
			var value: int=pair[1].hex_to_int()
			for i in range(count): out[pos+i]=value
			pos+=count
		assert(pos==out.size())
	else: assert(false,'Unsupported encoding')
	return out
static func rotate_cell(p: Vector3i,r: int) -> Vector3i:
	match r:
		1: return Vector3i(-p.y,p.x,p.z)
		2: return Vector3i(-p.x,-p.y,p.z)
		3: return Vector3i(p.y,-p.x,p.z)
	return p
static func place(p: Vector3i,t: Dictionary,a: Dictionary) -> Vector3i:
	return rotate_cell(p-v3(t.pivot),int(a.get('rot',0)))+v3(a.at)
static func place_box(b: Array,t: Dictionary,a: Dictionary) -> Array:
	var p: Vector3i=place(Vector3i(int(b[0]),int(b[1]),int(b[2])),t,a)
	var q: Vector3i=place(Vector3i(int(b[3])-1,int(b[4])-1,int(b[5])-1),t,a)
	var low: Vector3i=p.min(q)
	var high: Vector3i=p.max(q)+Vector3i.ONE
	return [low.x,low.y,low.z,high.x,high.y,high.z]

func add_piece(b: Array,source: String) -> void:
	var id: int=pieces.size()+1
	var value: int=cell(int(b[0]),int(b[1]),int(b[2]))
	assert(value!=0)
	for z in range(int(b[2]),int(b[5])):
		for y in range(int(b[1]),int(b[4])):
			for x in range(int(b[0]),int(b[3])):
				assert(cell(x,y,z)==value)
				owner[index(x,y,z)]=id
	pieces.append({'id':id,'box':b,'value':value,'source':source,'active':true})

func finalize_pieces() -> void:
	var counts := PackedInt32Array()
	counts.resize(pieces.size()+1)
	for id in owner: counts[id]+=1
	for p in pieces:
		var b: Array=p.box
		p.active=counts[int(p.id)]==int((b[3]-b[0])*(b[4]-b[1])*(b[5]-b[2]))
	for i in range(owner.size()):
		if owner[i]!=0 and not pieces[owner[i]-1].active: owner[i]=0

func apply_diff(diff: Dictionary,t: Dictionary={},a: Dictionary={}) -> void:
	for kind in ['remove','paint','add']:
		for row in diff.get(kind,[]):
			var p: Vector3i=Vector3i(int(row[0]),int(row[1]),int(row[2]))
			if not t.is_empty(): p=place(p,t,a)
			write(p,0 if kind=='remove' else int(row[3]))

func load_data(root: String='res://data') -> bool:
	var manifest: Dictionary=json_file(root+'/manifest.json')
	if not manifest.get('files') is Dictionary: return false
	for path in manifest.files:
		assert(FileAccess.get_sha256(root+'/'+path)==manifest.files[path],'Data hash mismatch: '+path)
	var tile: Dictionary=json_file(root+'/tiles/tile002.json')
	if not tile.has_all(['look','palette','formatVersion','size','originCell','base','placements','zones']): return false
	var look: Dictionary=json_file(root+'/look/'+tile.look+'.json')
	var pal: Dictionary=json_file(root+'/palettes/'+tile.palette+'.json')
	if look.is_empty() or not pal.get('entries') is Array: return false
	assert(tile.formatVersion==1 and look.formatVersion==1 and pal.formatVersion==1 and look.cellHash=='cellhash-v1')
	assert(tile.chunk==16 and is_equal_approx(float(tile.cellSize),0.15))
	bundle={'tile':tile,'look':look,'palette':pal,'templates':{},'manifest':manifest}
	size=v3(tile.size)
	origin=v3(tile.originCell)
	grid.resize(size.x*size.y*size.z)
	owner.resize(grid.size())
	for e in pal.entries: palette[int(e.index)]=e
	for key in tile.base.chunks:
		var coords: PackedStringArray=key.split(',')
		var base: Vector3i=Vector3i(int(coords[0]),int(coords[1]),int(coords[2]))*16
		var block: Dictionary=tile.base.chunks[key]
		assert(v3(block.size)==Vector3i(16,16,16))
		var bytes: PackedByteArray=decode(block)
		for z in range(16):
			for y in range(16):
				for x in range(16):
					var value: int=bytes[x+16*(y+16*z)]
					if value!=0: write(base+Vector3i(x,y,z),value)
	for b in tile.base.pieces: add_piece(b,'base')
	for a in tile.placements:
		var t: Dictionary=json_file(root+'/templates/'+a.template+'.json')
		if not t.has_all(['formatVersion','palette','voxels','pivot','pieces']): return false
		assert(t.formatVersion==1 and t.palette==tile.palette)
		bundle.templates[a.template]=t
		var s: Vector3i=v3(t.voxels.size)
		var bytes: PackedByteArray=decode(t.voxels)
		var n: int=0
		for z in range(s.z):
			for y in range(s.y):
				for x in range(s.x):
					var value: int=bytes[x+s.x*(y+s.y*z)]
					if value:
						n+=1
						write(place(Vector3i(x,y,z),t,a),value)
		assert(a.get('progress')==null or int(a.progress)==n,'Completed placements only. No order playback.')
		for b in t.pieces: add_piece(place_box(b,t,a),a.id)
		apply_diff(a.get('diff',{}),t,a)
	for zone in tile.zones:
		for kind in ['remove','paint','add']:
			for row in zone.diff.get(kind,[]):
				for k in range(3): assert(row[k]>=zone.min[k] and row[k]<zone.max[k])
		apply_diff(zone.diff)
	finalize_pieces()
	for value in grid: assert(value==0 or palette.has(value),'Undefined palette')
	return true

func occupied_chunks() -> Array[Vector3i]:
	var keys: Dictionary={}
	for z in range(size.z):
		for y in range(size.y):
			for x in range(size.x):
				if grid[index(x,y,z)]: keys[Vector3i(x>>4,y>>4,z>>4)]=true
	var out: Array[Vector3i]=[]
	for key in keys: out.append(key)
	return out

func mark_neighbours(p: Vector3i,dirty: Dictionary) -> void:
	for dz in range(-1,2):
		for dy in range(-1,2):
			for dx in range(-1,2):
				var q: Vector3i=p+Vector3i(dx,dy,dz)
				if inside(q.x,q.y,q.z): dirty[Vector3i(q.x>>4,q.y>>4,q.z>>4)]=true

func edit(p: Vector3i,value: int) -> Dictionary:
	assert(inside(p.x,p.y,p.z))
	assert(value==0 or palette.has(value))
	var i: int=index(p.x,p.y,p.z)
	var before: int=grid[i]
	assert(before!=value,'No change')
	var id: int=owner[i]
	var dirty: Dictionary={}
	if id:
		var piece: Dictionary=pieces[id-1]
		piece.active=false
		var b: Array=piece.box
		for z in range(int(b[2]),int(b[5])):
			for y in range(int(b[1]),int(b[4])):
				for x in range(int(b[0]),int(b[3])):
					if cell_owner(x,y,z)==id: owner[index(x,y,z)]=0
					mark_neighbours(Vector3i(x,y,z),dirty)
	write(p,value)
	mark_neighbours(p,dirty)
	return {'chunks':dirty.keys(),'before':before,'brokenPiece':id if id else null}

func grid_hash() -> String:
	var h := HashingContext.new()
	h.start(HashingContext.HASH_SHA256)
	h.update(grid)
	return h.finish().hex_encode()
