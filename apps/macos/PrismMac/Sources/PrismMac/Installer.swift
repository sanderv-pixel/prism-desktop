import Foundation

struct Editor: Identifiable {
    let id = UUID()
    let name: String
    let cliPath: String
}

struct InstallResult {
    let success: Bool
    let message: String
}

enum PrismInstaller {
    private static let extensionResourceName = "prism-extension"
    private static let extensionResourceType = "vsix"

    static func bundledExtensionURL() -> URL? {
        Bundle.main.url(forResource: extensionResourceName, withExtension: extensionResourceType)
    }

    static func detectedEditors() -> [Editor] {
        let candidates = [
            ("Visual Studio Code", "code", "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"),
            ("Cursor", "cursor", "/Applications/Cursor.app/Contents/Resources/app/bin/cursor"),
            ("Visual Studio Code Insiders", "code-insiders", "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders"),
        ]

        var found: [Editor] = []
        for (name, cli, defaultPath) in candidates {
            if let path = findCLI(named: cli, defaultPath: defaultPath) {
                found.append(Editor(name: name, cliPath: path))
            }
        }
        return found
    }

    private static func findCLI(named name: String, defaultPath: String) -> String? {
        let pathsToCheck = [
            defaultPath,
            defaultPath.replacingOccurrences(of: "/Applications/", with: NSHomeDirectory() + "/Applications/"),
        ]

        for path in pathsToCheck {
            if FileManager.default.isExecutableFile(atPath: path) {
                return path
            }
        }

        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/which")
        task.arguments = [name]
        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = FileHandle.nullDevice
        do {
            try task.run()
            task.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            if let path = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines),
               !path.isEmpty,
               FileManager.default.isExecutableFile(atPath: path) {
                return path
            }
        } catch {
            // ignore
        }
        return nil
    }

    static func installExtension(for editor: Editor) -> InstallResult {
        guard let vsixURL = bundledExtensionURL() else {
            return InstallResult(success: false, message: "Prism extension package is missing from the app bundle.")
        }

        let task = Process()
        task.executableURL = URL(fileURLWithPath: editor.cliPath)
        task.arguments = ["--install-extension", vsixURL.path]
        let outputPipe = Pipe()
        let errorPipe = Pipe()
        task.standardOutput = outputPipe
        task.standardError = errorPipe

        do {
            try task.run()
            task.waitUntilExit()
            let output = String(data: outputPipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
            let error = String(data: errorPipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
            if task.terminationStatus == 0 {
                return InstallResult(success: true, message: output.isEmpty ? "Installed." : output)
            } else {
                return InstallResult(success: false, message: error.isEmpty ? output : error)
            }
        } catch {
            return InstallResult(success: false, message: error.localizedDescription)
        }
    }
}
