/* =========================================================
   firebase.js — إعداد Firebase المشترك لـ Physics4U
   ========================================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

// تم وضع بيانات مشروعك الحقيقية هنا
const firebaseConfig = {
  apiKey: "AIzaSyBpSv5VGXdWA9-T9quhTjETEZmi_JZFnJg",
  authDomain: "physics4u-8366e.firebaseapp.com",
  databaseURL: "https://physics4u-8366e-default-rtdb.firebaseio.com",
  projectId: "physics4u-8366e",
  storageBucket: "physics4u-8366e.firebasestorage.app",
  messagingSenderId: "375531819839",
  appId: "1:375531819839:web:dffea84860e1e62cfbb98a"
};

// تهيئة التطبيق
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
// لا نترك الرفع يعيد المحاولة 10 دقائق بصمت؛ نفشل بسرعة ونظهر السبب
storage.maxUploadRetryTime = 20000;
storage.maxOperationRetryTime = 20000;

/* ترجمة أخطاء Firebase إلى العربية لسهولة فهم الطالب للمشكلة */
export function getArabicError(error) {
  const code = error?.code || "";
  const messages = {
    "auth/email-already-in-use": "هذا البريد الإلكتروني مسجل بالفعل.",
    "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
    "auth/weak-password": "كلمة المرور ضعيفة؛ استخدم 6 أحرف على الأقل.",
    "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "auth/user-not-found": "لم يتم العثور على هذا الحساب.",
    "auth/wrong-password": "كلمة المرور غير صحيحة.",
    "auth/too-many-requests": "محاولات كثيرة جداً. يرجى المحاولة لاحقاً.",
    "auth/network-request-failed": "تعذر الاتصال بالإنترنت أو بخدمات Firebase.",
    "storage/unauthorized": "لا تملك صلاحية الرفع. تأكد من إعدادات الـ Rules في Storage.",
    "storage/quota-exceeded": "مساحة التخزين المجانية ممتلئة.",
    "app/storage-unreachable": "تعذّر الاتصال بحاوية التخزين (Storage). غالباً لم يتم تفعيل Storage في مشروع Firebase، أو يتطلب المشروع خطة Blaze، أو اسم الحاوية storageBucket في firebase.js لا يطابق المعروض في لوحة Storage.",
    "app/cloudinary-not-configured": "لم تُضبط بيانات Cloudinary بعد. افتح uploader.js وضع cloudName و uploadPreset.",
    "app/network": "تعذّر الاتصال. تحقق من الإنترنت ثم أعد المحاولة.",
    "storage/canceled": "تم إلغاء الرفع.",
    "storage/retry-limit-exceeded": "انقطع الاتصال أثناء الرفع. حاول مرة أخرى.",
    "storage/object-not-found": "الملف غير موجود في التخزين.",
    "storage/bucket-not-found": "حاوية التخزين غير موجودة. فعّل Storage من لوحة Firebase.",
    "auth/operation-not-allowed": "تسجيل الدخول بالبريد غير مفعّل. فعّله من Firebase → Authentication.",
    "auth/unauthorized-domain": "هذا النطاق غير مصرّح به. أضفه في Firebase → Authentication → Settings → Authorized domains.",
  };
  if (/permission[_ ]denied/i.test(error?.message || "")) return "لا تملك صلاحية لهذه العملية. تأكد من نشر قواعد Firebase (Rules).";
  if (code === "app/cloudinary-error") return "رفض Cloudinary الملف: " + (error?.message || "") + " — راجع README (إعداد Cloudinary).";
  return messages[code] || ((error?.message || "حدث خطأ غير معروف.") + (code ? ` (${code})` : ""));
}