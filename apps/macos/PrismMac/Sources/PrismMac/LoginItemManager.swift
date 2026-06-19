import Foundation
import ServiceManagement

@available(macOS 13.0, *)
enum LoginItemManager {
    static var isEnabled: Bool {
        SMAppService.mainApp.status == .enabled
    }

    static func setEnabled(_ enabled: Bool) throws {
        if enabled {
            if SMAppService.mainApp.status == .notFound {
                throw LoginItemError.notInApplications
            }
            try SMAppService.mainApp.register()
        } else {
            try SMAppService.mainApp.unregister()
        }
    }
}

enum LoginItemError: LocalizedError {
    case notInApplications

    var errorDescription: String? {
        switch self {
        case .notInApplications:
            return "Move Prism.app to /Applications before enabling launch at login."
        }
    }
}
