# 📊 دليل إدارة قاعدة البيانات والـ Admin Panel

## نظرة عامة

الآن لديك **لوحة تحكم كاملة** لإدارة قاعدة البيانات وأنت أونلاين، مع:

✅ واجهة ويب سهلة الاستخدام  
✅ إدارة المستخدمين (إضافة، حذف، تعديل)  
✅ نسخ احتياطية تلقائية  
✅ سجل شامل للأنشطة (Audit Log)  
✅ إحصائيات مفصلة  
✅ تصدير البيانات (JSON/CSV)  

---

## 🚀 البدء السريع

### 1. الوصول لوحة التحكم

```
https://yourdomain.com/admin
```

**ملاحظة**: يجب أن تكون:
- مسجل دخول (معك token)
- مسؤول (isAdmin = 1)

### 2. تسجيل الدخول الأول

```bash
# في Terminal
node

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./maktaba.db');

// جعل مستخدم معين admin
db.run(
    'UPDATE users SET isAdmin = 1 WHERE username = ?',
    ['your_username'],
    (err) => {
        if (err) console.error(err);
        else console.log('Admin activated!');
        db.close();
    }
);
```

---

## 🎮 الميزات الرئيسية

### 📊 لوحة التحكم (Dashboard)
```
عرض:
- إجمالي المستخدمين
- إجمالي النقاط
- متوسط الألعاب الممارسة
- أفضل اللاعبين (Top 10)
```

### 👥 إدارة المستخدمين

#### عرض المستخدمين
```
- اسم المستخدم
- البريد الإلكتروني
- النقاط الكلية
- عدد الألعاب
- آخر دخول
```

#### تعديل مستخدم
```json
PUT /api/admin/users/:username
{
    "totalScore": 5000,
    "gamesPlayed": 50,
    "badges": ["🌟 المبتدئ", "📚 المكتبي"],
    "isAdmin": 1
}
```

#### حذف مستخدم
```
DELETE /api/admin/users/:username
```

#### إعادة تعيين النقاط
```
POST /api/admin/users/:username/reset-scores
```

---

## 💾 النسخ الاحتياطية

### إنشاء نسخة احتياطية

```bash
# عبر لوحة التحكم
1. اذهب إلى "النسخ الاحتياطية"
2. اضغط "إنشاء نسخة احتياطية"
```

**API Endpoint:**
```
POST /api/admin/backup
Response: {
    "success": true,
    "filename": "maktaba_backup_2026-06-12T14-30-45.db",
    "userCount": 150
}
```

### عرض النسخ الاحتياطية
```
GET /api/admin/backups
```

الملفات تُحفظ في: `./backups/`

---

## 📈 الإحصائيات والتقارير

### إحصائيات عامة
```
GET /api/admin/stats
Response: {
    "success": true,
    "stats": {
        "totalUsers": 150,
        "totalScores": 75000,
        "avgGamesPlayed": 15.5,
        "topPlayers": [...]
    }
}
```

### تصدير البيانات

#### تصدير JSON
```
GET /api/admin/export?format=json
```

#### تصدير CSV
```
GET /api/admin/export?format=csv
```

---

## 📋 سجل الأنشطة (Audit Log)

كل العمليات تُسجل تلقائياً:

```
GET /api/admin/audit-log?limit=100&offset=0
Response: {
    "success": true,
    "logs": [
        {
            "id": 1,
            "username": "admin",
            "action": "USER_DELETED",
            "ipAddress": "192.168.1.1",
            "timestamp": "2026-06-12T14:30:45.000Z",
            "details": "Deleted user: spammer"
        }
    ]
}
```

### أنواع الأنشطة المسجلة

| الإجراء | الوصف |
|--------|-------|
| USER_CREATED | إنشاء مستخدم جديد |
| USER_DELETED | حذف مستخدم |
| USER_UPDATED | تحديث بيانات مستخدم |
| SCORES_RESET | إعادة تعيين النقاط |
| DATA_EXPORTED | تصدير البيانات |
| BACKUP_CREATED | إنشاء نسخة احتياطية |

---

## 🔐 الأمان والصلاحيات

### المتطلبات للوصول

```
✅ JWT Token صحيح
✅ isAdmin = 1
✅ يجب عدم انتهاء صلاحية الـ Token (24 ساعة)
```

### الحماية المدمجة

```
🔒 جميع الطلبات تحتاج Authorization Header
🔒 لا يمكن حذف حسابك بنفسك
🔒 جميع البيانات الحساسة محمية
🔒 تسجيل شامل لكل عملية
🔒 Rate limiting على جميع الـ endpoints
```

---

## 📱 API الكامل للإدارة

### قائمة الـ Endpoints

```javascript
// Dashboard
GET /api/admin/users               // عرض المستخدمين
GET /api/admin/stats               // الإحصائيات
GET /api/admin/audit-log           // سجل الأنشطة

// User Management
PUT /api/admin/users/:username     // تعديل مستخدم
DELETE /api/admin/users/:username  // حذف مستخدم
POST /api/admin/users/:username/reset-scores

// Backup
POST /api/admin/backup             // إنشاء نسخة احتياطية
GET /api/admin/backups             // عرض النسخ

// Export
GET /api/admin/export?format=json  // تصدير JSON
GET /api/admin/export?format=csv   // تصدير CSV
```

---

## 🛠️ أمثلة استخدام JavaScript

### الحصول على قائمة المستخدمين

```javascript
const token = localStorage.getItem('authToken');

const response = await fetch('/api/admin/users', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

const data = await response.json();
console.log(data.users);
```

### حذف مستخدم

```javascript
const username = 'spammer';
const token = localStorage.getItem('authToken');

const response = await fetch(`/api/admin/users/${username}`, {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

const data = await response.json();
if (data.success) {
    console.log('تم حذف المستخدم');
}
```

### إنشاء نسخة احتياطية

```javascript
const token = localStorage.getItem('authToken');

const response = await fetch('/api/admin/backup', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

const data = await response.json();
if (data.success) {
    console.log(`نسخة احتياطية: ${data.filename}`);
}
```

### تصدير البيانات

```javascript
// JSON Export
const jsonResponse = await fetch('/api/admin/export?format=json', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    }
});
const jsonData = await jsonResponse.json();

// CSV Export
const csvResponse = await fetch('/api/admin/export?format=csv', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    }
});
const csv = await csvResponse.text();
```

---

## ⚠️ نصائح أمانية

### يجب تفعيلها

- ✅ غيّر `JWT_SECRET` في `.env`
- ✅ استخدم HTTPS في الإنتاج
- ✅ حافظ على `admin-dashboard.html` محمية
- ✅ راجع سجل الأنشطة بانتظام
- ✅ أنشئ نسخ احتياطية منتظمة

### لا تفعل

- ❌ لا تشارك التوكن مع أحد
- ❌ لا تنسى تحديث `ALLOWED_ORIGINS`
- ❌ لا تترك `.env` مكشوفة
- ❌ لا تستخدم نفس `JWT_SECRET` لتطبيقات مختلفة

---

## 🔧 استكشاف الأخطاء

### "Admin access required"
- تأكد أن حسابك isAdmin = 1
- استخدم أمر التفعيل أعلاه

### "Invalid or expired token"
- سجل الدخول مرة أخرى
- تأكد أن التوكن صحيح

### لا تظهر البيانات
- تحقق من الاتصال بالإنترنت
- أعد تحميل الصفحة
- افتح Developer Console (F12) للأخطاء

### مشكلة في إنشاء النسخة الاحتياطية
- تأكد أن مجلد `backups` موجود
- تحقق من صلاحيات الملف
- تأكد من مساحة التخزين الكافية

---

## 📚 قاعدة البيانات الهيكلية

### جدول Users
```sql
CREATE TABLE users (
    username TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,          -- محشوة بـ bcrypt
    joinedAt TEXT NOT NULL,
    totalScore INTEGER DEFAULT 0,
    gamesPlayed INTEGER DEFAULT 0,
    badges TEXT DEFAULT '[]',        -- JSON array
    gameScores TEXT DEFAULT '{}',    -- JSON object
    lastLogin TEXT,
    isAdmin INTEGER DEFAULT 0        -- 0 = عادي، 1 = admin
);
```

### جدول Audit Log
```sql
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    action TEXT,
    ipAddress TEXT,
    timestamp TEXT,
    details TEXT
);
```

---

## 🎯 خطة الصيانة الموصى بها

### يومياً
- مراجعة سجل الأنشطة (مشبوه؟)
- التحقق من عدد المستخدمين

### أسبوعياً
- إنشاء نسخة احتياطية
- مراجعة أفضل اللاعبين

### شهرياً
- تصدير البيانات
- تحديث النسخ الاحتياطية القديمة

---

## 📞 الدعم والمساعدة

للمزيد من التفاصيل، انظر:
- `SECURITY.md` - معلومات الأمان
- `FRONTEND_MIGRATION.md` - تحديث الفرونت إند
- `server.js` - كود السيرفر

---

**آخر تحديث**: 2026-06-12
