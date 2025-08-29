import * as pdfjsLib from "pdfjs-dist";
import { tokenizePDF } from "../pdf/lexers/pdf";
import { importCoreRulebook } from "./pdf-importers/import-core-rulebook";
import { importAtlas } from "./pdf-importers/import-atlas";

// Relative url that foundry serves for the compiled webworker
pdfjsLib.GlobalWorkerOptions.workerSrc = "modules/fu-parser/pdf.worker.js";

// Foundry v10 creates these methods, but pdfjs does not like extra methods on Object that are enumerable,
// so fix the compatibility issue
for (const prop of ["deepFlatten", "equals", "partition", "filterJoin", "findSplice"]) {
	Object.defineProperty(Array.prototype, prop, {
		enumerable: false,
	});
}

export type ParseResult = { page: number } & (
	| { type: "success"; save: (imagePath: string) => Promise<void>; cleanup: () => boolean }
	| { type: "failure"; errors: { found: string; error: string; distance: number }[] }
	| { type: "too many"; count: number; errors: { found: string; error: string; distance: number }[] }
);

const parsePdf = async (pdfPath: string, bookType: BookType): Promise<[ParseResult[], () => Promise<void>]> => {
	const [withPage, destroy] = await tokenizePDF(pdfPath);

	switch (bookType) {
		case "FUCR":
			return [await importCoreRulebook(withPage), destroy];
		case "FUHF":
		case "FUTF":
		case "FUNF":
			return [await importAtlas(withPage, bookType), destroy];
	}
};

export type BookType = (typeof BOOK_TYPES)[number];
export const BOOK_TYPES = ["FUCR", "FUHF", "FUTF", "FUNF"] as const;
export const bookTypes = {
	FUCR: "Core Rulebook",
	FUHF: "High Fantasy Atlas",
	FUTF: "Techno Fantasy Atlas",
	FUNF: "Natural Fantasy Atlas",
};

type ImportPDFSubmissionData = {
	pdfPath: string;
	imagePath: string;
	bookType: BookType;
};

type ImportPDFData = ImportPDFSubmissionData & {
	parseResults: ParseResult[];
	destroy?: () => Promise<void>;
	inProgress: boolean;
	bookTypes: Record<BookType, string>;
};

export class ImportPDFApplication extends FormApplication<ImportPDFData> {
	async _updateObject<T extends ImportPDFSubmissionData>(_e: Event, data: T) {
		if (data.imagePath != this.object.imagePath) {
			this.object.imagePath = data.imagePath;
		}
		if (data.pdfPath != this.object.pdfPath || data.bookType != this.object.bookType) {
			this.cleanupPDFResources();
			this.object.pdfPath = data.pdfPath;
			this.object.bookType = data.bookType;
			this.render();
			const [results, destroy] = await parsePdf(this.object.pdfPath, this.object.bookType);
			this.object.parseResults = results;
			this.object.destroy = destroy;
		}
		this.render();
	}

	async getData(): Promise<ImportPDFData & { disabled: boolean }> {
		return {
			...this.object,
			disabled:
				this.object.imagePath === "" ||
				this.object.pdfPath === "" ||
				this.object.parseResults.length == 0 ||
				this.object.inProgress,
		};
	}
	get template(): string {
		return "modules/fu-parser/templates/import-pdf.hbs";
	}

	async close(options?: unknown) {
		this.cleanupPDFResources();
		return super.close(options);
	}

	private cleanupPDFResources() {
		for (const p of this.object.parseResults) {
			if (p.type === "success") {
				p.cleanup();
			}
		}
		if (this.object.destroy) {
			this.object.destroy();
		}
		this.object.parseResults = [];
		delete this.object.destroy;
	}

	activateListeners(html: JQuery): void {
		super.activateListeners(html);
		html.find(".fu-parser-collapsible").on("click", (e) => {
			e.preventDefault();
			const toggle = e.currentTarget;
			toggle.classList.toggle("fu-parser-active");
			const content = toggle.nextElementSibling as HTMLElement;
			if (content?.style.maxHeight) {
				content.style.maxHeight = "";
			} else {
				content.style.maxHeight = content.scrollHeight + "px";
			}
		});

		html.find("#sub").on("click", async (e) => {
			e.preventDefault();
			this.object.inProgress = true;
			this.render();
			for (const p of this.object.parseResults) {
				if (p.type === "success") {
					await p.save(this.object.imagePath);
				}
			}
			this.close();
		});
	}
}
