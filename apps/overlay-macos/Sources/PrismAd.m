#import "PrismAd.h"
#import <Cocoa/Cocoa.h>

@implementation PrismAd
@end

// Context we report to the API. Honest + minimal: editor + tool + wait state.
// No source code, prompts, or file contents — by design.
static NSDictionary *AdContext(void) {
    return @{ @"editor": @"claude-desktop", @"aiTool": @"claude",
              @"intent": @"coding", @"audience": @"developers", @"waitState": @YES };
}

// Stable per-device id, generated once and persisted. Lets the backend bind the
// account's key to this device (trust-on-first-use) and detect the key being
// copied to another machine. Not hardware-derived, so a reinstall makes a new id;
// re-pairing re-establishes it.
static NSString *DeviceId(void) {
    NSUserDefaults *def = [NSUserDefaults standardUserDefaults];
    NSString *did = [def stringForKey:@"PrismDeviceId"];
    if (!did.length) {
        did = [[NSUUID UUID].UUIDString stringByReplacingOccurrencesOfString:@"-" withString:@""];
        [def setObject:did forKey:@"PrismDeviceId"];
    }
    return did;
}

static NSDictionary *DeviceFingerprint(void) {
    return @{ @"deviceId": DeviceId(), @"platform": @"macos" };
}

static NSColor *ColorHex(uint32_t rgb) {
    return [NSColor colorWithSRGBRed:((rgb >> 16) & 0xff) / 255.0
                               green:((rgb >> 8) & 0xff) / 255.0
                                blue:(rgb & 0xff) / 255.0
                               alpha:1.0];
}

@interface PrismAdClient ()
@property(nonatomic, copy) NSString *baseURL;
@property(nonatomic, copy) NSString *sessionId;
@property(nonatomic, strong) NSArray<PrismAd *> *queue;   // immutable; replaced wholesale
@property(nonatomic, assign) NSUInteger cursor;
@end

@implementation PrismAdClient

- (instancetype)init {
    if ((self = [super init])) {
        NSDictionary *env = [NSProcessInfo processInfo].environment;
        NSString *url = env[@"PRISM_API_URL"];
        if (!url.length) url = [[NSUserDefaults standardUserDefaults] stringForKey:@"PrismApiUrl"];
        _baseURL = (url.length ? url : @"https://goprism.dev/api");
        // strip a trailing slash for consistent joins
        if ([_baseURL hasSuffix:@"/"]) _baseURL = [_baseURL substringToIndex:_baseURL.length - 1];
        _sessionId = [[NSUUID UUID].UUIDString stringByReplacingOccurrencesOfString:@"-" withString:@""];
        _queue = @[];   // empty until a connected account's API serves real ads
        _cursor = 0;
    }
    return self;
}

// A connected account = an API key. Prism shows nothing without one.
- (BOOL)isConnected {
    return [self currentApiKey].length > 0;
}

- (nullable PrismAd *)nextAd {
    NSArray<PrismAd *> *q = self.queue;
    if (q.count == 0) return nil;   // no demo fallback — require a connected account
    PrismAd *ad = q[self.cursor % q.count];
    self.cursor++;
    return ad;
}

#pragma mark - Networking (best-effort)

// Read the key fresh each request so a key saved during onboarding takes effect
// immediately. Env wins (dev), then the value saved by the onboarding window.
- (NSString *)currentApiKey {
    NSString *env = [NSProcessInfo processInfo].environment[@"PRISM_API_KEY"];
    if (env.length) return env;
    NSString *saved = [[NSUserDefaults standardUserDefaults] stringForKey:@"PrismApiKey"];
    return saved.length ? saved : @"";
}

- (NSMutableURLRequest *)postTo:(NSString *)path body:(NSDictionary *)body {
    NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:@"%@/%@", self.baseURL, path]];
    NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:url];
    req.HTTPMethod = @"POST";
    [req setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    NSString *key = [self currentApiKey];
    if (key.length) [req setValue:key forHTTPHeaderField:@"X-Prism-Api-Key"];
    req.HTTPBody = [NSJSONSerialization dataWithJSONObject:body options:0 error:nil];
    req.timeoutInterval = 4.0;
    return req;
}

- (void)refresh:(nullable NSString *)source {
    NSMutableDictionary *body = [@{ @"context": AdContext(), @"userId": self.sessionId,
                                    @"sessionId": self.sessionId, @"hiddenAdvertisers": @[] } mutableCopy];
    // The surface this ad would show on, so the auction can apply surface targeting.
    if (source.length) body[@"source"] = source;
    NSMutableURLRequest *req = [self postTo:@"ads" body:body];
    [[[NSURLSession sharedSession] dataTaskWithRequest:req
        completionHandler:^(NSData *data, NSURLResponse *resp, NSError *err) {
            if (err || !data) return;  // keep current/built-in queue
            id json = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
            PrismAd *ad = [self parseAd:json];
            if (ad) {
                // Replace the queue with the freshly served ad (immutable swap).
                dispatch_async(dispatch_get_main_queue(), ^{ self.queue = @[ad]; self.cursor = 0; });
            }
        }] resume];
}

- (nullable PrismAd *)parseAd:(id)json {
    if (![json isKindOfClass:[NSDictionary class]]) return nil;
    NSDictionary *d = json;
    NSString *adId = d[@"id"], *copy = d[@"copy"];
    if (!adId.length || !copy.length) return nil;  // name is advertiser-controlled and optional
    PrismAd *ad = [PrismAd new];
    ad.adId = adId; ad.tagline = copy;
    ad.advertiserName = [d[@"advertiserName"] isKindOfClass:[NSString class]] ? d[@"advertiserName"] : @"";
    ad.iconUrl = [d[@"iconUrl"] isKindOfClass:[NSString class]] ? d[@"iconUrl"] : nil;
    ad.clickURL = d[@"clickUrl"] ?: d[@"url"];
    ad.impressionToken = d[@"impressionToken"];
    // Identifiers the impression token is signed against — report them back verbatim.
    ad.userId = d[@"userId"];
    ad.sessionId = d[@"sessionId"];
    ad.color = ColorHex(0x8B5CF6);  // brand violet per ad-unit guidelines
    return ad;
}

- (void)reportImpression:(PrismAd *)ad durationMs:(NSInteger)durationMs source:(nullable NSString *)source {
    if (!ad.impressionToken.length) return;  // demo/built-in ads aren't billable
    // userId/sessionId MUST match what the impression token was signed against.
    NSString *uid = ad.userId.length ? ad.userId : self.sessionId;
    NSString *sid = ad.sessionId.length ? ad.sessionId : self.sessionId;
    NSDictionary *body = @{ @"userId": uid, @"sessionId": sid,
                            @"campaignId": ad.adId, @"impressionToken": ad.impressionToken,
                            @"durationMs": @(durationMs), @"context": AdContext(),
                            @"fingerprint": DeviceFingerprint(),
                            @"source": source.length ? source : @"unknown" };
    [[[NSURLSession sharedSession] dataTaskWithRequest:[self postTo:@"impressions" body:body]
        completionHandler:^(NSData *d, NSURLResponse *r, NSError *e) { /* fire and forget */ }] resume];
}

- (void)registerClick:(PrismAd *)ad {
    // Opening the click URL hits /api/clicks, which records the click (with
    // server-side fraud checks) and 302-redirects to the advertiser. So a single
    // openURL both registers the click and takes the user to the advertiser.
    NSString *target = ad.clickURL.length ? ad.clickURL : nil;
    if (!target) return;
    NSURL *url = [NSURL URLWithString:target];
    if (url && ([url.scheme isEqualToString:@"https"] || [url.scheme isEqualToString:@"http"])) {
        [[NSWorkspace sharedWorkspace] openURL:url];
    }
}

@end
