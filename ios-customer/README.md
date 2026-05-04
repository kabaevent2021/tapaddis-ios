# TapAddis Customer iOS

Native SwiftUI V1 for the TapAddis customer app.

## What this app supports

- Phone + PIN sign in and customer registration.
- Face ID / Touch ID unlock after a successful sign in.
- Wallet balance, recent activity, notifications, profile, language selection, and profile photo upload.
- Vehicle QR scan and 6-digit vehicle code payment.

## What is intentionally not in V1

- iPhone NFC tap-to-pay / card emulation.
- Crew, kiosk, or NFC card writer workflows.
- SMS OTP, Fayda, or Apple Wallet transit-card integration.

## Build on a Mac

This repo uses an XcodeGen project spec so the source can live cleanly in version control.

```bash
cd ios-customer
brew install xcodegen
xcodegen generate
open TapAddisCustomer.xcodeproj
```

In Xcode:

1. Select the `TapAddis` target.
2. Choose your Apple Developer Team.
3. Confirm bundle identifier is `com.tapaddis.customer`.
4. Run on an iPhone for camera and Face ID / Touch ID testing.

The app points to:

```text
https://api.tapaddis.com/api
```

