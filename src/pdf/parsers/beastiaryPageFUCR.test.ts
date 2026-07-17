import fc from "fast-check";
import { description, resistance, descriptionEnd, word } from "../arbs/arbs";
import { imageToken, stringToken, watermark } from "../arbs/output";
import { Token } from "../lexers/token";
import { flatMap, isResult } from "./lib";
import { beastiaryFUCR, FUCR_FONTS } from "./beastiaryPage";

import { DAMAGE_TYPES, DIE_SIZES, Distance, Image, STATS } from "../model/common";
import { Beast } from "../model/beast";
import { prettifyStrings } from "../parsers-commons";

const F = FUCR_FONTS;
const fontStr = (f: { fonts: RegExp[] }) => f.fonts[0].source.replace(/\$$/, "");
const meleeFont = fontStr(F.meleeIcon);
const rangedFont = fontStr(F.rangedIcon);
const spellHeaderFont = fontStr(F.spellHeaderIcon);
const spellAccuracyFont = fontStr(F.spellAccuracyIcon);
const otherActionFont = fontStr(F.otherActionIcon);
const sepFont = fontStr(F.sep);
const bracketOpenFont = fontStr(F.bracketOpen);
const bracketCloseFont = fontStr(F.bracketClose);
const descFont = F.descriptionFonts[0].source.replace(/\$$/, "");
const boldFont = F.boldFonts[0].source.replace(/\$$/, "");

const beastiaryDataGen = fc.array(
	fc.record({
		image: fc.constant({ width: 0, height: 0 } as Image),
		name: word(),
		rank: fc.constant("soldier" as const),
		level: fc.nat(),
		type: word(),
		description: description(),
		traits: descriptionEnd(),
		attributes: fc.record({
			dex: fc.constantFrom(...DIE_SIZES),
			ins: fc.constantFrom(...DIE_SIZES),
			mig: fc.constantFrom(...DIE_SIZES),
			wlp: fc.constantFrom(...DIE_SIZES),
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
				damageType: fc.constantFrom(null, ...DAMAGE_TYPES),
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
				duration: fc.string().map((s) => s.toLowerCase()),
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

test("FUCR: parses generated", () => {
	fc.assert(
		fc.property(beastiaryDataGen, (cs): void => {
			const pageTokens: Token[] = [
				imageToken({ width: 114, height: 1248 } as Image),
				stringToken("324"),
				stringToken("W"),
				...flatMap(cs, (b) => [
					imageToken(b.image),
					stringToken(b.name),
					stringToken(`Lv ${b.level}`),
					stringToken(F.sep.char, sepFont),
					stringToken(b.type),
					...b.description.map((s) => stringToken(s, descFont)),
					stringToken("Typical Traits:"),
					stringToken(b.traits),
					stringToken(`DEX d${b.attributes.dex}`),
					stringToken(`INS d${b.attributes.ins}`),
					stringToken(`MIG d${b.attributes.mig}`),
					stringToken(`WLP d${b.attributes.wlp}`),
					stringToken("HP"),
					stringToken(b.attributes.maxHp.toString()),
					stringToken(F.sep.char, sepFont),
					stringToken(b.attributes.crisis.toString()),
					stringToken("MP"),
					stringToken(b.attributes.maxMp.toString()),
					stringToken(`Init. ${b.attributes.init}`),
					stringToken(`DEF +${b.attributes.def}`),
					stringToken(`M.DEF +${b.attributes.mdef}`),
					...flatMap(DAMAGE_TYPES, (k) => {
						const rf = F.resistanceFonts!;
						const normalFont = rf.normalFont.source.replace(/\$$/, "");
						const nonNormalFont = rf.nonNormalFont.source.replace(/\$$/, "");
						const resist = b.resists[k];
						if (resist !== "N") {
							return [stringToken("X", nonNormalFont), stringToken(resist)];
						} else {
							return [stringToken("x", normalFont)];
						}
					}),
					...(b.equipment == null
						? []
						: [stringToken("Equipment:"), stringToken(b.equipment.join(", ") + ".")]),
					stringToken("BASIC ATTACKS"),
					...flatMap(b.attacks, (a) => [
						...(a.range == "melee"
							? [stringToken(F.meleeIcon.char, meleeFont)]
							: [stringToken(F.rangedIcon.char, rangedFont), stringToken(F.rangedIcon.char, rangedFont)]),
						stringToken(a.name),
						stringToken(F.sep.char, sepFont),
						stringToken(F.bracketOpen.char, bracketOpenFont),
						stringToken(`${a.accuracy.primary} + ${a.accuracy.secondary}`),
						stringToken(F.bracketClose.char, bracketCloseFont),
						...(a.accuracy.bonus == 0 ? [] : [stringToken(`+${a.accuracy.bonus}`)]),
						stringToken(F.sep.char, sepFont),
						stringToken(F.bracketOpen.char, bracketOpenFont),
						stringToken(`HR + ${a.damage}`),
						stringToken(F.bracketClose.char, bracketCloseFont),
						...(a.damageType == null ? [] : [stringToken(a.damageType, boldFont)]),
						...a.description.map((s) => stringToken(s, descFont)),
					]),
					...(b.spells.length == 0
						? []
						: [
								stringToken("SPELLS"),
								...flatMap(b.spells, (spell) => [
									stringToken(F.spellHeaderIcon.char, spellHeaderFont),
									stringToken(F.spellHeaderIcon.char, spellHeaderFont),
									stringToken(spell.name),
									...(spell.accuracy == null
										? []
										: [
												stringToken(F.spellAccuracyIcon.char, spellAccuracyFont),
												stringToken(F.spellAccuracyIcon.char, spellAccuracyFont),
												stringToken(F.sep.char, sepFont),
												stringToken(F.bracketOpen.char, bracketOpenFont),
												stringToken(`${spell.accuracy.primary} + ${spell.accuracy.secondary}`),
												stringToken(F.bracketClose.char, bracketCloseFont),
												...(spell.accuracy.bonus == 0
													? []
													: [stringToken(`+${spell.accuracy.bonus}`)]),
											]),
									stringToken(F.sep.char, sepFont),
									stringToken(spell.mp + " MP"),
									stringToken(F.sep.char, sepFont),
									stringToken(spell.target),
									stringToken(F.sep.char, sepFont),
									stringToken(spell.duration),
									stringToken("."),
									...spell.description.map((s) => stringToken(s, descFont)),
									...(spell.opportunity == null
										? []
										: [
												stringToken("Opportunity:"),
												...spell.opportunity.map((s) => stringToken(s, descFont)),
											]),
								]),
							]),
					...(b.otherActions.length == 0
						? []
						: [
								stringToken("OTHER ACTIONS"),
								...flatMap(b.otherActions, (oa) => [
									stringToken(F.otherActionIcon.char, otherActionFont),
									stringToken(F.otherActionIcon.char, otherActionFont),
									stringToken(oa.name, boldFont),
									stringToken(F.sep.char, sepFont),
									...oa.description.map((s) => stringToken(s, descFont)),
								]),
							]),
					...(b.specialRules.length == 0
						? []
						: [
								stringToken("SPECIAL RULES"),
								...flatMap(b.specialRules, (sr) => [
									stringToken(sr.name),
									stringToken(F.sep.char, sepFont),
									...sr.description.map((s) => stringToken(s, descFont)),
								]),
							]),
				]),
				watermark,
			];
			const parses = beastiaryFUCR([pageTokens, 0]);
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
							mp: a.mp + " MP",
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
