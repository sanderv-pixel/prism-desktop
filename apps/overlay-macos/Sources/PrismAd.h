// PrismAd — ad inventory: fetches a queue from the Prism API and reports
// viewable impressions. Falls back to built-in demo ads when the API is
// unreachable so the app always renders something.
#import <Cocoa/Cocoa.h>

NS_ASSUME_NONNULL_BEGIN

@interface PrismAd : NSObject
@property(nonatomic, copy) NSString *adId;             // campaign id (UUID for live ads)
@property(nonatomic, copy) NSString *advertiserName;
@property(nonatomic, copy) NSString *tagline;          // ad copy
@property(nonatomic, copy, nullable) NSString *clickURL;        // /api/clicks redirect — open to register a click
@property(nonatomic, copy, nullable) NSString *impressionToken; // signed; required to report a view
@property(nonatomic, copy, nullable) NSString *userId;          // bound to the impression token
@property(nonatomic, copy, nullable) NSString *sessionId;       // bound to the impression token
@property(nonatomic, strong) NSColor *color;                    // badge color
@end

@interface PrismAdClient : NSObject

/// Base API URL, e.g. https://goprism.dev/api (overridable via PRISM_API_URL).
@property(nonatomic, copy, readonly) NSString *baseURL;
/// Stable per-launch anonymous session id.
@property(nonatomic, copy, readonly) NSString *sessionId;

/// Refresh the ad queue from the API (async, best-effort). Built-ins remain
/// available immediately and as a fallback.
- (void)refresh;

/// Whether an account is connected (an API key is present). Prism shows nothing
/// without one.
- (BOOL)isConnected;

/// The next ad to display, or nil when there is none (no account / no inventory).
- (nullable PrismAd *)nextAd;

/// Report a validated viewable impression for an ad (best-effort, fire-and-forget).
- (void)reportImpression:(PrismAd *)ad durationMs:(NSInteger)durationMs;

/// Register a click: opens the ad's click URL, which records the click
/// server-side and redirects the user to the advertiser.
- (void)registerClick:(PrismAd *)ad;

@end

NS_ASSUME_NONNULL_END
