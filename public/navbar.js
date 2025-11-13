const navbarCartBtn = document.getElementById('navbarCart');
if (navbarCartBtn) {
    navbarCartBtn.addEventListener('click', () => {
        window.location.href = 'cart.html';
    });
}
