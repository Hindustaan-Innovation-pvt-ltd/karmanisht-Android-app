# Release & Versioning Policy — Karmanisht

This document defines the standard release, versioning, and build tagging process for **Karmanisht** (Hyperlocal Service Discovery Platform). The project is built using Expo (`~54.0.33`), Expo Router (`~6.0.23`), React Native (`0.81.5`), InsForge SDK, and native Firebase, managed with EAS Build pipelines.

---

## 1. Versioning Standard

Karmanisht strictly adheres to **Semantic Versioning (SemVer)**:

```bash
MAJOR.MINOR.PATCH
```

* **MAJOR**: Breaking changes, significant feature overhauls, or major framework upgrades (e.g., updating Expo SDK).
* **MINOR**: New backward-compatible feature additions (e.g., adding user address management, translation updates).
* **PATCH**: Backward-compatible bug fixes and minor styling tweaks.

### Dynamic Version Injection
The application supports dual version management:
1. **Static Configuration**: Declared in `package.json` (`version`) and `app.json` (`expo.version`).
2. **Dynamic Injection**: Overridden via `APP_VERSIONING` variable in your local `.env` file (parsed at build time by `app.config.js`).

---

## 2. Release Workflow

### Step 1: Sync Workspace and pull latest changes
Always start from a clean and updated `main` branch.
```bash
git checkout main
git pull origin main
```

### Step 2: Update Translation Keys
Ensure all translation resources are compiled and keys are successfully synchronized before tagging a release:
```bash
npm run sync-i18n
```

### Step 3: Set Release Version
Update the version number across the configuration files:
* **`package.json`**:
  ```json
  {
    "version": "1.0.1"
  }
  ```
* **`app.json`**:
  ```json
  {
    "expo": {
      "version": "1.0.1"
    }
  }
  ```
* **`.env` (Optional Override)**:
  ```env
  APP_VERSIONING=1.0.1
  ```

### Step 4: Validate Native Patches
Ensure that all critical native modifications (like `patches/expo-firebase-core+6.0.0.patch`) are successfully initialized:
```bash
npm install
```

### Step 5: Commit Release Configuration
```bash
git add .
git commit -m "release: v1.0.1"
```

### Step 6: Create Annotated Tag
Annotated tags store the creator, date, and a specific release message, ensuring full auditability.
```bash
git tag -a v1.0.1 -m "Production release v1.0.1"
```

### Step 7: Push to Origin
```bash
git push origin main
git push origin v1.0.1
```

---

## 3. EAS Build System & Profiles

The platform supports five specialized EAS build profiles configured in `eas.json` to optimize sizes, target architectures, and build phases:

| Profile Name | Command | Purpose / Description |
| :--- | :--- | :--- |
| **Development** | `eas build -p android --profile development` | Builds internal development client (`developmentClient: true`) featuring hot-reloading and logging for local debugging. |
| **Standard Preview** | `eas build -p android --profile preview` | Generates standard internal preview APKs for verification and testing. |
| **Preview Light (Lite)** | `eas build -p android --profile preview-light` | Generates a lightweight APK optimized specifically for `arm64-v8a` architectures with `EXPO_PUBLIC_APP_VARIANT=lite`. |
| **Standard Production** | `eas build -p android --profile production` | Standard release bundle (AAB format) with remote auto-increment enabled. |
| **Production Light (Lite)** | `eas build -p android --profile production-light` | Builds lightweight production bundle (AAB) optimized specifically for `arm64-v8a` architectures extending the production profile. |

---

## 4. Release Checklist

- [ ] **I18n Synchronization**: Run `npm run sync-i18n` and ensure translations are fully updated.
- [ ] **Native Patches Check**: Verify `expo-firebase-core+6.0.0.patch` and other critical patches are applied successfully.
- [ ] **Version Alignment**: Version updated in `package.json`, `app.json`, and (if used) `.env`.
- [ ] **Environment Verification**: Ensure all `EXPO_PUBLIC_` environment variables match target env keys.
- [ ] **Git Tag Created**: Run annotated tagging `git tag -a vX.Y.Z -m "Message"`.
- [ ] **EAS Build Fired**: Target build profile executed (`production` or `production-light`).
- [ ] **Verification**: App verified on test/preview devices before publication to Google Play Console.

---

## 5. Security & Secret Management Guidelines

> [!IMPORTANT]
> **Zero Credential Exposure**: Never commit `.env` files or raw credentials (`google-services.json` is excluded via `.gitignore` or securely configured in EAS secrets).

* **Expo prefixing**: All browser/client variables must be prefixed with `EXPO_PUBLIC_` (e.g., `EXPO_PUBLIC_INSFORGE_URL`).
* **Razorpay Credentials**: `EXPO_PUBLIC_Test_Key_ID` and `EXPO_PUBLIC_Test_Key_Secret` must be verified and updated in Expo secrets for production pipelines.
* **EAS Configuration**: Always use EAS Secrets management on Expo dashboard for production environments.

---

## 6. Rollback Policy

In the event of a critical failure on the production build, execute a rollback to the last verified stable git tag:

1. **Checkout tag**:
   ```bash
   git checkout tags/v1.0.0
   ```
2. **Spin off a rollback branch**:
   ```bash
   git checkout -b rollback/v1.0.0
   ```
3. **Build rollback package**: Trigger EAS build from the rollback branch to revert play store packages.

---

## Maintainers

* **Project**: Karmanisht (Hyperlocal Service Discovery Platform)
* **Stack**: React Native, Expo SDK 54, InsForge SDK, Firebase, Razorpay
* **Deployment**: Expo EAS Build System
