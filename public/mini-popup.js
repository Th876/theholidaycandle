document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const miniBox = document.getElementById("miniGiftBox");
    const miniIcon = document.getElementById("miniGiftIcon");
    const miniForm = document.getElementById("miniGiftForm");
    const miniDismissBtn = document.querySelector(".mini-dismiss-btn");

    let miniEmailInput = document.getElementById("miniEmailInput");
    let miniConsent = document.getElementById("miniPromoConsent");
    let miniBtn = document.getElementById("miniRevealBtn");
    let miniMsg = document.getElementById("miniValidationMsg");

    let dismissed = false; // track if user clicked ❌

    // Initially hide the mini gift box
    miniBox.style.display = "none";

    // Show box after scroll 400px, only if not dismissed
    window.addEventListener("scroll", () => {
        if (!dismissed && window.scrollY > 400) {
            miniBox.style.display = "block";
            // Reset form to original each time it appears
            resetMiniGiftbox();
            miniForm.classList.add("d-none"); // form hidden initially
        }
    });

    // Email validation
    function validateEmail(email) {
        if (!email || !email.trim()) return false;
        const re = /^[^\s@]+@[^\s@]+\.(com|net|org|edu|co|us|ca|uk|io|gov)$/i;
        return re.test(email.trim());
    }

    // Reset form content (fresh form)
    function resetMiniGiftbox() {
        miniForm.innerHTML = `
            <h4>A Sparkling Surprise Awaits!</h4>
            <input type="email" id="miniEmailInput" placeholder="Enter your email" required />
            <div class="form-check mt-1">
                <input type="checkbox" class="form-check-input" id="miniPromoConsent">
                <label class="form-check-label mini-promo-text" for="miniPromoConsent">I agree to receive promotional emails</label>
            </div>
            <button id="miniRevealBtn">Reveal My Gift</button>
            <p id="miniValidationMsg" class="text-danger small mt-1" style="display:none;"></p>
        `;
        miniEmailInput = document.getElementById("miniEmailInput");
        miniConsent = document.getElementById("miniPromoConsent");
        miniBtn = document.getElementById("miniRevealBtn");
        miniMsg = document.getElementById("miniValidationMsg");

        miniBtn.addEventListener("click", handleMiniSubmit);
    }

    // Handle form submission
    async function handleMiniSubmit() {
        const email = miniEmailInput.value.trim();

        if (!miniConsent.checked) {
            miniMsg.textContent = "You must agree to receive promotional emails.";
            miniMsg.style.display = "block";
            return;
        }

        if (!validateEmail(email)) {
            miniMsg.textContent = "Please enter a valid email address.";
            miniMsg.style.display = "block";
            return;
        }

        miniMsg.style.display = "none";

        try {
            const res = await fetch("/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (data.success) {
                miniForm.innerHTML = `
                    <h3>You're on the list!</h3>
                    <p>Watch your inbox for surprises.</p>
                `;
            } else if (data.message === "Email already exists.") {
                miniMsg.textContent = "This email is already subscribed.";
                miniMsg.style.display = "block";
            } else {
                miniMsg.textContent = "Something went wrong. Please try again.";
                miniMsg.style.display = "block";
            }
        } catch (err) {
            console.error(err);
            miniMsg.textContent = "Server error. Please try again later.";
            miniMsg.style.display = "block";
        }
    }

    // Click the gift icon to toggle form
    miniIcon.addEventListener("click", () => {
        if (miniForm.classList.contains("d-none")) {
            resetMiniGiftbox();
        }
        miniForm.classList.toggle("d-none");
    });

    // Click ❌ to dismiss box for this session
    miniDismissBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        miniBox.style.display = "none";
        dismissed = true; // prevent re-showing until reload
    });

    // Initialize button
    miniBtn.addEventListener("click", handleMiniSubmit);
});
