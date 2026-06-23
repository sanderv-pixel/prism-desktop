# Prism Overlay — build a macOS .app bundle with clang (no Xcode/SwiftPM needed).
#
#   make            build + ad-hoc sign the .app
#   make run        build, (re)launch the app
#   make release    build a signed, zipped app for the curl installer
#   make reset      clear the Accessibility grant (use after a rebuild during dev)
#   make clean      remove build output
#
# NOTE (dev): ad-hoc-signed apps are TCC-keyed by code hash, so every rebuild
# loses its Accessibility grant. `make reset` + relaunch gives a clean re-grant.
# For releases, sign with a STABLE identity so the user's grant survives updates:
#   scripts/setup-signing.sh           # one-time, no Apple account
#   make release SIGN_ID="Prism Overlay Signing"

APP        := build/PrismOverlay.app
BIN        := $(APP)/Contents/MacOS/PrismOverlay
ZIP        := build/PrismOverlay.zip
SOURCES    := $(wildcard Sources/*.m)
FRAMEWORKS := -framework Cocoa -framework ApplicationServices -framework QuartzCore
CFLAGS     := -fobjc-arc -Wall -O2
BUNDLE_ID  := dev.goprism.overlay
# "-" = ad-hoc (dev only). Releases must use the stable identity (see `release`):
#   make release SIGN_ID="Prism Overlay Signing"
SIGN_ID    ?= -

.PHONY: all run release reset clean notarize

all: $(BIN)

$(BIN): $(SOURCES) Info.plist
	@mkdir -p $(APP)/Contents/MacOS
	clang $(CFLAGS) $(SOURCES) $(FRAMEWORKS) -o $(BIN)
	@cp Info.plist $(APP)/Contents/Info.plist
	codesign --force --sign "$(SIGN_ID)" $(APP)
	@echo "Built $(APP)"

run: all
	-@pkill -f PrismOverlay 2>/dev/null || true
	@sleep 1
	open $(APP)

# Zip the signed app for distribution via install.sh.
# Releases MUST be signed with the stable self-signed identity (not ad-hoc): the
# user's Accessibility/Screen-Recording grant is keyed to the app's designated
# requirement, which an ad-hoc build changes on EVERY rebuild. Ad-hoc releases =
# the ad silently stops after every update and users churn. Use the same cert on
# every build machine so the requirement is identical everywhere (export once
# from Keychain Access as a .p12 and import it on the others).
release: all
	@if [ "$(SIGN_ID)" = "-" ]; then \
	  echo "ERROR: refusing to cut a release with ad-hoc signing (SIGN_ID=-)."; \
	  echo "Ad-hoc builds change identity every rebuild, so users lose their"; \
	  echo "Accessibility/Screen-Recording grant on every update and the ad stops."; \
	  echo "Sign with the stable self-signed identity instead:"; \
	  echo "    scripts/setup-signing.sh                       # one-time, no Apple account"; \
	  echo "    make release SIGN_ID=\"Prism Overlay Signing\""; \
	  exit 1; \
	fi
	@codesign --verify --deep --strict $(APP) && echo "signature OK"
	@if codesign -dvv $(APP) 2>&1 | grep -qi "Signature=adhoc"; then \
	  echo "ERROR: release is still ad-hoc signed after signing. Aborting."; exit 1; fi
	@echo "Signed identity (must be identical across all release builds):"; \
	  codesign -dvv $(APP) 2>&1 | grep -E "Identifier|Authority" | sed 's/^/  /'
	@rm -f $(ZIP)
	ditto -c -k --keepParent $(APP) $(ZIP)
	@echo "Release: $(ZIP)  (signed with: $(SIGN_ID))"
	@echo "Upload it to where install.sh's PRISM_ZIP_URL points."

reset:
	tccutil reset Accessibility $(BUNDLE_ID)

# Build a notarized, stapled Prism.dmg (clickable, no-Terminal installer). Needs a
# Developer ID cert + notary credentials — see scripts/notarize.sh for setup.
#   make notarize DEVID="Developer ID Application: Your Name (TEAMID)"
notarize:
	DEVID="$(DEVID)" NOTARY_PROFILE="$(NOTARY_PROFILE)" scripts/notarize.sh

clean:
	rm -rf build
