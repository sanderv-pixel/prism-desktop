// PrismAuth — CLI-style device pairing. Opens the Prism sign-in/link page in the
// browser and polls until the server hands back a device key, which is saved as
// the app's API key. No copy-paste; create or link an account in the browser.
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface PrismAuth : NSObject

/// Begin pairing: opens the browser and polls for the key (up to ~5 min).
/// `update` is called on the main thread with a status message; `done` is YES
/// when finished and `success` indicates whether a key was saved.
- (void)connectWithStatus:(void (^)(NSString *message, BOOL done, BOOL success))update;

/// Stop polling.
- (void)cancel;

@end

NS_ASSUME_NONNULL_END
