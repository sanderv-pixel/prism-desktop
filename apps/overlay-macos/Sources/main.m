// Prism Overlay — a background menu-bar app that shows a small sponsored line
// next to Claude's "working" indicator (Cowork & Code) while it generates.
// Read-only: it never modifies Claude. Detection is Accessibility-only.
#import <Cocoa/Cocoa.h>
#import "PrismAX.h"
#import "PrismOverlay.h"
#import "PrismOnboarding.h"

@interface AppDelegate : NSObject <NSApplicationDelegate>
@property(nonatomic, strong) PrismController *controller;
@property(nonatomic, strong) PrismOnboarding *onboarding;
@property(nonatomic, strong) NSStatusItem *status;
@property(nonatomic, strong) NSMenuItem *pauseItem;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)note {
    self.status = [[NSStatusBar systemStatusBar] statusItemWithLength:NSVariableStatusItemLength];
    self.status.button.title = @"◆";
    self.status.button.toolTip = @"Prism — sponsored line while Claude works";

    NSMenu *menu = [[NSMenu alloc] init];
    self.pauseItem = [menu addItemWithTitle:@"Pause" action:@selector(togglePause) keyEquivalent:@""];
    self.pauseItem.target = self;
    [menu addItemWithTitle:@"Setup…" action:@selector(showOnboarding) keyEquivalent:@""].target = self;
    [menu addItem:[NSMenuItem separatorItem]];
    [menu addItemWithTitle:@"Quit Prism" action:@selector(quit) keyEquivalent:@"q"].target = self;
    self.status.menu = menu;

    self.controller = [PrismController new];
    [self.controller start];

    // First run (or Accessibility not yet granted): walk the user through setup.
    if ([PrismOnboarding shouldShowOnLaunch]) [self showOnboarding];
}

- (void)showOnboarding {
    if (!self.onboarding) self.onboarding = [PrismOnboarding new];
    [self.onboarding show];
}

- (void)togglePause {
    self.controller.paused = !self.controller.isPaused;
    self.pauseItem.title = self.controller.isPaused ? @"Resume" : @"Pause";
    self.status.button.title = self.controller.isPaused ? @"◇" : @"◆";
}

- (void)quit { [NSApp terminate:nil]; }

@end

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        [app setActivationPolicy:NSApplicationActivationPolicyAccessory];  // menu-bar only, no Dock
        AppDelegate *delegate = [AppDelegate new];
        app.delegate = delegate;
        [app run];
    }
    return 0;
}
