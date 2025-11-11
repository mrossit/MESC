# Phase 1 - Production Deployment Plan

**Version:** 1.0
**Created:** November 11, 2025
**Target Deployment:** TBD (Pending Stakeholder Approval)
**Estimated Duration:** 30-45 minutes
**Risk Level:** LOW (All tests passed, backward compatible)

---

## Pre-Deployment Checklist

### 72 Hours Before Deployment

- [ ] **Stakeholder Notification**
  - Notify parish coordinators of planned maintenance window
  - Recommended time: Sunday 22:00-02:00 (low traffic)
  - Expected downtime: None (online migrations)
  - Share this deployment plan

- [ ] **Team Preparation**
  - Assign deployment lead
  - Assign monitoring person (24h post-deployment)
  - Schedule post-deployment review meeting

### 24 Hours Before Deployment

- [ ] **Backup Verification**
  - Verify production database backup exists
  - Test backup restore procedure
  - Document backup location and credentials

- [ ] **Environment Check**
  - Verify all environment variables set (DATABASE_URL, JWT_SECRET)
  - Verify database connection from production environment
  - Check disk space (should have > 2GB free)

- [ ] **Code Deployment Preparation**
  - Ensure latest code on production branch
  - Verify build succeeds: `npm run build`
  - Verify TypeScript check passes: `npm run check` (20 errors expected, not blocking)

### 1 Hour Before Deployment

- [ ] **Final Verification**
  - Confirm stakeholder approval
  - Confirm deployment team ready
  - Test database connection
  - Review rollback plan

- [ ] **Communication**
  - Send "deployment starting" notification to coordinators
  - Post maintenance notice (if applicable)

---

## Deployment Steps

### Phase 1: Pre-Deployment (5 minutes)

#### Step 1.1: Create Production Backup

```bash
# Create timestamped backup
mkdir -p backups
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backups/backup_pre_phase1_prod_$BACKUP_DATE.sql

# Verify backup file created and non-empty
ls -lh backups/backup_pre_phase1_prod_$BACKUP_DATE.sql

# Store backup size for verification
BACKUP_SIZE=$(stat -f%z backups/backup_pre_phase1_prod_$BACKUP_DATE.sql 2>/dev/null || stat -c%s backups/backup_pre_phase1_prod_$BACKUP_DATE.sql)
echo "Backup size: $BACKUP_SIZE bytes"
```

**Success Criteria:**
- Backup file exists
- Backup size > 100KB (should be similar to development: ~638KB)
- No errors in backup process

#### Step 1.2: Document Current State

```bash
# Record current row counts
psql $DATABASE_URL -c "
SELECT
  'users' as table_name, COUNT(*) as row_count FROM users WHERE is_deleted IS NULL OR is_deleted = false
UNION ALL SELECT 'schedules', COUNT(*) FROM schedules
UNION ALL SELECT 'questionnaire_responses', COUNT(*) FROM questionnaire_responses
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications;
"

# Save output to file
psql $DATABASE_URL -c "..." > pre_deployment_counts.txt
```

**Success Criteria:**
- Row counts documented
- Counts seem reasonable (users: ~140, schedules: ~412, etc.)

---

### Phase 2: Database Migrations (10-15 minutes)

#### Step 2.1: Run Migration 0003 (Soft Deletes)

```bash
# Run migration
psql $DATABASE_URL -f migrations/0003_add_soft_deletes.sql 2>&1 | tee migration_0003_output.log

# Check for errors
if grep -i "error" migration_0003_output.log; then
  echo "❌ MIGRATION FAILED - STOP AND REVIEW"
  exit 1
else
  echo "✅ Migration 0003 completed successfully"
fi
```

**Expected Output:**
- Multiple `ALTER TABLE` statements
- `CREATE INDEX` statements
- One `NOTICE` about constraint not existing (expected, not an error)
- `COMMENT` statements

**Success Criteria:**
- No ERROR lines in output
- All ALTER TABLE, CREATE INDEX completed
- 7 COMMENT statements executed

#### Step 2.2: Verify Migration 0003

```bash
# Verify soft delete columns added
psql $DATABASE_URL -c "
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name IN ('deleted_at', 'is_deleted')
  AND table_name IN ('users', 'schedules', 'questionnaire_responses')
ORDER BY table_name, column_name;
"

# Should return 6 rows (3 tables × 2 columns)

# Verify indexes created
psql $DATABASE_URL -c "
SELECT indexname
FROM pg_indexes
WHERE indexname LIKE '%deleted%'
   OR indexname LIKE '%questionnaire_responses_user_questionnaire%';
"

# Should return 4 indexes
```

**Success Criteria:**
- 6 rows returned (deleted_at and is_deleted for each table)
- 4 indexes created
- All columns have correct data types

**If Verification Fails:**
- STOP deployment
- Review migration output logs
- Contact technical lead
- DO NOT PROCEED to next migration

#### Step 2.3: Run Migration 0004 (CASCADE Deletes)

```bash
# Run migration
psql $DATABASE_URL -f migrations/0004_fix_cascade_deletes.sql 2>&1 | tee migration_0004_output.log

# Check for critical errors (some ERRORs expected for non-existent tables)
if grep -i "error" migration_0004_output.log | grep -v "liturgical" | grep -v "formation"; then
  echo "⚠️  Unexpected errors found - review before continuing"
else
  echo "✅ Migration 0004 completed (expected warnings about non-existent tables are OK)"
fi
```

**Expected Output:**
- Multiple `ALTER TABLE` statements
- Several `NOTICE` statements about non-existent constraints (OK)
- Several `ERROR` statements about liturgical_* tables (OK - these don't exist yet)
- Multiple `COMMENT` statements at end

**Success Criteria:**
- Multiple ALTER TABLE completed successfully
- Only errors are about: liturgical_seasons, liturgical_celebrations, liturgical_mass_overrides, formation_* tables
- COMMENT statements at end executed

#### Step 2.4: Verify Migration 0004

```bash
# Verify CASCADE DELETE on notifications
psql $DATABASE_URL -c "\d notifications" | grep "Foreign-key constraints" -A 3

# Should show: ON DELETE CASCADE

# Verify CASCADE DELETE on questionnaire_responses
psql $DATABASE_URL -c "\d questionnaire_responses" | grep "Foreign-key constraints" -A 5

# Should show: ON DELETE CASCADE for user_id and questionnaire_id

# Verify SET NULL on schedules
psql $DATABASE_URL -c "\d schedules" | grep "Foreign-key constraints" -A 3

# Should show: ON DELETE SET NULL for minister_id and substitute_id
```

**Success Criteria:**
- notifications.user_id has `ON DELETE CASCADE`
- questionnaire_responses.user_id has `ON DELETE CASCADE`
- schedules.minister_id has `ON DELETE SET NULL`
- schedules.substitute_id has `ON DELETE SET NULL`

**If Verification Fails:**
- Review migration_0004_output.log
- Check which constraints failed
- Decide: continue or rollback

---

### Phase 3: Code Deployment (5-10 minutes)

#### Step 3.1: Deploy Code Changes

**Option A: Replit Deployment**
```bash
# Replit automatically deploys on git push to main
git push origin main

# Or use Replit dashboard to trigger deployment
```

**Option B: Manual Deployment**
```bash
# Build production bundle
npm run build

# Restart server
# (Depends on hosting platform - Replit does this automatically)
```

**Success Criteria:**
- Build completes without errors
- Server restarts successfully
- No startup errors in logs

#### Step 3.2: Verify Server Started

```bash
# Wait 30 seconds for server to start
sleep 30

# Check server health
curl -f http://your-production-url/api/health || echo "Health check failed"

# Check logs for startup errors
# (Method depends on hosting platform)
```

**Success Criteria:**
- Health endpoint responds
- No critical errors in startup logs
- Server accessible

---

### Phase 4: Smoke Testing (10 minutes)

Run these tests to verify critical functionality:

#### Test 4.1: User Login

```bash
# Test login endpoint
curl -X POST http://your-production-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "coordinator@example.com",
    "password": "your-test-password"
  }'

# Should return JWT token
```

**Success Criteria:** Returns token, no errors

#### Test 4.2: Get Users List

```bash
# Test that soft delete filtering works
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://your-production-url/api/users

# Should return list of active users
```

**Success Criteria:**
- Returns user list
- All users have `is_deleted: false` or no is_deleted field
- Count matches expected active users (~140)

#### Test 4.3: Get Schedules

```bash
# Test schedule retrieval
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://your-production-url/api/schedules?month=11&year=2025

# Should return schedules for November
```

**Success Criteria:**
- Returns schedules
- No errors
- Data looks correct

#### Test 4.4: Submit Questionnaire (If Safe)

**Manual Test via UI:**
1. Log in as test user
2. Navigate to questionnaire
3. Submit response
4. Verify success message
5. Submit again immediately
6. Verify: update successful, no duplicate

**Success Criteria:**
- First submission creates response
- Second submission updates (no duplicate)
- No errors

---

### Phase 5: Post-Deployment Verification (5 minutes)

#### Step 5.1: Verify Row Counts Unchanged

```bash
# Count rows after deployment
psql $DATABASE_URL -c "
SELECT
  'users' as table_name, COUNT(*) as row_count FROM users WHERE is_deleted = false
UNION ALL SELECT 'schedules', COUNT(*) FROM schedules WHERE is_deleted = false
UNION ALL SELECT 'questionnaire_responses', COUNT(*) FROM questionnaire_responses WHERE is_deleted = false;
"

# Compare to pre_deployment_counts.txt
diff pre_deployment_counts.txt post_deployment_counts.txt
```

**Success Criteria:**
- Row counts unchanged (or expected changes only)
- No unexpected data loss

#### Step 5.2: Verify New Fields Populated

```bash
# Check that is_deleted defaulted to false
psql $DATABASE_URL -c "
SELECT
  COUNT(*) FILTER (WHERE is_deleted IS NULL) as null_count,
  COUNT(*) FILTER (WHERE is_deleted = false) as false_count,
  COUNT(*) FILTER (WHERE is_deleted = true) as true_count
FROM users;
"

# null_count should be 0
# false_count should equal total users
# true_count should be 0 (no soft deletes yet)
```

**Success Criteria:**
- No NULL values in is_deleted
- All existing records have `is_deleted = false`
- deleted_at is NULL for all existing records

#### Step 5.3: Check Error Logs

```bash
# Check application logs for errors
# (Method depends on hosting - check Replit logs, CloudWatch, etc.)

# Look for:
# - Database connection errors
# - Query errors
# - Transaction errors
# - 500 errors
```

**Success Criteria:**
- No new critical errors
- No spike in error rates
- No database connection issues

---

## Post-Deployment Monitoring (24-48 hours)

### Immediate (First 2 Hours)

Monitor every 15 minutes:

- [ ] **Error Rate**
  - Check application logs
  - Look for database errors
  - Monitor for 500 errors

- [ ] **Performance**
  - Check response times (should be same or better)
  - Monitor database query performance
  - Check for slow queries

- [ ] **User Reports**
  - Monitor coordinator feedback
  - Check for bug reports
  - Respond quickly to issues

### Next 24 Hours

Monitor every 2-4 hours:

- [ ] **Questionnaire Submissions**
  - Verify no duplicate responses being created
  - Check submission success rate

- [ ] **Schedule Operations**
  - Verify schedule generation works
  - Check schedule viewing/editing

- [ ] **User Management**
  - Verify user listing works
  - Check user detail views

### Database Health Checks

Run daily for 3 days:

```bash
# Check for unexpected soft deletes
psql $DATABASE_URL -c "
SELECT
  'users' as table_name, COUNT(*) FILTER (WHERE is_deleted = true) as soft_deleted
UNION ALL SELECT 'schedules', COUNT(*) FILTER (WHERE is_deleted = true)
UNION ALL SELECT 'questionnaire_responses', COUNT(*) FILTER (WHERE is_deleted = true);
"

# Should be 0 or very few (only if intentional)
```

---

## Rollback Plan

**When to Rollback:**
- Critical errors preventing system use
- Data corruption detected
- Unacceptable performance degradation
- Stakeholder requests rollback

### Rollback Step 1: Revert Code

```bash
# Revert to previous version
git revert HEAD
git push origin main

# Or manually deploy previous version
```

### Rollback Step 2: Database - DO NOT ROLLBACK MIGRATIONS

**IMPORTANT:** The migrations added columns with default values. They are backward compatible:
- Old code works with new schema (ignores new columns)
- New code works with new schema (uses new columns)

**Therefore: DO NOT rollback migrations. Only revert code if needed.**

If absolutely necessary to rollback migrations (extreme scenario):

```bash
# This will LOSE any soft delete data created after deployment
psql $DATABASE_URL -c "
-- Remove soft delete columns (DESTRUCTIVE)
ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE users DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE schedules DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE schedules DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE questionnaire_responses DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE questionnaire_responses DROP COLUMN IF EXISTS is_deleted;

-- Remove indexes
DROP INDEX IF EXISTS idx_users_deleted;
DROP INDEX IF EXISTS idx_schedules_deleted;
DROP INDEX IF EXISTS idx_questionnaire_responses_deleted;
DROP INDEX IF EXISTS questionnaire_responses_user_questionnaire_unique;
"
```

⚠️ **Only execute above if absolutely necessary and with stakeholder approval**

### Rollback Step 3: Restore from Backup (Last Resort)

```bash
# Only if data corruption detected
# This will LOSE all data changes since backup

# Stop application
# Restore database
psql $DATABASE_URL < backups/backup_pre_phase1_prod_TIMESTAMP.sql

# Restart application with old code
```

⚠️ **Nuclear option - only use if system is completely broken**

---

## Communication Plan

### Stakeholder Communication

**Before Deployment:**
- 72h notice: "Planned maintenance Sunday 22:00"
- 24h reminder: "Maintenance tomorrow night"
- 1h warning: "Maintenance starting in 1 hour"

**During Deployment:**
- Start: "Maintenance started, expect minimal impact"
- Complete: "Maintenance completed successfully, system running normally"
- If issues: "Investigating issue, will update in 15 minutes"

**After Deployment:**
- Next day: "Deployment successful, monitoring continues"
- After 48h: "Phase 1 complete, no issues detected"

### Coordinator Messaging Template

**72 Hours Before:**
```
Subject: Sistema MESC - Manutenção Programada

Olá,

Informamos que haverá uma manutenção programada no Sistema MESC:

📅 Data: Domingo, [DATA]
🕐 Horário: 22:00 - 02:00
⏱️ Duração Estimada: 30 minutos

O que está sendo feito:
- Melhorias de integridade de dados
- Correção de bugs conhecidos
- Nenhuma mudança visual ou de funcionalidade

Impacto esperado:
- Sistema continuará acessível durante a manutenção
- Possível lentidão momentânea

Qualquer dúvida, estamos à disposição.

Atenciosamente,
Equipe Técnica MESC
```

---

## Success Criteria

Deployment is considered successful when:

- ✅ All migrations executed without critical errors
- ✅ All smoke tests passed
- ✅ Row counts unchanged (or expected changes only)
- ✅ No spike in error rates
- ✅ No user-reported issues in first 2 hours
- ✅ No data corruption detected
- ✅ Performance maintained or improved

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Migration failure | LOW | HIGH | Full backup, tested in dev, rollback plan |
| Data loss | VERY LOW | CRITICAL | Backup before migration, soft deletes preserve data |
| Performance degradation | VERY LOW | MEDIUM | Tested in dev, indexes optimized |
| User disruption | LOW | MEDIUM | Low-traffic window, online migrations |
| Unexpected errors | LOW | MEDIUM | Comprehensive testing, 24h monitoring |

**Overall Risk Level: LOW** ✅

---

## Deployment Team Roles

### Deployment Lead
**Responsibilities:**
- Execute deployment steps
- Make go/no-go decisions
- Coordinate team
- Communicate with stakeholders

### Database Administrator (Can be same person)
**Responsibilities:**
- Execute migrations
- Verify schema changes
- Monitor database performance
- Handle rollback if needed

### Monitoring Lead
**Responsibilities:**
- Monitor error logs
- Track performance metrics
- Alert team of issues
- First 24h on-call

### Stakeholder Liaison
**Responsibilities:**
- Communicate with coordinators
- Handle user questions
- Escalate critical issues
- Collect feedback

---

## Appendix A: Quick Reference Commands

### Check Migration Status
```bash
psql $DATABASE_URL -c "\d users" | grep "deleted"
```

### Check Foreign Key Constraints
```bash
psql $DATABASE_URL -c "\d notifications" | grep "Foreign"
```

### Count Soft Deleted Records
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users WHERE is_deleted = true;"
```

### Check Application Logs
```bash
# Replit: Check logs in dashboard
# Or: tail -f /path/to/app.log
```

### Verify Server Running
```bash
curl -f http://your-url/api/health
```

---

## Appendix B: Deployment Checklist (Printable)

```
PHASE 1 DEPLOYMENT CHECKLIST

PRE-DEPLOYMENT:
☐ Stakeholder notification sent (72h)
☐ Reminder sent (24h)
☐ Database backup created
☐ Backup verified and stored securely
☐ Current row counts documented
☐ Deployment team assembled
☐ Final go/no-go decision made

DEPLOYMENT:
☐ Maintenance window started notification sent
☐ Migration 0003 executed
☐ Migration 0003 verified
☐ Migration 0004 executed
☐ Migration 0004 verified
☐ Code deployed
☐ Server restarted successfully
☐ Health check passed

SMOKE TESTING:
☐ Login test passed
☐ User list test passed
☐ Schedule list test passed
☐ Questionnaire submission test passed (if applicable)

POST-DEPLOYMENT:
☐ Row counts verified unchanged
☐ is_deleted fields populated correctly
☐ Error logs checked (no critical errors)
☐ Completion notification sent to stakeholders
☐ 24h monitoring schedule confirmed

MONITORING (First 48h):
☐ 2h check - no issues
☐ 4h check - no issues
☐ 8h check - no issues
☐ 24h check - no issues
☐ 48h check - deployment confirmed successful

SIGN-OFF:
Deployment Lead: _______________ Date/Time: ___________
Technical Lead: _______________ Date/Time: ___________
Stakeholder: _______________ Date/Time: ___________
```

---

**Document Version:** 1.0
**Last Updated:** November 11, 2025
**Next Review:** After deployment completion

---

_🤖 Generated with [Claude Code](https://claude.com/claude-code)_
