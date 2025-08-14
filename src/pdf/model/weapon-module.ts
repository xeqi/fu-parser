import { Accuracy, DamageType, Image, ModuleType, WeaponCategory } from "./common";

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
};
