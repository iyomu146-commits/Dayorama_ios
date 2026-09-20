import Foundation
import Capacitor
import HealthKit

// ===========================================================================
// Health — 歩数の取り口(iOS / HealthKit)
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
        // iPad など HealthKit を持たない端末がある。granted は上記の理由で返さない
        call.resolve(["status": HKHealthStore.isHealthDataAvailable() ? "available" : "unsupported"])
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("health_unavailable"); return
        }
        store.requestAuthorization(toShare: [], read: [stepType]) { ok, err in
            if let err = err { call.reject("permission_error: \(err.localizedDescription)"); return }
            call.resolve(["granted": ok])
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
        collect(from: start, to: stop, interval: DateComponents(day: 1), { rows in
            call.resolve(["days": rows.map { ["day": self.dayKey($0.0), "steps": Int($0.2)] }])
        }, { e in call.reject("steps_error: \(e.localizedDescription)") })
    }

    /// その日の最初と最後に歩いた時刻(ms)。1時間ごとの集計=**時間の分解能**。
    /// 記録が無ければ first を返さない(嘘の時刻で町の灯りを点けない)
    @objc func activityWindow(_ call: CAPPluginCall) {
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
