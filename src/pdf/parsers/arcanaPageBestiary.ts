import { eof, fmap, inc, isResult, kr, nextToken, Parse, Parser, result, seq, watermark } from "./lib";
import { isImageToken, isStringToken, StringToken, Token } from "../lexers/token";
import { Arcanum } from "../model/arcanum";
import { Image } from "../model/common";
import { prettifyStrings, titleCase } from "../parsers-commons";

const FU_ICONS = /FabulaUltimaicons-Regular$/;
const TYPE3 = /Type3$/;
const SECTION_FONT = /Antonio-Bold$/;
const DESC_FONTS = [/PTSans-Narrow$/, /PTSans-NarrowBold$/];

const ORNAMENT_FONTS = [/BodoniOrnamentsITCTT$/, /CreditValley$/, /CreditValley-bold$/];

const isDesc = (t: Token): boolean => isStringToken(t) && DESC_FONTS.some((f) => f.test(t.font));
const isSection = (t: Token): boolean => isStringToken(t) && SECTION_FONT.test(t.font);
const isOrnament = (t: Token): boolean =>
	isStringToken(t) && ORNAMENT_FONTS.some((f) => f.test(t.font)) && t.string.length <= 2;
const isInlineIcon = (t: Token): boolean => isStringToken(t) && (FU_ICONS.test(t.font) || TYPE3.test(t.font));

const isDomainsLabel = (t: Token | null): boolean =>
	!!t && isStringToken(t) && /^Domains:?$/.test(t.string) && !isSection(t);

const isNameCandidate = (t: Token | null): boolean =>
	!!t && isStringToken(t) && t.string.trim().length > 2 && !isOrnament(t) && !isDomainsLabel(t) && !isDesc(t);

const isArcanumStart = (ptr: [Token[], number]): boolean => {
	const t = nextToken(ptr);
	if (!t) return false;
	const nameStart = isImageToken(t) ? inc(ptr) : ptr;
	if (!isNameCandidate(nextToken(nameStart))) return false;
	let cur = inc(nameStart);
	for (let i = 0; i < 4; i++) {
		const tok = nextToken(cur);
		if (!tok) return false;
		if (isDomainsLabel(tok)) return true;
		if (!isDesc(tok)) return false;
		cur = inc(cur);
	}
	return false;
};

const pageHeader: Parser<unknown> = (ptr) => {
	let current = ptr;
	for (;;) {
		if (isArcanumStart(current)) break;
		if (!nextToken(current)) break;
		current = inc(current);
	}
	return [result(null, current)];
};

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
const arcanumPrefix: Parser<Image> = (ptr) => {
	const t = nextToken(ptr);
	if (t && isImageToken(t)) return [result(t.image, inc(ptr))];
	return [result(nullImage, ptr)];
};

const arcanumName: Parser<string> = (ptr) => {
	const t = nextToken(ptr);
	if (isNameCandidate(t)) return [result((t as StringToken).string, inc(ptr))];
	return [{ error: "arcanum name", distance: ptr[1], found: t && isStringToken(t) ? t : "<eof>" }];
};

const arcanumCaption: Parser<string> = (ptr) => {
	const parts: string[] = [];
	let current = ptr;
	for (;;) {
		const t = nextToken(current);
		if (!t || !isDesc(t) || isDomainsLabel(t)) break;
		parts.push((t as StringToken).string);
		current = inc(current);
	}
	return [result(prettifyStrings(parts), current)];
};

const domainsLabel: Parser<null> = (ptr) => {
	const t = nextToken(ptr);
	if (isDomainsLabel(t)) {
		let current = inc(ptr);
		const next = nextToken(current);
		if (next && isStringToken(next) && next.string === ":") current = inc(current);
		return [result(null, current)];
	}
	return [{ error: "Domains:", distance: ptr[1], found: t && isStringToken(t) ? t : "<eof>" }];
};

const domainsText: Parser<string> = (ptr) => {
	const parts: string[] = [];
	let current = ptr;
	for (;;) {
		const t = nextToken(current);
		if (!t || !isDesc(t) || isSection(t)) break;
		parts.push((t as StringToken).string);
		current = inc(current);
	}
	return [result(prettifyStrings(parts).replace(/\.$/, ""), current)];
};

const sectionHeader =
	(label: string): Parser<string> =>
	(ptr) => {
		const header = nextToken(ptr);
		if (!header || !isSection(header) || (header as StringToken).string !== label) {
			return [{ error: label, distance: ptr[1], found: header && isStringToken(header) ? header : "<eof>" }];
		}
		const titleTok = nextToken(inc(ptr));
		if (!titleTok || !isSection(titleTok)) {
			return [
				{
					error: `${label} title`,
					distance: ptr[1] + 1,
					found: titleTok && isStringToken(titleTok) ? titleTok : "<eof>",
				},
			];
		}
		return [result((titleTok as StringToken).string, inc(inc(ptr)))];
	};

const abilityBody: Parser<string> = (ptr) => {
	const parts: string[] = [];
	let current = ptr;
	for (;;) {
		const t = nextToken(current);
		if (!t) break;
		if (isImageToken(t)) break;
		if (isSection(t)) break;
		if (isOrnament(t)) break;
		if (isInlineIcon(t)) {
			if (isStringToken(t) && t.string === "•") parts.push(t.string);
			current = inc(current);
			continue;
		}
		if (!isDesc(t)) break;
		parts.push((t as StringToken).string);
		current = inc(current);
	}
	if (parts.length === 0) {
		const found = nextToken(ptr);
		return [{ error: "ability body", distance: ptr[1], found: found && isStringToken(found) ? found : "<eof>" }];
	}
	return [result(prettifyStrings(parts), current)];
};

const ability = (label: string): Parser<{ title: string; description: string }> =>
	fmap(seq(sectionHeader(label), abilityBody), ([title, description]) => ({ title, description }));

const arcanumParser: Parser<Arcanum> = fmap(
	seq(
		arcanumPrefix,
		arcanumName,
		arcanumCaption,
		kr(domainsLabel, domainsText),
		ability("MERGE"),
		ability("DISMISS"),
	),
	([image, name, caption, domains, merge, dismiss]) => ({
		image,
		name: titleCase(name),
		caption: caption.trim(),
		domains: domains.trim(),
		merge,
		dismiss,
	}),
);

const committedArcana: Parser<Arcanum[]> = (ptr) => {
	const arcana: Arcanum[] = [];
	let current = ptr;
	for (;;) {
		if (!isArcanumStart(current)) break;
		const parses = arcanumParser(current);
		const ok = parses.filter(isResult);
		if (ok.length === 0) return parses.filter((p) => !isResult(p)) as Parse<Arcanum[]>[];
		current = ok[0].result[1];
		arcana.push(ok[0].result[0]);
	}
	if (arcana.length === 0) {
		const found = nextToken(ptr);
		return [{ error: "arcanum", distance: ptr[1], found: found && isStringToken(found) ? found : "<eof>" }];
	}
	return [result(arcana, current)];
};

export const arcanaFUBA: Parser<Arcanum[]> = fmap(
	seq(kr(pageHeader, committedArcana), seq(pageTail, watermark, eof)),
	([arcana]) => arcana,
);
