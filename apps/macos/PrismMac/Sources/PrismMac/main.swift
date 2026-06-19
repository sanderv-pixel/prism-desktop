import Cocoa

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
app.delegate = AppDelegate()
app.run()
