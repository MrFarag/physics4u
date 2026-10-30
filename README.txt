تشغيل المنصة محلياً
-------------------
1) افتح الطرفية داخل هذا المجلد وشغّل:   python -m http.server 8000
2) افتح المتصفح على:                       http://localhost:8000
   (لا تفتح index.html بالنقر المزدوج؛ ملفات type="module" لا تعمل من file://)

إعداد Firebase (مرة واحدة)
--------------------------
- Authentication  ← Sign-in method ← فعّل Email/Password، وأنشئ حساب المدرس بنفس الإيميل الموجود في TEACHER_EMAIL داخل app.js.
- Realtime Database ← Rules ← الصق محتوى database.rules.json ثم Publish.
- Storage ← Rules ← الصق محتوى storage.rules ثم Publish.
- بعد النشر على استضافة: أضف النطاق في Authentication ← Settings ← Authorized domains (localhost مضاف تلقائياً).

رفع الملفات على Cloudinary (مجاني، للتجربة)
------------------------------------------
1) أنشئ حساباً مجانياً على cloudinary.com، وانسخ Cloud name من صفحة Dashboard.
2) Settings ← Upload ← Upload presets ← Add upload preset:
      Signing mode = Unsigned   ، ثم احفظ وانسخ اسم الـ preset.
3) Settings ← Security ← فعّل "PDF and ZIP files delivery" (مطفأ افتراضياً، وبدونه لا تُعرض ملفات PDF).
4) افتح uploader.js وضع القيمتين:  cloudName  و  uploadPreset.
5) الحد الأقصى للملف في الباقة المجانية 10MB. حذف الملف من المنصة يحذف السجل فقط، ويُحذف الملف نفسه من لوحة Cloudinary يدوياً.

الانتقال لاحقاً إلى Firebase Storage (بعد ترقية Blaze)
------------------------------------------------------
غيّر في uploader.js السطر:  UPLOAD_PROVIDER = "firebase"  وانشر storage.rules. لا تغيير آخر؛ الملفات القديمة تبقى تعمل.
