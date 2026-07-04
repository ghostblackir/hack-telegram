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

// منطق کشویی دستی کشورها به سبک تلگرام
let selectedCountryCode = "+98";
let selectedCountryLength = 10; // طول پیش‌فرض برای ایران بدون صفر

document.addEventListener("DOMContentLoaded", () => {
  const trigger = document.getElementById("countryTrigger");
  const dropdown = document.getElementById("countryDropdown");
  const phoneInput = document.getElementById("phone");
  const currentFlag = document.getElementById("currentFlag");
  const currentCode = document.getElementById("currentCode");

  if (trigger && dropdown) {
    // باز و بسته شدن منو
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    });

    // بسته شدن منو با کلیک روی بیرون
    document.addEventListener("click", () => {
      dropdown.style.display = "none";
    });

    // انتخاب کشور
    dropdown.querySelectorAll("li").forEach(item => {
      item.addEventListener("click", function () {
        const code = this.getAttribute("data-code");
        const mask = this.getAttribute("data-mask");
        const flag = this.getAttribute("data-flag");
        const len = this.getAttribute("data-length");

        selectedCountryCode = code;
        selectedCountryLength = parseInt(len, 10);
        currentCode.textContent = code;
        currentFlag.src = `https://flagcdn.com/w20/${flag}.png`;

        phoneInput.placeholder = mask;
        phoneInput.value = ""; 
      });
    });
  }
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
  let phoneRaw = phoneEl.value.trim();
  const token = tokenEl.value.trim();

  // تصفیه صفر اول شماره ایران
  if (selectedCountryCode === "+98" && phoneRaw.startsWith("0")) {
    phoneRaw = phoneRaw.substring(1);
  }

  // ترکیب کد کشور و شماره
  const fullPhoneNumber = selectedCountryCode + phoneRaw;

  if (phoneRaw.length === 0) {
    errEl.textContent = "❌ لطفاً شماره تلفن را وارد کنید.";
    Audio.beep(200, 0.15, "sawtooth", 0.03);
    return;
  }

  // کنترل طول مشخص کشور
  if (phoneRaw.length !== selectedCountryLength) {
    errEl.textContent = `❌ شماره تلفن برای این کشور باید دقیقاً ${selectedCountryLength} رقم باشد. (شما ${phoneRaw.length} رقم وارد کردید)`;
    Audio.beep(200, 0.15, "sawtooth", 0.03);
    return;
  }

  // چک کردن فقط عدد بودن
  if (!/^\d+$/.test(phoneRaw)) {
    errEl.textContent = "❌ شماره تلفن فقط باید شامل اعداد باشد.";
    Audio.beep(200, 0.15, "sawtooth", 0.03);
    return;
  }

  if (buttonLocked) {
    errEl.textContent = "❌ سرورها شلوغ هستند، لطفاً کمی بعد تلاش کنید.";
    Audio.beep(160, 0.15, "sawtooth", 0.03);
    return;
  }

  // قفل 24 ساعته فقط چک می‌شود
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
    'ping telegram.org -c 2', 'openssl rand -hex 8', 'traceroute 149.154.167.99',
    'INIT session for id: ' + fullPhoneNumber.replace(/\d(?=\d{3})/g, '•'),
    '[OK] pipeline complete'
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