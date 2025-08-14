import { Image } from "./common";

export type Shield = {
	image: Image;
	name: string;
	martial: boolean;
	cost: number;
	def: number;
	mdef: number;
	init: number;
	description: string;
};
