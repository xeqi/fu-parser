import { Image } from "../lexers/token";
import {
	Parser,
	description,
	eof,
	fmap,
	image,
	kl,
	kr,
	many1,
	matches,
	seq,
	starting,
	str,
	then,
	watermark,
} from "./lib";

export type Consumable = { image: Image; name: string; description: string; ipCost: number };

const consumableParser: Parser<Consumable> = fmap(
	seq(
		image,
		fmap(many1(str), (s) => s.join(" ")),
		fmap(matches(/^[0-9]+$/, "ipCost"), (s) => Number(s)),
		description,
	),
	([image, name, ipCost, description]) => {
		return { image, name, ipCost, description };
	},
);

const header = matches(/^[^.?!]*$/, "header");
export const consumablesPage = kl(kr(starting, many1(then(header, many1(consumableParser)))), seq(str, watermark, eof));
