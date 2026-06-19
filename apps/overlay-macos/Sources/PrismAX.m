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

// Cursor: the "Thinking/Generating" indicator is a CSS-module class
// "thinking_<hash>" / "thinkingV2_<hash>". The hash changes per build, so key on
// the stable prefix. It exists only while generating and disappears when idle.
static BOOL IsCursorThinking(NSString *classes) {
    NSString *low = classes.lowercaseString;
    return [low containsString:@"thinking_"] || [low containsString:@"thinkingv2"];
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

static PrismDetection *DetectCursorThinking(AXUIElementRef app) {
    PrismDetection *d = [PrismDetection new];
    if (app) RecurseClass(app, 0, d, ^BOOL(NSString *c) { return IsCursorThinking(c); });
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

typedef NS_ENUM(NSInteger, PrismSourceKind) { PrismSourceNone = 0, PrismSourceClaude, PrismSourceCursor, PrismSourceTerminal };

static PrismSourceKind SourceKindForBundle(NSString *bundleId) {
    if ([bundleId isEqualToString:@"com.anthropic.claudefordesktop"]) return PrismSourceClaude;
    if ([bundleId isEqualToString:@"com.todesktop.230313mzl4w4u92"]) return PrismSourceCursor;
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
    return d;
}

+ (PrismDetection *)detect {
    NSWorkspace *ws = [NSWorkspace sharedWorkspace];
    pid_t frontPid = ws.frontmostApplication.processIdentifier;

    // Collect supported source apps, frontmost first (so the ad follows attention).
    NSMutableArray<NSRunningApplication *> *sources = [NSMutableArray array];
    for (NSRunningApplication *a in ws.runningApplications) {
        if (a.activationPolicy != NSApplicationActivationPolicyRegular) continue;
        if (SourceKindForBundle(a.bundleIdentifier) == PrismSourceNone) continue;
        if (a.processIdentifier == frontPid) [sources insertObject:a atIndex:0];
        else [sources addObject:a];
    }

    for (NSRunningApplication *a in sources) {
        AXUIElementRef app = AXUIElementCreateApplication(a.processIdentifier);
        [self wakeAccessibility:app];  // no-op for non-Chromium apps; required for Claude
        PrismDetection *d = nil;
        switch (SourceKindForBundle(a.bundleIdentifier)) {
            case PrismSourceClaude:   d = [self detectWorkRow:app]; break;
            case PrismSourceCursor:   d = DetectCursorThinking(app); break;
            case PrismSourceTerminal: d = DetectTerminalThinking(app); break;
            default: break;
        }
        CFRelease(app);
        if (d.found) return d;
    }
    return [PrismDetection new];
}

@end
