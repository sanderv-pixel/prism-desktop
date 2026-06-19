# Prism Overlay — build a macOS .app bundle with clang (no Xcode/SwiftPM needed).
#
#   make            build + ad-hoc sign the .app
#   make run        build, (re)launch the app
#   make reset      clear the Accessibility grant (use after a rebuild during dev)
#   make clean      remove build output
#
# NOTE (dev): ad-hoc-signed apps are TCC-keyed by code hash, so every rebuild
# loses its Accessibility grant. `make reset` + relaunch gives a clean re-grant.
# For distribution, sign with a Developer ID identity (see SIGN_ID) so the grant
# is one-time and survives updates.

APP        := build/PrismOverlay.app
BIN        := $(APP)/Contents/MacOS/PrismOverlay
SOURCES    := $(wildcard Sources/*.m)
FRAMEWORKS := -framework Cocoa -framework ApplicationServices
CFLAGS     := -fobjc-arc -Wall -O2
BUNDLE_ID  := dev.goprism.overlay
SIGN_ID    ?= -   # "-" = ad-hoc. Override: make SIGN_ID="Developer ID Application: …"

.PHONY: all run reset clean

all: $(BIN)

$(BIN): $(SOURCES) Info.plist
	@mkdir -p $(APP)/Contents/MacOS
	clang $(CFLAGS) $(SOURCES) $(FRAMEWORKS) -o $(BIN)
	@cp Info.plist $(APP)/Contents/Info.plist
	codesign --force --sign $(SIGN_ID) $(APP)
	@echo "Built $(APP)"

run: all
	-@pkill -f PrismOverlay 2>/dev/null || true
	@sleep 1
	open $(APP)

reset:
	tccutil reset Accessibility $(BUNDLE_ID)

clean:
	rm -rf build
