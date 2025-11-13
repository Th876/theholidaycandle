
(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");

    if (!sessionId) {
        document.getElementById("customer-email").textContent = "Order details not found.";
        return;
    }

    try {
        const response = await fetch(`/checkout-session?session_id=${sessionId}`);
        const session = await response.json();
        console.log("Session response:", session);

        // ✅ Email
        document.getElementById("customer-email").textContent =
            session.customer_email || "Unavailable";

        // ✅ Total
        const totalAmount = session.total ? (session.total / 100).toFixed(2) : "0.00";
        document.getElementById("order-total").textContent = `$${totalAmount}`;

        // ✅ Delivery Method
        const deliveryMethod = session.metadata?.delivery_method || "N/A";
        document.getElementById("delivery-method").textContent = deliveryMethod;

    } catch (error) {
        console.error("Error fetching session:", error);
    }

    // ✅ Clear cart after checkout
    localStorage.removeItem('cart');
    // updateCartCount();
    if (typeof updateCartCount === 'function') {
        updateCartCount();
    }

})();
