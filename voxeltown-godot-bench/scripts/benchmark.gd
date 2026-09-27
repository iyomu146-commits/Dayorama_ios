class_name Benchmark
extends RefCounted

var host: Control
var active: bool=false
var cancelled: bool=false
var report: Dictionary={'profile':'godot-visible-faces-v1','formatVersion':1,'status':'pending-physical-device','fps':{},'edits':null,'idle':null,'startup':null,'acceptance':{'medianFps':59,'p95FrameMs':20,'longFrameMs':33.34,'maxLongFrameFraction':.01,'meanRebuildMs':30}}

func _init(app: Control) -> void:
	host=app
	report.createdAt=Time.get_datetime_string_from_system(true)
	report.device=NativeMetrics.device()
	report.data=host.world.bundle.manifest
	report.initialMemory=NativeMetrics.snapshot()

func begin(label: String) -> void:
	active=true; cancelled=false
	host.set_status(label)
	DisplayServer.screen_set_keep_on(true)

func end() -> void:
	host.continuous=false
	host.viewport.render_target_update_mode=SubViewport.UPDATE_ONCE
	active=false
	DisplayServer.screen_set_keep_on(false)
	host.invalidate()
	save()

func check() -> bool:
	return not cancelled and host.get_window().has_focus()

static func median(values: Array) -> Variant:
	if values.is_empty(): return null
	var sorted: Array=values.duplicate(); sorted.sort()
	var i: int=sorted.size()/2
	return sorted[i] if sorted.size()%2 else (float(sorted[i-1])+float(sorted[i]))/2.0

static func percentile(values: Array,p: float) -> Variant:
	if values.is_empty(): return null
	var sorted: Array=values.duplicate(); sorted.sort()
	return sorted[int(floor((sorted.size()-1)*p))]

func fps() -> void:
	if active: return
	begin('FPS: still / orbit / zoom, 30 seconds each')
	report.fps={}
	var before: Array=[host.town.yaw,host.town.elevation,host.town.zoom]
	for mode in ['still','orbit','zoom']:
		host.town.reset_view()
		host.continuous=true
		host.viewport.render_target_update_mode=SubViewport.UPDATE_ALWAYS
		OS.low_processor_usage_mode=false
		var start: int=Time.get_ticks_usec()
		var last: int=0
		var samples: Array=[]
		while true:
			if not check(): break
			var elapsed: float=float(Time.get_ticks_usec()-start)/1000000.0
			var t: float=maxf(0.0,elapsed-3.0)
			if mode=='orbit': host.town.yaw=atan2(-32.0,24.0)+TAU*t/30.0
			if mode=='zoom': host.town.zoom=1.0+.25*(1.0-cos(TAU*t/30.0))
			host.town.update_camera()
			await RenderingServer.frame_post_draw
			var now: int=Time.get_ticks_usec()
			if elapsed>=3.0 and last>0: samples.append(float(now-last)/1000.0)
			last=now
			if elapsed>=33.0: break
		if not check():
			host.set_status('Cancelled: keep the app in front')
			break
		var rates: Array=samples.map(func(x): return 1000.0/float(x))
		var fps_median: float=median(rates)
		var p95: float=percentile(samples,.95)
		var long_fraction: float=float(samples.filter(func(x): return x>33.34).size())/samples.size()
		report.fps[mode]={'samples':samples.size(),'durationMs':samples.reduce(func(a,b): return a+b,0.0),'medianFps':fps_median,'p95FrameMs':p95,'longFrameFraction':long_fraction,'intervalsMs':samples,'source':'Godot RenderingServer.frame_post_draw / CPU submission cadence, not GPU present fence','thresholdPass':fps_median>=59 and p95<=20 and long_fraction<=.01}
		save()
	OS.low_processor_usage_mode=true
	host.town.yaw=before[0]; host.town.elevation=before[1]; host.town.zoom=before[2]; host.town.update_camera()
	if not cancelled: host.set_status('FPS measurement saved')
	end()

func edit_test() -> void:
	if active: return
	begin('Add/remove: 10 repetitions each')
	var w: VoxelWorld=host.world
	var p:=Vector3i(20,18,60) # Same Python/Three.js-verified interior plain cell.
	if w.cell(p.x,p.y,p.z)!=0 or w.cell(p.x,p.y,p.z-1)==0:
		host.set_status('Reset scene before edit benchmark'); end(); return
	var original: String=w.grid_hash()
	var value: int=w.cell(p.x,p.y,p.z-1)
	var rows: Array=[]
	for i in range(10):
		if not check(): break
		for v in [value,0]:
			var start: int=Time.get_ticks_usec()
			var row: Dictionary=host.town.apply_edit(p,v)
			host.invalidate()
			await RenderingServer.frame_post_draw
			row.cpuSubmitToFramePostDrawMs=float(Time.get_ticks_usec()-start)/1000.0
			row.index=i
			rows.append(row)
	report.edits={'rows':rows,'add':summarize(rows.filter(func(r): return r.operation=='add')),'remove':summarize(rows.filter(func(r): return r.operation=='remove')),'restoredGrid':w.grid_hash()==original,'scope':'interior plain cell, one chunk; CPU mesh rebuild and submission'}
	host.set_status('Edit measurement saved')
	end()

static func summarize(rows: Array) -> Dictionary:
	if rows.is_empty(): return {'n':0}
	var times: Array=rows.map(func(r): return r.meshMs)
	var mean: float=times.reduce(func(a,b): return a+b,0.0)/times.size()
	return {'n':times.size(),'meanMeshMs':mean,'p95MeshMs':percentile(times,.95),'thresholdPass':mean<30.0}

func idle() -> void:
	if active: return
	begin('Idle 10 minutes. Unplug power; keep this screen open.')
	host.town.reset_view(); host.invalidate()
	await host.get_tree().create_timer(1.0).timeout
	var start: int=Time.get_ticks_msec()
	var renders: int=host.town.render_count
	var samples: Array=[]
	report.idle={'complete':false,'running':true,'samples':samples,'elapsedMs':0,'extraRenders':0,'chargingInvalid':false,'batteryDropPercent':null,'appPssDeltaKb':null}
	for i in range(21):
		if not check(): break
		var s: Dictionary=NativeMetrics.snapshot()
		s.elapsedMs=Time.get_ticks_msec()-start
		samples.append(s)
		report.idle.elapsedMs=s.elapsedMs
		report.idle.extraRenders=host.town.render_count-renders
		report.idle.chargingInvalid=samples.any(func(row): return row.plugged==true)
		save() # Preserve partial observations if Android terminates the process.
		if i<20:
			for second in range(30):
				if not check(): break
				await host.get_tree().create_timer(1.0).timeout
	var extra: int=host.town.render_count-renders
	var charging: bool=samples.any(func(s): return s.plugged==true)
	var complete: bool=samples.size()==21 and not cancelled
	report.idle={'complete':complete,'elapsedMs':Time.get_ticks_msec()-start,'samples':samples,'extraRenders':extra,'chargingInvalid':charging,'batteryDropPercent':null,'appPssDeltaKb':null,'note':'Godot is a single app process; confirm with adb dumpsys meminfo. No leak/battery acceptance on emulator.'}
	if complete and not charging and samples[0].batteryPercent!=null and samples[-1].batteryPercent!=null:
		report.idle.batteryDropPercent=samples[0].batteryPercent-samples[-1].batteryPercent
	if complete and samples[0].appPssKb!=null and samples[-1].appPssKb!=null:
		report.idle.appPssDeltaKb=samples[-1].appPssKb-samples[0].appPssKb
	if complete and samples[0].get('appPhysFootprintBytes')!=null and samples[-1].get('appPhysFootprintBytes')!=null:
		report.idle.appPhysFootprintDeltaBytes=samples[-1].appPhysFootprintBytes-samples[0].appPhysFootprintBytes
	host.set_status('Idle measurement saved' if complete else 'Idle measurement cancelled')
	end()

func save() -> void:
	report.render=host.town.stats()
	var text: String=JSON.stringify(report,'  ')
	FileAccess.open('user://bench-report.json',FileAccess.WRITE).store_string(text)
	if not OS.has_feature('android') and not OS.has_feature('ios'): FileAccess.open('res://reports/desktop-report.json',FileAccess.WRITE).store_string(text)
	print('BENCH_REPORT_SAVED '+ProjectSettings.globalize_path('user://bench-report.json'))
