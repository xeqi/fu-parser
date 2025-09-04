import { ItemToken } from "../lexers/token";
import { Armor, convertDef } from "../model/armor";
import { convertCosts, isMartial, convertDashOrNumber, prettifyStrings } from "../parsers-commons";

export function parseArmor(armorToken: ItemToken): Armor {
	const armorStringTokens = armorToken.strings.map((token) => token.string);
	const name = armorStringTokens[0];
	const martial = isMartial(armorToken.strings[1]);

	const indexShift = martial ? 1 : 0;
	const cost = convertCosts(armorStringTokens[1 + indexShift]);
	const def = convertDef("DEX")(armorStringTokens[2 + indexShift]);
	const mdef = convertDef("INS")(armorStringTokens[3 + indexShift]);
	const init = convertDashOrNumber(armorStringTokens[4 + indexShift]);
	const description = prettifyStrings(armorStringTokens.slice(5 + indexShift));

	return {
		image: armorToken.image.image,
		name: name,
		martial: martial,
		cost: cost,
		def: def,
		mdef: mdef,
		init: init,
		description: description,
	};
}
