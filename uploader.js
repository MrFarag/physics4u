/* =========================================================
   uploader.js — مكان تخزين الملفات (غيّر السطر التالي فقط للانتقال)
   "cloudinary" : مجاني بدون بطاقة (للتجربة)
   "firebase"   : Firebase Storage (يتطلب خطة Blaze)
   ========================================================= */
import { storage } from "./firebase.js";
import { ref as sRef, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

export const UPLOAD_PROVIDER = "cloudinary";

// بيانات Cloudinary: من لوحة التحكم ← Dashboard (Cloud name) و Settings ← Upload ← Upload presets (Unsigned)
const CLOUDINARY = {
  cloudName: "ljixm4zj",
  uploadPreset: "physics4u_unsigned",
  folder: "physics4u"
};

// الحد الأقصى لحجم الملف بالميغابايت (الباقة المجانية في Cloudinary: 10MB للـ PDF والصور)
export const MAX_UPLOAD_MB = UPLOAD_PROVIDER === "cloudinary" ? 10 : 100;

function appError(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}

/* ---------- Cloudinary ---------- */
function uploadCloudinary(file, onProgress) {
  if (!CLOUDINARY.cloudName || CLOUDINARY.cloudName.startsWith("PUT_") || CLOUDINARY.uploadPreset.startsWith("PUT_")) {
    return Promise.reject(appError("app/cloudinary-not-configured"));
  }
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", CLOUDINARY.uploadPreset);
    if (CLOUDINARY.folder) form.append("folder", CLOUDINARY.folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`);
    xhr.timeout = 10 * 60 * 1000;
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onerror = () => reject(appError("app/network", "تعذّر الاتصال بـ Cloudinary. تحقق من الإنترنت."));
    xhr.ontimeout = () => reject(appError("app/network", "انتهت مهلة الرفع."));
    xhr.onload = () => {
      let body = {};
      try { body = JSON.parse(xhr.responseText); } catch (_) {}
      if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
        resolve({ url: body.secure_url, provider: "cloudinary", publicId: body.public_id, resourceType: body.resource_type });
      } else {
        reject(appError("app/cloudinary-error", body?.error?.message || `فشل الرفع (${xhr.status})`));
      }
    };
    xhr.send(form);
  });
}

/* ---------- Firebase Storage ---------- */
function uploadFirebase(file, contentType, onProgress) {
  const safeName = file.name.replace(/[^\w.\-؀-ۿ]+/g, "_");
  const storagePath = `materials/${Date.now()}_${safeName}`;
  const fileRef = sRef(storage, storagePath);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file, { contentType });
    let started = false;
    const watchdog = setTimeout(() => {
      if (started) return;
      task.cancel();
      reject(appError("app/storage-unreachable"));
    }, 20000);
    task.on("state_changed",
      (snap) => {
        if (snap.bytesTransferred > 0) { started = true; clearTimeout(watchdog); }
        onProgress(snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0);
      },
      (err) => { clearTimeout(watchdog); reject(err); },
      async () => {
        clearTimeout(watchdog);
        try { resolve({ url: await getDownloadURL(task.snapshot.ref), provider: "firebase", storagePath }); }
        catch (e) { reject(e); }
      }
    );
  });
}

/* ---------- الواجهة المستخدمة من app.js ---------- */
export function uploadFile(file, contentType, onProgress = () => {}) {
  return UPLOAD_PROVIDER === "firebase" ? uploadFirebase(file, contentType, onProgress) : uploadCloudinary(file, onProgress);
}

// حذف الملف المرفوع من مكانه (Cloudinary المجاني لا يسمح بالحذف من المتصفح؛ يُحذف من لوحته يدوياً)
export async function removeUploaded(rec) {
  if (rec?.provider === "firebase" || (!rec?.provider && rec?.storagePath)) {
    try { await deleteObject(sRef(storage, rec.storagePath)); }
    catch (e) { if (e?.code !== "storage/object-not-found") throw e; }
  }
}
