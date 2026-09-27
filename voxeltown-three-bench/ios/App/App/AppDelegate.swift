import UIKit
import Capacitor
import WebKit

private var benchBoot = 0.0
@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey:Any]?) -> Bool {
        benchBoot=ProcessInfo.processInfo.systemUptime
        UIDevice.current.isBatteryMonitoringEnabled=true
        return true
    }
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey:Any]=[:]) -> Bool {
        ApplicationDelegateProxy.shared.application(app,open:url,options:options)
    }
}

@objc(BenchPlugin)
public class BenchPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier="BenchPlugin"
    public let jsName="Bench"
    public let pluginMethods:[CAPPluginMethod]=["info","snapshot","ready","awake","save"].map { CAPPluginMethod(name:$0,returnType:CAPPluginReturnPromise) }
    private func metrics() -> [String:Any] {
        var vm=task_vm_info_data_t()
        var count=mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size/MemoryLayout<integer_t>.size)
        let result=withUnsafeMutablePointer(to:&vm) { pointer in
            pointer.withMemoryRebound(to:integer_t.self,capacity:Int(count)) { task_info(mach_task_self_,task_flavor_t(TASK_VM_INFO),$0,&count) }
        }
        let device=UIDevice.current
        device.isBatteryMonitoringEnabled=true
        return ["appPhysFootprintBytes":result==KERN_SUCCESS ? vm.phys_footprint as Any : NSNull(),
            "appPssKb":NSNull(),
            "batteryPercent":device.batteryLevel>=0 ? Int((device.batteryLevel*100).rounded()) as Any : NSNull(),
            "plugged":device.batteryState == .unknown ? NSNull() : (device.batteryState != .unplugged) as Any,
            "thermalState":ProcessInfo.processInfo.thermalState.rawValue,
            "lowPowerMode":ProcessInfo.processInfo.isLowPowerModeEnabled,
            "brightness":UIScreen.main.brightness,
            "maximumFramesPerSecond":UIScreen.main.maximumFramesPerSecond,
            "source":"iOS task_vm_info; host app only, excludes WebContent/GPU processes"]
    }
    @objc func info(_ call:CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(["platform":"ios-wkwebview","osVersion":UIDevice.current.systemVersion,
                "model":UIDevice.current.model,"launchArguments":ProcessInfo.processInfo.arguments,
                "metrics":self.metrics()])
        }
    }
    @objc func snapshot(_ call:CAPPluginCall) { DispatchQueue.main.async {call.resolve(self.metrics())} }
    @objc func ready(_ call:CAPPluginCall) { call.resolve(["nativeUptimeToReadyMs":(ProcessInfo.processInfo.systemUptime-benchBoot)*1000,"scope":"AppDelegate initialization to JS ready; excludes pre-main launch"] ) }
    @objc func awake(_ call:CAPPluginCall) { DispatchQueue.main.async {UIApplication.shared.isIdleTimerDisabled=call.getBool("enabled") ?? false;call.resolve()} }
    @objc func save(_ call:CAPPluginCall) {
        guard let json=call.getString("json") else {call.reject("Missing JSON");return}
        do {
            let file=FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0].appendingPathComponent("bench-report.json")
            try json.write(to:file,atomically:true,encoding:.utf8)
            call.resolve(["path":file.path])
        } catch {call.reject(error.localizedDescription)}
    }
}
class BenchViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BenchPlugin())
        if #available(iOS 16.4, *) {webView?.isInspectable=true}
    }
    override var prefersStatusBarHidden:Bool {true}
}
