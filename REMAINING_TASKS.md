## State And Architecture

- Continue Zustand migration for remaining reusable client filter/state flows not yet centralized.
- Consolidate remaining repeated filter/query-error helper patterns where still duplicated.

## Database

- Run a final schema-to-requirement audit to ensure full bijection with `requirements.md` except UI redesign items.
- Recheck whether any unnecessary triggers or leftover schema elements still remain.
- Validate `database/database_schema.sql` and `database/heavy_data_seed.sql` together on a fresh database.
- Update `database/DOCUMENTATION.md` again after the final backend/data-model pass so it exactly matches the finished behavior.

## Access And Validation

- Perform one final end-to-end access audit across UI, API, and DB behavior for CEO, centre head, teacher, accountant, and student.
- Re-verify that all remaining scoped endpoints reject out-of-scope centre, batch, student, teacher, invoice, salary, and approval access.

## Final Verification

- Run full backend-focused regression on approvals, rewards, enrollments, teacher assignments, fees, salaries, expenses, tasks, analytics, and reports.
- Confirm that all non-UI logical, coding, and database requirements are either implemented or explicitly not applicable.
