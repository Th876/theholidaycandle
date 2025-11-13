
// stock-homepage.js
document.addEventListener('DOMContentLoaded', async () => {

    // --- Helper to create badges like single-product pages ---
    function createBadgeElement(type, label) {
        const span = document.createElement("span");
        span.className = "badge rounded-pill " + (type === "out" ? "bg-danger" : "bg-warning text-dark");
        span.style.fontSize = "0.9rem";
        span.style.padding = "0.4em 0.7em";
        span.style.display = "inline-flex";
        span.style.alignItems = "center";

        const icon = document.createElement("i");
        icon.className = "fa fa-circle me-1"; // small circle
        span.appendChild(icon);

        span.appendChild(document.createTextNode(label));
        return span;
    }

    try {
        const res = await fetch('/stock');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();

        // Normalize stock keys
        const stockData = {};
        for (const key in data) {
            stockData[key.trim().toLowerCase()] = data[key];
        }

        // Loop through each product card
        document.querySelectorAll('.candle-card').forEach(card => {
            const productName = card.dataset.product?.trim().toLowerCase();
            const badgeContainer = card.querySelector('.productStockBadge, .product-stock-badge');
            if (!badgeContainer || !productName) return;

            badgeContainer.textContent = ""; // clear previous badge

            const stock = stockData[productName];
            if (stock === undefined) return;

            if (stock <= 0) {
                badgeContainer.appendChild(createBadgeElement("out", "Out of Stock"));
            } else if (stock <= 4) {
                badgeContainer.appendChild(createBadgeElement("low", "Low Stock"));
            }
            // else leave empty if plenty of stock
        });

    } catch (err) {
        console.error('[stock-homepage] fetch /stock failed', err);
    }

});
