(function () {
  "use strict";

  const assistant = document.querySelector("[data-kinaz-assistant]");
  if (!assistant) return;

  const panel = assistant.querySelector("[data-assistant-panel]");
  const toggle = assistant.querySelector("[data-assistant-toggle]");
  const close = assistant.querySelector("[data-assistant-close]");
  const form = assistant.querySelector("[data-assistant-form]");
  const input = assistant.querySelector("[data-assistant-input]");
  const messages = assistant.querySelector("[data-assistant-messages]");
  const suggestionButtons = Array.from(assistant.querySelectorAll("[data-assistant-question]"));
  const humanLinks = Array.from(assistant.querySelectorAll("[data-assistant-human]"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const whatsappUrl = assistant.dataset.assistantWhatsapp || "https://wa.me/966566700025";
  const phone = assistant.dataset.assistantPhone || "920022119";
  let projects = [];

  try {
    projects = JSON.parse(assistant.querySelector("[data-assistant-projects]")?.textContent || "[]");
  } catch (error) {
    projects = [];
  }

  const normalize = (value) => String(value || "")
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();

  const projectForQuestion = (question) => {
    const normalized = normalize(question);
    return projects.find((project) => {
      const title = normalize(project.title).replace(/^مشروع\s+/, "");
      const location = normalize(project.location);
      const titleParts = title.split(" ").filter((part) => part.length > 3);
      return normalized.includes(title) || titleParts.some((part) => normalized.includes(part)) || (location.length > 4 && normalized.includes(location));
    });
  };

  const contextualWhatsapp = (question) => {
    try {
      const url = new URL(whatsappUrl);
      if (question) url.searchParams.set("text", `السلام عليكم، أرغب في التحدث مع فريق كناز.\nسؤالي: ${question}`);
      return url.toString();
    } catch (error) {
      return whatsappUrl;
    }
  };

  const createArrowIcon = (direction = "down-left") => {
    const paths = {
      "down-left": "M18 6 6 18M6 18h9M6 18V9",
      "up-right": "M6 18 18 6M18 6H9m9 0v9",
    };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.setAttribute("class", `kinaz-arrow kinaz-arrow--${direction}`);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    path.setAttribute("d", paths[direction] || paths["down-left"]);
    svg.appendChild(path);
    return svg;
  };

  const setOpen = (open) => {
    assistant.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    toggle.setAttribute("aria-expanded", String(open));
    if (open) window.setTimeout(() => input.focus({ preventScroll: true }), reduceMotion ? 0 : 260);
  };

  const addMessage = (text, sender = "bot", options = {}) => {
    const message = document.createElement("div");
    message.className = `kinaz-assistant__message kinaz-assistant__message--${sender}`;
    message.textContent = text;

    if (options.projectUrl) {
      const link = document.createElement("a");
      link.href = options.projectUrl;
      link.textContent = "عرض المشروع";
      link.appendChild(createArrowIcon("down-left"));
      message.appendChild(link);
    }

    if (options.contact) {
      const link = document.createElement("a");
      link.href = contextualWhatsapp(options.question || "");
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "تواصل مع خدمة العملاء";
      link.appendChild(createArrowIcon("up-right"));
      message.appendChild(link);
    }

    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  };

  const respond = (question, shortcut = "") => {
    const normalized = normalize(question);
    if (!normalized && !shortcut) return;
    if (question) addMessage(question, "user");
    humanLinks.forEach((link) => { link.href = contextualWhatsapp(question); });

    const subject = projectForQuestion(question);
    let answer = "";
    let contact = false;
    let projectUrl = subject?.url || "";

    if (shortcut === "flagship" || /الرياضي|شرق عنيزه|المشروع الحالي/.test(normalized)) {
      const flagship = projects[0] || {};
      answer = `مخطط الرياضي مشروع تطوير حضري في شرق عنيزة بمساحة ${flagship.area || "486,279.65 م²"}. المشروع في مرحلتي الدراسة والتخطيط، ويجمع بين الاستخدام السكني والتجاري والمساحات العامة.`;
      projectUrl = flagship.url || "#flagship";
    } else if (shortcut === "land" || /لدي ارض|عندي ارض|مالك ارض|تقديم ارض|تطوير ارض/.test(normalized)) {
      answer = "يمكنك تقديم الأرض لدراسة التطوير أو الشراكة أو البيع أو التسويق. نحتاج في البداية إلى الموقع، المساحة، وصورة الصك أو بياناته الأساسية؛ ثم يراجع الفريق ملاءمة الفرصة بسرية.";
      contact = true;
    } else if (shortcut === "investment" || /استثمار|مستثمر|فرصه استثماريه|شراكه/.test(normalized)) {
      answer = "تراجع كناز اهتمامات المستثمرين بصورة انتقائية، ثم تقترح الفرص الملائمة عند توفرها. اذكر نوع الأصل، المدينة، حجم الاستثمار التقريبي، والأفق الزمني المطلوب.";
      contact = true;
    } else if (/كل المشاريع|اعرض المشاريع|المحفظه|مشاريعكم/.test(normalized)) {
      answer = projects.length
        ? `تضم المحفظة المعروضة ${projects.length} مشاريع ومبادرات: ${projects.slice(0, 7).map((item) => item.title).join("، ")}. يمكنك كتابة اسم أي مشروع لمعرفة موقعه وحالته.`
        : "يمكنك الاطلاع على المحفظة من قسم المشاريع في الموقع.";
    } else if (subject && /موقع|اين|فين|مدينه|location/.test(normalized)) {
      answer = `يقع ${subject.title} في ${subject.location || "المملكة العربية السعودية"}.`;
    } else if (subject && /حاله|مرحله|انجاز|جاهز|تنفيذ/.test(normalized)) {
      answer = `حالة ${subject.title}: ${subject.status || "تواصل مع الفريق لمعرفة آخر تحديث"}.`;
    } else if (subject && /مساح|متر|حجم/.test(normalized)) {
      answer = subject.area
        ? `المساحة أو نطاق العمل المعلن لـ${subject.title}: ${subject.area}.`
        : `لم تُنشر مساحة تفصيلية لـ${subject.title}. يمكن لخدمة العملاء مشاركة المعلومات المتاحة.`;
      contact = !subject.area;
    } else if (subject) {
      answer = `${subject.title} — ${subject.type || "مشروع عقاري"} في ${subject.location || "المملكة"}. الحالة: ${subject.status || "ضمن محفظة كناز"}. ${subject.summary || ""}`.trim();
    } else if (/خدمات|ماذا تقدم|ايش تقدم|قدرات/.test(normalized)) {
      answer = "تشمل خدمات كناز تطوير الأراضي، هيكلة الفرص، إدارة المشاريع، الدراسات العقارية، التسويق والوساطة، واستقطاب الشركاء والمستثمرين.";
    } else if (/سري|خصوصيه|بيانات|nda|اتفاقيه/.test(normalized)) {
      answer = "تُعامل بيانات الفرص والمستثمرين ضمن دائرة مراجعة محدودة، ولا تُستخدم لأغراض تسويقية. ويمكن ترتيب اتفاقية سرية قبل تبادل التفاصيل الحساسة.";
    } else if (/كم يستغرق|مده الرد|متى ترد|وقت الرد/.test(normalized)) {
      answer = "المدة الإرشادية للمراجعة الأولية من 5 إلى 10 أيام عمل، وقد تختلف بحسب طبيعة الفرصة واكتمال المعلومات.";
    } else if (/رسوم|عموله|تكلفه الدراسه/.test(normalized)) {
      answer = "تتحدد الرسوم أو نموذج الأتعاب بعد المراجعة الأولية ونطاق الخدمة؛ لذلك لا يوجد سعر موحد قبل فهم الفرصة.";
      contact = true;
    } else if (/تواصل|خدمه العملاء|واتساب|رقم|اتصال/.test(normalized)) {
      answer = `يمكنك التواصل مع خدمة العملاء عبر واتساب أو الاتصال على الرقم الموحد ${phone}.`;
      contact = true;
    } else if (/مرحبا|اهلا|السلام|hello|hi/.test(normalized)) {
      answer = "أهلًا بك. اسألني عن مشروع الرياضي، محفظة كناز، تقديم أرض، أو طلب فرصة استثمارية.";
    } else {
      answer = "لم أجد إجابة دقيقة ضمن المعلومات المنشورة. يمكنك البحث في صفحة الأسئلة الشائعة أو إرسال سؤالك لخدمة العملاء.";
      contact = true;
    }

    const typing = document.createElement("div");
    typing.className = "kinaz-assistant__message kinaz-assistant__message--bot is-typing";
    typing.textContent = "•••";
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
    window.setTimeout(() => {
      typing.remove();
      addMessage(answer, "bot", { contact, projectUrl, question });
    }, reduceMotion ? 0 : 360);
  };

  toggle.addEventListener("click", () => setOpen(!assistant.classList.contains("is-open")));
  close?.addEventListener("click", () => setOpen(false));
  suggestionButtons.forEach((button) => button.addEventListener("click", () => respond(button.textContent.trim(), button.dataset.assistantQuestion || "")));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    input.value = "";
    respond(question);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && assistant.classList.contains("is-open")) setOpen(false);
  });
})();
