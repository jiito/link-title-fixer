import type { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { LinkTooltipController } from "./tooltip";

class LinkTooltipViewPlugin {
	private readonly onScroll = () => this.controller.scheduleReposition();

	constructor(
		private readonly view: EditorView,
		private readonly controller: LinkTooltipController,
	) {
		this.controller.registerView(this.view);
		this.view.scrollDOM.addEventListener("scroll", this.onScroll, {
			passive: true,
		});
	}

	update(update: ViewUpdate) {
		this.controller.handleViewUpdate(update);
	}

	destroy() {
		this.view.scrollDOM.removeEventListener("scroll", this.onScroll);
		this.controller.unregisterView(this.view);
	}
}

export function createLinkTooltipExtension(
	controller: LinkTooltipController,
): Extension {
	return ViewPlugin.define((view) => new LinkTooltipViewPlugin(view, controller));
}
