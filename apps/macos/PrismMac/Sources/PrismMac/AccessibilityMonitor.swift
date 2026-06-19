import Cocoa
import ApplicationServices

final class AccessibilityMonitor {
    var onThinkingDetected: ((NSRect) -> Void)?
    var onThinkingStopped: (() -> Void)?

    private var timer: Timer?
    private let interval: TimeInterval = 0.2
    private let possibleBundleIDs = [
        "com.anthropic.claude.desktop",
        "com.anthropic.claude",
        "com.anthropic.Claude",
    ]
    private let thinkingKeywords = [
        "thinking", "claude is thinking", "generating",
        "loading", "processing", "stop", "cancel"
    ]
    private let maxSearchDepth = 20

    var isRunning: Bool {
        timer != nil
    }

    static func isTrusted() -> Bool {
        let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        let options = [key: false]
        return AXIsProcessTrustedWithOptions(options as CFDictionary)
    }

    static func promptForAccessibility() {
        let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        let options = [key: true]
        AXIsProcessTrustedWithOptions(options as CFDictionary)
    }

    func startPolling() {
        guard timer == nil else { return }
        timer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            self?.tick()
        }
        timer?.tolerance = interval / 2
        tick()
    }

    func stopPolling() {
        timer?.invalidate()
        timer = nil
    }

    private func tick() {
        guard AccessibilityMonitor.isTrusted() else {
            onThinkingStopped?()
            return
        }

        guard let frontApp = NSWorkspace.shared.frontmostApplication,
              let bundleID = frontApp.bundleIdentifier,
              possibleBundleIDs.contains(bundleID) else {
            onThinkingStopped?()
            return
        }

        let appElement = AXUIElementCreateApplication(frontApp.processIdentifier)
        if let element = findThinkingElement(in: appElement, depth: 0),
           let frame = frame(of: element) {
            onThinkingDetected?(frame)
        } else {
            onThinkingStopped?()
        }
    }

    private func findThinkingElement(in element: AXUIElement, depth: Int) -> AXUIElement? {
        guard depth < maxSearchDepth else { return nil }

        if matchesThinkingIndicator(element) {
            return element
        }

        guard let children = children(of: element) else { return nil }
        for child in children {
            if let found = findThinkingElement(in: child, depth: depth + 1) {
                return found
            }
        }
        return nil
    }

    private func matchesThinkingIndicator(_ element: AXUIElement) -> Bool {
        if matchesProgressIndicator(element) {
            return true
        }

        let candidates = [
            stringValue(for: element, attribute: kAXValueAttribute),
            stringValue(for: element, attribute: kAXTitleAttribute),
            stringValue(for: element, attribute: kAXDescriptionAttribute),
            stringValue(for: element, attribute: kAXHelpAttribute),
        ]

        for text in candidates {
            guard let text = text else { continue }
            let lower = text.lowercased()
            for keyword in thinkingKeywords {
                if lower.contains(keyword) {
                    return true
                }
            }
        }
        return false
    }

    private func matchesProgressIndicator(_ element: AXUIElement) -> Bool {
        let role = stringValue(for: element, attribute: kAXRoleAttribute)?.lowercased() ?? ""
        let subrole = stringValue(for: element, attribute: kAXSubroleAttribute)?.lowercased() ?? ""
        return role.contains("progress") || role.contains("busy") ||
               subrole.contains("progress") || subrole.contains("busy")
    }

    private func stringValue(for element: AXUIElement, attribute: String) -> String? {
        var value: AnyObject?
        let result = AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
        guard result == .success else { return nil }
        return value as? String
    }

    private func children(of element: AXUIElement) -> [AXUIElement]? {
        var value: AnyObject?
        let result = AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &value)
        guard result == .success else { return nil }
        return value as? [AXUIElement]
    }

    private func frame(of element: AXUIElement) -> NSRect? {
        var position = CGPoint.zero
        var size = CGSize.zero

        var positionValue: AnyObject?
        guard AXUIElementCopyAttributeValue(element, kAXPositionAttribute as CFString, &positionValue) == .success,
              let pos = positionValue as! AXValue?,
              AXValueGetValue(pos, .cgPoint, &position) else {
            return nil
        }

        var sizeValue: AnyObject?
        guard AXUIElementCopyAttributeValue(element, kAXSizeAttribute as CFString, &sizeValue) == .success,
              let sz = sizeValue as! AXValue?,
              AXValueGetValue(sz, .cgSize, &size) else {
            return nil
        }

        return NSRect(origin: position, size: size)
    }
}
