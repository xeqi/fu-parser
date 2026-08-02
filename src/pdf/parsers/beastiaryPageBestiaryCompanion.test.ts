import { afterAll, describe, expect, test } from "@jest/globals";
import fs from "fs";
import { tokenizePDF } from "../lexers/pdf";
import { isResult } from "./lib";
import { Beast } from "../model/beast";
import { beastiaryFUBACompanion } from "./beastiaryPageBestiary";

const STANDARD_FONT_DATA_URL = "node_modules/pdfjs-dist/standard_fonts/";
const FUBA_PDF_PATH = "data/Fabula_Ultima_Bestiary_vol.1.pdf";

// The Companions section (book pp. 328-336 => PDF pages 330-338).
const COMPANION_PAGES = [330, 331, 332, 333, 334, 335, 336, 337, 338];

const pdfPresent = fs.existsSync(FUBA_PDF_PATH);
const [withPage, destroy] = pdfPresent
	? await tokenizePDF({
			data: new Uint8Array(fs.readFileSync(FUBA_PDF_PATH)),
			standardFontDataUrl: STANDARD_FONT_DATA_URL,
		})
	: [null as never, async () => {}];

const parsePage = async (page: number): Promise<Beast[]> => {
	let beasts: Beast[] = [];
	await withPage(page, async (tokens) => {
		const successes = beastiaryFUBACompanion([tokens, 0]).filter(isResult);
		expect(successes.length).toBe(1);
		beasts = successes[0].result[0];
	});
	return beasts;
};

(pdfPresent ? describe : describe.skip)("Bestiary vol.1 companion parser (real PDF)", () => {
	describe("every companion page parses to exactly one result", () => {
		for (const page of COMPANION_PAGES) {
			test(`page ${page}`, async () => {
				await parsePage(page);
			});
		}
	});

	test("every companion is level 5 and ranked companion", async () => {
		for (const page of COMPANION_PAGES) {
			const beasts = await parsePage(page);
			expect(beasts.length).toBeGreaterThan(0);
			for (const b of beasts) {
				expect(b.rank).toBe("companion");
				expect(b.level).toBe(5);
			}
		}
	});

	test("parses a spellcasting companion with immunities (AMAGUS, p330)", async () => {
		const [beast] = await parsePage(330);
		expect(beast.name).toBe("AMAGUS");
		expect(beast.type).toBe("PLANT");
		expect(beast.rank).toBe("companion");
		expect(beast.level).toBe(5);
		expect(beast.attributes).toMatchObject({ dex: 6, ins: 6, mig: 10, wlp: 10, maxHp: 32, maxMp: 55 });
		expect(beast.attributes.init).toBe((beast.attributes.dex + beast.attributes.ins) / 2);
		expect(beast.resists).toMatchObject({ air: "VU", dark: "RS", light: "RS" });
		expect(beast.immunities).toEqual(expect.arrayContaining(["dazed", "enraged", "shaken"]));
		expect(beast.traits).toContain("Immune to");
		expect(beast.attacks.map((a) => a.name)).toEqual(["Fungus Roll", "Little Star"]);
		expect(beast.spells.map((s) => s.name)).toEqual(["Heal", "Itchy Spores"]);
	});

	test("parses a construct companion with special rules only (BUZZER, p331)", async () => {
		const [beast] = await parsePage(331);
		expect(beast.name).toBe("BUZZER");
		expect(beast.type).toBe("CONSTRUCT");
		expect(beast.attributes).toMatchObject({ dex: 8, ins: 10, mig: 8, wlp: 6, maxHp: 26, maxMp: 35 });
		expect(beast.immunities).toContain("poisoned");
		expect(beast.attacks.map((a) => a.name)).toEqual(["Static Shot"]);
		expect(beast.spells).toEqual([]);
		expect(beast.specialRules.map((r) => r.name)).toEqual(["Auto-scan", "Flying", "Mecha Driver"]);
	});

	test("parses a beast companion (FREKI, p332)", async () => {
		const [beast] = await parsePage(332);
		expect(beast.name).toBe("FREKI");
		expect(beast.type).toBe("BEAST");
		expect(beast.attributes).toMatchObject({ dex: 10, ins: 6, mig: 8, wlp: 8, maxHp: 36, maxMp: 45 });
	});

	afterAll(() => destroy());
});
