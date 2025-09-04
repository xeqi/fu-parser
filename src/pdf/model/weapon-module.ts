import { Accuracy, DamageType, Image, ModuleType, STAT_MAPPING, WeaponCategory } from "./common";
import { FUItem } from "../../external/project-fu";

export type WeaponModule = {
	image: Image;
	name: string;
	cost: number;
	damage: number;
	accuracy: Accuracy;
	damageType: DamageType;
	moduleType: ModuleType;
	category: WeaponCategory;
	description: string;
	isComplex: boolean;
};

export function weaponModuleToFuItem(data: WeaponModule, imagePath: string, folderId: string, source: string): FUItem {
	return {
		type: "classFeature" as const,
		name: data.name,
		img: imagePath + "/" + data.name + ".png",
		folder: folderId,
		system: {
			featureType: "projectfu.weaponModule" as const,
			source: source,
			data: {
				type: data.moduleType,
				description: data.description,
				accuracy: {
					attr1: STAT_MAPPING[data.accuracy.primary],
					attr2: STAT_MAPPING[data.accuracy.secondary],
					modifier: data.accuracy.bonus,
				},
				damage: {
					type: data.damageType,
					bonus: data.damage,
				},
				category: data.category,
				shield: {
					defense: 2,
					magicDefense: 2,
				},
				complex: data.isComplex,
			},
		},
	};
}
