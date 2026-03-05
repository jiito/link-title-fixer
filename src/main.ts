import { Editor, Plugin } from "obsidian";
import { PasteHandler } from "./paste";

// Remember to rename these classes and interfaces!

export default class LinkTitlePlugin extends Plugin {
	pasteHandler: PasteHandler;
	async onload() {
		this.pasteHandler = new PasteHandler();
		this.registerEvent(
			this.app.workspace.on(
				"editor-paste",
				(evt: ClipboardEvent, editor: Editor) =>
					this.pasteHandler.handlePaste(evt, editor),
			),
		);
	}

	onunload() {}
}
