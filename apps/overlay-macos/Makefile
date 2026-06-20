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
FRAMEWORKS := -framework Cocoa -framework ApplicationServices
CFLAGS     := -fobjc-arc -Wall -O2
BUNDLE_ID  := dev.goprism.overlay
SIGN_ID    ?= -   # "-" = ad-hoc. Stable: make SIGN_ID="Prism Overlay Signing"

.PHONY: all run release reset clean

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

# Zip the signed app for distribution via install.sh. Verify the signature first.
release: all
	@codesign --verify --deep --strict $(APP) && echo "signature OK"
	@rm -f $(ZIP)
	ditto -c -k --keepParent $(APP) $(ZIP)
	@echo "Release: $(ZIP)  (signed with: $(SIGN_ID))"
	@echo "Upload it to where install.sh's PRISM_ZIP_URL points."

reset:
	tccutil reset Accessibility $(BUNDLE_ID)

clean:
	rm -rf build
