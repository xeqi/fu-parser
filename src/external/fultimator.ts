export enum Attributes {
	Might = "might",
	Dexterity = "dexterity",
	Insight = "insight",
	Willpower = "will",
}

export interface Weapon {
	cost: number;
	category: string;
	prec: number;
	att1: Attributes;
	att2: Attributes;
	name: string;
	range: "melee" | "distance";
	hands: number;
	damage: number;
	type: Elements;
}

export enum Affinities {
	Resistance = "rs",
	Vulnerability = "vu",
	Absorpbtion = "ab",
	Immune = "im",
	None = "no",
}

export enum Elements {
	Physical = "physical",
	Wind = "wind",
	Bolt = "bolt",
	Dark = "dark",
	Earth = "earth",
	Fire = "fire",
	Ice = "ice",
	Light = "light",
	Poison = "poison",
}

export interface NpcAttributes {
	might: number;
	insight: number;
	will: number;
	dexterity: number;
}

export interface NpcArmor {
	def: number;
	name: string;
	init: number;
	mdefbonus: number;
	cost: number;
	mdef: number;
	defbonus: number;
}

export interface NpcAttack {
	name: string;
	range: "melee" | "distance";
	attr1: Attributes;
	attr2: Attributes;
	type: Elements;
	special: string[];
	extraDamage?: boolean;
}

export interface NpcWeaponAttack {
	extraDamage?: boolean;
	weapon: Weapon;
	name: string;
	special: string[];
	flathit?: string;
	flatdmg?: string;
}

export interface NpcSpell {
	effect?: string;
	target?: string;
	duration?: string;
	name: string;
	range: string;
	type: string | null;
	attr1: Attributes;
	attr2: Attributes;
	mp?: string;
	special: string[];
}

export interface NpcAction {
	name: string;
	effect: string;
}

export interface NpcSpecial {
	name: string;
	effect: string;
}

export interface NpcRareGear {
	name: string;
	effect: string;
}

export interface NpcExtra {
	init?: boolean;
	precision?: boolean;
	hp?: string;
	mp?: string;
	def?: number;
	mDef?: number;
	extrainit?: string;
	magic?: boolean;
}

export interface NpcAffinities {
	physical?: Affinities;
	wind?: Affinities;
	bolt?: Affinities;
	dark?: Affinities;
	earth?: Affinities;
	ice?: Affinities;
	light?: Affinities;
	poison?: Affinities;
	fire?: Affinities;
}

export interface NpcNotes {
	name: string;
	effect: string;
}

export interface Npc {
	id: string;
	uid: string;
	name: string;
	lvl: number;
	attacks: NpcAttack[];
	affinities: NpcAffinities;
	attributes: NpcAttributes;
	species: string;
	villain?: "" | "supreme" | "minor" | "major";
	rank?: "soldier" | "elite" | "champion2" | "champion3" | "champion4" | "champion5" | "companion";

	traits?: string;
	actions?: NpcAction[];
	extra?: NpcExtra;
	spells?: NpcSpell[];
	special?: NpcSpecial[];
	weaponattacks?: NpcWeaponAttack[];
	description?: string;
	armor?: NpcArmor;
	shield?: NpcArmor;
	raregear?: NpcRareGear[];
	label?: string;
	notes?: NpcNotes[];
}
