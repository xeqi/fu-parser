import { Image } from "../lexers/token";
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
	prettifyStrings,
	seq,
	starting,
	str,
	strWithFont,
	success,
	then,
	watermark,
} from "./lib";

export type Armor = {
	image: Image;
	name: string;
	martial: boolean;
	cost: number;
	def: number;
	mdef: number;
	init: number;
	description: string;
};

const convertDef = (prefix: string) => (s: string) => {
	if (s.startsWith(prefix + " size")) {
		const num = s.slice(10);
		return num === "" ? 0 : Number(num);
	} else if (s.startsWith(prefix + " die")) {
		const num = s.slice(9);
		return num === "" ? 0 : Number(num);
	} else return s === "-" ? 0 : Number(s);
};
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
