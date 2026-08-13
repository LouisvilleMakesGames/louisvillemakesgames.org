const topBar = document.querySelector("[data-top-bar]");
const sectionNav = document.querySelector("[data-section-nav]");
const sectionNavToggle = document.querySelector("[data-section-nav-toggle]");
const sectionNavLinks = document.querySelector("[data-section-nav-links]");
const navAnchorLinks = document.querySelectorAll("[data-nav-link]");
const revealItems = document.querySelectorAll(".reveal");
const motionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const galleryFigures = document.querySelectorAll(".media-grid .placeholder-photo, .gallery-grid .placeholder-photo");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxCaption = document.getElementById("lightbox-caption");
const lightboxClose = document.getElementById("lightbox-close");
const lightboxPrev = document.getElementById("lightbox-prev");
const lightboxNext = document.getElementById("lightbox-next");

let activeIndex = 0;
const galleryItems = [];

function updateTopBar() {
  if (!topBar) return;
  topBar.classList.toggle("is-scrolled", window.scrollY > 8);
}

function syncStickyOffsets() {
  const topBarHeight = topBar?.offsetHeight || 0;
  const sectionNavHeight = sectionNav?.offsetHeight || 0;
  document.documentElement.style.setProperty("--topbar-height", `${topBarHeight}px`);
  document.documentElement.style.setProperty("--sectionnav-height", `${sectionNavHeight}px`);
}

function setupStickyObservers() {
  if (!("ResizeObserver" in window)) return;

  const observer = new ResizeObserver(() => {
    syncStickyOffsets();
  });

  if (topBar) observer.observe(topBar);
  if (sectionNav) observer.observe(sectionNav);
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function smoothScrollTo(targetY) {
  const startY = window.scrollY;
  const distance = targetY - startY;
  const duration = 780;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeOutBack(t);
    window.scrollTo(0, startY + distance * eased);
    if (t < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function closeMobileSectionNav() {
  if (!sectionNavLinks || !sectionNavToggle) return;
  sectionNavLinks.classList.remove("is-open");
  sectionNavToggle.setAttribute("aria-expanded", "false");
}

updateTopBar();
syncStickyOffsets();
setupStickyObservers();
window.addEventListener("scroll", updateTopBar, { passive: true });
window.addEventListener("resize", syncStickyOffsets);
window.addEventListener("load", syncStickyOffsets);

sectionNavToggle?.addEventListener("click", () => {
  if (!sectionNavLinks || !sectionNavToggle) return;
  const willOpen = !sectionNavLinks.classList.contains("is-open");
  sectionNavLinks.classList.toggle("is-open", willOpen);
  sectionNavToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
  syncStickyOffsets();
});

navAnchorLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    if (!targetId || !targetId.startsWith("#")) return;
    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    const offset = (topBar?.offsetHeight || 0) + (sectionNav?.offsetHeight || 0) + 12;
    const targetY = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
    smoothScrollTo(targetY);
    closeMobileSectionNav();
  });
});

if (!motionReduced && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.12,
    }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

function showLightboxItem(index) {
  if (!galleryItems.length) return;
  activeIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[activeIndex];
  lightboxImage.src = item.src;
  lightboxImage.alt = item.alt;
  if (lightboxCaption) {
    lightboxCaption.textContent = item.caption;
  }
}

function openLightbox(index) {
  showLightboxItem(index);
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
}

function closeLightbox() {
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
}

function handleLightboxKeydown(event) {
  if (!lightbox.classList.contains("is-open")) return;

  const key = event.key.toLowerCase();
  if (key === "escape") {
    closeLightbox();
    return;
  }

  if (key === "arrowright" || key === "d") {
    showLightboxItem(activeIndex + 1);
  }

  if (key === "arrowleft" || key === "a") {
    showLightboxItem(activeIndex - 1);
  }
}

document.addEventListener("click", (event) => {
  if (!sectionNav || !sectionNavLinks || !sectionNavToggle) return;
  if (sectionNavLinks.classList.contains("is-open") && !sectionNav.contains(event.target)) {
    closeMobileSectionNav();
  }
});

if (lightbox && lightboxImage && galleryFigures.length) {
  galleryFigures.forEach((figure, index) => {
    if (figure.hasAttribute("hidden")) return;

    const img = figure.querySelector("img");
    if (!img || !img.src) return;

    const altText = (img.getAttribute("alt") || "").trim();
    const figureLabel = (figure.getAttribute("aria-label") || "").trim();
    const captionText = altText || figureLabel || "Gallery image";

    galleryItems.push({
      src: img.src,
      alt: altText || "Gallery image",
      caption: captionText,
    });
    figure.setAttribute("tabindex", "0");
    figure.setAttribute("role", "button");
    figure.setAttribute("aria-label", `Open image ${index + 1} in gallery`);

    figure.addEventListener("click", () => openLightbox(index));
    figure.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(index);
      }
    });
  });

  lightboxClose?.addEventListener("click", closeLightbox);
  lightboxPrev?.addEventListener("click", () => showLightboxItem(activeIndex - 1));
  lightboxNext?.addEventListener("click", () => showLightboxItem(activeIndex + 1));

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  window.addEventListener("keydown", handleLightboxKeydown);
}