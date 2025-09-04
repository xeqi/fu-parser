import { flatMap, isError, isResult, Parser } from "../../pdf/parsers/lib";
import { consumablesPage } from "../../pdf/parsers/consumablePage";
import { basicWeapons, rareWeapons } from "../../pdf/parsers/weaponPage";
import { armorPage } from "../../pdf/parsers/armorPage";
import { shieldPage } from "../../pdf/parsers/shieldPage";
import { accessories } from "../../pdf/parsers/accessoryPage";
import { beastiary } from "../../pdf/parsers/beastiaryPage";
import { StringToken, Token } from "../../pdf/lexers/token";
import { saveAccessories, saveArmors, saveBeasts, saveConsumables, saveShields, saveWeapons } from "./save-utils";
import { ParseResult } from "../import-pdf";

type Wrapper = <T extends { name: string } | [string, { name: string }[]]>(
	p: Parser<T[]>,
	s: (t: T[], source: string, f: readonly string[], imagePath: string) => Promise<void>,
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

const pr = (z: string | StringToken) => (typeof z === "string" ? z : `<Text str="${z.string}" font="${z.font}">`);

export function importCoreRulebook(
	withPage: <R>(pageNum: number, f: (d: Token[]) => Promise<R>) => Promise<[R, () => boolean]>,
): Promise<ParseResult[]> {
	return Promise.all(
		Object.entries(PAGES).map(([pageNumStr, [folders, f]]) => {
			return f(async (parser, save) => {
				const pageNum = Number(pageNumStr);
				const [r, cleanup] = await withPage(pageNum, async (data) => {
					const source = "FUCR" + (pageNum - 2);
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
				if (r.type === "success") {
					return { ...r, cleanup };
				} else {
					cleanup();
					return r;
				}
			});
		}),
	);
}
