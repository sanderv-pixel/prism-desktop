// PrismOnboarding — first-run window: explain Prism, walk the user through the
// one Accessibility grant, and (optionally) connect their account so ads are
// live and earnings are tracked. Pure AppKit, no nib.
#import <Cocoa/Cocoa.h>

NS_ASSUME_NONNULL_BEGIN

@interface PrismOnboarding : NSObject

/// YES if the user hasn't completed onboarding yet, or Accessibility isn't granted.
+ (BOOL)shouldShowOnLaunch;

/// Show (and bring to front) the onboarding window.
- (void)show;

@end

NS_ASSUME_NONNULL_END
