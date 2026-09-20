import Foundation

// Compiled into both targets. A single atomic JSON file keeps images and counts
// from different synchronizations from being mixed by the widget process.
struct WidgetSnapshot: Codable {
    let version: Int
    let day: String
    let timeZone: String
    let todaySteps: Int?
    let syncedAt: Double?
    let updatedAt: Double
    let region: String
    let building: String
    let completedBuildings: Int
    let totalBuildings: Int
    let progress: Double
    let remainingSteps: Int
    var townImage: Data?
    var buildingImage: Data?

    func validated() throws -> WidgetSnapshot {
        guard version == 1, day.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil,
              !timeZone.isEmpty, (todaySteps ?? 0) >= 0, updatedAt.isFinite, updatedAt > 0,
              syncedAt == nil || (syncedAt!.isFinite && syncedAt! > 0),
              !region.isEmpty, region.count <= 80, !building.isEmpty, building.count <= 100,
              totalBuildings > 0, completedBuildings >= 0, completedBuildings <= totalBuildings,
              progress.isFinite, (0...1).contains(progress), remainingSteps >= 0,
              (townImage?.count ?? 0) <= 1_048_576, (buildingImage?.count ?? 0) <= 1_048_576
        else { throw WidgetStoreError.invalidSnapshot }
        return self
    }

    func steps(on date: Date, in zone: TimeZone = .current) -> Int? {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = zone
        formatter.dateFormat = "yyyy-MM-dd"
        // A date or time-zone change must never label yesterday's total as today.
        guard formatter.string(from: date) == day, timeZone == zone.identifier else { return nil }
        return todaySteps
    }
}

enum WidgetStoreError: Error { case unavailableGroup, invalidSnapshot }

enum WidgetStore {
    static let kind = "KomorebiTown"
    static let openURL = URL(string: "komorebi://town")!
    static var groupID: String { Bundle.main.object(forInfoDictionaryKey: "KomorebiAppGroup") as? String ?? "group.com.iyomu.dayorama" }
    static func fileURL() throws -> URL {
        guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID) else { throw WidgetStoreError.unavailableGroup }
        return container.appendingPathComponent("widget-snapshot-v1.json")
    }
    static func read() -> WidgetSnapshot? {
        guard let url = try? fileURL(), let data = try? Data(contentsOf: url), data.count <= 3_000_000,
              let value = try? JSONDecoder().decode(WidgetSnapshot.self, from: data) else { return nil }
        return try? value.validated()
    }
    static func write(_ snapshot: WidgetSnapshot) throws {
        let data = try JSONEncoder().encode(snapshot.validated())
        #if os(iOS)
        try data.write(to: fileURL(), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        #else
        try data.write(to: fileURL(), options: .atomic)
        #endif
    }
}
