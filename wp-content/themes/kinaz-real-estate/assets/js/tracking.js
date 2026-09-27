(function () {
  "use strict";

  const config = window.kinazTracking || {};
  const memory = new Set();
  const storagePrefix = "kinaz:event:";

  function storageHas(key) {
    try {
      return window.localStorage.getItem(storagePrefix + key) === "1";
    } catch (error) {
      return false;
    }
  }

  function storageSet(key) {
    try {
      window.localStorage.setItem(storagePrefix + key, "1");
    } catch (error) {}
  }

  function cleanParams(params) {
    return Object.fromEntries(
      Object.entries(params || {}).filter(([, value]) => value !== "" && value !== null && typeof value !== "undefined")
    );
  }

  function emit(name, params, options) {
    const data = cleanParams(params);
    const settings = options || {};
    const eventId = settings.eventId || data.event_id || "";
    const dedupeKey = settings.dedupeKey || `${name}:${eventId || window.location.pathname}`;
    const persistent = Boolean(settings.persistent);

    if (memory.has(dedupeKey) || (persistent && storageHas(dedupeKey))) return false;
    memory.add(dedupeKey);

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...data });

    if (config.ga4Direct && typeof window.gtag === "function") {
      window.gtag("event", name, data);
    }

    if (typeof window.fbq === "function") {
      const metaName = name === "page_view" ? "PageView" : name === "sign_up" ? "CompleteRegistration" : name;
      const method = name === "page_view" || name === "sign_up" ? "track" : "trackCustom";
      if (eventId) {
        window.fbq(method, metaName, data, { eventID: eventId });
      } else {
        window.fbq(method, metaName, data);
      }
    }

    window.dispatchEvent(new CustomEvent("kinaz:analytics", { detail: { name, params: data } }));
    if (persistent) storageSet(dedupeKey);
    return true;
  }

  function pageType() {
    return config.pageType || document.body?.className || "page";
  }

  function trackPageView() {
    emit("page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
      page_type: pageType(),
    }, { dedupeKey: `page_view:${window.location.pathname}${window.location.search}` });
  }

  function setupCtas() {
    document.querySelectorAll("[data-track-cta]").forEach((element) => {
      element.addEventListener("click", () => {
        emit("cta_click", {
          cta_id: element.id || element.dataset.ctaId || "cta",
          cta_label: (element.dataset.ctaLabel || element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120),
          cta_destination: element.getAttribute("href") || "",
          page_path: window.location.pathname,
        }, { dedupeKey: `cta_click:${element.id || element.dataset.ctaId || "cta"}:${Date.now()}` });
      });
    });
  }

  function setupLeadForm() {
    const form = document.querySelector("[data-track-form='lead']");
    if (!form) return;

    const formId = form.id || "kinaz-lead-form";
    let started = false;
    form.addEventListener("focusin", () => {
      if (started) return;
      started = true;
      emit("form_start", { form_id: formId, page_path: window.location.pathname }, { dedupeKey: `form_start:${formId}` });
    });

    form.addEventListener("submit", () => {
      emit("form_submit", { form_id: formId, page_path: window.location.pathname }, { dedupeKey: `form_submit:${formId}:${Date.now()}` });
    });
  }

  function stripConversionQuery() {
    if (!window.history?.replaceState) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("inquiry");
    url.searchParams.delete("kinaz_event");
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }

  function setupSuccess() {
    const modal = document.querySelector("[data-inquiry-success]");
    const eventId = config.eventId || modal?.dataset.eventId || "";

    if (config.inquirySuccess && eventId) {
      emit("sign_up", {
        method: "inquiry_form",
        form_id: "kinaz-lead-form",
        event_id: eventId,
        page_path: window.location.pathname,
      }, {
        eventId,
        dedupeKey: `sign_up:${eventId}`,
        persistent: true,
      });
      stripConversionQuery();
    }

    if (!modal) return;
    const close = () => {
      modal.hidden = true;
      document.documentElement.classList.remove("kinaz-modal-open");
    };
    const closeButton = modal.querySelector("[data-success-close]");
    document.documentElement.classList.add("kinaz-modal-open");
    if (closeButton) {
      try {
        closeButton.focus({ preventScroll: true });
      } catch (error) {
        closeButton.focus();
      }
    }
    closeButton?.addEventListener("click", close);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) close();
    });
  }

  function init() {
    trackPageView();
    setupCtas();
    setupLeadForm();
    setupSuccess();
  }

  window.kinazTrack = emit;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
