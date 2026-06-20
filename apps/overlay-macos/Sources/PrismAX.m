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

// The work-indicator row holds the live timer + token count and (in Code/Cowork)
// the thinking verb. It is the only row carrying BOTH of these classes.
static BOOL IsWorkRow(NSString *classes) {
    return classes.length > 0 &&
           [classes containsString:@"tabular-nums"] &&
           [classes containsString:@"text-assistant-secondary"];
}

// Cowork (the VM/agent surface) renders no work row. While the agent generates
// it shows a bare "Thinking…" status text with no DOM classes. We match a short
// status word ending in a horizontal-ellipsis ("Thinking…", "Working…"), which
// avoids matching ordinary message text (paragraphs aren't short, and they use
// "..." rather than the U+2026 ellipsis the indicator uses).
static NSString *AXStringValue(AXUIElementRef el) {
    CFTypeRef v = NULL;
    NSString *r = nil;
    if (AXUIElementCopyAttributeValue(el, kAXValueAttribute, &v) == kAXErrorSuccess && v) {
        if (CFGetTypeID(v) == CFStringGetTypeID()) r = [(__bridge NSString *)v copy];
        CFRelease(v);
    }
    return r ?: @"";
}

static BOOL IsThinkingStatus(NSString *value) {
    return value.length > 0 && value.length <= 16 && [value hasSuffix:@"…"];
}

static void Recurse(AXUIElementRef el, int depth, PrismDetection *out) {
    if (depth > kMaxDepth) return;

    NSString *classes = AXClassList(el);
    if (IsWorkRow(classes)) {
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
        // Cowork fallback: a bare "Thinking…" status text (no DOM classes).
        // Require a real (uncollapsed) frame to skip the 1px duplicate nodes.
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
            Recurse((AXUIElementRef)CFArrayGetValueAtIndex(arr, i), depth + 1, out);
        }
        CFRelease(kids);
    }
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
    // Only print nodes that could anchor detection: those with DOM classes or
    // short text (status verbs, timers, token counts).
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
    if (app) Recurse(app, 0, d);
    // Chat/Code expose a work row (preferred). Cowork has none, so fall back to
    // the "Thinking…" status text only when no work row was found.
    if (!d.found && d.foundAlt) {
        d.found = YES;
        d.frame = d.altFrame;
    }
    return d;
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

@end
