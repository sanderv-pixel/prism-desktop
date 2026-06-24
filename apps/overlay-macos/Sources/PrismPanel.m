#import "PrismPanel.h"
#import <QuartzCore/QuartzCore.h>

#pragma mark - small helpers

static NSColor *Hex(uint32_t rgb) {
    return [NSColor colorWithSRGBRed:((rgb >> 16) & 0xff) / 255.0
                               green:((rgb >> 8) & 0xff) / 255.0
                                blue:(rgb & 0xff) / 255.0
                               alpha:1.0];
}
static NSColor *HexA(uint32_t rgb, CGFloat a) {
    return [Hex(rgb) colorWithAlphaComponent:a];
}
static NSTextField *MkLabel(NSString *s, NSColor *c, CGFloat size, NSFontWeight w) {
    NSTextField *t = [NSTextField labelWithString:(s ?: @"")];
    t.textColor = c;
    t.font = [NSFont systemFontOfSize:size weight:w];
    t.drawsBackground = NO;
    t.bezeled = NO;
    t.editable = NO;
    t.selectable = NO;
    return t;
}
// Dollars from cents. Keeps precision for sub-cent per-view payouts so tiny
// amounts do not collapse to $0.00 (mirrors the web dashboard's formatPayout:
// up to 4 decimals under a cent, 2 decimals otherwise, with grouping).
static NSString *Money(double cents) {
    double d = cents / 100.0;
    double ad = fabs(d);
    NSNumberFormatter *f = [[NSNumberFormatter alloc] init];
    f.numberStyle = NSNumberFormatterDecimalStyle;
    f.locale = [NSLocale localeWithLocaleIdentifier:@"en_US"];
    f.minimumFractionDigits = 2;
    f.maximumFractionDigits = (ad > 0 && ad < 0.01) ? 4 : 2;
    return [NSString stringWithFormat:@"$%@", [f stringFromNumber:@(d)]];
}

#pragma mark - clickable chip / control

@interface PPClickView : NSView
@property(nonatomic, copy, nullable) void (^onClick)(void);
@property(nonatomic, strong) NSTextField *titleField;
@property(nonatomic, strong) NSColor *fillColor;
@property(nonatomic, strong) NSColor *strokeColor;
@property(nonatomic, assign) CGFloat radius;
- (void)setTitle:(NSString *)title;
@end

@implementation PPClickView
- (instancetype)initWithFrame:(NSRect)frame {
    self = [super initWithFrame:frame];
    if (self) {
        self.wantsLayer = YES;
        _radius = 8.0;
        _fillColor = HexA(0xffffff, 0.04);
        _strokeColor = HexA(0xffffff, 0.10);
        _titleField = MkLabel(@"", Hex(0xcbd5e1), 11.5, NSFontWeightMedium);
        _titleField.alignment = NSTextAlignmentCenter;
        [self addSubview:_titleField];
    }
    return self;
}
- (BOOL)isFlipped { return YES; }
- (void)setTitle:(NSString *)title {
    self.titleField.stringValue = title ?: @"";
    [self.titleField sizeToFit];
    NSRect b = self.bounds, tf = self.titleField.frame;
    self.titleField.frame = NSMakeRect(0, (b.size.height - tf.size.height) / 2.0, b.size.width, tf.size.height);
}
- (void)layout {
    [super layout];
    [self setTitle:self.titleField.stringValue];
}
- (void)drawRect:(NSRect)dirty {
    NSBezierPath *p = [NSBezierPath bezierPathWithRoundedRect:NSInsetRect(self.bounds, 0.5, 0.5)
                                                      xRadius:self.radius yRadius:self.radius];
    [self.fillColor setFill];
    [p fill];
    [self.strokeColor setStroke];
    p.lineWidth = 1.0;
    [p stroke];
}
- (void)mouseDown:(NSEvent *)event {
    if (self.onClick) self.onClick();
}
- (void)resetCursorRects {
    [self addCursorRect:self.bounds cursor:[NSCursor pointingHandCursor]];
}
@end

#pragma mark - payout progress bar (gradient fill)

@interface PPProgressView : NSView
@property(nonatomic, assign) CGFloat fraction;   // 0..1
@end

@implementation PPProgressView
- (BOOL)isFlipped { return YES; }
- (void)setFraction:(CGFloat)f { _fraction = MAX(0, MIN(1, f)); [self setNeedsDisplay:YES]; }
- (void)drawRect:(NSRect)dirty {
    CGFloat r = self.bounds.size.height / 2.0;
    NSBezierPath *track = [NSBezierPath bezierPathWithRoundedRect:self.bounds xRadius:r yRadius:r];
    [HexA(0xffffff, 0.08) setFill];
    [track fill];
    if (self.fraction <= 0) return;
    NSRect fill = NSMakeRect(0, 0, self.bounds.size.width * self.fraction, self.bounds.size.height);
    NSBezierPath *fillPath = [NSBezierPath bezierPathWithRoundedRect:fill xRadius:r yRadius:r];
    [fillPath addClip];
    NSGradient *g = [[NSGradient alloc] initWithColors:@[ Hex(0x8b5cf6), Hex(0xec4899), Hex(0x06b6d4) ]];
    [g drawInRect:self.bounds angle:0];
}
@end

#pragma mark - the card (flipped, draws the rounded background + border)

@interface PPCardView : NSView
@property(nonatomic, copy, nullable) void (^onEntered)(void);
@property(nonatomic, copy, nullable) void (^onExited)(void);
@property(nonatomic, strong) NSTrackingArea *track;
@end

@implementation PPCardView
- (BOOL)isFlipped { return YES; }
- (void)drawRect:(NSRect)dirty {
    NSBezierPath *p = [NSBezierPath bezierPathWithRoundedRect:NSInsetRect(self.bounds, 0.5, 0.5)
                                                      xRadius:14 yRadius:14];
    [Hex(0x0c0c14) setFill];
    [p fill];
    [Hex(0x23232f) setStroke];
    p.lineWidth = 1.0;
    [p stroke];
}
- (void)updateTrackingAreas {
    [super updateTrackingAreas];
    if (self.track) [self removeTrackingArea:self.track];
    self.track = [[NSTrackingArea alloc] initWithRect:self.bounds
                                              options:(NSTrackingMouseEnteredAndExited | NSTrackingActiveAlways)
                                                owner:self userInfo:nil];
    [self addTrackingArea:self.track];
}
- (void)mouseEntered:(NSEvent *)e { if (self.onEntered) self.onEntered(); }
- (void)mouseExited:(NSEvent *)e { if (self.onExited) self.onExited(); }
@end

#pragma mark - the panel window

@interface PrismPanelWindow () {
    PPCardView *_card;
    NSView *_iconTile;
    NSTextField *_iconLetter;
    NSTextField *_brandLabel;
    NSTextField *_ctaLabel;
    PPClickView *_whyChip;
    PPClickView *_saveChip;
    PPClickView *_copyChip;
    NSTextField *_earnedHdr, *_earnedVal;
    NSTextField *_todayHdr, *_todayVal;
    NSTextField *_balanceHdr, *_balanceVal;
    PPProgressView *_progress;
    NSTextField *_progressMeta;
    PPClickView *_splitChip, *_upChip, *_downChip, *_fewerChip;
    PPClickView *_pauseToggle;
    NSTextField *_pauseLabel;
    NSTextField *_footer;
    BOOL _paused;
    NSString *_promoCode;
    NSString *_why;
}
@end

@implementation PrismPanelWindow

static const CGFloat kPanelW = 340.0;
static const CGFloat kPanelH = 336.0;

- (instancetype)initPanel {
    self = [super initWithContentRect:NSMakeRect(0, 0, kPanelW, kPanelH)
                            styleMask:NSWindowStyleMaskBorderless
                              backing:NSBackingStoreBuffered
                                defer:NO];
    if (!self) return nil;
    self.level = NSPopUpMenuWindowLevel;          // above the pill
    self.opaque = NO;
    self.backgroundColor = NSColor.clearColor;
    self.hasShadow = YES;
    self.ignoresMouseEvents = NO;
    self.collectionBehavior = NSWindowCollectionBehaviorCanJoinAllSpaces |
                              NSWindowCollectionBehaviorStationary |
                              NSWindowCollectionBehaviorFullScreenAuxiliary;
    [self buildContent];
    return self;
}

// Never become key/main: the editor keeps focus; the panel is a passive overlay.
- (BOOL)canBecomeKeyWindow { return NO; }
- (BOOL)canBecomeMainWindow { return NO; }

- (void)buildContent {
    _card = [[PPCardView alloc] initWithFrame:NSMakeRect(0, 0, kPanelW, kPanelH)];
    _card.wantsLayer = YES;
    __weak PrismPanelWindow *weakSelf = self;
    _card.onEntered = ^{ if (weakSelf.onMouseEntered) weakSelf.onMouseEntered(); };
    _card.onExited = ^{ if (weakSelf.onMouseExited) weakSelf.onMouseExited(); };
    self.contentView = _card;

    const CGFloat P = 16, W = kPanelW - 2 * P;

    // Header: icon tile + brand + verified, "Why this ad?" on the right.
    _iconTile = [[NSView alloc] initWithFrame:NSMakeRect(P, P, 30, 30)];
    _iconTile.wantsLayer = YES;
    _iconTile.layer.backgroundColor = Hex(0x8b5cf6).CGColor;
    _iconTile.layer.cornerRadius = 8;
    _iconLetter = MkLabel(@"", Hex(0xffffff), 15, NSFontWeightBold);
    _iconLetter.alignment = NSTextAlignmentCenter;
    _iconLetter.frame = NSMakeRect(0, 6, 30, 18);
    [_iconTile addSubview:_iconLetter];
    [_card addSubview:_iconTile];

    _brandLabel = MkLabel(@"", Hex(0xffffff), 13.5, NSFontWeightSemibold);
    _brandLabel.frame = NSMakeRect(P + 40, P, 150, 16);
    [_card addSubview:_brandLabel];

    NSTextField *verified = MkLabel(@"Verified advertiser", Hex(0x34d399), 10.5, NSFontWeightMedium);
    verified.frame = NSMakeRect(P + 40, P + 17, 160, 13);
    [_card addSubview:verified];

    _whyChip = [self chipWithTitle:@"Why this ad?" frame:NSMakeRect(kPanelW - P - 96, P, 96, 22)];
    _whyChip.onClick = ^{ PrismPanelWindow *s = weakSelf; if (s && s.onWhy) s.onWhy(s->_why ?: @""); };
    [_card addSubview:_whyChip];

    // Full CTA line (the ad copy).
    _ctaLabel = MkLabel(@"", Hex(0xe2e8f0), 13, NSFontWeightRegular);
    _ctaLabel.frame = NSMakeRect(P, 56, W, 18);
    [_card addSubview:_ctaLabel];

    // Save + Copy code.
    _saveChip = [self chipWithTitle:@"Save for later" frame:NSMakeRect(P, 82, 110, 26)];
    _saveChip.onClick = ^{ if (weakSelf.onSave) weakSelf.onSave(); };
    [_card addSubview:_saveChip];
    _copyChip = [self chipWithTitle:@"Copy code" frame:NSMakeRect(P + 118, 82, 120, 26)];
    _copyChip.onClick = ^{
        PrismPanelWindow *s = weakSelf; if (!s) return;
        if (s.onCopyCode && s->_promoCode.length) s.onCopyCode(s->_promoCode);
        [s flashCopied];
    };
    _copyChip.hidden = YES;
    [_card addSubview:_copyChip];

    // Divider.
    NSView *divider = [[NSView alloc] initWithFrame:NSMakeRect(P, 120, W, 1)];
    divider.wantsLayer = YES;
    divider.layer.backgroundColor = Hex(0x23232f).CGColor;
    [_card addSubview:divider];

    // Earnings columns.
    _earnedHdr = MkLabel(@"Earned this view", Hex(0x64748b), 10.5, NSFontWeightMedium);
    _earnedHdr.frame = NSMakeRect(P, 132, 120, 13);
    [_card addSubview:_earnedHdr];
    _earnedVal = MkLabel(@"", Hex(0x8b5cf6), 22, NSFontWeightBold);
    _earnedVal.frame = NSMakeRect(P, 147, 120, 26);
    [_card addSubview:_earnedVal];

    _todayHdr = MkLabel(@"Today", Hex(0x64748b), 10.5, NSFontWeightMedium);
    _todayHdr.frame = NSMakeRect(P + 130, 132, 80, 13);
    [_card addSubview:_todayHdr];
    _todayVal = MkLabel(@"", Hex(0x34d399), 17, NSFontWeightSemibold);
    _todayVal.frame = NSMakeRect(P + 130, 149, 90, 22);
    [_card addSubview:_todayVal];

    _balanceHdr = MkLabel(@"Balance", Hex(0x64748b), 10.5, NSFontWeightMedium);
    _balanceHdr.frame = NSMakeRect(P + 224, 132, 84, 13);
    [_card addSubview:_balanceHdr];
    _balanceVal = MkLabel(@"", Hex(0xffffff), 17, NSFontWeightSemibold);
    _balanceVal.frame = NSMakeRect(P + 224, 149, 90, 22);
    [_card addSubview:_balanceVal];

    // Payout progress.
    _progress = [[PPProgressView alloc] initWithFrame:NSMakeRect(P, 186, W, 8)];
    [_card addSubview:_progress];
    _progressMeta = MkLabel(@"", Hex(0x94a3b8), 11, NSFontWeightRegular);
    _progressMeta.frame = NSMakeRect(P, 198, W, 14);
    [_card addSubview:_progressMeta];

    // Chips row: split + feedback.
    _splitChip = [self chipWithTitle:@"You keep 50%" frame:NSMakeRect(P, 224, 104, 24)];
    _splitChip.fillColor = HexA(0x8b5cf6, 0.16);
    _splitChip.strokeColor = HexA(0x8b5cf6, 0.40);
    _splitChip.titleField.textColor = Hex(0xc4b5fd);
    _upChip = [self chipWithTitle:@"\U0001F44D" frame:NSMakeRect(P + 110, 224, 44, 24)];
    _upChip.onClick = ^{ [weakSelf flagFeedback:@"up"]; };
    _downChip = [self chipWithTitle:@"\U0001F44E" frame:NSMakeRect(P + 160, 224, 44, 24)];
    _downChip.onClick = ^{ [weakSelf flagFeedback:@"down"]; };
    _fewerChip = [self chipWithTitle:@"Fewer like this" frame:NSMakeRect(P + 210, 224, W - 210, 24)];
    _fewerChip.onClick = ^{ [weakSelf flagFeedback:@"fewer"]; };
    [_card addSubview:_splitChip];
    [_card addSubview:_upChip];
    [_card addSubview:_downChip];
    [_card addSubview:_fewerChip];

    // Pause toggle.
    _pauseToggle = [self chipWithTitle:@"Pause" frame:NSMakeRect(P, 258, 70, 24)];
    _pauseToggle.onClick = ^{ [weakSelf togglePause]; };
    [_card addSubview:_pauseToggle];
    _pauseLabel = MkLabel(@"Pause ads this session", Hex(0x94a3b8), 11.5, NSFontWeightRegular);
    _pauseLabel.frame = NSMakeRect(P + 80, 260, W - 80, 16);
    [_card addSubview:_pauseLabel];

    // Footer.
    _footer = MkLabel(@"\U0001F512  Contextual only · never reads your code, prompts, or files",
                      Hex(0x64748b), 10.5, NSFontWeightRegular);
    _footer.frame = NSMakeRect(P, 296, W, 14);
    [_card addSubview:_footer];
}

- (PPClickView *)chipWithTitle:(NSString *)title frame:(NSRect)frame {
    PPClickView *v = [[PPClickView alloc] initWithFrame:frame];
    [v setTitle:title];
    return v;
}

- (void)flagFeedback:(NSString *)signal {
    if ([signal isEqualToString:@"up"]) {
        _upChip.fillColor = HexA(0x34d399, 0.16);
        _upChip.strokeColor = HexA(0x34d399, 0.5);
        _downChip.fillColor = HexA(0xffffff, 0.04);
        _downChip.strokeColor = HexA(0xffffff, 0.10);
    } else if ([signal isEqualToString:@"down"]) {
        _downChip.fillColor = HexA(0xf43f5e, 0.16);
        _downChip.strokeColor = HexA(0xf43f5e, 0.5);
        _upChip.fillColor = HexA(0xffffff, 0.04);
        _upChip.strokeColor = HexA(0xffffff, 0.10);
    }
    [_upChip setNeedsDisplay:YES];
    [_downChip setNeedsDisplay:YES];
    if (self.onFeedback) self.onFeedback(signal);
}

- (void)togglePause {
    _paused = !_paused;
    [_pauseToggle setTitle:(_paused ? @"Resume" : @"Pause")];
    _pauseToggle.fillColor = _paused ? HexA(0x8b5cf6, 0.16) : HexA(0xffffff, 0.04);
    _pauseToggle.strokeColor = _paused ? HexA(0x8b5cf6, 0.40) : HexA(0xffffff, 0.10);
    [_pauseToggle setNeedsDisplay:YES];
    if (self.onTogglePause) self.onTogglePause(_paused);
}

// Confirm a copy: flash the chip to "Copied!" (emerald) for ~1.4s, then restore.
- (void)flashCopied {
    [_copyChip setTitle:@"✓ Copied!"];
    _copyChip.fillColor = HexA(0x34d399, 0.16);
    _copyChip.strokeColor = HexA(0x34d399, 0.5);
    [_copyChip setNeedsDisplay:YES];
    __weak PrismPanelWindow *weakSelf = self;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.4 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        PrismPanelWindow *s = weakSelf; if (!s || s->_promoCode.length == 0) return;
        [s->_copyChip setTitle:[NSString stringWithFormat:@"Copy code  %@", s->_promoCode]];
        s->_copyChip.fillColor = HexA(0xffffff, 0.04);
        s->_copyChip.strokeColor = HexA(0xffffff, 0.10);
        [s->_copyChip setNeedsDisplay:YES];
    });
}

- (CGFloat)renderAd:(PrismAd *)ad earnings:(PrismEarnings *)e {
    NSString *brand = ad.advertiserName ?: @"";
    _brandLabel.stringValue = brand;
    _iconLetter.stringValue = brand.length ? [[brand substringToIndex:1] uppercaseString] : @"?";
    _ctaLabel.stringValue = ad.tagline ?: @"";
    _why = ad.why;
    _whyChip.hidden = (ad.why.length == 0);
    _whyChip.toolTip = ad.why;   // hover shows the privacy-safe explanation

    _promoCode = ad.promoCode;
    if (ad.promoCode.length) {
        [_copyChip setTitle:[NSString stringWithFormat:@"Copy code  %@", ad.promoCode]];
        _copyChip.hidden = NO;
    } else {
        _copyChip.hidden = YES;
    }

    if (e) {
        BOOL hasPerView = (e.perViewCents != nil);
        _earnedHdr.hidden = !hasPerView;
        _earnedVal.hidden = !hasPerView;
        if (hasPerView) _earnedVal.stringValue = [NSString stringWithFormat:@"+%@", Money(e.perViewCents.doubleValue)];
        _todayVal.stringValue = [NSString stringWithFormat:@"+%@", Money(e.earnedTodayCents)];
        _balanceVal.stringValue = Money(e.balanceCents);
        double threshold = e.payoutThresholdCents > 0 ? e.payoutThresholdCents : 2000;
        _progress.fraction = (CGFloat)(e.balanceCents / threshold);
        _progressMeta.stringValue = [NSString stringWithFormat:@"%@ of %@ to payout", Money(e.balanceCents), Money(threshold)];
        [_splitChip setTitle:[NSString stringWithFormat:@"You keep %ld%%", (long)e.splitPercent]];
    } else {
        _earnedHdr.hidden = YES;
        _earnedVal.hidden = YES;
        _todayVal.stringValue = @"--";
        _balanceVal.stringValue = @"--";
        _progress.fraction = 0;
        _progressMeta.stringValue = @"Earnings loading...";
    }
    return kPanelH;
}

@end
