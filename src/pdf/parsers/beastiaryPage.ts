import { Image } from "../lexers/token";
import {
	Accuracy,
	DamageType,
	Parser,
	Distance,
	ResistanceMap,
	Stat,
	TYPE_CODES,
	accuracy,
	alt,
	damage,
	description,
	eof,
	fmap,
	image,
	kl,
	kr,
	many1,
	sep,
	seq,
	starting,
	str,
	strWithFont,
	success,
	text,
	textWithFont,
	then,
	matches,
	many,
	DieSize,
	AFFINITIES,
	AFFINITY,
} from "./lib";

export type Beast = {
	image: Image;
	name: string;
	level: number;
	type: string;
	description: string;
	traits: string;
	attributes: {
		dex: DieSize;
		ins: DieSize;
		mig: DieSize;
		wlp: DieSize;
		maxHp: number;
		crisis: number;
		maxMp: number;
		init: number;
		def: number;
		mdef: number;
	};
	resists: ResistanceMap;
	equipment: string[] | null;
	attacks: {
		range: Distance;
		name: string;
		accuracy: Accuracy;
		damage: number;
		damageType: DamageType | null;
		description: string;
	}[];
	spells: {
		name: string;
		accuracy: {
			primary: "DEX" | "MIG" | "INS" | "WLP";
			secondary: "DEX" | "MIG" | "INS" | "WLP";
			bonus: number;
		} | null;
		mp: string;
		target: string;
		duration: string;
		description: string;
		opportunity?: string;
	}[];
	otherActions: {
		name: string;
		description: string;
	}[];
	specialRules: {
		name: string;
		description: string;
	}[];
};

const beastAttribute = (stat: Stat) =>
	fmap(matches(new RegExp(`^${stat} d(6|8|10|12)`), stat), (t) =>
		Number(t.slice(stat.length + 2)),
	) as Parser<DieSize>;
const dex = beastAttribute("DEX");
const ins = beastAttribute("INS");
const mig = beastAttribute("MIG");
const wlp = beastAttribute("WLP");
const beastInit = fmap(matches(/^Init\. [0-9]+$/, "beast init"), (s) => Number(s.slice(6)));
const beastDef = (prefix: string) =>
	fmap(matches(new RegExp(`^${prefix} \\+?[0-9]+$`), "beast def"), (s) => Number(s.slice(prefix.length + 1)));
const beastAttributes = fmap(
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

const beastResistance = (s: (typeof TYPE_CODES)[number][1]): Parser<AFFINITY> =>
	alt(
		fmap(text(s), () => "N"),
		kr(then(text(s), text(s)), matches(new RegExp(AFFINITIES.join("|")), "affinity")) as Parser<AFFINITY>,
	);
const beastResistances = TYPE_CODES.reduce(
	(p, [t, c]) =>
		fmap(then(p, beastResistance(c)), ([m, n]) => {
			return { ...m, [t]: n };
		}),
	success({} as ResistanceMap),
);

const beastAttack = fmap(
	seq(
		alt(
			fmap(textWithFont("$", [/Evilz$/]), () => "melee"),
			fmap(many1(textWithFont("a", [/fabulaultima$/])), () => "ranged"),
		) as Parser<Distance>,
		str,
		kr(sep, accuracy),
		kr(
			sep,
			alt(
				then(
					damage,
					//TODO: Restrict parsed string to actual damagetypes
					alt(strWithFont([/PTSans-NarrowBold$/]) as Parser<DamageType>, success(null)),
				),
				success([0, null] as const),
			),
		),
		description,
	),
	([range, name, accuracy, [damage, damageType], description]) => {
		return { range, name, accuracy, damage, damageType, description };
	},
);

const specialRule = fmap(seq(kl(str, sep), description), ([name, description]) => {
	return { name, description };
});

const opportunity = kr(text("Opportunity:"), description);

const beastSpells = kr(
	text("SPELLS"),
	many1(
		fmap(
			seq(
				kr(textWithFont("h", [/Evilz$/]), str),
				alt(kr(many1(textWithFont("r", [/Heydings-Icons$/])), kr(sep, accuracy)), success(null)),
				kr(
					sep,
					fmap(str, (s) => s.slice(0, -3)),
				),
				kr(sep, str),
				kr(sep, kl(str, text("."))),
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
const beastAttacks = kr(text("BASIC ATTACKS"), many1(beastAttack));
const specialRules = kr(text("SPECIAL RULES"), many1(specialRule));
const otherActions = kr(text("OTHER ACTIONS"), many1(kr(textWithFont("S", [/WebSymbols-Regular$/]), specialRule)));
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
		return {
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
		};
	},
);
export const beastiary = kl(
	kr(starting, many1(beastParser)),
	seq(
		alt(
			alt(
				alt(
					seq(
						strWithFont([/MonotypeCorsiva$/]),
						strWithFont([/MonotypeCorsiva$/]),
						alt(seq(many1(str), strWithFont([/Antonio-Bold$/]), image, many(str), image), success(null)),
					),
					seq(
						many1(matches(/^.*[^.]$/, "aside")),
						matches(/^.*\.$/, "aside"),
						strWithFont([/Antonio-Bold$/]),
						image,
						many(str),
						image,
					),
				),
				strWithFont([/CreditValley$/]),
			),
			success(null),
		),
		strWithFont([/Helvetica$/]),
		eof,
	),
);
