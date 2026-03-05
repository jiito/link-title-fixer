import { Editor, Plugin, requestUrl } from "obsidian";
import {
	DEFAULT_SETTINGS,
	MyPluginSettings,
	SampleSettingTab,
} from "./settings";

// Remember to rename these classes and interfaces!

export default class LinkTitlePlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on(
				"editor-paste",
				async (evt: ClipboardEvent, editor: Editor) => {
					const clipboardData = evt.clipboardData
						?.getData("text/plain")
						?.trim();

					if (!clipboardData || !this.isUrl(clipboardData)) return;
					evt.preventDefault();
					// const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
					const placeholder = `[Fetching title...](${clipboardData})`;

					const from = { ...editor.getCursor() };
					editor.replaceSelection(placeholder);
					const to = { ...editor.getCursor() };
					let replacementText = "";
					try {
						const title = await getTitleFromLink(clipboardData);
						const replaceText = `[${title}](${clipboardData})`;
						replacementText = replaceText;
					} catch {
						const fallback = `[${clipboardData}](${clipboardData})`;
						replacementText = fallback;
					}
					if (editor.getRange(from, to) === placeholder) {
						editor.replaceRange(replacementText, from, to);
					}
				},
			),
		);
	}

	isUrl(text: string) {
		try {
			const url = new URL(text);
			return url.protocol === "http:" || url.protocol === "https:";
		} catch {
			return false;
		}
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MyPluginSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

async function getTitleFromLink(link: string) {
	const response = await requestUrl({ url: link });
	const html = response.text;
	const title = html.match(/<title>(.*?)<\/title>/)?.[1];
	return title ?? "No title found";
}
