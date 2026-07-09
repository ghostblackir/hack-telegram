(function () {
    const style = document.createElement("style");
    style.innerHTML = `
    .custom-alert-overlay{
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.7);
        display:flex;
        justify-content:center;
        align-items:center;
        z-index:999999;
    }

    .custom-alert-box{
        background:#111;
        color:#fff;
        padding:20px;
        border-radius:12px;
        width:90%;
        max-width:400px;
        text-align:center;
        border:2px solid #00ff95;
        box-shadow:0 0 20px #00ff95;
        font-family:tahoma;
    }

    .custom-alert-btn{
        margin-top:15px;
        padding:10px 25px;
        border:none;
        border-radius:8px;
        cursor:pointer;
        background:#00ff95;
        color:#000;
        font-weight:bold;
    }
    `;
    document.head.appendChild(style);

    window.alert = function(message){
        const overlay = document.createElement("div");
        overlay.className = "custom-alert-overlay";

        overlay.innerHTML = `
            <div class="custom-alert-box">
                <div>${message}</div>
                <button class="custom-alert-btn">باشه</button>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector("button").onclick = () => {
            overlay.remove();
        };
    };
})();