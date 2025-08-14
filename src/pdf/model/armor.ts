import { Image } from "./common";

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

export const convertDef = (prefix: string) => (s: string) => {
	if (s.startsWith(prefix + " size")) {
		const num = s.slice(10);
		return num === "" ? 0 : Number(num);
	} else if (s.startsWith(prefix + " die")) {
		const num = s.slice(9);
		return num === "" ? 0 : Number(num);
	} else return s === "-" ? 0 : Number(s);
};
