import Cocoa

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var onboardingController: OnboardingWindowController?
    private var statusBarController: StatusBarController?

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        PrismLog.write("applicationDidFinishLaunching")
        NSApp.activate(ignoringOtherApps: true)

        let hasCompletedOnboarding = UserDefaults.standard.bool(forKey: "PrismOnboardingCompleted")

        if hasCompletedOnboarding {
            showStatusBar()
        } else {
            showTestWindow()
        }
    }

    private func showTestWindow() {
        PrismLog.write("showTestWindow")
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 400, height: 300),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        window.title = "Prism Test Window"
        window.center()
        window.contentView = NSView()
        window.contentView?.wantsLayer = true
        window.contentView?.layer?.backgroundColor = NSColor.red.cgColor
        window.makeKeyAndOrderFront(nil)
        window.orderFrontRegardless()
        PrismLog.write("showTestWindow visible=\(window.isVisible)")
    }

    private func showOnboarding() {
        PrismLog.write("showOnboarding")
        NSApp.activate(ignoringOtherApps: true)
        onboardingController = OnboardingWindowController()
        onboardingController?.onComplete = { [weak self] in
            UserDefaults.standard.set(true, forKey: "PrismOnboardingCompleted")
            self?.onboardingController = nil
            self?.showStatusBar()
        }
        onboardingController?.showWindow(nil)
    }

    private func showStatusBar() {
        PrismLog.write("showStatusBar")
        statusBarController = StatusBarController()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return false
    }
}
