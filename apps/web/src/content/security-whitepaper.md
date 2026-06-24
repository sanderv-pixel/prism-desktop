# Prism Security & Privacy Whitepaper

**Version 1.0 · June 2026 · goprism.dev**

Prism shows one small, clearly labeled ad while your AI assistant is thinking, and pays you for it. To do that, Prism only needs to know one thing: *is your AI busy or idle?* It never needs to know what you are working on. This document explains exactly how that works, and backs every claim with the actual source so you can verify it yourself rather than take our word for it.

Every code excerpt below is quoted from Prism's open overlay clients. File paths are given so you can read the full context.

> Source for everything in this paper: the Prism overlay clients at **[REPO_URL]** (macOS: `apps/overlay-macos`, Windows: `apps/overlay-windows`). If you only read one thing, read `apps/overlay-macos/Sources/PrismAX.m` and `apps/overlay-windows/src/UiaDetector.cs`, the two files that touch your system.

---

## 1. The one-line summary

Prism is a **signed native app**, not a browser or editor extension. It detects the AI's *working* indicator by reading the operating system's accessibility tree in a **read-only** way, keeps only the on-screen **pixel rectangle** of that indicator so it can place the ad next to it, and sends the backend a **fixed, content-free context** (`editor`, `aiTool`, `waitState`). The data structure that carries a detection result has **no field capable of holding your text**, and the only functions that could read arbitrary screen text are **compiled out of the shipped binary**. You can confirm each of those statements in the snippets below.

---

## 2. Claims, and how to verify each one

| Claim | Verify in |
|---|---|
| Detection only reads the AX/UIA tree; it never writes to or modifies any app | `PrismAX.h` header comment; `PrismAX.m`; `UiaDetector.cs` ("Read-only UI Automation") |
| A detection result cannot carry your code/prompt text (no text field exists) | `PrismDetection` interface in `PrismAX.h`; `WorkIndicator` struct in `UiaDetector.cs` |
| The functions that could read arbitrary screen text are debug-only and excluded from release | `#if DEBUG` guards in `PrismAX.h` / `PrismAX.m` |
| What we send over the network contains no code, prompts, or file contents | `AdContext()` in `PrismAd.m`; `Context()` in `AdClient.cs` |
| Prism reads no editor config, transcripts, or files (the kickbacks.ai failure mode) | absence of any file reads in the overlay source; only AX/UIA + HTTPS to the Prism API |
| The "device fingerprint" is a random per-install UUID, not hardware tracking | `DeviceId()` in `PrismAd.m` |
| A fully content-blind detection mode exists and can be switched on | `detectOSSignal` in `PrismAX.m` |

---

## 3. What developers are right to worry about

A tool that sits in your editor and can see the screen is, in principle, dangerous. The well-publicised failure mode (seen in a competing browser-extension product) was an app that read `~/.claude` transcripts and `settings.json`, weakened the editor's content security policy, and shipped unsigned auto-updates. Those are exactly the behaviors that make developers distrust this category, and Prism is architected to do none of them. The rest of this paper shows where that is enforced in code.

---

## 4. Architecture: native, on-device, read-only

Prism runs as a background native app (`LSUIElement`, no dock icon) on macOS and Windows. It does not inject into, repackage, or modify your editor. It uses the platform's standard assistive-technology API, macOS Accessibility (AX) and Windows UI Automation (UIA), the same APIs screen readers use, to locate the AI's "working" indicator on screen.

The header of the macOS detector states the contract directly:

```objc
// PrismAX — read-only macOS Accessibility helpers for locating an AI "working"
// indicator across supported surfaces ...
// Nothing here mutates any app. We only read the AX tree. Each indicator exists
// only while the AI is actively thinking/streaming and disappears when idle.
```
*(apps/overlay-macos/Sources/PrismAX.h)*

The Windows detector says the same:

```csharp
/// Read-only UI Automation: find Claude's window and the "working" status text.
```
*(apps/overlay-windows/src/UiaDetector.cs)*

---

## 5. What Prism actually reads (and why it is not your content)

Prism finds the *working* indicator using **structural anchors**, the shape of the UI, not the meaning of your text.

**Claude Desktop.** It looks for the one row that carries two specific CSS layout classes. These are style hooks, not content:

```objc
// Claude (Cowork/Code): the work-indicator row holds the live timer + token count
// and the thinking verb. It is the only row carrying BOTH of these classes.
static BOOL IsClaudeWorkRow(NSString *classes) {
    return [classes containsString:@"tabular-nums"] &&
           [classes containsString:@"text-assistant-secondary"];
}
```
*(apps/overlay-macos/Sources/PrismAX.m)*

**Cursor.** It reads the *state of a button*, not text. The send button becomes a stop button while generating:

```objc
// Cursor: ... `sendButton_` present WITHOUT `sendIcon_` == working.
if ([AXClassList(el) containsString:@"sendButton"]) {
    if (!AXSubtreeHasClass(el, @"sendIcon", 0)) {   // no send arrow => Stop => generating
        CGRect f = AXFrameOf(el);
        if (f.size.width > 0 && f.size.height > 0) { out.found = YES; out.frame = f; }
    }
    ...
}
```
*(apps/overlay-macos/Sources/PrismAX.m)*

**Codex.** It checks one control's accessibility title equals the literal string `"Stop"`:

```objc
if ([name isEqualToString:@"Stop"]) {
    CGRect f = AXFrameOf(el);
    if (f.size.width > 0 && f.size.height > 0) { out.found = YES; out.frame = f; }
}
```
*(apps/overlay-macos/Sources/PrismAX.m)*

**Windows / Claude.** UIA does not expose CSS classes, so it matches a short status string against a fixed list of "thinking" verbs (capped at 28 characters, 1-4 tokens) only to find that element's rectangle:

```csharp
if (!s.EndsWith("…") && !s.EndsWith("...")) return false;
s = s.TrimEnd('.', '…', ' ');
if (s.Length == 0 || s.Length > 28) return false;
...
if (!Verbs.Contains(tokens[^1])) return false;
```
*(apps/overlay-windows/src/UiaDetector.cs)*

In every case, the output Prism keeps is the indicator's **on-screen rectangle**, so it can float the ad pill next to it. Nothing about your prompt, code, or the AI's answer is part of that.

---

## 6. The structural guarantee: a detection result has no place to put your text

This is the strongest single guarantee in Prism. The object returned by a detection pass can only hold a boolean, a rectangle, and a one-word source label. There is no text field, so by construction your content cannot ride along:

```objc
@interface PrismDetection : NSObject
@property(nonatomic, assign) BOOL found;
@property(nonatomic, assign) CGRect frame;     // just the on-screen rectangle
@property(nonatomic, copy, nullable) NSString *source;  // "claude"|"cursor"|"terminal"|"codex"
@end
```
*(apps/overlay-macos/Sources/PrismAX.h)*

Windows is identical in spirit:

```csharp
public struct WorkIndicator
{
    public bool Found;
    public Rectangle Rect; // screen pixels
}
```
*(apps/overlay-windows/src/UiaDetector.cs)*

---

## 7. The one place text is read transiently, and why it is safe

Honesty matters more than a tidy slogan, so here is the single nuance. For terminal CLIs (Claude Code in Terminal/iTerm/etc.), the AI's status line lives inside the terminal's text buffer. Prism reads that buffer string **in process** only to run one regular expression that locates the `(Ns · N tokens)` status line, and keeps **only that line's pixel rectangle**. The buffer text is never stored on the result object (it has none) and never transmitted. The code says so at the exact spot it happens:

```objc
// Privacy: the buffer text is scanned in-process ONLY to locate the
// "(Ns · N tokens)" status-line anchor. We keep just that line's on-screen
// frame (below); no buffer / prompt / response / code text is retained on the
// detection result (PrismDetection has no text field) or transmitted.
NSRange line = WorkingLineRange(AXStringValue(ta));
```
*(apps/overlay-macos/Sources/PrismAX.m)*

The regex it matches is purely the status format, not your content:

```objc
re = [NSRegularExpression regularExpressionWithPattern:@"\\(\\d+s[^)]*tokens?\\)" options:0 error:nil];
```

If even transient in-process scanning is more than you want, see the content-blind mode in section 9.

---

## 8. The shipped binary cannot read arbitrary screen text

Prism does contain functions that can dump a full accessibility tree or terminal scrollback, but they exist only to discover new tools during development, and they are **compiled out of every release build**. The project builds without `-DDEBUG`, so these symbols are not in the binary you install:

```objc
// Debug-only AX tree/text dumps. Excluded from release builds (the project builds
// without -DDEBUG) so the shipped binary carries no symbol that can read arbitrary
// on-screen UI text or terminal scrollback. Build with -DDEBUG to use them.
#if DEBUG
+ (NSString *)dumpClaude;
+ (NSString *)dumpFront;
+ (NSString *)dumpFrontText;
#endif
```
*(apps/overlay-macos/Sources/PrismAX.h)*

You can verify this in the shipped app: the broad-text-reading code is behind `#if DEBUG` and absent from release symbols.

---

## 9. A fully content-blind mode (opt-in)

For privacy maximalists, Prism ships an alternative detector that never reads the accessibility tree or any on-screen text at all. It infers "the user is waiting on an AI" purely from which app is frontmost plus the absence of keyboard/mouse input, and anchors the pill to the window's geometry:

```objc
// OS-signal detection (privacy-clean, off by default). Infers "user is waiting on
// an AI" from frontmost-app + input idle, and anchors to the focused window's
// geometry from the window server. Never reads the AX tree or any on-screen text.
+ (PrismDetection *)detectOSSignal;
```
*(apps/overlay-macos/Sources/PrismAX.h)*

It is off by default only because it is less precise (it cannot tell "thinking" from "reading"). It can be enabled with `PRISM_DETECT_MODE=os-signal`.

---

## 10. What actually leaves your device

When Prism asks the backend for an ad, the only context it attaches is a fixed, content-free dictionary. There is no code, no prompt, no file path, no snippet:

```objc
// Context we report to the API. Honest + minimal: editor + tool + wait state.
// No source code, prompts, or file contents — by design.
static NSDictionary *AdContext(void) {
    return @{ @"editor": @"claude-desktop", @"aiTool": @"claude",
              @"intent": @"coding", @"audience": @"developers", @"waitState": @YES };
}
```
*(apps/overlay-macos/Sources/PrismAd.m)*

The Windows client sends the same shape:

```csharp
private static object Context() => new
{
    editor = "claude-desktop", aiTool = "claude", intent = "coding",
    audience = "developers", waitState = true,
};
```
*(apps/overlay-windows/src/AdClient.cs)*

The "device fingerprint" used to bind your API key to your machine is a **random UUID generated once and stored locally**, not a hardware identifier. A reinstall makes a new one:

```objc
// Stable per-device id ... Not hardware-derived, so a reinstall makes a new id ...
static NSString *DeviceFingerprint(void) {
    return @{ @"deviceId": DeviceId(), @"platform": @"macos" };
}
```
*(apps/overlay-macos/Sources/PrismAd.m)*

All API calls go to `https://goprism.dev/api` over TLS. Impression reports carry the campaign id, a signed single-use impression token, a duration, and the same fixed context, nothing about your work.

---

## 11. What Prism never does

- It never reads your prompts, code, model outputs, file contents, or terminal scrollback into anything that is stored or sent. (Sections 5-8.)
- It never reads your editor's config, settings, or chat transcripts on disk. The overlay touches only the AX/UIA APIs and the Prism HTTPS API.
- It never modifies, injects into, or repackages your editor, and never weakens any content security policy. Detection is read-only. (Section 4.)
- It ships **signed and notarized**; updates are signed. There are no unsigned auto-updates.
- It does not track you across the web or set ad-targeting cookies.
- It shows nothing at all unless you have connected an account (an API key). With no key, the ad queue is empty:

```objc
// A connected account = an API key. Prism shows nothing without one.
- (BOOL)isConnected { return [self currentApiKey].length > 0; }
```
*(apps/overlay-macos/Sources/PrismAd.m)*

---

## 12. Permissions and control

- **macOS:** Prism requests the standard Accessibility permission via `AXIsProcessTrustedWithOptions`. It is used solely for the read-only detection above. You grant it explicitly in System Settings and can revoke it any time.
- **Windows:** Prism uses UI Automation, which needs no special grant; it is read-only.
- Prism is a background agent (`LSUIElement`) with no dock icon, can be paused at any time, and uninstalls in seconds, removing the app removes everything.

---

## 13. How to verify this yourself

1. **Read the source.** Every claim above cites a file and you can read the full context at [REPO_URL].
2. **Inspect the network.** Point any HTTPS proxy (Proxyman, mitmproxy, Charles) at the app and watch every request. You will see only the fixed context, the impression token, and timing, never your content.
3. **Check the release build.** Confirm the `#if DEBUG` text-dump functions are absent from the shipped binary's symbols.
4. **Reproducible, signed builds.** Builds are signed and notarized so the binary you run matches the published source. *(Commitment; see section 14.)*
5. **Third-party audit.** We are commissioning an independent security review and will publish the report here. *(Commitment.)*
6. **Responsible disclosure.** Found something? Email security@goprism.dev. We run a coordinated-disclosure process and will credit you.

---

## 14. Honest status of commitments

So that nothing here is overstated:

- The code excerpts and behaviors in sections 4-12 are **true today** and verifiable in the current source.
- Open public source, reproducible-build attestation, and the third-party audit (sections 13.1, 13.4, 13.5) are **commitments in progress**, not yet complete. We will mark each as done with a link when it ships, and will not claim "audited" or "open source" until it is literally true.

---

*Prism · goprism.dev · security@goprism.dev · Whitepaper v1.0, June 2026*

> Author note (remove before publishing): replace `[REPO_URL]` with the public overlay repo link. The whitepaper assumes the overlay source is publicly readable, so the verification claims hold; make the repo (or at least `apps/overlay-macos` and `apps/overlay-windows`) public before linking this. Also reconcile the live /security page copy, which says "a lightweight fingerprint is sent", with the actual fixed `AdContext()` (the reality is even more privacy-preserving; update the page to match).
