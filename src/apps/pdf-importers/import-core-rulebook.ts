import { flatMap, isError, isResult, Parser } from "../../pdf/parsers/lib";
import { isImageToken } from "../../pdf/lexers/token";
import { Beast } from "../../pdf/model/beast";
import { Image } from "../../pdf/model/common";
import { consumablesPage } from "../../pdf/parsers/consumablePage";
import { basicWeapons, rareWeapons } from "../../pdf/parsers/weaponPage";
import { armorPage } from "../../pdf/parsers/armorPage";
import { shieldPage } from "../../pdf/parsers/shieldPage";
import { accessories } from "../../pdf/parsers/accessoryPage";
import { beastiaryFUCR } from "../../pdf/parsers/beastiaryPage";
import { beastiary } from "../../pdf/parsers/beastiaryPageLegacy";
import { beastiaryFUHF, beastiaryFUTF, beastiaryFUNF } from "../../pdf/parsers/beastiaryPageAtlas";
import { StringToken, Token } from "../../pdf/lexers/token";
import { saveAccessories, saveArmors, saveBeasts, saveConsumables, saveShields, saveWeapons } from "./save-utils";
import { ParseResult } from "../import-pdf";

type Wrapper = <T extends { name: string } | [string, { name: string }[]]>(
	p: Parser<T[]>,
	s: (t: T[], source: string, f: readonly string[], imagePath: string) => Promise<void>,
) => Promise<ParseResult>;

const BESTIARY_PAGES = [
	326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348,
	349, 350, 351, 352, 353, 354, 355,
] as const;

const FUCR_BESTIARY_PAGES = Object.fromEntries(
	BESTIARY_PAGES.map((p) => [p, [["Beastiary"], (f: Wrapper) => f(beastiaryFUCR, saveBeasts)]]),
) as Record<number, [readonly string[], (f: Wrapper) => Promise<ParseResult>]>;

const FUHF_PAGES = [172, 173, 174, 175, 178, 182, 183, 184, 188, 189, 190, 191, 194, 196, 197, 198] as const;
const FUTF_PAGES = [188, 189, 190, 194, 195, 196, 200, 201, 204, 205, 206, 207, 212, 213, 214, 215] as const;
const FUNF_PAGES = [180, 181, 186, 187, 190, 191, 192, 193, 196, 197, 198, 199, 203, 205, 207] as const;

const bestiaryPages = (parser: typeof beastiaryFUCR, pages: readonly number[], folder: string) =>
	Object.fromEntries(pages.map((p) => [p, [[folder], (f: Wrapper) => f(parser, saveBeasts)]])) as Record<
		number,
		[readonly string[], (f: Wrapper) => Promise<ParseResult>]
	>;

const FUHF_BESTIARY_PAGES = bestiaryPages(beastiaryFUHF, FUHF_PAGES, "High Fantasy Bestiary");
const FUTF_BESTIARY_PAGES = bestiaryPages(beastiaryFUTF, FUTF_PAGES, "Techno Fantasy Bestiary");
const FUNF_BESTIARY_PAGES = bestiaryPages(beastiaryFUNF, FUNF_PAGES, "Natural Fantasy Bestiary");

// Beasts whose art is a full-page image on a separate page: cleaned name -> art page.
const FUHF_ART_OVERRIDES: Record<string, number> = {
	EILEEN: 170,
	"FLAME DRAGON": 176,
	CERINE: 180,
	CECILIA: 180,
	"MAXIMILIAN, THE PRINCE": 186,
	"MAXIMILIAN, THE BASTION": 186,
	MIMESIS: 193,
	ANAGNORISIS: 193,
	"DRAMATIST’S QUILL": 193,
	CATHARSIS: 193,
};
const FUTF_ART_OVERRIDES: Record<string, number> = {
	"COMMISSIONER VYNE": 186,
	"PRIMARY CORE": 198,
	"DIGITAL LIMB A": 198,
	"DIGITAL LIMB B": 198,
	"THE RELENTLESS": 202,
	"ATTACK WING": 202,
	"SUPPORT WING": 202,
	"ADMIRAL CERYON": 202,
	"THE PATRIARCH": 209,
	"CONCEPTUAL DYAD": 209,
	"THE PURE CONCEPT": 209,
};
const FUNF_ART_OVERRIDES: Record<string, number> = {
	ABDOMEN: 178,
	HEAD: 178,
	THORAX: 178,
	NODE: 184,
	DYLON: 184,
	"BACK OF BRIGHTVALE": 188,
	"FUNERARY LANTERN": 188,
	"HEAD OF BRIGHTVALE": 188,
	"QUEEN OF MIDDAY": 194,
	"QUEEN OF MIDNIGHT": 194,
	"ELDGREN, THE ANCIENT": 201,
};

const largestImage = (tokens: Token[]): Image | null => {
	let best: Image | null = null;
	for (const t of tokens) {
		if (!isImageToken(t)) continue;
		if (!best || t.image.width * t.image.height > best.width * best.height) best = t.image;
	}
	return best;
};

// Returns the art pages' cleanups; caller must defer them until after save.
const applyArtOverrides = async (
	beasts: Beast[],
	overrides: Record<string, number>,
	withPage: <R>(pageNum: number, f: (d: Token[]) => Promise<R>) => Promise<[R, () => boolean]>,
): Promise<(() => boolean)[]> => {
	const cache = new Map<number, Image | null>();
	const cleanups: (() => boolean)[] = [];
	for (const beast of beasts) {
		const artPage = overrides[beast.name];
		if (artPage === undefined) continue;
		if (!cache.has(artPage)) {
			const [img, cleanup] = await withPage(artPage, async (tokens) => largestImage(tokens));
			cache.set(artPage, img);
			cleanups.push(cleanup);
		}
		const img = cache.get(artPage);
		if (img) beast.image = img;
	}
	return cleanups;
};

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

const pr = (z: string | StringToken) => (typeof z === "string" ? z : `<Text str="${z.string}" font="${z.font}">`);

function importPages(
	pages: Record<number, readonly [readonly string[], (f: Wrapper) => Promise<ParseResult>]>,
	sourcePrefix: string,
	withPage: <R>(pageNum: number, f: (d: Token[]) => Promise<R>) => Promise<[R, () => boolean]>,
	artOverrides?: Record<string, number>,
): Promise<ParseResult[]> {
	return Promise.all(
		Object.entries(pages).map(([pageNumStr, [folders, f]]) => {
			return f(async (parser, save) => {
				const pageNum = Number(pageNumStr);
				const artCleanups: (() => boolean)[] = [];
				const [r, cleanup] = await withPage(pageNum, async (data) => {
					const source = sourcePrefix + (pageNum - 2);
					const parses = parser([data, 0]);
					const successes = parses.filter(isResult);
					if (successes.length == 1) {
						if (artOverrides) {
							artCleanups.push(
								...(await applyArtOverrides(
									successes[0].result[0] as unknown as Beast[],
									artOverrides,
									withPage,
								)),
							);
						}
						return {
							type: "success" as const,
							page: pageNum,
							results: flatMap<{ name: string } | [string, { name: string }[]], { name: string }>(
								successes[0].result[0],
								(v) => ("name" in v ? [v] : v[1]),
							),
							save: async (imagePath: string) =>
								await save(successes[0].result[0], source, folders, imagePath),
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
				const cleanupAll = () => {
					artCleanups.forEach((c) => c());
					return cleanup();
				};
				if (r.type === "success") {
					return { ...r, cleanup: cleanupAll };
				} else {
					cleanupAll();
					return r;
				}
			});
		}),
	);
}

export function importCoreRulebook(
	withPage: <R>(pageNum: number, f: (d: Token[]) => Promise<R>) => Promise<[R, () => boolean]>,
): Promise<ParseResult[]> {
	return importPages(PAGES, "FUCR", withPage);
}

export function importCoreBestiary(
	withPage: <R>(pageNum: number, f: (d: Token[]) => Promise<R>) => Promise<[R, () => boolean]>,
): Promise<ParseResult[]> {
	return importPages(FUCR_BESTIARY_PAGES, "FUCR", withPage);
}

export function importHighFantasyBestiary(
	withPage: <R>(pageNum: number, f: (d: Token[]) => Promise<R>) => Promise<[R, () => boolean]>,
): Promise<ParseResult[]> {
	return importPages(FUHF_BESTIARY_PAGES, "FUHF", withPage, FUHF_ART_OVERRIDES);
}

export function importTechnoFantasyBestiary(
	withPage: <R>(pageNum: number, f: (d: Token[]) => Promise<R>) => Promise<[R, () => boolean]>,
): Promise<ParseResult[]> {
	return importPages(FUTF_BESTIARY_PAGES, "FUTF", withPage, FUTF_ART_OVERRIDES);
}

export function importNaturalFantasyBestiary(
	withPage: <R>(pageNum: number, f: (d: Token[]) => Promise<R>) => Promise<[R, () => boolean]>,
): Promise<ParseResult[]> {
	return importPages(FUNF_BESTIARY_PAGES, "FUNF", withPage, FUNF_ART_OVERRIDES);
}
