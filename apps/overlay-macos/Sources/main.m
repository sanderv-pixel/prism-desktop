// Prism Overlay — a background menu-bar app that shows a small sponsored line
// next to Claude's "working" indicator (Cowork & Code) while it generates.
// Read-only: it never modifies Claude. Detection is Accessibility-only.
#import <Cocoa/Cocoa.h>
#import "PrismAX.h"
#import "PrismOverlay.h"

@interface AppDelegate : NSObject <NSApplicationDelegate>
@property(nonatomic, strong) PrismController *controller;
@property(nonatomic, strong) NSStatusItem *status;
@property(nonatomic, strong) NSMenuItem *pauseItem;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)note {
    // Prompt for the one permission we need, the first time.
    [PrismAX isTrustedPrompt:YES];

    self.status = [[NSStatusBar systemStatusBar] statusItemWithLength:NSVariableStatusItemLength];
    self.status.button.title = @"◆";
    self.status.button.toolTip = @"Prism — sponsored line while Claude works";

    NSMenu *menu = [[NSMenu alloc] init];
    self.pauseItem = [menu addItemWithTitle:@"Pause" action:@selector(togglePause) keyEquivalent:@""];
    self.pauseItem.target = self;
    [menu addItemWithTitle:@"Open Accessibility Settings…" action:@selector(openSettings) keyEquivalent:@""].target = self;
    [menu addItem:[NSMenuItem separatorItem]];
    [menu addItemWithTitle:@"Quit Prism" action:@selector(quit) keyEquivalent:@"q"].target = self;
    self.status.menu = menu;

    self.controller = [PrismController new];
    [self.controller start];
}

- (void)togglePause {
    self.controller.paused = !self.controller.isPaused;
    self.pauseItem.title = self.controller.isPaused ? @"Resume" : @"Pause";
    self.status.button.title = self.controller.isPaused ? @"◇" : @"◆";
}

- (void)openSettings {
    NSURL *u = [NSURL URLWithString:@"x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"];
    [[NSWorkspace sharedWorkspace] openURL:u];
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
