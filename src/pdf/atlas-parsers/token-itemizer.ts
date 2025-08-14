import {
	asImageToken,
	asStringToken,
	ImageToken,
	isImageToken,
	isStringToken,
	ItemToken,
	StringToken,
	Token,
} from "../lexers/token";
import "../../common/common.ts";
import { ITEM_CATEGORY, ItemCategory } from "../model/common";

export function itemizeTokens(tokens: Token[]): Map<ItemCategory, ItemToken[]> {
	const stringTokens = tokens.filter(isStringToken).map(asStringToken);
	const imageTokens = tokens.filter(isImageToken).map(asImageToken);

	const tokensByCategory = divideTokensByCategory(stringTokens);
	return tokensByCategory.mapValues((tokens) => convertToItemTokens(tokens, imageTokens));
}

// Used to filter out the elements with fonts in which things like page number, watermark, table headers are written
const isItemElement = (token: StringToken) =>
	!token.font.includes("Helvetica") &&
	!token.font.includes("Antonio-Regular") &&
	!token.font.includes("Antonio-Bold") &&
	!token.font.includes("BodoniOrnaments");

// TODO refactor to not use mutables
function divideTokensByCategory(stringTokens: StringToken[]): Map<ItemCategory, StringToken[]> {
	return stringTokens.reduce(
		(acc, token) => {
			if (ITEM_CATEGORY.includes(token.string)) {
				acc.currentCategory = token.string;
				if (!acc.tokensByCategory.has(token.string)) {
					acc.tokensByCategory.set(token.string, []);
					acc.skipTokens = false;
				} else {
					// This is introduced because of strange parsing of the "second" weapons' page.
					// Somehow pdf.js is also finding text elements from the first page, but images only for the second.
					// So, if category reappears, i.e. has its list already we skip adding elements to it.
					acc.skipTokens = true;
				}
			} else if (acc.currentCategory !== "" && isItemElement(token) && !acc.skipTokens) {
				const tokenList = acc.tokensByCategory.get(acc.currentCategory);
				tokenList?.push(token); // This is mutable, so it modifies the list in the tokensByCategory map
			}
			return acc;
		},
		{ currentCategory: "", skipTokens: false, tokensByCategory: new Map<ItemCategory, StringToken[]>() },
	).tokensByCategory;
}

// TODO refactor to not use mutables
function convertToItemTokens(stringTokens: StringToken[], imageTokens: ImageToken[]): ItemToken[] {
	return stringTokens.reduce(
		(acc, token, tokenIdx) => {
			if (!acc.itemTokens[acc.index]) {
				acc.itemTokens.push({
					image: imageTokens[acc.index],
					strings: [],
				});
			}
			acc.itemTokens[acc.index].strings.push(token);
			if (token.string.endsWith(".") && !stringTokens[tokenIdx + 1]?.font?.includes("Wingdings-Regular")) {
				acc.index++;
			}
			return acc;
		},
		{ index: 0, itemTokens: Array<ItemToken>() },
	).itemTokens;
}
