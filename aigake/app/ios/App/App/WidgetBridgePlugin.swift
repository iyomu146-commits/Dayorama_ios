import Capacitor
import UIKit
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "publish", returnType: CAPPluginReturnPromise)
    ]
    private let writer = DispatchQueue(label: "com.iyomu.dayorama.widget-writer")

    @objc func publish(_ call: CAPPluginCall) {
        guard let object = call.getObject("snapshot"), JSONSerialization.isValidJSONObject(object),
              let data = try? JSONSerialization.data(withJSONObject: object), data.count <= 3_000_000
        else { call.reject("ウィジェットのデータが正しくありません"); return }
        writer.async {
            do {
                let snapshot = try JSONDecoder().decode(WidgetSnapshot.self, from: data).validated()
                // Images originate in our renderer. Check them before passing
                // their data to the memory-constrained extension process.
                for imageData in [snapshot.townImage, snapshot.buildingImage].compactMap({ $0 }) {
                    guard let image = UIImage(data: imageData), image.size.width <= 600, image.size.height <= 600 else { throw WidgetStoreError.invalidSnapshot }
                }
                try WidgetStore.write(snapshot)
                WidgetCenter.shared.reloadTimelines(ofKind: WidgetStore.kind)
                call.resolve(["updated": true])
            } catch {
                call.reject("ウィジェットを更新できませんでした。App Groupの設定を確認してください。")
            }
        }
    }
}
