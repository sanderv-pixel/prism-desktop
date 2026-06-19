import Cocoa

final class OverlayWindow: NSWindow {
    private let label = NSTextField(labelWithString: "Ad text here")

    init() {
        super.init(
            contentRect: .zero,
            styleMask: .borderless,
            backing: .buffered,
            defer: false
        )
        level = .screenSaver
        backgroundColor = .clear
        isOpaque = false
        hasShadow = false
        ignoresMouseEvents = true
        collectionBehavior = [.canJoinAllSpaces, .stationary]

        setupLabel()
        contentView = label
    }

    private func setupLabel() {
        label.isEditable = false
        label.isSelectable = false
        label.isBordered = false
        label.drawsBackground = false
        label.textColor = .white
        label.font = .systemFont(ofSize: 13)
        label.alignment = .left
        label.lineBreakMode = .byTruncatingTail
        label.autoresizingMask = [.width, .height]

        let shadow = NSShadow()
        shadow.shadowOffset = NSSize(width: 0, height: -1)
        shadow.shadowBlurRadius = 2
        shadow.shadowColor = NSColor.black.withAlphaComponent(0.7)
        label.shadow = shadow
    }

    func show(at frame: NSRect) {
        let lineHeight: CGFloat = 22
        var rect = frame
        rect.size.height = lineHeight
        rect.origin.y = frame.origin.y + (frame.size.height - lineHeight) / 2

        if !isVisible {
            setFrame(rect, display: false)
            orderFrontRegardless()
        } else {
            setFrame(rect, display: true)
        }
    }

    func hide() {
        orderOut(nil)
    }
}
