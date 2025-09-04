import { Parser, cost, description, eof, fmap, image, kl, kr, many1, seq, starting, str, then, watermark } from "./lib";
import { Accessory } from "../model/accessory";

const accessoryParser: Parser<Accessory> = fmap(
	seq(image, str, cost, description),
	([image, name, cost, description]) => {
		return { image, name, description, cost };
	},
);
export const accessories = kl(kr(starting, many1(accessoryParser)), then(watermark, eof));
