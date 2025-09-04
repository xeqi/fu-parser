import fc from "fast-check";
import { cost, word, description } from "../arbs/arbs";
import { flatMap, isResult } from "./lib";
import { Token } from "../lexers/token";
import { imageToken, stringToken, watermark } from "../arbs/output";
import { rareWeapons } from "./weaponPage";
import { Weapon } from "../model/weapon";
import { DAMAGE_TYPES, DISTANCES, HANDED, Image, STATS, WEAPON_CATEGORIES } from "../model/common";
import { prettifyStrings } from "../parsers-commons";

const weaponDataGen = fc.record({
	name: word(),
	description: description(),
	image: fc.constant({ width: 0, height: 0 } as Image),
	martial: fc.boolean(),
	cost: cost(),
	damage: fc.nat(),
	accuracy: fc.record({ primary: fc.constantFrom(...STATS), secondary: fc.constantFrom(...STATS), bonus: fc.nat() }),
	damageType: fc.constantFrom(...DAMAGE_TYPES),
	hands: fc.constantFrom(...HANDED),
	melee: fc.constantFrom(...DISTANCES),
});

const weaponCategoriesGen = fc.tuple(fc.constantFrom(...WEAPON_CATEGORIES), fc.array(weaponDataGen, { minLength: 1 }));

test("rare weapon parses generated", () => {
	fc.assert(
		fc.property(weaponCategoriesGen, ([category, d]): void => {
			const pageTokens: Token[] = [
				imageToken({ width: 0, height: 0 } as Image),
				imageToken({ width: 0, height: 0 } as Image),
				stringToken(""),
				stringToken(`SAMPLE RARE ${category} WEAPONS`),
				stringToken(""),
				...flatMap(d, (m) => [
					imageToken(m.image),
					stringToken(m.name),
					...(m.martial ? [stringToken("E", "FnT_BasicShapes1")] : []),
					stringToken(m.cost.toString(), "FBDLWO+PTSans-Narrow"),
					stringToken("【"),
					stringToken(`${m.accuracy.primary} + ${m.accuracy.secondary}`),
					stringToken("】"),
					...(m.accuracy.bonus > 0 ? [stringToken(`+${m.accuracy.bonus}`)] : []),
					stringToken("【"),
					stringToken(`HR + ${m.damage}`),
					stringToken("】"),
					stringToken(m.damageType),
					stringToken(m.hands.charAt(0).toUpperCase() + m.hands.slice(1)),
					stringToken("w", "Wingdings-Regular"),
					stringToken(m.melee.charAt(0).toUpperCase() + m.melee.slice(1)),
					stringToken("w", "Wingdings-Regular"),

					...m.description.map((s) => stringToken(s, "FBDLWO+PTSans-Narrow")),
				]),
				watermark,
			];
			const parses = rareWeapons([pageTokens, 0]);
			const expected: Weapon[] = d.map((v) => {
				return { ...v, description: prettifyStrings(v.description), category };
			});
			const successful = parses.filter(isResult);
			for (const p of successful) {
				expect(p.result[0]).toEqual(expected);
			}
			expect(successful.length).toBe(1);
		}),
	);
});
