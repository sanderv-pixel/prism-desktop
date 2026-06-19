APP_NAME := Prism
BUILD_DIR := build
APP_BUNDLE := $(BUILD_DIR)/$(APP_NAME).app
BIN := $(APP_BUNDLE)/Contents/MacOS/$(APP_NAME)
SRCS := $(wildcard Sources/PrismMac/*.swift)
SDK_PATH := $(shell xcrun --sdk macosx --show-sdk-path)
ARCH := $(shell uname -m)

.PHONY: all build run clean

all: build

build: $(APP_BUNDLE)

$(APP_BUNDLE): $(SRCS) Resources/Info.plist Prism.entitlements
	@mkdir -p $(APP_BUNDLE)/Contents/MacOS
	xcrun -sdk macosx swiftc \
		-target $(ARCH)-apple-macos13.0 \
		-sdk $(SDK_PATH) \
		-O \
		-o $(BIN) \
		-framework Cocoa \
		-framework ApplicationServices \
		-framework ServiceManagement \
		$(SRCS)
	cp Resources/Info.plist $(APP_BUNDLE)/Contents/Info.plist
	cp -R Resources/. $(APP_BUNDLE)/Contents/Resources/
	codesign --force --deep --sign - $(APP_BUNDLE)

run: build
	open $(APP_BUNDLE)

clean:
	rm -rf $(BUILD_DIR)
