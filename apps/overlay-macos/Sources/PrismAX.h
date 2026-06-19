// PrismAX — read-only macOS Accessibility helpers for locating an AI "working"
// indicator across supported surfaces:
//   • Claude Desktop (Cowork/Code) — the duration/token counter row, keyed on the
//     stable container classes `text-assistant-secondary` + `tabular-nums`.
//   • Terminals (Terminal, iTerm2, Ghostty, Warp, …) running Claude Code CLI — the
//     live status line `<spinner> Verb… (Ns · N tokens)`, located inside the big
//     `AXTextArea` buffer and anchored via `AXBoundsForRange`.
//
// Nothing here mutates any app. We only read the AX tree. Each indicator exists
// only while the AI is actively thinking/streaming and disappears when idle.
#import <Foundation/Foundation.h>
#import <ApplicationServices/ApplicationServices.h>

NS_ASSUME_NONNULL_BEGIN

/// Result of a single detection pass.
@interface PrismDetection : NSObject
@property(nonatomic, assign) BOOL found;
/// Frame of the work-indicator row, in AX coordinates (top-left origin).
@property(nonatomic, assign) CGRect frame;
@end

@interface PrismAX : NSObject

/// PID of the running Claude desktop app, or 0 if not running.
+ (pid_t)findClaudePid;

/// Whether this process is trusted for Accessibility. Pass YES to prompt once.
+ (BOOL)isTrustedPrompt:(BOOL)prompt;

/// Wake Chromium's lazy AX tree for an app element. Must be called while trusted,
/// every pass, or the tree collapses to nothing.
+ (void)wakeAccessibility:(AXUIElementRef)app;

/// Walk the app's AX tree and locate the work-indicator row. Read-only.
+ (PrismDetection *)detectWorkRow:(AXUIElementRef)app;

/// Scan all supported source apps (Claude Desktop + terminals), frontmost first,
/// and return the first active "working" indicator found. Frame is in AX
/// coordinates (top-left origin). Handles waking + per-app detection internally.
+ (PrismDetection *)detect;

@end

NS_ASSUME_NONNULL_END
