import { Editor, requestUrl } from "obsidian";

export class PasteHandler {
	async handlePaste(evt: ClipboardEvent, editor: Editor) {
		const clipboardData = evt.clipboardData?.getData("text/plain")?.trim();

		if (!clipboardData || !this.isUrl(clipboardData)) return;
		evt.preventDefault();
		// const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
		const placeholder = `[Fetching title...](${clipboardData})`;

		const from = { ...editor.getCursor() };
		editor.replaceSelection(placeholder);
		const to = { ...editor.getCursor() };
		let replacementText = "";
		try {
			const title = await this.getTitleFromLink(clipboardData);
			const replaceText = `[${title}](${clipboardData})`;
			replacementText = replaceText;
		} catch {
			const fallback = `[${clipboardData}](${clipboardData})`;
			replacementText = fallback;
		}
		if (editor.getRange(from, to) === placeholder) {
			editor.replaceRange(replacementText, from, to);
		}
	}
	isUrl(text: string) {
		try {
			const url = new URL(text);
			return url.protocol === "http:" || url.protocol === "https:";
		} catch {
			return false;
		}
	}
	async getTitleFromLink(link: string) {
		const response = await requestUrl({ url: link });
		const html = response.text;
		const title = html.match(/<title>(.*?)<\/title>/)?.[1];
		return title ?? "No title found";
	}
}
