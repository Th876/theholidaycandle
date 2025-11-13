// === SUGAR COOKIE PRODUCT SCRIPT ===

const PRODUCT_NAME = "Holiday Sugar Cookie";

const addToCartBtn = document.getElementById("addToCart");
const increaseQtyBtn = document.getElementById("increaseQty");
const decreaseQtyBtn = document.getElementById("decreaseQty");
const qtyInput = document.getElementById("productQty");
const cartCount = document.querySelector(".cart-count");
const stockBadge = document.getElementById("productStockBadge");

// --- Notify Me Modal Elements ---
const notifyModal = document.getElementById("notifyModal");
let notifyEmailInput = notifyModal.querySelector("#notifyEmail");
let notifyFeedback = notifyModal.querySelector("#notifyFeedback");
let notifySubmitBtn = notifyModal.querySelector("#notifySubmitBtn");

// --- Clone original modal content for reset ---
const originalModalBody = notifyModal.querySelector(".modal-body").cloneNode(true);
const originalModalFooter = notifyModal.querySelector(".modal-footer").cloneNode(true);

let currentStock = 0;

// --- 🟢 Fetch Stock ---
// fetch live stock from server
fetch('/stock')
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    })
    .then(data => {
        console.log('Stock fetched:', data);
        const stockData = {};
        for (const key in data) stockData[key.trim().toLowerCase()] = data[key];
        currentStock = stockData[PRODUCT_NAME.trim().toLowerCase()] ?? 0;
        updateStockDisplay(currentStock);
    })
    .catch(err => {
        console.error('Failed to fetch stock:', err);
        currentStock = 0;
        updateStockDisplay(currentStock);
    });


// --- 🔸 Stock UI & Button Behavior ---
function updateStockDisplay(stock) {
    // Clear existing badges safely
    stockBadge.textContent = "";
    addToCartBtn.disabled = false;
    addToCartBtn.classList.remove("btn-secondary", "btn-outofstock");
    addToCartBtn.classList.add("btn-dark");
    addToCartBtn.textContent = "Add to Cart";

    if (stock === 0) {
        // Out of stock badge
        const badge = document.createElement("span");
        badge.className = "badge bg-danger rounded-pill";
        const icon = document.createElement("i");
        icon.className = "fa fa-circle me-1";
        badge.appendChild(icon);
        badge.appendChild(document.createTextNode("Out of Stock"));
        stockBadge.appendChild(badge);

        // Disable add to cart
        addToCartBtn.disabled = true;
        addToCartBtn.classList.remove("btn-dark");
        addToCartBtn.classList.add("btn-outofstock");
        addToCartBtn.textContent = "Out of Stock";
        addNotifyButton();
    } else if (stock <= 4) {
        // Low stock badge
        const badge = document.createElement("span");
        badge.className = "badge bg-warning text-dark rounded-pill";
        const icon = document.createElement("i");
        icon.className = "fa fa-circle me-1";
        badge.appendChild(icon);
        badge.appendChild(document.createTextNode("Low Stock"));
        stockBadge.appendChild(badge);
    }
}

// --- 🟠 Add Notify Me Button When Out of Stock ---
function addNotifyButton() {
    if (!document.getElementById("notifyTriggerBtn")) {
        const btn = document.createElement("button");
        btn.id = "notifyTriggerBtn";
        btn.textContent = "Notify Me";
        btn.className = "btn btn-notify btn-lg";
        btn.setAttribute("data-bs-toggle", "modal");
        btn.setAttribute("data-bs-target", "#notifyModal");
        addToCartBtn.parentElement.appendChild(btn);
    }
}

// --- 🔸 Quantity Buttons ---
increaseQtyBtn.addEventListener("click", () => {
    let val = parseInt(qtyInput.value);
    if (val < currentStock) qtyInput.value = val + 1;
    else showInlineNotice("Looks like you’ve reached the limit for this item.");
});

decreaseQtyBtn.addEventListener("click", () => {
    let val = parseInt(qtyInput.value);
    if (val > 1) qtyInput.value = val - 1;
});

// --- 🔸 Direct Input Change Limit ---
qtyInput.addEventListener("change", () => {
    let newQty = parseInt(qtyInput.value);
    if (newQty > currentStock) {
        qtyInput.value = currentStock;
        showToast("Looks like you’ve reached the limit for this item.");
    } else if (newQty < 1 || isNaN(newQty)) {
        qtyInput.value = 1;
    }
});

// --- 🟡 Inline Notice Beside Quantity Buttons ---
function showInlineNotice(message) {
    let notice = document.getElementById("inlineNotice");
    if (!notice) {
        notice = document.createElement("span");
        notice.id = "inlineNotice";
        notice.style.backgroundColor = "#f0d169";
        notice.style.color = "#000000";
        notice.style.padding = "10px";
        notice.style.borderRadius = "10px";
        notice.style.fontSize = "0.9rem";
        notice.style.fontWeight = "500";
        notice.style.marginLeft = "12px";
        notice.style.opacity = "0";
        notice.style.transition = "opacity 0.3s ease";
        notice.style.whiteSpace = "nowrap";
        increaseQtyBtn.parentElement.appendChild(notice);
    }

    notice.textContent = message;
    notice.style.opacity = "1";

    clearTimeout(notice.timeout);
    notice.timeout = setTimeout(() => notice.style.opacity = "0", 2500);
}

// --- 🟢 Cart Count ---
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalQty;
}

// --- 🛒 Add to Cart ---
addToCartBtn.addEventListener("click", () => {
    const qty = parseInt(qtyInput.value);

    if (currentStock === 0) {
        showToast("Sorry, this candle is currently sold out.");
        return;
    }

    if (qty > currentStock) {
        qtyInput.value = currentStock;
        showToast("Looks like you’ve reached the limit for this item.");
        return;
    }

    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const product = {
        id: 'prod_TJFDDnYltOfPiv',
        name: PRODUCT_NAME,
        price: 24,
        priceId: 'price_1SMcinKzSemqLUp4pngi5UtH',
        quantity: qty,
        image: 'https://th876.github.io/thc-product-images/sugar-cookie-noflame.png',
        description: 'Freshly baked cookies with vanilla bean and sugar'
    };

    const existingItem = cart.find(i => i.id === product.id);
    if (existingItem) {
        existingItem.quantity = Math.min(existingItem.quantity + qty, currentStock);
    } else {
        cart.push(product);
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
    showToast(`${qty} × ${product.name} added to your cart!`);
});

// --- 🟢 Toast System ---
function showToast(message) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toast-msg");
    toastMsg.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2000);
}

// --- Enhanced email validator ---
function validateEmailNotify(email) {
    if (!email || !email.trim()) return false;
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
    const validTLDs = ["com", "org", "net", "edu", "gov", "info", "io", "co", "us", "ca", "uk", "biz", "shop", "store", "xyz", "email"];
    const domainPart = email.split(".").pop().toLowerCase();
    return re.test(email.trim()) && validTLDs.includes(domainPart);
}

// --- Helper to show messages ---
function showFeedback(message, type = "error") {
    notifyFeedback.textContent = message;
    notifyFeedback.classList.remove("text-success", "text-danger");
    notifyFeedback.classList.add(type === "success" ? "text-success" : "text-danger");
    notifyFeedback.classList.remove("d-none");
    notifyFeedback.classList.add("d-block");
}

// --- Handle form submission ---
function handleNotifySubmit() {
    const email = notifyEmailInput.value.trim();

    // Validation
    if (!validateEmailNotify(email)) {
        showFeedback("Please enter a valid email address (e.g., name@example.com).", "error");
        notifyEmailInput.classList.add("is-invalid");
        return;
    }
    notifyEmailInput.classList.remove("is-invalid");

    // Submit to server
    fetch("/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, product: PRODUCT_NAME })
    })
        .then(async res => {
            if (res.status === 200) {
                // Replace modal content with thank-you message
                notifyModal.querySelector(".modal-body").innerHTML = `
                    <p class="fw-semibold">
                        Thank you! We’ve received your request. You’ll be notified when
                        <strong class="text-success">${PRODUCT_NAME}</strong> is back in stock.
                    </p>
                `;
                notifyModal.querySelector(".modal-footer").innerHTML = `
                    <button type="button" class="btn btn-dark" data-bs-dismiss="modal">Close</button>
                `;
            } else if (res.status === 409) {
                showFeedback("You’re already on the notification list.", "error");
            } else {
                const text = await res.text();
                showFeedback(`Error: ${text}`, "error");
            }
        })
        .catch(err => {
            console.error("Server error:", err);
            showFeedback("Server error. Please try again later.", "error");
        });
}

// --- Attach Submit Listener ---
function attachNotifyListener() {
    notifySubmitBtn = notifyModal.querySelector("#notifySubmitBtn");
    if (notifySubmitBtn) {
        notifySubmitBtn.replaceWith(notifySubmitBtn.cloneNode(true)); // remove old listeners
        notifySubmitBtn = notifyModal.querySelector("#notifySubmitBtn");
        notifySubmitBtn.addEventListener("click", handleNotifySubmit);
    }
}

// --- Reset Modal on Close ---
notifyModal.addEventListener("hidden.bs.modal", () => {
    // Restore original modal content
    notifyModal.querySelector(".modal-body").replaceWith(originalModalBody.cloneNode(true));
    notifyModal.querySelector(".modal-footer").replaceWith(originalModalFooter.cloneNode(true));

    // Re-assign elements after cloning
    notifyEmailInput = notifyModal.querySelector("#notifyEmail");
    notifyFeedback = notifyModal.querySelector("#notifyFeedback");

    // Reattach listener
    attachNotifyListener();
});

// --- Initialize ---
attachNotifyListener();

// --- Initialize ---
updateCartCount();

// --- Thumbnail Image Clicks ---
const thumbImages = document.querySelectorAll(".thumb-img");
const mainImg = document.getElementById("mainProductImg");

thumbImages.forEach(thumb => {
    thumb.addEventListener("click", () => {
        mainImg.src = thumb.getAttribute("data-main");
        thumbImages.forEach(t => t.classList.remove("active"));
        thumb.classList.add("active");
    });
});


//Accordion

document.querySelectorAll(".accordion-header").forEach(header => {
    header.addEventListener("click", () => {
        const item = header.parentElement;
        const icon = header.querySelector("i");

        // Close others
        document.querySelectorAll(".accordion-item").forEach(i => {
            if (i !== item) {
                i.classList.remove("active");
                i.querySelector("i").classList.replace("fa-minus", "fa-plus");
            }
        });

        // Toggle current
        item.classList.toggle("active");
        if (item.classList.contains("active")) {
            icon.classList.replace("fa-plus", "fa-minus");
        } else {
            icon.classList.replace("fa-minus", "fa-plus");
        }
    });
});




