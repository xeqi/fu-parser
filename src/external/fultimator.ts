export type Attributes = "might" | "dexterity" | "insight" | "will";

export type Weapon = {
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
};

export type Affinities = "rs" | "vu" | "ab" | "im" | "no";

export type Elements = "physical" | "wind" | "bolt" | "dark" | "earth" | "fire" | "ice" | "light" | "poison";

export type NpcAttributes = {
	might: number;
	insight: number;
	will: number;
	dexterity: number;
};

export type NpcArmor = {
	def: number;
	name: string;
	init: number;
	mdefbonus: number;
	cost: number;
	mdef: number;
	defbonus: number;
};

export type NpcAttack = {
	name: string;
	range: "melee" | "distance";
	attr1: Attributes;
	attr2: Attributes;
	type: Elements;
	special: string[];
	extraDamage?: boolean;
	flatdmg?: string | number;
	flathit?: string | number;
};

export type NpcWeaponAttack = {
	extraDamage?: boolean;
	weapon: Weapon;
	name: string;
	type?: Elements;
	special: string[];
	flathit?: string | number;
	flatdmg?: string | number;
};

export type NpcSpell = {
	effect?: string;
	target?: string;
	duration?: string;
	name: string;
	type: string | null;
	attr1: Attributes;
	attr2: Attributes;
	mp?: string;
	special: string[];
};

export type NpcAction = {
	name: string;
	effect: string;
};

export type NpcSpecial = {
	name: string;
	effect: string;
};

export type NpcRareGear = {
	name: string;
	effect: string;
};

export type NpcExtra = {
	init?: boolean;
	precision?: boolean;
	hp?: string;
	mp?: string;
	def?: number;
	mDef?: number;
	extrainit?: string;
	magic?: boolean;
};

export type NpcAffinities = {
	physical?: Affinities;
	wind?: Affinities;
	bolt?: Affinities;
	dark?: Affinities;
	earth?: Affinities;
	ice?: Affinities;
	light?: Affinities;
	poison?: Affinities;
	fire?: Affinities;
};

export type NpcNotes = {
	name: string;
	effect: string;
};

export type Npc = {
	id: string | number;
	uid: string;
	imgurl?: string;
	name: string;
	lvl: number;
	attacks: NpcAttack[];
	affinities: NpcAffinities;
	attributes: NpcAttributes;
	species: string;
	villain?: "" | "supreme" | "minor" | "major";
	phases?: number | string;
	multipart?: string;
	rank?:
		| "soldier"
		| "elite"
		| "champion1"
		| "champion2"
		| "champion3"
		| "champion4"
		| "champion5"
		| "champion6"
		| "companion";
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
};
