// PrismAX — read-only macOS Accessibility helpers for locating Claude's
// "working" indicator (the duration/token counter row shown in Cowork & Code).
//
// Nothing here mutates Claude. We only read the AX tree. Detection keys on the
// stable container classes `text-assistant-secondary` + `tabular-nums`, which
// only exist while Claude is actively thinking/streaming and disappear when idle.
#import <Foundation/Foundation.h>
#import <ApplicationServices/ApplicationServices.h>

NS_ASSUME_NONNULL_BEGIN

/// Result of a single detection pass.
@interface PrismDetection : NSObject
@property(nonatomic, assign) BOOL found;
/// Frame of the work-indicator row, in AX coordinates (top-left origin).
@property(nonatomic, assign) CGRect frame;
/// Internal: Cowork has no work row; it shows a bare "Thinking…" status text.
/// Tracked separately and only promoted to `found`/`frame` when no work row
/// exists, so Chat/Code placement is unchanged.
@property(nonatomic, assign) BOOL foundAlt;
@property(nonatomic, assign) CGRect altFrame;
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

/// Debug: dump Claude's full AX tree (role, DOM classes, text, frame) for any
/// element carrying classes or short text. Used to discover new surfaces.
+ (NSString *)dumpClaude;

@end

NS_ASSUME_NONNULL_END
