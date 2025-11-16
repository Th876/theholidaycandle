async function fetchStock() {
    const res = await fetch('/stock');
    const data = await res.json();
    const tbody = document.querySelector('#stockTable tbody');
    tbody.innerHTML = '';

    // data now preserves original capitalization
    for (const productName in data) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${productName}</td>
            <td><input type="number" value="${data[productName]}" min="0" /></td>
            <td><button class="update btn btn-success btn-sm">Update</button></td>
        `;

        const inputEl = tr.querySelector('input');
        const updateBtn = tr.querySelector('.update');

        updateBtn.addEventListener('click', async () => {
            const newStock = Number(inputEl.value);

            try {
                const res = await fetch('/admin/update-stock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: productName, stock: newStock }),
                    credentials: 'same-origin'
                });

                const result = await res.json();

                if (result.success) {
                    showToast(`Updated ${productName} to ${newStock}`);
                    fetchStock(); // refresh table so input reflects new value
                } else {
                    showToast(result.message || 'Error updating stock', true);
                }
            } catch (err) {
                console.error(err);
                showToast('Server error or not logged in', true);
            }
        });

        tbody.appendChild(tr);
    }
}

// document.getElementById('logoutBtn').addEventListener('click', async () => {
//     await fetch('/admin/logout', { method: 'POST', credentials: 'same-origin' });
//     window.location.href = '/admin/login.html';
// });
document.getElementById('logoutBtn').addEventListener('click', async () => {
    const res = await fetch('/admin/logout', { method: 'POST', credentials: 'same-origin' });
    const result = await res.json();

    if (result.success) {
        // Redirect to the correct login route
        window.location.href = '/admin/login';
    } else {
        showToast('Logout failed', true);
    }
});


// Bootstrap toast
function showToast(message, isError = false) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed top-0 start-50 translate-middle-x p-3';
        document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${isError ? 'danger' : 'toast-custom'} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    container.appendChild(toastEl);
    new bootstrap.Toast(toastEl, { delay: 2000 }).show();
}

fetchStock();
