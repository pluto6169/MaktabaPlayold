# 🗄️ خيارات إضافية لإدارة قاعدة البيانات

> قاعدة البيانات تُنشأ في `server/maktaba.db`. شغّل الأوامر التي تستخدم `maktaba.db` من داخل مجلد `server/`؛ الخادم الخلفي معطّل حاليًا ما لم تشغّله يدويًا.

## 1️⃣ استخدام لوحة التحكم الويب (الطريقة الأسهل) ✅ موصى بها

**الوصول:**
```
https://yourdomain.com/admin
```

**المميزات:**
- ✅ واجهة ويب سهلة
- ✅ لا تحتاج برامج إضافية
- ✅ محمية بـ JWT
- ✅ آمنة وموثوقة

---

## 2️⃣ أداة DB Browser for SQLite (للتطوير المحلي)

### التثبيت

**Windows:**
```
1. اذهب إلى: https://sqlitebrowser.org/
2. اضغط Download
3. اختر Windows installer
4. اتبع التعليمات
```

**macOS:**
```bash
brew install db-browser-for-sqlite
```

**Linux:**
```bash
sudo apt-get install sqlitebrowser
```

### الاستخدام

```
1. فتح البرنامج
2. File > Open > maktaba.db
3. تصفح الجداول
4. عدّل البيانات مباشرة
5. Save
```

### ⚠️ تحذيرات

- ❌ لا تستخدمها بينما السيرفر يعمل (قد يحدث تضارب)
- ❌ اعمل نسخة احتياطية أولاً
- ✅ استخدم لوحة التحكم الويب للإنتاج

---

## 3️⃣ Command Line (Terminal)

### الوصول للـ Database

```bash
# الدخول لـ SQLite
sqlite3 maktaba.db

# داخل SQLite Terminal
.tables                    # عرض الجداول
SELECT * FROM users;      # عرض المستخدمين
.mode column              # عرض بتنسيق أفضل
.quit                     # الخروج
```

### أوامر مفيدة

```bash
# عرض جميع المستخدمين
sqlite3 maktaba.db "SELECT username, email, totalScore FROM users;"

# عرض عدد المستخدمين
sqlite3 maktaba.db "SELECT COUNT(*) FROM users;"

# البحث عن مستخدم
sqlite3 maktaba.db "SELECT * FROM users WHERE username = 'ahmed';"

# تصدير إلى CSV
sqlite3 -header -csv maktaba.db "SELECT * FROM users;" > users.csv

# حذف مستخدم
sqlite3 maktaba.db "DELETE FROM users WHERE username = 'spammer';"

# تعديل نقاط المستخدم
sqlite3 maktaba.db "UPDATE users SET totalScore = 5000 WHERE username = 'ahmed';"
```

---

## 4️⃣ Node.js Script (بدون واجهة)

### نسخ احتياطية

```javascript
// backup.js
const sqlite3 = require('sqlite3');
const fs = require('fs');
const path = require('path');

const db = new sqlite3.Database('./maktaba.db');

db.all('SELECT * FROM users', [], (err, users) => {
    if (err) {
        console.error(err);
        return;
    }

    const backup = {
        timestamp: new Date().toISOString(),
        userCount: users.length,
        data: users
    };

    const filename = `backup_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
    
    console.log(`✅ نسخة احتياطية: ${filename}`);
    db.close();
});
```

**تشغيل:**
```bash
node backup.js
```

---

## 5️⃣ الترقية إلى PostgreSQL (الإنتاج الاحترافي)

### لماذا PostgreSQL؟

| الميزة | SQLite | PostgreSQL |
|--------|--------|-----------|
| المستخدمين المتزامنين | محدود | غير محدود |
| الأمان | أساسي | متقدم جداً |
| النسخ الاحتياطية | يدوي | تلقائي |
| الأداء | جيد | ممتاز |
| التوسع | صعب | سهل |

### التثبيت (على Linux/Windows Server)

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# الدخول
sudo -u postgres psql

# إنشاء database
CREATE DATABASE maktaba_db;
CREATE USER maktaba_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE maktaba_db TO maktaba_user;
\q
```

### تعديل السيرفر

```javascript
// استبدل sqlite3 بـ postgresql
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 5432,
});

// استخدم pool.query() بدل db.run()
```

---

## 6️⃣ Cloud Database Backups

### Google Drive Backup

```javascript
// auto-backup.js
const fs = require('fs');
const { google } = require('googleapis');

function backupToGoogleDrive() {
    // 1. استثني الملف
    // 2. أرفعه إلى Google Drive
    // 3. احذف الملف القديم
}

// اشغله كل يوم
const cron = require('node-cron');
cron.schedule('0 2 * * *', backupToGoogleDrive); // 2 AM يومياً
```

### AWS S3 Backup

```bash
npm install aws-sdk
```

```javascript
const AWS = require('aws-sdk');
const fs = require('fs');

const s3 = new AWS.S3();

function uploadBackup() {
    const fileContent = fs.readFileSync('./maktaba.db');
    
    const params = {
        Bucket: 'your-bucket',
        Key: `backups/maktaba_${Date.now()}.db`,
        Body: fileContent
    };

    s3.upload(params, (err, data) => {
        if (err) console.error(err);
        else console.log('✅ تم الرفع');
    });
}
```

---

## 📊 جدول المقارنة

| الطريقة | الصعوبة | الأمان | السرعة | موصى به |
|--------|--------|--------|--------|--------|
| لوحة ويب | سهل | عالي | متوسط | ✅ |
| DB Browser | متوسط | متوسط | سريع | محلي فقط |
| Terminal | صعب | عالي | سريع | محترفين |
| Node Script | متوسط | عالي | متوسط | للبرمجة |
| PostgreSQL | صعب | عالي جداً | سريع | الإنتاج |

---

## 🔄 الخطة الموصى بها

### للتطوير المحلي (Development)
```
استخدم: DB Browser for SQLite + لوحة الويب
```

### للإنتاج الصغير (5-100 مستخدم)
```
استخدم: لوحة ويب فقط + نسخ احتياطية يدوية أسبوعية
```

### للإنتاج الكبير (100+ مستخدم)
```
استخدم: PostgreSQL + Google Drive Backup + Monitoring
```

---

## ⚡ أوامر سريعة

### النسخة الاحتياطية
```bash
# SQLite
sqlite3 maktaba.db ".dump" > backup.sql

# استعادة
sqlite3 maktaba.db < backup.sql
```

### نقل البيانات
```bash
# نسخ الملف الكامل
cp maktaba.db maktaba_backup.db

# ضغط النسخة
tar -czf maktaba_backup.tar.gz maktaba.db
```

### حذف المستخدمين غير النشطين
```bash
sqlite3 maktaba.db "DELETE FROM users WHERE lastLogin IS NULL;"
```

---

## 🎯 الخطة الأسبوعية الموصى بة

```
الأحد: فحص المستخدمين النشطين
الاثنين: نسخة احتياطية يدوية
الثلاثاء: مراجعة سجل الأنشطة
الأربعاء: تصدير البيانات
الخميس: فحص الأداء
الجمعة: تنظيف البيانات القديمة
السبت: ترقية وصيانة
```

---

**اختر الطريقة المناسبة لحجم مشروعك!** 🚀
