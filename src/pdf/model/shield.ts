import { Image } from "./common";
import { FUItem } from "../../external/project-fu";

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

export function shieldToFuItem(data: Shield, imagePath: string, folderId: string, source: string): FUItem {
	return {
		type: "shield" as const,
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
