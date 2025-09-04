import { asStringToken, ItemToken, Token } from "../lexers/token";
import { itemizeTokens } from "./token-itemizer";
import "../../common/common.ts";
import { Item, ItemCategory } from "../model/common";
import { parseAccessory } from "./accessory-parser";
import { parseShield } from "./shield-parser";
import { parseArmor } from "./armor-parser";
import { parseWeapon } from "./weapon-parser";
import { parseWeaponModule } from "./weapon-module-parser";

export function parseAtlasPage(pageData: Token[]): Map<ItemCategory, Item[]> {
	const watermark = pageData[pageData.length - 1];
	if (watermark.kind !== "String" || asStringToken(watermark).font !== "Helvetica") {
		throw new Error("Failed to parse page because it is not watermarked.");
	} else {
		const itemTokensByCategory = itemizeTokens(pageData);
		return itemTokensByCategory.map((category, itemTokens) => {
			const items = itemTokens.map((token) => {
				const item = parseItem(category, token);
				if (hasUndefinedProperty(item)) {
					throw new Error("Failed to parse one or more items on the page.");
				}
				return item;
			});
			return [category, items];
		});
	}
}

function parseItem(category: ItemCategory, itemToken: ItemToken): Item {
	switch (category) {
		case "WEAPON":
			return parseWeapon(itemToken);
		case "ARMOR":
			return parseArmor(itemToken);
		case "SHIELD":
			return parseShield(itemToken);
		case "ACCESSORY":
			return parseAccessory(itemToken);
		case "WEAPON MODULE":
			return parseWeaponModule(itemToken);
		default:
			// This should never happen if `category` is properly typed
			throw new Error(`Unknown item category: ${category}`);
	}
}

function hasUndefinedProperty(item: Item): boolean {
	return Object.entries(item).some(([_, value]) => value === undefined);
}
