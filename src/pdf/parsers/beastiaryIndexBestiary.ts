import { inc, nextToken } from "./lib";
import { isStringToken, Token } from "../lexers/token";
import { BeastRank } from "../model/beast";
import { Role, ROLES } from "../model/common";

// Bestiary vol.1 ships a condensed cross-reference table (pages 354-358, book pages 352-356)
// listing every profile's rank/role/level. Individual stat blocks frequently omit the rank tag,
// so this index is parsed once and used to correct beasts by name.

export type IndexEntry = {
	rank: BeastRank;
	phases?: number;
	role?: Role;
	level: number;
};

const NAME_FONT = /PTSans-NarrowBold$/;
const CELL_FONT = /PTSans-Narrow$/;
const RANK_RE = /^(Soldier|Elite|Champion|Companion)(?:\s+(\d+))?$/i;

const isName = (t: Token | null): boolean => !!t && isStringToken(t) && NAME_FONT.test(t.font);
const isCell = (t: Token | null): boolean =>
	!!t && isStringToken(t) && CELL_FONT.test(t.font) && !NAME_FONT.test(t.font);

export const indexNameKey = (name: string): string => name.trim().replace(/\s+/g, " ").toUpperCase();

export const parseBeastiaryIndex = (tokens: Token[]): Record<string, IndexEntry> => {
	const entries: Record<string, IndexEntry> = {};
	let ptr: [Token[], number] = [tokens, 0];
	for (;;) {
		const t = nextToken(ptr);
		if (!t) break;
		if (!isName(t)) {
			ptr = inc(ptr);
			continue;
		}
		const nameParts = [(t as { string: string }).string];
		let cur = inc(ptr);
		const qualifier = nextToken(cur);
		if (qualifier && isCell(qualifier) && /^\(.*\)$/.test((qualifier as { string: string }).string)) {
			nameParts.push((qualifier as { string: string }).string);
			cur = inc(cur);
		}
		const cells: string[] = [];
		let ok = true;
		for (let i = 0; i < 5; i++) {
			const c = nextToken(cur);
			if (!isCell(c)) {
				ok = false;
				break;
			}
			cells.push((c as { string: string }).string);
			cur = inc(cur);
		}
		if (!ok) {
			ptr = inc(ptr);
			continue;
		}
		const [lvStr, roleStr, rankStr] = cells;
		const rankMatch = rankStr.match(RANK_RE);
		if (!rankMatch || !/^\d+$/.test(lvStr)) {
			ptr = inc(ptr);
			continue;
		}
		const rank = rankMatch[1].toLowerCase() as BeastRank;
		const entry: IndexEntry = { rank, level: Number(lvStr) };
		if (rank === "champion" && rankMatch[2]) entry.phases = Number(rankMatch[2]);
		const role = (ROLES as readonly string[]).includes(roleStr.toLowerCase())
			? (roleStr.toLowerCase() as Role)
			: undefined;
		if (role) entry.role = role;
		entries[indexNameKey(nameParts.join(" "))] = entry;
		ptr = cur;
	}
	return entries;
};
