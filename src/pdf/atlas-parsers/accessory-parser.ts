import { ItemToken } from "../lexers/token";
import { Accessory } from "../model/accessory";
import { convertCosts, prettifyStrings } from "../parsers-commons";

export function parseAccessory(accessoryToken: ItemToken): Accessory {
	const accessoryStringTokens = accessoryToken.strings.map((token) => token.string);
	const name = accessoryStringTokens[0];
	const cost = convertCosts(accessoryStringTokens[1]);
	const description = prettifyStrings(accessoryStringTokens.slice(2));

	return {
		image: accessoryToken.image.image,
		name: name,
		description: description,
		cost: cost,
	};
}
