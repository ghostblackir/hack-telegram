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
  { code: "fr", flagCode: "fr", name: "Français" },
  { code: "tr", flagCode: "tr", name: "Türkçe" },
  { code: "es", flagCode: "es", name: "Español" }
];

const countryToLangMap = {
  "IR": "fa", // ایران -> فارسی
  "RU": "ru", // روسیه -> روسی
  "SA": "ar", // عربستان -> عربی
  "AE": "ar", // امارات -> عربی
  "IQ": "ar", // عراق -> عربی
  "QA": "ar", // قطر -> عربی
  "OM": "ar", // عمان -> عربی
  "US": "en", // آمریکا -> انگلیسی
  "GB": "en", // انگلیس -> انگلیسی
  "CA": "en", // کانادا -> انگلیسی
  "AU": "en"  // استرالیا -> انگلیسی
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
    
    // نمایش لودینگ اختصاصی نئونی
    const loader = document.getElementById("customLanguageLoader");
    if (loader) {
      const loaderText = loader.querySelector(".custom-loader-text");
      if (loaderText) {
        if (langCode === "fa") loaderText.textContent = "در حال بارگذاری زبان فارسی...";
        else if (langCode === "ar") loaderText.textContent = "جاري تحميل اللغة العربية...";
        else if (langCode === "ru") loaderText.textContent = "ЗАГРУЗКА СИСТЕМЫ...";
        else if (langCode === "fr") loaderText.textContent = "CHARGEMENT DU SYSTÈME...";
        else if (langCode === "tr") loaderText.textContent = "Türkçe dil yükleniyor...";
        else if (langCode === "es") loaderText.textContent = "Cargando español...";
        else loaderText.textContent = "TRANSLATING SYSTEM...";
      }
      loader.style.display = "flex";
    }
    
    // اعمال روی ویجت مخفی گوگل ترنسلیت
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
}

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

function startDemo() {
  const phoneEl = qs('#phone');
  const tokenEl = qs('#tokenInput');
  const errEl = qs('#error');

  let phoneRaw = phoneEl.value.trim();
  const token = tokenEl.value.trim();

  // اگر هنوز فایل JSON لود نشده باشد
  if (!selectedCountry) {
    errEl.textContent = "❌ در حال بارگذاری اطلاعات سرور، کمی بعد تلاش کنید.";
    return;
  }

  // ۱. بررسی خالی نبودن کادر شماره
  if (phoneRaw.length === 0) {
    errEl.textContent = "❌ لطفاً شماره تلفن را وارد کنید.";
    Audio.beep(200, 0.15, "sawtooth", 0.03);
    return;
  }

  // ۲. بررسی فقط عدد بودن ورودی
  if (!/^\d+$/.test(phoneRaw)) {
    errEl.textContent = "❌ شماره تلفن فقط باید شامل اعداد باشد.";
    Audio.beep(200, 0.15, "sawtooth", 0.03);
    return;
  }

  // اعتبارسنجی هوشمند طول بر اساس قوانین کشور انتخاب شده جاری (که ممکنه آمریکا یا کانادا باشه)
  const hasZero = phoneRaw.startsWith("0");
  let requiredLength = hasZero ? selectedCountry.lengthWithZero : selectedCountry.lengthWithoutZero;

  if (phoneRaw.length !== requiredLength) {
    if (hasZero) {
      errEl.textContent = `❌ شماره‌های کشور ${selectedCountry.name} در صورت شروع با صفر باید دقیقاً ${selectedCountry.lengthWithZero} رقم باشند. (شما ${phoneRaw.length} رقم وارد کردید)`;
    } else {
      errEl.textContent = `❌ شماره‌های کشور ${selectedCountry.name} بدون صفر باید دقیقاً ${selectedCountry.lengthWithoutZero} رقم باشند. (شما ${phoneRaw.length} رقم وارد کردید)`;
    }
    if (typeof Audio !== 'undefined' && Audio.beep) Audio.beep(200, 0.15, "sawtooth", 0.03);
    return;
  }

  // تصفیه نهایی شماره (حذف صفر اول برای یکپارچه‌سازی در صورت نیاز سیستم شما)
  if (hasZero && selectedCountry.code === "+98") {
    phoneRaw = phoneRaw.substring(1);
  }

  // ترکیب کد کشور و شماره نهایی تصفیه شده
  const fullPhoneNumber = selectedCountry.code + phoneRaw;

  // بقیه کدهای سیستم (بررسی توکن، قفل و فاز شبیه‌سازی سرور...)
  if (isPhoneBlocked(fullPhoneNumber)) {
    errEl.textContent = "📛 این شماره قبلاً بررسی شده و تا ۲۴ ساعت آینده امکان بررسی مجدد ندارد.";
    return;
  }

  if (token.length === 0) {
    errEl.textContent = "توکن را وارد کنید.";
    Audio.beep(200, 0.15, "sawtooth", 0.03);
    return;
  }

  if (token !== "5jWjSzP2XlIa9") {
    errEl.textContent = "توکن معتبر نیست یا منقضی شده است.";
    Audio.beep(300, 0.05, "square", 0.01);
    return;
  }

  // شلوغی فیک فقط بار اول
  if (!fakeBusyShown) {
    fakeBusyShown = true;
    buttonLocked = true;
    if (qs('#btnStart')) qs('#btnStart').disabled = true;

    errEl.textContent = "⏳ در حال اتصال به سرور...";

    busyTimeout1 = setTimeout(() => {
      errEl.textContent = "❌ سرورها شلوغ هستند، لطفاً کمی بعد تلاش کنید.";
    }, 4000);

    busyTimeout2 = setTimeout(() => {
      buttonLocked = false;
      if (qs('#btnStart')) qs('#btnStart').disabled = false;
      errEl.textContent = "🔄 سرور آزاد شد. مجدداً روی شروع بررسی کلیک کنید.";
    }, 8000);

    return; 
  }

  errEl.textContent = "";
  goTo(Steps.LOGS);

  const logBox = qs("#logBox");
  logBox.innerHTML = "";

  function randomHex(len = 8) {
    return [...Array(len)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
  }

  function randomPercent() {
    return (Math.random() * 100).toFixed(1) + "%";
  }

  function randomRisk() {
    const r = Math.random();
    if (r < 0.33) return "کم";
    if (r < 0.66) return "متوسط";
    return "زیاد";
  }

  const AI_POOL = [
    "در حال تحلیل داده...", "در حال ارزیابی رفتار کاربر...", "سیگنال امنیتی دریافت شد...",
    "در حال استخراج الگوی تایپ...", "بررسی پارامترهای امنیتی...", "آنالیز لایه دوم فعال شد...",
    "بررسی ساختار ورودی...", "سنجش میزان ریسک...", "در حال بررسی fingerprint رفتاری...",
    "محاسبه entropy...", "بررسی هماهنگی داده‌ها...", "سازگار سازی مدل AI...",
  ];

  function generateAILine() {
    const base = AI_POOL[Math.floor(Math.random() * AI_POOL.length)];
    const patterns = [
      `${base}`,
      `${base} | هش: ${randomHex()}`,
      `${base} | پردازش: ${randomPercent()}`,
      `${base} | ریسک: ${randomRisk()}`,
    ];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  function pickDynamicLines() {
    const pool = new Set();
    while (pool.size < 5) { pool.add(generateAILine()); }
    return [...pool];
  }

  const aiLines = pickDynamicLines();
  let index = 0;

  function runAI() {
    if (index < aiLines.length) {
      typeLine(aiLines[index], (el) => {
        setTimeout(() => {
          deleteLine(el, () => {
            index++;
            runAI();
          });
        }, 600);
      });
    } else {
      showValidation();
    }
  }

  function typeLine(text, done) {
    const el = document.createElement("div");
    el.style.color = "#00f4ff";
    el.style.margin = "8px 0";
    logBox.appendChild(el);
    let i = 0;
    function typer() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i); i++;
        setTimeout(typer, 15);
      } else { done(el); }
    }
    typer();
  }

  function deleteLine(el, done) {
    let txt = el.textContent;
    let i = txt.length;
    function erase() {
      if (i >= 0) {
        el.textContent = txt.slice(0, i); i--;
        setTimeout(erase, 10);
      } else { el.remove(); done(); }
    }
    erase();
  }

  function showValidation() {
    const el = document.createElement("div");
    el.style.color = "#0f0";
    el.innerHTML = `شماره: ${fullPhoneNumber} ✔ معتبر<br>توکن : ${token} ✔ تایید شد<br><br>`;
    logBox.appendChild(el);
    setTimeout(checkPhoneStatus, 600);
  }

  function checkPhoneStatus() {
    const el = document.createElement("div");
    el.style.color = "#00f4ff";
    logBox.appendChild(el);
    
    const statusText = "در حال بررسی وضعیت فعال بودن شماره...";
    let i = 0;
    function typerStatus() {
      if (i <= statusText.length) {
        el.textContent = statusText.slice(0, i); i++;
        setTimeout(typerStatus, 15);
      } else {
        setTimeout(() => {
          el.innerHTML += "<br>✔ شماره فعال است.";
          setTimeout(() => {
            runLogs(fullPhoneNumber);
          }, 800);
        }, 500);
      }
    }
    typerStatus();
  }

  runAI();
}

function runLogs(fullPhoneNumber) {
  const logBox = qs('#logBox');
  logBox.innerHTML = '';

  let i = 0; 
  let timer = 12; 
  
  const LOG_POOL = [
    'ping example.com -c 4',
    'nslookup demo.local',
    'curl -I https://httpbin.org/status/200',
    'openssl rand -hex 8',
    'traceroute 1.1.1.1',
    'whois example.org',
    'dig +short txt demo.training',
    'nmap -sS 127.0.0.1',
    'gzip --test sample.log.gz',
    'jq \'{status: \'\'ok\'\'}\'',
    'node -e "console.log(\'demo\')"',
    'python - <<PY\nprint(\'hello demo\')\nPY',
    'git status --porcelain',
    'docker ps --format "table {{.Names}}\t{{.Status}}"',
    'kubectl version --client',
    'echo $RANDOM',
    'sleep 0.1 && echo done',
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

  function startHold() {
    if (holding) return;
    holding = true;
    if (status) status.textContent = "نگه دار...";

    timer = setInterval(() => {
      progress += STEP;
      if (fill) fill.style.width = Math.min(100, (progress / HOLD_TIME) * 100) + "%";

      if (progress >= HOLD_TIME) {
        clearInterval(timer);
        btn.classList.add("success");
        if (status) status.textContent = "✔️ تأیید شد";
        setTimeout(() => {
          goTo(4);        
          startCountdown();
        }, 600);
      }
    }, STEP);
  }

  btn.addEventListener("mousedown", startHold);
  btn.addEventListener("touchstart", startHold);
  ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach(ev => btn.addEventListener(ev, reset));
})();