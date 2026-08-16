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
import { FEATURE_CATEGORY, ITEM_CATEGORY, ItemCategory } from "../model/common";

export function itemizeTokens(tokens: Token[]): [Map<ItemCategory, ItemToken[]>, string] {
	const stringTokens = tokens.filter(isStringToken).map(asStringToken);
	const imageTokens = tokens
		.filter(isImageToken)
		.map(asImageToken)
		.sort((img1, img2) => img2.y - img1.y);

	const optionalWeaponCategory =
		stringTokens
			.find((token) => token.string.startsWith("SAMPLE RARE"))
			?.string.split(" ")
			.at(2) || "";
	const stringTokensByCategory = divideTokensByCategory(stringTokens).mapValues((tokens) =>
		groupItemStringTokens(tokens),
	);
	const imageTokensByCategory = divideImagesByCategory(stringTokensByCategory, imageTokens);

	const itemsByCategory = stringTokensByCategory.map((category, categoryTokens) => {
		const itemTokens: ItemToken[] = categoryTokens.map((tokens, index) => {
			return FEATURE_CATEGORY.includes(category)
				? { strings: tokens }
				: { image: imageTokensByCategory.get(category)![index], strings: tokens };
		});
		return [category, itemTokens];
	});

	return [itemsByCategory, optionalWeaponCategory];
}

// Used to filter out the elements with fonts in which things like page number, watermark, table headers and flavor callouts (MonotypeCorsiva) are written
const isItemElement = (token: StringToken) =>
	!token.font.includes("Helvetica") &&
	!token.font.includes("Antonio-Regular") &&
	!token.font.includes("Antonio-Bold") &&
	!token.font.includes("BodoniOrnaments") &&
	!token.font.includes("MonotypeCorsiva");

function divideTokensByCategory(stringTokens: StringToken[]): Map<ItemCategory, StringToken[]> {
	return stringTokens.reduce(
		(acc, token) => {
			if (ITEM_CATEGORY.includes(token.string) || isSampleArmorOrShield(token.string)) {
				const currentCategory = isSampleArmorOrShield(token.string)
					? trimEndingS(token.string.split(" ").at(2)) || token.string
					: token.string;
				acc.currentCategory = currentCategory;
				if (!acc.tokensByCategory.has(currentCategory)) {
					acc.tokensByCategory.set(currentCategory, []);
					acc.skipTokens = false;
				} else {
					// This is introduced because of strange parsing of the "second" weapons' page.
					// Somehow pdf.js is also finding text elements from the first page, but images only for the second.
					// So, if category reappears, i.e. has its list already we skip adding elements to it.
					acc.skipTokens = true;
				}
			} else if (token.string.includes("new Camp Activities")) {
				// There is an additional frame under camp activities list, we want to skip parsing it.
				acc.skipTokens = true;
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
		stringTokens[tokenIdx + 1]?.font?.includes("Wingdings-Regular") ||
		stringTokens[tokenIdx + 1]?.font?.endsWith("FabulaUltimaicons-Regular")
	);

const isSampleArmorOrShield = (tokenString: string) =>
	tokenString.startsWith("SAMPLE RARE") && !tokenString.endsWith("WEAPONS");

const trimEndingS = (str: string | undefined) => (str?.endsWith("S") ? str.slice(0, -1) : str);
