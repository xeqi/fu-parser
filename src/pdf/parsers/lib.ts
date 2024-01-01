import { ImageToken, StringToken, Token, isImageToken, isStringToken } from "../lexers/token";

type PTR = [Token[], number];
export const nextToken = ([a, i]: PTR): Token | null => a[i];
export const inc = ([a, i]: PTR): PTR => [a, i + 1];
export const end = ([a, i]: PTR): boolean => a.length <= i;

type ErrorPoint = { error: string; distance: number; found: string | StringToken };
export type Parse<R> = { result: [R, PTR] } | ErrorPoint;
export type Parser<R> = (i: PTR) => Parse<R>[];
export const result = <R>(r: R, i: PTR): Parse<R> => {
	return { result: [r, i] };
};
export const isResult = <R>(p: Parse<R>): p is { result: [R, PTR] } => "result" in p;
export const isError = <R>(p: Parse<R>): p is ErrorPoint => "error" in p;
const error = (error: string, distance: number, found: string | StringToken) => {
	return { error, distance, found };
};

export const success: <R>(r: R) => Parser<R> = (r) => (i) => [result(r, i)];
export const fail =
	<R>(reason: string): Parser<R> =>
	(i) => {
		const token = nextToken(i);
		if (token != null) {
			if (isImageToken(token)) {
				return [error(reason, i[1], "<Image>")];
			}
			return [error(reason, i[1], token)];
		}
		return [error(reason, i[1], "<eof>")];
	};
export const satisfy =
	(p: (r: Token) => boolean, reason: string): Parser<Token> =>
	(ptr) => {
		const token = nextToken(ptr);
		if (token && p(token)) {
			return success(token)(inc(ptr));
		}
		return fail<Token>(reason)(ptr);
	};
export const flatMap = <T, R>(arr: readonly T[], fn: (v: T) => R[]) =>
	arr.reduce((arr, x) => arr.concat(fn(x)), <R[]>[]);

export const then =
	<R, S>(first: Parser<R>, second: Parser<S>): Parser<[R, S]> =>
	(i) => {
		return flatMap(first(i), (parse) => {
			if (isError(parse)) {
				return [parse];
			} else {
				const [r, remainder] = parse.result;
				return flatMap(second(remainder), (z) => {
					if (isError(z)) {
						return [z];
					}
					const [s, secondRemainder] = z.result;
					return [result([r, s], secondRemainder)];
				});
			}
		});
	};
export const alt =
	<L, R>(left: Parser<L>, right: Parser<R>): Parser<L | R> =>
	(i) =>
		(left(i) as Parse<L | R>[]).concat(right(i));

export const fmap =
	<R, S>(p: Parser<R>, fn: (r: R) => S): Parser<S> =>
	(i) =>
		p(i).map((parse) => {
			if (isError(parse)) {
				return parse;
			}
			const [r, remainder] = parse.result;
			return result(fn(r), remainder);
		});

export const eof = (ptr: PTR) => (end(ptr) ? success("eof" as const)(ptr) : fail<"eof">("eof")(ptr));

export const many = <R>(p: Parser<R>): Parser<R[]> =>
	alt(
		fmap(
			then(p, (i) => {
				const z = many(p)(i);
				return z.filter(isResult);
			}),
			([r, rs]) => [r].concat(rs),
		),
		success([]),
	);
export const many1 = <R>(p: Parser<R>) => fmap(then(p, many(p)), ([r, rs]) => [r].concat(rs));

export const image = fmap(satisfy(isImageToken, "typed Image") as Parser<ImageToken>, (t) => t.image);
export const str = fmap(satisfy(isStringToken, "typed string") as Parser<StringToken>, (t) => t.string);
export const strWithFont = (fonts: RegExp[]) =>
	fmap(
		satisfy(
			(t) => isStringToken(t) && fonts.some((f) => f.test(t.font)),
			`string with fonts ${fonts}`,
		) as Parser<StringToken>,
		(t) => t.string,
	);
export const text = (s: string) =>
	satisfy((t) => isStringToken(t) && t.string === s, `text: "${s}"`) as Parser<StringToken>;
export const textWithFont = (s: string, fonts: RegExp[]) =>
	satisfy(
		(t) => isStringToken(t) && t.string === s && fonts.some((f) => f.test(t.font)),
		`text: "${s}" with fonts ${fonts}`,
	) as Parser<StringToken>;

type MapParsers<U extends unknown[]> = { [Property in keyof U]: Parser<U[Property]> };

export const seq = <T, U extends unknown[]>(p: Parser<T>, ...rst: MapParsers<U>): Parser<[T, ...U]> => {
	if (rst.length === 0) {
		return fmap(p, (t) => [t] as unknown as [T, ...U]);
	}
	return fmap(
		then(p, seq(rst[0], ...rst.slice(1))),
		([r, s]: [unknown, unknown[]]) => [r].concat(s) as unknown as [T, ...U],
	);
};

export const kl = <L>(l: Parser<L>, r: Parser<unknown>): Parser<L> => fmap(then(l, r), ([o, _v]) => o);
export const kr = <R>(l: Parser<unknown>, r: Parser<R>): Parser<R> => fmap(then(l, r), ([_o, v]) => v);

/** Fabula Ultima pdf specific useful parsers */

export const descriptionEnd = fmap(
	satisfy((t) => isStringToken(t) && /.*[.?!]$/.test(t.string), "description end") as Parser<StringToken>,
	(t) => t.string,
);

export const descriptionLine = fmap(
	satisfy(
		(t) =>
			isStringToken(t) &&
			[/PTSans-Narrow$/, /PTSans-NarrowBold$/, /Heydings-Icons$/, /KozMinPro-Regular$/].some((r) =>
				r.test(t.font),
			) &&
			!/^Opportunity:/.test(t.string),
		"description line",
	) as Parser<StringToken>,
	(t) => t.string,
);
export const description = alt(
	fmap(seq(strWithFont([/PTSans-Narrow$/]), many(descriptionLine), descriptionEnd), ([h, z, s]) =>
		prettifyStrings([h, ...z, s]),
	),
	descriptionEnd,
);

export const starting = seq(image, image, many1(str));

export const sep = textWithFont("w", [/Wingdings-Regular$/]);
export const matches = (r: RegExp, errorMsg: string) =>
	fmap(satisfy((t) => isStringToken(t) && r.test(t.string), errorMsg) as Parser<StringToken>, (t) => t.string);

export type Distance = "melee" | "ranged";
export type Handed = "one-handed" | "two-handed";
export type WeaponCategory =
	| "arcane"
	| "bow"
	| "brawling"
	| "dagger"
	| "firearm"
	| "flail"
	| "heavy"
	| "spear"
	| "sword"
	| "thrown";

export const STATS = ["DEX", "MIG", "INS", "WLP"] as const;
export type Stat = (typeof STATS)[number];
export const isStat = (s: string): s is Stat => {
	return s == "DEX" || s == "MIG" || s == "INS" || s == "WLP";
};

export const TYPE_CODES = [
	["physical", "'"],
	["air", "a"],
	["bolt", "b"],
	["dark", "a"],
	["earth", "E"],
	["fire", "f"],
	["ice", "i"],
	["light", "l"],
	["poison", "b"],
] as const;

export type DamageType = (typeof TYPE_CODES)[number][0];
export const AFFINITIES = ["VU", "N", "RS", "IM", "AB"] as const;
export type AFFINITY = (typeof AFFINITIES)[number];
export type ResistanceMap = { [Property in DamageType]: AFFINITY };
export type Accuracy = { primary: Stat; secondary: Stat; bonus: number };

const bonus = alt(
	fmap(satisfy((t) => isStringToken(t) && /\+\d*/.test(t.string), "Accuracy bonus") as Parser<StringToken>, (t) =>
		Number(t.string.slice(1)),
	),
	success(0),
);
//TODO: Parse attibutes instead of str and cast
const statsForAccuracy: Parser<readonly [Stat, Stat]> = (ptr: PTR) => {
	const token = nextToken(ptr);
	if (token && isStringToken(token) && token.string.length == 9) {
		const primary = token.string.slice(0, 3);
		const secondary = token.string.slice(-3);
		if (isStat(primary) && isStat(secondary)) {
			return success([primary, secondary] as const)(inc(ptr));
		}
	}
	return fail<[Stat, Stat]>("Accuracy attributes")(ptr);
};
export const accuracy = fmap(
	then(kl(kr(text("【"), statsForAccuracy), text("】")), bonus),
	([[primary, secondary], bonus]) => {
		return { primary, secondary, bonus };
	},
);

const statsForDamage: Parser<number> = (ptr: PTR) => {
	const token = nextToken(ptr);
	if (token && isStringToken(token) && /HR \+ \d+/.test(token.string)) {
		return success(Number(token.string.slice(5)))(inc(ptr));
	}
	return fail<number>("Damage")(ptr);
};
export const damage = kl(kr(text("【"), statsForDamage), text("】"));

//TODO: Parse damage type instead of just any string
export const damageType: Parser<DamageType> = fmap(many1(str), (ts) => ts.join("") as DamageType);
export const hands: Parser<Handed> = alt(
	fmap(text("One-handed"), () => "one-handed"),
	fmap(text("Two-handed"), () => "two-handed"),
);
export const melee: Parser<Distance> = alt(
	fmap(text("Melee"), () => "melee"),
	fmap(text("Ranged"), () => "ranged"),
);

export const martial = alt(
	fmap(textWithFont("E", [/FnT_BasicShapes1$/]), (_e) => true),
	success(false),
);
const convertCosts = (s: string) => {
	if (s.endsWith(" z")) {
		return Number(s.slice(0, -2));
	} else if (s === "-") {
		return 0;
	} else {
		return Number(s);
	}
};
export const cost = fmap(strWithFont([/PTSans-Narrow$/]), convertCosts);

export const dashOrNumber = (errorMsg: string) =>
	fmap(matches(/^((\+|-)?[0-9]+)|-$/, errorMsg), (s: string) => (s === "-" ? 0 : Number(s)));

export type DieSize = 6 | 8 | 10 | 12;

export const prettifyStrings = (lines: string[]): string => {
	return lines.reduce((acc, line) => {
		const s = line.trim();
		if (/^[.?!]/.test(s)) {
			return acc + s;
		} else {
			return acc + " " + s;
		}
	}, "");
};
