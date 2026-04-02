-- ============================================================
-- ExamPro Final Migration - Run ONCE
-- CMD: mysql -u root exam_platform < backend/config/migration.sql
-- ============================================================

USE exam_platform;

-- ── 1. Add site_id to users ───────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS site_id INT DEFAULT NULL AFTER role_id,
  ADD COLUMN IF NOT EXISTS created_by_admin INT DEFAULT NULL;

-- ── 2. Add missing columns to admin_sites ────────────────────────────────────
ALTER TABLE admin_sites
  ADD COLUMN IF NOT EXISTS font_family VARCHAR(100) DEFAULT 'DM Sans' AFTER bg_color,
  ADD COLUMN IF NOT EXISTS hero_title VARCHAR(255) DEFAULT 'Welcome to Our School' AFTER font_family,
  ADD COLUMN IF NOT EXISTS hero_subtitle VARCHAR(255) DEFAULT 'Quality Education' AFTER hero_title,
  ADD COLUMN IF NOT EXISTS description TEXT AFTER hero_subtitle,
  ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'starter' AFTER description;

-- ── 3. Add site_id to orders ─────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS site_id INT DEFAULT NULL AFTER user_id;

-- ── 4. Add plan_name and plan_id to admin_subscriptions ──────────────────────
ALTER TABLE admin_subscriptions
  ADD COLUMN IF NOT EXISTS plan_id INT DEFAULT NULL AFTER admin_id,
  ADD COLUMN IF NOT EXISTS plan_name VARCHAR(100) DEFAULT NULL AFTER plan_id;

-- Sync plan_name from existing plan column
UPDATE admin_subscriptions SET plan_name = plan WHERE plan_name IS NULL AND plan IS NOT NULL;

-- ── 5. Add new columns to subscription_plans ─────────────────────────────────
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS max_past_questions INT DEFAULT 0 AFTER max_courses,
  ADD COLUMN IF NOT EXISTS page_builder_enabled TINYINT(1) DEFAULT 1 AFTER max_past_questions,
  ADD COLUMN IF NOT EXISTS ai_enabled TINYINT(1) DEFAULT 1 AFTER page_builder_enabled,
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER ai_enabled,
  ADD COLUMN IF NOT EXISTS template_access VARCHAR(20) DEFAULT 'all' AFTER sort_order;

-- ── 6. Add admin_id to payment_settings for per-admin gateway keys ───────────
ALTER TABLE payment_settings
  ADD COLUMN IF NOT EXISTS admin_id INT DEFAULT NULL AFTER updated_by,
  ADD COLUMN IF NOT EXISTS secret_key VARCHAR(500) DEFAULT NULL AFTER public_key;

-- ── 7. Add time_limit_minutes to past_questions ──────────────────────────────
ALTER TABLE past_questions
  ADD COLUMN IF NOT EXISTS time_limit_minutes INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL;

-- ── 8. Add quiz_results table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  user_id INT NOT NULL,
  score INT DEFAULT 0,
  passed TINYINT(1) DEFAULT 0,
  answers JSON,
  completed_at DATETIME DEFAULT NOW(),
  UNIQUE KEY uniq_quiz_user (quiz_id, user_id)
);

-- ── 9. Add page_revisions table (for page builder history) ───────────────────
CREATE TABLE IF NOT EXISTS page_revisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  page_slug VARCHAR(100) NOT NULL DEFAULT 'home',
  page_data LONGTEXT,
  label VARCHAR(100),
  created_at DATETIME DEFAULT NOW(),
  INDEX idx_rev_admin (admin_id),
  INDEX idx_rev_slug (admin_id, page_slug)
);

-- Add is_published and page_slug to admin_pages if missing
ALTER TABLE admin_pages
  ADD COLUMN IF NOT EXISTS is_published TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS page_slug VARCHAR(100) DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS published_at DATETIME DEFAULT NULL;

-- ── 10. Seed default subscription plans ──────────────────────────────────────
INSERT IGNORE INTO subscription_plans 
  (id,name,price,`interval`,description,max_students,max_courses,max_past_questions,page_builder_enabled,ai_enabled,is_featured,is_active,sort_order)
VALUES
  (1,'Starter',0,'month','7-day free trial to explore ExamPro',50,3,5,0,0,0,1,1),
  (2,'Basic',4999,'month','For small schools getting started',200,10,20,1,0,0,1,2),
  (3,'Pro',9999,'month','For growing schools with more students',1000,50,100,1,1,1,1,3),
  (4,'Enterprise',24999,'month','Unlimited everything for large institutions',0,0,0,1,1,0,1,4);

-- Update existing plans that have the new columns empty
UPDATE subscription_plans SET
  max_past_questions = CASE
    WHEN LOWER(name) LIKE '%starter%' OR LOWER(name) LIKE '%free%' OR LOWER(name) LIKE '%trial%' THEN 5
    WHEN LOWER(name) LIKE '%basic%' OR LOWER(name) LIKE '%bronze%' THEN 20
    WHEN LOWER(name) LIKE '%pro%' OR LOWER(name) LIKE '%silver%' THEN 100
    ELSE 0
  END,
  page_builder_enabled = CASE
    WHEN LOWER(name) LIKE '%starter%' OR LOWER(name) LIKE '%free%' OR LOWER(name) LIKE '%trial%' THEN 0
    ELSE 1
  END,
  ai_enabled = CASE
    WHEN LOWER(name) LIKE '%pro%' OR LOWER(name) LIKE '%enterprise%' OR LOWER(name) LIKE '%business%' THEN 1
    ELSE 0
  END
WHERE max_past_questions = 0 AND id > 4;

-- ── 11. Seed global payment settings rows if empty ───────────────────────────
INSERT IGNORE INTO payment_settings (gateway, display_name, is_active, admin_id) VALUES
  ('paystack',      'Paystack',             0, NULL),
  ('flutterwave',   'Flutterwave',          0, NULL),
  ('stripe',        'Stripe',               0, NULL),
  ('bank_transfer', 'Direct Bank Transfer', 1, NULL);

SELECT 'Migration complete!' AS status;
SELECT id,name,price,max_students,max_courses,max_past_questions,page_builder_enabled,ai_enabled 
FROM subscription_plans ORDER BY sort_order,id;
