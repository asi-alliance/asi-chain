#!/bin/bash

# Script to generate various favicon formats from ASI icon
# Requires ImageMagick to be installed

echo "Generating favicons from ASI icon..."

SOURCE="./public/asi-icon.png"
PUBLIC_DIR="./public"

if [ ! -f "$SOURCE" ]; then
    echo "Error: $SOURCE not found!"
    exit 1
fi

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is not installed. To install:"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "  Other: https://imagemagick.org/script/download.php"
    exit 1
fi

# Generate favicon.ico with multiple sizes
echo "Creating favicon.ico..."
convert "$SOURCE" -resize 16x16 -gravity center -extent 16x16 "$PUBLIC_DIR/favicon-16.png"
convert "$SOURCE" -resize 32x32 -gravity center -extent 32x32 "$PUBLIC_DIR/favicon-32.png"
convert "$SOURCE" -resize 48x48 -gravity center -extent 48x48 "$PUBLIC_DIR/favicon-48.png"
convert "$PUBLIC_DIR/favicon-16.png" "$PUBLIC_DIR/favicon-32.png" "$PUBLIC_DIR/favicon-48.png" "$PUBLIC_DIR/favicon.ico"
rm "$PUBLIC_DIR/favicon-16.png" "$PUBLIC_DIR/favicon-32.png" "$PUBLIC_DIR/favicon-48.png"

# Generate PWA icons
echo "Creating PWA icons..."
convert "$SOURCE" -resize 192x192 -gravity center -extent 192x192 "$PUBLIC_DIR/logo192.png"
convert "$SOURCE" -resize 512x512 -gravity center -extent 512x512 "$PUBLIC_DIR/logo512.png"

# Generate Apple touch icon
echo "Creating Apple touch icon..."
convert "$SOURCE" -resize 180x180 -gravity center -extent 180x180 "$PUBLIC_DIR/apple-touch-icon.png"

echo "✅ Favicon generation complete!"
echo ""
echo "Generated files:"
echo "  - favicon.ico (16x16, 32x32, 48x48)"
echo "  - logo192.png (PWA icon)"
echo "  - logo512.png (PWA icon)"
echo "  - apple-touch-icon.png (Apple devices)"
echo ""
echo "The wallet will now use the ASI icon as its favicon."