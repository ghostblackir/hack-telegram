// لیست زبان‌های پشتیبانی شده سیستم شما
const systemSupportedLanguages = ['fa', 'en', 'ar', 'ru', 'uk', 'fr', 'tr', 'es', 'de', 'zh-CN', 'uz', 'sr'];

// ۱. این تابع را برای مقداردهی اولیه گوگل ترنسلیت به پنجره اصلی وصل می‌کنیم
window.googleTranslateElementInit = function() {
    new google.translate.TranslateElement({
        pageLanguage: 'fa',
        includedLanguages: 'fa,en,ar,ru,uk,fr,tr,es,de,zh-CN,uz,sr',
        autoDisplay: false
    }, 'google_translate_element');
    
    // به محض اینکه گوگل لود شد، بررسی کن ببین کاربر قبلا چه زبانی انتخاب کرده بود یا زبان سیستمش چیه
    applySavedLanguage();
};
  
// ۲. تابع اعمال جهت صفحه و ست کردن کامبوی گوگل
function applySavedLanguage() {
    let savedLang = localStorage.getItem("selected_lang");

    // ⚡️ بخش هوشمند: اگر کاربر بار اولش است و هیچ زبانی انتخاب نکرده (مقدار localStorage خالی است)
    if (!savedLang) {
        let browserLang = navigator.language || navigator.userLanguage;
        if (browserLang) {
            let shortLang = browserLang.split('-')[0]; // تبدیل کدهایی مثل en-US به en
            
            if (browserLang === 'zh-CN' || browserLang === 'zh') {
                savedLang = 'zh-CN';
            } else if (systemSupportedLanguages.includes(shortLang)) {
                savedLang = shortLang;
            } else {
                savedLang = 'en'; // اگر زبان سیستمش جزو لیست ما نبود، برود روی انگلیسی عمومی
            }
            // ذخیره زبانی که خودکار تشخیص دادیم در حافظه
            localStorage.setItem("selected_lang", savedLang);
        } else {
            savedLang = "fa"; // زاپاس آخر
            localStorage.setItem("selected_lang", "fa");
        }
    }

    // تنظیم جهت صفحه بر اساس زبان نهایی
    document.documentElement.dir =
        (savedLang === "fa" || savedLang === "ar") ? "rtl" : "ltr";

    document.documentElement.lang = savedLang;

    // ترفند خودت: اگر فارسی بود ترجمه گوگل را کامل حذف کن و کوکی بزن
    if (savedLang === "fa") {
        // برای اینکه توی لوپ رفرش نیفتیم، چک می‌کنیم اگر کوکی از قبل درست ست نشده بود رفرش کند
        if (!document.cookie.includes("googtrans=/fa/fa")) {
            document.cookie = "googtrans=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
            document.cookie = "googtrans=/fa/fa;path=/";
            setTimeout(() => location.reload(), 100);
        }
        return;
    }

    // فرستادن مقدار به گوگل برای زبان‌های غیرفارسی
    const wait = setInterval(() => {
        const combo = document.querySelector(".goog-te-combo");

        if (!combo) return;

        clearInterval(wait);

        if (combo.value !== savedLang) {
            combo.value = savedLang;
            combo.dispatchEvent(new Event("change"));
        }

    }, 100);
}
  
// ۳. لود کردن داینامیک اسکریپت گوگل ترنسلیت در تمام صفحات بدون نیاز به تگ هاردکد شده
(function() {
    const script = document.createElement("script");
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.head.appendChild(script);
})();