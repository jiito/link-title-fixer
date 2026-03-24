import { Editor, requestUrl, type MarkdownFileInfo, type MarkdownView } from "obsidian";
import { LinkTooltipController } from "./tooltip";
import type { LinkMetadata, PendingLinkPrompt } from "./types";

export class PasteHandler {
	constructor(private readonly tooltipController: LinkTooltipController) {}

	async handlePaste(
		evt: ClipboardEvent,
		editor: Editor,
		info: MarkdownView | MarkdownFileInfo,
	) {
		if (evt.defaultPrevented) return;

		const rawClipboardText = evt.clipboardData?.getData("text/plain");
		if (!rawClipboardText) return;

		const clipboardText = rawClipboardText.trim();
		if (!this.isEligibleBareUrl(rawClipboardText, clipboardText)) return;

		evt.preventDefault();

		const from = { ...editor.getCursor("from") };
		this.tooltipController.suppressNextDocumentChange(info.file?.path ?? null);
		editor.replaceSelection(clipboardText);
		const to = { ...editor.getCursor("to") };

		const prompt: PendingLinkPrompt = {
			id: this.createRequestId(),
			url: clipboardText,
			range: { from, to },
			filePath: info.file?.path ?? null,
			editor,
			status: "loading",
		};

		this.tooltipController.showPrompt(prompt);

		try {
			const metadata = await this.getLinkMetadata(clipboardText);
			this.tooltipController.resolvePrompt(prompt.id, metadata);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Couldn't fetch a title for this link.";
			this.tooltipController.failPrompt(prompt.id, message);
		}
	}

	private isEligibleBareUrl(rawText: string, trimmedText: string) {
		if (rawText !== trimmedText) return false;
		if (/\s/.test(trimmedText)) return false;
		try {
			const url = new URL(trimmedText);
			return url.protocol === "http:" || url.protocol === "https:";
		} catch {
			return false;
		}
	}

	private createRequestId() {
		return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
	}

	private async getLinkMetadata(link: string): Promise<LinkMetadata> {
		const response = await requestUrl({ url: link });
		const title = this.extractTitle(response.text);
		if (!title) {
			throw new Error("No page title was found for this link.");
		}

		return {
			title,
			hostname: new URL(link).hostname,
		};
	}

	private extractTitle(html: string) {
		const title = new DOMParser()
			.parseFromString(html, "text/html")
			.querySelector("title")
			?.textContent
			?.replace(/\s+/g, " ")
			.trim();

		return title || null;
	}
}
