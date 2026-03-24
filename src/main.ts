import { Editor, Plugin, type MarkdownFileInfo, type MarkdownView } from "obsidian";
import { createLinkTooltipExtension } from "./editor-extension";
import { PasteHandler } from "./paste";
import { LinkTooltipController } from "./tooltip";

export default class LinkTitlePlugin extends Plugin {
	private pasteHandler!: PasteHandler;
	private tooltipController!: LinkTooltipController;

	async onload() {
		this.tooltipController = new LinkTooltipController();
		this.pasteHandler = new PasteHandler(this.tooltipController);

		this.registerEditorExtension(
			createLinkTooltipExtension(this.tooltipController),
		);

		this.registerEvent(
			this.app.workspace.on(
				"editor-paste",
				(
					evt: ClipboardEvent,
					editor: Editor,
					info: MarkdownView | MarkdownFileInfo,
				) => this.pasteHandler.handlePaste(evt, editor, info),
			),
		);

		this.registerEvent(
			this.app.workspace.on("editor-change", (_editor, info) => {
				this.tooltipController.invalidateForDocumentChange(
					info.file?.path ?? null,
				);
			}),
		);

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.tooltipController.handleActiveLeafChange();
			}),
		);

		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				this.tooltipController.scheduleReposition();
			}),
		);
	}

	onunload() {
		this.tooltipController.destroy();
	}
}
