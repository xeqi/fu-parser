import {
	Parser,
	alt,
	cost,
	dashOrNumber,
	descriptionEnd,
	eof,
	fmap,
	image,
	kl,
	kr,
	many,
	many1,
	martial,
	seq,
	starting,
	str,
	strWithFont,
	success,
	then,
	watermark,
} from "./lib";
import { Armor, convertDef } from "../model/armor";
import { prettifyStrings } from "../parsers-commons";

const def = fmap(str, convertDef("DEX"));
const mdef = fmap(str, convertDef("INS"));

const init = dashOrNumber("initiative");

const armorDescription = fmap(
	then(
		many(strWithFont([/PTSans-Narrow$/, /PTSans-NarrowBold$/, /Heydings-Icons$/, /KozMinPro-Regular$/])),
		descriptionEnd,
	),
	([z, s]) => prettifyStrings([...z, s]),
);

const armorParser: Parser<Armor> = fmap(
	seq(image, str, martial, cost, def, mdef, init, armorDescription),
	([image, name, martial, cost, def, mdef, init, description]) => {
		return { image, name, martial, cost, def, mdef, init, description };
	},
);

export const armorPage = kl(kr(starting, many1(armorParser)), seq(alt(image, success(null)), watermark, eof));
