#import "PrismOverlay.h"
#import "PrismAX.h"
#import "PrismPanel.h"
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
static const int kNotVisibleAlertTicks = 24;        // ~6s of "should be showing but isn't" => guide a re-grant

// Expanded ad panel feature flag. Default OFF (prod-safe); opt in for dev via
// env PRISM_ADPILL_EXPANDED=1 or `defaults write dev.goprism.overlay PrismAdPillExpanded -bool YES`.
// When off, the panel window is never created and the resting pill is identical.
static BOOL PrismAdPillExpandedEnabled(void) {
    NSString *env = NSProcessInfo.processInfo.environment[@"PRISM_ADPILL_EXPANDED"];
    if ([env isEqualToString:@"1"]) return YES;
    if ([env isEqualToString:@"0"]) return NO;
    if ([[NSUserDefaults standardUserDefaults] objectForKey:@"PrismAdPillExpanded"] != nil)
        return [[NSUserDefaults standardUserDefaults] boolForKey:@"PrismAdPillExpanded"];
#ifdef DEBUG
    return YES;
#else
    return NO;
#endif
}

#pragma mark - PrismPillView (clickable surface)

@interface PrismPillView : NSView
@property(nonatomic, copy, nullable) void (^onClick)(void);
@property(nonatomic, copy, nullable) void (^onHoverEnter)(void);
@property(nonatomic, copy, nullable) void (^onHoverExit)(void);
@property(nonatomic, strong) NSTrackingArea *hoverArea;
@end

@implementation PrismPillView
- (void)mouseDown:(NSEvent *)event { if (self.onClick) self.onClick(); }
- (void)resetCursorRects { [self addCursorRect:self.bounds cursor:[NSCursor pointingHandCursor]]; }
// Register the click even when the (accessory) app isn't the active one.
- (BOOL)acceptsFirstMouse:(NSEvent *)event { return YES; }
// Hover tracking for the expanded panel (additive; does not alter the pill itself).
- (void)updateTrackingAreas {
    [super updateTrackingAreas];
    if (self.hoverArea) [self removeTrackingArea:self.hoverArea];
    self.hoverArea = [[NSTrackingArea alloc] initWithRect:self.bounds
                                                  options:(NSTrackingMouseEnteredAndExited | NSTrackingActiveAlways)
                                                    owner:self userInfo:nil];
    [self addTrackingArea:self.hoverArea];
}
- (void)mouseEntered:(NSEvent *)event { if (self.onHoverEnter) self.onHoverEnter(); }
- (void)mouseExited:(NSEvent *)event { if (self.onHoverExit) self.onHoverExit(); }
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
    cv.onHoverEnter = ^{ if (weakSelf.onHoverEnter) weakSelf.onHoverEnter(); };
    cv.onHoverExit = ^{ if (weakSelf.onHoverExit) weakSelf.onHoverExit(); };
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
@property(nonatomic, assign) NSTimeInterval lastBeatTime;   // anti-bot heartbeat cadence
// Render-health: detect "we think we're showing but the window isn't on screen"
// (e.g. screen access dropped after an app update) and guide a re-grant.
@property(nonatomic, assign) int notVisibleStreak;
@property(nonatomic, assign) NSTimeInterval lastReauthPrompt;
@property(nonatomic, assign) BOOL promptedThisEpisode;
- (void)requestReauthorizationOncePerEpisode;
// Expanded panel (nil + inert when the feature flag is off).
@property(nonatomic, strong, nullable) PrismPanelWindow *panel;
@property(nonatomic, assign) BOOL expandedEnabled;
@property(nonatomic, assign) BOOL panelPinned;        // pinned panels survive mouse-leave
@property(nonatomic, assign) int dismissGen;          // cancels a scheduled hover-dismiss
@property(nonatomic, strong, nullable) id escMonitor; // Esc / click-outside dismissal
@end

@implementation PrismController

- (instancetype)init {
    if ((self = [super init])) {
        _pill = [[PrismOverlayWindow alloc] initPill];
        _ads = [PrismAdClient new];
        __weak PrismController *weakSelf = self;
        _pill.onClick = ^{ [weakSelf handleClick]; };

        _expandedEnabled = PrismAdPillExpandedEnabled();
        if (_expandedEnabled) [self setUpExpandedPanel];

        [_ads refresh:nil];
    }
    return self;
}

// Build the expanded panel + wire hover, dismissal, and control callbacks. All of
// this is additive UI; it never reports impressions, beats, or rotates ads.
- (void)setUpExpandedPanel {
    __weak PrismController *weakSelf = self;
    self.panel = [[PrismPanelWindow alloc] initPanel];

    // Hover the pill -> show; leave -> schedule a dismiss the panel can cancel by
    // being entered (so crossing the pill -> panel gap does not flicker it closed).
    self.pill.onHoverEnter = ^{ PrismController *s = weakSelf; [s cancelScheduledDismiss]; [s showPanel]; };
    self.pill.onHoverExit  = ^{ [weakSelf scheduleDismiss]; };
    self.panel.onMouseEntered = ^{ [weakSelf cancelScheduledDismiss]; };
    self.panel.onMouseExited  = ^{ [weakSelf scheduleDismiss]; };

    // Controls. Each pins the panel so an accidental mouse-leave does not close it
    // mid-interaction; Esc / click-outside dismisses. Bodies carry no user content.
    self.panel.onFeedback = ^(NSString *signal) {
        PrismController *s = weakSelf; if (!s) return;
        s.panelPinned = YES;
        if (s.currentAd.adId.length) [s.ads sendFeedbackForCampaign:s.currentAd.adId signal:signal];
    };
    self.panel.onTogglePause = ^(BOOL paused) {
        PrismController *s = weakSelf; if (!s) return;
        s.paused = paused;                  // reuses the existing poll gate
        if (paused) [s dismissPanel];       // no ads this session; pill hides next poll
    };
    self.panel.onSave = ^{ [weakSelf saveCurrentAd]; };
    self.panel.onCopyCode = ^(NSString *code) {
        PrismController *s = weakSelf; if (!s) return;
        s.panelPinned = YES;
        NSPasteboard *pb = [NSPasteboard generalPasteboard];
        [pb clearContents];
        [pb setString:code forType:NSPasteboardTypeString];
    };
    self.panel.onWhy = ^(NSString *why) { /* explanation shown via the chip's tooltip */ };
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

    // No ads without a connected account or when paused.
    if (self.paused || ![self.ads isConnected]) { [self hide]; return; }

    // Screen access (Accessibility) can be silently dropped after an app update,
    // because macOS re-keys the grant to the newly signed binary. When that
    // happens we must draw nothing, report nothing, and actively guide the user
    // to re-enable it once — they will not figure this out on their own.
    if (![PrismAX isTrustedPrompt:NO]) {
        [self hide];
        [self requestReauthorizationOncePerEpisode];
        return;
    }
    self.promptedThisEpisode = NO;   // trusted again — re-arm the prompt for next time

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
    // While the panel is pinned open, freeze the ad the user is reading: skip both
    // rotation and the network refresh. The dwell/heartbeat accounting below is
    // untouched, so the open ad still bills once at 5s exactly as it would without
    // the panel. Rotation resumes on dismiss (lastFetchTick is reset there).
    if (!self.panelPinned) {
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
            // Piggyback a lazy earnings refresh onto the ad cycle while the panel is open.
            if (self.panel.isVisible) [self refreshPanelEarnings];
        }
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

    if (self.panel.isVisible) [self positionPanel];   // keep the panel glued to the pill
    [self accrueDwell];
}

- (void)hide {
    self.pillVisible = NO;
    [self.pill orderOut:nil];
    [self flushImpression];
    [self resetDwell];
    [self dismissPanel];   // the panel never outlives its pill
}

#pragma mark - Expanded panel (UI only; never touches billing/heartbeat/rotation)

- (void)showPanel {
    if (!self.expandedEnabled || !self.panel || !self.currentAd) return;
    [self.panel renderAd:self.currentAd earnings:self.ads.cachedEarnings];   // instant from cache
    [self positionPanel];
    [self.panel orderFrontRegardless];
    [self installDismissMonitor];
    [self refreshPanelEarnings];   // lazy refresh on open
}

- (void)refreshPanelEarnings {
    __weak PrismController *weakSelf = self;
    [self.ads fetchEarnings:^(PrismEarnings *e) {
        PrismController *s = weakSelf;
        if (!s || !s.panel.isVisible || !s.currentAd) return;
        [s.panel renderAd:s.currentAd earnings:s.ads.cachedEarnings];
    }];
}

// Anchor the panel under the visible pill (10px gap), flipping above if it would
// fall off the bottom, and clamping horizontally. Never resizes the pill window.
- (void)positionPanel {
    if (!self.panel) return;
    NSRect pf = self.pill.frame;                     // window frame (pill inset by kGlow)
    NSRect screen = [NSScreen screens].firstObject.frame;
    CGFloat ph = self.panel.frame.size.height, pw = self.panel.frame.size.width;
    CGFloat visLeft = pf.origin.x + kGlow;
    CGFloat visBottom = pf.origin.y + kGlow;
    CGFloat visTop = visBottom + kPillHeight;

    CGFloat x = visLeft;
    if (x + pw > screen.size.width - 8) x = screen.size.width - 8 - pw;
    if (x < 8) x = 8;
    CGFloat y = visBottom - 10 - ph;                 // below the pill
    if (y < 8) y = visTop + 10;                      // not enough room: place above
    [self.panel setFrameOrigin:NSMakePoint(x, y)];
}

- (void)scheduleDismiss {
    if (!self.panel.isVisible || self.panelPinned) return;
    self.dismissGen++;
    int gen = self.dismissGen;
    __weak PrismController *weakSelf = self;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.25 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        PrismController *s = weakSelf;
        if (!s || s.dismissGen != gen || s.panelPinned) return;   // canceled or pinned
        [s dismissPanel];
    });
}

- (void)cancelScheduledDismiss { self.dismissGen++; }

- (void)dismissPanel {
    if (!self.panel) return;
    self.panelPinned = NO;
    [self.panel orderOut:nil];
    [self removeDismissMonitor];
    // Resume rotation from a fresh window so dismissing does not trigger an
    // immediate rotate/flush of the ad that was just on screen.
    self.lastFetchTick = self.tick;
}

// Esc or a click in another app dismisses the panel. Clicks inside our own panel
// are local events and do not reach a global monitor, so they never self-dismiss.
- (void)installDismissMonitor {
    if (self.escMonitor) return;
    __weak PrismController *weakSelf = self;
    self.escMonitor = [NSEvent addGlobalMonitorForEventsMatchingMask:
                          (NSEventMaskKeyDown | NSEventMaskLeftMouseDown | NSEventMaskRightMouseDown)
                                                             handler:^(NSEvent *e) {
        PrismController *s = weakSelf; if (!s) return;
        if (e.type == NSEventTypeKeyDown) { if (e.keyCode == 53) [s dismissPanel]; }   // 53 = Esc
        else { [s dismissPanel]; }
    }];
}

- (void)removeDismissMonitor {
    if (self.escMonitor) { [NSEvent removeMonitor:self.escMonitor]; self.escMonitor = nil; }
}

// Save-for-later: local-only for now. TODO: persist server-side once an endpoint
// exists (no schema this pass). Stores campaign ids in NSUserDefaults.
- (void)saveCurrentAd {
    self.panelPinned = YES;
    NSString *adId = self.currentAd.adId;
    if (!adId.length) return;
    NSUserDefaults *ud = [NSUserDefaults standardUserDefaults];
    NSMutableArray *saved = [([ud arrayForKey:@"PrismSavedAds"] ?: @[]) mutableCopy];
    if (![saved containsObject:adId]) {
        [saved addObject:adId];
        [ud setObject:saved forKey:@"PrismSavedAds"];
    }
}

#pragma mark - Viewable-impression accounting

- (void)resetDwell {
    self.visibleSince = 0;
    self.accumulatedMs = 0;
    self.impressionReported = NO;
    self.lastBeatTime = 0;   // next ad's first beat fires immediately
}

- (void)accrueDwell {
    // Count dwell — and therefore bill an impression — ONLY while the pill is
    // genuinely on screen, using the window's real occlusion state rather than
    // our own "I ordered it front" flag. This stops us charging advertisers and
    // crediting earnings for an ad the user never actually saw (which is exactly
    // what happened when screen access was silently lost after an update). If we
    // keep trying to show but the window never becomes visible, treat it as a
    // broken-render episode and guide a re-grant.
    BOOL onScreen = (self.pill.occlusionState & NSWindowOcclusionStateVisible) != 0;
    if (!onScreen) {
        self.visibleSince = 0;   // pause accrual; do not report unseen impressions
        if (++self.notVisibleStreak >= kNotVisibleAlertTicks) {
            self.notVisibleStreak = 0;
            [self requestReauthorizationOncePerEpisode];
        }
        return;
    }
    self.notVisibleStreak = 0;

    NSTimeInterval now = [NSDate timeIntervalSinceReferenceDate];
    if (self.visibleSince > 0) self.accumulatedMs += (NSInteger)((now - self.visibleSince) * 1000);
    self.visibleSince = now;
    if (!self.impressionReported && self.accumulatedMs >= kMinDwellMs && self.currentAd) {
        self.impressionReported = YES;
        [self.ads reportImpression:self.currentAd durationMs:self.accumulatedMs source:self.currentSource];
    }
    [self maybeBeat:now];
}

// Guide the user to re-enable screen access after an update silently dropped it.
// Fired at most once per untrusted/broken episode (re-armed when trust returns),
// with a hard 30-minute floor so it can never nag.
- (void)requestReauthorizationOncePerEpisode {
    if (self.promptedThisEpisode) return;
    NSTimeInterval now = [NSDate timeIntervalSinceReferenceDate];
    if (self.lastReauthPrompt > 0 && (now - self.lastReauthPrompt) < 1800) return;
    self.promptedThisEpisode = YES;
    self.lastReauthPrompt = now;
    // Re-fire the native Accessibility prompt and open the pane. After an update
    // the prior entry can be stale, so the reliable fix is the user toggling
    // Prism in System Settings; this points them straight at it.
    [PrismAX isTrustedPrompt:YES];
    NSURL *u = [NSURL URLWithString:@"x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"];
    if (u) [[NSWorkspace sharedWorkspace] openURL:u];
}

// Anti-bot: while the pill is visible, send a signed heartbeat ~every hbIntervalMs
// so the server can measure real dwell. First beat fires immediately (establishes
// the session); the rolling challenge advances on each ad.hbChallenge update.
- (void)maybeBeat:(NSTimeInterval)now {
    PrismAd *ad = self.currentAd;
    if (!ad.impressionToken.length || !ad.hbChallenge.length) return;
    NSInteger interval = ad.hbIntervalMs > 0 ? ad.hbIntervalMs : 1000;
    if (self.lastBeatTime > 0 && (now - self.lastBeatTime) * 1000.0 < (double)interval) return;
    self.lastBeatTime = now;
    [self.ads sendHeartbeat:ad];
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
