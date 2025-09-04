import { Image } from "./common";
import { FUItem } from "../../external/project-fu";

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

export function armorToFuItem(data: Armor, imagePath: string, folderId: string, source: string): FUItem {
	return {
		type: "armor" as const,
		name: data.name,
		img: imagePath + "/" + data.name + ".png",
		folder: folderId,
		system: {
			isMartial: { value: data.martial },
			description: data.description === "No Quality." ? "" : data.description,
			cost: { value: data.cost },
			source: { value: source },
			def: { value: data.def },
			mdef: { value: data.mdef },
			init: { value: data.init },
			isBehavior: false,
			weight: { value: 1 },
		},
	};
}
