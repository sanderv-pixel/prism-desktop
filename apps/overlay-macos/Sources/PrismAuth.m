#import "PrismAuth.h"
#import <Cocoa/Cocoa.h>

static const NSTimeInterval kPollInterval = 2.5;
static const int kMaxPolls = 120; // ~5 minutes

@interface PrismAuth ()
@property(nonatomic, copy) NSString *code;
@property(nonatomic, copy) NSString *apiBase;     // e.g. https://goprism.dev/api
@property(nonatomic, copy) NSString *webOrigin;   // e.g. https://goprism.dev
@property(nonatomic, strong) NSTimer *timer;
@property(nonatomic, assign) int polls;
@property(nonatomic, assign) BOOL inflight;
@property(nonatomic, copy) void (^update)(NSString *, BOOL, BOOL);
@end

@implementation PrismAuth

- (NSString *)resolveApiBase {
    NSString *u = [NSProcessInfo processInfo].environment[@"PRISM_API_URL"];
    if (!u.length) u = [[NSUserDefaults standardUserDefaults] stringForKey:@"PrismApiUrl"];
    if (!u.length) u = @"https://goprism.dev/api";
    if ([u hasSuffix:@"/"]) u = [u substringToIndex:u.length - 1];
    return u;
}

- (NSString *)originFromBase:(NSString *)base {
    if ([base hasSuffix:@"/api"]) return [base substringToIndex:base.length - 4];
    return base;
}

- (NSString *)randomCode {
    uint8_t bytes[16];
    arc4random_buf(bytes, sizeof(bytes));
    NSMutableString *s = [NSMutableString stringWithCapacity:32];
    for (size_t i = 0; i < sizeof(bytes); i++) [s appendFormat:@"%02x", bytes[i]];
    return s;
}

- (void)connectWithStatus:(void (^)(NSString *, BOOL, BOOL))update {
    [self cancel];
    self.update = update;
    self.apiBase = [self resolveApiBase];
    self.webOrigin = [self originFromBase:self.apiBase];
    self.code = [self randomCode];
    self.polls = 0;

    NSString *link = [NSString stringWithFormat:@"%@/link?code=%@", self.webOrigin, self.code];
    [[NSWorkspace sharedWorkspace] openURL:[NSURL URLWithString:link]];
    [self emit:@"Opened your browser — sign in or create an account…" done:NO success:NO];

    self.timer = [NSTimer scheduledTimerWithTimeInterval:kPollInterval target:self
                                                selector:@selector(poll) userInfo:nil repeats:YES];
}

- (void)cancel {
    [self.timer invalidate];
    self.timer = nil;
    self.inflight = NO;
}

- (void)emit:(NSString *)msg done:(BOOL)done success:(BOOL)success {
    if (!self.update) return;
    void (^cb)(NSString *, BOOL, BOOL) = self.update;
    dispatch_async(dispatch_get_main_queue(), ^{ cb(msg, done, success); });
}

- (void)poll {
    if (self.inflight) return;
    if (++self.polls > kMaxPolls) {
        [self cancel];
        [self emit:@"Timed out — click Connect to try again." done:YES success:NO];
        return;
    }
    self.inflight = YES;

    NSString *u = [NSString stringWithFormat:@"%@/auth/pair?code=%@", self.apiBase, self.code];
    NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:u]];
    req.timeoutInterval = 8.0;

    __weak PrismAuth *weakSelf = self;
    [[[NSURLSession sharedSession] dataTaskWithRequest:req
        completionHandler:^(NSData *data, NSURLResponse *resp, NSError *err) {
            PrismAuth *self = weakSelf;
            if (!self) return;
            self.inflight = NO;
            NSInteger status = [(NSHTTPURLResponse *)resp statusCode];
            if (status == 200 && data.length) {
                id json = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
                NSString *key = [json isKindOfClass:[NSDictionary class]] ? json[@"apiKey"] : nil;
                if (key.length) {
                    [[NSUserDefaults standardUserDefaults] setObject:key forKey:@"PrismApiKey"];
                    [self cancel];
                    [self emit:@"✓ Connected — live ads enabled." done:YES success:YES];
                    return;
                }
            }
            // 204 (pending) or transient error: keep waiting.
            [self emit:@"Waiting for you to finish in the browser…" done:NO success:NO];
        }] resume];
}

@end
