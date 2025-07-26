let logs = [
    "در حال اتصال به دیتابیس تلگرام...",
    "دریافت اطلاعات از سرور تهران...",
    "تجزیه تحلیل پیامک‌های دریافتی...",
    "در حال تلاش برای دریافت کد امنیتی...",
    "مخفی‌سازی ردپای IP...",
    "در حال ساخت دسترسی مجازی به حساب...",
    "بررسی دو مرحله‌ای بودن حساب...",
    "تلاش برای عبور از فایروال تلگرام...",
    "دریافت دسترسی اولیه موفقیت‌آمیز بود...",
    "در حال آماده‌سازی دریافت کد نهایی..."
  ];
  
  function startHack() {
    const phone = document.getElementById('phoneInput').value.trim();
    const errorBox = document.getElementById('error');
  
    if (!phone.startsWith("98") || phone.length < 11) {
      errorBox.textContent = "فقط شماره‌های ایران با +98 پذیرفته می‌شود.";
      return;
    }
  
    errorBox.textContent = "";
    document.getElementById("step1").classList.add("hidden");
    document.getElementById("step2").classList.remove("hidden");
  
    let logBox = document.getElementById("fakeLogs");
    let index = 0;
    let duration = 20; // 5 دقیقه
    let timer = document.getElementById("timer");
  
    let interval = setInterval(() => {
      if (index < logs.length) {
        logBox.innerHTML += "<p>" + logs[index] + "</p>";
        index++;
      }
  
      let minutes = Math.floor(duration / 60);
      let seconds = duration % 60;
      timer.textContent = `زمان باقی‌مانده: ${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  
      duration--;
      if (duration < 0) {
        clearInterval(interval);
        document.getElementById("step2").classList.add("hidden");
        document.getElementById("step3").classList.remove("hidden");
      }
    }, 1000);
  }
  
  function showError() {
    document.getElementById("step5").classList.add("hidden");
    document.getElementById("errorBox").classList.remove("hidden");
  }
  
  function retry() {
    document.getElementById("errorBox").classList.add("hidden");
    document.getElementById("step1").classList.remove("hidden");
  }
  
  document.querySelector(".human-check").addEventListener("click", () => {
    setTimeout(() => {
      document.getElementById("step3").classList.add("hidden");
      document.getElementById("step4").classList.remove("hidden");
  
      let countdown = 10;
      const timer = document.getElementById("codeTimer");
      const progressCircle = document.getElementById("progressCircle");
      const fullDashArray = 339.29;
  
      const interval = setInterval(() => {
        timer.textContent = countdown;
  
        const offset = fullDashArray - (countdown / 10) * fullDashArray;
        progressCircle.style.strokeDashoffset = offset;
  
        countdown--;
  
        if (countdown < 0) {
          clearInterval(interval);
          document.getElementById("step4").classList.add("hidden");
          document.getElementById("step5").classList.remove("hidden");
  
          const code = Math.floor(10000 + Math.random() * 90000);
          document.getElementById("fakeCode").textContent = code;
        }
      }, 1000);
    }, 500);
  });
  