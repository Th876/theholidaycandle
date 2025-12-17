// ======= CART LOGIC WITH TOASTS AND STOCK LIMITS =======
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let useLocalPickup = false;
const SHIPPING_COST = 9.99; // default USPS shipping
let productStock = {}; // holds stock data

// ===== FETCH STOCK DATA =====
async function fetchStock() {
    try {
        const res = await fetch('/stock');
        if (!res.ok) throw new Error('Failed to fetch /stock');
        const data = await res.json();
        productStock = data;
    } catch (err) {
        console.error('Failed to fetch stock:', err);
    }
}


// ===== TOAST SYSTEM =====
const toastEl = document.getElementById('cartToast');
const toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 3000 }) : null;
function showToast(message) {
    if (!toastEl || !toast) return;
    toastEl.querySelector('.toast-body').textContent = message;
    toast.show();
}

// ===== CART COUNT =====
function updateCartCount() {
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
}

// ===== SAVE CART =====
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCartPage();
}

// ===== REMOVE ITEM =====
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
}

// ===== UPDATE QUANTITY WITH STOCK CHECK & TOAST =====
function updateQuantity(id, qty) {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    const maxStock = productStock[item.name] || 999;

    if (qty > maxStock) {
        item.quantity = maxStock;
        showToast(`Quantity exceeds our current stock!`);
    } else if (qty < 1 || isNaN(qty)) {
        item.quantity = 1;
        showToast(`Quantity must be at least 1`);
    } else {
        item.quantity = qty;
    }

    saveCart();
}

// ===== RENDER CART PAGE (XSS SAFE) =====
function renderCartPage() {
    const cartContainer = document.getElementById('cartItemsList');
    const subtotalElem = document.getElementById('cartSubtotal');
    const shippingElem = document.getElementById('cartShipping');
    const totalElem = document.getElementById('cartTotal');
    if (!cartContainer || !subtotalElem || !shippingElem || !totalElem) return;

    cartContainer.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        const image = item.image || './images/default.jpg';
        const description = item.description || '';
        const price = Number(item.price) || 0;
        const maxStock = productStock[item.name] || 999;
        const itemTotal = price * item.quantity;
        subtotal += itemTotal;

        // create main container
        const div = document.createElement('div');
        div.className = 'cart-item d-flex align-items-center justify-content-between mb-4 p-3 shadow-sm rounded-3 bg-light';

        const left = document.createElement('div');
        left.className = 'd-flex align-items-center flex-grow-1';

        const img = document.createElement('img');
        img.src = image;
        img.alt = item.name;
        img.className = 'cart-item-img me-3 rounded-3';
        img.style.width = '80px';
        img.style.height = '80px';
        img.style.objectFit = 'cover';

        const details = document.createElement('div');

        const nameEl = document.createElement('h6');
        nameEl.className = 'fw-bold mb-1 text-dark';
        nameEl.textContent = item.name;

        const descEl = document.createElement('p');
        descEl.className = 'text-muted small mb-2';
        descEl.textContent = description;

        const priceEl = document.createElement('div');
        priceEl.className = 'text-secondary small mb-1';
        priceEl.textContent = `$${price.toFixed(2)} each`;

        const qtyDiv = document.createElement('div');
        qtyDiv.innerHTML = `Qty: `;

        const qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.min = '1';
        qtyInput.max = maxStock;
        qtyInput.value = item.quantity;
        qtyInput.className = 'item-qty rounded border-1 text-center';
        qtyInput.dataset.id = item.id;
        qtyInput.style.width = '60px';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-sm btn-outline-danger ms-2 remove-btn';
        removeBtn.dataset.id = item.id;
        removeBtn.textContent = 'Remove';

        qtyDiv.appendChild(qtyInput);
        qtyDiv.appendChild(removeBtn);

        details.appendChild(nameEl);
        details.appendChild(descEl);
        details.appendChild(priceEl);
        details.appendChild(qtyDiv);

        left.appendChild(img);
        left.appendChild(details);

        const right = document.createElement('div');
        right.className = 'text-end fw-semibold text-dark';
        right.textContent = `$${itemTotal.toFixed(2)}`;

        div.appendChild(left);
        div.appendChild(right);

        cartContainer.appendChild(div);
    });

    const shipping = useLocalPickup ? 0 : SHIPPING_COST;
    subtotalElem.textContent = subtotal.toFixed(2);
    shippingElem.textContent = useLocalPickup
        ? 'Shipping: $0 (Local Pickup — Free)'
        : `Shipping: $${shipping.toFixed(2)} (USPS Priority Mail)`;
    totalElem.textContent = (subtotal + shipping).toFixed(2);

    // Attach events
    document.querySelectorAll('.remove-btn').forEach(btn =>
        btn.addEventListener('click', () => removeFromCart(btn.dataset.id))
    );
    document.querySelectorAll('.item-qty').forEach(input =>
        input.addEventListener('change', () => updateQuantity(input.dataset.id, Number(input.value)))
    );
}

// ===== DELIVERY OPTIONS =====
document.querySelectorAll('input[name="deliveryOption"]').forEach(radio => {
    radio.addEventListener('change', () => {
        const code = document.getElementById('pickupCodeInput')?.value.trim().toUpperCase() || '';
        useLocalPickup = radio.value === 'pickup';
        renderCartPage();
    });
});

document.getElementById('pickupCodeInput')?.addEventListener('input', () => {
    const code = document.getElementById('pickupCodeInput')?.value.trim().toUpperCase() || '';
    const pickupRadio = document.getElementById('localPickup');
    if (pickupRadio.checked) useLocalPickup = code === 'HOLIDAYSTAR25';
    renderCartPage();
});

// ===== CHECKOUT =====
document.getElementById('checkoutButton')?.addEventListener('click', async () => {
    if (!cart.length) {
        showToast('Your cart is empty!');
        return;
    }

    // Check stock before checkout
    for (const item of cart) {
        const maxStock = productStock[item.name] || 999;
        if (item.quantity > maxStock) {
            showToast(`Cannot checkout: only ${maxStock} × ${item.name} available.`);
            return;
        }
    }

    const pickupRadio = document.getElementById('localPickup');
    const pickupCode = document.getElementById('pickupCodeInput')?.value.trim().toUpperCase() || '';

    if (pickupRadio.checked && pickupCode !== 'HOLIDAYSTAR25') {
        showToast('Invalid Local Pickup code. Please enter the correct code.');
        return;
    }

    const payload = cart.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        image: item.image || '',
        price: Number(item.price),
        quantity: Number(item.quantity)
    }));

    const deliveryMethod = pickupRadio.checked ? 'Local Pickup' : 'USPS Priority Mail';

    try {
        const res = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: payload, deliveryMethod })
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}: ${await res.text()}`);
        const data = await res.json();  // now safe, will only parse valid JSON

        // const res = await fetch('/create-checkout-session', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ items: payload, deliveryMethod })
        // });
        // const data = await res.json();
        if (!data.url) throw new Error('No checkout URL returned');
        window.location.href = data.url;
    } catch (err) {
        console.error('Checkout failed:', err);
        showToast('Sorry, the quantity you requested is not available.');
    }
});

// ===== INIT =====
(async function initCart() {
    await fetchStock();
    updateCartCount();
    renderCartPage();
})();
