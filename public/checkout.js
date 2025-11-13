const stripe = Stripe("pk_test_51SK5y3KzSemqLUp4cr9Lhpf09J9fnb3PaqS29ZuLXVaWoOvTmTYMWD4TujH0ddxDyNFGSOSmUanW6HsPqfUOsdlB00xaZg878Y");

(async () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    if (!cart.length) {
        alert('Your cart is empty!');
        window.location.href = '/cart.html';
        return;
    }

    const payload = cart.map(item => ({
        priceId: item.priceId,
        quantity: item.quantity
    }));

    try {
        const response = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: payload }),
        });

        const data = await response.json();

        if (!data.url) throw new Error('No checkout URL returned from server');

        // Redirect user automatically to Stripe Checkout
        window.location.href = data.url;
    } catch (err) {
        console.error('Checkout error:', err);

        // Safely replace body content without innerHTML
        document.body.textContent = ''; // clear existing content safely
        const msg = document.createElement('p');
        msg.style.textAlign = 'center';
        msg.style.marginTop = '50px';
        msg.style.color = 'red';
        msg.textContent = 'Something went wrong. Please try again or contact the merchant.';
        document.body.appendChild(msg);
    }
})();
