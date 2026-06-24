// PrismAd — ad inventory: fetches a queue from the Prism API and reports
// viewable impressions. Falls back to built-in demo ads when the API is
// unreachable so the app always renders something.
#import <Cocoa/Cocoa.h>

NS_ASSUME_NONNULL_BEGIN

@interface PrismAd : NSObject
@property(nonatomic, copy) NSString *adId;             // campaign id (UUID for live ads)
@property(nonatomic, copy) NSString *advertiserName;
@property(nonatomic, copy) NSString *tagline;          // ad copy
@property(nonatomic, copy, nullable) NSString *iconUrl;         // advertiser icon (http(s) or data: URL)
@property(nonatomic, copy, nullable) NSString *clickURL;        // /api/clicks redirect — open to register a click
@property(nonatomic, copy, nullable) NSString *impressionToken; // signed; required to report a view
@property(nonatomic, copy, nullable) NSString *userId;          // bound to the impression token
@property(nonatomic, copy, nullable) NSString *sessionId;       // bound to the impression token
@property(nonatomic, strong) NSColor *color;                    // badge color
// Anti-bot heartbeat session. hbChallenge is the rolling challenge: it starts as
// the value the server returned with the ad and is replaced by each beat's
// nextChallenge. hbIntervalMs is how often to beat (0 = server omitted it).
@property(nonatomic, copy, nullable) NSString *hbChallenge;
@property(nonatomic, assign) NSInteger hbIntervalMs;
// Expanded-panel metadata (additive; nil on older servers). Privacy-safe: derived
// from campaign metadata only, never from editor content.
@property(nonatomic, copy, nullable) NSString *promoCode;   // shown as "Copy code" when set
@property(nonatomic, copy, nullable) NSString *why;         // "Why this ad?" explanation
@end

// Earnings snapshot for the expanded panel (from GET /api/me/earnings). All money
// in cents. perViewCents is nil when there is no credited view yet.
@interface PrismEarnings : NSObject
@property(nonatomic, assign) double balanceCents;
@property(nonatomic, assign) double earnedTodayCents;
@property(nonatomic, assign) double payoutThresholdCents;
@property(nonatomic, assign) NSInteger splitPercent;
@property(nonatomic, strong, nullable) NSNumber *perViewCents;
@end

@interface PrismAdClient : NSObject

/// Base API URL, e.g. https://goprism.dev/api (overridable via PRISM_API_URL).
@property(nonatomic, copy, readonly) NSString *baseURL;
/// Stable per-launch anonymous session id.
@property(nonatomic, copy, readonly) NSString *sessionId;

/// Refresh the ad queue from the API (async, best-effort). Built-ins remain
/// available immediately and as a fallback. `source` is the current surface
/// (claude/cursor/codex/terminal) for surface targeting; nil if unknown.
- (void)refresh:(nullable NSString *)source;

/// Whether an account is connected (an API key is present). Prism shows nothing
/// without one.
- (BOOL)isConnected;

/// The next ad to display, or nil when there is none (no account / no inventory).
- (nullable PrismAd *)nextAd;

/// Report a validated viewable impression for an ad (best-effort, fire-and-forget).
/// `source` is the surface it was shown on (claude/cursor/terminal/codex).
- (void)reportImpression:(PrismAd *)ad durationMs:(NSInteger)durationMs source:(nullable NSString *)source;

/// Send one anti-bot heartbeat for an in-flight ad view (best-effort). Echoes the
/// ad's current rolling challenge and, on success, advances ad.hbChallenge to the
/// server's nextChallenge so beats stay sequential.
- (void)sendHeartbeat:(PrismAd *)ad;

/// Register a click: opens the ad's click URL, which records the click
/// server-side and redirects the user to the advertiser.
- (void)registerClick:(PrismAd *)ad;

#pragma mark - Expanded panel (additive; never reads editor content)

/// Last earnings snapshot fetched from GET /api/me/earnings, or nil if none yet.
/// The panel renders from this cache instantly and refreshes on open.
@property(nonatomic, strong, readonly, nullable) PrismEarnings *cachedEarnings;

/// Fetch the earnings snapshot (best-effort, key-authed). Updates `cachedEarnings`
/// and calls `completion` on the main queue (with the new snapshot, or nil on
/// failure - keep showing the cache). Never blocks the UI.
- (void)fetchEarnings:(nullable void (^)(PrismEarnings *_Nullable))completion;

/// Send a panel control signal for an ad (best-effort, fire-and-forget). Body is
/// only { campaignId, signal } - never any user content. signal in up/down/fewer/hidden.
- (void)sendFeedbackForCampaign:(NSString *)campaignId signal:(NSString *)signal;

@end

NS_ASSUME_NONNULL_END
