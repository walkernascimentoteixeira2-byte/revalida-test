# Security Specification - Revalida Quiz

## Data Invariants
1. A user can only access their own profile, history, and error logs.
2. User profile must always contain `userId`, `email`, `points`, and `gamification`.
3. Identity fields (`userId`) are immutable once set.
4. Timestamps (`createdAt`, `updatedAt`) must be set using server time.
5. All IDs must be validated string formats.

## The "Dirty Dozen" Payloads (Targeting users/{userId})
1. **Identity Spoofing**: `{"userId": "another_user_id", ...}` (Expected: DENIED)
2. **Missing Required Fields**: `{"points": 10}` (Expected: DENIED)
3. **Invalid Data Types**: `{"points": "lots"}` (Expected: DENIED)
4. **Malicious ID Injection**: `{"userId": "../evil/path"}` (Expected: DENIED)
5. **Unauthorized Field Injection**: `{"userId": "uid", "isAdmin": true}` (Expected: DENIED)
6. **Bypassing Server Time**: `{"createdAt": "2020-01-01"}` (Expected: DENIED)
7. **Modifying Immortal Fields**: Updating `userId` after creation (Expected: DENIED)
8. **Resource Exhaustion**: Extremely large `displayName` (Expected: DENIED)
9. **Unauthenticated Write**: Writing without a token (Expected: DENIED)
10. **Unverified Email**: Writing with `email_verified: false` (Expected: DENIED)
11. **Shadow Update**: Adding a field not in the blueprint (Expected: DENIED)
12. **Cross-User Retrieval**: User A trying to `get` User B's profile (Expected: DENIED)

## Conflict Report
| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
|---|---|---|---|
| /users | Protected (isOwner) | N/A | Protected (isValidId) |
| /history | Protected (isOwner) | N/A | Protected (isValidId) |
| /errors | Protected (isOwner) | Protected (isValidError) | Protected (isValidId) |
