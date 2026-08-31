import * as pdfjsLib from "pdfjs-dist";
import { tokenizePDF } from "../pdf/lexers/pdf";
import {
	importCoreRulebook,
	importCoreBestiary,
	importCoreBasicEquipment,
	importHighFantasyBestiary,
	importTechnoFantasyBestiary,
	importNaturalFantasyBestiary,
	importBestiaryVol1,
} from "./pdf-importers/import-core-rulebook";
import { importItems } from "./pdf-importers/import-items";
import { normalizeImagePath } from "../external/project-fu";

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
		case "FUCR_LEGACY":
			return [await importCoreRulebook(withPage), destroy];
		case "FUCR":
			return [
				[
					...(await importItems(withPage, bookType)),
					...(await importCoreBasicEquipment(withPage)),
					...(await importCoreBestiary(withPage)),
				],
				destroy,
			];
		case "FUHF":
			return [
				[...(await importItems(withPage, bookType)), ...(await importHighFantasyBestiary(withPage))],
				destroy,
			];
		case "FUTF":
			return [
				[...(await importItems(withPage, bookType)), ...(await importTechnoFantasyBestiary(withPage))],
				destroy,
			];
		case "FUNF":
			return [
				[...(await importItems(withPage, bookType)), ...(await importNaturalFantasyBestiary(withPage))],
				destroy,
			];
		case "FUBA":
			return [await importBestiaryVol1(withPage), destroy];
	}
};

export type BookType = (typeof BOOK_TYPES)[number];
export const BOOK_TYPES = ["FUCR", "FUCR_LEGACY", "FUHF", "FUTF", "FUNF", "FUBA"] as const;
export const bookTypes = {
	FUCR: "Core Rulebook (v1.1)",
	FUCR_LEGACY: "Core Rulebook (v1.02)",
	FUHF: "High Fantasy Atlas (v1.1)",
	FUTF: "Techno Fantasy Atlas (v1.1)",
	FUNF: "Natural Fantasy Atlas (v1.1)",
	FUBA: "Bestiary Vol.1",
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

export class ImportPDFApplication extends foundry.applications.api.HandlebarsApplicationMixin(
	foundry.applications.api.ApplicationV2,
) {
	object: ImportPDFData;

	constructor(object: ImportPDFData, options?: Partial<foundry.applications.api.ApplicationConfiguration>) {
		super(options);
		this.object = object;
	}

	static DEFAULT_OPTIONS = {
		id: "fu-parser-import-pdf",
		tag: "form",
		classes: ["fu-parser"],
		window: {
			title: "Fabula Ultima PDF importer",
			resizable: true,
		},
		position: {
			width: 450,
			height: 600,
		},
		form: {
			handler: ImportPDFApplication.#onSubmit,
			submitOnChange: true,
			closeOnSubmit: false,
		},
		actions: {
			import: ImportPDFApplication.#onImport,
			toggleCollapse: ImportPDFApplication.#onToggleCollapse,
		},
	};

	static PARTS = {
		form: { template: "modules/fu-parser/templates/import-pdf.hbs", scrollable: [".fu-parser-parse-list"] },
	};

	static async #onSubmit(this: ImportPDFApplication, _event: Event, _form: HTMLFormElement, formData: FormDataExtended) {
		const data = formData.object as ImportPDFSubmissionData;
		if (data.imagePath != this.object.imagePath) {
			this.object.imagePath = data.imagePath;
		}
		if (data.pdfPath != this.object.pdfPath || data.bookType != this.object.bookType) {
			this.cleanupPDFResources();
			this.object.pdfPath = data.pdfPath;
			this.object.bookType = data.bookType;
			this.render();
			if (this.object.pdfPath !== "") {
				const [results, destroy] = await parsePdf(this.object.pdfPath, this.object.bookType);
				this.object.parseResults = results;
				this.object.destroy = destroy;
			}
		}
		this.render();
	}

	static async #onImport(this: ImportPDFApplication) {
		this.object.inProgress = true;
		this.render();
		const imagePath = normalizeImagePath(this.object.imagePath);
		for (const p of this.object.parseResults) {
			if (p.type === "success") {
				await p.save(imagePath);
			}
		}
		this.close();
	}

	static #onToggleCollapse(this: ImportPDFApplication, _event: PointerEvent, target: HTMLElement) {
		target.classList.toggle("fu-parser-active");
		const content = target.nextElementSibling as HTMLElement | null;
		if (content?.style.maxHeight) {
			content.style.maxHeight = "";
		} else if (content) {
			content.style.maxHeight = content.scrollHeight + "px";
		}
	}

	protected async _prepareContext(): Promise<ImportPDFData & { disabled: boolean }> {
		return {
			...this.object,
			disabled:
				this.object.imagePath === "" ||
				this.object.pdfPath === "" ||
				this.object.parseResults.length == 0 ||
				this.object.inProgress,
		};
	}

	protected _onClose() {
		this.cleanupPDFResources();
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
}
