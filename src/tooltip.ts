import type { EditorView, ViewUpdate } from "@codemirror/view";
import { editorInfoField } from "obsidian";
import type { LinkMetadata, PendingLinkPrompt } from "./types";

const TOOLTIP_MARGIN = 12;
const TOOLTIP_OFFSET = 10;

export class LinkTooltipController {
	private activePrompt: PendingLinkPrompt | null = null;
	private tooltipEl: HTMLDivElement | null = null;
	private readonly registeredViews = new Set<EditorView>();
	private readonly suppressedDocumentChanges = new Map<string, number>();
	private repositionFrame: number | null = null;
	private readonly onWindowResize = () => this.scheduleReposition();

	constructor() {
		window.addEventListener("resize", this.onWindowResize);
	}

	destroy() {
		window.removeEventListener("resize", this.onWindowResize);
		this.dismiss();
		this.registeredViews.clear();
	}

	showPrompt(prompt: PendingLinkPrompt) {
		this.dismiss();
		this.activePrompt = prompt;
	}

	resolvePrompt(id: string, metadata: LinkMetadata) {
		if (this.activePrompt?.id !== id) return;
		this.activePrompt = {
			...this.activePrompt,
			status: "ready",
			metadata,
			errorMessage: undefined,
		};
		this.render();
		this.scheduleReposition();
	}

	failPrompt(id: string, errorMessage: string) {
		if (this.activePrompt?.id !== id) return;
		this.activePrompt = {
			...this.activePrompt,
			status: "error",
			metadata: undefined,
			errorMessage,
		};
		this.render();
		this.scheduleReposition();
	}

	dismissPrompt(id: string) {
		if (this.activePrompt?.id !== id) return;
		this.dismiss();
	}

	dismiss() {
		if (this.repositionFrame !== null) {
			window.cancelAnimationFrame(this.repositionFrame);
			this.repositionFrame = null;
		}
		this.activePrompt = null;
		this.tooltipEl?.remove();
		this.tooltipEl = null;
	}

	invalidateForDocumentChange(filePath: string | null) {
		if (this.consumeSuppressedDocumentChange(filePath)) return;
		if (!this.activePrompt) return;
		if (this.activePrompt.filePath !== filePath) return;
		this.dismiss();
	}

	handleActiveLeafChange() {
		this.dismiss();
	}

	registerView(view: EditorView) {
		this.registeredViews.add(view);
		this.scheduleReposition();
	}

	unregisterView(view: EditorView) {
		this.registeredViews.delete(view);
		if (!this.activePrompt) return;
		const activeView = this.getPromptView();
		if (!activeView || activeView === view) {
			this.dismiss();
		}
	}

	handleViewUpdate(update: ViewUpdate) {
		if (!this.activePrompt) return;
		if (this.getViewFilePath(update.view) !== this.activePrompt.filePath) return;
		this.scheduleReposition();
	}

	scheduleReposition() {
		if (!this.activePrompt || this.repositionFrame !== null) return;
		if (this.activePrompt.status === "loading") return;
		this.repositionFrame = window.requestAnimationFrame(() => {
			this.repositionFrame = null;
			this.updatePosition();
		});
	}

	suppressNextDocumentChange(filePath: string | null) {
		const key = this.getDocumentChangeKey(filePath);
		const count = this.suppressedDocumentChanges.get(key) ?? 0;
		this.suppressedDocumentChanges.set(key, count + 1);
	}

	private acceptPrompt = () => {
		const prompt = this.activePrompt;
		if (!prompt || prompt.status !== "ready" || !prompt.metadata) return;
		const currentText = prompt.editor.getRange(prompt.range.from, prompt.range.to);
		if (currentText !== prompt.url) {
			this.dismiss();
			return;
		}
		const replacement = `[${prompt.metadata.title}](${prompt.url})`;
		this.suppressNextDocumentChange(prompt.filePath);
		this.dismiss();
		prompt.editor.replaceRange(replacement, prompt.range.from, prompt.range.to);
	};

	private keepUrl = () => {
		this.dismiss();
	};

	private render() {
		const prompt = this.activePrompt;
		if (!prompt) {
			this.dismiss();
			return;
		}
		if (prompt.status === "loading") return;

		const view = this.getPromptView();
		const tooltipEl = this.ensureTooltipEl(view?.dom.ownerDocument ?? document);
		const doc = tooltipEl.ownerDocument;
		tooltipEl.replaceChildren();

		const cardEl = tooltipEl.appendChild(doc.createElement("div"));
		cardEl.className = "link-title-fixer__card";

		const metaEl = cardEl.appendChild(doc.createElement("div"));
		metaEl.className = "link-title-fixer__meta";

		const statusEl = metaEl.appendChild(doc.createElement("div"));
		statusEl.className = "link-title-fixer__status";
		statusEl.textContent = "Link title";

		const titleEl = metaEl.appendChild(doc.createElement("div"));
		titleEl.className = "link-title-fixer__title";
		titleEl.textContent =
			prompt.status === "ready"
				? prompt.metadata?.title ?? prompt.url
				: "Keep this URL as-is?";

		const hostEl = metaEl.appendChild(doc.createElement("div"));
		hostEl.className = "link-title-fixer__host";
		hostEl.textContent = this.getHostText(prompt);

		const messageEl = cardEl.appendChild(doc.createElement("div"));
		messageEl.className = "link-title-fixer__message";

		if (prompt.status === "ready") {
			messageEl.textContent = "Replace this pasted URL with its page title?";
		} else {
			messageEl.textContent =
				prompt.errorMessage ?? "Couldn't fetch a title for this link.";
		}

		const actionsEl = cardEl.appendChild(doc.createElement("div"));
		actionsEl.className = "link-title-fixer__actions";

		if (prompt.status === "ready") {
			const replaceButton = actionsEl.appendChild(doc.createElement("button"));
			replaceButton.className =
				"mod-cta link-title-fixer__button link-title-fixer__button--primary";
			replaceButton.type = "button";
			replaceButton.textContent = "Replace with title";
			replaceButton.addEventListener("click", this.acceptPrompt);
		}

		const dismissButton = actionsEl.appendChild(doc.createElement("button"));
		dismissButton.className = "link-title-fixer__button";
		dismissButton.type = "button";
		dismissButton.textContent =
			prompt.status === "ready" ? "Keep URL" : "Dismiss";
		dismissButton.addEventListener("click", this.keepUrl);
	}

	private getHostText(prompt: PendingLinkPrompt): string {
		if (prompt.metadata?.hostname) return prompt.metadata.hostname;
		try {
			return new URL(prompt.url).hostname;
		} catch {
			return prompt.url;
		}
	}

	private ensureTooltipEl(doc: Document) {
		if (this.tooltipEl && this.tooltipEl.ownerDocument !== doc) {
			this.tooltipEl.remove();
			this.tooltipEl = null;
		}

		if (this.tooltipEl) return this.tooltipEl;

		const tooltipEl = doc.createElement("div");
		tooltipEl.className = "link-title-fixer__tooltip";
		tooltipEl.addEventListener("mousedown", (evt) => evt.preventDefault());
		doc.body.appendChild(tooltipEl);
		this.tooltipEl = tooltipEl;
		return tooltipEl;
	}

	private updatePosition() {
		if (!this.tooltipEl || !this.activePrompt) return;

		const view = this.getPromptView();
		if (!view) {
			this.hideTooltip();
			return;
		}

		const doc = view.dom.ownerDocument;
		const tooltipEl = this.ensureTooltipEl(doc);
		const fromOffset = this.activePrompt.editor.posToOffset(this.activePrompt.range.from);
		const anchor =
			view.coordsAtPos(fromOffset, -1) ??
			view.coordsAtPos(fromOffset, 1) ??
			view.coordsAtPos(this.activePrompt.editor.posToOffset(this.activePrompt.range.to), 1);

		if (!anchor) {
			this.hideTooltip();
			return;
		}

		tooltipEl.addClass("is-hidden");
		tooltipEl.setCssProps({
			left: "0px",
			top: "0px",
		});

		const win = doc.defaultView ?? window;
		const width = tooltipEl.offsetWidth;
		const height = tooltipEl.offsetHeight;
		const maxLeft = Math.max(TOOLTIP_MARGIN, win.innerWidth - width - TOOLTIP_MARGIN);
		const left = Math.min(Math.max(anchor.left, TOOLTIP_MARGIN), maxLeft);

		let top = anchor.bottom + TOOLTIP_OFFSET;
		const maxTop = win.innerHeight - height - TOOLTIP_MARGIN;
		if (top > maxTop) {
			top = Math.max(TOOLTIP_MARGIN, anchor.top - height - TOOLTIP_OFFSET);
		}

		tooltipEl.setCssProps({
			left: `${left}px`,
			top: `${top}px`,
		});
		tooltipEl.removeClass("is-hidden");
	}

	private getPromptView(): EditorView | null {
		if (!this.activePrompt) return null;

		const matches = Array.from(this.registeredViews).filter(
			(view) => this.getViewFilePath(view) === this.activePrompt?.filePath,
		);

		if (matches.length === 0) return null;

		return (
			matches.find((view) => view.hasFocus) ??
			matches.find((view) => view.dom.contains(view.dom.ownerDocument.activeElement)) ??
			matches[0] ??
			null
		);
	}

	private getViewFilePath(view: EditorView): string | null {
		const info = view.state.field(editorInfoField, false);
		return info?.file?.path ?? null;
	}

	private consumeSuppressedDocumentChange(filePath: string | null) {
		const key = this.getDocumentChangeKey(filePath);
		const count = this.suppressedDocumentChanges.get(key);
		if (!count) return false;
		if (count === 1) {
			this.suppressedDocumentChanges.delete(key);
		} else {
			this.suppressedDocumentChanges.set(key, count - 1);
		}
		return true;
	}

	private getDocumentChangeKey(filePath: string | null) {
		return filePath ?? "__no-file__";
	}

	private hideTooltip() {
		this.tooltipEl?.addClass("is-hidden");
	}
}
