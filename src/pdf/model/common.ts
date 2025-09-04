import { Weapon } from "./weapon";
import { Armor } from "./armor";
import { Shield } from "./shield";
import { Accessory } from "./accessory";
import { WeaponModule } from "./weapon-module";
import { ATTR } from "../../external/project-fu";

export type Image = {
	width: number;
	height: number;
};

export type Accuracy = {
	primary: Stat;
	secondary: Stat;
	bonus: number;
};

export type Stat = (typeof STATS)[number];
export const STATS = ["DEX", "MIG", "INS", "WLP"] as const;
export const isStat = (s: string): s is Stat => {
	return (STATS as readonly string[]).includes(s);
};

export type DamageType = (typeof DAMAGE_TYPES)[number];
export const DAMAGE_TYPES = ["physical", "air", "bolt", "dark", "earth", "fire", "ice", "light", "poison"] as const;

export type Distance = (typeof DISTANCES)[number];
export const DISTANCES = ["melee", "ranged"] as const;

export type ModuleType = (typeof MODULE_TYPE)[number];
export const MODULE_TYPE = ["melee", "ranged", "shield"] as const;

export type Handed = (typeof HANDED)[number];
export const HANDED = ["one-handed", "two-handed"] as const;
export type WeaponCategory = (typeof WEAPON_CATEGORIES)[number];
export const WEAPON_CATEGORIES = [
	"arcane",
	"bow",
	"brawling",
	"dagger",
	"firearm",
	"flail",
	"heavy",
	"spear",
	"sword",
	"thrown",
] as const;

export type TypeCode = (typeof TYPE_CODES)[keyof typeof TYPE_CODES];
export const TYPE_CODES = {
	physical: "'",
	air: "a",
	bolt: "b",
	dark: "a",
	earth: "E",
	fire: "f",
	ice: "i",
	light: "l",
	poison: "b",
} as const;

export type Affinity = (typeof AFFINITIES)[number];
export const AFFINITIES = ["VU", "N", "RS", "IM", "AB"] as const;

export type ResistanceMap = Record<DamageType, Affinity>;

export const DIE_SIZES = [6, 8, 10, 12] as const;
export type DieSize = (typeof DIE_SIZES)[number];

export type ItemCategory = (typeof ITEM_CATEGORY)[number];
export const ITEM_CATEGORY = ["WEAPON", "ARMOR", "SHIELD", "ACCESSORY", "WEAPON MODULE"];

export type Item = Weapon | Armor | Shield | Accessory | WeaponModule;

export const STAT_MAPPING: Record<Stat, ATTR> = {
	DEX: "dex",
	MIG: "mig",
	INS: "ins",
	WLP: "wlp",
};

export const AFF_MAPPING: Record<Affinity, number> = {
	VU: -1,
	N: 0,
	RS: 1,
	IM: 2,
	AB: 3,
};
