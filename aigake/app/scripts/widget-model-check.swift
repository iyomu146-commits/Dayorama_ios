import Foundation

@main
struct WidgetModelCheck {
    static func main() throws {
        let json = #"{"version":1,"day":"2026-09-16","timeZone":"Asia/Tokyo","todaySteps":4120,"syncedAt":1789516800000,"updatedAt":1789516800000,"region":"森","building":"図書館","completedBuildings":0,"totalBuildings":5,"progress":0.2,"remainingSteps":16000}"#
        let snapshot = try JSONDecoder().decode(WidgetSnapshot.self, from: Data(json.utf8)).validated()
        let zone = TimeZone(identifier: "Asia/Tokyo")!
        let date = ISO8601DateFormatter().date(from: "2026-09-16T14:59:00Z")!
        precondition(snapshot.steps(on: date, in: zone) == 4120)
        precondition(snapshot.steps(on: date.addingTimeInterval(120), in: zone) == nil)
        precondition(snapshot.steps(on: date, in: TimeZone(identifier: "America/Los_Angeles")!) == nil)
        let restored = try JSONDecoder().decode(WidgetSnapshot.self, from: JSONEncoder().encode(snapshot))
        precondition(restored.todaySteps == snapshot.todaySteps)
        precondition(restored.building == "図書館")
        let invalid = json.replacingOccurrences(of: "16000", with: "-1")
        do {
            _ = try JSONDecoder().decode(WidgetSnapshot.self, from: Data(invalid.utf8)).validated()
            preconditionFailure("Invalid progress must be rejected")
        } catch { }
        print("Widget Swift model: round trip, midnight, time zone and invalid data passed.")
    }
}
