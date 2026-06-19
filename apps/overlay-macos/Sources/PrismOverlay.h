// PrismOverlay — the borderless, click-through ad pill window plus the
// controller that drives detection → positioning → impression accounting.
#import <Cocoa/Cocoa.h>
#import "PrismAd.h"

NS_ASSUME_NONNULL_BEGIN

/// The floating ad pill. Borderless, always-on-top, all spaces. The small pill
/// rectangle is clickable (to open the ad); everything outside it is unaffected.
@interface PrismOverlayWindow : NSWindow
- (instancetype)initPill;
/// Render an ad into the pill and resize to fit. Returns the new content width.
- (CGFloat)renderAd:(PrismAd *)ad;
/// Invoked when the user clicks the pill.
@property(nonatomic, copy, nullable) void (^onClick)(void);
@end

/// Ties everything together. Polls Accessibility, shows the pill next to Claude's
/// work-row while it's generating, rotates ads, and reports viewable impressions.
@interface PrismController : NSObject
@property(nonatomic, assign, getter=isPaused) BOOL paused;
- (void)start;
@end

NS_ASSUME_NONNULL_END
