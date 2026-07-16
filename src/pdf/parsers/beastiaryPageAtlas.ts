import {
	alt,
	eof,
	fmap,
	inc,
	isResult,
	kl,
	kr,
	many1,
	matches,
	nextToken,
	Parse,
	Parser,
	result,
	satisfy,
	seq,
	statsForAccuracy,
	statsForDamage,
	str,
	strWithFont,
	success,
	text,
	textWithFont,
	then,
	watermark,
} from "./lib";
import { isImageToken, isStringToken, StringToken, Token } from "../lexers/token";
import { Beast, parseBeastRank } from "../model/beast";
import {
	AFFINITIES,
	Affinity,
	DAMAGE_TYPES,
	DamageType,
	DIE_SIZES,
	DieSize,
	Image,
	ResistanceMap,
	Stat,
} from "../model/common";
import { prettifyStrings } from "../parsers-commons";
import { BeastiaryFonts } from "./beastiaryPage";

export interface AtlasFonts
	extends Pick<
		BeastiaryFonts,
		| "meleeIcon"
		| "rangedIcon"
		| "spellHeaderIcon"
		| "spellAccuracyIcon"
		| "otherActionIcon"
		| "sep"
		| "bracketOpen"
		| "bracketClose"
		| "boldFonts"
		| "descriptionFonts"
		| "resistanceFonts"
		| "typeCodes"
	> {
	asideFonts: RegExp[];
	asideHeaderFonts: RegExp[];
	asideAltFonts: RegExp[];
}

const ATLAS_COMMON: Omit<AtlasFonts, "sep"> = {
	meleeIcon: { char: "M", fonts: [/FabulaUltimaicons-Regular$/] },
	rangedIcon: { char: "r", fonts: [/FabulaUltimaicons-Regular$/] },
	spellHeaderIcon: { char: "c", fonts: [/FabulaUltimaicons-Regular$/] },
	spellAccuracyIcon: { char: "O", fonts: [/Type3$/] },
	otherActionIcon: { char: "S", fonts: [/FabulaUltimaicons-Regular$/] },
	bracketOpen: { char: "(", fonts: [/FabulaUltimaicons-Regular$/] },
	bracketClose: { char: ")", fonts: [/FabulaUltimaicons-Regular$/] },
	boldFonts: [/PTSans-NarrowBold$/],
	descriptionFonts: [/PTSans-Narrow$/, /PTSans-NarrowBold$/],
	asideFonts: [/BodoniOrnamentsITCTT$/],
	asideHeaderFonts: [/Antonio-Bold$/],
	asideAltFonts: [/CreditValley$/],
	resistanceFonts: { normalFont: /FabulaUltimaicons-Regular$/, nonNormalFont: /Type3$|Glyphter$/ },
	typeCodes: {
		physical: { char: "p", fonts: [/FabulaUltimaicons-Regular$/] },
		air: { char: "a", fonts: [/FabulaUltimaicons-Regular$/] },
		bolt: { char: "b", fonts: [/FabulaUltimaicons-Regular$/] },
		dark: { char: "D", fonts: [/Type3$/] },
		earth: { char: "E", fonts: [/Type3$/] },
		fire: { char: "F", fonts: [/Type3$/] },
		ice: { char: "I", fonts: [/Type3$/] },
		light: { char: "l", fonts: [/FabulaUltimaicons-Regular$/] },
		poison: { char: "t", fonts: [/FabulaUltimaicons-Regular$/] },
	},
};

export const FUHF_FONTS: AtlasFonts = { ...ATLAS_COMMON, sep: { char: "•", fonts: [/FabulaUltimaicons-Regular$/] } };
export const FUTF_FONTS: AtlasFonts = { ...ATLAS_COMMON, sep: { char: "-", fonts: [/FabulaUltimaicons-Regular$/] } };
export const FUNF_FONTS: AtlasFonts = { ...ATLAS_COMMON, sep: { char: "•", fonts: [/FabulaUltimaicons-Regular$/] } };

const ATLAS_ORNAMENT_FONT = /BodoniOrnamentsITCTT$/;
const ATLAS_LEVEL_FONT = /Antonio-Regular$/;
// Section headers (BASIC ATTACKS, SPELLS, etc.) and beast names are Antonio-Bold.
const ATLAS_SECTION_FONT = /Antonio-Bold$/;

// Skips the page number, W ornament, and chapter decoration up to the first beast name
// (the string token immediately before "Lv N" in Antonio-Regular).
const atlasPageHeader: Parser<unknown> = (ptr) => {
	const t0 = nextToken(ptr);
	if (!t0 || !isStringToken(t0)) return [{ error: "page number", distance: ptr[1], found: "<eof>" }];
	let current = inc(ptr);
	const t1 = nextToken(current);
	if (!t1 || !isStringToken(t1) || !ATLAS_ORNAMENT_FONT.test(t1.font))
		return [{ error: "atlas W ornament", distance: current[1], found: t1 && isStringToken(t1) ? t1 : "<eof>" }];
	current = inc(current);
	let t = nextToken(current);
	while (t) {
		if (isStringToken(t)) {
			const next = nextToken(inc(current));
			if (next && isStringToken(next) && /^Lv \d+$/.test(next.string) && ATLAS_LEVEL_FONT.test(next.font)) break;
			if (/^Lv \d+$/.test(t.string) && ATLAS_LEVEL_FONT.test(t.font)) break;
		} else if (isImageToken(t)) {
			// Stop before the image if the token after it is the beast name (followed by Lv N).
			const afterImg = inc(current);
			const name = nextToken(afterImg);
			const lvToken = name ? nextToken(inc(afterImg)) : null;
			if (
				name &&
				isStringToken(name) &&
				lvToken &&
				isStringToken(lvToken) &&
				/^Lv \d+$/.test(lvToken.string) &&
				ATLAS_LEVEL_FONT.test(lvToken.font)
			)
				break;
		}
		current = inc(current);
		t = nextToken(current);
	}
	return [result(null, current)];
};

// Consumes trailing tokens (sidebars, asides, ornaments, images) up to the Helvetica watermark.
const atlasPageTail: Parser<unknown> = (ptr) => {
	let current = ptr;
	for (;;) {
		const t = nextToken(current);
		if (!t) break;
		if (isStringToken(t) && /Helvetica$/.test(t.font)) break;
		current = inc(current);
	}
	return [result(null, current)];
};

const atlasNullImage: Image = { width: 0, height: 0 };

// Consume an image token if present, otherwise succeed without advancing (some atlas beasts have no image).
const atlasBeastPrefix: Parser<Image> = (ptr) => {
	const t = nextToken(ptr);
	if (t && isImageToken(t)) return [result(t.image, inc(ptr))];
	return [result(atlasNullImage, ptr)];
};

// Traits label: "[Typical ]Traits[:]" in one bold token, or "Traits" + ":" as two bold tokens.
const atlasTraitsHeader =
	(boldFonts: RegExp[]): Parser<unknown> =>
	(ptr) => {
		const t = nextToken(ptr);
		if (t && isStringToken(t) && boldFonts.some((f) => f.test(t.font)) && /^(Typical )?Traits:?$/.test(t.string)) {
			let current = inc(ptr);
			const next = nextToken(current);
			if (next && isStringToken(next) && boldFonts.some((f) => f.test(next.font)) && next.string === ":") {
				current = inc(current);
			}
			return [result(null, current)];
		}
		return (seq(strWithFont(boldFonts), strWithFont(boldFonts)) as Parser<unknown>)(ptr);
	};

const atlasOpportunityHeader = (boldFonts: RegExp[]) =>
	seq(strWithFont(boldFonts), strWithFont(boldFonts)) as Parser<unknown>;

const beastAttribute = (stat: string) =>
	fmap(matches(new RegExp(`^${stat} d(${DIE_SIZES.join("|")})`), stat), (t) =>
		Number(t.slice(stat.length + 2)),
	) as Parser<DieSize>;

const makeBeastAttributes = (fonts: AtlasFonts) => {
	const sep = textWithFont(fonts.sep.char, fonts.sep.fonts);
	const hpValue = fmap(matches(/^[0-9]+$|^Special$/, "HP"), (s) => (s === "Special" ? 0 : Number(s)));
	// When HP is "Special" the crisis value is omitted from the stat block.
	const hpAndCrisis: Parser<[number, number]> = (ptr) => {
		const hp = kr(text("HP"), hpValue)(ptr);
		const ok = hp.filter(isResult);
		if (ok.length === 0) return hp as Parse<[number, number]>[];
		const [hpVal, afterHp] = ok[0].result;
		if (hpVal === 0) return [result([0, 0] as [number, number], afterHp)];
		const crisis = kr(
			sep,
			fmap(matches(/^[0-9]+$/, "Crisis"), (s) => Number(s)),
		)(afterHp);
		return crisis
			.filter(isResult)
			.map((r) => result([hpVal, r.result[0]] as [number, number], r.result[1]))
			.concat(crisis.filter((p) => !isResult(p)) as Parse<[number, number]>[]);
	};
	return fmap(
		seq(
			beastAttribute("DEX"),
			beastAttribute("INS"),
			beastAttribute("MIG"),
			beastAttribute("WLP"),
			hpAndCrisis,
			kr(
				text("MP"),
				fmap(matches(/^[0-9]+$/, "MP"), (s) => Number(s)),
			),
			fmap(matches(/^Init\. [0-9]+$/, "beast init"), (s) => Number(s.slice(6))),
			fmap(matches(/^DEF \+?[0-9]+(?:\/\+?[0-9]+)?$/, "beast def"), (s) =>
				Number(s.slice(4).split("/")[0].replace("+", "")),
			),
			// Atlas uses "M. DEF" (with space) instead of "M.DEF"
			fmap(matches(/^M\.? DEF \+?[0-9]+$/, "beast mdef"), (s) => Number(s.replace(/^M\.? DEF \+?/, ""))),
		),
		([dex, ins, mig, wlp, [maxHp, crisis], maxMp, init, def, mdef]) => ({
			dex,
			ins,
			mig,
			wlp,
			maxHp,
			crisis,
			maxMp,
			init,
			def,
			mdef,
		}),
	);
};

const makeBeastResistances = (fonts: AtlasFonts): Parser<ResistanceMap> => {
	const { normalFont, nonNormalFont } = fonts.resistanceFonts!;
	const normalIcon = strWithFont([normalFont]);
	const nonNormalIcon = strWithFont([nonNormalFont]);
	const oneResistance: Parser<Affinity> = alt(
		fmap(normalIcon, () => "N" as Affinity),
		kr(many1(nonNormalIcon), matches(new RegExp(AFFINITIES.join("|")), "affinity")) as Parser<Affinity>,
	);
	return DAMAGE_TYPES.reduce(
		(p, t) => fmap(then(p, oneResistance), ([m, n]) => ({ ...m, [t]: n })),
		success({}),
	) as Parser<ResistanceMap>;
};

// Optional lore paragraph: PTSans tokens up to the "Traits" header (some beasts have none).
const makeDescription =
	(fonts: AtlasFonts): Parser<string> =>
	(ptr) => {
		const parts: string[] = [];
		let current = ptr;
		for (;;) {
			const t = nextToken(current);
			if (!t || !isStringToken(t)) break;
			if (fonts.boldFonts.some((f) => f.test(t.font)) && /^(Typical )?Traits/.test(t.string)) break;
			if (!fonts.descriptionFonts.some((f) => f.test(t.font))) break;
			parts.push(t.string);
			current = inc(current);
		}
		return [result(prettifyStrings(parts), current)];
	};

// Traits text: all non-Antonio-Bold tokens after the traits label, stopping before section headers.
const makeTraitsText =
	(_fonts: AtlasFonts): Parser<string> =>
	(ptr) => {
		const parts: string[] = [];
		let current = ptr;
		for (;;) {
			const t = nextToken(current);
			if (!t || !isStringToken(t) || ATLAS_SECTION_FONT.test(t.font)) break;
			parts.push(t.string);
			current = inc(current);
		}
		if (parts.length === 0) {
			const found = nextToken(ptr);
			return [{ error: "traits text", distance: ptr[1], found: found && isStringToken(found) ? found : "<eof>" }];
		}
		return [result(parts.join(" "), current)];
	};

const makeBracketParsers = (fonts: AtlasFonts) => {
	const open = textWithFont(fonts.bracketOpen.char, fonts.bracketOpen.fonts);
	const close = textWithFont(fonts.bracketClose.char, fonts.bracketClose.fonts);
	const makeAccuracy = fmap(
		then(
			kl(kr(open, statsForAccuracy), close),
			alt(
				fmap(
					satisfy(
						(t) => isStringToken(t) && /^\+\d+$/.test((t as { string: string }).string),
						"accuracy bonus",
					) as Parser<StringToken>,
					(t) => Number(t.string.slice(1)),
				),
				success(0),
			),
		),
		([[primary, secondary], b]: [[Stat, Stat], number]) => ({ primary, secondary, bonus: b }),
	);
	const makeBracketedStats = kl(kr(open, statsForAccuracy), close);
	const makeDamage = kl(kr(open, statsForDamage), close);
	return { makeAccuracy, makeBracketedStats, makeDamage };
};

const makeSpecialRuleDescription =
	(fonts: AtlasFonts): Parser<string> =>
	(ptr) => {
		const isSep = (t: Token | null): boolean =>
			!!t && isStringToken(t) && t.string === fonts.sep.char && fonts.sep.fonts.some((f) => f.test(t.font));
		const isDesc = (t: Token | null): boolean =>
			!!t && isStringToken(t) && fonts.descriptionFonts.some((f) => f.test(t.font));

		const isBracket = (t: Token | null): boolean =>
			!!t &&
			isStringToken(t) &&
			(t.string === fonts.bracketOpen.char || t.string === fonts.bracketClose.char) &&
			fonts.bracketOpen.fonts.some((f) => f.test(t.font));

		const parts: string[] = [];
		let current = ptr;
		for (;;) {
			const t = nextToken(current);
			if (!t) break;
			if (isImageToken(t)) break;
			if (isStringToken(t) && ATLAS_SECTION_FONT.test(t.font)) break;
			if (isSep(t)) {
				parts.push((t as StringToken).string);
				current = inc(current);
				continue;
			}
			if (!isDesc(t) && !fonts.boldFonts.some((f) => f.test((t as StringToken).font)) && !isBracket(t)) break;
			if (isStringToken(t) && fonts.boldFonts.some((f) => f.test(t.font))) {
				const peek = nextToken(inc(current));
				if (isSep(peek)) break;
			}
			parts.push((t as { string: string }).string);
			current = inc(current);
		}
		if (parts.length === 0) {
			const found = nextToken(ptr);
			return [
				{ error: "rule description", distance: ptr[1], found: found && isStringToken(found) ? found : "<eof>" },
			];
		}
		return [result(prettifyStrings(parts), current)];
	};

const makeBeastAttack = (fonts: AtlasFonts) => {
	const sep = textWithFont(fonts.sep.char, fonts.sep.fonts);
	const description = makeSpecialRuleDescription(fonts);
	const { makeAccuracy, makeDamage } = makeBracketParsers(fonts);
	const rangedIcon = satisfy(
		(t) =>
			isStringToken(t) &&
			((t.string === fonts.rangedIcon.char && fonts.rangedIcon.fonts.some((f) => f.test(t.font))) ||
				(t.string === "a" && /fabulaultima$/.test(t.font))),
		"ranged icon",
	) as Parser<StringToken>;
	return fmap(
		seq(
			alt(
				fmap(textWithFont(fonts.meleeIcon.char, fonts.meleeIcon.fonts), () => "melee" as const),
				fmap(many1(rangedIcon), () => "ranged" as const),
			),
			str,
			kr(sep, makeAccuracy),
			kr(
				sep,
				alt(
					then(makeDamage, alt(strWithFont(fonts.boldFonts) as Parser<DamageType>, success(null))),
					success([0, null] as const),
				),
			),
			description,
		),
		([range, name, accuracy, [damage, damageType], description]) => ({
			range,
			name,
			accuracy,
			damage,
			damageType,
			description,
		}),
	);
};

// Atlas rule names can span multiple tokens (e.g. "Raise the Banner (once per conflict" + ")").
const makeSpecialRule = (fonts: AtlasFonts) => {
	const sep = textWithFont(fonts.sep.char, fonts.sep.fonts);
	const description = makeSpecialRuleDescription(fonts);
	const nameTokens = fmap(
		kl(
			many1(
				satisfy(
					(t) =>
						isStringToken(t) &&
						!ATLAS_SECTION_FONT.test(t.font) &&
						!ATLAS_LEVEL_FONT.test(t.font) &&
						!(t.string === fonts.sep.char && fonts.sep.fonts.some((f) => f.test(t.font))),
					"name token",
				) as Parser<StringToken>,
			),
			sep,
		),
		(ts) => ts.map((t) => t.string).join(""),
	);
	return fmap(seq(nameTokens, description), ([name, description]) => ({ name, description }));
};

const makeOpportunity = (fonts: AtlasFonts) => {
	const description = makeSpecialRuleDescription(fonts);
	const header = atlasOpportunityHeader(fonts.boldFonts);
	return kr(header, description);
};

const makeBeastSpells = (fonts: AtlasFonts) => {
	const sep = textWithFont(fonts.sep.char, fonts.sep.fonts);
	const description = makeSpecialRuleDescription(fonts);
	const opportunity = makeOpportunity(fonts);
	const { makeAccuracy } = makeBracketParsers(fonts);
	const strNotSep = fmap(
		satisfy(
			(t) => isStringToken(t) && !(t.string === fonts.sep.char && fonts.sep.fonts.some((f) => f.test(t.font))),
			"string (not sep)",
		) as Parser<StringToken>,
		(t) => t.string,
	);
	return kr(
		text("SPELLS"),
		many1(
			fmap(
				seq(
					kr(many1(textWithFont(fonts.spellHeaderIcon.char, fonts.spellHeaderIcon.fonts)), str),
					alt(
						kr(
							many1(textWithFont(fonts.spellAccuracyIcon.char, fonts.spellAccuracyIcon.fonts)),
							kr(sep, makeAccuracy),
						),
						success(null),
					),
					kr(
						sep,
						fmap(many1(strNotSep), (parts) => parts.join(" ")),
					),
					kr(sep, str),
					kr(
						sep,
						fmap(alt(kl(str, text(".")), matches(/\.$/, "duration")), (s) =>
							s.replace(/\.$/, "").toLowerCase(),
						),
					),
					description,
					alt(opportunity, success(null)),
				),
				([name, accuracy, mp, target, duration, description, opportunity]) => {
					if (opportunity) return { name, accuracy, mp, target, duration, description, opportunity };
					else return { name, accuracy, mp, target, duration, description };
				},
			),
		),
	);
};

// Equipment in atlas spans mixed font tokens until a section header (Antonio-Bold) is encountered.
const makeEquipment = (_fonts: AtlasFonts): Parser<string[]> =>
	fmap(
		many1(
			satisfy(
				(t) => isStringToken(t) && !ATLAS_SECTION_FONT.test(t.font),
				"equipment token",
			) as Parser<StringToken>,
		),
		(ts) => [ts.map((t) => t.string).join("")],
	);

export const makeAtlasBeastiary = (fonts: AtlasFonts): Parser<Beast[]> => {
	const sep = textWithFont(fonts.sep.char, fonts.sep.fonts);
	const beastAttributes = makeBeastAttributes(fonts);
	const beastResistances = makeBeastResistances(fonts);
	const beastAttack = makeBeastAttack(fonts);
	const specialRule = makeSpecialRule(fonts);
	const beastSpells = makeBeastSpells(fonts);
	const description = makeDescription(fonts);
	const traitsHeader = atlasTraitsHeader(fonts.boldFonts);
	const traitsText = makeTraitsText(fonts);
	const equipment = makeEquipment(fonts);
	const beastAttacks = kr(text("BASIC ATTACKS"), many1(beastAttack));
	const specialRules = kr(text("SPECIAL RULES"), many1(specialRule));
	const otherActions = kr(
		text("OTHER ACTIONS"),
		many1(kr(many1(textWithFont(fonts.otherActionIcon.char, fonts.otherActionIcon.fonts)), specialRule)),
	);

	const beastParser: Parser<Beast> = fmap(
		seq(
			atlasBeastPrefix,
			str,
			fmap(matches(/^Lv \d+/, "Level"), (s) => Number(s.slice(3))),
			kr(sep, str),
			description,
			kr(traitsHeader, traitsText),
			beastAttributes,
			beastResistances,
			alt(kr(text("Equipment:"), equipment), success(null)),
			alt(beastAttacks, success([] as Beast["attacks"])),
			alt(beastSpells, success([] as Beast["spells"])),
			alt(otherActions, success([] as Beast["otherActions"])),
			alt(specialRules, success([] as Beast["specialRules"])),
		),
		([
			image,
			name,
			level,
			type,
			description,
			traits,
			attributes,
			resists,
			equipment,
			attacks,
			spells,
			otherActions,
			specialRules,
		]) => {
			const { name: cleanName, rank, phases } = parseBeastRank(name);
			return {
				image,
				name: cleanName,
				rank,
				phases,
				level,
				type,
				description,
				traits,
				attributes,
				resists,
				equipment,
				attacks,
				spells,
				otherActions,
				specialRules,
			};
		},
	);

	// True at a beast start ([name, Lv N] or [image, name, Lv N]); gates the committed loop
	// below so many1 doesn't branch exponentially.
	const isBeastStart = (ptr: [import("../lexers/token").Token[], number]): boolean => {
		const t = nextToken(ptr);
		if (!t) return false;
		if (isImageToken(t)) {
			const name = nextToken(inc(ptr));
			const lv = name ? nextToken(inc(inc(ptr))) : null;
			return !!(
				name &&
				isStringToken(name) &&
				lv &&
				isStringToken(lv) &&
				/^Lv \d+$/.test(lv.string) &&
				ATLAS_LEVEL_FONT.test(lv.font)
			);
		}
		if (isStringToken(t)) {
			const lv = nextToken(inc(ptr));
			return !!(lv && isStringToken(lv) && /^Lv \d+$/.test(lv.string) && ATLAS_LEVEL_FONT.test(lv.font));
		}
		return false;
	};

	const committedBeasts: Parser<Beast[]> = (ptr) => {
		const beasts: Beast[] = [];
		let current = ptr;
		for (;;) {
			if (!isBeastStart(current)) break;
			const parses = beastParser(current);
			const ok = parses.filter(isResult);
			if (ok.length === 0) return parses.filter((p) => !isResult(p)) as Parse<Beast[]>[]; // propagate errors
			current = ok[0].result[1];
			beasts.push(ok[0].result[0]);
		}
		if (beasts.length === 0) {
			const found = nextToken(ptr);
			return [{ error: "Level", distance: ptr[1], found: found && isStringToken(found) ? found : "<eof>" }];
		}
		return [result(beasts, current)];
	};

	return kl(kr(atlasPageHeader, committedBeasts), seq(atlasPageTail, watermark, eof));
};

export const beastiaryFUHF = makeAtlasBeastiary(FUHF_FONTS);
export const beastiaryFUTF = makeAtlasBeastiary(FUTF_FONTS);
export const beastiaryFUNF = makeAtlasBeastiary(FUNF_FONTS);
