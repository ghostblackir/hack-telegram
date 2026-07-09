// ======== حالت‌ها ========
const Steps = Object.freeze({
  INPUT: 1, LOGS: 2, VERIFY: 3, COUNTDOWN: 4, CODE: 5, HINTS: 6
});

let currentStep = Steps.INPUT;
let soundEnabled = true;
let buttonLocked = false;
let busyTimeout1 = null;
let busyTimeout2 = null;
let fakeBusyShown = false;

let countriesData = []; 
let selectedCountry = null; 

// آرایه پویا و ماژولار اطلاعات زبان‌ها
const languages = [
  { code: "fa", flagCode: "ir", name: "فارسی" },
  { code: "en", flagCode: "gb", name: "English" },
  { code: "ar", flagCode: "sa", name: "العربية" },
  { code: "ru", flagCode: "ru", name: "Русский" },
  { code: "uk", flagCode: "ua", name: "українська" },
  { code: "fr", flagCode: "fr", name: "Français" },
  { code: "tr", flagCode: "tr", name: "Türkçe" },
  { code: "es", flagCode: "es", name: "Español" },
  { code: "de", flagCode: "de", name: "Deutsch" },
  { code: "zh-CN", flagCode: "cn", name: "中文 (Chinese)" }
];

const countryToLangMap = {
  "IR": "fa", 
  "RU": "ru", 
  "ua": "uk",
  "SA": "ar", 
  "AE": "ar", 
  "IQ": "ar", 
  "QA": "ar", 
  "OM": "ar", 
  "US": "en", 
  "GB": "en", 
  "CA": "en", 
  "AU": "en",  
  "de": "de",
  "cn": "zh-CN"
};

document.addEventListener("DOMContentLoaded", () => {
  const trigger = document.getElementById("countryTrigger");
  const modal = document.getElementById("countryModal");
  const closeModalBtn = document.getElementById("closeCountryModal");
  const searchInput = document.getElementById("countrySearch");
  const modalList = document.getElementById("countryModalList");
  
  const phoneInput = document.getElementById("phone");
  const currentFlag = document.getElementById("currentFlag");
  const currentCode = document.getElementById("currentCode");

  // المان‌های مربوط به مدال زبان جدید
  const btnLanguage = document.getElementById("btnLanguage");
  const languageModal = document.getElementById("languageModal");
  const closeLanguageModalBtn = document.getElementById("closeLanguageModal");
  const languageSearchInput = document.getElementById("languageSearch");
  const languageModalList = document.getElementById("languageModalList");

  // ⚡️ تست هوشمند فیلترشکن و رفع تحریم فایربیس
  function checkFirebaseConnection() {
    // تست پینگ روی دامنه اختصاصی API فایربیس شما
    fetch("https://firestore.googleapis.com/v1/projects/ghost-3151c", { mode: 'no-cors' })
      .then(() => {
        console.log("✅ اتصال به سرور فایربیس پایدار است (فیلترشکن فعال).");
      })
      .catch((err) => {
        console.warn("❌ سرور فایربیس در دسترس نیست. احتمالاً فیلترشکن خاموش است.");
        const vpnModal = document.getElementById("vpnWarningBox");
        if (vpnModal) {
          vpnModal.style.display = "flex";
        }
      });
  }

  // اجرای تست ۲ ثانیه بعد از باز شدن صفحه تا لودینگ اولیه سایت خراب نشه
  setTimeout(checkFirebaseConnection, 2000);

  // ۱. لود دیتای کامل کشورها از فایل JSON شما
  fetch("countries.json")
    .then(response => response.json())
    .then(data => {
      countriesData = data;
      // پیش‌فرض قرار دادن ایران
      selectedCountry = countriesData[0];
      renderModalList(countriesData);
    })
    .catch(err => console.error("خطا در بارگذاری فایل کشورها:", err));

  // ۲. تابع رندر کردن لیست کشورها در پنل مدال
  function renderModalList(list) {
    modalList.innerHTML = "";
    list.forEach(country => {
      // کانادا در لیست اصلی نمایش داده نمی‌شود (به صورت هوشمند با پیش‌شماره +1 سوییچ خواهد شد)
      if (country.isCanada) return; 

      const li = document.createElement("li");
      li.innerHTML = `<img src="https://flagcdn.com/w20/${country.flag}.png" alt="flag"> <span style="flex:1; text-align:left;">${country.name}</span> <b>${country.code}</b>`;
      
      li.addEventListener("click", () => {
        updateCountryUI(country);
        closeModal();
      });
      
      modalList.appendChild(li);
    });
  }

  // ۳. آپدیت ظاهر کادر انتخاب پس از کلیک یا سوییچ هوشمند آمریکا/کانادا
  function updateCountryUI(country) {
    selectedCountry = country;
    currentCode.textContent = country.code;
    currentFlag.src = `https://flagcdn.com/w20/${country.flag}.png`;
    phoneInput.placeholder = country.mask;
  }

  // ۴. منطق سرچ پیشرفته و زنده (بر اساس نام کشور یا پیش‌شماره)
  // تابع یکسان‌سازی متون برای حذف حساسیت به کلاه «آ» و حروف مشابه
  function normalizeText(str) {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/[آأإأ]/g, "ا")
      .replace(/ی/g, "ی")
      .replace(/ک/g, "ک")
      .trim();
  }

  // لغت‌نامه نام انگلیسی کشورها بر اساس کد فلگ (مخفف دو حرفی کشور)
  const englishNames = {
    "ir": "iran",
    "us": "america usa united states",
    "ca": "canada",
    "gb": "england uk united kingdom britain",
    "de": "germany",
    "tr": "turkey",
    "fr": "france",
    "it": "italy",
    "ru": "russia",
    "ae": "uae dubai emirates",
    "iq": "iraq",
    "af": "afghanistan",
    "sa": "saudi arabia"
  };

  // ۴. منطق سرچ پیشرفته و زنده (بدون حساسیت به آ/ا و پشتیبانی از انگلیسی)
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase().trim();
      const normalizedTerm = normalizeText(term);

      const filtered = countriesData.filter(c => {
        const normalizedName = normalizeText(c.name);
        const countryCode = c.code.toLowerCase();
        const countryFlag = c.flag.toLowerCase();
        const enName = englishNames[countryFlag] || "";

        return normalizedName.includes(normalizedTerm) || 
               countryCode.includes(term) || 
               countryFlag.includes(term) ||
               enName.includes(term);
      });

      renderModalList(filtered);
    });
  }

  // ۵. باز و بسته کردن مدال کشورها
  function openModal() {
    modal.style.display = "flex";
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }
    renderModalList(countriesData); 
  }

  function closeModal() {
    modal.style.display = "none";
  }

  if (trigger) trigger.addEventListener("click", openModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  
  // ۶. مانیتور زنده تایپ برای سوییچ هوشمند کانادا و آمریکا روی رنج +1
  if (phoneInput) {
    phoneInput.addEventListener("input", () => {
      if (!selectedCountry) return;

      if (selectedCountry.code === "+1") {
        const val = phoneInput.value.trim();
        if (val.length >= 3) {
          const threeDigits = val.substring(0, 3);
          const canada = countriesData.find(c => c.isCanada);
          const usa = countriesData.find(c => c.isNorthAmerica);

          if (canada && canada.areaCodes && canada.areaCodes.includes(threeDigits)) {
            if (selectedCountry.flag !== "ca") updateCountryUI(canada);
          } else {
            if (selectedCountry.flag !== "us" && usa) updateCountryUI(usa);
          }
        }
      }
    });
  }

  // ==========================================
  //     توابع مدیریت ماژولار مدال انتخاب زبان
  // ==========================================

  function openLanguageModal() {
    languageModal.style.display = "flex";
    if (languageSearchInput) {
      languageSearchInput.value = "";
      languageSearchInput.focus();
    }
    renderLanguages(languages);
  }

  function closeLanguageModal() {
    languageModal.style.display = "none";
  }

  function renderLanguages(list) {
    if (!languageModalList) return;
    languageModalList.innerHTML = "";
    
    list.forEach(lang => {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.width = "100%";
      
      // در این بخش تگ img با آدرس FlagCDN اضافه شده است تا ظاهر پرچم‌ها با بخش کشورها ست شود
      li.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="https://flagcdn.com/w20/${lang.flagCode}.png" alt="${lang.name}" style="border-radius: 3px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">
          <span>${lang.name}</span>
        </div>
        <b style="color:var(--accent); font-family:monospace; text-transform:uppercase;">${lang.code}</b>
      `;
      
      li.addEventListener("click", () => {
        changeLanguage(lang.code);
        closeLanguageModal();
      });
      
      languageModalList.appendChild(li);
    });
  }

  function filterLanguages() {
    if (!languageSearchInput) return;
    const term = languageSearchInput.value.toLowerCase().trim();
    
    const filtered = languages.filter(lang => {
      return lang.name.toLowerCase().includes(term) || 
             lang.code.toLowerCase().includes(term);
    });
    renderLanguages(filtered);
  }

  function changeLanguage(langCode) {
    localStorage.setItem("selected_lang", langCode);
    
    // ۱. نمایش لودینگ اختصاصی نئونی
    const loader = document.getElementById("customLanguageLoader");
    if (loader) {
      const loaderText = loader.querySelector(".custom-loader-text");
      if (loaderText) {
        if (langCode === "fa") loaderText.textContent = "در حال بارگذاری زبان فارسی...";
        else if (langCode === "ar") loaderText.textContent = "جاري تحميل اللغة العربية...";
        else if (langCode === "ru") loaderText.textContent = "ЗАГРУЗКА СИСТЕМЫ...";
        else if (langCode === "uk") loaderText.textContent = "Завантаження української мови...";
        else if (langCode === "fr") loaderText.textContent = "CHARGEMENT DU SYSTÈME...";
        else if (langCode === "tr") loaderText.textContent = "Türkçe dil yükleniyor...";
        else if (langCode === "es") loaderText.textContent = "Cargando español...";
        else if (langCode === "de") loaderText.textContent = "Deutsche Sprache wird geladen...";
        else if (langCode === "zh-CN") loaderText.textContent = "正在加载中文系统...";
        else loaderText.textContent = "TRANSLATING SYSTEM...";
      }
      loader.style.display = "flex";
    }
    
    // ۲. ⚡️ تغییر جهت کل سایت و پنل‌ها به صورت آنی
    if (langCode === "fa" || langCode === "ar") {
      document.documentElement.setAttribute("dir", "rtl");
      document.documentElement.setAttribute("lang", langCode);
    } else {
      document.documentElement.setAttribute("dir", "ltr");
      document.documentElement.setAttribute("lang", langCode);
    }
    
    // ۳. اعمال روی ویجت مخفی گوگل ترنسلیت
    const wait = setInterval(() => {
      const combo = document.querySelector(".goog-te-combo");
      if (combo) {
        clearInterval(wait);
        combo.value = langCode;
        combo.dispatchEvent(new Event("change"));
        
        // پنهان کردن لودینگ پس از اتمام کار گوگل
        setTimeout(() => {
          if (loader) loader.style.display = "none";
        }, 1200);
      }
    }, 50);
  }
  
  // ۲. تابع هوشمند ردیابی آی‌پی و ست کردن خودکار زبان سیستم
  function restoreLanguage() {
    const savedLang = localStorage.getItem("selected_lang");
    
    // اگر کاربر قبلاً خودش دستی زبانی رو انتخاب کرده، همون رو اولویت قرار بده
    if (savedLang) {
      changeLanguage(savedLang);
      return;
    }
  
    // اگر بار اول است که سایت را باز می‌کند، از طریق API کشورش را ردیابی کن
    fetch("https://ipapi.co/json/")
      .then(response => response.json())
      .then(data => {
        const countryCode = data.country_code; // مثلاً IR یا US یا RU
        
        // پیدا کردن زبان مناسب برای کشور کاربر از روی لغت‌نامه بالا
        const autoLang = countryToLangMap[countryCode];
        
        if (autoLang) {
          // اگر کشورش در لیست ما بود، زبان اختصاصی خودش رو ست کن
          changeLanguage(autoLang);
        } else {
          // اگر کشورش جزو ۴ زبان اصلی نبود (مثلا آلمان یا فرانسه)، پیش‌فرض انگلیسی نشون بده
          changeLanguage("en");
        }
      })
      .catch(err => {
        console.log("خطا در ردیابی آی‌پی، ست کردن زبان پیش‌فرض روی فارسی...");
        // در صورت قطع بودن اینترنت یا ارور شبکه، به عنوان بک‌آپ زبان رو فارسی می‌ذاریم
        changeLanguage("fa");
      });
      window.location.reload();
  }

  // ایجاد رویدادها (Event Listeners) برای بخش زبان
  if (btnLanguage) btnLanguage.addEventListener("click", openLanguageModal);
  if (closeLanguageModalBtn) closeLanguageModalBtn.addEventListener("click", closeLanguageModal);
  if (languageSearchInput) languageSearchInput.addEventListener("input", filterLanguages);

  // بازیابی زبان ذخیره شده در هنگام باز شدن سایت
  restoreLanguage();

  // مدیریت بستن تمامی مدال‌ها با کلیک بیرون پنجره یا دکمه Escape
  window.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
    if (e.target === languageModal) closeLanguageModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeLanguageModal();
    }
  });

});

const PHONE_BLOCK_TIME = 24 * 60 * 60 * 1000; // 24 ساعت

function isPhoneBlocked(phone) {
  const t = localStorage.getItem("phone_block_" + phone);
  if (!t) return false;

  if (Date.now() - parseInt(t, 10) < PHONE_BLOCK_TIME) {
    return true;
  }

  localStorage.removeItem("phone_block_" + phone);
  return false;
}

function blockPhone(phone) {
  localStorage.setItem("phone_block_" + phone, Date.now());
}

const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

function goTo(step) {
  currentStep = step;
  const ids = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6'];
  
  ids.forEach((id, idx) => {
    const el = qs('#' + id);
    if (!el) return;
    const visible = (idx + 1) === step;
    el.classList.toggle('hidden', !visible);
  });

  // 🤖 فیکس باگ: به محض اینکه سیستم وارد مرحله ۳ (تایید هویت) شد، سیستم کپچا و تایمر زاپاس استارت می‌خوره
  if (step === Steps.VERIFY) {
    console.log("🪐 وارد مرحله تایید هویت شدیم. در حال استارت کپچای هوشمند...");
    setTimeout(() => {
      if (typeof window.initServerCaptcha === 'function') {
        window.initServerCaptcha();
      }
    }, 150);
  }
}

// متصل کردن به پنجره اصلی برای حل ارورهای ماژول
window.goTo = goTo;

// ======== تم و صدا ========
if (qs('#toggleSound')) {
  qs('#toggleSound').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    qs('#toggleSound i').className = 'fa-solid ' + (soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark');
  });
}

// ======== ابزار صدا ========
const Audio = (() => {
  let ctx;
  function ensure() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); }
  function beep(freq = 880, dur = 0.05, type = 'square', vol = 0.02) {
    if (!soundEnabled) return;
    ensure();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol; o.connect(g); g.connect(ctx.destination);
    o.start(); setTimeout(() => o.stop(), dur * 1000);
  }
  return { beep };
})();

// ======== ورودی‌ها ========
const phoneEl = qs('#phone');
const tokenEl = qs('#tokenInput');
const errEl = qs('#error');

// ======== اکشن‌ها ========
if (qs('#btnStart')) qs('#btnStart').addEventListener('click', startDemo);
if (qs('#btnShowErrors')) qs('#btnShowErrors').addEventListener('click', () => goTo(Steps.HINTS));
if (qs('#btnRestart')) qs('#btnRestart').addEventListener('click', resetAll);
if (qs('#btnRetry')) qs('#btnRetry').addEventListener('click', resetAll);
if (qs('#btnBackHome')) qs('#btnBackHome').addEventListener('click', () => goTo(Steps.INPUT));

function resetAll() {
  if (busyTimeout1) clearTimeout(busyTimeout1);
  if (busyTimeout2) clearTimeout(busyTimeout2);

  buttonLocked = false;
  if (qs('#btnStart')) qs('#btnStart').disabled = false;

  if (phoneEl) phoneEl.value = '';
  if (tokenEl) tokenEl.value = '';
  if (errEl) errEl.textContent = '';
  if (qs('#logBox')) qs('#logBox').innerHTML = '';
  if (qs('#timer')) qs('#timer').textContent = '⏱ زمان باقی‌مانده: —';
  if (qs('#progressBar')) qs('#progressBar').style.width = '100%';

  fakeBusyShown = false; 

  goTo(Steps.INPUT);
}

window.startDemo = startDemo;

// حتماً برای دسترسی جهانی این‌ها رو زنجیر کن
window.startDemo = startDemo;

function runLogs(fullPhoneNumber) {
  const logBox = qs('#logBox');
  logBox.innerHTML = '';

  let i = 0; 
  let timer = 220; 
  
  const LOG_POOL = [
    'ping example.com -c 4',
    'nslookup demo.local',
    'curl -I https://httpbin.org/status/200',
    'starting https://telegram.org/api/error',
    'openssl rand -hex 8',
    'traceroute 1.1.1.1',
    'whois example.org',
    'dig +short txt demo.training',
    'nmap -sS 127.0.0.1',
    'gzip --test sample.log.gz',
    'jq \'{status: "ok"}\'',
    'node -e "console.log(\'demo\')"',
    'python - <<PY\nprint("hello demo")\nPY',
    'git status --porcelain',
    'docker ps --format "table {{.Names}}\\t{{.Status}}"',
    'kubectl version --client',
    'echo $RANDOM',
    'sleep 0.1 && echo done',

    'git log --oneline -5',
    'git branch',
    'git diff --stat',
    'git stash list',
  
    'npm list --depth=0',
    'npm audit',
    'npm outdated',
    'yarn --version',
    'pnpm list',
  
    'python --version',
    'pip list',
    'pip freeze',
    'java -version',
    'go version',
    'rustc --version',
    'cargo build',
    'gcc --version',
  
    'docker sms',
    'docker network ls',
    'docker volume ls',
    'docker stats --no-stream',
  
    'kubectl get pods',
    'kubectl get nodes',
    'kubectl get svc',
    'kubectl config current-context',
  
    'sqlite3 demo.db ".tables"',
    'redis-cli ping',
    'mysql --version',
    'psql --version',
  
    'curl https://api.github.com',
    'openssl version',
    'base64 sample.txt',
    'sha256sum demo.txt',
    'md5sum demo.txt',
    'xxd demo.bin | head',
    'hexdump -C demo.bin | head',
  
    'tail -f app.log',
    'head -20 app.log',
    'wc -l app.log',
    'sort sample.txt',
    'uniq sample.txt',
    'grep "INFO" app.log',
    'awk \'{print $1}\' sample.txt',
    'sed -n "1,10p" sample.txt',
  
    'echo "Starting diagnostics..."',
    'echo "Loading configuration..."',
    'echo "Checking sms..."',
    'echo "Initializing services..."',
    'echo "Synchronizing data..."',
    'echo "Running validation..."',
    'echo "Operation completed."'
  ];

  if (qs('#timer')) qs('#timer').textContent = `⏱ زمان باقی‌مانده: ${timer} ثانیه`;
  const progressBar = qs('#progressBar');

  function typeLogLine(line, done) {
    const wrap = document.createElement('div');
    const top = document.createElement('div');
    top.className = 'prompt-top';
    top.textContent = '┌─[demo@cterm]─[~/sandbox]';
    
    const bottom = document.createElement('div');
    bottom.className = 'prompt-bottom';
    bottom.innerHTML = '<span>└──╼&gt; $ </span><span class="typing"></span>';
    
    const out = bottom.querySelector('.typing');
    wrap.appendChild(top); wrap.appendChild(bottom); logBox.appendChild(wrap);

    let idx = 0;
    function tick() {
      if (idx < line.length) {
        out.textContent += line[idx++];
        if (idx % 4 === 0) Audio.beep(1200, 0.01, 'square', 0.01);
        logBox.scrollTop = logBox.scrollHeight;
        setTimeout(tick, 15);
      } else { done(); }
    }
    tick();
  }

  function next() {
    if (i < LOG_POOL.length) {
      typeLogLine(LOG_POOL[i], () => {
        i++; timer = Math.max(0, timer - 2);
        if (qs('#timer')) qs('#timer').textContent = `⏱ زمان باقی‌مانده: ${timer} ثانیه`;
        if (progressBar) progressBar.style.width = `${Math.max(0, (LOG_POOL.length - i) / LOG_POOL.length * 100)}%`;
        next();
      });
    } else {
      // قفل کردن ۲۴ ساعته شماره در انتهای موفقیت‌آمیز لاگ‌ها
      blockPhone(fullPhoneNumber);
      setTimeout(() => { goTo(Steps.VERIFY); }, 400);
    }
  }

  next();
}

// ======== شمارش معکوس ========
function startCountdown() {
  const el = qs('#countdown');
  let sec = 10;
  function tick() {
    if (!el) return;
    el.textContent = `\u202B⏳ ${sec} ثانیه باقی‌مانده...`;
    Audio.beep(700 + (10 - sec) * 20, 0.03, 'triangle', 0.012);
    if (sec-- > 0) setTimeout(tick, 1000);
    else showCode();
  }
  tick();
}

// ======== کد نمایشی ========
function showCode() {
  goTo(Steps.CODE);
  const code = (10000 + Math.floor(Math.random() * 89999)).toString();
  const box = qs('#codeBox');
  if (box) {
    box.textContent = code;
    box.classList.remove('glitch');
    void box.offsetWidth;
    box.classList.add('glitch');
  }
  
  for (let i = 0; i < 8; i++) setTimeout(() => Audio.beep(440 + i * 40, 0.04, 'square', 0.02), i * 45);

  setTimeout(() => {
    if (document.getElementById("twoStepBox")) {
      document.getElementById("twoStepBox").style.display = "flex";
    }
  }, 2000);
}

// ======== ابزارها ========
function toggleVisibility(inputId, iconWrapper) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const hidden = input.type === 'password';
  input.type = hidden ? 'text' : 'password';
  iconWrapper.innerHTML = `<i class="fas fa-${hidden ? 'lock-open' : 'lock'}"></i>`;
}

function hideWarning() { 
  if (document.getElementById("warningBox")) {
    document.getElementById("warningBox").style.display = "none"; 
  }
  window.hideWarning = hideWarning;
}

function hideTwoStepBox() { 
  if (document.getElementById("twoStepBox")) {
    document.getElementById("twoStepBox").style.display = "none"; 
  }
}

// MATRIX
const canvas = document.getElementById("matrixCanvas");
if (canvas) {
  const ctx = canvas.getContext("2d");

  function matrixSetup() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const hexChars = "0123456789ABCDEF";
    const ghostHex = ["49", "4D", "20", "47", "48", "4F", "53", "54"];
    const fontSize = window.innerWidth < 900 ? 12 : 16;
    const columns = Math.floor(canvas.width / (fontSize * 1.2));
    const drops = Array(columns).fill(1);

    function draw() {
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00ff95";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = Math.random() > 0.98
          ? ghostHex[Math.floor(Math.random() * ghostHex.length)]
          : hexChars[Math.floor(Math.random() * hexChars.length)];

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.93) drops[i] = 0;
        drops[i]++;
      }
    }
    setInterval(draw, window.innerWidth < 900 ? 65 : 50);
  }
  matrixSetup();
  window.addEventListener("resize", matrixSetup);
}

(() => {
  const btn = document.getElementById("holdBtn");
  if (!btn) return;
  const fill = btn.querySelector(".hold-fill");
  const status = document.getElementById("holdStatus");
  let holding = false;
  let progress = 0;
  let timer = null;
  const HOLD_TIME = 1800 + Math.random() * 1200; 
  const STEP = 20;

  function reset() {
    holding = false;
    progress = 0;
    if (fill) fill.style.width = "0%";
    clearInterval(timer);
  }

  // هر جا که کاربر وارد مرحله تایید هویت انسان میشه این تابع رو صدا بزن:
if (currentStep === Steps.VERIFY) {
  setTimeout(() => {
      if (window.initServerCaptcha) window.initServerCaptcha();
  }, 100);
}

  btn.addEventListener("mousedown", startHold);
  btn.addEventListener("touchstart", startHold);
  ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach(ev => btn.addEventListener(ev, reset));
})();

// ========================================================
// 🪐 بخش اتصال ۱۰۰٪ آنلاین به فایربیس و مدیریت سکه‌ها از سرور
// ========================================================

// ایمپورت دقیق متدها از فایربیس محلی خودت
import { auth, db, onAuthStateChanged, doc, getDoc, updateDoc } from "./firebase.js";
import { getDoc as firestoreGetDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUserDocRef = null;
let currentCoins = 0;
let hackCount = 0;

// شنودر زنده وضعیت لاگین کاربر و لود کردن آنی سکه‌ها از سرور
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "auth.html";
  } else {
    // تشکیل رفرنس دقیق داکیومنت کاربر در سرور
    currentUserDocRef = doc(db, "users", user.uid);
    
    try {
      const userSnap = await getDoc(currentUserDocRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.isBanned) {
          alert("حساب کاربری شما مسدود است.");
          window.location.href = "auth.html";
          return;
        }
        
        // گرفتن مستقیم مقدار سکه از سرور فایربیس
        currentCoins = userData.coins || 0;
        hackCount = userData.hackCount || 0;
        
        // آپدیت نام کاربری در فرانت
        const nameElement = document.getElementById("settingsUserName");
        if (nameElement) {
          nameElement.textContent = userData.displayName || user.email.split('@')[0] || "کاربر شبح";
        }
        
        // تزریق UID واقعی کاربر برای کپی کردن راحت ادمین
        const uidElement = document.getElementById("userUidDisplay");
        if (uidElement) {
          uidElement.textContent = user.uid;
        }
        
        // آپدیت باکس نمایش سکه در هدر یا منو
        const coinsElement = document.getElementById("userCoins");
        if (coinsElement) {
          coinsElement.textContent = currentCoins;
        }
      }
    } catch (error) {
      console.error("خطا در لود اولیه اطلاعات از سرور:", error);
    }
  }
});

// 🚀 تابع استارت دمو - کاملاً بازنویسی شده برای چک کردن از سمت سرور
async function startDemo() {
  const phoneEl = qs('#phone');
  const errEl = qs('#error');
  const btnStart = qs('#btnStart');
  const btnTextEl = qs('#btnStartText');

  let phoneRaw = phoneEl ? phoneEl.value.trim() : "";

  if (!selectedCountry) {
    if (errEl) errEl.textContent = "❌ در حال بارگذاری اطلاعات سرور، کمی بعد تلاش کنید.";
    return;
  }

  if (phoneRaw.length === 0) {
    if (errEl) errEl.textContent = "❌ لطفاً شماره تلفن را وارد کنید.";
    if (typeof Audio !== 'undefined' && Audio.beep) Audio.beep(200, 0.15, "sawtooth", 0.03);
    return;
  }

  if (!/^\d+$/.test(phoneRaw)) {
    if (errEl) errEl.textContent = "❌ شماره تلفن فقط باید شامل اعداد باشد.";
    if (typeof Audio !== 'undefined' && Audio.beep) Audio.beep(200, 0.15, "sawtooth", 0.03);
    return;
  }

  const hasZero = phoneRaw.startsWith("0");
  let requiredLength = hasZero ? selectedCountry.lengthWithZero : selectedCountry.lengthWithoutZero;

  if (phoneRaw.length !== requiredLength) {
    if (errEl) {
      errEl.textContent = hasZero 
        ? `❌ شماره‌های کشور ${selectedCountry.name} با صفر باید ${selectedCountry.lengthWithZero} رقم باشند.`
        : `❌ شماره‌های کشور ${selectedCountry.name} بدون صفر باید ${selectedCountry.lengthWithoutZero} رقم باشند.`;
    }
    if (typeof Audio !== 'undefined' && Audio.beep) Audio.beep(200, 0.15, "sawtooth", 0.03);
    return;
  }

  if (hasZero && selectedCountry.code === "+98") {
    phoneRaw = phoneRaw.substring(1);
  }

  const fullPhoneNumber = selectedCountry.code + phoneRaw;

  // 🔄 فعال کردن لودینگ
  if (btnStart) btnStart.disabled = true;
  if (btnTextEl) btnTextEl.textContent = " در حال اتصال به سرور...";
  if (errEl) {
    errEl.style.color = "var(--accent)";
    errEl.textContent = "⏳ در حال استعلام موجودی از سرور GHOST...";
  }

  try {
    // امنیت سرور: بررسی رفرنس کاربر
    if (!currentUserDocRef) {
      if (errEl) errEl.textContent = "❌ خطا: اتصال به سرور برقرار نیست. صفحه را رفرش کنید.";
      if (btnStart) btnStart.disabled = false;
      if (btnTextEl) btnTextEl.textContent = "شروع بررسی";
      return;
    }

    // 🪙 استعلام مستقیم و زنده موجودی از خود سرور فایربیس (نه متغیر محلی مرورگر!)
    const userSnap = await firestoreGetDoc(currentUserDocRef);
    if (!userSnap.exists()) {
      if (errEl) errEl.textContent = "❌ داکیومنت کاربری شما در سرور یافت نشد.";
      if (btnStart) btnStart.disabled = false;
      if (btnTextEl) btnTextEl.textContent = "شروع بررسی";
      return;
    }

    const serverCoins = userSnap.data().coins || 0;

    // 🎯 حل باگ اتمامی موجودی: اگر سکه سرور کمتر از 10 باشه
    if (serverCoins < 10) {
      if (errEl) {
        errEl.style.color = "var(--danger)"; // تغییر رنگ به قرمز خطایی
        errEl.textContent = `❌ سکه کافی نداری رئیس! موجودی سرور شما: ${serverCoins} سکه است (۱۰ سکه لازمه).`;
      }
      if (btnStart) btnStart.disabled = false;
      if (btnTextEl) btnTextEl.textContent = "شروع بررسی";
      if (typeof Audio !== 'undefined' && Audio.beep) Audio.beep(150, 0.3, "sawtooth", 0.04);
      return;
    }

    // 🪙 کسر ۱۰ سکه مستقیماً روی سرور فایربیس
    let newCoins = serverCoins - 10;
    await updateDoc(currentUserDocRef, { coins: newCoins });
    
    // آپدیت لوکال دایلوگ‌ها
    currentCoins = newCoins;
    const coinsElement = document.getElementById("userCoins");
    if (coinsElement) coinsElement.textContent = currentCoins;

    // ریست دکمه برای مراحل بعدی
    if (btnStart) btnStart.disabled = false;
    if (btnTextEl) btnTextEl.textContent = "شروع بررسی";

  } catch (e) {
    console.error("خطای فایربیس در کسر سکه:", e);
    if (btnStart) btnStart.disabled = false;
    if (btnTextEl) btnTextEl.textContent = "شروع بررسی";
    if (errEl) errEl.textContent = "❌ خطای سرور در کسر سکه: " + e.message;
    return;
  }

  // 🚀 در صورت موفقیت، هدایت به بخش لاگ‌ها
  if (errEl) errEl.textContent = "";
  goTo(Steps.LOGS);

  const logBox = qs("#logBox");
  if (logBox) logBox.innerHTML = "";

  runLogs(fullPhoneNumber);
}

// زنجیر کردن تمام توابع ماژول به پنجره اصلی مرورگر (Window) برای جلوگیری از ارورهای HTML
window.startDemo = startDemo;

window.copyUserUid = function() {
  const uidText = document.getElementById("userUidDisplay").textContent;
  if (!uidText || uidText.includes("------")) return;

  navigator.clipboard.writeText(uidText).then(() => {
    const icon = document.getElementById("copyUidIcon");
    icon.className = "fa-solid fa-check";
    icon.style.color = "var(--accent-2)";
    setTimeout(() => {
      icon.className = "fa-regular fa-copy";
      icon.style.color = "var(--accent)";
    }, 1500);
  });
};

window.toggleSettingsModal = function() {
  const modal = document.getElementById("settingsMenuModal");
  if (modal) {
    modal.style.display = (modal.style.display === "none" || modal.style.display === "") ? "block" : "none";
  }
};

window.hideWarning = hideWarning;
window.hideTwoStepBox = hideTwoStepBox;

// ⚡️ مچ کردن نهایی تابع با پنجره اصلی برای حل ارور is not defined
if (typeof startDemo !== 'undefined') {
  window.startDemo = startDemo;
} else {
  console.error("دادا! تابع startDemo کلاً توی فایل اسکریپت غیب شده یا پاک شده!");
}


// 👁️ تابع سوئیچ بین حالت رمز (نقطه) و آشکارسازی شماره تلفن همراه با تغییر آیکون قفل
window.toggleVisibility = function(elementId, iconWrapper) {
  const field = document.getElementById(elementId);
  if (!field) return;

  const icon = iconWrapper.querySelector('i');
  if (!icon) return;

  if (field.type === "password") {
    field.type = "text"; 
    icon.classList.remove("fa-lock");
    icon.classList.add("fa-lock-open"); 
  } else {
    
    field.type = "password"; 
    icon.classList.remove("fa-lock-open");
    icon.classList.add("fa-lock"); 
  }
};

import { RecaptchaVerifier } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let ghostTimerTimeout = null;

// تابع اصلی لود و مدیریت کپچای هوشمند سرور (اصلاح شده)
window.initServerCaptcha = function() {
  const container = document.getElementById('recaptcha-container');
  const loader = document.getElementById('captchaLoader');
  const backupArea = document.getElementById('ghostBackupArea');
  const btnManual = document.getElementById('btnManualVerify');

  if (!container) return;

  // ریست کردن وضعیت‌ها و پاک کردن کپچاهای قبلی برای جلوگیری از دبل شدن
  container.innerHTML = "";
  if (loader) loader.style.display = "block";
  if (backupArea) backupArea.style.display = "none";
  if (btnManual) btnManual.style.display = "none";

  try {
    if (!auth) {
      console.error("خطا: شیء auth هنوز لود نشده یا در دسترس نیست!");
      if (backupArea) backupArea.style.display = "block";
      return;
    }

    // رندر دقیق کپچا بر اساس استانداردهای فایربیس نسخه 10
    window.recaptchaVerifier = new RecaptchaVerifier(auth, container, {
      'size': 'normal',
      'callback': (response) => {
        if (loader) loader.style.display = "none";
        if (btnManual) btnManual.style.display = "block";
        if (backupArea) backupArea.style.display = "none";
        console.log("✅ کپچای گوگل با موفقیت حل شد.");
      },
      'expired-callback': () => {
        alert("زمان پاسخ‌گویی به کپچا به پایان رسید، دوباره تلاش کن دادا.");
        if (btnManual) btnManual.style.display = "none";
      }
    });

    window.recaptchaVerifier.render().then(() => {
      if (loader) loader.style.display = "none";
      console.log("🟢 کپچای تک و اصلی با موفقیت رندر شد.");
    }).catch(err => {
      console.log("گوگل بلاک کرد یا فیلتره، زاپاس فعال شد:", err);
      if (backupArea) backupArea.style.display = "block";
      if (loader) loader.style.display = "none";
    });

  } catch (error) {
    console.error("خطا در بازگذاری کپچا:", error);
    if (backupArea) backupArea.style.display = "block";
    if (loader) loader.style.display = "none";
  }

  // فعال‌سازی تایمر ۱۰ ثانیه‌ای برای ظاهر شدن دکمه دور زدن GHOST
  if (ghostTimerTimeout) clearTimeout(ghostTimerTimeout);
  ghostTimerTimeout = setTimeout(() => {
    if (backupArea && (!btnManual || btnManual.style.display === "none")) {
      backupArea.style.display = "block"; 
      if (loader) loader.style.display = "none"; 
    }
  }, 30000); 
};

// ✅ دکمه تایید نهایی (استارت تایمر اضافه شد)
window.triggerCaptchaSuccess = function() {
  if (typeof goTo === 'function') {
    goTo(Steps.COUNTDOWN); // هدایت به مرحله ۴
    // استارت زدن موتور تایمر بعد از انیمیشن تغییر مرحله
    setTimeout(() => {
      if (typeof startCountdown === 'function') startCountdown();
    }, 300);
  }
};

// ⚡️ تابع دور زدن کپچا با دکمه زاپاس GHOST (استارت تایمر اضافه شد)
window.bypassCaptchaWithGhost = function() {
  if (ghostTimerTimeout) clearTimeout(ghostTimerTimeout);
  console.log("کپچا با موفقیت توسط سرور GHOST بای‌پاس شد.");
};

