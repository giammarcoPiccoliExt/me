document.addEventListener("DOMContentLoaded", function () {
    let tocSidebar = document.querySelector('.md-sidebar--secondary');
    if (!tocSidebar) return;

    tocSidebar.querySelectorAll(".md-nav__item").forEach(item => {
        let subList = item.querySelector(".md-nav__list");
        let link = item.querySelector(".md-nav__link");

        if (subList) {
            item.classList.add("has-children");

            link.addEventListener("click", function (event) {
                event.preventDefault();

                let targetId = link.getAttribute("href");
                if (targetId) {
                    let targetSection = document.querySelector(targetId);
                    if (targetSection) {
                        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }

                subList.style.display = subList.style.display === "block" ? "none" : "block";
                item.classList.toggle("md-nav__item--active");
            });
        }
    });
});
