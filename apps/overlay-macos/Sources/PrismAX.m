#import "PrismAX.h"
#import <Cocoa/Cocoa.h>

@implementation PrismDetection
@end

// Maximum tree depth we will descend. Claude's tree is well under this.
static const int kMaxDepth = 60;

static NSString *AXClassList(AXUIElementRef el) {
    CFTypeRef v = NULL;
    NSMutableArray *out = [NSMutableArray array];
    if (AXUIElementCopyAttributeValue(el, CFSTR("AXDOMClassList"), &v) == kAXErrorSuccess && v) {
        if (CFGetTypeID(v) == CFArrayGetTypeID()) {
            for (id s in (__bridge NSArray *)v) [out addObject:[s description]];
        }
        CFRelease(v);
    }
    return [out componentsJoinedByString:@" "];
}

static CGRect AXFrameOf(AXUIElementRef el) {
    CGPoint p = CGPointZero;
    CGSize sz = CGSizeZero;
    CFTypeRef pv = NULL, sv = NULL;
    if (AXUIElementCopyAttributeValue(el, kAXPositionAttribute, &pv) == kAXErrorSuccess && pv) {
        AXValueGetValue((AXValueRef)pv, kAXValueCGPointType, &p);
        CFRelease(pv);
    }
    if (AXUIElementCopyAttributeValue(el, kAXSizeAttribute, &sv) == kAXErrorSuccess && sv) {
        AXValueGetValue((AXValueRef)sv, kAXValueCGSizeType, &sz);
        CFRelease(sv);
    }
    return CGRectMake(p.x, p.y, sz.width, sz.height);
}

// Claude (Cowork/Code): the work-indicator row holds the live timer + token count
// and the thinking verb. It is the only row carrying BOTH of these classes.
static BOOL IsClaudeWorkRow(NSString *classes) {
    return [classes containsString:@"tabular-nums"] &&
           [classes containsString:@"text-assistant-secondary"];
}

// Cowork (the VM/agent surface) renders no work row. While the agent generates it
// shows a bare "Thinking…" status text with no DOM classes. Match a short word
// ending in a horizontal-ellipsis ("Thinking…"); ordinary message text is longer
// and uses "..." rather than the U+2026 ellipsis the indicator uses.
static NSString *AXStringValue(AXUIElementRef el);   // defined in the terminal section
static BOOL IsThinkingStatus(NSString *value) {
    return value.length > 0 && value.length <= 16 && [value hasSuffix:@"…"];
}

// Does any element in this subtree carry a class containing `needle`?
static BOOL AXSubtreeHasClass(AXUIElementRef el, NSString *needle, int depth) {
    if (depth > 8) return NO;
    if ([AXClassList(el) containsString:needle]) return YES;
    CFTypeRef kids = NULL;
    BOOL found = NO;
    if (AXUIElementCopyAttributeValue(el, kAXChildrenAttribute, &kids) == kAXErrorSuccess && kids) {
        CFArrayRef arr = (CFArrayRef)kids;
        for (CFIndex i = 0; i < CFArrayGetCount(arr) && !found; i++) {
            found = AXSubtreeHasClass((AXUIElementRef)CFArrayGetValueAtIndex(arr, i), needle, depth + 1);
        }
        CFRelease(kids);
    }
    return found;
}

// Cursor: the Composer's send control (class `sendButton_<hash>`) becomes the STOP
// button for the entire duration of a turn (thinking + streaming). In the Send
// (idle) state it contains a `sendIcon_<hash>` image; in the Stop (generating)
// state that icon is gone. So `sendButton_` present WITHOUT `sendIcon_` == working.
// This is stable and well-placed (bottom-right of the Composer), unlike the brief
// `thinking_` element that only flashes at the top during the pre-stream phase.
static void FindCursorStop(AXUIElementRef el, int depth, PrismDetection *out) {
    if (depth > kMaxDepth || out.found) return;
    if ([AXClassList(el) containsString:@"sendButton"]) {
        if (!AXSubtreeHasClass(el, @"sendIcon", 0)) {   // no send arrow => Stop => generating
            CGRect f = AXFrameOf(el);
            if (f.size.width > 0 && f.size.height > 0) { out.found = YES; out.frame = f; }
        }
        return;  // the send/stop button is unique; don't descend further
    }
    CFTypeRef kids = NULL;
    if (AXUIElementCopyAttributeValue(el, kAXChildrenAttribute, &kids) == kAXErrorSuccess && kids) {
        CFArrayRef arr = (CFArrayRef)kids;
        for (CFIndex i = 0; i < CFArrayGetCount(arr) && !out.found; i++) {
            FindCursorStop((AXUIElementRef)CFArrayGetValueAtIndex(arr, i), depth + 1, out);
        }
        CFRelease(kids);
    }
}

// Walk an Electron/Chromium app's AX tree for the narrowest small element whose
// AXDOMClassList satisfies `classMatch` (the active work indicator). Frame is only
// fetched on a class hit, keeping the per-node cost to one attribute read.
static void RecurseClass(AXUIElementRef el, int depth, PrismDetection *out, BOOL (^classMatch)(NSString *)) {
    if (depth > kMaxDepth) return;

    NSString *classes = AXClassList(el);
    if (classes.length > 0 && classMatch(classes)) {
        CGRect f = AXFrameOf(el);
        // Sanity bounds: a single status row, not a big container.
        if (f.size.width > 0 && f.size.height > 0 && f.size.height < 60 && f.size.width < 420) {
            // Prefer the narrowest match (the tightest, most specific row).
            if (!out.found || f.size.width < out.frame.size.width) {
                out.found = YES;
                out.frame = f;
            }
        }
    } else if (classes.length == 0) {
        // Cowork fallback: a bare "Thinking…" status text (no DOM classes). Require
        // a real (uncollapsed) frame to skip the 1px duplicate nodes.
        if (IsThinkingStatus(AXStringValue(el))) {
            CGRect f = AXFrameOf(el);
            if (f.size.width > 0 && f.size.width < 200 && f.size.height >= 10 && f.size.height < 60) {
                if (!out.foundAlt || f.size.width < out.altFrame.size.width) {
                    out.foundAlt = YES;
                    out.altFrame = f;
                }
            }
        }
    }

    CFTypeRef kids = NULL;
    if (AXUIElementCopyAttributeValue(el, kAXChildrenAttribute, &kids) == kAXErrorSuccess && kids) {
        CFArrayRef arr = (CFArrayRef)kids;
        for (CFIndex i = 0; i < CFArrayGetCount(arr); i++) {
            RecurseClass((AXUIElementRef)CFArrayGetValueAtIndex(arr, i), depth + 1, out, classMatch);
        }
        CFRelease(kids);
    }
}

static PrismDetection *DetectCursorGenerating(AXUIElementRef app) {
    PrismDetection *d = [PrismDetection new];
    if (app) FindCursorStop(app, 0, d);
    return d;
}

// Codex desktop app (Electron): while the agent works it renders its status
// ("Thinking", "Working for Ns") inside a shimmer-animated container carrying the
// stable class `loading-shimmer-pure-text`. That class is present only while the
// agent is actively working and disappears when it settles to "Worked for Ns".
static PrismDetection *DetectCodexGenerating(AXUIElementRef app) {
    PrismDetection *d = [PrismDetection new];
    if (app) RecurseClass(app, 0, d, ^BOOL(NSString *c) {
        return [c containsString:@"loading-shimmer"];
    });
    return d;
}

#pragma mark - Terminal (Claude Code CLI) detection

static NSString *AXRole(AXUIElementRef el) {
    CFTypeRef v = NULL;
    NSString *s = @"";
    if (AXUIElementCopyAttributeValue(el, kAXRoleAttribute, &v) == kAXErrorSuccess && v) {
        if (CFGetTypeID(v) == CFStringGetTypeID()) s = [(__bridge NSString *)v copy];
        CFRelease(v);
    }
    return s;
}

static NSString *AXStringValue(AXUIElementRef el) {
    CFTypeRef v = NULL;
    NSString *s = @"";
    if (AXUIElementCopyAttributeValue(el, kAXValueAttribute, &v) == kAXErrorSuccess && v) {
        if (CFGetTypeID(v) == CFStringGetTypeID()) s = [(__bridge NSString *)v copy];
        CFRelease(v);
    }
    return s;
}

// The terminal buffer is exposed as one large AXTextArea; pick the one with the
// longest value (the main scrollback, not a small accessory field). Retains the
// winner — caller must CFRelease it.
static void FindBestTextArea(AXUIElementRef el, int depth, AXUIElementRef *best, NSUInteger *bestLen) {
    if (depth > kMaxDepth) return;
    if ([AXRole(el) isEqualToString:(__bridge NSString *)kAXTextAreaRole]) {
        NSUInteger len = AXStringValue(el).length;
        if (len > *bestLen) {
            if (*best) CFRelease(*best);
            *best = (AXUIElementRef)CFRetain(el);
            *bestLen = len;
        }
    }
    CFTypeRef kids = NULL;
    if (AXUIElementCopyAttributeValue(el, kAXChildrenAttribute, &kids) == kAXErrorSuccess && kids) {
        CFArrayRef arr = (CFArrayRef)kids;
        for (CFIndex i = 0; i < CFArrayGetCount(arr); i++) {
            FindBestTextArea((AXUIElementRef)CFArrayGetValueAtIndex(arr, i), depth + 1, best, bestLen);
        }
        CFRelease(kids);
    }
}

// Range of the bottom-most live status line, e.g. "✻ Scurrying… (10s · ↓ 449 tokens)".
// The "(Ns · … tokens)" group is unique to an actively running Claude Code turn and
// is cleared when idle, so its presence is the "is working" signal. Returns the full
// line range (for AXBoundsForRange), or {NSNotFound,0}.
static NSRange WorkingLineRange(NSString *value) {
    if (value.length == 0) return NSMakeRange(NSNotFound, 0);
    static NSRegularExpression *re;
    static dispatch_once_t once;
    dispatch_once(&once, ^{
        re = [NSRegularExpression regularExpressionWithPattern:@"\\(\\d+s[^)]*tokens?\\)"
                                                       options:0 error:nil];
    });
    __block NSRange best = NSMakeRange(NSNotFound, 0);
    [re enumerateMatchesInString:value options:0 range:NSMakeRange(0, value.length)
                      usingBlock:^(NSTextCheckingResult *m, NSMatchingFlags f, BOOL *stop) {
        NSRange line = [value lineRangeForRange:m.range];           // expand to whole line
        while (line.length > 0 && [value characterAtIndex:NSMaxRange(line) - 1] == '\n') line.length--;
        best = line;                                                // keep the last (bottom-most) match
    }];
    return best;
}

// Pixel rect of a character range inside a text element (top-left AX origin).
static CGRect AXBoundsForCharRange(AXUIElementRef el, NSRange r) {
    CFRange cr = CFRangeMake((CFIndex)r.location, (CFIndex)r.length);
    AXValueRef rv = AXValueCreate(kAXValueCFRangeType, &cr);
    CGRect rect = CGRectNull;
    CFTypeRef b = NULL;
    if (AXUIElementCopyParameterizedAttributeValue(
            el, kAXBoundsForRangeParameterizedAttribute, rv, &b) == kAXErrorSuccess && b) {
        AXValueGetValue((AXValueRef)b, kAXValueCGRectType, &rect);
        CFRelease(b);
    }
    if (rv) CFRelease(rv);
    return rect;
}

static PrismDetection *DetectTerminalThinking(AXUIElementRef app) {
    PrismDetection *d = [PrismDetection new];
    AXUIElementRef ta = NULL;
    NSUInteger len = 0;
    FindBestTextArea(app, 0, &ta, &len);
    if (!ta) return d;

    NSRange line = WorkingLineRange(AXStringValue(ta));
    if (line.location != NSNotFound) {
        CGRect rect = AXBoundsForCharRange(ta, line);
        CGFloat primaryH = [NSScreen screens].firstObject.frame.size.height;
        // Require a sane, on-screen line (scrolled-off lines have negative / >screen Y).
        if (!CGRectIsNull(rect) && rect.size.width > 0 && rect.size.height > 0 &&
            rect.origin.y >= 0 && rect.origin.y <= primaryH) {
            d.found = YES;
            d.frame = rect;
        }
    }
    CFRelease(ta);
    return d;
}

#pragma mark - Source apps

typedef NS_ENUM(NSInteger, PrismSourceKind) { PrismSourceNone = 0, PrismSourceClaude, PrismSourceCursor, PrismSourceTerminal, PrismSourceCodex };

static PrismSourceKind SourceKindForBundle(NSString *bundleId) {
    if ([bundleId isEqualToString:@"com.anthropic.claudefordesktop"]) return PrismSourceClaude;
    if ([bundleId isEqualToString:@"com.todesktop.230313mzl4w4u92"]) return PrismSourceCursor;
    if ([bundleId isEqualToString:@"com.openai.codex"]) return PrismSourceCodex;
    static NSSet *terminals;
    static dispatch_once_t once;
    dispatch_once(&once, ^{
        terminals = [NSSet setWithArray:@[
            @"com.apple.Terminal", @"com.googlecode.iterm2", @"com.mitchellh.ghostty",
            @"dev.warp.Warp-Stable", @"com.github.wez.wezterm", @"net.kovidgoyal.kitty",
            @"co.zeit.hyper", @"io.alacritty",
        ]];
    });
    return (bundleId && [terminals containsObject:bundleId]) ? PrismSourceTerminal : PrismSourceNone;
}

// --- Debug tree dump (discovery of new surfaces) ---------------------------

static NSString *AXStr(AXUIElementRef el, CFStringRef attr) {
    CFTypeRef v = NULL;
    NSString *r = @"";
    if (AXUIElementCopyAttributeValue(el, attr, &v) == kAXErrorSuccess && v) {
        if (CFGetTypeID(v) == CFStringGetTypeID()) r = [(__bridge NSString *)v copy];
        CFRelease(v);
    }
    return r;
}

static void DumpRecurse(AXUIElementRef el, int depth, NSMutableString *out) {
    if (depth > kMaxDepth) return;

    NSString *cls = AXClassList(el);
    NSString *role = AXStr(el, kAXRoleAttribute);
    NSString *val = AXStr(el, kAXValueAttribute);
    NSString *title = AXStr(el, kAXTitleAttribute);
    NSString *desc = AXStr(el, kAXDescriptionAttribute);
    NSString *text = val.length ? val : (title.length ? title : desc);
    if (text.length > 80) text = [text substringToIndex:80];
    if (cls.length || (text.length && text.length <= 80)) {
        CGRect f = AXFrameOf(el);
        [out appendFormat:@"%*s%@ cls={%@} '%@' @%.0f,%.0f %.0fx%.0f\n",
            depth * 2, "", role, cls, text, f.origin.x, f.origin.y, f.size.width, f.size.height];
    }

    CFTypeRef kids = NULL;
    if (AXUIElementCopyAttributeValue(el, kAXChildrenAttribute, &kids) == kAXErrorSuccess && kids) {
        CFArrayRef arr = (CFArrayRef)kids;
        for (CFIndex i = 0; i < CFArrayGetCount(arr); i++) {
            DumpRecurse((AXUIElementRef)CFArrayGetValueAtIndex(arr, i), depth + 1, out);
        }
        CFRelease(kids);
    }
}

@implementation PrismAX

+ (pid_t)findClaudePid {
    for (NSRunningApplication *a in [NSWorkspace sharedWorkspace].runningApplications) {
        if ([a.bundleIdentifier isEqualToString:@"com.anthropic.claudefordesktop"]) {
            return a.processIdentifier;
        }
    }
    return 0;
}

+ (BOOL)isTrustedPrompt:(BOOL)prompt {
    NSDictionary *opts = @{ (__bridge NSString *)kAXTrustedCheckOptionPrompt: @(prompt) };
    return AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)opts);
}

+ (void)wakeAccessibility:(AXUIElementRef)app {
    if (!app) return;
    AXUIElementSetAttributeValue(app, CFSTR("AXManualAccessibility"), kCFBooleanTrue);
    AXUIElementSetAttributeValue(app, CFSTR("AXEnhancedUserInterface"), kCFBooleanTrue);
}

+ (PrismDetection *)detectWorkRow:(AXUIElementRef)app {
    PrismDetection *d = [PrismDetection new];
    if (app) RecurseClass(app, 0, d, ^BOOL(NSString *c) { return IsClaudeWorkRow(c); });
    // Chat/Code expose a work row (preferred). Cowork has none, so fall back to the
    // "Thinking…" status text only when no work row was found.
    if (!d.found && d.foundAlt) {
        d.found = YES;
        d.frame = d.altFrame;
    }
    return d;
}

+ (PrismDetection *)detect {
    // Only look at the FRONTMOST app. The ad anchors to the indicator the user is
    // actually looking at; a background app's indicator (e.g. Claude Desktop working
    // while you're in Cursor) must never float a pill over the foreground window.
    NSRunningApplication *front = [NSWorkspace sharedWorkspace].frontmostApplication;
    PrismSourceKind kind = SourceKindForBundle(front.bundleIdentifier);
    if (kind == PrismSourceNone) return [PrismDetection new];

    AXUIElementRef app = AXUIElementCreateApplication(front.processIdentifier);
    [self wakeAccessibility:app];  // no-op for non-Chromium apps; required for Claude/Cursor
    PrismDetection *d = nil;
    switch (kind) {
        case PrismSourceClaude:   d = [self detectWorkRow:app]; break;
        case PrismSourceCursor:   d = DetectCursorGenerating(app); break;
        case PrismSourceTerminal: d = DetectTerminalThinking(app); break;
        case PrismSourceCodex:    d = DetectCodexGenerating(app); break;
        default: break;
    }
    CFRelease(app);
    return d ?: [PrismDetection new];
}

+ (NSString *)dumpClaude {
    pid_t pid = [self findClaudePid];
    if (!pid) return @"(claude not running)\n";
    AXUIElementRef app = AXUIElementCreateApplication(pid);
    [self wakeAccessibility:app];
    NSMutableString *out = [NSMutableString string];
    DumpRecurse(app, 0, out);
    CFRelease(app);
    return out;
}

+ (NSString *)dumpFront {
    NSRunningApplication *front = [NSWorkspace sharedWorkspace].frontmostApplication;
    if (!front) return @"(no frontmost app)\n";
    AXUIElementRef app = AXUIElementCreateApplication(front.processIdentifier);
    [self wakeAccessibility:app];
    NSMutableString *out = [NSMutableString stringWithFormat:@"=== %@ (%@) ===\n",
                            front.localizedName, front.bundleIdentifier];
    DumpRecurse(app, 0, out);
    CFRelease(app);
    return out;
}

+ (NSString *)dumpFrontText {
    NSRunningApplication *front = [NSWorkspace sharedWorkspace].frontmostApplication;
    if (!front) return @"(no frontmost app)\n";
    AXUIElementRef app = AXUIElementCreateApplication(front.processIdentifier);
    [self wakeAccessibility:app];
    AXUIElementRef ta = NULL;
    NSUInteger len = 0;
    FindBestTextArea(app, 0, &ta, &len);
    NSString *value = @"(no AXTextArea found)";
    if (ta) { value = AXStringValue(ta); CFRelease(ta); }
    CFRelease(app);
    // The live status line sits at the bottom — keep only the last lines.
    NSArray<NSString *> *lines = [value componentsSeparatedByString:@"\n"];
    NSUInteger keep = 24;
    if (lines.count > keep) lines = [lines subarrayWithRange:NSMakeRange(lines.count - keep, keep)];
    return [NSString stringWithFormat:@"=== %@ (%@) textlen=%lu ===\n%@\n",
            front.localizedName, front.bundleIdentifier, (unsigned long)len,
            [lines componentsJoinedByString:@"\n"]];
}

@end
