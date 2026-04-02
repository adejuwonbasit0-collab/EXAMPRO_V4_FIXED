const path = require('path');
const files = [
  './routes/auth',
  './routes/users', 
  './routes/institutions',
  './routes/pastQuestions',
  './routes/courses',
  './routes/courses_v2',
  './routes/payments',
  './routes/notifications',
  './routes/student',
  './routes/admin',
  './routes/super-admin',
  './routes/chat',
  './routes/instructor_earnings',
  './routes/public',
  './routes/templates',
  './routes/pagebuilder'
];

console.log('\n=== ROUTE FILE DIAGNOSTIC ===\n');
let allOk = true;
files.forEach(f => {
  try {
    const m = require(f);
    if (!m || typeof m !== 'function') {
      console.log('❌ BAD (no export):', f, '→ got:', typeof m);
      allOk = false;
    } else {
      console.log('✅ OK:', f);
    }
  } catch(e) {
    console.log('💥 ERROR:', f, '→', e.message.split('\n')[0]);
    allOk = false;
  }
});
console.log(allOk ? '\n✅ All routes OK\n' : '\n❌ Fix the files above\n');