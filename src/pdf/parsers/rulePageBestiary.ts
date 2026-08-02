import { eof, inc, nextToken, Parser, result, watermark } from "./lib";
import { isImageToken, isStringToken, StringToken, Token } from "../lexers/token";
import { Rule } from "../model/rule";
import { prettifyStrings, titleCase } from "../parsers-commons";

const FU_ICONS = /FabulaUltimaicons-Regular$/;
const TYPE3 = /Type3$/;
const NAME_FONT = /Antonio-Bold$/;
const CATEGORY_FONT = /BodoniOrnamentsITCTT$/;
const RUNNING_HEAD_FONT = /CreditValley$/;
const DESC_FONTS = [/PTSans-Narrow$/, /PTSans-NarrowBold$/];

const BULLET_FONT = /Wingdings-Regular$/;

const isName = (t: Token | null): boolean => !!t && isStringToken(t) && NAME_FONT.test(t.font);
const isDesc = (t: Token | null): boolean => !!t && isStringToken(t) && DESC_FONTS.some((f) => f.test(t.font));
const isInlineIcon = (t: Token | null): boolean =>
	!!t && isStringToken(t) && (FU_ICONS.test(t.font) || TYPE3.test(t.font));
const isBullet = (t: Token | null): boolean => !!t && isStringToken(t) && BULLET_FONT.test(t.font);
const isRunningHead = (t: Token | null): boolean => !!t && isStringToken(t) && RUNNING_HEAD_FONT.test(t.font);
const isCategory = (t: Token | null): boolean =>
	!!t &&
	isStringToken(t) &&
	((CATEGORY_FONT.test(t.font) && t.string.trim().length > 2) || (isName(t) && /\bSKILLS?$/.test(t.string.trim())));

const isSkillName = (t: Token | null): boolean => isName(t) && !isCategory(t);

const isRuleStart = (ptr: [Token[], number]): boolean => {
	const t = nextToken(ptr);
	if (!isSkillName(t)) return false;
	return isDesc(nextToken(inc(ptr)));
};

const captionAndBody = (ptr: [Token[], number]): [string, string, [Token[], number]] => {
	const captionParts: string[] = [];
	let current = ptr;
	for (let i = 0; i < 6; i++) {
		const t = nextToken(current);
		if (!t || !isDesc(t)) break;
		captionParts.push((t as StringToken).string);
		current = inc(current);
		if (/[.!?]["']?$/.test((t as StringToken).string.trim())) break;
	}
	const caption = prettifyStrings(captionParts);

	const bodyParts: string[] = [];
	for (;;) {
		const t = nextToken(current);
		if (!t) break;
		if (isImageToken(t)) break;
		if (isName(t) || isCategory(t) || isRunningHead(t)) break;
		if (isBullet(t)) {
			bodyParts.push("•");
			current = inc(current);
			continue;
		}
		if (isInlineIcon(t)) {
			if (isStringToken(t) && t.string === "•") bodyParts.push(t.string);
			current = inc(current);
			continue;
		}
		if (!isDesc(t)) break;
		bodyParts.push((t as StringToken).string);
		current = inc(current);
	}
	return [caption, prettifyStrings(bodyParts), current];
};

export const rulesFUBA =
	(seedCategory = ""): Parser<Rule[]> =>
	(ptr) => {
		const out: Rule[] = [];
		let current = ptr;
		let category = seedCategory;
		for (;;) {
			const t = nextToken(current);
			if (!t) break;
			if (isRunningHead(t)) break;
			if (isImageToken(t)) {
				current = inc(current);
				continue;
			}
			if (isCategory(t)) {
				category = titleCase((t as StringToken).string);
				current = inc(current);
				continue;
			}
			if (isRuleStart(current)) {
				const name = titleCase((t as StringToken).string);
				const [caption, description, next] = captionAndBody(inc(current));
				out.push({ image: { width: 0, height: 0 }, name, category, caption, description });
				current = next;
				continue;
			}
			current = inc(current);
		}
		for (;;) {
			const t = nextToken(current);
			if (!t || (isStringToken(t) && /Helvetica$/.test(t.font))) break;
			current = inc(current);
		}
		if (out.length === 0) {
			return [{ error: "rule", distance: ptr[1], found: "<eof>" }];
		}
		const wm = watermark(current);
		if (wm.length && "result" in wm[0]) {
			const end = eof(wm[0].result[1]);
			if (end.length && "result" in end[0]) return [result(out, end[0].result[1])];
		}
		return [result(out, current)];
	};

const SPECIES_HEAD_FONTS = [/Antonio-Regular$/, /Antonio-Bold$/, /BodoniOrnamentsITCTT$/];
const FU_SPECIES = new Set(["BEAST", "CONSTRUCT", "DEMON", "ELEMENTAL", "HUMANOID", "MONSTER", "PLANT", "UNDEAD"]);

const isSpeciesHead = (t: Token | null): boolean =>
	!!t && isStringToken(t) && SPECIES_HEAD_FONTS.some((f) => f.test(t.font)) && FU_SPECIES.has(t.string.trim());

export const speciesRulesFUBA: Parser<Rule[]> = (ptr) => {
	const out: Rule[] = [];
	let current = ptr;
	for (;;) {
		const t = nextToken(current);
		if (!t) break;
		if (isRunningHead(t)) break;
		if (!isSpeciesHead(t)) {
			current = inc(current);
			continue;
		}
		const name = (t as StringToken).string.trim();
		current = inc(current);
		const introParts: string[] = [];
		for (;;) {
			const n = nextToken(current);
			if (!n || isBullet(n) || isSpeciesHead(n) || isRunningHead(n) || isImageToken(n)) break;
			if (isDesc(n)) introParts.push((n as StringToken).string);
			current = inc(current);
		}
		const bullets: string[] = [];
		while (isBullet(nextToken(current))) {
			current = inc(current);
			const parts: string[] = [];
			for (;;) {
				const n = nextToken(current);
				if (!n) break;
				if (isBullet(n) || isSpeciesHead(n) || isRunningHead(n) || isImageToken(n)) break;
				if (isInlineIcon(n)) {
					current = inc(current);
					continue;
				}
				if (!isDesc(n)) break;
				parts.push((n as StringToken).string);
				current = inc(current);
			}
			if (parts.length) bullets.push(prettifyStrings(parts));
		}
		out.push({
			image: { width: 0, height: 0 },
			name,
			category: "Species Skills",
			caption: "",
			description: prettifyStrings(introParts),
			bullets,
		});
	}
	if (out.length === 0) {
		return [{ error: "species rule", distance: ptr[1], found: "<eof>" }];
	}
	return [result(out, current)];
};

const ROLE_SKILLS_HEADING = /^ROLE SKILLS:\s*(.+)$/;
const CUSTOMIZATION_HEADING = /^CUSTOMIZATION$/;

const isSkillSectionHeading = (t: Token | null): boolean =>
	!!t && isStringToken(t) && (isDesc(t) || isName(t)) && isSkillSectionHeadingText(t.string.trim());

const isSkillSectionHeadingText = (s: string): boolean => ROLE_SKILLS_HEADING.test(s) || CUSTOMIZATION_HEADING.test(s);

const NAMED_BULLET = /^(.+?)\s*\((special rule|unique action)\)$/;

const FU_ICON_BULLET_CHARS = new Set(["•", "-"]);
const isFuIconBulletChar = (t: Token | null): boolean =>
	!!t && isStringToken(t) && FU_ICONS.test(t.font) && FU_ICON_BULLET_CHARS.has(t.string);
const isPotentialSectionBullet = (t: Token | null): boolean => isBullet(t) || isFuIconBulletChar(t);
const isSectionBulletMarker = (t: Token | null, marker: string | null): boolean =>
	isBullet(t) ? marker === "wingdings" : isFuIconBulletChar(t) && (t as StringToken).string === marker;

export const roleSkillsFUBA =
	(seedRole = ""): Parser<Rule[]> =>
	(ptr) => {
		const out: Rule[] = [];
		let current = ptr;
		let roleName = seedRole;
		let inSection = false;
		let marker: string | null = null;
		let unnamedCount = 0;
		let pendingName: [string, "rule" | "miscAbility"] | null = null;
		for (;;) {
			const t = nextToken(current);
			if (!t) break;
			if (isRunningHead(t)) break;
			if (isStringToken(t) && (isDesc(t) || isName(t))) {
				const m = ROLE_SKILLS_HEADING.exec(t.string.trim());
				if (m) roleName = titleCase(m[1]);
			}
			if (isSkillSectionHeading(t)) {
				inSection = true;
				marker = null;
				current = inc(current);
				continue;
			}
			if (!inSection || !roleName) {
				current = inc(current);
				continue;
			}
			if (marker === null) {
				if (!isPotentialSectionBullet(t)) {
					current = inc(current);
					continue;
				}
				marker = isBullet(t) ? "wingdings" : (t as StringToken).string;
			} else if (!isSectionBulletMarker(t, marker)) {
				current = inc(current);
				continue;
			}
			current = inc(current);
			const parts: string[] = [];
			for (;;) {
				const n = nextToken(current);
				if (!n) break;
				if (isSectionBulletMarker(n, marker) || isRunningHead(n) || isImageToken(n) || isSkillSectionHeading(n))
					break;
				if (isInlineIcon(n)) {
					current = inc(current);
					continue;
				}
				if (!isDesc(n)) break;
				parts.push((n as StringToken).string);
				current = inc(current);
			}
			if (parts.length === 0) continue;
			const first = parts[0].trim();
			const named = NAMED_BULLET.exec(first);
			if (named && parts.length === 1) {
				pendingName = [named[1], named[2] === "unique action" ? "miscAbility" : "rule"];
				continue;
			}
			if (named) {
				const itemType = named[2] === "unique action" ? "miscAbility" : "rule";
				out.push({
					image: { width: 0, height: 0 },
					name: named[1],
					category: roleName,
					caption: "",
					description: prettifyStrings([named[1], ...parts.slice(1)]),
					itemType,
				});
				continue;
			}
			if (pendingName) {
				const [name, itemType] = pendingName;
				pendingName = null;
				out.push({
					image: { width: 0, height: 0 },
					name,
					category: roleName,
					caption: "",
					description: prettifyStrings(parts),
					itemType,
				});
				continue;
			}
			unnamedCount += 1;
			out.push({
				image: { width: 0, height: 0 },
				name: `${roleName} Role Skill (${unnamedCount})`,
				category: roleName,
				caption: "",
				description: prettifyStrings(parts),
				itemType: "rule",
			});
		}
		if (out.length === 0) {
			return [{ error: "role skill", distance: ptr[1], found: "<eof>" }];
		}
		return [result(out, current)];
	};
