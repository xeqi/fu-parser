import {
	Parser,
	alt,
	cost,
	dashOrNumber,
	description,
	eof,
	fmap,
	image,
	kl,
	kr,
	many1,
	martial,
	seq,
	starting,
	str,
	success,
	watermark,
} from "./lib";
import { Shield } from "../model/shield";

const def = dashOrNumber("def");
const mdef = dashOrNumber("mdef");
const init = dashOrNumber("initiative");

const shieldParser: Parser<Shield> = fmap(
	seq(image, str, martial, cost, def, mdef, init, description),
	([image, name, martial, cost, def, mdef, init, description]) => {
		return { image, name, martial, cost, def, mdef, init, description };
	},
);

export const shieldPage: Parser<Shield[]> = kl(
	kr(starting, many1(shieldParser)),
	seq(alt(seq(str, str, many1(image)), success(null)), watermark, eof),
);
