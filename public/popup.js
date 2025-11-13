document.addEventListener("DOMContentLoaded", () => {
    const popup = document.getElementById("giftPopup");
    const closeBtn = document.getElementById("closePopup");
    const emailInput = document.getElementById("emailInput");
    const revealBtn = document.getElementById("revealGiftBtn");
    const popupInner = document.getElementById("popupInner");
    const consentCheckbox = document.getElementById("promoConsent");

    // Create a validation message element inside popup
    let validationMsg = document.createElement("p");
    validationMsg.style.color = "red";
    validationMsg.style.fontSize = "0.95rem";
    validationMsg.style.marginTop = "8px";
    validationMsg.style.display = "none";
    popupInner.appendChild(validationMsg);

    // Show popup once per user
    const popupShown = localStorage.getItem("popupShown");
    const subscribed = localStorage.getItem("userSubscribed");

    if (!popupShown && !subscribed) {
        document.addEventListener("mouseleave", (e) => {
            if (e.clientY < 0 && !localStorage.getItem("popupShown")) {
                showPopup();
                localStorage.setItem("popupShown", "true");
            }
        });
    }

    function showPopup() {
        popup.style.display = "flex";
        document.body.classList.add("popup-open");
    }

    function closePopup() {
        popup.style.display = "none";
        document.body.classList.remove("popup-open");
    }

    closeBtn.addEventListener("click", closePopup);

    // Glitter animation
    function createGlitter() {
        for (let i = 0; i < 150; i++) {
            const g = document.createElement("div");
            g.classList.add("glitter");
            g.style.left = Math.random() * window.innerWidth + "px";
            g.style.top = Math.random() * window.innerHeight + "px";
            document.body.appendChild(g);
            setTimeout(() => g.remove(), 2000);
        }
    }

    // Handle Reveal Click
    revealBtn.addEventListener("click", async () => {
        const email = emailInput.value.trim();

        // ✅ Check if checkbox is checked
        if (!consentCheckbox.checked) {
            validationMsg.textContent = "You must agree to receive promotional emails to reveal your gift.";
            validationMsg.style.display = "block";
            return;
        }

        // Regex validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.(com|net|org|edu|co|us|ca|uk|io|gov)$/i;

        if (!email) {
            validationMsg.textContent = "Please enter your email address.";
            validationMsg.style.display = "block";
            return;
        } else if (!emailRegex.test(email)) {
            validationMsg.textContent = "Please enter a valid email address.";
            validationMsg.style.display = "block";
            return;
        }

        validationMsg.style.display = "none";

        try {
            const res = await fetch("/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (data.success) {
                createGlitter();
                localStorage.setItem("userSubscribed", "true");

                // ✅ Replace innerHTML with safe DOM creation
                popupInner.innerHTML = ""; // clear old content

                const heading = document.createElement("h2");
                heading.className = "surprise-heading";
                heading.textContent = "You’re on the list!";

                const paragraph = document.createElement("p");
                paragraph.textContent = "Watch your inbox for early access and surprises.";

                popupInner.appendChild(heading);
                popupInner.appendChild(paragraph);

            } else if (data.message === "Email already exists.") {
                validationMsg.textContent = "This email is already subscribed. Please use a different one.";
                validationMsg.style.display = "block";
            } else {
                validationMsg.textContent = "Something went wrong. Please try again.";
                validationMsg.style.display = "block";
            }
        } catch (err) {
            console.error(err);
            validationMsg.textContent = "Server error. Please try again later.";
            validationMsg.style.display = "block";
        }
    });
});
