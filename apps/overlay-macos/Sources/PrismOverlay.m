#import "PrismOverlay.h"
#import "PrismAX.h"
#import <QuartzCore/QuartzCore.h>

#pragma mark - Tunables

static const NSTimeInterval kPollInterval = 0.25;   // detection cadence
static const int kHideAfterMisses = 3;              // debounce flicker
static const int kShowAfterTicks = 4;               // ~1s after thinking begins (per guidelines)
static const int kRotateEveryTicks = 60;            // ~15s ad rotation (refresh-norm aligned; each ad still bills once at 5s dwell)
static const NSInteger kMinDwellMs = 5000;          // viewable-impression threshold
static const CGFloat kPillHeight = 32.0;
static const CGFloat kGlow = 16.0;                  // margin around the pill for the purple glow
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
@property(nonatomic, strong) NSView *pillView;    // the visible pill, inset within the window
@property(nonatomic, strong) NSView *badge;
@property(nonatomic, strong) NSTextField *badgeLabel;
@property(nonatomic, strong) NSImageView *badgeIcon;
@property(nonatomic, copy) NSString *loadedIconUrl;
@property(nonatomic, strong) NSTextField *text;
@end

@implementation PrismOverlayWindow

- (instancetype)initPill {
    CGFloat winH = kPillHeight + 2 * kGlow;
    NSRect r = NSMakeRect(-1000, -1000, 300, winH);
    self = [super initWithContentRect:r styleMask:NSWindowStyleMaskBorderless
                              backing:NSBackingStoreBuffered defer:NO];
    if (!self) return nil;
    self.opaque = NO;
    self.backgroundColor = [NSColor clearColor];
    self.level = NSStatusWindowLevel;
    self.ignoresMouseEvents = NO;
    self.collectionBehavior = NSWindowCollectionBehaviorCanJoinAllSpaces |
                              NSWindowCollectionBehaviorStationary |
                              NSWindowCollectionBehaviorFullScreenAuxiliary;

    // Transparent host fills the whole window; the pill is inset by kGlow so its
    // outer purple glow has room to render (a borderless window clips shadows).
    NSView *host = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, r.size.width, winH)];
    host.wantsLayer = YES;
    self.contentView = host;

    PrismPillView *cv = [[PrismPillView alloc] initWithFrame:NSMakeRect(kGlow, kGlow, r.size.width - 2 * kGlow, kPillHeight)];
    __weak PrismOverlayWindow *weakSelf = self;
    cv.onClick = ^{ if (weakSelf.onClick) weakSelf.onClick(); };
    cv.wantsLayer = YES;
    // Solid dark glass surface (white-on-dark), 10px radius, hairline border.
    // masksToBounds NO so the glow renders past the pill.
    cv.layer.backgroundColor = [NSColor colorWithRed:0.07 green:0.07 blue:0.09 alpha:0.95].CGColor;
    cv.layer.cornerRadius = 10;
    cv.layer.borderWidth = 1;
    cv.layer.borderColor = [NSColor colorWithWhite:1 alpha:0.10].CGColor;
    // Subtle persistent purple glow behind the pill (#8b5cf6).
    cv.layer.shadowColor = [NSColor colorWithRed:0.545 green:0.361 blue:0.965 alpha:1].CGColor;
    cv.layer.shadowOffset = CGSizeZero;
    cv.layer.shadowRadius = 13;
    cv.layer.shadowOpacity = 0.5;
    [host addSubview:cv];
    _pillView = cv;

    // A: brand icon tile — 17×17, radius 5, #8b5cf6 (set per-ad in renderAd).
    _badge = [[NSView alloc] initWithFrame:NSMakeRect(9, 8, 17, 17)];
    _badge.wantsLayer = YES;
    _badge.layer.cornerRadius = 5;
    _badgeLabel = [[NSTextField alloc] initWithFrame:NSMakeRect(0, 1, 17, 15)];
    [self styleField:_badgeLabel];
    _badgeLabel.alignment = NSTextAlignmentCenter;
    _badgeLabel.font = [NSFont boldSystemFontOfSize:10];
    _badgeLabel.textColor = [NSColor whiteColor];
    [_badge addSubview:_badgeLabel];
    // Advertiser icon — shown when the ad has a loadable icon, otherwise we fall
    // back to the coloured initial badge.
    _badgeIcon = [[NSImageView alloc] initWithFrame:NSMakeRect(0, 0, 17, 17)];
    _badgeIcon.imageScaling = NSImageScaleProportionallyUpOrDown;
    _badgeIcon.hidden = YES;
    [_badge addSubview:_badgeIcon];
    [cv addSubview:_badge];

    // 9px left pad + 17px icon + 9px gap = text starts at x=35.
    _text = [[NSTextField alloc] initWithFrame:NSMakeRect(35, 7, 250, 18)];
    [self styleField:_text];
    [cv addSubview:_text];

    [self orderOut:nil];
    return self;
}

- (void)styleField:(NSTextField *)f {
    f.bezeled = NO; f.editable = NO; f.selectable = NO; f.drawsBackground = NO;
}

// Decode an icon from a data: URL (handles base64 and SVG — NSImage renders SVG
// data on macOS 11+).
static NSImage *PrismImageFromDataURL(NSString *s) {
    NSRange comma = [s rangeOfString:@","];
    if (comma.location == NSNotFound) return nil;
    NSString *meta = [s substringToIndex:comma.location];
    NSString *payload = [s substringFromIndex:comma.location + 1];
    NSData *data = [meta containsString:@"base64"]
        ? [[NSData alloc] initWithBase64EncodedString:payload options:NSDataBase64DecodingIgnoreUnknownCharacters]
        : [[payload stringByRemovingPercentEncoding] dataUsingEncoding:NSUTF8StringEncoding];
    if (!data.length) return nil;
    NSImage *img = [[NSImage alloc] initWithData:data];
    return (img && img.size.width > 0) ? img : nil;
}

- (void)showInitialBadge:(NSColor *)color {
    self.badge.layer.backgroundColor = color.CGColor;
    self.badgeIcon.hidden = YES;
    self.badgeIcon.image = nil;
    self.badgeLabel.hidden = NO;
}

- (void)applyBadgeIcon:(NSImage *)img color:(NSColor *)color {
    if (!img) { [self showInitialBadge:color]; return; }
    self.badgeIcon.image = img;
    self.badgeIcon.hidden = NO;
    self.badgeLabel.hidden = YES;
    self.badge.layer.backgroundColor = [NSColor clearColor].CGColor;
}

// Load the advertiser icon into the badge; fall back to the coloured initial.
- (void)loadBadgeIcon:(NSString *)urlStr color:(NSColor *)color {
    if (urlStr.length == 0) { self.loadedIconUrl = nil; [self showInitialBadge:color]; return; }
    if ([urlStr isEqualToString:self.loadedIconUrl]) return;  // already showing this icon
    self.loadedIconUrl = urlStr;
    if ([urlStr hasPrefix:@"data:"]) {
        [self applyBadgeIcon:PrismImageFromDataURL(urlStr) color:color];
    } else if ([urlStr hasPrefix:@"http"]) {
        [self showInitialBadge:color];  // initial until the download lands
        NSURL *u = [NSURL URLWithString:urlStr];
        if (!u) return;
        [[[NSURLSession sharedSession] dataTaskWithURL:u completionHandler:^(NSData *data, NSURLResponse *r, NSError *e) {
            NSImage *img = data.length ? [[NSImage alloc] initWithData:data] : nil;
            if (!(img && img.size.width > 0)) return;
            dispatch_async(dispatch_get_main_queue(), ^{
                if ([urlStr isEqualToString:self.loadedIconUrl]) [self applyBadgeIcon:img color:color];
            });
        }] resume];
    } else {
        [self showInitialBadge:color];
    }
}

- (CGFloat)renderAd:(PrismAd *)ad {
    // The name is advertiser-controlled and may be empty (show only icon + copy).
    NSString *name = ad.advertiserName ?: @"";
    NSString *initialSrc = name.length ? name : (ad.tagline.length ? ad.tagline : @"•");
    self.badgeLabel.stringValue = [[initialSrc substringToIndex:1] uppercaseString];
    [self loadBadgeIcon:ad.iconUrl color:ad.color];

    NSMutableAttributedString *as = [NSMutableAttributedString new];
    // B: advertiser/brand name — semibold 12.5, white. Only when set.
    if (name.length) {
        [as appendAttributedString:[[NSAttributedString alloc] initWithString:name
            attributes:@{ NSForegroundColorAttributeName: [NSColor whiteColor],
                          NSFontAttributeName: [NSFont systemFontOfSize:12.5 weight:NSFontWeightSemibold] }]];
        [as appendAttributedString:[[NSAttributedString alloc] initWithString:@"  " attributes:@{}]];
    }
    // C: CTA / copy — 12.5, muted #cbd5e1, underlined.
    [as appendAttributedString:[[NSAttributedString alloc] initWithString:ad.tagline
        attributes:@{ NSForegroundColorAttributeName: [NSColor colorWithRed:0.796 green:0.835 blue:0.882 alpha:1],
                      NSFontAttributeName: [NSFont systemFontOfSize:12.5],
                      NSUnderlineStyleAttributeName: @(NSUnderlineStyleSingle) }]];
    // D: "Ad" label — JetBrains Mono-style 9, bold, uppercase, muted #64748b, tracked.
    [as appendAttributedString:[[NSAttributedString alloc] initWithString:@"   AD"
        attributes:@{ NSForegroundColorAttributeName: [NSColor colorWithRed:0.392 green:0.455 blue:0.545 alpha:1],
                      NSFontAttributeName: [NSFont monospacedSystemFontOfSize:9 weight:NSFontWeightBold],
                      NSKernAttributeName: @(0.5) }]];
    self.text.attributedStringValue = as;
    [self.text sizeToFit];

    // 32px text origin + text width + 8px right padding.
    CGFloat w = 35 + self.text.frame.size.width + 13;
    NSRect f = self.frame;
    [self setFrame:NSMakeRect(f.origin.x, f.origin.y, w + 2 * kGlow, kPillHeight + 2 * kGlow) display:YES];
    self.pillView.frame = NSMakeRect(kGlow, kGlow, w, kPillHeight);
    return w;
}

// Entrance per the guidelines: slide up + fade in over ~0.7s with one violet glow
// pulse, then it settles static. Called only on the hidden→visible transition.
- (void)animateEntranceAt:(NSPoint)origin {
    [self setFrameOrigin:NSMakePoint(origin.x, origin.y - 6)];
    self.alphaValue = 0;
    [self orderFrontRegardless];

    [NSAnimationContext runAnimationGroup:^(NSAnimationContext *ctx) {
        ctx.duration = 0.7;
        ctx.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseOut];
        self.animator.alphaValue = 1.0;
        [self.animator setFrameOrigin:origin];
    } completionHandler:nil];

    // Glow pulses brighter on entrance, then settles to its resting opacity.
    CABasicAnimation *glow = [CABasicAnimation animationWithKeyPath:@"shadowOpacity"];
    glow.fromValue = @0.95;
    glow.toValue = @0.5;
    glow.duration = 0.9;
    glow.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseOut];
    [self.pillView.layer addAnimation:glow forKey:@"glow"];
}

@end

#pragma mark - PrismController

@interface PrismController ()
@property(nonatomic, strong) PrismOverlayWindow *pill;
@property(nonatomic, strong) PrismAdClient *ads;
@property(nonatomic, strong) PrismAd *currentAd;
@property(nonatomic, strong) NSTimer *timer;
@property(nonatomic, assign) int tick;
@property(nonatomic, assign) int missStreak;
@property(nonatomic, assign) int foundStreak;     // consecutive found polls (entrance delay)
@property(nonatomic, assign) BOOL pillVisible;    // animate entrance only on transition
@property(nonatomic, assign) int lastFetchTick;   // throttle network ad fetches
@property(nonatomic, copy) NSString *currentSource;   // surface of the current view
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
        [_ads refresh:nil];
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

- (void)poll {
    self.tick++;

    // No ads at all without a connected account, when paused, or when untrusted.
    if (self.paused || ![self.ads isConnected] || ![PrismAX isTrustedPrompt:NO]) {
        [self hide];
        return;
    }

    // Scan all supported surfaces (Claude Desktop + terminals), frontmost first.
    PrismDetection *d = [PrismAX detect];
    if (d.found) {
        self.missStreak = 0;
        self.currentSource = d.source;   // surface the impression will be attributed to
        // Hold ~1s after thinking begins before the ad slides in (per guidelines).
        if (++self.foundStreak >= kShowAfterTicks) [self showNextTo:d.frame];
    } else {
        self.foundStreak = 0;
        if (++self.missStreak >= kHideAfterMisses) [self hide];
    }
}

- (void)showNextTo:(CGRect)rowAX {
    BOOL due = (self.tick - self.lastFetchTick) >= kRotateEveryTicks;
    // Rotate/first-fill the displayed ad from the local queue. This is cheap (no
    // network) so it runs every poll while we lack an ad, picking up a freshly
    // prefetched ad within one tick.
    if (!self.currentAd || due) {
        PrismAd *next = [self.ads nextAd];
        if (next) {
            [self flushImpression];       // close out the previous ad's dwell
            self.currentAd = next;
            [self resetDwell];
        }
    }
    // Throttle the network prefetch to at most once per rotation window — even
    // when inventory is empty — so a long work session with no ad (e.g. when ads
    // are frequency-capped) doesn't hammer /api/ads every 0.25s poll and exhaust
    // the per-key rate limit, which would kill the pill on every surface.
    if (due || self.lastFetchTick == 0) {
        self.lastFetchTick = self.tick;
        [self.ads refresh:self.currentSource];
    }
    if (!self.currentAd) { [self hide]; return; }   // connected but no inventory yet
    [self.pill renderAd:self.currentAd];

    // Convert AX (top-left origin) → Cocoa (bottom-left origin). The flip uses the
    // primary screen height, which is correct across multiple monitors.
    NSRect screen = [NSScreen screens].firstObject.frame;
    // Position the VISIBLE pill (the window extends kGlow past it on every side).
    CGFloat pillW = self.pill.frame.size.width - 2 * kGlow;
    CGFloat pillH = kPillHeight;
    // Default: to the right of the anchor. If the anchor is in the right portion of
    // the screen (e.g. Cursor's Stop button at the Composer's right edge) or the pill
    // would spill off-screen, place it to the LEFT instead.
    CGFloat px = rowAX.origin.x + rowAX.size.width + kGapFromRow;
    if (rowAX.origin.x > screen.size.width * 0.65 || px + pillW > screen.size.width - 8) {
        px = rowAX.origin.x - kGapFromRow - pillW;
    }
    CGFloat py = (screen.size.height - rowAX.origin.y) - rowAX.size.height / 2.0 - pillH / 2.0;
    NSPoint origin = NSMakePoint(px - kGlow, py - kGlow);   // window origin (pill inset by kGlow)
    if (!self.pillVisible) {
        self.pillVisible = YES;
        [self.pill animateEntranceAt:origin];   // slide-in + fade + glow
    } else {
        [self.pill setFrameOrigin:origin];
        [self.pill orderFrontRegardless];
    }

    [self accrueDwell];
}

- (void)hide {
    self.pillVisible = NO;
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
        [self.ads reportImpression:self.currentAd durationMs:self.accumulatedMs source:self.currentSource];
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
        [self.ads reportImpression:self.currentAd durationMs:self.accumulatedMs source:self.currentSource];
    }
}

@end
