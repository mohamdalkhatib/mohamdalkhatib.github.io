(function () {
  "use strict";

  function setupThemeToggle() {
    const root = document.documentElement;
    const buttons = Array.from(document.querySelectorAll("[data-theme-toggle]"));
    if (!buttons.length) return;

    const apply = (theme, persist = false) => {
      const value = theme === "dark" ? "dark" : "light";
      root.dataset.kinazTheme = value;
      root.style.colorScheme = value;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", value === "dark" ? "#090d0b" : "#e8e5dc");
      buttons.forEach((button) => {
        const nextLabel = value === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي";
        button.setAttribute("aria-label", nextLabel);
        button.setAttribute("title", nextLabel);
        button.setAttribute("aria-pressed", String(value === "dark"));
        const label = button.querySelector("[data-theme-label]");
        if (label) label.textContent = value === "dark" ? "نهاري" : "ليلي";
      });
      if (persist) {
        try { window.localStorage.setItem("kinaz-theme", value); } catch (error) {}
      }
    };

    apply(root.dataset.kinazTheme || "light");
    buttons.forEach((button) => button.addEventListener("click", () => {
      apply(root.dataset.kinazTheme === "dark" ? "light" : "dark", true);
    }));
  }

	function setupFaqSearch() {
    const input = document.querySelector("[data-faq-search]");
    if (!input) return;

    const items = Array.from(document.querySelectorAll("[data-faq-item]"));
    const groups = Array.from(document.querySelectorAll("[data-faq-group]"));
    const count = document.querySelector("[data-faq-count]");
    const empty = document.querySelector("[data-faq-empty]");
    const clear = document.querySelector("[data-faq-clear]");

    const normalize = (value) => String(value || "")
      .toLowerCase()
      .replace(/[ًٌٍَُِّْـ]/g, "")
      .replace(/[إأآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, " ")
      .trim();

    const update = () => {
      const query = normalize(input.value);
      const terms = query.split(" ").filter((term) => term.length > 1);
      let visible = 0;
      items.forEach((item) => {
        const haystack = `${normalize(item.textContent)} ${normalize(item.dataset.keywords)}`;
        const matches = !terms.length || terms.every((term) => haystack.includes(term));
        item.hidden = !matches;
        if (matches) visible += 1;
        if (query && matches) item.open = true;
        if (!query) item.open = false;
      });
      groups.forEach((group) => {
        group.hidden = !group.querySelector("[data-faq-item]:not([hidden])");
      });
      if (count) count.textContent = query ? `${visible} نتيجة` : `${items.length} سؤالًا`;
      if (empty) empty.hidden = visible !== 0;
      if (clear) clear.hidden = !query;
    };

    input.addEventListener("input", update);
    clear?.addEventListener("click", () => {
      input.value = "";
      input.focus();
      update();
    });
		update();
	}

	function setupPortfolioStage() {
		const stage = document.querySelector("[data-portfolio-stage]");
		if (!stage) return;

		const projects = Array.from(stage.querySelectorAll("[data-portfolio-project]"));
		if (!projects.length) return;

		const activate = (project) => {
			projects.forEach((item) => item.classList.toggle("is-active", item === project));
		};

		projects.forEach((project) => {
			project.addEventListener("pointerenter", () => {
				if (window.matchMedia("(hover: hover) and (min-width: 861px)").matches) activate(project);
			});
			project.addEventListener("focusin", () => activate(project));
		});
	}

	function setupScrollReveals() {
		const items = Array.from(document.querySelectorAll("[data-kinaz-reveal]"));
		if (!items.length) return;

		document.documentElement.classList.add("kinaz-has-reveal");
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
			items.forEach((item) => item.classList.add("is-visible"));
			return;
		}

		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				entry.target.classList.add("is-visible");
				observer.unobserve(entry.target);
			});
		}, { rootMargin: "0px 0px -8%", threshold: 0.12 });

		items.forEach((item, index) => {
			item.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
			observer.observe(item);
		});
	}

	function setupProjectProgress() {
		const experience = document.querySelector("[data-project-experience]");
		const progress = document.querySelector("[data-project-progress]");
		if (!experience || !progress) return;

		let ticking = false;
		const update = () => {
			const rect = experience.getBoundingClientRect();
			const distance = Math.max(1, experience.offsetHeight - window.innerHeight);
			const ratio = Math.min(1, Math.max(0, -rect.top / distance));
			progress.style.transform = `scaleX(${ratio})`;
			ticking = false;
		};
		const requestUpdate = () => {
			if (ticking) return;
			ticking = true;
			window.requestAnimationFrame(update);
		};
		window.addEventListener("scroll", requestUpdate, { passive: true });
		window.addEventListener("resize", requestUpdate);
		update();
	}

	function setupTransformation() {
		const section = document.querySelector("[data-transformation]");
		const track = section?.querySelector("[data-transformation-track]");
		const frame = section?.querySelector("[data-transformation-frame]");
		const value = section?.querySelector("[data-transformation-value]");
		const state = section?.querySelector("[data-transformation-state]");
		if (!section || !track || !frame) return;

		const phases = [
			[0.18, "قراءة الأرض"],
			[0.4, "تخطيط الإمكانات"],
			[0.68, "رفع المشروع"],
			[0.9, "اكتمال الواجهة"],
			[1.01, "تسليم الوجهة"],
		];

		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			frame.style.setProperty("--kinaz-transform", "100%");
			if (value) value.textContent = "100";
			if (state) state.textContent = "تسليم الوجهة";
			return;
		}

		let ticking = false;
		let activePhase = "";
		const update = () => {
			const rect = track.getBoundingClientRect();
			const distance = Math.max(1, track.offsetHeight - window.innerHeight);
			const progress = Math.min(1, Math.max(0, -rect.top / distance));
			const percent = progress * 100;
			frame.style.setProperty("--kinaz-transform", `${percent.toFixed(3)}%`);
			if (value) value.textContent = String(Math.round(percent)).padStart(3, "0");
			const nextPhase = phases.find(([limit]) => progress < limit)?.[1] || phases[phases.length - 1][1];
			if (state && nextPhase !== activePhase) {
				state.textContent = nextPhase;
				activePhase = nextPhase;
			}
			section.dataset.transformationPhase = progress < 0.08 ? "before" : progress > 0.92 ? "after" : "building";
			ticking = false;
		};

		const requestUpdate = () => {
			if (ticking) return;
			ticking = true;
			window.requestAnimationFrame(update);
		};

		window.addEventListener("scroll", requestUpdate, { passive: true });
		window.addEventListener("resize", requestUpdate);
		update();
	}

	function init() {
		setupThemeToggle();
		setupFaqSearch();
		setupPortfolioStage();
		setupScrollReveals();
		setupProjectProgress();
		setupTransformation();
	}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
