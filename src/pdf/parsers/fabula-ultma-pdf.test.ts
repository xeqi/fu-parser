import { describe, expect, test } from "@jest/globals";
import fs from "fs";
import { tokenizePDF } from "../lexers/pdf";
import { consumablesPage } from "./consumablePage";
import { Parser, isResult } from "./lib";
import { basicWeapons, rareWeapons } from "./weaponPage";
import { armorPage } from "./armorPage";
import { shieldPage } from "./shieldPage";
import { accessories } from "./accessoryPage";
import { beastiary } from "./beastiaryPage";

const STANDARD_FONT_DATA_URL = "node_modules/pdfjs-dist/standard_fonts/";
const FABULA_ULTIMA_PDF_PATH = "data/Fabula_Ultima_-_Core_Rulebook.pdf";

const [withPage, destroy] = await tokenizePDF({
	data: new Uint8Array(fs.readFileSync(FABULA_ULTIMA_PDF_PATH)),
	standardFontDataUrl: STANDARD_FONT_DATA_URL,
});

const pages: [number, string, Parser<unknown>][] = [
	[106, "Consumables", consumablesPage],
	[132, "Weapons - Basic", basicWeapons],
	[133, "Weapons - Basic", basicWeapons],
	[134, "Armors - Basic", armorPage],
	[135, "Shields - Basic", shieldPage],
	[272, "Weapons - Rare", rareWeapons],
	[273, "Weapons - Rare", rareWeapons],
	[274, "Weapons - Rare", rareWeapons],
	[275, "Weapons - Rare", rareWeapons],
	[276, "Weapons - Rare", rareWeapons],
	[277, "Weapons - Rare", rareWeapons],
	[278, "Weapons - Rare", rareWeapons],
	[279, "Weapons - Rare", rareWeapons],
	[280, "Weapons - Rare", rareWeapons],
	[281, "Weapons - Rare", rareWeapons],
	[283, "Armors - Rare", armorPage],
	[284, "Armors - Rare", armorPage],
	[285, "Shields - Rare", shieldPage],
	[287, "Accessories", accessories],
	[288, "Accessories", accessories],
	[289, "Accessories", accessories],
	[326, "Beastiary", beastiary],
	[327, "Beastiary", beastiary],
	[328, "Beastiary", beastiary],
	[329, "Beastiary", beastiary],
	[330, "Beastiary", beastiary],
	[331, "Beastiary", beastiary],
	[332, "Beastiary", beastiary],
	[333, "Beastiary", beastiary],
	[334, "Beastiary", beastiary],
	[335, "Beastiary", beastiary],
	[336, "Beastiary", beastiary],
	[337, "Beastiary", beastiary],
	[338, "Beastiary", beastiary],
	[339, "Beastiary", beastiary],
	[340, "Beastiary", beastiary],
	[341, "Beastiary", beastiary],
	[342, "Beastiary", beastiary],
	[343, "Beastiary", beastiary],
	[344, "Beastiary", beastiary],
	[345, "Beastiary", beastiary],
	[346, "Beastiary", beastiary],
	[347, "Beastiary", beastiary],
	[348, "Beastiary", beastiary],
	[349, "Beastiary", beastiary],
	[350, "Beastiary", beastiary],
	[351, "Beastiary", beastiary],
	[352, "Beastiary", beastiary],
	[353, "Beastiary", beastiary],
	[354, "Beastiary", beastiary],
	[355, "Beastiary", beastiary],
] as const;

describe("parses pages", () => {
	for (const [page, name, f] of pages) {
		test(`${page} - ${name}`, async () => {
			await withPage(page, async (d) => {
				const successful = f([d, 0]).filter(isResult);
				expect(successful.length).toBe(1);
			});
		});
	}

	// test("current", async () => {
	// 	await withPage(350, async (d) => {
	// 		const data = d.map((t) => (isImageToken(t) ? { ...t, image: { ...t.image, data: [] } } : t));
	// 		const parses = beastiary([data, 0]);
	// 		// parses.filter(isError).map((z) => console.log(z.error));
	// 		console.log(data.slice(80));

	// 		expect(parses.filter(isResult).length).toBe(1);
	// 	});
	// });

	afterAll(() => destroy());
});
