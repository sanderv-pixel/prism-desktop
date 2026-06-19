import Cocoa

final class OnboardingWindowController: NSWindowController {
    var onComplete: (() -> Void)?

    private var editorButtons: [NSButton] = []
    private var editors: [Editor] = []
    private var statusLabels: [String: NSTextField] = [:]
    private var loginCheckbox: NSButton?

    init() {
        PrismLog.write("OnboardingWindowController init")
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 520, height: 440),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        window.title = "Welcome to Prism"
        window.center()
        window.isReleasedWhenClosed = false
        window.collectionBehavior = [.canJoinAllSpaces, .moveToActiveSpace]
        super.init(window: window)
        setupContent()
        window.makeKeyAndOrderFront(nil)
        window.orderFrontRegardless()
        PrismLog.write("OnboardingWindowController window front ordered, visible=\(window.isVisible)")
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private var isInApplications: Bool {
        Bundle.main.bundleURL.path.hasPrefix("/Applications/")
    }

    private func setupContent() {
        PrismLog.write("setupContent start")
        guard let contentView = window?.contentView else {
            PrismLog.write("setupContent: no contentView")
            return
        }

        let stack = NSStackView()
        stack.orientation = .vertical
        stack.spacing = 16
        stack.alignment = .leading
        stack.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -24),
            stack.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 24),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: contentView.bottomAnchor, constant: -24),
        ])

        let titleLabel = NSTextField(labelWithString: "Welcome to Prism")
        titleLabel.font = .systemFont(ofSize: 22, weight: .semibold)
        titleLabel.textColor = NSColor.labelColor
        stack.addArrangedSubview(titleLabel)

        let bodyLabel = NSTextField(wrappingLabelWithString: "Prism shows tiny ads during AI wait states. For Claude Desktop, Prism uses macOS Accessibility to detect the thinking indicator and overlays a single ad line — without modifying Claude.")
        bodyLabel.font = .systemFont(ofSize: 13)
        bodyLabel.textColor = NSColor.secondaryLabelColor
        stack.addArrangedSubview(bodyLabel)

        stack.setCustomSpacing(24, after: bodyLabel)
        PrismLog.write("setupContent: header done")

        // Accessibility step
        let accessRow = stepRow(
            title: "1. Grant Accessibility access",
            subtitle: "Prism needs this to find Claude Desktop's thinking indicator.",
            actionTitle: "Open Accessibility Settings…",
            action: #selector(openAccessibilitySettings(_:))
        )
        stack.addArrangedSubview(accessRow)

        // Editor extension step
        let editorTitle = NSTextField(labelWithString: "2. Install the editor extension (optional)")
        editorTitle.font = .systemFont(ofSize: 14, weight: .semibold)
        editorTitle.textColor = NSColor.labelColor
        stack.addArrangedSubview(editorTitle)

        let editorSubtitle = NSTextField(wrappingLabelWithString: "Install Prism directly into VS Code, Cursor, or Insiders if they are on this Mac.")
        editorSubtitle.font = .systemFont(ofSize: 12)
        editorSubtitle.textColor = NSColor.secondaryLabelColor
        stack.addArrangedSubview(editorSubtitle)

        PrismLog.write("setupContent: detecting editors")
        editors = PrismInstaller.detectedEditors()
        PrismLog.write("setupContent: found \(editors.count) editors")
        if editors.isEmpty {
            let noneLabel = NSTextField(wrappingLabelWithString: "No supported editor CLI found. You can install the extension manually from the Prism dashboard later.")
            noneLabel.font = .systemFont(ofSize: 12)
            noneLabel.textColor = NSColor.secondaryLabelColor
            stack.addArrangedSubview(noneLabel)
        } else {
            for editor in editors {
                let row = editorInstallRow(editor: editor)
                stack.addArrangedSubview(row)
            }
        }

        PrismLog.write("setupContent: editor section done")

        // Launch at login
        let loginRow = NSStackView()
        loginRow.orientation = .horizontal
        loginRow.spacing = 8
        loginRow.alignment = .centerY
        let checkbox = NSButton(checkboxWithTitle: "Launch Prism at login", target: self, action: nil)
        checkbox.state = .on
        loginCheckbox = checkbox
        loginRow.addArrangedSubview(checkbox)
        stack.addArrangedSubview(loginRow)

        if !isInApplications {
            checkbox.isEnabled = false
            checkbox.state = .off
            let note = NSTextField(wrappingLabelWithString: "Launch at login requires Prism.app to be in the Applications folder. Move it there, then reopen Prism to enable this option.")
            note.font = .systemFont(ofSize: 12)
            note.textColor = NSColor.secondaryLabelColor
            stack.addArrangedSubview(note)
        } else if #available(macOS 13.0, *) {
            if LoginItemManager.isEnabled {
                checkbox.state = .on
            }
        }

        stack.setCustomSpacing(24, after: loginRow)

        let startButton = NSButton(title: "Start Prism", target: self, action: #selector(completeOnboarding(_:)))
        startButton.bezelStyle = .rounded
        startButton.keyEquivalent = "\r"
        stack.addArrangedSubview(startButton)
        PrismLog.write("setupContent complete")
    }

    private func stepRow(title: String, subtitle: String, actionTitle: String, action: Selector) -> NSView {
        let container = NSStackView()
        container.orientation = .vertical
        container.spacing = 4
        container.alignment = .leading

        let titleLabel = NSTextField(labelWithString: title)
        titleLabel.font = .systemFont(ofSize: 14, weight: .semibold)
        titleLabel.textColor = NSColor.labelColor
        container.addArrangedSubview(titleLabel)

        let subtitleLabel = NSTextField(wrappingLabelWithString: subtitle)
        subtitleLabel.font = .systemFont(ofSize: 12)
        subtitleLabel.textColor = NSColor.secondaryLabelColor
        container.addArrangedSubview(subtitleLabel)

        let button = NSButton(title: actionTitle, target: self, action: action)
        button.bezelStyle = .rounded
        container.addArrangedSubview(button)

        return container
    }

    private func editorInstallRow(editor: Editor) -> NSView {
        let container = NSStackView()
        container.orientation = .horizontal
        container.spacing = 12
        container.alignment = .centerY

        let button = NSButton(title: "Install for \(editor.name)", target: self, action: #selector(installExtensionClicked(_:)))
        button.bezelStyle = .rounded
        button.tag = editorButtons.count
        editorButtons.append(button)

        let status = NSTextField(labelWithString: "")
        status.font = .systemFont(ofSize: 12)
        status.textColor = NSColor.secondaryLabelColor
        statusLabels[editor.name] = status

        container.addArrangedSubview(button)
        container.addArrangedSubview(status)
        return container
    }

    @objc private func openAccessibilitySettings(_ sender: Any?) {
        AccessibilityMonitor.promptForAccessibility()
    }

    @objc private func installExtensionClicked(_ sender: NSButton) {
        let index = sender.tag
        guard editors.indices.contains(index) else { return }
        let editor = editors[index]
        sender.isEnabled = false
        sender.title = "Installing…"
        statusLabels[editor.name]?.stringValue = ""

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let result = PrismInstaller.installExtension(for: editor)
            DispatchQueue.main.async {
                sender.isEnabled = true
                sender.title = result.success ? "Installed" : "Retry"
                self?.statusLabels[editor.name]?.stringValue = result.message
            }
        }
    }

    @objc private func completeOnboarding(_ sender: Any?) {
        if #available(macOS 13.0, *), isInApplications {
            let wantsLogin = loginCheckbox?.state == .on
            if wantsLogin != LoginItemManager.isEnabled {
                do {
                    try LoginItemManager.setEnabled(wantsLogin)
                } catch {
                    let alert = NSAlert()
                    alert.messageText = "Could not enable launch at login"
                    alert.informativeText = error.localizedDescription
                    alert.alertStyle = .warning
                    alert.runModal()
                }
            }
        }
        close()
        onComplete?()
    }
}
