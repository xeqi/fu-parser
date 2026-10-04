import { afterAll, describe, expect, test } from "@jest/globals";
import fs from "fs";
import { tokenizePDF } from "../lexers/pdf";
import { isResult } from "./lib";
import { Beast } from "../model/beast";
import { beastiaryFUBA, extractArtPageQuickRef } from "./beastiaryPageBestiary";

const STANDARD_FONT_DATA_URL = "node_modules/pdfjs-dist/standard_fonts/";
const FUBA_PDF_PATH = "data/Fabula_Ultima_Bestiary_vol.1.pdf";

const FUBA_PAGES = [
	89, 90, 91, 93, 96, 97, 100, 101, 104, 105, 107, 109, 111, 113, 115, 118, 119, 120, 123, 126, 127, 131, 132, 133,
	135, 137, 139, 141, 144, 148, 149, 152, 153, 156, 157, 158, 159, 162, 163, 165, 167, 169, 171, 173, 176, 177, 178,
	179, 181, 183, 186, 187, 190, 191, 193, 197, 198, 199, 202, 203, 204, 205, 207, 209, 211, 214, 215, 216, 217, 219,
	221, 223, 225, 228, 229, 231, 235, 236, 237,
];

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
		const successes = beastiaryFUBA([tokens, 0]).filter(isResult);
		expect(successes.length).toBe(1);
		beasts = successes[0].result[0];
	});
	return beasts;
};

(pdfPresent ? describe : describe.skip)("Bestiary vol.1 parser (real PDF)", () => {
	describe("every stat-block page parses to exactly one result", () => {
		for (const page of FUBA_PAGES) {
			test(`page ${page}`, async () => {
				await parsePage(page);
			});
		}
	});

	test("parses a champion boss with phases (TOWERING APPARATUS, p105)", async () => {
		const [beast] = await parsePage(105);
		expect(beast.name).toBe("TOWERING APPARATUS");
		expect(beast.type).toBe("CONSTRUCT");
		expect(beast.rank).toBe("champion");
		expect(beast.phases).toBe(4);
		expect(beast.level).toBe(40);
		expect(beast.role).toBe("sentinel");
		expect(beast.villain).toBe("minor");
		expect(beast.resists).toMatchObject({ light: "IM", bolt: "VU", air: "N", earth: "RS" });
		expect(beast.attributes.mdef).toBe(2);
		expect(beast.traits).toContain("Immune to poisoned");
		expect(beast.attacks.map((a) => a.name)).toEqual(["Seismic Hand", "Deflagrating Rockets"]);
		expect(beast.spells.map((s) => s.name)).toEqual(["Annihilator Beam"]);
		expect(beast.otherActions.map((o) => o.name)).toEqual(["Threat Identification"]);
		expect(beast.specialRules.map((r) => r.name)).toEqual(["Keeling Titan"]);
	});

	test("defaults unranked low-level monsters to soldier (BAROMETZ, p109)", async () => {
		const [beast] = await parsePage(109);
		expect(beast.name).toBe("BAROMETZ");
		expect(beast.type).toBe("PLANT");
		expect(beast.rank).toBe("soldier");
		expect(beast.phases).toBeUndefined();
		expect(beast.villain).toBeUndefined();
	});

	test('handles the "no basic attacks" placeholder (HIND LEG, p91)', async () => {
		const [beast] = await parsePage(91);
		expect(beast.name).toBe("HIND LEG");
		expect(beast.attacks).toEqual([]);
		expect(beast.otherActions.length).toBeGreaterThan(0);
		const rule = beast.specialRules.find((r) => r.name === "Far Too Massive");
		expect(rule).toBeDefined();
		expect(rule!.name.length).toBeLessThan(30);
	});

	test("skips a stray resistance glyph and keeps the grid aligned (DYNAGUAR, p141)", async () => {
		const [beast] = await parsePage(141);
		expect(beast.name).toBe("DYNAGUAR");
		expect(beast.resists).toEqual({
			physical: "N",
			air: "N",
			bolt: "RS",
			dark: "N",
			earth: "VU",
			fire: "N",
			ice: "N",
			light: "RS",
			poison: "N",
		});
		expect(beast.attacks.map((a) => a.name)).toEqual(["Leaping Bite", "Tendril Lash"]);
	});

	describe("extractArtPageQuickRef", () => {
		test("extracts resist/weak text from an art page (BAROMETZ's art page, p108)", async () => {
			await withPage(108, async (tokens) => {
				expect(extractArtPageQuickRef(tokens)).toBe(
					"▲ earth, ice, poison, Resistance (physical, bolt), poisoned, weak, immunity (poisoned).<br>" +
						"▼ bolt, dazed, enraged, shaken.",
				);
			});
		});

		test("skips the SEE INDIVIDUAL ENTRIES placeholder (ARBOREAL DRAGON's art page, p94)", async () => {
			await withPage(94, async (tokens) => {
				expect(extractArtPageQuickRef(tokens)).toBeNull();
			});
		});

		test("returns null for a page with no art-page mini-beast block (BAROMETZ's own statblock, p109)", async () => {
			await withPage(109, async (tokens) => {
				expect(extractArtPageQuickRef(tokens)).toBeNull();
			});
		});
	});

	afterAll(() => destroy());
});
