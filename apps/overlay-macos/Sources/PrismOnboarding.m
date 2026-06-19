#import "PrismOnboarding.h"
#import <ApplicationServices/ApplicationServices.h>

static NSString *const kDoneKey = @"PrismOnboardingDone";
static NSString *const kApiKeyKey = @"PrismApiKey";

@interface PrismOnboarding ()
@property(strong) NSWindow *window;
@property(strong) NSTextField *axStatus;
@property(strong) NSButton *axButton;
@property(strong) NSTextField *keyField;
@property(strong) NSTextField *keyStatus;
@property(strong) NSTimer *timer;
@end

@implementation PrismOnboarding

+ (BOOL)shouldShowOnLaunch {
    if (!AXIsProcessTrusted()) return YES;
    return ![[NSUserDefaults standardUserDefaults] boolForKey:kDoneKey];
}

- (instancetype)init {
    if ((self = [super init])) [self build];
    return self;
}

#pragma mark - View helpers

- (NSTextField *)label:(NSString *)s frame:(NSRect)f size:(CGFloat)sz weight:(NSFontWeight)w color:(NSColor *)c {
    NSTextField *t = [[NSTextField alloc] initWithFrame:f];
    t.bezeled = NO; t.editable = NO; t.selectable = NO; t.drawsBackground = NO;
    t.stringValue = s; t.font = [NSFont systemFontOfSize:sz weight:w]; t.textColor = c;
    t.lineBreakMode = NSLineBreakByWordWrapping; [t.cell setWraps:YES];
    return t;
}

- (NSView *)card:(NSRect)f {
    NSView *v = [[NSView alloc] initWithFrame:f];
    v.wantsLayer = YES;
    v.layer.backgroundColor = [NSColor colorWithWhite:0.5 alpha:0.06].CGColor;
    v.layer.cornerRadius = 10;
    v.layer.borderWidth = 1;
    v.layer.borderColor = [NSColor colorWithWhite:0.5 alpha:0.12].CGColor;
    return v;
}

- (NSButton *)button:(NSString *)title frame:(NSRect)f action:(SEL)sel {
    NSButton *b = [[NSButton alloc] initWithFrame:f];
    b.title = title; b.bezelStyle = NSBezelStyleRounded; b.target = self; b.action = sel;
    return b;
}

- (void)build {
    self.window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 480, 440)
        styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable
        backing:NSBackingStoreBuffered defer:NO];
    self.window.title = @"Welcome to Prism";
    self.window.releasedWhenClosed = NO;
    NSView *cv = self.window.contentView;

    [cv addSubview:[self label:@"Prism" frame:NSMakeRect(28, 392, 424, 30) size:24 weight:NSFontWeightBold color:NSColor.labelColor]];
    [cv addSubview:[self label:@"Earn while Claude works." frame:NSMakeRect(28, 368, 424, 20) size:13 weight:NSFontWeightRegular color:NSColor.secondaryLabelColor]];
    [cv addSubview:[self label:@"Prism shows one small sponsored line next to Claude's activity — only while it's working, never otherwise. It reads the macOS Accessibility tree to place the line and never modifies Claude."
        frame:NSMakeRect(28, 300, 424, 58) size:12 weight:NSFontWeightRegular color:NSColor.secondaryLabelColor]];

    // 1 — Accessibility
    [cv addSubview:[self card:NSMakeRect(24, 196, 432, 92)]];
    [cv addSubview:[self label:@"1.  Enable Prism" frame:NSMakeRect(40, 256, 300, 18) size:13 weight:NSFontWeightSemibold color:NSColor.labelColor]];
    self.axStatus = [self label:@"" frame:NSMakeRect(40, 230, 280, 18) size:12 weight:NSFontWeightRegular color:NSColor.secondaryLabelColor];
    [cv addSubview:self.axStatus];
    self.axButton = [self button:@"Enable" frame:NSMakeRect(330, 234, 108, 30) action:@selector(enableAX)];
    [cv addSubview:self.axButton];
    [cv addSubview:[self label:@"Grants Accessibility — the one permission Prism needs." frame:NSMakeRect(40, 206, 390, 16) size:11 weight:NSFontWeightRegular color:NSColor.tertiaryLabelColor]];

    // 2 — Account (optional)
    [cv addSubview:[self card:NSMakeRect(24, 72, 432, 108)]];
    [cv addSubview:[self label:@"2.  Connect your account  (optional)" frame:NSMakeRect(40, 148, 360, 18) size:13 weight:NSFontWeightSemibold color:NSColor.labelColor]];
    [cv addSubview:[self button:@"Open Prism" frame:NSMakeRect(330, 126, 108, 28) action:@selector(openDashboard)]];
    self.keyField = [[NSTextField alloc] initWithFrame:NSMakeRect(40, 98, 286, 24)];
    [self.keyField.cell setPlaceholderString:@"Paste your Prism key"];
    [cv addSubview:self.keyField];
    [cv addSubview:[self button:@"Save key" frame:NSMakeRect(334, 96, 104, 28) action:@selector(saveKey)]];
    self.keyStatus = [self label:@"No account? Prism runs on demo ads until you connect one." frame:NSMakeRect(40, 78, 396, 16) size:11 weight:NSFontWeightRegular color:NSColor.tertiaryLabelColor];
    [cv addSubview:self.keyStatus];

    NSButton *done = [self button:@"Done" frame:NSMakeRect(360, 20, 96, 32) action:@selector(finish)];
    done.keyEquivalent = @"\r";
    [cv addSubview:done];

    [self refreshStatus];
}

#pragma mark - Lifecycle

- (void)show {
    NSString *saved = [[NSUserDefaults standardUserDefaults] stringForKey:kApiKeyKey];
    if (saved.length) self.keyField.stringValue = saved;
    [self refreshStatus];
    [self.window center];
    [NSApp activateIgnoringOtherApps:YES];
    [self.window makeKeyAndOrderFront:nil];
    if (!self.timer) {
        self.timer = [NSTimer scheduledTimerWithTimeInterval:0.5 target:self
                                                    selector:@selector(refreshStatus) userInfo:nil repeats:YES];
    }
}

- (void)refreshStatus {
    if (AXIsProcessTrusted()) {
        self.axStatus.stringValue = @"✓ Enabled";
        self.axStatus.textColor = [NSColor systemGreenColor];
        self.axButton.enabled = NO;
        self.axButton.title = @"Enabled";
    } else {
        self.axStatus.stringValue = @"Not enabled yet";
        self.axStatus.textColor = NSColor.secondaryLabelColor;
        self.axButton.enabled = YES;
        self.axButton.title = @"Enable";
    }
}

#pragma mark - Actions

- (void)enableAX {
    NSDictionary *opt = @{ (__bridge NSString *)kAXTrustedCheckOptionPrompt: @YES };
    AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)opt);
    [[NSWorkspace sharedWorkspace] openURL:
        [NSURL URLWithString:@"x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"]];
}

- (void)openDashboard {
    [[NSWorkspace sharedWorkspace] openURL:[NSURL URLWithString:@"https://goprism.dev/dashboard"]];
}

- (void)saveKey {
    NSString *k = [self.keyField.stringValue stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
    [[NSUserDefaults standardUserDefaults] setObject:k forKey:kApiKeyKey];
    if (k.length) {
        self.keyStatus.stringValue = @"✓ Key saved — live ads enabled.";
        self.keyStatus.textColor = [NSColor systemGreenColor];
    } else {
        self.keyStatus.stringValue = @"Key cleared — using demo ads.";
        self.keyStatus.textColor = NSColor.tertiaryLabelColor;
    }
}

- (void)finish {
    [[NSUserDefaults standardUserDefaults] setBool:YES forKey:kDoneKey];
    [self.timer invalidate];
    self.timer = nil;
    [self.window close];
}

@end
