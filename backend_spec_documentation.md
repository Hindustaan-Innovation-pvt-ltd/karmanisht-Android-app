# Hindustaan Innovations: Complete Backend Schema & API Documentation

This document serves as the comprehensive manual for the database models, serverless edge functions, custom triggers, spatial search RPCs, and React Native frontend integration patterns.

---

## 💾 1. Database Schema Reference

The PostgreSQL database uses PostGIS to perform fast geo-spatial searches. Below are the core tables and configuration settings.

### Core User & Supply Tables
#### 1. `users`
Represents consumers or basic user profiles.
- `id` (UUID, PK): Unique user identifier.
- `mobile` (VARCHAR, Unique): Mobile phone number.
- `is_mobile_verified` (BOOLEAN): Defaults to `false`.
- `full_name` / `email` / `profile_image` / `gender` (Nullable fields).
- `current_latitude` (DECIMAL) / `current_longitude` (DECIMAL): Real-time location coordinates.
- `search_radius_km` (INTEGER): Default search range for consumers (defaults to `5` km).
- `is_active` (BOOLEAN): Status indicating whether the user is active online.

#### 2. `service_providers`
Represents workers/providers listing their professional services.
- `id` (UUID, PK): Unique worker identifier.
- `mobile` (VARCHAR, Unique): Contact number.
- `full_name` (VARCHAR, Required) / `business_name` (VARCHAR).
- `experience_years` (INTEGER) / `average_rating` (DECIMAL).
- `total_jobs_completed` (INTEGER) / `is_verified` (BOOLEAN) / `is_active` (BOOLEAN).
- `is_premium` (BOOLEAN): Set to `true` via payment confirmation triggers.

#### 3. `provider_locations`
Stores geo-spatial point data representing provider home/working bases.
- `provider_id` (UUID, FK -> `service_providers`).
- `latitude` / `longitude` (DECIMAL): Working coordinates.
- `geo_location` (GEOGRAPHY/Point, 4326): PostGIS spatial column.
- `service_radius_km` (INTEGER): Worker's maximum travel radius (defaults to `5` km).

#### 4. `service_categories`
Represents professions (e.g., Electrician, Plumber, AC Repair).
- `id` (UUID, PK).
- `name` (VARCHAR, Unique).

#### 5. `provider_services`
Maps workers to their offered professions.
- `provider_id` (UUID, FK -> `service_providers`).
- `category_id` (UUID, FK -> `service_categories`).
- `price_starting_from` (DECIMAL).

---

### Billing, Subscriptions & Cities Table
#### 6. `cities`
Specifies tiers to enable region-based dynamic pricing.
- `id` (UUID, PK).
- `name` (VARCHAR, Unique) — (e.g., "Mumbai", "Raipur").
- `tier` (VARCHAR) — `'tier_1'` (Metros), `'tier_2'` (Emerging), or `'tier_3'` (Rural).

#### 7. `city_pricing_config`
Configures pricing dynamically for each city and profession.
- `city_id` (UUID, FK) / `profession_id` (UUID, FK).
- `unlock_price` (NUMERIC): Price to buy a 5-hour contact unlock pass for that profession.
- `provider_premium_fee` (NUMERIC): Price for a monthly provider premium visibility subscription.
- `unlock_duration_hours` (INTEGER): Pass duration (defaults to `5` hours).

#### 8. `unlock_passes`
Tracks 5-hour contact passes purchased by customers.
- `customer_id` (UUID, FK -> `users`).
- `profession_id` (UUID, FK -> `service_categories`).
- `expires_at` (TIMESTAMP WITH TIME ZONE).
- `payment_status` (VARCHAR): `'pending'`, `'paid'`, or `'failed'`.

#### 9. `provider_premium_subscriptions`
Tracks active premium subscriptions purchased by workers.
- `provider_id` (UUID, FK -> `service_providers`).
- `expires_at` (TIMESTAMP WITH TIME ZONE).
- `is_active` (BOOLEAN).

#### 10. `payments`
Unified ledger of all Razorpay transactions.
- `id` (UUID, PK).
- `user_id` (UUID, FK -> `users`).
- `payment_type` (VARCHAR): `'unlock_pass'` or `'premium_subscription'`.
- `reference_id` (UUID): Reference to `unlock_passes(id)` or `provider_premium_subscriptions(id)`.
- `gateway_payment_id` (VARCHAR): Razorpay Payment ID.
- `payment_status` (VARCHAR): `'pending'`, `'paid'`, `'failed'`.

---

## ⚡ 2. Automated Database Triggers & RPCs

### Geometry Sync Trigger
Automatically updates the PostGIS geometry column `geo_location` when latitude/longitude values are inserted or modified.
- **Trigger Table**: `provider_locations`
- **Function**: `update_provider_location_geometry()`

### Premium Status Sync Trigger
Automatically recalculates and toggles the `is_premium` flag in `service_providers` when a worker's premium subscription is purchased, expires, or changes active state.
- **Trigger Table**: `provider_premium_subscriptions`
- **Function**: `update_provider_premium_status()`

### Dynamic Ranking Search RPC: `search_nearby_providers`
Executes custom marketplace ranking logic (from Section 18 of the Hyperlocal Product Blueprint) to find and order nearby workers.
- **Function Prototype**:
  ```sql
  SELECT * FROM search_nearby_providers(
      search_category_name := 'Electrician',
      user_lat := 19.0760,
      user_lng := 72.8777
  );
  ```
- **Ranking Weights Applied**:
  - Distance Weight (Closer = Higher Score, Max 40 points)
  - Rating Weight (Rating $\times$ 6, Max 30 points)
  - Job Volume Weight (Response rate indicator, Max 10 points)
  - Premium Boost (Verified premium visibility, Max 15 points)
  - Recent Location Activity (Active in last 24h, Max 5 points)

---

## 🌐 3. Edge Functions (API endpoints)

### 1. `send-otp`
Generates a 6-digit random code, records it in `otp_verifications`, and dispatches it via SMS.
- **Endpoint**: `/functions/send-otp`
- **Method**: `POST`
- **Body**:
  ```json
  { "mobile": "9876543210" }
  ```

### 2. `verify-otp`
Verifies code matches and is not expired, signs in or registers the user, and returns a session JWT.
- **Endpoint**: `/functions/verify-otp`
- **Method**: `POST`
- **Body**:
  ```json
  { "mobile": "9876543210", "otp_code": "123456" }
  ```

### 3. `create-razorpay-order`
Validates city/profession tier config and returns a Razorpay Order ID.
- **Endpoint**: `/functions/create-razorpay-order`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "payment_type": "unlock_pass" | "premium_subscription",
    "profession_id": "UUID",
    "city_id": "UUID",
    "provider_id": "UUID" // Required if premium_subscription
  }
  ```

### 4. `verify-payment`
Verifies signature validation, updates payments ledger, and activates active passes/subscriptions.
- **Endpoint**: `/functions/verify-payment`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "order_id": "order_xyz",
    "razorpay_payment_id": "pay_abc",
    "razorpay_signature": "signature_hash"
  }
  ```

### 5. `track-location`
Saves current lat/long and queries active coordinates within overlapping radii.
- **Endpoint**: `/functions/track-location`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "role": "consumer" | "worker",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "radius": 5, // Optional search/service radius in km
    "category_name": "Electrician" // Optional: filter workers by category
  }
  ```

---

## 📱 4. Mobile Frontend Integration Examples

Here are standard frontend calls implemented in React Native / Expo to query the database and execute edge functions.

### A. Performing Nearby Mutual Location Search
```typescript
import * as Location from 'expo-location';

export async function trackUserAndSearchNearby(role: 'consumer' | 'worker', category?: string) {
  // Get location permissions
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Location permission denied');

  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  
  // Call track-location edge function
  const response = await fetch('https://99qhmaqv.us-east.insforge.app/functions/track-location', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userSessionToken}`
    },
    body: JSON.stringify({
      role: role,
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      category_name: category
    })
  });

  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  
  return result.matches; // List of matched users/workers
}
```

### B. Querying Categories and Custom City Pricing Config
To check dynamic prices in the current user's location tier:
```typescript
import { createClient } from '@insforge/sdk';

const insforge = createClient('https://99qhmaqv.us-east.insforge.app', 'ANON_KEY');

export async function fetchPricingForCity(cityId: string, categoryId: string) {
  const { data, error } = await insforge
    .from('city_pricing_config')
    .select('unlock_price, provider_premium_fee, unlock_duration_hours')
    .eq('city_id', cityId)
    .eq('profession_id', categoryId)
    .single();

  if (error) throw error;
  return data; // Returns e.g. { unlock_price: "49.00", unlock_duration_hours: 5 }
}
```

### C. Triggering OTP Verification Flow
```typescript
export async function sendOtpToMobile(phoneNumber: string) {
  const response = await fetch('https://99qhmaqv.us-east.insforge.app/functions/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: phoneNumber })
  });
  return await response.json();
}

export async function verifyOtpAndLogin(phoneNumber: string, code: string) {
  const response = await fetch('https://99qhmaqv.us-east.insforge.app/functions/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: phoneNumber, otp_code: code })
  });
  const data = await response.json();
  if (data.success) {
    // Store data.session JWT natively to pass in 'Authorization' header
    return data.session;
  }
  throw new Error(data.error);
}
```
