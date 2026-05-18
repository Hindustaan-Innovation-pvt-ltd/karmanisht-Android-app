# InsForge Database Architecture Guide

This guide details the database tables within your current InsForge project, which powers the Hyperlocal Service Discovery Platform. It covers their schemas, relationships, how Row-Level Security (RLS) is applied, and their respective roles in your application.

## Overview of the Architecture

The database is designed around a **Hyperlocal Marketplace** model. It separates consumers (`users`) from service professionals (`service_providers`) and manages the discovery of services via geospatial capabilities (`provider_locations`) and categorized services (`service_categories`, `service_tags`, `provider_services`).

Here is a breakdown of all the primary tables and how they function.

---

### 1. `users` (Consumers)
Stores the profiles of the consumers looking for services.
- **Key Columns:** `id` (UUID), `mobile` (Unique), `full_name`, `email`, `profile_image`, `role` (defaults to 'consumer'), `current_latitude`, `current_longitude`, `is_active`.
- **Function:** Acts as the base consumer profile. Location columns store the user's last known or current location to help them find nearby providers. 
- **Security:** RLS is enabled. Anonymous users (`anon`) have policies permitting `INSERT`, `SELECT`, and `UPDATE`, enabling passwordless or OTP-based onboarding without traditional user sessions.

### 2. `service_providers` (Professionals / Workers)
Stores the professional profiles of the service providers.
- **Key Columns:** `id` (UUID), `mobile` (Unique), `full_name`, `business_name`, `email`, `profile_image`, `bio`, `experience_years`, `aadhaar_number`, `pan_number`, `is_kyc_verified`, `average_rating`, `total_jobs_completed`, `is_verified`, `is_active`.
- **Function:** Holds rich data about the provider, including KYC details (Aadhaar/PAN) and dynamic metrics like average rating and completed jobs.
- **Security:** RLS is enabled. Similar to `users`, `anon` has `INSERT`, `SELECT`, and `UPDATE` access to facilitate direct profile creation and retrieval from the client application.

### 3. `provider_locations` (Geospatial Tracking)
Manages the geospatial coordinates and service areas of providers.
- **Key Columns:** `id` (UUID), `provider_id` (FK to `service_providers`), `latitude`, `longitude`, `geo_location` (PostGIS geometry), `area_name`, `service_radius_km` (defaults to 5km).
- **Function:** This is the heart of the hyperlocal engine. It links to a provider and utilizes PostGIS geometry (`geo_location`) to allow rapid geographic querying (e.g., finding all plumbers within 5km of a user). 
- **Triggers:** A `BEFORE INSERT/UPDATE` trigger (`trg_update_location_geo`) automatically calculates and updates the PostGIS `geo_location` field whenever latitude or longitude are modified.

### 4. `service_categories` & `service_tags` (Service Catalog)
Defines the taxonomy of services offered on the platform.
- **`service_categories`:** High-level categories (e.g., Plumber, Electrician).
  - Columns: `id`, `name` (Unique), `icon`, `is_active`.
- **`service_tags`:** Specific sub-services within a category (e.g., "Pipe Repair" under Plumber).
  - Columns: `id`, `category_id` (FK to `service_categories`), `name`.
- **Function:** These tables structure the marketplace catalog. They are populated globally and allow users to browse or search for specific needs.

### 5. `provider_services` (Mapping Providers to Catalog)
A junction table that maps what a provider actually does.
- **Key Columns:** `id`, `provider_id` (FK), `category_id` (FK), `tag_id` (FK).
- **Function:** A provider might offer multiple services across different tags. This table resolves the many-to-many relationship between a provider and the catalog of services.

### 6. `reviews` (Ratings & Feedback)
Stores feedback left by consumers for service providers.
- **Key Columns:** `id`, `user_id` (FK to `users`), `provider_id` (FK to `service_providers`), `content`, `rating`, `created_at`.
- **Function:** Enables reputation management. Providers' `average_rating` in the `service_providers` table is typically derived from these entries.

### 7. `unlock_transactions` (Monetization & Lead Management)
Handles the financial transactions when a user or provider "unlocks" a lead or service interaction.
- **Key Columns:** `id`, `user_id` (FK to `users`), `provider_id` (FK to `service_providers`), `amount`, `payment_status` (defaults to 'pending'), `transaction_id` (Unique), `unlocked_at`.
- **Function:** Used for the platform's revenue model, tracking payments (e.g., Razorpay) linked to a specific transaction ID.

### 8. `otp_verifications` (Authentication mechanism)
Tracks One-Time Passwords used for mobile number verification.
- **Key Columns:** `id`, `mobile`, `otp`, `is_used`, `expires_at`, `created_at`.
- **Function:** Instead of typical InsForge email/password auth, this table tracks custom OTPs sent to users/providers during registration or login. An index on `(mobile, otp, is_used)` ensures fast verification lookups.

---

## How They Work Together (The Flow)

1. **Authentication (OTP)**: When a user or provider signs up, an OTP is generated via Edge Functions and stored in `otp_verifications`.
2. **Profile Creation**: Upon OTP verification, a row is created in either `users` or `service_providers` depending on the app they are using.
3. **Provider Setup**: 
   - The provider selects their skills, which inserts records into `provider_services` (linking them to `service_categories` and `service_tags`).
   - Their location is captured and stored in `provider_locations`. The PostgreSQL trigger automatically formats the location into a PostGIS `geo_location` point.
4. **Consumer Discovery**: A consumer opens the app, and their coordinates are used to query `provider_locations` (using PostGIS spatial functions like `ST_DWithin`). The query joins with `service_providers` and `provider_services` to show nearby professionals matching the required category.
5. **Engagement & Monetization**: When a connection is made or a lead is unlocked, an entry goes into `unlock_transactions`. After the service, a user can leave a rating which goes into the `reviews` table.

## RLS (Row-Level Security) Notes

Currently, your primary tables (`users`, `service_providers`, `provider_locations`, `provider_services`) utilize highly permissive `anon` policies (allowing Anonymous INSERT/UPDATE/SELECT). 

*Note: While convenient for rapid development without complex Auth sessions, these policies mean that any client with the `anonKey` can modify data. For a production environment, you should transition to using authenticated sessions (or secure Edge Functions) and tighten these RLS policies to ensure users can only modify their own data using `auth.uid()` checks.*
