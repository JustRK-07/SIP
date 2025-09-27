# LiveKit CLI Setup Guide

This application requires the LiveKit CLI for deploying agents to LiveKit Cloud.

## Installation Instructions

### For macOS ARM64 (Apple Silicon):

1. **Download the CLI**:
   ```bash
   curl -L -o livekit-cli.tar.gz https://github.com/livekit/livekit-cli/releases/latest/download/livekit-cli-darwin-arm64.tar.gz
   ```

2. **Extract**:
   ```bash
   tar -xzf livekit-cli.tar.gz
   ```

3. **Make executable and move to PATH**:
   ```bash
   chmod +x lk
   sudo mv lk /usr/local/bin/
   ```

4. **Verify installation**:
   ```bash
   lk version
   ```

### For macOS x64 (Intel):

Replace `darwin-arm64` with `darwin-amd64` in step 1.

### Alternative Installation (without sudo):

1. Create a local bin directory:
   ```bash
   mkdir -p ~/.local/bin
   ```

2. Download and extract to local bin:
   ```bash
   curl -L https://github.com/livekit/livekit-cli/releases/latest/download/livekit-cli-darwin-arm64.tar.gz | tar -xz -C ~/.local/bin
   ```

3. Add to PATH (add to ~/.bashrc or ~/.zshrc):
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   ```

4. Restart terminal or source your shell config:
   ```bash
   source ~/.bashrc  # or source ~/.zshrc
   ```

## Troubleshooting

- **"lk: command not found"**: The CLI is not in your PATH. Verify installation location and PATH configuration.
- **"permission denied"**: Run `chmod +x` on the lk binary.
- **Archive format error**: Re-download the CLI, the archive may be corrupted.

## Current Status

The application is configured for **LiveKit Cloud only** deployment. Local fallback has been disabled per requirements.

## Configuration

The app uses these LiveKit Cloud settings:
- URL: `wss://firstproject-ly6tfhj5.livekit.cloud`
- API Key: `API7xEu4QebToWF`
- API Secret: (configured in environment)

Once the CLI is installed, agent deployments will create managed agents directly on LiveKit Cloud infrastructure.