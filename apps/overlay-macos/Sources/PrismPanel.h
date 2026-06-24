// PrismPanel - the expanded ad panel shown on hover / click-to-pin beneath the
// resting pill. A SEPARATE borderless child window (never resizes the pill window),
// so the pill's occlusion-based impression billing + heartbeat are untouched.
// Privacy: every value comes from the account (earnings) or campaign metadata
// (promo code, why). Controls send only { campaignId, signal }.
#import <Cocoa/Cocoa.h>
#import "PrismAd.h"

NS_ASSUME_NONNULL_BEGIN

@interface PrismPanelWindow : NSWindow
- (instancetype)initPanel;

/// Populate the panel for an ad + the latest earnings snapshot (may be nil -> the
/// earnings rows hide until a snapshot arrives). Returns the laid-out height.
- (CGFloat)renderAd:(PrismAd *)ad earnings:(nullable PrismEarnings *)earnings;

/// Pinned panels stay open after the mouse leaves (until Esc / click-outside).
@property(nonatomic, assign) BOOL pinned;

// Control callbacks (wired by the controller). All are UI-only events.
@property(nonatomic, copy, nullable) void (^onFeedback)(NSString *signal);   // up/down/fewer/hidden
@property(nonatomic, copy, nullable) void (^onTogglePause)(BOOL paused);
@property(nonatomic, copy, nullable) void (^onSave)(void);
@property(nonatomic, copy, nullable) void (^onCopyCode)(NSString *code);
@property(nonatomic, copy, nullable) void (^onCta)(void);
@property(nonatomic, copy, nullable) void (^onWhy)(NSString *why);
/// Fired when the pointer enters the panel (so the controller can cancel a pending
/// dismiss while the cursor crosses the pill -> panel gap).
@property(nonatomic, copy, nullable) void (^onMouseEntered)(void);
/// Fired when the pointer leaves the panel (so the controller can dismiss if not pinned).
@property(nonatomic, copy, nullable) void (^onMouseExited)(void);
/// Fired on Esc.
@property(nonatomic, copy, nullable) void (^onEscape)(void);
@end

NS_ASSUME_NONNULL_END
