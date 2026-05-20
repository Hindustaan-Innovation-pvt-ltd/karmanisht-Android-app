<img src="./assets/images/dark_logo.png" width="100" height="100">

# Karmanisht — Hyperlocal Service Discovery Platform

Karmanisht is a hyperlocal service marketplace application built with React Native (Expo), NativeWind (TailwindCSS), and the InsForge Serverless Cloud Stack. 

It connects household consumers in tier-2 Indian cities (starting with Raipur, Chhattisgarh) with verified, proximity-sorted local service professionals (electricians, plumbers, AC technicians, carpenters, etc.) using physical distance matchmaking, secure OTP mobile authentication, digital identity verification (KYC), and Razorpay payment checkouts.

---

## Product Specifications

### 1. Two-Sided Marketplace Structure
* **Demand (Consumers)**: Households searching for immediate home services.
* **Supply (Workers / Providers)**: Independent local service professionals offering trade skills within a set travel radius.

### 2. Core Proximity Matchmaking (PostGIS Engine)
Unlike generic directories or postcode-based filters, Karmanisht uses exact GPS coordinates:
* Calculates the actual surface distance between the consumer and the worker's base coordinates using the PostGIS GEOGRAPHY data type (`ST_Distance`).
* Applies a hard radius eligibility filter: a worker is only shown in search results if the consumer's location falls within the worker's declared travel radius (`service_radius_km` ranging from 1 to 15 km).
* Results are dynamically sorted by distance (ascending) and average rating (descending).
* Only workers who toggle themselves Online (`is_available = true`) are visible to consumers.

### 3. Monetization Model
* **Consumer Unlock Passes**: Consumers pay a flat fee of ₹29 (configurable from ₹21 to ₹29) to reveal a worker's mobile number and WhatsApp contact link. Once unlocked, the contact remains permanently unblurred in the consumer's history without double charges.
* **Worker Premium Tier**: Providers can upgrade to a Premium Subscription via Razorpay checkout, unlocking a golden star profile badge for higher visibility, which features a high-performance confetti celebration animation upon payment.

---

## Key Features

### Consumer Module (Customers)
* **Hyperlocal Discovery**: Browse 18 essential service categories via a visual grid and view nearby online professionals.
* **Proximity Radius Filter**: Set a custom search radius (0–8 km) to control how far you are willing to let workers travel.
* **Contact History**: A "Your Contacts" panel on the home screen lists previously unlocked professionals for quick repeat bookings.
* **Secure OTP Sign-in**: Passwordless authentication utilizing a 4-digit mobile verification code.

### Provider Module (Workers)
* **4-Step Onboarding**: Profile setup covering basic details, primary profession and service tag chips, coverage radius slider with visual map base, and Aadhaar KYC document upload.
* **Availability Control**: Toggle online/offline status in the header to control real-time search visibility.
* **Consumer-view Preview**: A dedicated "Preview" tab showing the worker's profile exactly as consumers see it (blurred contact coordinates, ₹29 unlock button) to build trust and validate platform value.

### Admin Console (Management Panel)
* **Taxonomy Control**: Add and manage global service categories and sub-service tags.
* **KYC Document Approvals**: Review uploaded Aadhaar and credential documents to grant the "Verified" trust badge.
* **Platform Metrics**: Oversee lead conversions, active worker density, and Razorpay ledgers.

---

## Technology Stack

* **Frontend**: Expo (React Native 0.81.5) with TypeScript.
* **Styling**: NativeWind (Tailwind CSS v4) for responsive utility-first layouts.
* **State Management**: Zustand store split into decoupled slices (`authSlice`, `commonSlice`, `mapSlice`).
* **Backend Platform**: InsForge SDK (`@insforge/sdk`) for serverless storage, database tables, and edge functions.
* **Payments**: Integrated Razorpay Checkout SDK (`react-native-razorpay`).
* **Animations**: Native-driven `Animated` and `react-native-reanimated` animations including 60fps full-screen celebrate confetti.
* **URL Polyfills**: Pre-loaded `react-native-url-polyfill/auto` to ensure perfect network routing compliance across standard JS URL operations in Hermes.

---

## Project Structure

```
new/
├── .env                  # Local environment configurations (ignored in git)
├── app.json              # Expo configuration (permissions, package info, scheme)
├── eas.json              # EAS Build settings (profiles for dev, preview, production)
├── package.json          # Node dependencies
├── hindustaan-seva-prd.html # Product Requirements Document (PRD)
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

## Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```ini
EXPO_PUBLIC_INSFORGE_URL=https://[your-subdomain].insforge.app
EXPO_PUBLIC_INSFORGE_ANON_KEY=[your-anon-jwt-token]
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_[your-razorpay-key]
```

### 3. Start Development Server
```bash
# Start the Metro bundler
npm run start

# Run directly on an Android device/emulator
npm run android

# Run directly on an iOS device/simulator
npm run ios
```

---

## Building and Publishing (EAS)

The build environment is fully configured via `eas.json` for remote compilations:

### Build Preview Release (Internal Distribution APK)
```bash
eas build -p android --profile preview
```

### Build Production Release (App Store / Play Store AAB)
```bash
eas build -p android --profile production
```
