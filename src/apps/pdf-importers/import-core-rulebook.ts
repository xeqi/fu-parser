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
import { beastiaryFUBA, beastiaryFUBACompanion, extractArtPageQuickRef } from "../../pdf/parsers/beastiaryPageBestiary";
import { arcanaFUBA } from "../../pdf/parsers/arcanaPageBestiary";
import { rulesFUBA, speciesRulesFUBA, roleSkillsFUBA } from "../../pdf/parsers/rulePageBestiary";
import { IndexEntry, indexNameKey, parseBeastiaryIndex } from "../../pdf/parsers/beastiaryIndexBestiary";
import { StringToken, Token } from "../../pdf/lexers/token";
import {
	saveAccessories,
	saveArcana,
	saveArmors,
	saveBeasts,
	saveConsumables,
	saveRules,
	saveShields,
	saveWeapons,
} from "./save-utils";
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
const FUBA_PAGES = [
	89, 90, 91, 93, 96, 97, 100, 101, 104, 105, 107, 109, 111, 113, 115, 118, 119, 120, 123, 126, 127, 131, 132, 133,
	135, 137, 139, 141, 144, 148, 149, 152, 153, 156, 157, 158, 159, 162, 163, 165, 167, 169, 171, 173, 176, 177, 178,
	179, 181, 183, 186, 187, 190, 191, 193, 197, 198, 199, 202, 203, 204, 205, 207, 209, 211, 214, 215, 216, 217, 219,
	221, 223, 225, 228, 229, 231, 235, 236, 237, 238, 242, 243, 245, 247, 249, 252, 253, 254, 255, 257, 259, 261, 264,
	265, 267, 270, 271, 272, 273, 276, 277, 278, 279, 281, 283, 286, 287, 289, 291, 294, 295, 297, 300, 301, 302, 303,
	306, 307, 308, 309, 312, 313, 314, 315, 318, 319, 322, 323, 324, 325,
] as const;

const bestiaryPages = (parser: typeof beastiaryFUCR, pages: readonly number[], folder: string) =>
	Object.fromEntries(pages.map((p) => [p, [[folder], (f: Wrapper) => f(parser, saveBeasts)]])) as Record<
		number,
		[readonly string[], (f: Wrapper) => Promise<ParseResult>]
	>;

const FUHF_BESTIARY_PAGES = bestiaryPages(beastiaryFUHF, FUHF_PAGES, "High Fantasy Bestiary");
const FUTF_BESTIARY_PAGES = bestiaryPages(beastiaryFUTF, FUTF_PAGES, "Techno Fantasy Bestiary");
const FUNF_BESTIARY_PAGES = bestiaryPages(beastiaryFUNF, FUNF_PAGES, "Natural Fantasy Bestiary");
const FUBA_BESTIARY_PAGES = bestiaryPages(beastiaryFUBA, FUBA_PAGES, "Bestiary Vol.1");
const FUBA_COMPANION_PAGES = [330, 331, 332, 333, 334, 335, 336, 337, 338] as const;
const FUBA_COMPANION_BESTIARY_PAGES = bestiaryPages(beastiaryFUBACompanion, FUBA_COMPANION_PAGES, "Bestiary Vol.1");
const FUBA_ARCANA_PAGES = [340, 341, 342, 343, 344, 345] as const;
const FUBA_ARCANA_BESTIARY_PAGES = Object.fromEntries(
	FUBA_ARCANA_PAGES.map((p) => [p, [["Bestiary Vol.1", "Arcana"], (f: Wrapper) => f(arcanaFUBA, saveArcana)]]),
) as Record<number, [readonly string[], (f: Wrapper) => Promise<ParseResult>]>;

const FUBA_BOSS_SEEDS: Record<number, string> = {
	59: "Control Skills",
	61: "Destructive Skills",
	63: "Elemental Skills",
	65: "Objective Skills",
	67: "Summoner Skills",
	69: "Survival Skills",
};
const FUBA_BOSS_PAGES = [57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69] as const;
const FUBA_BOSS_SKILL_PAGES = Object.fromEntries(
	FUBA_BOSS_PAGES.map((p) => [
		p,
		[["Bestiary Vol.1", "Boss Skills"], (f: Wrapper) => f(rulesFUBA(FUBA_BOSS_SEEDS[p] ?? ""), saveRules)],
	]),
) as Record<number, [readonly string[], (f: Wrapper) => Promise<ParseResult>]>;

// Negative Skills
const FUBA_NEGATIVE_PAGES = [70, 71] as const;
const FUBA_NEGATIVE_SKILL_PAGES = Object.fromEntries(
	FUBA_NEGATIVE_PAGES.map((p) => [
		p,
		[["Bestiary Vol.1", "Negative Skills"], (f: Wrapper) => f(rulesFUBA("Negative Skills"), saveRules)],
	]),
) as Record<number, [readonly string[], (f: Wrapper) => Promise<ParseResult>]>;

// Species Skills
const FUBA_SPECIES_PAGES = [72, 73, 74, 75] as const;
const FUBA_SPECIES_SKILL_PAGES = Object.fromEntries(
	FUBA_SPECIES_PAGES.map((p) => [p, [["Bestiary Vol.1"], (f: Wrapper) => f(speciesRulesFUBA, saveRules)]]),
) as Record<number, [readonly string[], (f: Wrapper) => Promise<ParseResult>]>;

const FUBA_ROLE_SKILL_SEEDS: Record<number, string> = {
	34: "Brute",
	35: "Brute",
	38: "Hunter",
	39: "Hunter",
	42: "Mage",
	43: "Mage",
	46: "Saboteur",
	47: "Saboteur",
	50: "Sentinel",
	51: "Sentinel",
	54: "Support",
	55: "Support",
};
const FUBA_ROLE_SKILL_PAGES = [34, 35, 38, 39, 42, 43, 46, 47, 50, 51, 54, 55] as const;
const FUBA_ROLE_SKILLS_PAGES = Object.fromEntries(
	FUBA_ROLE_SKILL_PAGES.map((p) => [
		p,
		[["Bestiary Vol.1", "Role Skills"], (f: Wrapper) => f(roleSkillsFUBA(FUBA_ROLE_SKILL_SEEDS[p]), saveRules)],
	]),
) as Record<number, [readonly string[], (f: Wrapper) => Promise<ParseResult>]>;

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

const FUBA_ART_OVERRIDES: Record<string, number> = {
	HEAD: 89,
	ARACHNE: 92,
	"ARBOREAL DRAGON": 94,
	"ARSENAL COBRA": 98,
	"TOWERING APPARATUS": 102,
	BALOR: 106,
	BAROMETZ: 108,
	BASILISK: 110,
	"BLOOD MANTIS": 112,
	"BOMB HORNET": 114,
	ECHINOKORE: 116,
	DORNRÖSCHEN: 119,
	BUGABOO: 122,
	HELLKNIGHT: 128,
	DIABLOSAUR: 134,
	DOOMWALL: 136,
	"DREAD SERAPH": 138,
	DYNAGUAR: 140,
	GRENDEL: 150,
	"GHOST SHIP": 157,
	GIGANTES: 160,
	GORGON: 164,
	HARPY: 166,
	HYDRA: 168,
	ICHTHYODAIMON: 170,
	IUDEX: 172,
	KAISERWURM: 180,
	KELPIE: 182,
	MAGNATOAD: 192,
	"MELLOW PWIHNCE": 194,
	MINOTAUR: 206,
	MULTIGROA: 208,
	NECRODRAGON: 210,
	"ASMODEUS OF LUST": 218,
	"BEELZEBUB OF GLUTTONY": 220,
	"MAMMON OF GREED": 222,
	"BELPHEGOR OF SLOTH": 224,
	"SAMAEL OF PRIDE": 230,
	"TRUE DEMIURGE SAMAEL": 232,
	PHALANX: 244,
	PHOENIX: 246,
	POLLENDINA: 248,
	ZU: 250,
	REASSEMBLER: 256,
	SCARABRUTUS: 258,
	SCRAPROID: 260,
	JORMUNGANDR: 262,
	SHROOMBLADE: 266,
	"HEAD (GASHADOKURO)": 268,
	ARCHMAGE: 274,
	SPHINX: 280,
	TREANT: 282,
	UNDINE: 288,
	UNICORN: 290,
	BLUTSAUGER: 292,
	WALPURGISGRAS: 296,
	HOVERCYCLE: 300,
	"LEGS (MMP)": 302,
	"BODY (MMP)": 302,
	"LOWER HEAD (AMPHISBAENA)": 312,
	"UPPER HEAD (AMPHISBAENA)": 312,
	GUIVRE: 310,
	"RING OF ETERNITY": 316,
	ZIRNITRA: 316,
	GOG: 320,
};

// The Bestiary vol.1 cross-reference table (book pages 352-356 => PDF pages 354-358).
const FUBA_INDEX_PAGES = [354, 355, 356, 357, 358] as const;

const buildBeastiaryIndex = async (
	withPage: <R>(pageNum: number, f: (d: Token[]) => Promise<R>) => Promise<[R, () => boolean]>,
): Promise<Record<string, IndexEntry>> => {
	const index: Record<string, IndexEntry> = {};
	for (const page of FUBA_INDEX_PAGES) {
		const [rows, cleanup] = await withPage(page, async (tokens) => parseBeastiaryIndex(tokens));
		Object.assign(index, rows);
		cleanup();
	}
	return index;
};

const applyRankIndex = (beasts: Beast[], index: Record<string, IndexEntry>): void => {
	for (const beast of beasts) {
		const entry = index[indexNameKey(beast.name)];
		if (!entry) continue;
		beast.rank = entry.rank;
		if (entry.phases !== undefined) beast.phases = entry.phases;
		else delete beast.phases;
		if (entry.role !== undefined) beast.role = entry.role;
	}
};

const bestImage = (tokens: Token[]): Image | null => {
	const images = tokens.filter(isImageToken).map((t) => t.image);
	const dimKey = (img: Image) => `${img.width}x${img.height}`;
	const counts = new Map<string, number>();
	for (const img of images) counts.set(dimKey(img), (counts.get(dimKey(img)) ?? 0) + 1);
	const candidates = images.filter((img) => counts.get(dimKey(img)) === 1);
	const pool = candidates.length > 0 ? candidates : images;

	let best: Image | null = null;
	for (const img of pool) {
		if (!best || img.width * img.height > best.width * best.height) best = img;
	}
	return best;
};

// Returns the art pages' cleanups; caller must defer them until after save.
const applyArtOverrides = async (
	beasts: Beast[],
	overrides: Record<string, number>,
	withPage: <R>(pageNum: number, f: (d: Token[]) => Promise<R>) => Promise<[R, () => boolean]>,
): Promise<(() => boolean)[]> => {
	const cache = new Map<number, { image: Image | null; quickRef: string | null }>();
	const cleanups: (() => boolean)[] = [];
	for (const beast of beasts) {
		const artPage = overrides[beast.name];
		if (artPage === undefined) continue;
		if (!cache.has(artPage)) {
			const [entry, cleanup] = await withPage(artPage, async (tokens) => ({
				image: bestImage(tokens),
				quickRef: extractArtPageQuickRef(tokens),
			}));
			cache.set(artPage, entry);
			cleanups.push(cleanup);
		}
		const entry = cache.get(artPage);
		if (entry?.image) beast.image = entry.image;
		if (entry?.quickRef && !beast.description.startsWith("▲")) {
			beast.description = `${entry.quickRef}<br>${beast.description}`.trim();
		}
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
	rankIndex?: Record<string, IndexEntry>,
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
						if (rankIndex) {
							applyRankIndex(successes[0].result[0] as unknown as Beast[], rankIndex);
						}
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

export async function importBestiaryVol1(
	withPage: <R>(pageNum: number, f: (d: Token[]) => Promise<R>) => Promise<[R, () => boolean]>,
): Promise<ParseResult[]> {
	const rankIndex = await buildBeastiaryIndex(withPage);
	const [beasts, companions, arcana, bossSkills, negativeSkills, speciesSkills, roleSkills] = await Promise.all([
		importPages(FUBA_BESTIARY_PAGES, "FUBA", withPage, FUBA_ART_OVERRIDES, rankIndex),
		importPages(FUBA_COMPANION_BESTIARY_PAGES, "FUBA", withPage),
		importPages(FUBA_ARCANA_BESTIARY_PAGES, "FUBA", withPage),
		importPages(FUBA_BOSS_SKILL_PAGES, "FUBA", withPage),
		importPages(FUBA_NEGATIVE_SKILL_PAGES, "FUBA", withPage),
		importPages(FUBA_SPECIES_SKILL_PAGES, "FUBA", withPage),
		importPages(FUBA_ROLE_SKILLS_PAGES, "FUBA", withPage),
	]);
	return [...beasts, ...companions, ...arcana, ...bossSkills, ...negativeSkills, ...speciesSkills, ...roleSkills];
}
