import UIKit
import Capacitor

class AppViewController: CAPBridgeViewController {
    private var foregroundObserver: NSObjectProtocol?
    private var widgetObserver: NSObjectProtocol?
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(HealthPlugin())
        bridge?.registerPluginInstance(AudioPolicyPlugin())
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        widgetObserver = NotificationCenter.default.addObserver(forName: Notification.Name("komorebi.openTown"), object: nil, queue: .main) { [weak self] _ in
            self?.bridge?.triggerJSEvent(eventName: "komorebi:town", target: "window")
        }
        foregroundObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main
        ) { [weak self] _ in
            self?.bridge?.triggerJSEvent(eventName: "komorebi:resume", target: "window")
        }
    }
    deinit {
        if let observer = foregroundObserver { NotificationCenter.default.removeObserver(observer) }
        if let observer = widgetObserver { NotificationCenter.default.removeObserver(observer) }
    }
}
