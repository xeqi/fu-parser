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
	const imageTokens = tokens
		.filter(isImageToken)
		.map(asImageToken)
		.sort((img1, img2) => img2.y - img1.y);

	const stringTokensByCategory = divideTokensByCategory(stringTokens).mapValues((tokens) =>
		groupItemStringTokens(tokens),
	);
	const imageTokensByCategory = divideImagesByCategory(stringTokensByCategory, imageTokens);

	return stringTokensByCategory.map((category, categoryTokens) => {
		const itemTokens: ItemToken[] = categoryTokens.map((tokens, index) => {
			return {
				image: imageTokensByCategory.get(category)![index],
				strings: tokens,
			};
		});
		return [category, itemTokens];
	});
}

// Used to filter out the elements with fonts in which things like page number, watermark, table headers are written
const isItemElement = (token: StringToken) =>
	!token.font.includes("Helvetica") &&
	!token.font.includes("Antonio-Regular") &&
	!token.font.includes("Antonio-Bold") &&
	!token.font.includes("BodoniOrnaments");

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
			return acc; // acc is returned because it is mutated earlier
		},
		{ currentCategory: "", skipTokens: false, tokensByCategory: new Map<ItemCategory, StringToken[]>() },
	).tokensByCategory;
}

function groupItemStringTokens(stringTokens: StringToken[]): StringToken[][] {
	return stringTokens.reduce(
		(acc, token, tokenIdx) => {
			if (!acc.groupedTokens[acc.index]) {
				acc.groupedTokens.push([]);
			}
			acc.groupedTokens[acc.index].push(token);
			if (isLastItemToken(token, tokenIdx, stringTokens)) {
				acc.index++;
			}
			return acc;
		},
		{ index: 0, groupedTokens: Array<StringToken[]>() },
	).groupedTokens;
}

function divideImagesByCategory(
	groupedTokensByCategory: Map<ItemCategory, StringToken[][]>,
	imageTokens: ImageToken[],
): Map<ItemCategory, ImageToken[]> {
	return Array.from(groupedTokensByCategory).reduce(
		(acc, category) => {
			const numberOfItems = category[1].length;
			const imageTokensForCategory = acc.imageTokens.slice(0, numberOfItems);
			const remainingImages = acc.imageTokens.slice(numberOfItems);
			const imageTokensByCategory = acc.imageTokensByCategory.set(category[0], imageTokensForCategory);

			return { imageTokens: remainingImages, imageTokensByCategory: imageTokensByCategory };
		},
		{ imageTokens: imageTokens, imageTokensByCategory: new Map<ItemCategory, ImageToken[]>() },
	).imageTokensByCategory;
}

const isLastItemToken = (token: StringToken, tokenIdx: number, stringTokens: StringToken[]) =>
	token.string.endsWith(".") &&
	!(
		stringTokens[tokenIdx + 1]?.font?.endsWith("PTSans-Narrow") ||
		stringTokens[tokenIdx + 1]?.font?.includes("Wingdings-Regular")
	);
