class_name NativeMetrics
extends RefCounted

static func snapshot() -> Dictionary:
	var out: Dictionary={'elapsedTicksMs':Time.get_ticks_msec(),'batteryPercent':null,'plugged':null,'appPssKb':null,'godotStaticBytes':OS.get_static_memory_usage(),'processId':OS.get_process_id()}
	if OS.has_feature('ios'):
		var path: String='user://bench-native.json'
		if FileAccess.file_exists(path):
			var sample: Variant=JSON.parse_string(FileAccess.get_file_as_string(path))
			if sample is Dictionary:
				out.merge(sample,true)
				out.sampleAgeSeconds=Time.get_unix_time_from_system()-float(sample.get('unixTime',0))
		return out
	if not OS.has_feature('android'): return out
	var wrapper: Object=Engine.get_singleton('JavaClassWrapper')
	var runtime: Object=Engine.get_singleton('AndroidRuntime')
	if not wrapper or not runtime: return out
	var debug: Object=wrapper.wrap('android.os.Debug')
	var pss: int=debug.getPss()
	if wrapper.get_exception()==null: out.appPssKb=pss
	var manager: Object=runtime.getApplicationContext().getSystemService('batterymanager')
	if manager:
		out.batteryPercent=manager.getIntProperty(4)
		out.chargeCounterUah=manager.getIntProperty(1)
		out.plugged=bool(manager.isCharging())
	return out

static func device() -> Dictionary:
	var out: Dictionary={'os':OS.get_name(),'model':OS.get_model_name(),'osVersion':OS.get_version(),'processors':OS.get_processor_count(),'engine':Engine.get_version_info(),'emulator':null,'platform':'android-native' if OS.has_feature('android') else 'desktop-QA-NOT-product-benchmark'}
	if OS.has_feature('ios'): out.platform='ios-native-compatibility'; out.emulator=false
	if OS.has_feature('android'):
		var wrapper: Object=Engine.get_singleton('JavaClassWrapper')
		if wrapper:
			var build: Object=wrapper.wrap('android.os.Build')
			out.model=build.MODEL
			out.manufacturer=build.MANUFACTURER
			out.fingerprint=build.FINGERPRINT
			out.hardware=build.HARDWARE
			out.emulator='generic' in str(build.FINGERPRINT) or 'emulator' in str(build.MODEL).to_lower() or 'sdk' in str(build.MODEL).to_lower() or str(build.HARDWARE) in ['ranchu','goldfish']
	return out
