(function ($) {
	"use strict";

	$(function () {
		$("[data-project-tab]").on("click", function () {
			const tab = $(this).data("project-tab");
			$("[data-project-tab]").removeClass("is-active");
			$(this).addClass("is-active");
			$("[data-project-panel]").removeClass("is-active");
			$(`[data-project-panel="${tab}"]`).addClass("is-active");
			window.sessionStorage.setItem("kinazProjectTab", tab);
		});

		const savedTab = window.sessionStorage.getItem("kinazProjectTab");
		if (savedTab && $(`[data-project-tab="${savedTab}"]`).length) {
			$(`[data-project-tab="${savedTab}"]`).trigger("click");
		}

		const $input = $("[data-kinaz-gallery-input]");
		const $preview = $("[data-kinaz-gallery-preview]");

		function syncGallery() {
			const ids = $preview.find("figure[data-attachment-id]").map(function () {
				return $(this).data("attachment-id");
			}).get();
			$input.val(ids.join(","));
		}

		function galleryFigure(item) {
			const source = item.sizes?.thumbnail?.url || item.url;
			return $("<figure>", { "data-attachment-id": item.id })
				.append($("<img>", { src: source, alt: "" }))
				.append($("<button>", { type: "button", "data-remove-image": "", "aria-label": "حذف الصورة", text: "×" }));
		}

		if ($.fn.sortable) {
			$preview.sortable({ items: "figure", update: syncGallery });
		}

		$preview.on("click", "[data-remove-image]", function () {
			$(this).closest("figure").remove();
			syncGallery();
		});

		let galleryFrame;
		$("[data-kinaz-gallery-select]").on("click", function (event) {
			event.preventDefault();
			if (typeof wp === "undefined" || !wp.media) return;
			if (galleryFrame) {
				galleryFrame.open();
				return;
			}

			galleryFrame = wp.media({
				title: kinazProjectAdmin.title,
				button: { text: kinazProjectAdmin.button },
				library: { type: "image" },
				multiple: true,
			});

			galleryFrame.on("open", function () {
				const selection = galleryFrame.state().get("selection");
				selection.reset();
				$input.val().split(",").filter(Boolean).forEach(function (id) {
					const attachment = wp.media.attachment(Number(id));
					attachment.fetch();
					selection.add(attachment);
				});
			});

			galleryFrame.on("select", function () {
				const selection = galleryFrame.state().get("selection").toJSON();
				$preview.empty();
				selection.forEach(function (item) { $preview.append(galleryFigure(item)); });
				syncGallery();
			});

			galleryFrame.open();
		});

		$("[data-kinaz-gallery-clear]").on("click", function (event) {
			event.preventDefault();
			$input.val("");
			$preview.empty();
		});

		let fileFrame;
		$("[data-kinaz-file-select]").on("click", function (event) {
			event.preventDefault();
			if (typeof wp === "undefined" || !wp.media) return;
			fileFrame = wp.media({
				title: kinazProjectAdmin.fileTitle,
				button: { text: kinazProjectAdmin.fileButton },
				library: { type: "application/pdf" },
				multiple: false,
			});
			fileFrame.on("select", function () {
				const item = fileFrame.state().get("selection").first().toJSON();
				$("[data-kinaz-file-input]").val(item.id);
				$("[data-kinaz-file-name]").text(item.filename || item.title);
			});
			fileFrame.open();
		});

		$("[data-kinaz-file-clear]").on("click", function (event) {
			event.preventDefault();
			$("[data-kinaz-file-input]").val("");
			$("[data-kinaz-file-name]").text("لم يتم اختيار ملف");
		});
	});
})(jQuery);

