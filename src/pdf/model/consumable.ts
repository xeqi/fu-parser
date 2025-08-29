import { Image } from "./common";
import { FUItem } from "../../external/project-fu";

export type Consumable = {
	image: Image;
	name: string;
	description: string;
	ipCost: number;
};

export function consumableToFuItem(data: Consumable, imagePath: string, folderId: string, source: string): FUItem {
	return {
		type: "consumable" as const,
		name: data.name,
		img: imagePath + "/" + data.name + ".png",
		folder: folderId,
		system: {
			ipCost: { value: data.ipCost },
			description: data.description,
			source: { value: source },
		},
	};
}
