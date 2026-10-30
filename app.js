import { auth, database, getArabicError } from "./firebase.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { ref, set, get, push, remove, update } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";
import { uploadFile, removeUploaded, MAX_UPLOAD_MB } from "./uploader.js";

const $ = (id) => document.getElementById(id);

const TEACHER_EMAIL = "mrfaragphysics@gmail.com";
const CATEGORY_LABEL = { lesson: "درس", review: "مراجعة", homework: "واجب" };
const ROLE_STORAGE_KEY = "p4u_role";
const LAST_EMAIL_KEY = "p4u_last_email";

const state = {
  files: [],
  filter: "all",
  search: "",
  registering: false,
  selectedFile: null,
  role: "student",
  roleConfirmed: false
};

/* ---------- أدوات ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function setMsg(text, kind = "") {
  const el = $("statusMessage");
  if (!el) return;
  el.textContent = text || "";
  el.className = "status-message" + (kind ? " " + kind : "");
}

function setUploadMsg(text, kind = "") {
  const el = $("uploadMsg");
  if (!el) return;
  el.textContent = text || "";
  el.className = "status-message" + (kind ? " " + kind : "");
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function guessType(name = "") {
  const n = String(name).split("?")[0].toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (/\.(jpe?g)$/.test(n)) return "image/jpeg";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  if (/\.(mp4|m4v)$/.test(n)) return "video/mp4";
  if (n.endsWith(".webm")) return "video/webm";
  return "application/octet-stream";
}

function fileIcon(f) {
  const t = f.contentType || guessType(f.fileName || f.url);
  if (t === "application/pdf") return "📕";
  if (t.startsWith("image/")) return "🖼️";
  if (t.startsWith("video/")) return "🎬";
  return "📄";
}

/* ---------- [1] الحالة والتوجيه ---------- */
async function isTeacher(user) {
  if (user.email && user.email.toLowerCase() === TEACHER_EMAIL) return true;
  try {
    const snap = await get(ref(database, `admins/${user.uid}`));
    return snap.val() === true;
  } catch (_) { return false; }
}

onAuthStateChanged(auth, async (user) => {
  if (state.registering) return;

  if (user && !state.roleConfirmed) {
    showView("login");
    loadFreeMaterials();
    setMsg("اختر نوع الحساب ثم سجّل الدخول.", "");
    return;
  }

  try {
    if (!user) {
      showView("login");
      loadFreeMaterials();
      return;
    }
    if (await isTeacher(user)) {
      showView("teacher");
      initTeacher(user);
      return;
    }
    const studentSnap = await get(ref(database, `students/${user.uid}`));
    if (studentSnap.exists()) {
      showView("student");
      initStudent(studentSnap.val());
      return;
    }
    try {
      const reqSnap = await get(ref(database, `joinRequests/${user.uid}`));
      if (!reqSnap.exists()) {
        await set(ref(database, `joinRequests/${user.uid}`), {
          name: user.displayName || user.email, email: user.email, status: "pending", createdAt: Date.now()
        });
      }
    } catch (e) { console.warn("joinRequest check failed", e); }
    await signOut(auth);
    state.roleConfirmed = false;
    showView("login");
    setMsg("حسابك بانتظار موافقة المعلم.", "error");
  } catch (e) {
    console.error(e);
    try { await signOut(auth); } catch (_) {}
    state.roleConfirmed = false;
    showView("login");
    setMsg(getArabicError(e), "error");
  }
});

function showView(view) {
  document.body.dataset.view = view;
  $("authSection").hidden = view !== "login";
  $("guestSection").hidden = view !== "login";
  $("teacherDashboard").hidden = view !== "teacher";
  $("studentDashboard").hidden = view !== "student";

  const topLogout = $("topLogout");
  topLogout.hidden = view === "login";
  topLogout.textContent = "تسجيل الخروج";

  $("topStatus").textContent = view === "teacher" ? "وضع المدرس"
    : view === "student" ? "وضع الطالب"
    : "مرحباً بك في المنصة";
}

/* ---------- [2] الدروس المجانية ---------- */
async function loadFreeMaterials() {
  const list = $("freeFilesList");
  if (!list) return;
  try {
    const snap = await get(ref(database, "freeFiles"));
    list.innerHTML = "";
    const items = [];
    snap.forEach((child) => { items.push({ id: child.key, ...child.val() }); });
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    items.forEach((f) => renderFileCard(f, list));
    if (!items.length) list.innerHTML = '<p class="empty-text">لا توجد دروس مجانية حالياً.</p>';
  } catch (e) {
    console.error("Error loading free files:", e);
    list.innerHTML = '<p class="empty-text">تعذّر تحميل الدروس المجانية.</p>';
  }
}

function renderFileCard(f, container) {
  const card = document.createElement("div");
  card.className = "file-card";
  card.innerHTML = `
    <div class="card-top">
      <span class="item-icon">${fileIcon(f)}</span>
      <span class="badge">${esc(CATEGORY_LABEL[f.category] || f.category || "ملف")}</span>
    </div>
    <div class="item-title">${esc(f.title)}</div>
    <div class="item-sub">${esc(f.path)}</div>
    <button type="button" class="btn btn-primary btn-small" style="margin-top:10px; width:100%">فتح الملف</button>
  `;
  card.onclick = () => openPreview(f);
  container.appendChild(card);
}

/* ---------- [3] لوحة المدرس ---------- */
function initTeacher(user) {
  $("teacherWelcome").textContent = `مرحباً بك يا أستاذ ${user.displayName || user.email}`;

  document.querySelectorAll("#teacherNav .dash-tab").forEach((tab) => {
    tab.onclick = () => {
      document.querySelectorAll("#teacherNav .dash-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      ["students", "files", "live"].forEach((p) => { $(`panel-${p}`).hidden = p !== tab.dataset.panel; });
    };
  });

  loadStudents();
  loadTeacherFiles();
}

function makeItem(icon, title, sub) {
  const item = document.createElement("div");
  item.className = "item";
  item.innerHTML = `<span class="item-icon">${icon}</span><div class="item-main"><div class="item-title">${esc(title)}</div>${sub ? `<div class="item-sub">${esc(sub)}</div>` : ""}</div><div class="item-actions"></div>`;
  return item;
}

function addAction(item, label, cls, handler) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `btn ${cls} btn-small`;
  b.textContent = label;
  b.onclick = async () => {
    b.disabled = true;
    try { await handler(); } catch (e) { console.error(e); alert(getArabicError(e)); }
    b.disabled = false;
  };
  item.querySelector(".item-actions").appendChild(b);
}

async function loadStudents() {
  const pendingList = $("pendingList");
  const approvedList = $("approvedList");
  try {
    const [reqSnap, stuSnap] = await Promise.all([get(ref(database, "joinRequests")), get(ref(database, "students"))]);
    pendingList.innerHTML = "";
    approvedList.innerHTML = "";
    let pCount = 0, sCount = 0;

    reqSnap.forEach((child) => {
      const r = child.val();
      if (r.status !== "pending") return;
      pCount++;
      const item = makeItem("🧑‍🎓", r.name, r.email);
      addAction(item, "موافقة", "btn-ok", async () => {
        await set(ref(database, `students/${child.key}`), { name: r.name, email: r.email || "", status: "approved", approvedAt: Date.now() });
        await remove(ref(database, `joinRequests/${child.key}`));
        loadStudents();
      });
      addAction(item, "رفض", "btn-danger", async () => {
        await remove(ref(database, `joinRequests/${child.key}`));
        loadStudents();
      });
      pendingList.appendChild(item);
    });

    stuSnap.forEach((child) => {
      const s = child.val();
      sCount++;
      const item = makeItem("✅", s.name, s.email);
      addAction(item, "إزالة", "btn-danger", async () => {
        if (!confirm("هل أنت متأكد من إزالة الطالب؟")) return;
        await remove(ref(database, `students/${child.key}`));
        loadStudents();
      });
      approvedList.appendChild(item);
    });

    if (!pCount) pendingList.innerHTML = '<p class="empty-text">لا توجد طلبات حالياً.</p>';
    if (!sCount) approvedList.innerHTML = '<p class="empty-text">لا يوجد طلاب معتمدون بعد.</p>';
    $("statPending").textContent = pCount;
    $("statStudents").textContent = sCount;
  } catch (e) {
    console.error(e);
    pendingList.innerHTML = `<p class="empty-text">${esc(getArabicError(e))}</p>`;
  }
}

async function loadTeacherFiles() {
  const list = $("teacherFilesList");
  if (!list) return;
  try {
    const snap = await get(ref(database, "files"));
    list.innerHTML = "";
    const items = [];
    snap.forEach((child) => { items.push({ id: child.key, ...child.val() }); });
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    items.forEach((f) => {
      const sub = [CATEGORY_LABEL[f.category] || "", f.path, formatSize(f.size), f.isFree ? "مجاني" : ""].filter(Boolean).join(" · ");
      const item = makeItem(fileIcon(f), f.title, sub);
      addAction(item, "فتح", "btn-ghost", async () => openPreview(f));
      addAction(item, f.isFree ? "إلغاء المجانية" : "جعله مجانياً", "btn-ghost", async () => {
        await setFree(f, !f.isFree);
        loadTeacherFiles();
      });
      addAction(item, "حذف", "btn-danger", async () => {
        if (!confirm("حذف الملف نهائياً من المنصة؟")) return;
        await deleteFileRecord(f);
        loadTeacherFiles();
      });
      list.appendChild(item);
    });
    if (!items.length) list.innerHTML = '<p class="empty-text">لم يُرفع أي ملف بعد.</p>';
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="empty-text">${esc(getArabicError(e))}</p>`;
  }
}

function fileRecord(f) {
  const { id, ...rec } = f;
  return rec;
}

async function setFree(f, free) {
  await update(ref(database, `files/${f.id}`), { isFree: free });
  if (free) await set(ref(database, `freeFiles/${f.id}`), { ...fileRecord(f), isFree: true });
  else await remove(ref(database, `freeFiles/${f.id}`));
}

async function deleteFileRecord(f) {
  await removeUploaded(f);
  await remove(ref(database, `files/${f.id}`));
  await remove(ref(database, `freeFiles/${f.id}`));
}

/* ---------- [4] رفع الملفات ---------- */
function pickFile(file) {
  state.selectedFile = file || null;
  $("dropText").textContent = file ? `${file.name} (${formatSize(file.size)})` : "اضغط لاختيار ملف أو اسحبه هنا";
  $("dropZone").classList.toggle("has-file", !!file);
  if (file && !$("uploadTitle").value.trim()) $("uploadTitle").value = file.name.replace(/\.[^.]+$/, "");
  setUploadMsg("");
}

function initUploadForm() {
  $("maxSize").textContent = MAX_UPLOAD_MB;
  const input = $("uploadInput");
  const zone = $("dropZone");

  input.onchange = () => pickFile(input.files[0]);
  ["dragenter", "dragover"].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.remove("drag"); }));
  zone.addEventListener("drop", (e) => {
    const f = e.dataTransfer?.files?.[0];
    if (f) { try { input.files = e.dataTransfer.files; } catch (_) {} pickFile(f); }
  });

  $("uploadForm").onsubmit = async (e) => {
    e.preventDefault();
    const file = state.selectedFile;
    if (!file) { setUploadMsg("اختر ملفاً أولاً.", "error"); return; }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) { setUploadMsg(`حجم الملف أكبر من ${MAX_UPLOAD_MB}MB.`, "error"); return; }

    const title = $("uploadTitle").value.trim();
    const path = $("uploadPath").value.trim();
    const category = $("uploadCategory").value;
    const isFree = $("uploadFree").checked;
    const contentType = file.type || guessType(file.name);

    const btn = $("uploadBtn");
    btn.disabled = true;
    $("uploadProgress").hidden = false;
    $("uploadBar").style.width = "0%";
    let uploaded = null;

    try {
      uploaded = await uploadFile(file, contentType, (pct) => {
        $("uploadBar").style.width = pct + "%";
        setUploadMsg(pct >= 100 ? "جاري الحفظ..." : `جاري الرفع... ${pct}%`);
      });
      const rec = { title, path, category, isFree, fileName: file.name, contentType, size: file.size, createdAt: Date.now(), ...uploaded };
      const newRef = push(ref(database, "files"));
      await set(newRef, rec);
      if (isFree) await set(ref(database, `freeFiles/${newRef.key}`), rec);

      $("uploadForm").reset();
      pickFile(null);
      setUploadMsg("✅ تم الرفع بنجاح.", "ok");
      loadTeacherFiles();
    } catch (err) {
      console.error(err);
      if (uploaded) { try { await removeUploaded(uploaded); } catch (_) {} }
      setUploadMsg(getArabicError(err), "error");
    } finally {
      btn.disabled = false;
      setTimeout(() => { $("uploadProgress").hidden = true; }, 1200);
    }
  };
}
initUploadForm();

/* ---------- [5] مساحة الطالب ---------- */
/* ---------- [5] مساحة الطالب ---------- */
async function initStudent(data) {
  $("studentWelcome").textContent = `مرحباً بك يا ${data.name} 👋`;
  
  // 🆕 إضافة زر الغرفة التفاعلية للطالب
  const welcomeDiv = $("studentWelcome");
  const roomBtnHtml = `
    <div style="margin-top: 15px;">
      <button class="btn btn-primary" onclick="window.location.href='room/teacher.html?name=${encodeURIComponent(data.name)}&uid=${auth.currentUser.uid}'">🎥 دخول الغرفة التفاعلية (البث المباشر)</button>
    </div>
  `;
  if (!document.getElementById('studentRoomBtn')) {
    welcomeDiv.insertAdjacentHTML('afterend', `<div id="studentRoomBtn">${roomBtnHtml}</div>`);
  }

  document.querySelectorAll("#studentFilters .filter").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll("#studentFilters .filter").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.filter = btn.dataset.cat;
      renderStudentFiles();
    };
  });
  $("studentSearch").oninput = (e) => {
    state.search = e.target.value.trim().toLowerCase();
    renderStudentFiles();
  };

  const list = $("studentFilesList");
  try {
    const snap = await get(ref(database, "files"));
    state.files = [];
    snap.forEach((child) => { state.files.push({ id: child.key, ...child.val() }); });
    state.files.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    renderStudentFiles();
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="empty-text">${esc(getArabicError(e))}</p>`;
  }
}

function renderStudentFiles() {
  const list = $("studentFilesList");
  list.innerHTML = "";
  const shown = state.files.filter((f) => {
    const okCat = state.filter === "all" || f.category === state.filter;
    const okSearch = !state.search || (f.title || "").toLowerCase().includes(state.search) || (f.path || "").toLowerCase().includes(state.search);
    return okCat && okSearch;
  });
  shown.forEach((f) => renderFileCard(f, list));
  if (!shown.length) list.innerHTML = '<p class="empty-text">لا توجد ملفات مطابقة.</p>';
}

/* ---------- [6] تسجيل الدخول والخروج ---------- */
function switchAuth(which) {
  const login = which === "login";
  $("loginTab").classList.toggle("active", login);
  $("registerTab").classList.toggle("active", !login);
  $("loginForm").hidden = !login;
  $("registerForm").hidden = login;
  setMsg("");
}
$("loginTab").onclick = () => switchAuth("login");
$("registerTab").onclick = () => switchAuth("register");

/* ---------- [7] اختيار نوع الحساب ---------- */
function applyRole(role) {
  state.role = role;
  state.roleConfirmed = false;
  try { localStorage.setItem(ROLE_STORAGE_KEY, role); } catch (_) {}

  document.querySelectorAll("#rolePicker .role-pill").forEach((b) => {
    const on = b.dataset.role === role;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });

  $("registerTab").hidden = role !== "student";
  if (role !== "student" && !$("registerForm").hidden) switchAuth("login");

  try {
    const savedEmail = localStorage.getItem(LAST_EMAIL_KEY);
    if (savedEmail && $("loginEmail") && !$("loginEmail").value) {
      $("loginEmail").value = savedEmail;
    }
  } catch (_) {}

  setMsg("");
}

document.querySelectorAll("#rolePicker .role-pill").forEach((btn) => {
  btn.onclick = () => applyRole(btn.dataset.role);
});

(function restoreRole() {
  let saved = "student";
  try { saved = localStorage.getItem(ROLE_STORAGE_KEY) || "student"; } catch (_) {}
  if (!["student", "teacher", "admin"].includes(saved)) saved = "student";
  applyRole(saved);
})();

(function restoreEmail() {
  try {
    const saved = localStorage.getItem(LAST_EMAIL_KEY);
    if (saved && $("loginEmail") && !$("loginEmail").value) {
      $("loginEmail").value = saved;
    }
  } catch (_) {}
})();

/* ---------- [8] تسجيل الدخول ---------- */
$("loginForm").onsubmit = async (e) => {
  e.preventDefault();
  setMsg("جاري تسجيل الدخول...");
  try {
    if (auth.currentUser) {
      try { await signOut(auth); } catch (_) {}
    }

    const email = $("loginEmail").value.trim();
    const cred = await signInWithEmailAndPassword(auth, email, $("loginPassword").value);
    const user = cred.user;

    const teacher = await isTeacher(user);
    const studentSnap = await get(ref(database, `students/${user.uid}`));

    if (state.role === "teacher" || state.role === "admin") {
      if (!teacher) {
        await signOut(auth);
        state.roleConfirmed = false;
        setMsg("هذا الحساب ليس حساب مدرس/أدمن.", "error");
        return;
      }
    } else if (state.role === "student") {
      if (teacher) {
        await signOut(auth);
        state.roleConfirmed = false;
        setMsg("هذا حساب مدرس — اختر «مدرس» من نوع الحساب.", "error");
        return;
      }
      if (!studentSnap.exists()) {
        await signOut(auth);
        state.roleConfirmed = false;
        setMsg("حسابك بانتظار موافقة المعلم.", "error");
        return;
      }
    }

    try { localStorage.setItem(LAST_EMAIL_KEY, email); } catch (_) {}
    state.roleConfirmed = true;
    setMsg("");
  } catch (err) {
    setMsg(getArabicError(err), "error");
  }
};

/* ---------- [9] التسجيل ---------- */
$("registerForm").onsubmit = async (e) => {
  e.preventDefault();
  const name = $("registerName").value.trim();
  const email = $("registerEmail").value.trim();
  
  state.registering = true;
  setMsg("جاري إنشاء الحساب...");
  
  try {
    const res = await createUserWithEmailAndPassword(auth, email, $("registerPassword").value);
    await updateProfile(res.user, { displayName: name });
    
    await set(ref(database, `joinRequests/${res.user.uid}`), { 
      name, 
      email, 
      status: "pending", 
      createdAt: Date.now() 
    });
    
    await signOut(auth);
    
    state.roleConfirmed = false;
    state.registering = false;
    
    $("registerForm").reset();
    switchAuth("login");
    setMsg("تم إرسال طلبك، انتظر موافقة المعلم.", "ok");
  } catch (err) {
    state.registering = false;
    setMsg(getArabicError(err), "error");
    try { 
      if (auth.currentUser) await signOut(auth); 
    } catch (_) {}
  }
};

/* ---------- [10] أزرار المساعدة ---------- */
$("guestSignupBtn").onclick = () => {
  $("authSection").scrollIntoView({ behavior: "smooth" });
  applyRole("student");
};

$("topLogout").onclick = async () => {
  state.roleConfirmed = false;
  await signOut(auth);
};

/* ---------- [11] المعاينة ---------- */
function openPreview(f) {
  $("previewTitle").textContent = f.title || "معاينة";
  const content = $("previewContent");
  const openLink = $("previewOpen");
  content.innerHTML = "";

  const safeUrl = /^https:\/\//.test(f.url || "") ? f.url : "";
  const type = f.contentType || guessType(f.fileName || decodeURIComponent((f.url || "").split("?")[0]));
  openLink.href = safeUrl || "#";
  openLink.hidden = !safeUrl;

  if (safeUrl && type === "application/pdf") {
    const fr = document.createElement("iframe");
    fr.src = safeUrl;
    fr.title = f.title || "";
    content.appendChild(fr);
  } else if (safeUrl && type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = safeUrl;
    img.alt = f.title || "";
    content.appendChild(img);
  } else if (safeUrl && type.startsWith("video/")) {
    const v = document.createElement("video");
    v.src = safeUrl;
    v.controls = true;
    content.appendChild(v);
  } else {
    content.innerHTML = `<div class="preview-fallback"><p>لا تتوفر معاينة سريعة لهذا الملف</p>${safeUrl ? `<a href="${esc(safeUrl)}" target="_blank" rel="noopener" class="btn btn-primary">تحميل الملف للمشاهدة</a>` : ""}</div>`;
  }
  $("previewModal").hidden = false;
}

function closePreview() {
  $("previewModal").hidden = true;
  $("previewContent").innerHTML = "";
}
$("previewClose").onclick = closePreview;
$("previewModal").addEventListener("click", (e) => { if (e.target === $("previewModal")) closePreview(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("previewModal").hidden) closePreview(); });
