import type { Editor, EditorRange } from "obsidian";

export interface LinkMetadata {
	title: string;
	hostname: string;
}

export type TooltipState = "loading" | "ready" | "error";

export interface PendingLinkPrompt {
	id: string;
	url: string;
	range: EditorRange;
	filePath: string | null;
	editor: Editor;
	status: TooltipState;
	metadata?: LinkMetadata;
	errorMessage?: string;
}
