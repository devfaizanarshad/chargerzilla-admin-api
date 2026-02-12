# Chargerzilla Admin Panel Implementation Plan

## Phase 1: Foundation & Read Operations

### 1. Project Setup
- [ ] Initialize `admin` routes structure in Express.
- [ ] Create middleware `adminAuth` (if not exists) to secure these endpoints.

### 2. User Management (`/api/admin/users`)
- [ ] **List Users**: Fetch `master_user` with pagination.
    - *Columns*: ID, Name, Email, Role, Status (`active_status`), Stripe Status.
- [ ] **Get User Details**:
    - Fetch user profile.
    - **Aggregate**:
        - List of Private Chargers (`ChargerListing` where `createdBy` = `user.id`).
        - List of Bookings made (`Booking` where `createdBy` = `user.id`).
        - List of Incoming Bookings (if Host) (`Booking` linked to their Chargers).
- [ ] **Update User**: Toggle `active_status`.

### 3. Public Stations (`/api/admin/stations/public`)
- [ ] **List Stations**: Query `charging_stations`.
    - *Optimizations*: Use `LIMIT/OFFSET`. Select only essential columns for list view (`id`, `station_name`, `address`).
    - *Joins*: `network_types`, `cities` (to show human-readable names).
- [ ] **Get Station Details**:
    - Fetch full row.
    - Fetch related `checkins` and `favourite_station` counts.

### 4. Private Chargers (`/api/admin/stations/private`)
- [ ] **List Chargers**: Query `ChargerListing`.
    - *Filters*: Users can search by Host Name (requires JOIN with `master_user`).
- [ ] **Get Charger Details**:
    - Fetch `ChargerListing` by UUID `id`.
    - **Parallel Fetches**:
        - Media: `ChargerMedia` (by `charger_id`).
        - Timing: `ChargerTiming` (by `charger_id`).
        - Reviews: `station_review` (by `iid`). **IMPORTANT**: logical link via integer ID.
        - Bookings: `Booking` (by `charger_id`).
- [ ] **Moderate Media**: Delete specific `ChargerMedia` rows.

## Technical Considerations

### Database Access
- Use `pg` ("node-postgres") or specific ORM if already present (project seems to use `sequelize` or `prisma` based on table names like `SequelizeMeta` and `_prisma_migrations`, but assuming raw SQL or existing patterns for now).
- **Note**: `_prisma_migrations` existence suggests Prisma might be the ORM of choice. I will verify if `schema.prisma` exists to potentially generate a client, otherwise I will use raw queries for safety and speed.

### Admin Logic
- **Soft Deletes**: Respect `deleted_at`, `delete_status` fields.
- **Read-Only First**: Phase 1 focuses on visibility. Modification actions will be strictly scoped (Activate/Deactivate).

## Future Phases (Preview)
- **Analytics Dashboard**: Revenue graphs, utilization maps.
- **Dispute Resolution**: Center for handling Booking cancellations/refunds.
