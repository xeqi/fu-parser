import { Accuracy, DamageType, Distance, Handed, Image, STAT_MAPPING, WeaponCategory } from "./common";
import { FUItem } from "../../external/project-fu";

export type Weapon = {
	image: Image;
	name: string;
	martial: boolean;
	cost: number;
	damage: number;
	accuracy: Accuracy;
	damageType: DamageType;
	hands: Handed;
	melee: Distance;
	category: WeaponCategory;
	description: string;
};

export function weaponToFuItem(data: Weapon, imagePath: string, folderId: string, source: string): FUItem {
	return {
		type: "weapon" as const,
		name: data.name,
		img: imagePath + "/" + data.name + ".png",
		folder: folderId,
		system: {
			isMartial: { value: data.martial },
			description: data.description === "No Quality." ? "" : data.description,
			cost: { value: data.cost },
			attributes: {
				primary: { value: STAT_MAPPING[data.accuracy.primary] },
				secondary: { value: STAT_MAPPING[data.accuracy.secondary] },
			},
			accuracy: { value: data.accuracy.bonus },
			damage: { value: data.damage },
			type: { value: data.melee },
			category: { value: data.category },
			hands: { value: data.hands },
			damageType: { value: data.damageType },
			source: { value: source },
			isBehavior: false,
			weight: { value: 1 },
			isCustomWeapon: { value: false },
		},
	};
}
