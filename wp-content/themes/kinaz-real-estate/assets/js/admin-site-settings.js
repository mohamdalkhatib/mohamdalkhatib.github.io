(function ($) {
	"use strict";

	$(function () {
		$("[data-kinaz-settings-tab]").on("click", function () {
			const tab = $(this).data("kinaz-settings-tab");
			$("[data-kinaz-settings-tab]").removeClass("is-active");
			$(this).addClass("is-active");
			$("[data-kinaz-settings-section]").removeClass("is-active");
			$(`[data-kinaz-settings-section="${tab}"]`).addClass("is-active");
			window.sessionStorage.setItem("kinazSettingsTab", tab);
		});

		const savedTab = window.sessionStorage.getItem("kinazSettingsTab");
		if (savedTab && $(`[data-kinaz-settings-tab="${savedTab}"]`).length) {
			$(`[data-kinaz-settings-tab="${savedTab}"]`).trigger("click");
		}

		if ($.fn.sortable) {
			$(".kinaz-admin-media-field.is-multiple [data-kinaz-media-preview]").sortable({
				items: "figure[data-id]",
				update: syncMediaOrder,
			});
		}

		function syncMediaOrder() {
			const $preview = $(this);
			const ids = $preview.find("figure[data-id]").map(function () { return $(this).data("id"); }).get();
			$preview.closest(".kinaz-admin-media-field").find("[data-kinaz-media-input]").val(ids.join(","));
		}

		$("[data-kinaz-media-select]").on("click", function (event) {
			event.preventDefault();
			if (typeof wp === "undefined" || !wp.media) return;
			const $field = $(this).closest(".kinaz-admin-media-field");
			const $input = $field.find("[data-kinaz-media-input]");
			const $preview = $field.find("[data-kinaz-media-preview]");
			const multiple = $input.data("multiple") === 1;
			const frame = wp.media({
				title: multiple ? kinazAdminSettings.framesTitle : kinazAdminSettings.imageTitle,
				button: { text: multiple ? kinazAdminSettings.framesButton : kinazAdminSettings.imageButton },
				library: { type: "image" },
				multiple: multiple,
			});

			frame.on("open", function () {
				const selection = frame.state().get("selection");
				$input.val().split(",").filter(Boolean).forEach(function (id) {
					const attachment = wp.media.attachment(Number(id));
					attachment.fetch();
					selection.add(attachment);
				});
			});

			frame.on("select", function () {
				const items = frame.state().get("selection").toJSON();
				$input.val(items.map((item) => item.id).join(","));
				$preview.empty();
				items.forEach(function (item) {
					const source = item.sizes?.thumbnail?.url || item.url;
					$preview.append($("<figure>", { "data-id": item.id }).append($("<img>", { src: source, alt: "" })));
				});
			});
			frame.open();
		});

		$("[data-kinaz-media-clear]").on("click", function (event) {
			event.preventDefault();
			const $field = $(this).closest(".kinaz-admin-media-field");
			$field.find("[data-kinaz-media-input]").val("");
			$field.find("[data-kinaz-media-preview]").empty();
		});
	});
})(jQuery);

