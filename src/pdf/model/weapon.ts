import { Accuracy, DamageType, Distance, Handed, Image, WeaponCategory } from "./common";

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
