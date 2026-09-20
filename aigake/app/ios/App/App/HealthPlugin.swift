import Foundation
import Capacitor
import HealthKit
import CoreMotion

// ===========================================================================
// Health — 歩数の取り口(iOS / HealthKit、任意選択のCore Motion歩数計)
// source: "pedometer" を明示した呼び出しだけCore Motionを使用する。
// HealthKitの署名権限や読み取り許可を迂回せず、別途MotionのOS許可を得る。
//
// Android 版(HealthPlugin.kt)と**同じ4メソッド・同じ返り値**にしてある。
// 契約の正本は JS 側 step-source.js の HealthStepSource のコメント。
// 片方だけ便利な口を足すと、JS に「iOSのときは」が生えて二重管理になる。
//
// 【v1で読むのは歩数だけ】睡眠は読まない(§0 追補v2 A)。
// 【日の境界は端末のローカル時刻】JS の dayKey() と同じ境界。
//
// 【iOSに固有の正直さ】HealthKit は**読み取りを拒否したことをアプリに教えない**
//   (「拒否した」と分かること自体が情報漏れになる、というAppleの設計)。
//   したがって requestPermission の granted は「許可シートを出せた」以上の意味を持たない。
//   本当に読めたかどうかは、歩数が返ってくるかどうかでしか分からない
//   ——だから availability では granted を**返さない**(嘘の true を返さない)。
//
// App ターゲット・App.entitlements・AppViewController への登録は設定済み。
// 配布用プロファイルにも HealthKit が必要。手順は ../../../../README-ios.md。
// ===========================================================================

@objc(HealthPlugin)
public class HealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthPlugin"
    public let jsName = "Health"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "availability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "dailySteps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "activityWindow", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()
    private let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
    private let pedometer = CMPedometer()

    private var calendar: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone.current
        return c
    }

    private func day(_ s: String) -> Date? {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.calendar = calendar
        f.isLenient = false
        f.timeZone = TimeZone.current
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: s)
    }
    private func dayKey(_ d: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.calendar = calendar
        f.timeZone = TimeZone.current
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: d)
    }

    @objc func availability(_ call: CAPPluginCall) {
        if call.getString("source") == "pedometer" {
            call.resolve(["status": CMPedometer.isStepCountingAvailable() ? "available" : "unsupported"])
            return
        }
        // iPad など HealthKit を持たない端末がある。granted は上記の理由で返さない
        call.resolve(["status": HKHealthStore.isHealthDataAvailable() ? "available" : "unsupported"])
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        if call.getString("source") == "pedometer" {
            requestMotionPermission(call)
            return
        }
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("health_unavailable"); return
        }
        DispatchQueue.main.async {
            self.store.requestAuthorization(toShare: [], read: [self.stepType]) { ok, err in
                if let err = err {
                    let diagnostic = err.localizedDescription.lowercased()
                    if diagnostic.contains("entitlement") && diagnostic.contains("healthkit") {
                        call.reject("このインストールでは歩数の読み取り権限が不足しています。署名のHealthKit設定を確認してください。", "HEALTH_ENTITLEMENT_MISSING")
                    } else {
                        call.reject("歩数の連携設定を完了できませんでした。\(err.localizedDescription)", "HEALTH_PERMISSION_FAILED")
                    }
                    return
                }
                call.resolve(["granted": ok])
            }
        }
    }

    /// 区切りごとの歩数合計を集める共通部分。**空の枠は呼び出し側に渡さない**
    private func collect(from: Date, to: Date, interval: DateComponents,
                         _ done: @escaping ([(Date, Date, Double)]) -> Void,
                         _ fail: @escaping (Error) -> Void) {
        let predicate = HKQuery.predicateForSamples(withStart: from, end: to, options: .strictStartDate)
        let q = HKStatisticsCollectionQuery(quantityType: stepType,
                                            quantitySamplePredicate: predicate,
                                            options: .cumulativeSum,
                                            anchorDate: from,
                                            intervalComponents: interval)
        q.initialResultsHandler = { _, results, error in
            if let error = error { fail(error); return }
            var out: [(Date, Date, Double)] = []
            results?.enumerateStatistics(from: from, to: to) { stat, _ in
                let n = stat.sumQuantity()?.doubleValue(for: HKUnit.count()) ?? 0
                if n > 0 { out.append((stat.startDate, stat.endDate, n)) }
            }
            done(out)
        }
        store.execute(q)
    }

    /// from〜to(両端を含む・'YYYY-MM-DD')の日ごとの合計。**歩数が無い日は返さない**
    @objc func dailySteps(_ call: CAPPluginCall) {
        guard let fromStr = call.getString("from"),
              let start = day(fromStr),
              let end0 = day(call.getString("to") ?? fromStr),
              let end = calendar.date(byAdding: .day, value: 1, to: end0),
              end > start, end.timeIntervalSince(start) <= 95 * 86400 else {
            call.reject("no_range"); return
        }
        let stop = min(end, Date())   // 未来までは集計しない(今日の途中で切る)
        if stop <= start { call.resolve(["days": []]); return }
        if call.getString("source") == "pedometer" {
            guard motionAllowed(call) else { return }
            // The OS keeps a rolling seven-day cache. Exclude the partial oldest
            // date instead of replacing a saved full-day total with a fragment.
            let cutoff = Date().addingTimeInterval(-7 * 86400)
            let firstFullDay = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: cutoff))!
            collectMotionDays(from: max(start, firstFullDay), to: stop, rows: [], call: call)
            return
        }
        collect(from: start, to: stop, interval: DateComponents(day: 1), { rows in
            call.resolve(["days": rows.map { ["day": self.dayKey($0.0), "steps": Int($0.2)] }])
        }, { e in call.reject("steps_error: \(e.localizedDescription)") })
    }

    private func rejectMotion(_ call: CAPPluginCall, error: Error? = nil) {
        switch CMPedometer.authorizationStatus() {
        case .denied:
            call.reject("設定アプリの「プライバシーとセキュリティ」→「モーションとフィットネス」で、こもれびを許可してください。", "MOTION_DENIED")
        case .restricted:
            call.reject("このiPhoneではモーションとフィットネスの利用が制限されています。", "MOTION_RESTRICTED")
        default:
            call.reject("iPhoneの歩数を読み取れませんでした。\(error?.localizedDescription ?? "連携をもう一度お試しください。")", "MOTION_READ_FAILED")
        }
    }

    private func motionAllowed(_ call: CAPPluginCall) -> Bool {
        guard CMPedometer.isStepCountingAvailable() else {
            call.reject("この端末ではiPhoneの歩数計を利用できません。", "MOTION_UNAVAILABLE")
            return false
        }
        guard CMPedometer.authorizationStatus() == .authorized else {
            rejectMotion(call)
            return false
        }
        return true
    }

    private func requestMotionPermission(_ call: CAPPluginCall) {
        guard CMPedometer.isStepCountingAvailable() else {
            call.reject("この端末ではiPhoneの歩数計を利用できません。", "MOTION_UNAVAILABLE")
            return
        }
        let authorization = CMPedometer.authorizationStatus()
        if authorization == .denied || authorization == .restricted {
            rejectMotion(call)
            return
        }
        // A query triggers the OS consent sheet when permission is undetermined.
        DispatchQueue.main.async {
            let now = Date()
            self.pedometer.queryPedometerData(from: now.addingTimeInterval(-60), to: now) { _, error in
                if let error = error { self.rejectMotion(call, error: error); return }
                guard self.motionAllowed(call) else { return }
                call.resolve(["granted": true])
            }
        }
    }

    private func collectMotionDays(from start: Date, to end: Date,
                                   rows: [[String: Any]], call: CAPPluginCall) {
        guard start < end else { call.resolve(["days": rows]); return }
        let next = calendar.date(byAdding: .day, value: 1, to: start)!
        DispatchQueue.main.async {
            self.pedometer.queryPedometerData(from: start, to: min(next, end)) { data, error in
                if let error = error { self.rejectMotion(call, error: error); return }
                guard let data = data else { self.rejectMotion(call); return }
                let row: [String: Any] = ["day": self.dayKey(start), "steps": data.numberOfSteps.intValue]
                self.collectMotionDays(from: next, to: end, rows: rows + [row], call: call)
            }
        }
    }

    /// その日の最初と最後に歩いた時刻(ms)。1時間ごとの集計=**時間の分解能**。
    /// 記録が無ければ first を返さない(嘘の時刻で町の灯りを点けない)
    @objc func activityWindow(_ call: CAPPluginCall) {
        if call.getString("source") == "pedometer" {
            call.reject("iPhoneの歩数計では活動時刻の取得に対応していません。", "MOTION_ACTIVITY_UNAVAILABLE")
            return
        }
        guard let dayStr = call.getString("day"),
              let start = day(dayStr),
              let end = calendar.date(byAdding: .day, value: 1, to: start) else {
            call.reject("no_day"); return
        }
        let stop = min(end, Date())
        if stop <= start { call.resolve([:]); return }
        collect(from: start, to: stop, interval: DateComponents(hour: 1), { rows in
            guard let f = rows.first, let l = rows.last else { call.resolve([:]); return }
            call.resolve(["first": Int(f.0.timeIntervalSince1970 * 1000),
                          "last": Int(l.1.timeIntervalSince1970 * 1000)])
        }, { e in call.reject("activity_error: \(e.localizedDescription)") })
    }
}
