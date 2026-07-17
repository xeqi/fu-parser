import {
	alt,
	bonus,
	descriptionEnd,
	eof,
	fmap,
	image,
	inc,
	kl,
	kr,
	many,
	many1,
	matches,
	nextToken,
	Parser,
	peek,
	result,
	satisfy,
	seq,
	starting,
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
import { isImageToken, isStringToken, StringToken } from "../lexers/token";
import { Beast, parseBeastRank } from "../model/beast";
import {
	AFFINITIES,
	Affinity,
	DAMAGE_TYPES,
	DamageType,
	DIE_SIZES,
	DieSize,
	ResistanceMap,
	Stat,
	TYPE_CODES,
} from "../model/common";
import { prettifyStrings } from "../parsers-commons";

export interface BeastiaryFonts {
	meleeIcon: { char: string; fonts: RegExp[] };
	rangedIcon: { char: string; fonts: RegExp[] };
	spellHeaderIcon: { char: string; fonts: RegExp[] };
	spellAccuracyIcon: { char: string; fonts: RegExp[] };
	otherActionIcon: { char: string; fonts: RegExp[] };
	sep: { char: string; fonts: RegExp[] };
	/** e.g. 【 or ( */
	bracketOpen: { char: string; fonts: RegExp[] };
	bracketClose: { char: string; fonts: RegExp[] };
	boldFonts: RegExp[];
	descriptionFonts: RegExp[];
	asideFonts: RegExp[];
	asideHeaderFonts: RegExp[];
	asideAltFonts: RegExp[];
	pageHeader: Parser<unknown>;
	resistanceFonts: { normalFont: RegExp; nonNormalFont: RegExp } | null;
	typeCodes: Record<DamageType, { char: string; fonts: RegExp[] }>;
}

export const FUCR_LEGACY_FONTS: BeastiaryFonts = {
	meleeIcon: { char: "$", fonts: [/Evilz$/] },
	rangedIcon: { char: "a", fonts: [/fabulaultima$/] },
	spellHeaderIcon: { char: "h", fonts: [/Evilz$/] },
	spellAccuracyIcon: { char: "r", fonts: [/Heydings-Icons$/] },
	otherActionIcon: { char: "S", fonts: [/WebSymbols-Regular$/] },
	sep: { char: "w", fonts: [/Wingdings-Regular$/] },
	bracketOpen: { char: "【", fonts: [] },
	bracketClose: { char: "】", fonts: [] },
	boldFonts: [/PTSans-NarrowBold$/],
	descriptionFonts: [/PTSans-Narrow$/, /PTSans-NarrowBold$/, /Heydings-Icons$/, /KozMinPro-Regular$/],
	asideFonts: [/MonotypeCorsiva$/],
	asideHeaderFonts: [/Antonio-Bold$/],
	asideAltFonts: [/CreditValley$/],
	pageHeader: starting,
	resistanceFonts: null,
	typeCodes: {
		physical: { char: TYPE_CODES.physical, fonts: [] },
		air: { char: TYPE_CODES.air, fonts: [] },
		bolt: { char: TYPE_CODES.bolt, fonts: [] },
		dark: { char: TYPE_CODES.dark, fonts: [] },
		earth: { char: TYPE_CODES.earth, fonts: [] },
		fire: { char: TYPE_CODES.fire, fonts: [] },
		ice: { char: TYPE_CODES.ice, fonts: [] },
		light: { char: TYPE_CODES.light, fonts: [] },
		poison: { char: TYPE_CODES.poison, fonts: [] },
	},
};

// Skip leading page-number/ornament/sidebar tokens up to the first [image, name, "Lv N"] beast.
const fucrPageHeader: Parser<unknown> = (ptr) => {
	let current = ptr;
	for (;;) {
		const t = nextToken(current);
		if (!t) break;
		const name = nextToken(inc(current));
		const lv = nextToken(inc(inc(current)));
		if (isImageToken(t) && name && isStringToken(name) && lv && isStringToken(lv) && /^Lv \d+/.test(lv.string)) {
			break;
		}
		current = inc(current);
	}
	return [result(null, current)];
};

// Core Rulebook v1.1
export const FUCR_FONTS: BeastiaryFonts = {
	meleeIcon: { char: "M", fonts: [/FabulaUltimaicons-Regular$/] },
	rangedIcon: { char: "r", fonts: [/FabulaUltimaicons-Regular$/] },
	spellHeaderIcon: { char: "c", fonts: [/FabulaUltimaicons-Regular$/] },
	spellAccuracyIcon: { char: "O", fonts: [/Type3$/] },
	otherActionIcon: { char: "S", fonts: [/FabulaUltimaicons-Regular$/] },
	sep: { char: "•", fonts: [/FabulaUltimaicons-Regular$/] },
	bracketOpen: { char: "(", fonts: [/FabulaUltimaicons-Regular$/] },
	bracketClose: { char: ")", fonts: [/FabulaUltimaicons-Regular$/] },
	boldFonts: [/PTSans-NarrowBold$/],
	descriptionFonts: [/PTSans-Narrow$/, /PTSans-NarrowBold$/],
	asideFonts: [/MonotypeCorsiva$/],
	asideHeaderFonts: [/Antonio-Bold$/],
	asideAltFonts: [/CreditValley$/],
	pageHeader: fucrPageHeader,
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

const beastAttribute = (stat: Stat) =>
	fmap(matches(new RegExp(`^${stat} d(${DIE_SIZES.join("|")})`), stat), (t) =>
		Number(t.slice(stat.length + 2)),
	) as Parser<DieSize>;
const dex = beastAttribute("DEX");
const ins = beastAttribute("INS");
const mig = beastAttribute("MIG");
const wlp = beastAttribute("WLP");
const beastInit = fmap(matches(/^Init\. [0-9]+$/, "beast init"), (s) => Number(s.slice(6)));
const beastDef = (prefix: string) =>
	fmap(matches(new RegExp(`^${prefix} \\+?[0-9]+$`), "beast def"), (s) => Number(s.slice(prefix.length + 1)));

const makeBeastAttributes = (fonts: BeastiaryFonts) => {
	const sep = textWithFont(fonts.sep.char, fonts.sep.fonts);
	return fmap(
		seq(
			dex,
			ins,
			mig,
			wlp,
			kr(
				text("HP"),
				fmap(matches(/^[0-9]+$/, "HP"), (s) => Number(s)),
			),
			kr(
				sep,
				fmap(matches(/^[0-9]+$/, "Crisis"), (s) => Number(s)),
			),
			kr(
				text("MP"),
				fmap(matches(/^[0-9]+$/, "MP"), (s) => Number(s)),
			),
			beastInit,
			beastDef("DEF"),
			beastDef("M.DEF"),
		),
		([dex, ins, mig, wlp, maxHp, crisis, maxMp, init, def, mdef]) => {
			return { dex, ins, mig, wlp, maxHp, crisis, maxMp, init, def, mdef };
		},
	);
};

const makeBeastResistances = (fonts: BeastiaryFonts): Parser<ResistanceMap> => {
	if (fonts.resistanceFonts !== null) {
		const { normalFont, nonNormalFont } = fonts.resistanceFonts;
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
	}
	return DAMAGE_TYPES.reduce((p, t) => {
		const { char, fonts: f } = fonts.typeCodes[t];
		const icon = f.length > 0 ? textWithFont(char, f) : text(char);
		const resistance: Parser<Affinity> = alt(
			fmap(icon, () => "N" as Affinity),
			kr(then(icon, icon), matches(new RegExp(AFFINITIES.join("|")), "affinity")) as Parser<Affinity>,
		);
		return fmap(then(p, resistance), ([m, n]) => ({ ...m, [t]: n }));
	}, success({})) as Parser<ResistanceMap>;
};

const DESCRIPTION_LINE_EXCLUSIONS = /^(Opportunity:|Typical Traits:)/;

const makeDescriptionLine = (fonts: BeastiaryFonts) =>
	fmap(
		satisfy(
			(t) =>
				isStringToken(t) &&
				fonts.descriptionFonts.some((r) => r.test(t.font)) &&
				!DESCRIPTION_LINE_EXCLUSIONS.test(t.string) &&
				!/[.!?]$/.test(t.string),
			"description line",
		) as Parser<StringToken>,
		(t) => t.string,
	);

const makeDescriptionContinuation = (fonts: BeastiaryFonts) =>
	fmap(
		kl(
			satisfy(
				(t) =>
					isStringToken(t) &&
					fonts.descriptionFonts.some((r) => r.test(t.font)) &&
					!DESCRIPTION_LINE_EXCLUSIONS.test(t.string) &&
					/[.!?]$/.test(t.string),
				"description line",
			) as Parser<StringToken>,
			peek((t) => isStringToken(t) && fonts.descriptionFonts.some((r) => r.test(t.font)), "description line"),
		),
		(t) => t.string,
	);

const makeInlineDamageClause = (fonts: BeastiaryFonts) => {
	const { makeDamage } = makeBracketParsers(fonts);
	return fmap(makeDamage, (n) => `(HR + ${n})`);
};

const makeInlineAccuracyClause = (fonts: BeastiaryFonts) => {
	const { makeBracketedStats } = makeBracketParsers(fonts);
	return fmap(makeBracketedStats, ([primary, secondary]) => `(${primary} + ${secondary})`);
};

const makeDescription = (fonts: BeastiaryFonts) => {
	const descriptionLine = alt(
		makeInlineDamageClause(fonts),
		alt(makeInlineAccuracyClause(fonts), alt(makeDescriptionLine(fonts), makeDescriptionContinuation(fonts))),
	);
	return alt(
		fmap(seq(strWithFont([fonts.descriptionFonts[0]]), many(descriptionLine), descriptionEnd), ([h, z, s]) =>
			prettifyStrings([h, ...z, s]),
		),
		descriptionEnd,
	);
};

const makeBracketParsers = (fonts: BeastiaryFonts) => {
	const open =
		fonts.bracketOpen.fonts.length > 0
			? textWithFont(fonts.bracketOpen.char, fonts.bracketOpen.fonts)
			: text(fonts.bracketOpen.char);
	const close =
		fonts.bracketClose.fonts.length > 0
			? textWithFont(fonts.bracketClose.char, fonts.bracketClose.fonts)
			: text(fonts.bracketClose.char);
	const makeAccuracy: Parser<{ primary: Stat; secondary: Stat; bonus: number }> = fmap(
		then(kl(kr(open, statsForAccuracy), close), bonus),
		([[primary, secondary], b]) => ({ primary, secondary, bonus: b }),
	);
	const makeBracketedStats = kl(kr(open, statsForAccuracy), close);
	const makeDamage = kl(kr(open, statsForDamage), close);
	return { makeAccuracy, makeBracketedStats, makeDamage };
};

const makeBeastAttack = (fonts: BeastiaryFonts) => {
	const sep = textWithFont(fonts.sep.char, fonts.sep.fonts);
	const description = makeDescription(fonts);
	const { makeAccuracy, makeDamage } = makeBracketParsers(fonts);
	return fmap(
		seq(
			alt(
				fmap(textWithFont(fonts.meleeIcon.char, fonts.meleeIcon.fonts), () => "melee" as const),
				fmap(many1(textWithFont(fonts.rangedIcon.char, fonts.rangedIcon.fonts)), () => "ranged" as const),
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
		([range, name, accuracy, [damage, damageType], description]) => {
			return { range, name, accuracy, damage, damageType, description };
		},
	);
};

const makeSpecialRule = (fonts: BeastiaryFonts) => {
	const sep = textWithFont(fonts.sep.char, fonts.sep.fonts);
	const description = makeDescription(fonts);
	return fmap(seq(kl(str, sep), description), ([name, description]) => {
		return { name, description };
	});
};

const makeOpportunity = (fonts: BeastiaryFonts) => {
	const description = makeDescription(fonts);
	return kr(text("Opportunity:"), description);
};

const makeBeastSpells = (fonts: BeastiaryFonts) => {
	const sep = textWithFont(fonts.sep.char, fonts.sep.fonts);
	const description = makeDescription(fonts);
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
						alt(
							fmap(kl(str, text(".")), (s) => s.toLowerCase()),
							fmap(str, (s) => s.replace(/\.$/, "").toLowerCase()),
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

export const makeBeastiary = (fonts: BeastiaryFonts): Parser<Beast[]> => {
	const sep = textWithFont(fonts.sep.char, fonts.sep.fonts);
	const description = makeDescription(fonts);
	const beastAttributes = makeBeastAttributes(fonts);
	const beastResistances = makeBeastResistances(fonts);
	const beastAttack = makeBeastAttack(fonts);
	const specialRule = makeSpecialRule(fonts);
	const beastSpells = makeBeastSpells(fonts);
	const beastAttacks = kr(text("BASIC ATTACKS"), many1(beastAttack));
	const specialRules = kr(text("SPECIAL RULES"), many1(specialRule));
	const otherActions = kr(
		text("OTHER ACTIONS"),
		many1(kr(many1(textWithFont(fonts.otherActionIcon.char, fonts.otherActionIcon.fonts)), specialRule)),
	);

	const beastParser: Parser<Beast> = fmap(
		seq(
			image,
			str,
			fmap(matches(/^Lv \d+/, "Level"), (s) => Number(s.slice(3))),
			kr(sep, str),
			description,
			kr(text("Typical Traits:"), str),
			beastAttributes,
			beastResistances,
			alt(
				kr(
					text("Equipment:"),
					fmap(str, (s) => s.slice(0, -1).split(", ")),
				),
				success(null),
			),
			alt(beastAttacks, success([])),
			alt(beastSpells, success([])),
			alt(otherActions, success([])),
			alt(specialRules, success([])),
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

	return kl(
		kr(fonts.pageHeader, many1(beastParser)),
		seq(
			alt(
				alt(
					alt(
						seq(
							strWithFont(fonts.asideFonts),
							strWithFont(fonts.asideFonts),
							alt(
								seq(many1(str), strWithFont(fonts.asideHeaderFonts), image, many(str), image),
								success(null),
							),
						),
						seq(
							many1(matches(/^.*[^.]$/, "aside")),
							matches(/^.*\.$/, "aside"),
							strWithFont(fonts.asideHeaderFonts),
							image,
							many(str),
							image,
						),
					),
					strWithFont(fonts.asideAltFonts),
				),
				success(null),
			),
			watermark,
			eof,
		),
	);
};

export const beastiary = makeBeastiary(FUCR_LEGACY_FONTS);
export const beastiaryFUCR = makeBeastiary(FUCR_FONTS);
