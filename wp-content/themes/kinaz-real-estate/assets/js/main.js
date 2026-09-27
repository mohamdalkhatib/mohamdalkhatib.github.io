(function () {
  "use strict";

  const config = window.kinazTheme || {};
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pad = (value) => String(value).padStart(3, "0");

  function setupHeader() {
    const header = document.querySelector("[data-site-header]");
    const toggle = document.querySelector("[data-menu-toggle]");
    const menu = document.querySelector("[data-menu]");

    const syncHeader = () => {
      if (header) header.classList.toggle("is-scrolled", window.scrollY > 28);
    };

    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });

    if (!toggle || !menu) return;

    const closeMenu = () => {
      toggle.setAttribute("aria-expanded", "false");
      toggle.querySelector(".screen-reader-text").textContent = config.menuOpen || "فتح القائمة";
      menu.classList.remove("is-open");
      document.body.classList.remove("menu-open");
    };

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector(".screen-reader-text").textContent = open
        ? config.menuClose || "إغلاق القائمة"
        : config.menuOpen || "فتح القائمة";
      menu.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
    });

    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  function setupBuildSequence() {
    const sequence = document.querySelector("[data-build-sequence]");
    const canvas = document.querySelector("[data-build-canvas]");
    const customFrames = Array.isArray(config.frames) ? config.frames.filter(Boolean) : [];
    if (!sequence || !canvas || (!customFrames.length && (!config.frameBase || !config.frameCount))) return;

    const finalImage = sequence.querySelector("[data-build-final]");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) {
      if (finalImage) finalImage.style.setProperty("--build-final-opacity", "1");
      return;
    }

    const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    const milestones = Array.from(sequence.querySelectorAll("[data-milestone]"));
    const chaptersWrapper = sequence.querySelector("[data-build-chapters]");
    const chapters = Array.from(sequence.querySelectorAll("[data-build-chapter]"));
    const meter = sequence.querySelector("[data-scroll-meter]");
    const heroCopy = sequence.querySelector("[data-hero-copy]");
    const total = customFrames.length || Number(config.frameCount);
    const cache = new Map();
    const pending = new Map();
    let targetProgress = 0;
    let smoothProgress = 0;
    let currentIndex = -1;
    let lastDrawnIndex = -1;
    let ticking = false;
    let inView = true;
    let activeChapterIndex = -1;

    const frameUrl = (index) => customFrames.length
      ? customFrames[index]
      : `${config.frameBase}${pad(index + 1)}${config.frameExt || ".webp"}`;

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.6);
      const width = Math.round(canvas.clientWidth * dpr);
      const height = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        if (lastDrawnIndex >= 0 && cache.has(lastDrawnIndex)) draw(cache.get(lastDrawnIndex));
      }
    }

    function draw(image) {
      if (!image || !image.naturalWidth || !canvas.width || !canvas.height) return;
      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const x = (canvas.width - width) * 0.5;
      const y = (canvas.height - height) * 0.5;
      context.fillStyle = "#011f17";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, x, y, width, height);
    }

    function trimCache(keepIndex) {
      if (cache.size <= 18) return;
      const protectedIndexes = new Set([0, total - 1, keepIndex]);
      Array.from(cache.keys()).forEach((index) => {
        if (cache.size <= 14) return;
        if (!protectedIndexes.has(index) && Math.abs(index - keepIndex) > 5) cache.delete(index);
      });
    }

    function loadFrame(index) {
      index = clamp(index, 0, total - 1);
      if (cache.has(index)) return Promise.resolve(cache.get(index));
      if (pending.has(index)) return pending.get(index);

      const promise = new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
          cache.set(index, image);
          pending.delete(index);
          resolve(image);
        };
        image.onerror = () => {
          pending.delete(index);
          reject(new Error(`Unable to load frame ${index + 1}`));
        };
        image.src = frameUrl(index);
      });

      pending.set(index, promise);
      return promise;
    }

    function nearestLoaded(index) {
      if (cache.has(index)) return index;
      for (let distance = 1; distance < total; distance += 1) {
        if (cache.has(index - distance)) return index - distance;
        if (cache.has(index + distance)) return index + distance;
      }
      return -1;
    }

    function warmNeighborhood(index) {
      const radius = window.innerWidth < 700 ? 2 : 4;
      for (let offset = -radius; offset <= radius; offset += 1) {
        loadFrame(index + offset).catch(() => {});
      }
      trimCache(index);
    }

    function renderProgress(progress) {
      // Finish the build before the sticky scene releases so the completed
      // building has a deliberate hold instead of flashing at the section edge.
      // Reveal and lock the completed building comfortably before the sticky
      // scene releases. This avoids requiring a pixel-perfect final scroll.
      const finalFrameAt = window.innerWidth < 700 ? 0.74 : 0.8;
      const finalFadeAt = window.innerWidth < 700 ? 0.62 : 0.68;
      const frameProgress = clamp(progress / finalFrameAt, 0, 1);
      const index = Math.round(frameProgress * (total - 1));
      currentIndex = index;
      canvas.dataset.frame = String(index + 1);
      if (finalImage) {
        const finalOpacity = clamp((progress - finalFadeAt) / (finalFrameAt - finalFadeAt), 0, 1);
        finalImage.style.setProperty("--build-final-opacity", finalOpacity.toFixed(3));
      }
      if (index !== lastDrawnIndex) {
        const loadedIndex = nearestLoaded(index);
        if (loadedIndex >= 0) {
          draw(cache.get(loadedIndex));
          lastDrawnIndex = loadedIndex;
        }
        loadFrame(index)
          .then((image) => {
            if (currentIndex === index) {
              draw(image);
              lastDrawnIndex = index;
            }
          })
          .catch(() => {});
        warmNeighborhood(index);
      }

      const stageCount = chapters.length || milestones.length;
      const milestoneIndex = stageCount > 0 ? clamp(Math.floor(progress * stageCount), 0, stageCount - 1) : -1;
      milestones.forEach((item, itemIndex) => item.classList.toggle("is-active", itemIndex === milestoneIndex));
      if (milestoneIndex >= 0 && milestoneIndex !== activeChapterIndex) {
        chapters.forEach((item, itemIndex) => {
          const active = itemIndex === milestoneIndex;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-hidden", String(!active));
        });
        activeChapterIndex = milestoneIndex;
      }
      if (chaptersWrapper) {
        const enter = clamp((progress - 0.19) / 0.055, 0, 1);
        const exit = 1 - clamp((progress - 0.92) / 0.04, 0, 1);
        const chapterOpacity = enter * exit;
        chaptersWrapper.style.setProperty("--chapter-opacity", chapterOpacity.toFixed(3));
        chaptersWrapper.style.setProperty("--chapter-y", `${Math.round((1 - enter) * 28)}px`);
      }
      if (meter) meter.style.setProperty("--scroll-progress", progress.toFixed(4));
      if (heroCopy) {
        const opacity = 1 - clamp(progress / 0.17, 0, 1);
        heroCopy.style.setProperty("--hero-opacity", opacity.toFixed(3));
        heroCopy.style.setProperty("--hero-y", `${Math.round(progress * 90)}px`);
      }
    }

    function loop() {
      ticking = false;
      if (!inView) return;
      const delta = targetProgress - smoothProgress;
      smoothProgress += delta * 0.16;
      if (Math.abs(delta) < 0.0004) smoothProgress = targetProgress;
      renderProgress(clamp(smoothProgress, 0, 1));
      if (Math.abs(targetProgress - smoothProgress) > 0.0004) requestTick();
    }

    function requestTick() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(loop);
    }

    function updateTarget() {
      const rect = sequence.getBoundingClientRect();
      const scrollable = Math.max(sequence.offsetHeight - window.innerHeight, 1);
      targetProgress = clamp(-rect.top / scrollable, 0, 1);
      inView = rect.bottom > 0 && rect.top < window.innerHeight;
      if (inView) {
        const finalFrameAt = window.innerWidth < 700 ? 0.74 : 0.8;
        if (targetProgress >= finalFrameAt) {
          smoothProgress = targetProgress;
          renderProgress(targetProgress);
        } else {
          requestTick();
        }
      } else if (targetProgress === 1) {
        smoothProgress = 1;
        renderProgress(1);
      }
    }

    resizeCanvas();
    loadFrame(0).then((image) => {
      draw(image);
      lastDrawnIndex = 0;
      warmNeighborhood(0);
    }).catch(() => {
      const poster = new Image();
      poster.onload = () => draw(poster);
      poster.src = config.poster;
    });
    loadFrame(total - 1).catch(() => {});

    window.addEventListener("scroll", updateTarget, { passive: true });
    window.addEventListener("resize", () => {
      resizeCanvas();
      updateTarget();
    }, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        resizeCanvas();
        updateTarget();
      }
    });
    updateTarget();
  }

  function setupReveals() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = document.querySelectorAll(
      ".kinaz-manifesto-label, .kinaz-manifesto-statement, .kinaz-flagship-head, .kinaz-flagship-frame, .kinaz-flagship-story, .kinaz-capability-list article, .kinaz-pathway, .kinaz-project-card, .kinaz-principles-grid > *, .kinaz-contact-grid > *, .kinaz-section-heading, .kinaz-services-grid article, .kinaz-values-grid article"
    );
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-revealed"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.12 }
    );
    items.forEach((item, index) => {
      item.classList.add("kinaz-reveal");
      item.style.setProperty("--reveal-delay", `${Math.min((index % 6) * 55, 220)}ms`);
      observer.observe(item);
    });
  }

  function init() {
    setupHeader();
    setupBuildSequence();
    setupReveals();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
