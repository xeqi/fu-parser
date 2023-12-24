import { Image } from "../lexers/token";
import { Parser, cost, description, eof, fmap, image, kl, kr, many1, seq, starting, str, then } from "./lib";

export type Accessory = { image: Image; name: string; description: string; cost: number };

const accessoryParser: Parser<Accessory> = fmap(
	seq(image, str, cost, description),
	([image, name, cost, description]) => {
		return { image, name, description, cost };
	},
);
export const accessories = kl(kr(starting, many1(accessoryParser)), then(str, eof));
