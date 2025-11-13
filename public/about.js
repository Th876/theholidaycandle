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



