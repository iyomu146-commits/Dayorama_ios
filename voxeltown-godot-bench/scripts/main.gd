extends Control

var world: VoxelWorld
var town: TownScene
var bench: Benchmark
var viewport: SubViewport
var stage: TextureRect
var status: Label
var mode: String='view'
var palette_select: OptionButton
var continuous: bool=false
var draw_requested: bool=false
var pointers: Dictionary={}
var down_position:=Vector2.ZERO
var down_time: int=0
var moved: float=0
var multitouch: bool=false
var boot: int=Time.get_ticks_usec()
var qa_mode: bool=false
var fixed_buffer:=Vector2i.ZERO
var buffer_popup: ConfirmationDialog

func _ready() -> void:
	if '--release-smoke' in OS.get_cmdline_user_args():
		get_tree().quit(ReleaseSmoke.run())
		return
	qa_mode='--qa' in OS.get_cmdline_user_args()
	if OS.has_feature('android'):
		var density: float=maxf(1.0,float(DisplayServer.screen_get_dpi())/160.0)
		get_window().content_scale_size=Vector2i(Vector2(DisplayServer.window_get_size())/density)
	if OS.has_feature('ios'):
		fixed_buffer=Vector2i(1280,720)
		get_window().content_scale_size=Vector2i(1000,int(1000.0*DisplayServer.window_get_size().y/DisplayServer.window_get_size().x))
	Engine.max_fps=60
	Input.use_accumulated_input=false
	OS.low_processor_usage_mode=true
	OS.low_processor_usage_mode_sleep_usec=10000
	var bg:=ColorRect.new()
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	var back:=ShaderMaterial.new(); back.shader=load('res://scripts/backdrop.gdshader'); bg.material=back
	var box:=VBoxContainer.new()
	box.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	box.add_theme_constant_override('separation',0)
	add_child(box)
	var header:=HBoxContainer.new()
	header.custom_minimum_size.y=46
	box.add_child(header)
	var title:=Label.new(); title.text='  TILE002 / GODOT'; title.size_flags_horizontal=Control.SIZE_EXPAND_FILL; header.add_child(title)
	button(header,'View',func(): mode='view'; set_status('Drag to orbit; pinch to zoom'))
	button(header,'Add',func(): mode='add'; set_status('Tap a face to add one cell'))
	button(header,'Remove',func(): mode='remove'; set_status('Tap a cell to remove'))
	button(header,'Camera',func(): town.reset_view(); invalidate())
	palette_select=OptionButton.new(); header.add_child(palette_select)
	stage=TextureRect.new(); stage.expand_mode=TextureRect.EXPAND_IGNORE_SIZE; stage.stretch_mode=TextureRect.STRETCH_SCALE; stage.size_flags_vertical=Control.SIZE_EXPAND_FILL
	if OS.has_feature('ios'): stage.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	var composite:=ShaderMaterial.new(); composite.shader=Shader.new()
	composite.shader.code='shader_type canvas_item; render_mode blend_premul_alpha; void fragment() { COLOR=texture(TEXTURE,UV); }'
	stage.material=composite
	stage.mouse_filter=Control.MOUSE_FILTER_STOP
	box.add_child(stage)
	viewport=SubViewport.new(); viewport.transparent_bg=true; viewport.own_world_3d=true; viewport.msaa_3d=Viewport.MSAA_4X
	viewport.render_target_update_mode=SubViewport.UPDATE_DISABLED
	add_child(viewport); stage.texture=viewport.get_texture()
	var footer:=VBoxContainer.new(); footer.custom_minimum_size.y=82; box.add_child(footer)
	var bar:=HBoxContainer.new(); footer.add_child(bar)
	button(bar,'FPS 3 x 30s',func(): bench.fps())
	button(bar,'Edit 10 + 10',func(): bench.edit_test())
	button(bar,'Idle 10 min',func(): bench.idle())
	button(bar,'Save JSON',func(): bench.save(); set_status('Saved: user://bench-report.json'))
	button(bar,'Stop',func(): bench.cancelled=true)
	button(bar,'Buffer',buffer_dialog)
	status=Label.new(); status.text='Loading canonical tile002…'; footer.add_child(status)
	await get_tree().process_frame
	world=VoxelWorld.new()
	if not world.load_data():
		set_status('Data load failed; see application log')
		return
	for e in world.palette.values():
		if int(e.index)>0: palette_select.add_item(str(e.name),int(e.index))
	town=TownScene.new(); viewport.add_child(town); town.setup(world)
	bench=Benchmark.new(self)
	stage.resized.connect(resize_stage)
	stage.gui_input.connect(stage_input)
	RenderingServer.frame_post_draw.connect(post_draw)
	resize_stage()
	set_status('208,359 cells / 115 resolved chunks / 15 cm — drag or pinch')
	invalidate()
	await RenderingServer.frame_post_draw
	bench.report.startup={'readyFromScriptMs':float(Time.get_ticks_usec()-boot)/1000.0,'scope':'from main script construction to first submitted scene; adb launch separately','initialMemory':NativeMetrics.snapshot()}
	bench.save()
	if qa_mode: run_qa()
	if '--bench-fps-edits' in OS.get_cmdline_user_args():
		await get_tree().create_timer(3).timeout
		await bench.fps()
		await bench.edit_test()

func button(parent: Node,label: String,action: Callable) -> void:
	var b:=Button.new(); b.text=label; b.custom_minimum_size.y=38
	b.pressed.connect(func():
		if not town or (bench and bench.active and label!='Stop'): return
		action.call())
	parent.add_child(b)

func buffer_dialog() -> void:
	if bench.active: return
	var popup:=ConfirmationDialog.new()
	buffer_popup=popup
	pointers.clear()
	popup.title='Match the Three.js render buffer'
	var inputs:=HBoxContainer.new(); popup.add_child(inputs)
	var width:=SpinBox.new(); width.min_value=320; width.max_value=1280; width.value=viewport.size.x; inputs.add_child(width)
	var height:=SpinBox.new(); height.min_value=160; height.max_value=1280; height.value=viewport.size.y; inputs.add_child(height)
	popup.confirmed.connect(func():
		fixed_buffer=Vector2i(int(width.value),int(height.value))
		viewport.size=fixed_buffer; town.resize(viewport.size)
		stage.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		set_status('Buffer: %d x %d' % [viewport.size.x,viewport.size.y]); invalidate(); popup.queue_free())
	popup.canceled.connect(popup.queue_free)
	add_child(popup); popup.popup_centered(Vector2i(400,150))

func set_status(text: String) -> void:
	status.text='  '+text

func resize_stage() -> void:
	if not town or stage.size.y<=0: return
	var native_scale: float=get_viewport().get_screen_transform().get_scale().x
	var ratio: float=minf(native_scale,1280.0/maxf(stage.size.x,stage.size.y))
	var wanted: Vector2i=fixed_buffer if fixed_buffer!=Vector2i.ZERO else Vector2i(maxi(1,int(stage.size.x*ratio)),maxi(1,int(stage.size.y*ratio)))
	if viewport.size==wanted: return
	viewport.size=wanted
	town.resize(viewport.size)
	invalidate()

func invalidate() -> void:
	if not viewport: return
	draw_requested=true
	viewport.render_target_update_mode=SubViewport.UPDATE_ALWAYS if continuous else SubViewport.UPDATE_ONCE

func post_draw() -> void:
	if town and (draw_requested or continuous):
		town.render_count+=1
		draw_requested=false

func stage_input(event: InputEvent) -> void:
	if not town or qa_mode or (bench and bench.active): return
	# Scene touches are handled once in _input; keep emulation for native UI.
	if event is InputEventMouse and event.device==-1: return
	if event is InputEventMouseButton:
		if event.button_index==MOUSE_BUTTON_LEFT:
			if event.pressed: pointer_down(0,event.position)
			else: pointer_up(0,event.position)
		elif event.pressed and event.button_index in [MOUSE_BUTTON_WHEEL_UP,MOUSE_BUTTON_WHEEL_DOWN]:
			town.zoom=clampf(town.zoom*(1.12 if event.button_index==MOUSE_BUTTON_WHEEL_UP else 1.0/1.12),.65,2.8); town.update_camera(); invalidate()
	elif event is InputEventMouseMotion and pointers.has(0): pointer_move(0,event.position)
	elif event is InputEventMagnifyGesture:
		town.zoom=clampf(town.zoom*event.factor,.65,2.8); town.update_camera(); invalidate()

func _input(event: InputEvent) -> void:
	# Control.gui_input is not a reliable multi-touch route. Capture scene touches
	# at the root, while leaving toolbar touches for Godot's native Controls.
	if not town or qa_mode or (bench and bench.active): return
	# Embedded modal windows cover the stage. Do not steal their touch events.
	if (is_instance_valid(buffer_popup) and buffer_popup.visible) or palette_select.get_popup().visible:
		pointers.clear()
		return
	if event is InputEventMagnifyGesture and stage.get_global_rect().has_point(event.position):
		multitouch=true
		town.zoom=clampf(town.zoom*event.factor,.65,2.8)
		town.update_camera(); invalidate()
		get_viewport().set_input_as_handled()
	elif event is InputEventScreenTouch:
		if event.pressed and stage.get_global_rect().has_point(event.position):
			pointer_down(event.index,event.position-stage.global_position)
			get_viewport().set_input_as_handled()
		elif not event.pressed and pointers.has(event.index):
			if event.canceled: pointers.clear()
			else: pointer_up(event.index,event.position-stage.global_position)
			get_viewport().set_input_as_handled()
	elif event is InputEventScreenDrag and pointers.has(event.index):
		pointer_move(event.index,event.position-stage.global_position)
		get_viewport().set_input_as_handled()

func pointer_down(id: int,pos: Vector2) -> void:
	if pointers.is_empty(): down_position=pos; down_time=Time.get_ticks_msec(); moved=0; multitouch=false
	pointers[id]=pos
	if pointers.size()>1: multitouch=true

func pointer_move(id: int,pos: Vector2) -> void:
	if not pointers.has(id): return
	var old: Vector2=pointers[id]
	moved=maxf(moved,pos.distance_to(down_position))
	if pointers.size()==2:
		if not OS.has_feature('android'):
			var keys: Array=pointers.keys()
			var other: Vector2=pointers[keys[1] if keys[0]==id else keys[0]]
			var before: float=old.distance_to(other)
			if before>1: town.zoom=clampf(town.zoom*pos.distance_to(other)/before,.65,2.8)
	else:
		var delta: Vector2=pos-old
		if moved>8:
			town.yaw-=delta.x*.007
			town.elevation=clampf(town.elevation+delta.y*.005,.08,PI/2.0-.25)
	pointers[id]=pos; town.update_camera(); invalidate()

func pointer_up(id: int,pos: Vector2) -> void:
	if not pointers.has(id): return
	pointers.erase(id)
	if not pointers.is_empty() or multitouch or moved>8 or Time.get_ticks_msec()-down_time>700 or mode=='view': return
	var pick_pixel: Vector2=pos/stage.size*Vector2(viewport.size)
	if stage.stretch_mode==TextureRect.STRETCH_KEEP_ASPECT_CENTERED:
		var factor: float=minf(stage.size.x/viewport.size.x,stage.size.y/viewport.size.y)
		pick_pixel=(pos-(stage.size-Vector2(viewport.size)*factor)*.5)/factor
		if not Rect2(Vector2.ZERO,Vector2(viewport.size)).has_point(pick_pixel): return
	var p: Variant=town.pick(pick_pixel,mode=='add')
	if p==null: return
	var value: int=palette_select.get_selected_id() if mode=='add' else 0
	if (mode=='add' and world.cell(p.x,p.y,p.z)) or (mode=='remove' and not world.cell(p.x,p.y,p.z)): return
	var row: Dictionary=town.apply_edit(p,value)
	if not bench.report.has('manualEdits'): bench.report.manualEdits=[]
	bench.report.manualEdits.append(row)
	set_status('%s %s / %.2f ms / %d chunks' % [mode,str(p),row.meshMs,row.chunks.size()])
	invalidate()

func _notification(what: int) -> void:
	if what==NOTIFICATION_APPLICATION_PAUSED or what==NOTIFICATION_WM_WINDOW_FOCUS_OUT:
		pointers.clear()
		if bench and bench.active: bench.cancelled=true

func run_qa() -> void:
	await get_tree().create_timer(1.0).timeout
	invalidate(); await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png('res://deliverables/screenshots/godot-full.png')
	viewport.get_texture().get_image().save_png('res://deliverables/screenshots/godot-scene.png')
	var base: String=world.grid_hash()
	var picked_count: int=0
	for y in range(1,10):
		for x in range(1,10):
			if town.pick(Vector2(viewport.size)*Vector2(x/10.0,y/10.0),false)!=null: picked_count+=1
	print('PICK_QA '+str(picked_count))
	# Native window may be hidden during QA, so test mesh/edit path directly.
	var rows: Array=[]
	for i in range(10):
		for value in [world.cell(20,18,59),0]:
			rows.append(town.apply_edit(Vector3i(20,18,60),value)); invalidate(); await RenderingServer.frame_post_draw
	var preserved: bool=world.grid_hash()==base
	var before: int=town.render_count
	await get_tree().create_timer(3.0).timeout
	var idle_renders: int=town.render_count-before
	town.zoom=1.55; town.update_camera(); invalidate(); await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png('res://deliverables/screenshots/godot-detail.png')
	var qa: Dictionary={'passed':preserved and idle_renders==0,'source':'desktop native renderer functional QA, not physical-device acceptance','restoredGrid':preserved,'extra3dFramesDuringIdle3s':idle_renders,'edits':rows,'render':town.stats()}
	qa.validPicksIn81PointScreenProbe=picked_count
	FileAccess.open('res://reports/render-qa.json',FileAccess.WRITE).store_string(JSON.stringify(qa,'  '))
	print('RENDER_QA '+JSON.stringify(qa))
	get_tree().quit(0 if qa.passed else 1)
