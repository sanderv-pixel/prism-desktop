#import "PrismOverlay.h"
#import "PrismAX.h"

#pragma mark - Tunables

static const NSTimeInterval kPollInterval = 0.25;   // detection cadence
static const int kHideAfterMisses = 3;              // debounce flicker
static const int kRotateEveryTicks = 24;            // ~6s ad rotation
static const NSInteger kMinDwellMs = 5000;          // viewable-impression threshold
static const CGFloat kPillHeight = 28.0;
static const CGFloat kGapFromRow = 10.0;            // px to the right of the row

#pragma mark - PrismPillView (clickable surface)

@interface PrismPillView : NSView
@property(nonatomic, copy, nullable) void (^onClick)(void);
@end

@implementation PrismPillView
- (void)mouseDown:(NSEvent *)event { if (self.onClick) self.onClick(); }
- (void)resetCursorRects { [self addCursorRect:self.bounds cursor:[NSCursor pointingHandCursor]]; }
// Register the click even when the (accessory) app isn't the active one.
- (BOOL)acceptsFirstMouse:(NSEvent *)event { return YES; }
@end

#pragma mark - PrismOverlayWindow

@interface PrismOverlayWindow ()
@property(nonatomic, strong) NSView *badge;
@property(nonatomic, strong) NSTextField *badgeLabel;
@property(nonatomic, strong) NSTextField *text;
@end

@implementation PrismOverlayWindow

- (instancetype)initPill {
    NSRect r = NSMakeRect(-1000, -1000, 300, kPillHeight);
    self = [super initWithContentRect:r styleMask:NSWindowStyleMaskBorderless
                              backing:NSBackingStoreBuffered defer:NO];
    if (!self) return nil;
    self.opaque = NO;
    self.backgroundColor = [NSColor clearColor];
    self.level = NSStatusWindowLevel;
    // The pill itself is clickable (to open the ad); the window is small, so
    // nothing outside the pill is affected.
    self.ignoresMouseEvents = NO;
    self.collectionBehavior = NSWindowCollectionBehaviorCanJoinAllSpaces |
                              NSWindowCollectionBehaviorStationary |
                              NSWindowCollectionBehaviorFullScreenAuxiliary;

    PrismPillView *cv = [[PrismPillView alloc] initWithFrame:NSMakeRect(0, 0, r.size.width, r.size.height)];
    __weak PrismOverlayWindow *weakSelf = self;
    cv.onClick = ^{ if (weakSelf.onClick) weakSelf.onClick(); };
    self.contentView = cv;
    cv.wantsLayer = YES;
    cv.layer.backgroundColor = [NSColor colorWithWhite:0.08 alpha:0.94].CGColor;
    cv.layer.cornerRadius = 8;
    cv.layer.borderWidth = 1;
    cv.layer.borderColor = [NSColor colorWithWhite:1 alpha:0.13].CGColor;

    _badge = [[NSView alloc] initWithFrame:NSMakeRect(9, 6, 16, 16)];
    _badge.wantsLayer = YES;
    _badge.layer.cornerRadius = 4;
    _badgeLabel = [[NSTextField alloc] initWithFrame:NSMakeRect(0, 1, 16, 14)];
    [self styleField:_badgeLabel];
    _badgeLabel.alignment = NSTextAlignmentCenter;
    _badgeLabel.font = [NSFont boldSystemFontOfSize:10];
    _badgeLabel.textColor = [NSColor whiteColor];
    [_badge addSubview:_badgeLabel];
    [cv addSubview:_badge];

    _text = [[NSTextField alloc] initWithFrame:NSMakeRect(31, 5, 250, 18)];
    [self styleField:_text];
    [cv addSubview:_text];

    [self orderOut:nil];
    return self;
}

- (void)styleField:(NSTextField *)f {
    f.bezeled = NO; f.editable = NO; f.selectable = NO; f.drawsBackground = NO;
}

- (CGFloat)renderAd:(PrismAd *)ad {
    self.badge.layer.backgroundColor = ad.color.CGColor;
    self.badgeLabel.stringValue = [[ad.advertiserName substringToIndex:1] uppercaseString];

    NSMutableAttributedString *as = [NSMutableAttributedString new];
    [as appendAttributedString:[[NSAttributedString alloc] initWithString:ad.advertiserName
        attributes:@{ NSForegroundColorAttributeName: [NSColor whiteColor],
                      NSFontAttributeName: [NSFont systemFontOfSize:12 weight:NSFontWeightSemibold] }]];
    [as appendAttributedString:[[NSAttributedString alloc] initWithString:@"  " attributes:@{}]];
    [as appendAttributedString:[[NSAttributedString alloc] initWithString:ad.tagline
        attributes:@{ NSForegroundColorAttributeName: [NSColor colorWithWhite:0.85 alpha:1],
                      NSFontAttributeName: [NSFont systemFontOfSize:12],
                      NSUnderlineStyleAttributeName: @(NSUnderlineStyleSingle) }]];
    [as appendAttributedString:[[NSAttributedString alloc] initWithString:@"   Ad"
        attributes:@{ NSForegroundColorAttributeName: [NSColor colorWithWhite:0.45 alpha:1],
                      NSFontAttributeName: [NSFont boldSystemFontOfSize:9] }]];
    self.text.attributedStringValue = as;
    [self.text sizeToFit];

    CGFloat w = 31 + self.text.frame.size.width + 12;
    NSRect f = self.frame;
    [self setFrame:NSMakeRect(f.origin.x, f.origin.y, w, kPillHeight) display:YES];
    return w;
}

@end

#pragma mark - PrismController

@interface PrismController ()
@property(nonatomic, assign) AXUIElementRef app;
@property(nonatomic, assign) pid_t pid;
@property(nonatomic, strong) PrismOverlayWindow *pill;
@property(nonatomic, strong) PrismAdClient *ads;
@property(nonatomic, strong) PrismAd *currentAd;
@property(nonatomic, strong) NSTimer *timer;
@property(nonatomic, assign) int tick;
@property(nonatomic, assign) int missStreak;
// impression accounting
@property(nonatomic, assign) NSTimeInterval visibleSince;
@property(nonatomic, assign) NSInteger accumulatedMs;
@property(nonatomic, assign) BOOL impressionReported;
@end

@implementation PrismController

- (instancetype)init {
    if ((self = [super init])) {
        _pill = [[PrismOverlayWindow alloc] initPill];
        _ads = [PrismAdClient new];
        __weak PrismController *weakSelf = self;
        _pill.onClick = ^{ [weakSelf handleClick]; };
        [_ads refresh];
    }
    return self;
}

- (void)handleClick {
    if (self.currentAd) [self.ads registerClick:self.currentAd];
}

- (void)start {
    self.timer = [NSTimer scheduledTimerWithTimeInterval:kPollInterval
                                                  target:self selector:@selector(poll)
                                                userInfo:nil repeats:YES];
}

- (void)dealloc {
    if (_app) CFRelease(_app);
}

- (void)ensureConnection {
    if (self.pid != 0 && kill(self.pid, 0) == 0) return;  // still alive
    self.pid = [PrismAX findClaudePid];
    if (self.app) { CFRelease(self.app); self.app = NULL; }
    if (self.pid) self.app = AXUIElementCreateApplication(self.pid);
}

- (void)poll {
    self.tick++;

    if (self.paused || ![PrismAX isTrustedPrompt:NO]) {
        [self hide];
        return;
    }

    [self ensureConnection];
    if (self.app) [PrismAX wakeAccessibility:self.app];  // must run while trusted

    PrismDetection *d = [PrismAX detectWorkRow:self.app];
    if (d.found) {
        self.missStreak = 0;
        [self showNextTo:d.frame];
    } else {
        if (++self.missStreak >= kHideAfterMisses) [self hide];
    }
}

- (void)showNextTo:(CGRect)rowAX {
    // Pick/rotate the ad.
    if (!self.currentAd || (self.tick % kRotateEveryTicks) == 0) {
        [self flushImpression];           // close out the previous ad's dwell
        self.currentAd = [self.ads nextAd];
        [self resetDwell];
        // Prefetch a fresh ad (and a new single-use impression token) for next time.
        [self.ads refresh];
    }
    [self.pill renderAd:self.currentAd];

    // Convert AX (top-left origin) → Cocoa (bottom-left origin). The flip uses the
    // primary screen height, which is correct across multiple monitors.
    CGFloat primaryH = [NSScreen screens].firstObject.frame.size.height;
    CGFloat winH = self.pill.frame.size.height;
    CGFloat x = rowAX.origin.x + rowAX.size.width + kGapFromRow;
    CGFloat y = (primaryH - rowAX.origin.y) - rowAX.size.height / 2.0 - winH / 2.0;
    [self.pill setFrameOrigin:NSMakePoint(x, y)];
    [self.pill orderFrontRegardless];

    [self accrueDwell];
}

- (void)hide {
    [self.pill orderOut:nil];
    [self flushImpression];
    [self resetDwell];
}

#pragma mark - Viewable-impression accounting

- (void)resetDwell {
    self.visibleSince = 0;
    self.accumulatedMs = 0;
    self.impressionReported = NO;
}

- (void)accrueDwell {
    NSTimeInterval now = [NSDate timeIntervalSinceReferenceDate];
    if (self.visibleSince > 0) self.accumulatedMs += (NSInteger)((now - self.visibleSince) * 1000);
    self.visibleSince = now;
    if (!self.impressionReported && self.accumulatedMs >= kMinDwellMs && self.currentAd) {
        self.impressionReported = YES;
        [self.ads reportImpression:self.currentAd durationMs:self.accumulatedMs];
    }
}

- (void)flushImpression {
    if (self.visibleSince > 0) {
        NSTimeInterval now = [NSDate timeIntervalSinceReferenceDate];
        self.accumulatedMs += (NSInteger)((now - self.visibleSince) * 1000);
        self.visibleSince = 0;
    }
    if (!self.impressionReported && self.accumulatedMs >= kMinDwellMs && self.currentAd) {
        self.impressionReported = YES;
        [self.ads reportImpression:self.currentAd durationMs:self.accumulatedMs];
    }
}

@end
