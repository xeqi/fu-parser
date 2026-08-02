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
import { Beast, BeastRank } from "../model/beast";
import {
	AFFINITIES,
	Affinity,
	DAMAGE_TYPES,
	DamageType,
	DIE_SIZES,
	DieSize,
	Image,
	ResistanceMap,
	Role,
	ROLES,
	STATUS_EFFECTS,
	StatusEffect,
} from "../model/common";
import { prettifyStrings } from "../parsers-commons";

const FU_ICONS = /FabulaUltimaicons-Regular$/;
const TYPE3 = /Type3$/;
const LEVEL_FONT = /Antonio-Regular$/;
const SECTION_FONT = /Antonio-Bold$/;
const NAME_FONT = /CreditValley-bold$/;
const BOLD_FONTS = [/PTSans-NarrowBold$/];
const DESC_FONTS = [/PTSans-Narrow$/, /PTSans-NarrowBold$/];

const sep = textWithFont("•", [FU_ICONS]);
const open = textWithFont("(", [FU_ICONS]);
const close = textWithFont(")", [FU_ICONS]);

const isSepToken = (t: Token | null): boolean => !!t && isStringToken(t) && t.string === "•" && FU_ICONS.test(t.font);
const isBold = (t: Token): boolean => isStringToken(t) && BOLD_FONTS.some((f) => f.test(t.font));
const isDesc = (t: Token): boolean => isStringToken(t) && DESC_FONTS.some((f) => f.test(t.font));

// True at the start of a beast: [image?, name, "Lv N"].
const isBeastStart = (ptr: [Token[], number]): boolean => {
	const t = nextToken(ptr);
	if (!t) return false;
	const nameStart = isImageToken(t) ? inc(ptr) : ptr;
	const name = nextToken(nameStart);
	if (!name || !isStringToken(name)) return false;
	const lv = nextToken(inc(nameStart));
	return !!(lv && isStringToken(lv) && /^Lv \d+$/.test(lv.string) && LEVEL_FONT.test(lv.font));
};

// Skip page number, chapter ornaments and any TACTICS routine block up to the first beast.
const pageHeader: Parser<unknown> = (ptr) => {
	let current = ptr;
	for (;;) {
		if (isBeastStart(current)) break;
		if (!nextToken(current)) break;
		current = inc(current);
	}
	return [result(null, current)];
};

// Consume trailing ornaments and flavour asides up to the Helvetica watermark.
const pageTail: Parser<unknown> = (ptr) => {
	let current = ptr;
	for (;;) {
		const t = nextToken(current);
		if (!t) break;
		if (isStringToken(t) && /Helvetica$/.test(t.font)) break;
		current = inc(current);
	}
	return [result(null, current)];
};

const nullImage: Image = { width: 0, height: 0 };
const beastPrefix: Parser<Image> = (ptr) => {
	const t = nextToken(ptr);
	if (t && isImageToken(t)) return [result(t.image, inc(ptr))];
	return [result(nullImage, ptr)];
};

// "• TYPE TAG • TAG • TAG ...": rank/role/VILLAIN tags can appear in any order or be omitted;
// other tags (UNIQUE, PART, ...) are ignored. The book doesn't grade villains, so VILLAIN maps
// to the lowest "minor" tier.
const RANK_RE = /^(SOLDIER|ELITE|CHAMPION|COMPANION)(?:\s+(\d+))?$/i;
const ROLE_RE = new RegExp(`^(${ROLES.join("|")})$`, "i");
const isTraitsLabel = (t: Token): boolean => isStringToken(t) && /^(Typical )?Traits:?$/.test(t.string);
const typeRankRoles: Parser<{
	type: string;
	rank: BeastRank;
	role?: Role;
	villain?: "minor";
	phases?: number;
}> = kr(sep, (ptr) => {
	const typeParts: string[] = [];
	let current = ptr;
	for (;;) {
		const t = nextToken(current);
		if (!t || !isStringToken(t) || !LEVEL_FONT.test(t.font)) break;
		typeParts.push(t.string);
		current = inc(current);
	}
	if (typeParts.length === 0) {
		const found = nextToken(ptr);
		return [{ error: "type", distance: ptr[1], found: found && isStringToken(found) ? found : "<eof>" }];
	}
	// The first tag follows the type directly; the rest are separated by bullets.
	const tags: string[] = [];
	const first = nextToken(current);
	if (first && isStringToken(first) && isBold(first) && !isTraitsLabel(first)) {
		tags.push(first.string);
		current = inc(current);
		for (;;) {
			if (!isSepToken(nextToken(current))) break;
			const tag = nextToken(inc(current));
			if (!tag || !isStringToken(tag) || !isBold(tag)) break;
			tags.push(tag.string);
			current = inc(inc(current));
		}
	}
	let rank: BeastRank = "soldier";
	let phases: number | undefined;
	let role: Role | undefined;
	let villain: "minor" | undefined;
	for (const tag of tags) {
		const rankMatch = tag.match(RANK_RE);
		if (rankMatch) {
			rank = rankMatch[1].toLowerCase() as BeastRank;
			phases = rank === "champion" && rankMatch[2] ? Number(rankMatch[2]) : undefined;
			continue;
		}
		const roleMatch = tag.match(ROLE_RE);
		if (roleMatch) {
			role = roleMatch[1].toLowerCase() as Role;
			continue;
		}
		if (/^VILLAIN$/i.test(tag)) villain = "minor";
	}
	return [result({ type: typeParts.join(" "), rank, role, villain, phases }, current)];
});

// Optional lore paragraph before "Traits" (usually empty on these pages).
const description: Parser<string> = (ptr) => {
	const parts: string[] = [];
	let current = ptr;
	for (;;) {
		const t = nextToken(current);
		if (!t || !isStringToken(t)) break;
		if (isBold(t) && /^(Typical )?Traits/.test(t.string)) break;
		if (!isDesc(t)) break;
		parts.push(t.string);
		current = inc(current);
	}
	return [result(prettifyStrings(parts), current)];
};

const traitsHeader: Parser<unknown> = (ptr) => {
	const t = nextToken(ptr);
	if (t && isStringToken(t) && isBold(t) && /^(Typical )?Traits:?$/.test(t.string)) {
		let current = inc(ptr);
		const next = nextToken(current);
		if (next && isStringToken(next) && next.string === ":") current = inc(current);
		return [result(null, current)];
	}
	return [{ error: "Traits", distance: ptr[1], found: t && isStringToken(t) ? t : "<eof>" }];
};
// Traits keywords up to the quick-reference icons / attribute block.
const traitsText: Parser<string> = (ptr) => {
	const parts: string[] = [];
	let current = ptr;
	for (;;) {
		const t = nextToken(current);
		if (!t || !isStringToken(t) || !isDesc(t)) break;
		parts.push(t.string);
		current = inc(current);
	}
	return [result(prettifyStrings(parts), current)];
};
const QUICK_REF_ICON_FONT = /FnT_BasicShapes1$/;
const isQuickRefIcon = (t: Token | null, glyph: string): boolean =>
	!!t && isStringToken(t) && t.string === glyph && QUICK_REF_ICON_FONT.test(t.font);

// "6 6 <resist summary>" / "7 7 <weakness summary>" quick-reference block.
// ▲/▼ stand in for the custom icon font in the prefixed output.
const quickRefIcon =
	(glyph: string): Parser<null> =>
	(ptr) => {
		const t = nextToken(ptr);
		if (!isQuickRefIcon(t, glyph)) {
			return [
				{ error: `quick-ref icon "${glyph}"`, distance: ptr[1], found: t && isStringToken(t) ? t : "<eof>" },
			];
		}
		return [result(null, inc(ptr))];
	};
const quickRefLine = (glyph: string, marker: string): Parser<string> =>
	fmap(kr(seq(quickRefIcon(glyph), quickRefIcon(glyph)), traitsText), (text) => `${marker} ${text}`);

// The quick-reference block is absent for some low-level monsters (e.g. BAROMETZ, p109).
const quickReference: Parser<string> = alt(
	fmap(seq(quickRefLine("6", "▲"), quickRefLine("7", "▼")), ([resist, weak]) => `${resist}<br>${weak}`),
	success(""),
);

const ART_PAGE_NAME_FONT = /PTSans-Narrow$/;
const SEE_INDIVIDUAL_ENTRIES = /see individual entries\.?$/i;

export const extractArtPageQuickRef = (tokens: Token[]): string | null => {
	let i = tokens.findIndex((t) => isStringToken(t) && ART_PAGE_NAME_FONT.test(t.font));
	if (i === -1) return null;
	i++;
	const level = tokens[i];
	if (!level || !isStringToken(level) || !isBold(level) || !/^Lv \d+$/.test(level.string.trim())) return null;
	i++;
	while (isSepToken(tokens[i])) {
		const tag = tokens[i + 1];
		if (!tag || !isStringToken(tag) || !isBold(tag)) return null;
		i += 2;
	}
	const readLine = (glyph: string): string | null => {
		if (!isQuickRefIcon(tokens[i], glyph) || !isQuickRefIcon(tokens[i + 1], glyph)) return null;
		i += 2;
		const parts: string[] = [];
		while (
			tokens[i] &&
			isStringToken(tokens[i]) &&
			isDesc(tokens[i] as StringToken) &&
			!isQuickRefIcon(tokens[i], "7")
		) {
			parts.push((tokens[i] as StringToken).string);
			i++;
		}
		return prettifyStrings(parts);
	};
	const resist = readLine("6");
	const weak = readLine("7");
	if (resist === null && weak === null) return null;
	if ((resist && SEE_INDIVIDUAL_ENTRIES.test(resist)) || (weak && SEE_INDIVIDUAL_ENTRIES.test(weak))) return null;
	const lines = [resist ? `▲ ${resist}` : null, weak ? `▼ ${weak}` : null].filter((s): s is string => !!s);
	return lines.length ? lines.join("<br>") : null;
};

const beastAttribute = (stat: string) =>
	fmap(matches(new RegExp(`^${stat} d(${DIE_SIZES.join("|")})`), stat), (s) =>
		Number(s.slice(stat.length + 2)),
	) as Parser<DieSize>;
const int = (label: string) => fmap(matches(/^[0-9]+$/, label), (s) => Number(s));
const attributesCore = seq(
	beastAttribute("DEX"),
	beastAttribute("INS"),
	beastAttribute("MIG"),
	beastAttribute("WLP"),
	kr(text("HP"), int("HP")),
	kr(sep, int("Crisis")),
	kr(text("MP"), int("MP")),
);
const defBlock = seq(
	fmap(matches(/^DEF \+?[0-9]+$/, "DEF"), (s) => Number(s.slice(4).replace("+", ""))),
	fmap(matches(/^M\.DEF \+?[0-9]+$/, "M.DEF"), (s) => Number(s.replace(/^M\.DEF \+?/, ""))),
);
const beastAttributes = fmap(
	seq(
		attributesCore,
		fmap(matches(/^Init\. [0-9]+$/, "Init."), (s) => Number(s.slice(6))),
		defBlock,
	),
	([[dex, ins, mig, wlp, maxHp, crisis, maxMp], init, [def, mdef]]) => ({
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
// Companion attribute block: no "Init." cell.
const companionAttributes = fmap(
	seq(attributesCore, defBlock),
	([[dex, ins, mig, wlp, maxHp, crisis, maxMp], [def, mdef]]) => ({
		dex,
		ins,
		mig,
		wlp,
		maxHp,
		crisis,
		maxMp,
		init: (dex + ins) / 2,
		def,
		mdef,
	}),
);

// Resistance grid: normal affinity = lowercase FU glyph; other affinities = Type3 glyph +
// two-letter code (RS/IM/VU/AB). Stray uppercase FU glyphs between cells (decorative, e.g.
// p141) are skipped so they don't shift the nine positional cells.
const beastResistances: Parser<ResistanceMap> = (() => {
	const skipStray: Parser<null> = (ptr) => {
		let current = ptr;
		for (;;) {
			const t = nextToken(current);
			if (!t || !isStringToken(t) || !FU_ICONS.test(t.font) || !/^[A-Z]$/.test(t.string)) break;
			current = inc(current);
		}
		return [result(null, current)];
	};
	const normalIcon = satisfy(
		(t) => isStringToken(t) && FU_ICONS.test(t.font) && /^[a-z]$/.test(t.string),
		"normal affinity icon",
	) as Parser<StringToken>;
	const nonNormalIcon = strWithFont([TYPE3]);
	const oneResistance: Parser<Affinity> = kr(
		skipStray,
		alt(
			fmap(normalIcon, () => "N" as Affinity),
			kr(
				many1(nonNormalIcon),
				matches(new RegExp(`^(${AFFINITIES.join("|")})$`), "affinity"),
			) as Parser<Affinity>,
		),
	);
	return DAMAGE_TYPES.reduce(
		(p, t) => fmap(then(p, oneResistance), ([m, n]) => ({ ...m, [t]: n })),
		success({}),
	) as Parser<ResistanceMap>;
})();

// "IMMUNITIES <statuses>" up to the next section header.
const immunities: Parser<string> = kr(text("IMMUNITIES"), (ptr) => {
	const parts: string[] = [];
	let current = ptr;
	for (;;) {
		const t = nextToken(current);
		if (!t || !isStringToken(t) || SECTION_FONT.test(t.font)) break;
		parts.push(t.string);
		current = inc(current);
	}
	return [result(prettifyStrings(parts), current)];
});

// Status names appear as whole words in the immunities text, e.g. "shaken, slow.".
const parseStatusEffects = (text: string): StatusEffect[] =>
	STATUS_EFFECTS.filter((status) => new RegExp(`\\b${status}\\b`, "i").test(text));

const makeAccuracy = fmap(
	then(
		kl(kr(open, statsForAccuracy), close),
		alt(
			fmap(
				satisfy((t) => isStringToken(t) && /^\+\d+$/.test(t.string), "accuracy bonus") as Parser<StringToken>,
				(t) => Number(t.string.slice(1)),
			),
			success(0),
		),
	),
	([[primary, secondary], b]) => ({ primary, secondary, bonus: b }),
);
const makeDamage = kl(kr(open, statsForDamage), close);

// Free-form rule/attack description; stops at an image, section header, or next rule name.
const ruleDescription: Parser<string> = (ptr) => {
	const isBracket = (t: Token | null): boolean =>
		!!t && isStringToken(t) && (t.string === "(" || t.string === ")") && FU_ICONS.test(t.font);
	// Magic-action glyph (Type3 "O") can appear inline, e.g. "offensive spells (O)".
	const isInlineIcon = (t: Token): boolean => isStringToken(t) && TYPE3.test(t.font);
	const parts: string[] = [];
	let current = ptr;
	for (;;) {
		const t = nextToken(current);
		if (!t) break;
		if (isImageToken(t)) break;
		if (isStringToken(t) && SECTION_FONT.test(t.font)) break;
		if (isSepToken(t)) {
			parts.push((t as StringToken).string);
			current = inc(current);
			continue;
		}
		if (isInlineIcon(t)) {
			current = inc(current);
			continue;
		}
		if (!isDesc(t) && !isBold(t) && !isBracket(t)) break;
		if (isStringToken(t) && isBold(t) && isSepToken(nextToken(inc(current)))) break;
		parts.push((t as StringToken).string);
		current = inc(current);
	}
	if (parts.length === 0) {
		const found = nextToken(ptr);
		return [{ error: "description", distance: ptr[1], found: found && isStringToken(found) ? found : "<eof>" }];
	}
	return [result(prettifyStrings(parts), current)];
};

const meleeIcon = satisfy(
	(t) => isStringToken(t) && /^[Mm]$/.test(t.string) && FU_ICONS.test(t.font),
	"melee icon",
) as Parser<StringToken>;
const rangedIcon = satisfy(
	(t) => isStringToken(t) && /^[rR]$/.test(t.string) && FU_ICONS.test(t.font),
	"ranged icon",
) as Parser<StringToken>;
const beastAttack = fmap(
	seq(
		alt(
			fmap(meleeIcon, () => "melee" as const),
			fmap(many1(rangedIcon), () => "ranged" as const),
		),
		str,
		kr(sep, makeAccuracy),
		kr(
			sep,
			alt(
				then(makeDamage, alt(strWithFont(BOLD_FONTS) as Parser<DamageType>, success(null))),
				success([0, null] as const),
			),
		),
		ruleDescription,
	),
	([range, name, accuracy, [damage, damageType], desc]) => ({
		range,
		name,
		accuracy,
		damage,
		damageType,
		description: desc,
	}),
);
// A stat block can declare a section with no entries, e.g. "The hind leg has no basic attacks."
const noEntriesNote = fmap(many1(satisfy((t) => isDesc(t), "note") as Parser<StringToken>), () => [] as never[]);
const beastAttacks = kr(text("BASIC ATTACKS"), alt(many1(beastAttack), noEntriesNote));

const spellHeaderIcon = textWithFont("c", [FU_ICONS]);
const spellAccuracyIcon = textWithFont("O", [TYPE3]);
const otherActionIcon = textWithFont("S", [FU_ICONS]);
const strNotSep = fmap(
	satisfy((t) => isStringToken(t) && !isSepToken(t), "string (not sep)") as Parser<StringToken>,
	(t) => t.string,
);
const opportunity: Parser<string> = kr((ptr) => {
	const t = nextToken(ptr);
	if (t && isStringToken(t) && isBold(t) && /^Opportunity:?$/.test(t.string)) {
		let current = inc(ptr);
		const next = nextToken(current);
		if (next && isStringToken(next) && next.string === ":") current = inc(current);
		return [result(null, current)];
	}
	return [{ error: "Opportunity", distance: ptr[1], found: t && isStringToken(t) ? t : "<eof>" }];
}, ruleDescription);
const beastSpell = fmap(
	seq(
		kr(many1(spellHeaderIcon), str),
		alt(kr(many1(spellAccuracyIcon), kr(sep, makeAccuracy)), success(null)),
		kr(
			sep,
			fmap(many1(strNotSep), (parts) => parts.join(" ")),
		),
		kr(sep, str),
		kr(
			sep,
			fmap(alt(kl(str, text(".")), matches(/\.$/, "duration")), (s) => s.replace(/\.$/, "").toLowerCase()),
		),
		ruleDescription,
		alt(opportunity, success(null)),
	),
	([name, accuracy, mp, target, duration, desc, opp]) =>
		opp
			? { name, accuracy, mp, target, duration, description: desc, opportunity: opp }
			: { name, accuracy, mp, target, duration, description: desc },
);
const beastSpells = kr(text("SPELLS"), many1(beastSpell));

// "NAME • <description>"; name can span multiple tokens up to the separator.
const specialRule = fmap(
	seq(
		fmap(
			kl(
				many1(
					satisfy(
						(t) =>
							isStringToken(t) &&
							!SECTION_FONT.test(t.font) &&
							!LEVEL_FONT.test(t.font) &&
							!isSepToken(t),
						"rule name",
					) as Parser<StringToken>,
				),
				sep,
			),
			(ts) => ts.map((t) => t.string).join(" "),
		),
		ruleDescription,
	),
	([name, desc]) => ({ name, description: desc }),
);
const otherActions = kr(text("OTHER ACTIONS"), many1(kr(many1(otherActionIcon), specialRule)));
const specialRules = kr(text("SPECIAL RULES"), many1(specialRule));

const beastParser: Parser<Beast> = fmap(
	seq(
		beastPrefix,
		str,
		fmap(matches(/^Lv \d+/, "Level"), (s) => Number(s.slice(3))),
		typeRankRoles,
		description,
		kr(traitsHeader, traitsText),
		quickReference,
		beastAttributes,
		beastResistances,
		alt(immunities, success(null)),
		alt(beastAttacks, success([] as Beast["attacks"])),
		alt(beastSpells, success([] as Beast["spells"])),
		alt(otherActions, success([] as Beast["otherActions"])),
		alt(specialRules, success([] as Beast["specialRules"])),
	),
	([
		image,
		name,
		level,
		typeRank,
		descr,
		traits,
		quickRef,
		attributes,
		resists,
		immunity,
		attacks,
		spells,
		otherActions,
		specialRules,
	]) => {
		const fullTraits = immunity ? `${traits} Immune to ${immunity}`.trim() : traits;
		const beast: Beast = {
			image,
			name: name.trim(),
			rank: typeRank.rank,
			level,
			type: typeRank.type,
			description: quickRef ? `${quickRef}<br>${descr}`.trim() : descr.trim(),
			traits: fullTraits,
			attributes,
			resists,
			immunities: immunity ? parseStatusEffects(immunity) : [],
			equipment: null,
			attacks,
			spells,
			otherActions,
			specialRules,
		};
		if (typeRank.phases !== undefined) beast.phases = typeRank.phases;
		if (typeRank.role !== undefined) beast.role = typeRank.role;
		if (typeRank.villain !== undefined) beast.villain = typeRank.villain;
		return beast;
	},
);

// Each beast advances a single cursor
const committedBeasts: Parser<Beast[]> = (ptr) => {
	const beasts: Beast[] = [];
	let current = ptr;
	for (;;) {
		if (!isBeastStart(current)) break;
		const parses = beastParser(current);
		const ok = parses.filter(isResult);
		if (ok.length === 0) return parses.filter((p) => !isResult(p)) as Parse<Beast[]>[];
		current = ok[0].result[1];
		beasts.push(ok[0].result[0]);
	}
	if (beasts.length === 0) {
		const found = nextToken(ptr);
		return [{ error: "Level", distance: ptr[1], found: found && isStringToken(found) ? found : "<eof>" }];
	}
	return [result(beasts, current)];
};

export const beastiaryFUBA: Parser<Beast[]> = kl(kr(pageHeader, committedBeasts), seq(pageTail, watermark, eof));

const COMPANION_LEVEL = 5;

const isNameToken = (t: Token | null): boolean => !!t && isStringToken(t) && NAME_FONT.test(t.font);
const isTypeToken = (t: Token | null): boolean => !!t && isStringToken(t) && LEVEL_FONT.test(t.font);

const isCompanionStart = (ptr: [Token[], number]): boolean => {
	const t = nextToken(ptr);
	if (!t) return false;
	const nameStart = isImageToken(t) ? inc(ptr) : ptr;
	if (!isNameToken(nextToken(nameStart))) return false;
	return isTypeToken(nextToken(inc(nameStart)));
};

const companionHeader: Parser<unknown> = (ptr) => {
	let current = ptr;
	for (;;) {
		if (isCompanionStart(current)) break;
		if (!nextToken(current)) break;
		current = inc(current);
	}
	return [result(null, current)];
};

const companionName: Parser<string> = (ptr) => {
	const t = nextToken(ptr);
	if (t && isNameToken(t)) return [result((t as StringToken).string, inc(ptr))];
	return [{ error: "name", distance: ptr[1], found: t && isStringToken(t) ? t : "<eof>" }];
};
const companionType: Parser<string> = (ptr) => {
	const t = nextToken(ptr);
	if (t && isTypeToken(t)) return [result((t as StringToken).string, inc(ptr))];
	return [{ error: "type", distance: ptr[1], found: t && isStringToken(t) ? t : "<eof>" }];
};

const companionParser: Parser<Beast> = fmap(
	seq(
		beastPrefix,
		companionName,
		companionType,
		description,
		kr(traitsHeader, traitsText),
		companionAttributes,
		beastResistances,
		alt(immunities, success(null)),
		alt(beastAttacks, success([] as Beast["attacks"])),
		alt(beastSpells, success([] as Beast["spells"])),
		alt(otherActions, success([] as Beast["otherActions"])),
		alt(specialRules, success([] as Beast["specialRules"])),
	),
	([
		image,
		name,
		type,
		descr,
		traits,
		attributes,
		resists,
		immunity,
		attacks,
		spells,
		otherActions,
		specialRules,
	]) => {
		const fullTraits = immunity ? `${traits} Immune to ${immunity}`.trim() : traits;
		return {
			image,
			name: name.trim(),
			rank: "companion",
			level: COMPANION_LEVEL,
			type: type.trim(),
			description: descr.trim(),
			traits: fullTraits,
			attributes,
			resists,
			immunities: immunity ? parseStatusEffects(immunity) : [],
			equipment: null,
			attacks,
			spells,
			otherActions,
			specialRules,
		};
	},
);

const committedCompanions: Parser<Beast[]> = (ptr) => {
	const companions: Beast[] = [];
	let current = ptr;
	for (;;) {
		if (!isCompanionStart(current)) break;
		const parses = companionParser(current);
		const ok = parses.filter(isResult);
		if (ok.length === 0) return parses.filter((p) => !isResult(p)) as Parse<Beast[]>[];
		current = ok[0].result[1];
		companions.push(ok[0].result[0]);
	}
	if (companions.length === 0) {
		const found = nextToken(ptr);
		return [{ error: "companion", distance: ptr[1], found: found && isStringToken(found) ? found : "<eof>" }];
	}
	return [result(companions, current)];
};

export const beastiaryFUBACompanion: Parser<Beast[]> = kl(
	kr(companionHeader, committedCompanions),
	seq(pageTail, watermark, eof),
);
