import Foundation
import Capacitor
import AVFoundation

// ===========================================================================
// AudioPolicy — 「いま音を出してよいか」(iOS)
//
// Android 版と**同じ1メソッド・同じ返り値**。契約の正本は
// app/www/js/app.js の `nativeAudioAllowed()` のコメント。
//
// 【iOS は OS が面倒を見る】AppDelegate で AVAudioSession を `ambient` にしてあるので、
//   消音スイッチは尊重され、他アプリの音とは**混ざる**(止めない)。
//   なので iOS では「他アプリが再生中だから降りる」をしない——混ざるのが正しい振る舞いで、
//   わざわざ黙ると、静かなポッドキャストを聴いている人にだけ鐘が無い、という不揃いになる。
//
// 【消音スイッチの状態は読まない】iOS には公開APIが無い(昔の裏技は審査で落ちる)。
//   読めないものを推測で判定しない=`ambient` に任せる、が唯一の正解。
//   だから `handledByOs: true` を返して、JS 側の追加判定を**降ろす**。
// ===========================================================================

@objc(AudioPolicyPlugin)
public class AudioPolicyPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioPolicyPlugin"
    public let jsName = "AudioPolicy"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "state", returnType: CAPPluginReturnPromise)
    ]

    @objc func state(_ call: CAPPluginCall) {
        let category = AVAudioSession.sharedInstance().category
        // 万一 ambient になっていなければ、鳴らさない側へ倒す(playback のまま鳴らすのが最悪手)
        let ok = (category == .ambient || category == .soloAmbient)
        call.resolve([
            "allow": ok,
            "silent": false,          // 読めない(iOSに公開APIが無い)。ambient がOSレベルで面倒を見る
            "musicActive": false,     // 混ざるのが正しいので、他アプリ再生中でも降りない
            "handledByOs": ok,
            "category": category.rawValue
        ])
    }
}
