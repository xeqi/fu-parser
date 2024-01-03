/**@license
 * fu-parser
 *
 *   All rights reserved
 *
 * ------------------------------------------------------------------------
 * pdf.js
 * Copyright 2023 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import { tokenizePDF } from "./lexers/pdf";
import * as pdfjsLib from "pdfjs-dist";
import { consumablesPage } from "./parsers/consumablePage";
import { Parser, flatMap, isError, isResult } from "./parsers/lib";
import { beastiary } from "./parsers/beastiaryPage";
import { basicWeapons, rareWeapons } from "./parsers/weaponPage";
import { accessories } from "./parsers/accessoryPage";
import { armorPage } from "./parsers/armorPage";
import { shieldPage } from "./parsers/shieldPage";
import { saveAccessories, saveArmors, saveBeasts, saveConsumables, saveShields, saveWeapons } from "./project-fu";
import { StringToken } from "./lexers/token";

// Relative url that foundry serves for the compiled webworker
pdfjsLib.GlobalWorkerOptions.workerSrc = "modules/fu-parser/pdf.worker.js";

// Foundry v10 creates these methods, but pdfjs does not like extra methods on Object that are enumerable,
// so fix the compatibility issue
for (const prop of ["deepFlatten", "equals", "partition", "filterJoin", "findSplice"]) {
	Object.defineProperty(Array.prototype, prop, {
		enumerable: false,
	});
}

type Wrapper = <T extends { name: string } | [string, { name: string }[]]>(
	p: Parser<T[]>,
	s: (t: T[], pn: number, f: readonly string[], imagePath: string) => Promise<void>,
) => Promise<ParseResult>;

const PAGES = {
	106: [["Equipment", "Consumables"], (f: Wrapper) => f(consumablesPage, saveConsumables)],
	132: [["Equipment", "Weapons", "Basic"], (f: Wrapper) => f(basicWeapons, saveWeapons)],
	133: [["Equipment", "Weapons", "Basic"], (f: Wrapper) => f(basicWeapons, saveWeapons)],
	134: [["Equipment", "Armors", "Basic"], (f: Wrapper) => f(armorPage, saveArmors)],
	135: [["Equipment", "Shields", "Basic"], (f: Wrapper) => f(shieldPage, saveShields)],
	272: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	273: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	274: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	275: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	276: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	277: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	278: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	279: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	280: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	281: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	283: [["Equipment", "Armors", "Rare"], (f: Wrapper) => f(armorPage, saveArmors)],
	284: [["Equipment", "Armors", "Rare"], (f: Wrapper) => f(armorPage, saveArmors)],
	285: [["Equipment", "Shields", "Rare"], (f: Wrapper) => f(shieldPage, saveShields)],
	287: [["Equipment", "Accessories"], (f: Wrapper) => f(accessories, saveAccessories)],
	288: [["Equipment", "Accessories"], (f: Wrapper) => f(accessories, saveAccessories)],
	289: [["Equipment", "Accessories"], (f: Wrapper) => f(accessories, saveAccessories)],
	326: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	327: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	328: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	329: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	330: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	331: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	332: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	333: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	334: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	335: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	336: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	337: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	338: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	339: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	340: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	341: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	342: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	343: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	344: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	345: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	346: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	347: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	348: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	349: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	350: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	351: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	352: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	353: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	354: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	355: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
} as const;

type ParseResult = { page: number } & (
	| { type: "success"; save: (imagePath: string) => Promise<void>; cleanup: () => boolean }
	| { type: "failure"; errors: { found: string; error: string; distance: number }[] }
	| { type: "too many"; count: number; errors: { found: string; error: string; distance: number }[] }
);

const pr = (z: string | StringToken) => (typeof z === "string" ? z : `<Text str="${z.string}" font="${z.font}">`);

const parsePdf = async (pdfPath: string): Promise<[ParseResult[], () => Promise<void>]> => {
	const [withPage, destroy] = await tokenizePDF(pdfPath);

	return [
		await Promise.all(
			Object.entries(PAGES).map(([pageNumStr, [folders, f]]) => {
				return f(async (parser, save) => {
					const pageNum = Number(pageNumStr);
					const [r, cleanup] = await withPage(pageNum, async (data) => {
						const parses = parser([data, 0]);
						const successes = parses.filter(isResult);
						if (successes.length == 1) {
							return {
								type: "success" as const,
								page: pageNum,
								results: flatMap<{ name: string } | [string, { name: string }[]], { name: string }>(
									successes[0].result[0],
									(v) => ("name" in v ? [v] : v[1]),
								),
								save: async (imagePath: string) =>
									await save(successes[0].result[0], pageNum, folders, imagePath),
							};
						} else {
							const failures = parses.filter(isError);
							if (successes.length == 0) {
								return {
									type: "failure" as const,
									page: pageNum,
									errors: failures.map((v) => {
										return { ...v, found: pr(v.found) };
									}),
								};
							} else {
								return {
									type: "too many" as const,
									page: pageNum,
									count: successes.length,
									errors: failures.map((v) => {
										return { ...v, found: pr(v.found) };
									}),
								};
							}
						}
					});
					if (r.type === "success") {
						return { ...r, cleanup };
					} else {
						cleanup();
						return r;
					}
				});
			}),
		),
		destroy,
	];
};

type ImportPDFSubmissionData = { pdfPath: string; imagePath: string };

type ImportPDFData = ImportPDFSubmissionData & {
	parseResults: ParseResult[];
	destroy?: () => Promise<void>;
	inProgress: boolean;
};

class ImportPDFApplication extends FormApplication<ImportPDFData> {
	async _updateObject<T extends ImportPDFData>(_e: Event, data: T) {
		if (data.imagePath != this.object.imagePath) {
			this.object.imagePath = data.imagePath;
		}
		if (data.pdfPath != this.object.pdfPath) {
			this.cleanupPDFResources();
			this.object.pdfPath = data.pdfPath;
			this.render();
			const [results, destroy] = await parsePdf(this.object.pdfPath);
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
		return "modules/fu-parser/templates/import.hbs";
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

Hooks.on("renderSettings", async (_app, $html) => {
	if (game.user.isGM) {
		const html = $html[0];
		const header = document.createElement("h2");
		header.appendChild(new Text("FU Importer"));
		const importButton = document.createElement("button");
		importButton.type = "button";
		importButton.append("Import PDF");
		importButton.addEventListener("click", () => {
			const application = new ImportPDFApplication(
				{ pdfPath: "", imagePath: "", parseResults: [], inProgress: false },
				{
					width: 450,
					height: 600,
					submitOnChange: true,
					closeOnSubmit: false,
					title: "FU importer",
					resizable: true,
				},
			);
			application.render(true);
		});
		const div = document.createElement("div");
		div.appendChild(importButton);
		html.querySelector("#settings-documentation")?.after(header, div);
	}
});
