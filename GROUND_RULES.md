# Ground rules

These aren't suggestions — a PR that violates one of these gets sent back,
no matter how small the change looks. If a rule genuinely doesn't fit a
new situation, that's a discussion to have and a rule to edit here, not a
one-off exception left undocumented.

## 1. Idempotency, everywhere

Every mutating request (create expense, record settlement, restore from
trash, promote a member, everything) requires an `Idempotency-Key` header.
The server checks `idempotency_keys` before doing any work; a replayed key
returns the stored response instead of repeating the mutation. This is not
optional for "important" endpoints only — a double-tap on a slow connection
must never create a duplicate expense, ever.

Client side: generate the key once when the user action begins
(`newIdempotencyKey()` in `lib/api/idempotency.ts`), reuse it across
retries of that one logical action, discard it once the action succeeds.

## 2. Error boundaries

Every route/screen is wrapped in `shared/components/ErrorBoundary.tsx`. A
bug in one feature shows a recoverable error message for that section, not
a blank white screen for the whole app. This is exactly the class of bug
that took down ipo-tracker twice — it does not happen again here.

## 3. Rupees only

No currency field, no multi-currency logic, no exchange rates. All amounts
are stored and computed as **integer paise** (never a float rupee value) —
see `shared/lib/money.ts`. Convert to a ₹-formatted string only at the
final UI step. `splitEvenly()` handles the odd leftover paise so split math
never silently loses or invents money.

## 4. Real tables, not JSON blobs

Every entity is a proper relational table with foreign keys and
migrations. `expense_splits` is a table with one row per person's share —
never a JSON array on the expense row — so "what does X owe across every
group" is a `WHERE` clause, not application code parsing a blob. The only
sanctioned JSON in the schema is `audit_log.before_data` /
`after_data`, which is a legitimate forensic snapshot, not primary data.

## 5. Row-Level Security is the real enforcement

Every table ships with RLS enabled from the same migration that creates
it. App-layer permission checks are a second line of defense, not the
first — if the API has a bug, the database still refuses to leak another
user's rows.

## 6. Every mutation is audited, via triggers

`audit_log` is written exclusively by Postgres triggers
(`audit_row_change()`), never by application code. This makes it
structurally impossible for a new feature to forget to log a mutation.
The table is append-only — the app's database role has no `UPDATE` or
`DELETE` grant on it.

## 7. Soft delete + Trash, admin-only

Nothing is hard-deleted by a user action. Deleting an expense, settlement,
or member sets `deleted_at` / `deleted_by` instead of removing the row.
Deleted items appear in a per-group **Trash** view for 30 days with a
**Restore** option, then a scheduled job (`purge_expired_trash()`, run
daily via pg_cron) permanently removes them.

Only a group's admin can see or act on that group's Trash — RLS enforces
this (`group_members_restore`, `expenses_restore`, `settlements_restore`
policies all key off `is_group_admin()`), it isn't just a hidden UI button.

## 8. Ghost members

A group member does not need an account. Adding a friend who doesn't use
the app creates a `group_members` row with `user_id = null` and a
`display_name` instead — they can be tracked and reconciled against like
any other member. If that person later signs up, an admin (or an invite
flow) links the ghost row to their real profile via `claimed_by`; all
existing expense history stays attached, nothing is recreated.

## 9. TypeScript, strict

No `any` without a comment explaining why. Compiler errors are build
failures, not warnings to skim past.

## 10. No single giant file

Feature-folder structure (`features/auth`, `features/groups`,
`features/expenses`, `features/settlements`, `features/activity`,
`features/trash`), shared UI in `shared/components`, shared design tokens
in `shared/theme`. A file owns one screen or one domain concern — not "the
app."

## 11. CI gates every merge

`.github/workflows/ci.yml` runs lint, typecheck, and build on every PR and
on `main`. No direct pushes to `main`; a red check blocks merge.

## 12. Secrets never committed

`.env` is gitignored; `.env.example` documents the required keys with
placeholder values. Supabase service-role keys never touch client code.

## 13. Privacy policy ships before real user data does

See `PRIVACY.md`. It's a starting draft, not legal advice — have it
reviewed before this goes anywhere near a stranger's financial data.

## 14. Writes go through RPCs, not raw REST inserts

Base tables get RLS `select` and admin-only `update` (restore) policies —
deliberately **no `insert` policy for the `authenticated` role**. Every
mutation goes through a `security definer` Postgres function
(`create_group`, and its siblings that will follow for expenses,
settlements, etc.). This is where idempotency (rule #1) is actually
enforced — the function checks `idempotency_keys` itself before doing any
work — and it means there is no REST endpoint a client could hit to
insert a row that skips that check. If a new feature needs a new kind of
write, it gets a new RPC, not a new INSERT policy.

## 15. Disambiguate embeds across tables with multiple foreign keys

`group_members` has four foreign keys to `profiles` (`user_id`,
`claimed_by`, `added_by`, `deleted_by`) — deliberately, for auditability
and ghost-member claiming. That means `profiles(name)` embedded from
`group_members` is ambiguous to PostgREST and will error at query time,
not at migration time — it doesn't show up until someone actually loads
the screen. Always disambiguate with the column name: `profiles!user_id`.
Before adding any new embed, check whether the table you're embedding
*from* has more than one FK to the table you're embedding.

## PR checklist

- [ ] New table: RLS enabled + **both** a `select` policy and a way to
      write to it (an RPC, not an `insert` policy) — RLS-enabled-but-no-
      policy silently blocks everything, including the owner
- [ ] New embed across a foreign key: check whether the source table has
      more than one FK to the target table — if so, use `!column_name`
      to disambiguate, or it errors at runtime, not at review time
- [ ] New query hook: its `error` state is actually rendered somewhere,
      not just its `data` — a silently-swallowed error looks identical to
      "empty" and is far harder to debug from a bug report
- [ ] New mutation: has an audit trigger if it touches an audited table
- [ ] New mutation: idempotency enforced inside the RPC itself, not just
      a header the client sends and nothing checks
- [ ] New screen: wrapped in an `ErrorBoundary`
- [ ] No raw hex colors — use `shared/theme/colors.ts`
- [ ] No amount stored/passed as a float rupee value
- [ ] CI green
