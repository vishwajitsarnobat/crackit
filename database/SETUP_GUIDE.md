# DATABASE SETUP GUIDE
## Crack It Coaching Institute

---

## QUICK START

### Prerequisites
- Supabase account (free tier works)
- PostgreSQL 14+ knowledge (basic)
- pgAdmin or SQL client (optional)

---

## STEP-BY-STEP SETUP

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click **"New Project"**
4. Fill in:
   - Name: `crack-it-coaching`
   - Database Password: (save this securely!)
   - Region: Choose closest to your location (e.g., Mumbai for India)
5. Wait 2-3 minutes for project creation

---

### Step 2: Access SQL Editor

1. In Supabase dashboard, click **"SQL Editor"** (left sidebar)
2. You'll see an empty query editor

---

### Step 3: Run Schema SQL

1. **Open** `database_schema.sql` from the provided files
2. **Copy** entire contents (62KB file)
3. **Paste** into Supabase SQL Editor
4. **Click** "Run" button (bottom right)
5. **Wait** ~30 seconds for execution
6. **Verify**: You should see green success messages

**Expected Output:**
```
✅ Success. Query executed successfully. Rows: 0
```

**If you see errors:**
- Check if UUID extension already exists (ignore those errors)
- Verify no syntax issues from copy-paste
- Make sure you're in the correct project

---

### Step 4: Run Sample Data SQL

1. **Open** `sample_data.sql`
2. **Copy** entire contents
3. **Paste** into SQL Editor
4. **Click** "Run"
5. **Wait** ~10 seconds

**Expected Output:**
```
✅ Sample data inserted successfully!
You now have:
- 4 Centers across 2 states
- 3 Batches (JEE, NEET, Olympiad)
- 20 Students enrolled
- 3 Teachers assigned
- Sample content, exams, attendance, and fees
```

---

### Step 5: Verify Installation

Run this verification query:

```sql
-- Check table counts
SELECT 
  'states' as table_name, COUNT(*) as count FROM states UNION ALL
  SELECT 'districts', COUNT(*) FROM districts UNION ALL
  SELECT 'centers', COUNT(*) FROM centers UNION ALL
  SELECT 'users', COUNT(*) FROM users UNION ALL
  SELECT 'students', COUNT(*) FROM students UNION ALL
  SELECT 'batches', COUNT(*) FROM batches UNION ALL
  SELECT 'content', COUNT(*) FROM content UNION ALL
  SELECT 'exams', COUNT(*) FROM exams UNION ALL
  SELECT 'attendance', COUNT(*) FROM attendance;
```

**Expected Results:**
```
states      | 4
districts   | 6
centers     | 4
users       | 26 (1 CEO + 2 heads + 3 teachers + 20 students)
students    | 20
batches     | 3
content     | 4
exams       | 1
attendance  | 100+
```

---

## CONNECTING TO DATABASE

### Get Connection String

1. In Supabase dashboard, click **"Settings"** (gear icon)
2. Click **"Database"**
3. Scroll to **"Connection string"**
4. Copy the **URI** format

**Format:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

### Connection Details

```
Host: db.[PROJECT-REF].supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [YOUR-PASSWORD]
```

---

### Test Query from Code

**JavaScript (Node.js):**
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://[PROJECT-REF].supabase.co';
const supabaseKey = '[YOUR-ANON-KEY]'; // From Settings > API

const supabase = createClient(supabaseUrl, supabaseKey);

// Test query
const { data, error } = await supabase
  .from('students')
  .select('*')
  .limit(5);

console.log(data);
```

**Flutter:**
```dart
import 'package:supabase_flutter/supabase_flutter.dart';

await Supabase.initialize(
  url: 'https://[PROJECT-REF].supabase.co',
  anonKey: '[YOUR-ANON-KEY]',
);

final response = await Supabase.instance.client
  .from('students')
  .select()
  .limit(5);

print(response);
```

---

## EXPLORING THE DATABASE

### Useful Test Queries

#### 1. View All Students with Batches
```sql
SELECT 
  u.full_name AS student_name,
  s.student_code,
  s.class_level,
  b.batch_name,
  c.center_name
FROM students s
JOIN users u ON s.user_id = u.id
JOIN student_batch_enrollments sbe ON s.id = sbe.student_id
JOIN batches b ON sbe.batch_id = b.id
JOIN centers c ON b.center_id = c.id
WHERE sbe.is_active = TRUE
ORDER BY b.batch_name, u.full_name;
```

#### 2. Check Batch Performance
```sql
SELECT 
  b.batch_name,
  COUNT(DISTINCT sbe.student_id) as total_students,
  ROUND(AVG(sm.percentage), 2) as avg_marks,
  ROUND(AVG(
    (SELECT AVG(CASE WHEN a2.status = 'present' THEN 100 ELSE 0 END)
     FROM attendance a2 
     WHERE a2.student_id = sbe.student_id)
  ), 2) as avg_attendance
FROM batches b
LEFT JOIN student_batch_enrollments sbe ON b.id = sbe.batch_id
LEFT JOIN student_marks sm ON sbe.student_id = sm.student_id
WHERE sbe.is_active = TRUE
GROUP BY b.id, b.batch_name;
```

#### 3. Fee Collection Report
```sql
SELECT 
  c.center_name,
  COUNT(*) as total_fees,
  SUM(CASE WHEN sf.payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
  SUM(CASE WHEN sf.payment_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
  SUM(sf.amount_paid) as total_collected,
  SUM(CASE WHEN sf.payment_status = 'pending' THEN sf.amount_due ELSE 0 END) as pending_amount
FROM student_fees sf
JOIN students s ON sf.student_id = s.id
JOIN student_batch_enrollments sbe ON s.id = sbe.student_id
JOIN batches b ON sbe.batch_id = b.id
JOIN centers c ON b.center_id = c.id
GROUP BY c.id, c.center_name;
```

#### 4. Content Upload Summary
```sql
SELECT 
  u.full_name AS teacher_name,
  sub.subject_name,
  ct.type_name,
  COUNT(*) as content_count
FROM content con
JOIN subjects sub ON con.subject_id = sub.id
JOIN content_types ct ON con.content_type_id = ct.id
JOIN users u ON con.uploaded_by = u.id
WHERE con.is_published = TRUE
GROUP BY u.full_name, sub.subject_name, ct.type_name
ORDER BY teacher_name, subject_name;
```

---

## SAMPLE DATA OVERVIEW

### Test Accounts

**CEO:**
- Email: `aditya.mehta@crackit.com`
- Role: Full system access

**Centre Head:**
- Email: `rajesh.sharma@crackit.com`
- Center: Pune Kothrud

**Teacher (Physics):**
- Email: `ramesh.kumar@crackit.com`
- Subjects: Physics
- Batches: JEE11-MOR-A

**Student:**
- Email: `aarav.patel@example.com`
- Student Code: STU20250001
- Class: 11
- Batch: JEE11-MOR-A

**Note:** In production, these users need to be created via Supabase Auth API with passwords. Sample data assumes auth.users entries exist.

---

### Data Structure Summary

```
4 States
  └─ 6 Districts
      └─ 4 Centers
          └─ 3 Batches
              ├─ 20 Students (15 in JEE, 5 in Olympiad)
              ├─ 3 Teachers
              ├─ 4 Content items
              ├─ 1 Exam with 15 marks entries
              ├─ 100+ Attendance records
              └─ 15 Fee records (5 paid, 10 pending)
```

---

## ROW LEVEL SECURITY (RLS)

### Important: RLS is Enabled

All tables have Row Level Security enabled with policies. This means:

1. **CEO** - Can see everything
2. **Centre Head** - Can see only their center's data
3. **Teachers** - Can see only their batches' data
4. **Students** - Can see only their own data

### Testing RLS

To test RLS policies, you need to:

1. **Create actual auth users** via Supabase Auth API
2. **Set their role in users table**
3. **Query as that user** (using their JWT token)

**Example (JavaScript):**
```javascript
// Login as student
const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'aarav.patel@example.com',
  password: 'student123'
});

// This query now respects RLS (student sees only their data)
const { data: myContent } = await supabase
  .from('content')
  .select('*');
```

### Disable RLS for Testing (NOT RECOMMENDED IN PRODUCTION)

```sql
-- ONLY FOR DEVELOPMENT TESTING
ALTER TABLE content DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
-- etc.

-- Remember to re-enable before production!
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
```

---

## TROUBLESHOOTING

### Issue: "relation already exists"
**Cause:** Running schema.sql multiple times  
**Fix:** 
```sql
-- Drop all tables (WARNING: Deletes all data!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Then re-run schema.sql
```

### Issue: "insert or update on table violates foreign key constraint"
**Cause:** Sample data references missing parent records  
**Fix:** Make sure `database_schema.sql` ran successfully before `sample_data.sql`

### Issue: "permission denied for table"
**Cause:** Using wrong credentials or RLS blocking access  
**Fix:** 
- Use service role key (not anon key) for admin operations
- Or disable RLS temporarily for testing

### Issue: "could not connect to server"
**Cause:** Wrong connection string or project paused  
**Fix:**
- Verify project is active in Supabase dashboard
- Check connection string format
- Ensure no typos in password

---

## NEXT STEPS AFTER SETUP

### 1. Create Supabase Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref [YOUR-PROJECT-REF]

# Create edge function
supabase functions new get-video-url

# Deploy
supabase functions deploy get-video-url
```

### 2. Set Up Authentication
```javascript
// In your app
const { user } = await supabase.auth.signUp({
  email: 'newstudent@example.com',
  password: 'secure-password-123'
});

// Then create student record
await supabase.from('users').insert({
  id: user.id,
  role_id: studentRoleId,
  full_name: 'New Student'
});
```

### 3. Configure Storage Buckets
```sql
-- For PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false);

-- For images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true);
```

### 4. Set Up Cron Jobs
```sql
-- Schedule monthly fee reminder
SELECT cron.schedule(
  'monthly-fee-reminder',
  '0 9 1 * *',  -- 9 AM on 1st of each month
  $$
  SELECT net.http_post(
    url:='https://[PROJECT-REF].supabase.co/functions/v1/send-fee-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer [ANON-KEY]"}'::jsonb
  );
  $$
);
```

---

## BACKUP & RESTORE

### Create Backup
```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or using pg_dump
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > backup.sql
```

### Restore Backup
```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" < backup.sql
```

---

## MONITORING

### Check Database Size
```sql
SELECT 
  pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = 'postgres';
```

### Find Slow Queries
```sql
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Index Usage
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## PRODUCTION CHECKLIST

Before going live:

- [ ] Change all default passwords
- [ ] Enable RLS on all tables
- [ ] Test RLS policies thoroughly
- [ ] Set up automated backups (Supabase Pro has this)
- [ ] Configure Bunny.net for video hosting
- [ ] Set up Firebase for push notifications
- [ ] Add monitoring/alerting (Sentry, etc.)
- [ ] Load test with 150+ concurrent users
- [ ] Review and optimize slow queries
- [ ] Document API endpoints
- [ ] Train client on admin portal
- [ ] Prepare support documentation

---

## SUPPORT & RESOURCES

- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **SQL Tutorial:** https://www.postgresqltutorial.com/
- **Supabase Community:** https://discord.supabase.com/

---

## CONCLUSION

Your database is now set up with:

✅ Complete schema (45+ tables)  
✅ Sample data (20 students, 3 teachers)  
✅ Proper relationships & constraints  
✅ Row Level Security policies  
✅ Indexes for performance  
✅ Ready for development  

**Next:** Start building your Next.js admin portal and Flutter app!

---

**Setup Time:** ~10 minutes  
**Difficulty:** Easy  
**Status:** Production-Ready ✅
