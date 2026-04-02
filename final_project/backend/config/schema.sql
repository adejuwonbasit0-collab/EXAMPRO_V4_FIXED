-- =============================================
-- ExamPro Platform v2 - Complete Schema
-- Run this fresh OR see UPGRADE section at bottom
-- =============================================
CREATE DATABASE IF NOT EXISTS exam_platform;
USE exam_platform;

-- ROLES: 1=student, 2=admin, 3=instructor, 4=super_admin
CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO roles (id,name) VALUES (1,'student'),(2,'admin'),(3,'instructor'),(4,'super_admin')
ON DUPLICATE KEY UPDATE name=name;

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role_id INT DEFAULT 1,
  avatar VARCHAR(255),
  phone VARCHAR(20),
  bio TEXT,
  institution_name VARCHAR(200),
  academic_level VARCHAR(50),
  interests VARCHAR(500),
  is_verified BOOLEAN DEFAULT FALSE,
  otp_code VARCHAR(10),
  otp_expires DATETIME,
  login_otp VARCHAR(10),
  login_otp_expires DATETIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_by_admin INT DEFAULT NULL,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  total_earned DECIMAL(10,2) DEFAULT 0.00,
  last_login DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Super Admin seed  (password: SuperAdmin@123)
INSERT INTO users (name,email,password,role_id,is_verified,is_active)
VALUES ('Super Admin','superadmin@exampro.ng','$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p4UkCiynTxHMQFcvYyqTim',4,TRUE,TRUE)
ON DUPLICATE KEY UPDATE email=email;

-- INSTITUTIONS
CREATE TABLE IF NOT EXISTS institutions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  short_name VARCHAR(50) NOT NULL,
  logo VARCHAR(255),
  description TEXT,
  type ENUM('university','polytechnic','college','secondary','external') NOT NULL,
  country VARCHAR(100) DEFAULT 'Nigeria',
  state VARCHAR(100),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- EXAM TYPES
CREATE TABLE IF NOT EXISTS exam_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(50) NOT NULL,
  description TEXT,
  logo VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
INSERT INTO exam_types (name,short_name) VALUES
('West African Examinations Council','WAEC'),
('National Examinations Council','NECO'),
('Joint Admissions and Matriculation Board','JAMB'),
('National Business and Technical Examinations Board','NABTEB')
ON DUPLICATE KEY UPDATE name=name;

-- SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(20),
  institution_id INT,
  exam_type_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (exam_type_id) REFERENCES exam_types(id)
);

-- PAST QUESTIONS
CREATE TABLE IF NOT EXISTS past_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  subject_id INT,
  institution_id INT,
  exam_type_id INT,
  year VARCHAR(10),
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cover_image VARCHAR(255),
  file_path VARCHAR(255),
  total_questions INT DEFAULT 0,
  preview_questions INT DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  downloads INT DEFAULT 0,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (exam_type_id) REFERENCES exam_types(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- QUESTIONS (CBT)
CREATE TABLE IF NOT EXISTS questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  past_question_id INT NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer ENUM('a','b','c','d') NOT NULL,
  explanation TEXT,
  question_number INT,
  image_path VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (past_question_id) REFERENCES past_questions(id) ON DELETE CASCADE
);

-- COURSES
CREATE TABLE IF NOT EXISTS courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  thumbnail VARCHAR(255),
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  instructor_id INT,
  institution_id INT,
  exam_type_id INT,
  category VARCHAR(100),
  level ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
  duration_hours INT DEFAULT 0,
  total_lessons INT DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  approval_notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  enrolled_count INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id),
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (exam_type_id) REFERENCES exam_types(id)
);

-- COURSE SECTIONS
CREATE TABLE IF NOT EXISTS course_sections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  order_num INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- COURSE LESSONS
CREATE TABLE IF NOT EXISTS course_lessons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  section_id INT NOT NULL,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  video_url VARCHAR(500),
  video_type ENUM('youtube','vimeo','upload','google_meet') DEFAULT 'youtube',
  duration_minutes INT DEFAULT 0,
  material_path VARCHAR(255),
  material_name VARCHAR(255),
  order_num INT DEFAULT 0,
  is_preview BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- LIVE LECTURES (must be linked to a course)
CREATE TABLE IF NOT EXISTS live_lectures (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  course_id INT NOT NULL,
  instructor_id INT,
  meeting_link VARCHAR(500) NOT NULL,
  platform ENUM('google_meet','zoom','teams','youtube_live') DEFAULT 'google_meet',
  scheduled_at DATETIME NOT NULL,
  duration_minutes INT DEFAULT 60,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (instructor_id) REFERENCES users(id)
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_ref VARCHAR(100) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  item_type ENUM('past_question','course','template') NOT NULL,
  item_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  payment_gateway VARCHAR(50) NOT NULL,
  payment_status ENUM('pending','success','failed','refunded','awaiting_approval') DEFAULT 'pending',
  gateway_ref VARCHAR(255),
  gateway_response TEXT,
  bank_transfer_proof VARCHAR(255),
  paid_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- USER PURCHASES
CREATE TABLE IF NOT EXISTS user_purchases (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  item_type ENUM('past_question','course','template') NOT NULL,
  item_id INT NOT NULL,
  order_id INT NOT NULL,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  UNIQUE KEY unique_purchase (user_id,item_type,item_id)
);

-- COURSE ENROLLMENTS
CREATE TABLE IF NOT EXISTS course_enrollments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  progress_percent INT DEFAULT 0,
  last_lesson_id INT DEFAULT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at DATETIME,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  UNIQUE KEY unique_enrollment (user_id,course_id)
);

-- LESSON PROGRESS
CREATE TABLE IF NOT EXISTS lesson_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  lesson_id INT NOT NULL,
  course_id INT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (lesson_id) REFERENCES course_lessons(id),
  UNIQUE KEY unique_lesson_progress (user_id,lesson_id)
);

-- QUIZ ATTEMPTS
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  past_question_id INT NOT NULL,
  score INT DEFAULT 0,
  total_questions INT DEFAULT 0,
  time_taken_seconds INT DEFAULT 0,
  answers JSON,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (past_question_id) REFERENCES past_questions(id)
);

-- PAYMENT SETTINGS
CREATE TABLE IF NOT EXISTS payment_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gateway VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  public_key VARCHAR(500),
  secret_key_encrypted VARCHAR(500),
  extra_config JSON,
  commission_percent DECIMAL(5,2) DEFAULT 0,
  min_amount DECIMAL(10,2) DEFAULT 0,
  max_amount DECIMAL(10,2) DEFAULT 999999.99,
  bank_account_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_name VARCHAR(100),
  bank_instructions TEXT,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);
INSERT INTO payment_settings (gateway,display_name,is_active) VALUES
('paystack','Paystack',TRUE),('flutterwave','Flutterwave',FALSE),
('stripe','Stripe',FALSE),('paypal','PayPal',FALSE),
('bank_transfer','Direct Bank Transfer',FALSE),
('credit_card','Credit/Debit Card',FALSE)
ON DUPLICATE KEY UPDATE gateway=gateway;

-- SITE SETTINGS
CREATE TABLE IF NOT EXISTS site_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT INTO site_settings (setting_key,setting_value) VALUES
('site_name','ExamPro'),('site_tagline','Your #1 Exam Prep Platform'),
('support_email','support@exampro.ng'),('currency','NGN'),
('maintenance_mode','false'),('commission_rate','5'),
('min_withdrawal','1000'),('max_withdrawal','500000'),
('smtp_verification_required','true'),('login_otp_required','false'),
('allow_student_registration','true'),('allow_instructor_registration','true'),
('admin_notification_email','admin@exampro.ng'),
('bank_account_name',''),('bank_account_number',''),('bank_name',''),
('business_phone',''),('terms_and_conditions',''),('privacy_policy',''),
('perm_student_can_download','true'),('perm_student_can_review','true'),
('perm_instructor_commission','20'),('perm_require_course_approval','true'),
('homepage_hero_title','Ace Every Exam'),
('homepage_hero_subtitle','Nigeria\'s most comprehensive exam prep platform')
ON DUPLICATE KEY UPDATE setting_key=setting_key;

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  sender_id INT DEFAULT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','success','warning','error','announcement') DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- CERTIFICATES
CREATE TABLE IF NOT EXISTS certificates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  certificate_number VARCHAR(100) UNIQUE NOT NULL,
  template_id INT DEFAULT NULL,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  UNIQUE KEY unique_cert (user_id,course_id)
);

-- CERTIFICATE TEMPLATES
CREATE TABLE IF NOT EXISTS certificate_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  template_image VARCHAR(255),
  name_x_percent DECIMAL(5,2) DEFAULT 50.00,
  name_y_percent DECIMAL(5,2) DEFAULT 55.00,
  name_font_size INT DEFAULT 36,
  name_color VARCHAR(20) DEFAULT '#1a1a2e',
  name_font VARCHAR(100) DEFAULT 'Georgia',
  is_default BOOLEAN DEFAULT FALSE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- PAGE TEMPLATES (Marketplace)
CREATE TABLE IF NOT EXISTS page_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  thumbnail VARCHAR(255),
  category VARCHAR(100) DEFAULT 'general',
  template_data LONGTEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,2) DEFAULT 0.00,
  created_by INT,
  downloads INT DEFAULT 0,
  tags VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- PAGE BUILDER (admin saves their pages)
CREATE TABLE IF NOT EXISTS admin_pages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  page_name VARCHAR(100) NOT NULL,
  page_slug VARCHAR(100) NOT NULL,
  page_data LONGTEXT,
  is_published BOOLEAN DEFAULT FALSE,
  last_saved TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id),
  UNIQUE KEY unique_admin_page (admin_id,page_slug)
);

-- TEMPLATE PURCHASES
CREATE TABLE IF NOT EXISTS template_purchases (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  template_id INT NOT NULL,
  order_id INT,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id),
  FOREIGN KEY (template_id) REFERENCES page_templates(id),
  UNIQUE KEY unique_tpl_purchase (admin_id,template_id)
);

-- =============================================
-- SEED: 10 Templates
-- =============================================
INSERT INTO page_templates (name,slug,description,category,is_active,is_premium,price,tags,template_data) VALUES
('Classic Blue','classic-blue','Professional blue education template','education',1,0,0,'education,blue,classic','{"theme":"classic-blue","primary":"#2563eb","accent":"#10b981","bg":"#f8fafc","dark":false}'),
('Dark Tech','dark-tech','Dark neon theme for modern platforms','modern',1,0,0,'dark,tech,neon','{"theme":"dark-tech","primary":"#818cf8","accent":"#34d399","bg":"#0f172a","dark":true}'),
('Minimal White','minimal-white','Ultra-clean minimal design','minimal',1,0,0,'minimal,white,clean','{"theme":"minimal-white","primary":"#374151","accent":"#6366f1","bg":"#ffffff","dark":false}'),
('Vibrant Orange','vibrant-orange','High-energy orange theme','vibrant',1,0,0,'orange,vibrant','{"theme":"vibrant-orange","primary":"#ea580c","accent":"#facc15","bg":"#fff7ed","dark":false}'),
('Purple Galaxy','purple-galaxy','Premium glassmorphism purple design','premium',1,1,2999,'purple,glass,premium','{"theme":"purple-galaxy","primary":"#7c3aed","accent":"#ec4899","bg":"#1e1b4b","dark":true}'),
('Green Fresh','green-fresh','Fresh earthy green tones','nature',1,0,0,'green,fresh,nature','{"theme":"green-fresh","primary":"#16a34a","accent":"#f59e0b","bg":"#f0fdf4","dark":false}'),
('Corporate Navy','corporate-navy','Professional corporate style','corporate',1,0,0,'corporate,navy,pro','{"theme":"corporate-navy","primary":"#1e40af","accent":"#dc2626","bg":"#eff6ff","dark":false}'),
('Sunset Warm','sunset-warm','Beautiful warm sunset gradients','creative',1,1,1999,'sunset,warm,gradient','{"theme":"sunset-warm","primary":"#f97316","accent":"#a855f7","bg":"linear-gradient(135deg,#ffecd2,#fcb69f)","dark":false}'),
('Glassmorphism','glass-pro','Full glass morphism design','premium',1,1,3999,'glass,blur,premium','{"theme":"glass-pro","primary":"#6366f1","accent":"#22d3ee","bg":"linear-gradient(135deg,#667eea,#764ba2)","dark":true}'),
('Red Royal','red-royal','Bold red royal styling','bold',1,0,0,'red,bold,royal','{"theme":"red-royal","primary":"#dc2626","accent":"#fbbf24","bg":"#fef2f2","dark":false}')
ON DUPLICATE KEY UPDATE slug=slug;

-- =============================================
-- UPGRADE SECTION (run if upgrading from v1)
-- =============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_otp VARCHAR(10) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_otp_expires DATETIME DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_admin INT DEFAULT NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS approval_notes TEXT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bank_transfer_proof VARCHAR(255) DEFAULT NULL;
ALTER TABLE orders MODIFY COLUMN payment_status ENUM('pending','success','failed','refunded','awaiting_approval') DEFAULT 'pending';
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(100) DEFAULT NULL;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50) DEFAULT NULL;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT NULL;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS bank_instructions TEXT DEFAULT NULL;

-- Add super_admin role if missing
INSERT INTO roles (id,name) VALUES (4,'super_admin') ON DUPLICATE KEY UPDATE name=name;
-- Add credit_card gateway if missing
INSERT INTO payment_settings (gateway,display_name,is_active) VALUES ('credit_card','Credit/Debit Card',FALSE) ON DUPLICATE KEY UPDATE gateway=gateway;
-- Add new site settings if missing
INSERT INTO site_settings (setting_key,setting_value) VALUES
('login_otp_required','false'),('homepage_hero_title','Ace Every Exam'),
('homepage_hero_subtitle','Nigeria\'s most comprehensive exam prep platform'),
('perm_student_can_download','true'),('perm_student_can_review','true'),
('perm_instructor_commission','20'),('perm_require_course_approval','true')
ON DUPLICATE KEY UPDATE setting_key=setting_key;


-- V3 NEW TABLES
CREATE TABLE IF NOT EXISTS templates (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(200) NOT NULL, primary_color VARCHAR(20) DEFAULT '#2563eb', accent_color VARCHAR(20) DEFAULT '#10b981', bg_color VARCHAR(20) DEFAULT '#060a14', font_family VARCHAR(100) DEFAULT 'DM Sans', hero_title VARCHAR(255), hero_subtitle VARCHAR(255), is_premium TINYINT(1) DEFAULT 0, price DECIMAL(10,2) DEFAULT 0, is_active TINYINT(1) DEFAULT 1, downloads INT DEFAULT 0, created_at DATETIME DEFAULT NOW());
CREATE TABLE IF NOT EXISTS admin_sites (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, school_name VARCHAR(200) NOT NULL, subdomain VARCHAR(100) NOT NULL UNIQUE, custom_domain VARCHAR(200), logo VARCHAR(255), template_id INT, primary_color VARCHAR(20) DEFAULT '#2563eb', accent_color VARCHAR(20) DEFAULT '#10b981', bg_color VARCHAR(20) DEFAULT '#060a14', is_approved TINYINT(1) DEFAULT 0, is_active TINYINT(1) DEFAULT 0, approval_notes TEXT, approved_at DATETIME, created_at DATETIME DEFAULT NOW(), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS bank_details (id INT AUTO_INCREMENT PRIMARY KEY, site_id INT, bank_name VARCHAR(100), account_name VARCHAR(150), account_number VARCHAR(30), instructions TEXT);
CREATE TABLE IF NOT EXISTS global_settings (id INT AUTO_INCREMENT PRIMARY KEY, setting_key VARCHAR(100) NOT NULL UNIQUE, setting_value TEXT);

-- =============================================
-- V4 UPGRADES - MULTI-TENANT LMS SAAS
-- =============================================

-- 1. PAST QUESTIONS: access_type field
ALTER TABLE past_questions ADD COLUMN IF NOT EXISTS access_type ENUM('read_only','downloadable') DEFAULT 'downloadable';
ALTER TABLE past_questions ADD COLUMN IF NOT EXISTS admin_id INT DEFAULT NULL;
ALTER TABLE past_questions ADD COLUMN IF NOT EXISTS instructor_id INT DEFAULT NULL;

-- 2. MULTI-TENANT PAYMENT SETTINGS (per-admin)
CREATE TABLE IF NOT EXISTS admin_payment_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL UNIQUE,
  paystack_public_key VARCHAR(500),
  paystack_secret_key VARCHAR(500),
  flutterwave_public_key VARCHAR(500),
  flutterwave_secret_key VARCHAR(500),
  payoneer_public_key VARCHAR(500),
  payoneer_secret_key VARCHAR(500),
  stripe_public_key VARCHAR(500),
  stripe_secret_key VARCHAR(500),
  bank_name VARCHAR(100),
  bank_account_name VARCHAR(150),
  bank_account_number VARCHAR(30),
  bank_instructions TEXT,
  debit_card_enabled TINYINT(1) DEFAULT 0,
  webhook_secret VARCHAR(255),
  currency VARCHAR(10) DEFAULT 'NGN',
  payment_description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. MULTI-TENANT SMTP SETTINGS (per-admin)
CREATE TABLE IF NOT EXISTS admin_smtp_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL UNIQUE,
  smtp_host VARCHAR(255),
  smtp_port INT DEFAULT 587,
  smtp_user VARCHAR(255),
  smtp_pass VARCHAR(500),
  smtp_secure TINYINT(1) DEFAULT 0,
  sender_email VARCHAR(255),
  sender_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. CHAT SYSTEM
CREATE TABLE IF NOT EXISTS chat_rooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  student_id INT NOT NULL,
  instructor_id INT DEFAULT NULL,
  room_type ENUM('student_instructor','student_admin') DEFAULT 'student_admin',
  last_message TEXT,
  last_message_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  UNIQUE KEY unique_room (admin_id, student_id, room_type)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- 5. COURSE REVIEWS & RATINGS
CREATE TABLE IF NOT EXISTS course_reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  is_approved TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_review (course_id, user_id)
);

-- 6. COURSE QUIZZES
CREATE TABLE IF NOT EXISTS course_quizzes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  lesson_id INT DEFAULT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  pass_percent INT DEFAULT 70,
  time_limit_minutes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer ENUM('a','b','c','d') NOT NULL,
  explanation TEXT,
  order_num INT DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES course_quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT NOT NULL,
  user_id INT NOT NULL,
  answers JSON,
  score INT DEFAULT 0,
  total INT DEFAULT 0,
  passed TINYINT(1) DEFAULT 0,
  taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES course_quizzes(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 7. COURSE BUNDLES
CREATE TABLE IF NOT EXISTS course_bundles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  thumbnail VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS course_bundle_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bundle_id INT NOT NULL,
  course_id INT NOT NULL,
  FOREIGN KEY (bundle_id) REFERENCES course_bundles(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  UNIQUE KEY unique_bundle_item (bundle_id, course_id)
);

-- 8. INSTRUCTOR WALLET & EARNINGS
CREATE TABLE IF NOT EXISTS instructor_wallet (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instructor_id INT NOT NULL UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  total_earned DECIMAL(10,2) DEFAULT 0.00,
  total_withdrawn DECIMAL(10,2) DEFAULT 0.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS earnings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instructor_id INT NOT NULL,
  course_id INT DEFAULT NULL,
  order_id INT DEFAULT NULL,
  amount DECIMAL(10,2) NOT NULL,
  commission_percent DECIMAL(5,2) DEFAULT 20.00,
  platform_fee DECIMAL(10,2) DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instructor_id INT NOT NULL,
  admin_id INT DEFAULT NULL,
  amount DECIMAL(10,2) NOT NULL,
  bank_name VARCHAR(100),
  account_name VARCHAR(150),
  account_number VARCHAR(30),
  status ENUM('pending','approved','rejected','paid') DEFAULT 'pending',
  notes TEXT,
  processed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id)
);

-- 9. NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS notification_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  email_course_enrollment TINYINT(1) DEFAULT 1,
  email_course_completion TINYINT(1) DEFAULT 1,
  email_certificate TINYINT(1) DEFAULT 1,
  email_payment TINYINT(1) DEFAULT 1,
  email_announcements TINYINT(1) DEFAULT 1,
  inapp_all TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. USERS: add site_id for multi-tenancy if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS site_id INT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved TINYINT(1) DEFAULT 1;

-- 11. COURSES: add admin_id & discussion support
ALTER TABLE courses ADD COLUMN IF NOT EXISTS admin_id INT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS course_discussions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_id INT DEFAULT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_site_id ON users(site_id);
CREATE INDEX IF NOT EXISTS idx_courses_admin_id ON courses(admin_id);
CREATE INDEX IF NOT EXISTS idx_past_questions_admin_id ON past_questions(admin_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);


-- Ensure page_templates has thumbnail column
ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(255) DEFAULT NULL;


-- ── V5: SUBSCRIPTION MANAGEMENT ─────────────────────────────
CREATE TABLE IF NOT EXISTS admin_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'starter',
  status ENUM('active','expired','cancelled','trial') DEFAULT 'trial',
  expires_at DATE,
  payment_ref VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sub_admin (admin_id),
  INDEX idx_sub_status (status),
  INDEX idx_sub_expires (expires_at)
);

-- Ensure page_templates has thumbnail column (v4 addition)
ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(255) DEFAULT NULL;

-- Notification preferences (v4 schema, now wired)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  email_course_enroll TINYINT(1) DEFAULT 1,
  email_course_complete TINYINT(1) DEFAULT 1,
  email_certificate TINYINT(1) DEFAULT 1,
  email_payment TINYINT(1) DEFAULT 1,
  email_instructor_approval TINYINT(1) DEFAULT 1,
  email_announcements TINYINT(1) DEFAULT 1,
  in_app_all TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── COUPONS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  code VARCHAR(50) NOT NULL,
  discount_type ENUM('percent','fixed') DEFAULT 'percent',
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INT DEFAULT NULL,
  uses_count INT DEFAULT 0,
  expires_at DATETIME DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_coupon (site_id, code)
);

-- ═══════════════════════════════════════════════════════════════════
-- FIX 1: Missing chat_conversations table (student ↔ instructor chat)
-- Paste this at the BOTTOM of backend/config/schema.sql
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chat_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  instructor_id INT NOT NULL,
  course_id INT,
  last_message TEXT,
  last_message_at DATETIME,
  student_unread INT DEFAULT 0,
  instructor_unread INT DEFAULT 0,
  created_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- The studentController uses the chat_messages table with a conversation_id column.
-- The existing chat_messages table only has room_id (for the rooms-based chat).
-- We add conversation_id as a nullable column so BOTH systems share one table.
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS conversation_id INT DEFAULT NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_text TEXT DEFAULT NULL;
-- Note: studentController inserts with message_text; rooms-based chat uses message column.
-- Both are nullable so neither breaks the other.

-- ═══════════════════════════════════════════════════════════════════
-- FIX 2 (also here): Coupons table
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- Also paste at the BOTTOM of backend/config/schema.sql
-- (in addition to FIX1_ADD_TO_schema.sql above)
-- ═══════════════════════════════════════════════════════════════════

-- Subscription plans (editable by super admin)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  `interval` ENUM('month','quarter','year','lifetime') DEFAULT 'month',
  description TEXT,
  max_students INT DEFAULT 0,
  max_courses INT DEFAULT 0,
  features JSON,
  is_featured TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT NOW()
);

-- Pre-seed default plans so super admin sees something on first login
INSERT IGNORE INTO subscription_plans (id, name, price, `interval`, description, max_students, max_courses, features, is_featured, is_active) VALUES
(1, 'Starter',   5000,   'month', 'Perfect for small schools',       100, 5,  '["Up to 100 students","5 courses","10 past questions","Basic analytics"]',           0, 1),
(2, 'Growth',    15000,  'month', 'For growing institutions',        1000, 0,  '["Up to 1,000 students","Unlimited courses","Full analytics","Custom domain"]',      1, 1),
(3, 'Enterprise',50000,  'month', 'For large institutions',          0,    0,  '["Unlimited students","All Growth features","API access","Priority support"]',       0, 1),
(4, 'Yearly',    150000, 'year',  'Growth plan, billed yearly',      1000, 0,  '["All Growth features","2 months free","Dedicated support"]',                       0, 1);

-- Platform-level payment settings (super admin's own keys as fallback)
CREATE TABLE IF NOT EXISTS platform_payment_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gateway VARCHAR(50) NOT NULL UNIQUE,
  public_key VARCHAR(500),
  secret_key VARCHAR(500),
  is_active TINYINT(1) DEFAULT 0,
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(30),
  bank_account_name VARCHAR(150),
  bank_instructions TEXT,
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW()
);
-- Fix page_templates missing color columns (used by /api/public/templates SELECT)
ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#2563eb';
ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT '#10b981';

-- Update existing seed rows with colors from their template_data JSON
UPDATE page_templates SET primary_color='#2563eb', accent_color='#10b981' WHERE slug='classic-blue' AND primary_color IS NULL;
UPDATE page_templates SET primary_color='#818cf8', accent_color='#34d399' WHERE slug='dark-tech' AND primary_color IS NULL;
UPDATE page_templates SET primary_color='#374151', accent_color='#6366f1' WHERE slug='minimal-white' AND primary_color IS NULL;
UPDATE page_templates SET primary_color='#ea580c', accent_color='#facc15' WHERE slug='vibrant-orange' AND primary_color IS NULL;
UPDATE page_templates SET primary_color='#7c3aed', accent_color='#ec4899' WHERE slug='purple-galaxy' AND primary_color IS NULL;

-- Fix bank_details for instructor bank accounts
ALTER TABLE bank_details ADD COLUMN IF NOT EXISTS user_id INT DEFAULT NULL;
ALTER TABLE bank_details ADD COLUMN IF NOT EXISTS is_primary TINYINT(1) DEFAULT 0;
ALTER TABLE bank_details ADD INDEX IF NOT EXISTS idx_bank_details_user (user_id);