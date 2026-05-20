# 🛠️ Karmanisht — Hyperlocal Service Discovery Platform

Karmanisht is a premium, full-featured hyperlocal marketplace application built with **React Native (Expo)**, **NativeWind (TailwindCSS)**, and the **InsForge Serverless Cloud Stack**. It bridges the gap between local consumers and service professionals (plumbers, electricians, technicians) utilizing geospatial tracking, secure OTP authentication, digital identity verification (KYC), and integrated payment checkouts.

---

## 🚀 Key Features

### 👤 Consumer Module (Customers)
* **Hyperlocal Discovery**: Discover nearby service providers dynamically matched by category, ratings, and real-time distance using spatial PostGIS queries.
* **OTP Sign-in**: Secure passwordless onboarding and authentication using custom mobile OTP verification.
* **Unlock Passes**: Purchase 5-hour contact unlock passes to view provider details and contact coordinates.
* **Review System**: Rate and write reviews to build provider reputation.

### 💼 Provider Module (Workers / Professionals)
* **Onboarding & Profile Setup**: Build professional profiles indicating business name, experience, biography, and base coordinates.
* **KYC Verification**: Securely submit Aadhaar and PAN documents for administrator review.
* **Skills Management**: Configure offered services from a taxonomy of categories and sub-service tags.
* **Monetization (Basic/Premium)**: Upgrade subscription tiers via Razorpay integration. Features a premium golden star badge and interactive custom **confetti celebrations** upon checkout.

### 🛡️ Admin Console (Management Panel)
* **Catalog Control**: Create, update, and manage global service categories and sub-service tags.
* **Provider Approval**: Review and verify pending provider profiles and KYC submissions.
* **Platform Configurations**: Fine-tune operational parameters and monitor payment ledgers.

---

## 🛠️ Technology Stack & Architecture

* **Core Framework**: Expo (React Native 0.81.5) with TSX.
* **Styling**: NativeWind (Tailwind CSS v4) for responsive utility-first styling.
* **State Management**: Zustand store split into decoupled slices (`authSlice`, `commonSlice`, `mapSlice`).
* **Backend Platform**: InsForge SDK (`@insforge/sdk`) for serverless storage buckets, Postgres database tables, and Edge Functions.
* **Spatial Tracking**: PostgreSQL PostGIS spatial indexing (`geo_location`) and mutual-radius RPC queries.
* **Payments**: Integrated Razorpay Checkout (`react-native-razorpay`).
* **Animations**: Native-driven `Animated` and `react-native-reanimated` animations including 60fps full-screen celebrate confetti.
* **Compatibility Polyfills**: Integrated `react-native-url-polyfill/auto` to ensure perfect network routing compliance across standard JS URL operations in Hermes.

---

## 📂 Project Structure

```
new/
├── .env                  # Local environment configuration (ignored in git)
├── app.json              # Expo configuration (permissions, package info, scheme)
├── eas.json              # EAS Build settings (profiles for dev, preview, production)
├── package.json          # Node dependencies
└── src/
    ├── app/              # File-based routing (Expo Router)
    │   ├── index.tsx     # Application entrypoint & session-routing gate
    │   ├── _layout.tsx   # Root layout, theme provider, and global polyfills
    │   ├── (onboarding)/ # Login, sign-up, and OTP verifications
    │   ├── (location)/   # Geolocation picker screens
    │   ├── (protected)/  # Protected screens (Consumer & Worker sections)
    │   └── admin/        # Admin console screens
    ├── components/       # Reusable components (Confetti, Map, Input, Button)
    ├── lib/              # Shared helper libraries
    │   ├── insforge.ts   # InsForge database client wrapper & S3 upload helpers
    │   └── store/        # Zustand global store configuration
    └── assets/           # Application images and font resources
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
Ensure you have the following installed on your developer machine:
* [Node.js](https://nodejs.org) (v18+ recommended)
* [Expo CLI](https://docs.expo.dev/)
* Android Studio Emulator or Xcode Simulator

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (based on `.env.example`):
```ini
EXPO_PUBLIC_INSFORGE_URL=https://[your-subdomain].insforge.app
EXPO_PUBLIC_INSFORGE_ANON_KEY=[your-anon-jwt-token]
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_[your-razorpay-key]
```

### 4. Start Development Server
```bash
# Start the Metro bundler
npm run start

# Run directly on an Android device/emulator
npm run android

# Run directly on an iOS device/simulator
npm run ios
```

---

## 📦 Building and Publishing (EAS)

The build environment is fully configured via `eas.json` for remote compilations:

### Build Preview Release (Internal Distribution APK)
```bash
eas build -p android --profile preview
```

### Build Production Release (App Store / Play Store AAB)
```bash
eas build -p android --profile production
```
