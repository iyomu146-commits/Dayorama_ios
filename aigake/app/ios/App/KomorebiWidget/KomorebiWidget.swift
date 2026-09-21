import SwiftUI
import WidgetKit
import UIKit

struct TownEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
}

struct TownProvider: TimelineProvider {
    func placeholder(in context: Context) -> TownEntry { TownEntry(date: Date(), snapshot: nil) }
    func getSnapshot(in context: Context, completion: @escaping (TownEntry) -> Void) {
        completion(TownEntry(date: Date(), snapshot: WidgetStore.read()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<TownEntry>) -> Void) {
        let now = Date(), snapshot = WidgetStore.read()
        let nextDay = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: now))!
        // The midnight entry hides yesterday's steps even without an app launch.
        let entries = [TownEntry(date: now, snapshot: snapshot), TownEntry(date: nextDay, snapshot: snapshot)]
        completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(30 * 60))))
    }
}

struct TownWidgetView: View {
    let entry: TownEntry
    @Environment(\.widgetFamily) private var family
    private let ink = Color(red: 0.15, green: 0.23, blue: 0.19)
    private let paper = Color(red: 0.98, green: 0.98, blue: 0.97)

    var body: some View {
        Group {
            if #available(iOS 17.0, *) {
                content.containerBackground(for: .widget) { paper }
            } else {
                content.padding(14).background(paper)
            }
        }
        .foregroundStyle(ink)
        .widgetURL(WidgetStore.openURL)
        .privacySensitive()
    }

    @ViewBuilder private var content: some View {
        if let snapshot = entry.snapshot {
            if family == .systemMedium {
                HStack(spacing: 12) {
                    scene(snapshot.townImage).frame(maxWidth: .infinity, maxHeight: .infinity)
                    VStack(alignment: .leading, spacing: 6) {
                        Text(snapshot.region).font(.caption).foregroundStyle(.secondary)
                        HStack(alignment: .firstTextBaseline, spacing: 3) {
                            Text(snapshot.steps(on: entry.date).map(number) ?? "—").font(.system(size: 27, weight: .medium, design: .rounded)).minimumScaleFactor(0.65)
                            Text("歩").font(.caption2)
                        }.lineLimit(1)
                        Text(snapshot.building).font(.caption).lineLimit(1)
                        progress(snapshot)
                        Text(remaining(snapshot)).font(.system(size: 10)).lineLimit(1).minimumScaleFactor(0.7)
                        updated(snapshot).font(.system(size: 9)).foregroundStyle(.secondary)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Text(snapshot.building).font(.caption).lineLimit(1)
                    scene(snapshot.buildingImage ?? snapshot.townImage).frame(maxWidth: .infinity, maxHeight: .infinity)
                    progress(snapshot)
                    Text(remaining(snapshot)).font(.system(size: 11)).lineLimit(1).minimumScaleFactor(0.7)
                    updated(snapshot).font(.system(size: 9)).foregroundStyle(.secondary)
                }
            }
        } else {
            VStack(spacing: 10) {
                Image(systemName: "building.2").font(.title2)
                Text("Dayorama").font(.headline)
                Text("アプリを開く").font(.caption).foregroundStyle(.secondary)
            }.frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
    @ViewBuilder private func scene(_ data: Data?) -> some View {
        if let data, let image = UIImage(data: data) {
            Image(uiImage: image).resizable().scaledToFit().accessibilityLabel("町の建築の様子")
        } else {
            Image(systemName: "building.2").font(.largeTitle).foregroundStyle(.secondary)
        }
    }
    private func progress(_ snapshot: WidgetSnapshot) -> some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Rectangle().fill(ink.opacity(0.12))
                Rectangle().fill(ink.opacity(0.65)).frame(width: geometry.size.width * CGFloat(snapshot.progress))
            }
        }.frame(height: 3).accessibilityLabel("建築 \(Int(snapshot.progress * 100))パーセント")
    }
    private func remaining(_ snapshot: WidgetSnapshot) -> String {
        snapshot.completedBuildings == snapshot.totalBuildings ? "町が完成しました" : "完成まで \(number(snapshot.remainingSteps))歩"
    }
    private func number(_ value: Int) -> String { value.formatted(.number.locale(Locale(identifier: "ja_JP"))) }
    private func updated(_ snapshot: WidgetSnapshot) -> Text {
        guard let timestamp = snapshot.syncedAt else { return Text("歩数を連携") }
        let date = Date(timeIntervalSince1970: timestamp / 1000)
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ja_JP")
        formatter.dateFormat = Calendar.current.isDate(date, inSameDayAs: entry.date) ? "HH:mm" : "M/d HH:mm"
        return Text("\(formatter.string(from: date)) 同期")
    }
}

@main
struct KomorebiWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: WidgetStore.kind, provider: TownProvider()) { entry in TownWidgetView(entry: entry) }
            .configurationDisplayName("Dayorama")
            .description("歩数と町の建築の進み具合")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}
