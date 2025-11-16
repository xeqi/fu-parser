export type Attributes = "might" | "dexterity" | "insight" | "will";

export type WeaponCategory =
	| "Arcane"
	| "Bow"
	| "Flail"
	| "Firearm"
	| "Spear"
	| "spear_category" // Handle the case where the category is "spear_category"
	| "Thrown"
	| "Heavy"
	| "Dagger"
	| "Brawling"
	| "Sword";

export type Weapon = {
	name: string;
	cost: number;
	category: WeaponCategory;
	prec: number;
	att1: Attributes;
	att2: Attributes;
	martial?: boolean;
	range?: "melee" | "distance";
	melee?: boolean;
	ranged?: boolean;
	hands: number;
	damage: number;
	type: Elements;
	quality?: string;
};

export type PCWeapon = {
	name: string;
	category: WeaponCategory;
	cost: number;
	prec: number;
	att1: Attributes;
	att2: Attributes;
	martial: boolean;
	range?: "melee" | "distance";
	melee?: boolean;
	ranged?: boolean;
	hands: number;
	damage: number;
	type: Elements;
	quality: string;
};

export type PCShield = {
	name: string;
	cost: number;
	def: number;
	mdef: number;
	init: number;
	defModifier?: number;
	mDefModifier?: number;
	initModifier?: number;
	martial: boolean;
	quality: string;
};

export type Affinities = "rs" | "vu" | "ab" | "im" | "no";

export type Elements = "physical" | "wind" | "bolt" | "dark" | "earth" | "fire" | "ice" | "light" | "poison";

export type Clocks = {
	name: string;
	sections: number;
};

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
	maxTargets?: number;
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

type StatValue = {
	current: number;
	max: number;
};

type Stats = {
	mp: StatValue;
	ip: StatValue;
	hp: StatValue;
};

export type Player = {
	id: string | number;
	uid: string;
	imgurl?: string;
	name: string;
	lvl: number;
	stats: Stats;
	info: PCInfo;
	affinities?: PCAffinities;
	attributes: PCAttributes;
	classes?: PCClasses[];
	weapons?: PCWeaponAttack[];
	armor?: PCArmor[];
	shields?: PCArmor[];
	accessories?: PCAccessory[];
	notes?: PCNotes[];
	modifiers: PCModifiers;
	quirk?: PCQuirk;
};

export type PCInfo = {
	imgurl?: string;
	pronouns?: string;
	identity?: string;
	theme?: string;
	origin?: string;
	fabulapoints: number;
	exp: number;
	zenit: number;
	description?: string;
	bonds: PCBond[];
};

export type PCBond = {
	name?: string;
	admiration: boolean;
	inferiority: boolean;
	hatred: boolean;
	mistrust: boolean;
	affection: boolean;
	loyality: boolean;
	strength?: number;
};

export type PCAttributes = {
	might: number;
	insight: number;
	willpower: number;
	dexterity: number;
};

export type PCClasses = {
	name: string;
	lvl: number;
	benefits: PCBenefits;
	skills: PCSkills[];
	heroic?: PCHeroicSkills;
	spells?: PCSpells[];
};

export type PCBenefits = {
	hpplus: number;
	mpplus: number;
	ipplus: number;
	martials: PCMartials;
	rituals: PCRituals;
	spellClasses?: SpellClass[];
};

export type PCMartials = {
	shields: boolean;
	ranged: boolean;
	armor: boolean;
	melee: boolean;
};
export type PCRituals = {
	ritualism: boolean;
	arcanism?: boolean;
	chimerism?: boolean;
	elementalism?: boolean;
	entropism?: boolean;
	spiritism?: boolean;
};

type SpellClass =
	| "default"
	| "arcanist"
	| "arcanist-rework"
	| "tinkerer-alchemy"
	| "tinkerer-infusion"
	| "tinkerer-magitech"
	| "gamble"
	| "magichant"
	| "symbol"
	| "dance";

export type PCSkills = {
	skillName: string;
	currentLvl: number;
	maxLvl: number;
	specialSkill?: string;
	description: string;
};

export interface PCHeroicSkills {
	name: string;
	description: string;
}

export type PCSpells = {
	name?: string;
	spellName?: string;
	mp?: number | string;
	maxTargets?: number;
	targetDesc?: string;
	description?: string;
	class?: string;
	duration?: string;
	isOffensive?: boolean;
	isMagisphere?: boolean;
	attr1?: Attributes;
	attr2?: Attributes;
	effect1?: string;
	effect2?: string;
	effect3?: string;
	effect4?: string;
	effect5?: string;
	effect6?: string;
	spellType?: string;
	mergeDesc?: string;
	merge?: string;
	dismissDesc?: string;
	domainDesc?: string;
	domain?: string;
	dismiss?: string;
	pulse?: string;
	pulseDesc?: string;
	tones?: Array<{
		name: string;
		effect?: string;
		customName?: string;
	}>;
	keys?: Array<{
		name: string;
		recovery?: string;
		customName?: string;
		type?: string;
		status?: string;
		attribute?: string;
	}>;
	dances?: Array<{
		name: string;
		effect?: string;
		duration?: string;
		customName?: string;
	}>;
	symbols?: Array<{
		name: string;
		effect?: string;
		customName?: string;
	}>;
};

export type PCWeaponAttack = {
	name: string;
	category: WeaponCategory;
	melee: boolean;
	ranged: boolean;
	type: Elements;
	hands: number;
	att1: Attributes;
	att2: Attributes;
	martial: boolean;
	damageBonus: boolean;
	damageReworkBonus: boolean;
	precBonus: boolean;
	quality: string;
	cost: number;
	damage: number;
	prec: number;
};

export type PCArmor = {
	name: string;
	category: string;
	def: number;
	mdef: number;
	init: number;
	defModifier?: number;
	mDefModifier?: number;
	initModifier?: number;
	quality: string;
	cost: number;
	martial: boolean;
	precModifier?: number;
	magicModifier?: number;
	damageMeleeModifier?: number;
	damageRangedModifier?: number;
};

export type PCAccessory = {
	name: string;
	defModifier?: number;
	mDefModifier?: number;
	initModifier?: number;
	quality: string;
	cost: number;
	precModifier?: number;
	magicModifier?: number;
	damageMeleeModifier?: number;
	damageRangedModifier?: number;
};

export type PCSpell = {
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

export type PCAffinities = {
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

export type PCNotes = {
	name: string;
	description: string;
	clocks?: Clocks[];
};

export type PCModifiers = {
	mdef: number;
	magicPrec: number;
	init: number;
	ip: number;
	hp: number;
	def: number;
	meleePrec: number;
	rangedPrec: number;
	mp: number;
};

export type PCQuirk = {
	effect: string;
	name: string;
	description: string;
};
