#!/bin/bash

# Install LiveKit CLI for macOS ARM64
echo "Installing LiveKit CLI..."

# Download the CLI
curl -L -o lk.tar.gz https://github.com/livekit/livekit-cli/releases/download/v1.4.2/lk_1.4.2_darwin_arm64.tar.gz

# Extract the CLI
tar -xzf lk.tar.gz

# Make it executable
chmod +x lk

# Create a local bin directory if it doesn't exist
mkdir -p ~/.local/bin

# Move lk to local bin
mv lk ~/.local/bin/

# Clean up
rm -f lk.tar.gz

# Add to PATH if not already there
if ! echo $PATH | grep -q "$HOME/.local/bin"; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
fi

# Test the installation
export PATH="$HOME/.local/bin:$PATH"
if command -v lk &> /dev/null; then
    echo "✅ LiveKit CLI installed successfully!"
    lk version
else
    echo "❌ Installation failed. Please try manual installation."
fi

echo ""
echo "Installation complete. You may need to restart your terminal or run:"
echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""