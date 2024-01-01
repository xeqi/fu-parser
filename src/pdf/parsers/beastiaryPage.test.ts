import fc from "fast-check";
import { description, resistance, descriptionEnd, word } from "../arbs/arbs";
import { imageToken, stringToken } from "../arbs/output";
import { Image, Token } from "../lexers/token";
import { DieSize, Distance, STATS, TYPE_CODES, flatMap, isResult, prettifyStrings } from "./lib";
import { Beast, beastiary } from "./beastiaryPage";

const beastiaryDataGen = fc.array(
	fc.record({
		image: fc.constant({ width: 0, height: 0 } as Image),
		name: word(),
		level: fc.nat(),
		type: word(),
		description: description(),
		traits: descriptionEnd(),
		attributes: fc.record({
			dex: fc.constantFrom(6, 8, 10, 12) as fc.Arbitrary<DieSize>,
			ins: fc.constantFrom(6, 8, 10, 12) as fc.Arbitrary<DieSize>,
			mig: fc.constantFrom(6, 8, 10, 12) as fc.Arbitrary<DieSize>,
			wlp: fc.constantFrom(6, 8, 10, 12) as fc.Arbitrary<DieSize>,
			maxHp: fc.integer({ min: 5, max: 10000 }),
			crisis: fc.integer({ min: 5, max: 10000 }),
			maxMp: fc.integer({ min: 5, max: 10000 }),
			init: fc.integer({ min: 1, max: 100 }),
			def: fc.integer({ min: 1, max: 100 }),
			mdef: fc.integer({ min: 1, max: 100 }),
		}),
		resists: fc.record({
			physical: resistance(),
			air: resistance(),
			bolt: resistance(),
			dark: resistance(),
			earth: resistance(),
			fire: resistance(),
			ice: resistance(),
			light: resistance(),
			poison: resistance(),
		}),
		equipment: fc.option(fc.array(fc.stringMatching(/^[^,]$/), { minLength: 1 })),
		attacks: fc.array(
			fc.record({
				range: fc.constantFrom<Distance>("melee", "ranged"),
				name: word(),
				accuracy: fc.record({
					primary: fc.constantFrom(...STATS),
					secondary: fc.constantFrom(...STATS),
					bonus: fc.nat(),
				}),
				damage: fc.integer({ min: 0, max: 100 }),
				damageType: fc.constantFrom(null, ...TYPE_CODES.map((k) => k[0])),
				description: description(),
			}),
			{ minLength: 1, maxLength: 3 },
		),
		specialRules: fc.array(
			fc.record({
				name: fc.string(),
				description: description(),
			}),
		),
		spells: fc.array(
			fc.record({
				name: fc.string(),
				accuracy: fc.oneof(
					fc.constantFrom(null),
					fc.record({
						primary: fc.constantFrom(...STATS),
						secondary: fc.constantFrom(...STATS),
						bonus: fc.nat(),
					}),
				),
				mp: fc.string(),
				target: fc.string(),
				duration: fc.string(),
				description: description(),
				opportunity: fc.option(description()),
			}),
		),
		otherActions: fc.array(
			fc.record({
				name: fc.string(),
				description: description(),
			}),
		),
	}),
	{ minLength: 1 },
);

test("parses generated", () => {
	fc.assert(
		fc.property(beastiaryDataGen, (cs): void => {
			const pageTokens: Token[] = [
				imageToken({ width: 0, height: 0 } as Image),
				imageToken({ width: 0, height: 0 } as Image),
				stringToken(""),
				...flatMap(cs, (b) => [
					imageToken(b.image),
					stringToken(b.name),
					stringToken(`Lv ${b.level}`),
					stringToken("w", "XFYKOE+Wingdings-Regular"),
					stringToken(b.type),
					...b.description.map((s) => stringToken(s, "FBDLWO+PTSans-Narrow")),
					stringToken("Typical Traits:"),
					stringToken(b.traits),
					stringToken(`DEX d${b.attributes.dex}`),
					stringToken(`INS d${b.attributes.ins}`),
					stringToken(`MIG d${b.attributes.mig}`),
					stringToken(`WLP d${b.attributes.wlp}`),
					stringToken("HP"),
					stringToken(b.attributes.maxHp.toString()),
					stringToken("w", "XFYKOE+Wingdings-Regular"),
					stringToken(b.attributes.crisis.toString()),
					stringToken("MP"),
					stringToken(b.attributes.maxMp.toString()),
					stringToken(`Init. ${b.attributes.init}`),
					stringToken(`DEF +${b.attributes.def}`),
					stringToken(`M.DEF +${b.attributes.mdef}`),
					...flatMap(TYPE_CODES, ([r, k]) => {
						const resist = b.resists[r];
						if (resist != null) {
							return [stringToken(k), stringToken(k), stringToken(resist)];
						} else {
							return [stringToken(k)];
						}
					}),
					...(b.equipment == null
						? []
						: [stringToken("Equipment:"), stringToken(b.equipment.join(", ") + ".")]),
					stringToken("BASIC ATTACKS"),
					...flatMap(b.attacks, (a) => [
						...(a.range == "melee"
							? [stringToken("$", "DHVFUS+Evilz")]
							: [stringToken("a", "QTFAUS+fabulaultima"), stringToken("a", "QTFAUS+fabulaultima")]),
						stringToken(a.name),
						stringToken("w", "XFYKOE+Wingdings-Regular"),
						stringToken("【"),
						stringToken(`${a.accuracy.primary} + ${a.accuracy.secondary}`),
						stringToken("】"),
						...(a.accuracy.bonus == 0 ? [] : [stringToken(`+${a.accuracy.bonus}`)]),
						stringToken("w", "XFYKOE+Wingdings-Regular"),
						stringToken("【"),
						stringToken(`HR + ${a.damage}`),
						stringToken("】"),
						...(a.damageType == null ? [] : [stringToken(a.damageType, "WTLEAG+PTSans-NarrowBold")]),
						...a.description.map((s) => stringToken(s, "FBDLWO+PTSans-Narrow")),
					]),
					...(b.spells.length == 0
						? []
						: [
								stringToken("SPELLS"),
								...flatMap(b.spells, (spell) => [
									stringToken("h", "DHVFUS+Evilz"),
									stringToken(spell.name),
									...(spell.accuracy == null
										? []
										: [
												stringToken("r", "URFDYK+Heydings-Icons"),
												stringToken("r", "URFDYK+Heydings-Icons"),
												stringToken("w", "XFYKOE+Wingdings-Regular"),
												stringToken("【"),
												stringToken(`${spell.accuracy.primary} + ${spell.accuracy.secondary}`),
												stringToken("】"),
												...(spell.accuracy.bonus == 0
													? []
													: [stringToken(`+${spell.accuracy.bonus}`)]),
											]),
									stringToken("w", "XFYKOE+Wingdings-Regular"),
									stringToken(spell.mp + " MP"),
									stringToken("w", "XFYKOE+Wingdings-Regular"),
									stringToken(spell.target),
									stringToken("w", "XFYKOE+Wingdings-Regular"),
									stringToken(spell.duration),
									stringToken("."),
									...spell.description.map((s) => stringToken(s, "FBDLWO+PTSans-Narrow")),
									...(spell.opportunity == null
										? []
										: [
												stringToken("Opportunity:"),
												...spell.opportunity.map((s) => stringToken(s, "FBDLWO+PTSans-Narrow")),
											]),
								]),
							]),
					...(b.otherActions.length == 0
						? []
						: [
								stringToken("OTHER ACTIONS"),
								...flatMap(b.otherActions, (oa) => [
									stringToken("S", "MNCCQA+WebSymbols-Regular"),
									stringToken(oa.name, "WTLEAG+PTSans-NarrowBold"),
									stringToken("w", "XFYKOE+Wingdings-Regular"),
									...oa.description.map((s) => stringToken(s, "FBDLWO+PTSans-Narrow")),
								]),
							]),
					...(b.specialRules.length == 0
						? []
						: [
								stringToken("SPECIAL RULES"),
								...flatMap(b.specialRules, (sr) => [
									stringToken(sr.name),
									stringToken("w", "XFYKOE+Wingdings-Regular"),
									...sr.description.map((s) => stringToken(s, "FBDLWO+PTSans-Narrow")),
								]),
							]),
				]),
				stringToken("", "Helvetica"),
			];
			const parses = beastiary([pageTokens, 0]);
			const expected: Beast[] = cs.map((v) => {
				return {
					...v,
					description: prettifyStrings(v.description),
					attacks: v.attacks.map((a) => {
						return { ...a, description: prettifyStrings(a.description) };
					}),
					specialRules: v.specialRules.map((a) => {
						return { ...a, description: prettifyStrings(a.description) };
					}),
					spells: v.spells.map((a) => {
						const { opportunity: o, ...rest } = a;
						const s: Beast["spells"][number] = {
							...rest,
							description: prettifyStrings(a.description),
						};
						if (o) {
							s.opportunity = prettifyStrings(o);
						}
						return s;
					}),
					otherActions: v.otherActions.map((a) => {
						return { ...a, description: prettifyStrings(a.description) };
					}),
				};
			});

			const successful = parses.filter(isResult);
			for (const p of successful) {
				expect(p.result[0]).toEqual(expected);
			}
			expect(successful.length).toBe(1);
		}),
	);
});
