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
    return d;
}

@end
