---
description: How to deploy the Wholesale Admin APK for Android
---

This workflow guides you through building a standalone APK for testing or direct distribution.

### Prerequisites
1. Ensure you are logged into EAS: `npx eas whoami`
2. Ensure you have the latest code changes committed.

### Deployment Steps

1. **Start the APK Build**
   // turbo
   Run the following command to start the build on EAS servers:
   ```bash
   npx eas build --profile apk --platform android
   ```

2. **Wait for Completion**
   The build will take 10-20 minutes. You can follow the progress in the terminal or on the [Expo Dashboard](https://expo.dev/artifacts).

3. **Download and Install**
   Once finished, EAS will provide a direct download link for the `.apk` file.
   - Download the APK to your Android device.
   - Open the file to install it (you may need to allow "Install from Unknown Sources").

### Troubleshooting
- If the build fails due to **Credentials**, run `npx eas build:configure` to reset your Keystore.
- If **Environment Variables** are missing, check `eas.json` under the `production` profile.
