import Cocoa

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var onboardingController: OnboardingWindowController?
    private var statusBarController: StatusBarController?

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        let hasCompletedOnboarding = UserDefaults.standard.bool(forKey: "PrismOnboardingCompleted")

        if hasCompletedOnboarding {
            showStatusBar()
        } else {
            showOnboarding()
        }
    }

    private func showOnboarding() {
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
        statusBarController = StatusBarController()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return false
    }
}
