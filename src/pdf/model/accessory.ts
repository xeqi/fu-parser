import { Image } from "./common";
import { FUItem } from "../../external/project-fu";

export type Accessory = {
	image: Image;
	name: string;
	description: string;
	cost: number;
};

export function accessoryToFuItem(data: Accessory, imagePath: string, folderId: string, source: string): FUItem {
	return {
		type: "accessory" as const,
		name: data.name,
		img: imagePath + "/" + data.name + ".png",
		folder: folderId,
		system: {
			isMartial: { value: false },
			description: data.description,
			cost: { value: data.cost },
			source: { value: source },
			def: { value: 0 },
			mdef: { value: 0 },
			init: { value: 0 },
			isBehavior: false,
			weight: { value: 1 },
		},
	};
}
