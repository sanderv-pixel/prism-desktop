import Cocoa
import ServiceManagement

final class StatusBarController: NSObject {
    private var statusItem: NSStatusItem!
    private let monitor: AccessibilityMonitor
    private let overlay = OverlayWindow()
    private var enabled = true
    private var onboardingController: OnboardingWindowController?

    override init() {
        monitor = AccessibilityMonitor()
        super.init()
        setupStatusItem()
        setupMonitorCallbacks()
        monitor.startPolling()
    }

    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem.button?.image = statusIcon()
        statusItem.button?.image?.isTemplate = true
        statusItem.menu = buildMenu()
    }

    private func statusIcon() -> NSImage {
        let size = NSSize(width: 18, height: 18)
        let image = NSImage(size: size)
        image.lockFocus()
        NSColor.labelColor.setFill()
        let rect = NSRect(x: 4, y: 4, width: 10, height: 10)
        let path = NSBezierPath(ovalIn: rect)
        path.fill()
        image.unlockFocus()
        return image
    }

    private func buildMenu() -> NSMenu {
        let menu = NSMenu()

        let enableItem = NSMenuItem(
            title: "Pause Claude Desktop ads",
            action: #selector(toggleEnabled(_:)),
            keyEquivalent: ""
        )
        enableItem.target = self
        menu.addItem(enableItem)

        if #available(macOS 13.0, *) {
            let loginItem = NSMenuItem(
                title: "Launch at login",
                action: #selector(toggleLoginItem(_:)),
                keyEquivalent: ""
            )
            loginItem.target = self
            loginItem.state = LoginItemManager.isEnabled ? .on : .off
            menu.addItem(loginItem)
        }

        menu.addItem(.separator())

        let accessibilityItem = NSMenuItem(
            title: "Open Accessibility settings…",
            action: #selector(openAccessibilitySettings(_:)),
            keyEquivalent: ""
        )
        accessibilityItem.target = self
        menu.addItem(accessibilityItem)

        let setupItem = NSMenuItem(
            title: "Open setup…",
            action: #selector(openSetup(_:)),
            keyEquivalent: ""
        )
        setupItem.target = self
        menu.addItem(setupItem)

        menu.addItem(.separator())

        let quitItem = NSMenuItem(
            title: "Quit",
            action: #selector(quit(_:)),
            keyEquivalent: "q"
        )
        quitItem.target = self
        menu.addItem(quitItem)

        return menu
    }

    private func setupMonitorCallbacks() {
        monitor.onThinkingDetected = { [weak self] frame in
            guard let self, self.enabled else { return }
            PrismLog.write("onThinkingDetected: frame=\(frame)")
            DispatchQueue.main.async {
                self.overlay.show(at: frame)
            }
        }
        monitor.onThinkingStopped = { [weak self] in
            guard let self else { return }
            PrismLog.write("onThinkingStopped")
            DispatchQueue.main.async {
                self.overlay.hide()
            }
        }
    }

    @objc private func toggleEnabled(_ sender: NSMenuItem) {
        enabled.toggle()
        sender.title = enabled ? "Pause Claude Desktop ads" : "Resume Claude Desktop ads"
        if !enabled {
            overlay.hide()
        }
    }

    @objc private func toggleLoginItem(_ sender: NSMenuItem) {
        guard #available(macOS 13.0, *) else { return }
        let newState = sender.state != .on
        do {
            try LoginItemManager.setEnabled(newState)
            sender.state = newState ? .on : .off
        } catch {
            let alert = NSAlert()
            alert.messageText = "Could not change login item"
            alert.informativeText = error.localizedDescription
            alert.alertStyle = .warning
            alert.runModal()
        }
    }

    @objc private func openAccessibilitySettings(_ sender: Any?) {
        AccessibilityMonitor.promptForAccessibility()
    }

    @objc private func openSetup(_ sender: Any?) {
        UserDefaults.standard.set(false, forKey: "PrismOnboardingCompleted")
        onboardingController = OnboardingWindowController()
        onboardingController?.onComplete = { [weak self] in
            UserDefaults.standard.set(true, forKey: "PrismOnboardingCompleted")
            self?.enabled = true
            self?.onboardingController = nil
        }
        onboardingController?.showWindow(nil)
    }

    @objc private func quit(_ sender: Any?) {
        NSApplication.shared.terminate(nil)
    }
}
