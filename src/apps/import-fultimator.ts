import { json } from "typia";
import {
	Affinities,
	Attributes,
	Elements,
	Npc,
	NpcArmor,
	Weapon,
	Player,
	PCBond,
	WeaponCategory,
	PCWeapon,
	PCShield,
	PCArmor,
	PCAccessory,
} from "../external/fultimator";
import { ATTR, CATEGORY, FUActor, FUItem, FUActorPC } from "../external/project-fu";
import { DamageType } from "../pdf/parsers/lib";
// import { Accessory } from "../pdf/parsers/accessoryPage";

interface BondInput {
	name: string;
	admInf: "Admiration" | "Inferiority" | "";
	loyMis: "Loyalty" | "Mistrust" | "";
	affHat: "Affection" | "Hatred" | "";
	strength: number;
}

const CATEGORY_MAPPING: Record<WeaponCategory, CATEGORY> = {
	Arcane: "arcane",
	Bow: "bow",
	Flail: "flail",
	Firearm: "firearm",
	spear_category: "spear",
	Thrown: "thrown",
	Heavy: "heavy",
	Dagger: "dagger",
	Brawling: "brawling",
	Sword: "sword",
};

const AFF_MAPPING: Record<Affinities, number> = {
	vu: -1,
	no: 0,
	rs: 1,
	im: 2,
	ab: 3,
};

const STAT_MAPPING: Record<Attributes, ATTR> = {
	dexterity: "dex",
	might: "mig",
	insight: "ins",
	will: "wlp",
};

const ELEMENTS_MAPPING: Record<Elements, DamageType> = {
	physical: "physical",
	wind: "air",
	bolt: "bolt",
	dark: "dark",
	earth: "earth",
	fire: "fire",
	ice: "ice",
	light: "light",
	poison: "poison",
};

const lookupAffinity = (affinity?: Affinities) => {
	return affinity ? AFF_MAPPING[affinity] : 0;
};

const importFultimatorWeapon = async (data: PCWeapon) => {
	const type = data.type;
	const category = data.category;
	const isRanged = data.ranged;
	const payload: FUItem = {
		type: "weapon" as const,
		name: data.name !== "" ? data.name : "Unnamed data",
		system: {
			attributes: {
				primary: { value: STAT_MAPPING[data.att1] },
				secondary: { value: STAT_MAPPING[data.att2] },
			},
			accuracy: { value: data.prec },
			damage: { value: data.damage },
			type: { value: isRanged ? "ranged" : "melee" },
			damageType: { value: ELEMENTS_MAPPING[type] },
			description: "",
			isBehavior: false,
			cost: { value: data.cost },
			weight: { value: 1 },
			quality: { value: data.quality },
			isMartial: { value: data.martial },
			category: { value: CATEGORY_MAPPING[category] },
			hands: { value: data.hands === 1 ? "one-handed" : "two-handed" },
			isCustomWeapon: { value: false },
		},
	};
	const item = await Item.create(payload);
	console.log("Item created:", item);
};

const importFultimatorShield = async (data: PCShield) => {
	const defMod = data.defModifier ?? 0;
	const mDefMod = data.mDefModifier ?? 0;
	const initMod = data.initModifier ?? 0;
	const payload: FUItem = {
		type: "shield" as const,
		name: data.name !== "" ? data.name : "Unnamed data",
		system: {
			description: "",
			cost: { value: data.cost },
			isMartial: { value: data.martial },
			quality: { value: data.quality },
			isEquipped: { value: false, slot: "" },
			def: { value: data.def + defMod },
			mdef: { value: data.mdef + mDefMod },
			init: { value: data.init + initMod },
			isBehavior: false,
			weight: { value: 1 },
		},
	};
	const item = await Item.create(payload);
	console.log("Item created:", item);
};

const importFultimatorArmor = async (data: PCArmor) => {
	const defMod = data.defModifier ?? 0;
	const mDefMod = data.mDefModifier ?? 0;
	const initMod = data.initModifier ?? 0;
	const payload: FUItem = {
		type: "armor" as const,
		name: data.name !== "" ? data.name : "Unnamed Armor",
		system: {
			def: { value: data.def + defMod, attribute: "dex" },
			mdef: { value: data.mdef + mDefMod, attribute: "ins" },
			init: { value: data.init + initMod },
			description: "",
			isBehavior: false,
			cost: { value: data.cost },
			weight: { value: 1 },
			quality: { value: data.quality },
			isMartial: { value: data.martial },
		},
	};
	const item = await Item.create(payload);
	console.log("Armor item created:", item);
};

const importFultimatorAccessory = async (data: PCAccessory) => {
	const defMod = data.defModifier ?? 0;
	const mDefMod = data.mDefModifier ?? 0;
	const initMod = data.initModifier ?? 0;
	const payload: FUItem = {
		type: "shield" as const,
		name: data.name !== "" ? data.name : "Unnamed data",
		system: {
			def: { value: defMod | 0 },
			mdef: { value: mDefMod | 0 },
			init: { value: initMod | 0 },
			description: "",
			isBehavior: false,
			cost: { value: data.cost },
			weight: { value: 1 },
			quality: { value: data.quality },
			isMartial: { value: false },
		},
	};
	const item = await Item.create(payload);
	console.log("Item created:", item);
};

const importFultimatorPC = async (data: Player) => {
	typeof data.id === "number" ? data.id.toString() : data.id;

	const transformBondData = (bonds: PCBond[]): BondInput[] => {
		return bonds.map((bond) => {
			const nonEmptyFieldsCount = [
				bond.admiration,
				bond.inferiority,
				bond.loyality,
				bond.mistrust,
				bond.affection,
				bond.hatred,
			].filter(Boolean).length;

			const calculatedStrength = Math.min(nonEmptyFieldsCount, 4);

			return {
				name: bond.name || "",
				admInf: bond.admiration ? "Admiration" : bond.inferiority ? "Inferiority" : "",
				loyMis: bond.loyality ? "Loyalty" : bond.mistrust ? "Mistrust" : "",
				affHat: bond.affection ? "Affection" : bond.hatred ? "Hatred" : "",
				strength: calculatedStrength,
			};
		});
	};

	const payload: FUActorPC = {
		system: {
			level: { value: data.lvl },
			resources: {
				hp: {
					value: data.stats.hp.current,
					max: 0,
					min: 0,
					bonus: data.modifiers.hp,
				},
				mp: {
					value: data.stats.mp.current,
					max: 0,
					min: 0,
					bonus: data.modifiers.mp,
				},
				ip: {
					value: data.stats.ip.current,
					max: 0,
					min: 0,
					bonus: data.modifiers.ip,
				},
				fp: { value: data.info.fabulapoints },
				zenit: { value: data.info.zenit },
				exp: { value: data.info.exp },
				identity: { name: data.info.identity || "" },
				pronouns: { name: data.info.pronouns || "" },
				theme: { name: data.info.theme || "" },
				origin: { name: data.info.origin || "" },
				bonds: transformBondData(data.info.bonds || []),
			},
			affinities: {
				physical: {
					base: lookupAffinity(data.affinities?.physical),
					current: lookupAffinity(data.affinities?.physical),
					bonus: 0 as const,
				},
				air: {
					base: lookupAffinity(data.affinities?.wind),
					current: lookupAffinity(data.affinities?.wind),
					bonus: 0 as const,
				},
				bolt: {
					base: lookupAffinity(data.affinities?.bolt),
					current: lookupAffinity(data.affinities?.bolt),
					bonus: 0 as const,
				},
				dark: {
					base: lookupAffinity(data.affinities?.dark),
					current: lookupAffinity(data.affinities?.dark),
					bonus: 0 as const,
				},
				earth: {
					base: lookupAffinity(data.affinities?.earth),
					current: lookupAffinity(data.affinities?.earth),
					bonus: 0 as const,
				},
				fire: {
					base: lookupAffinity(data.affinities?.fire),
					current: lookupAffinity(data.affinities?.fire),
					bonus: 0 as const,
				},
				ice: {
					base: lookupAffinity(data.affinities?.ice),
					current: lookupAffinity(data.affinities?.ice),
					bonus: 0 as const,
				},
				light: {
					base: lookupAffinity(data.affinities?.light),
					current: lookupAffinity(data.affinities?.light),
					bonus: 0 as const,
				},
				poison: {
					base: lookupAffinity(data.affinities?.poison),
					current: lookupAffinity(data.affinities?.poison),
					bonus: 0 as const,
				},
			},
			attributes: {
				dex: { base: data.attributes.dexterity, current: data.attributes.dexterity, bonus: 0 as const },
				ins: { base: data.attributes.insight, current: data.attributes.insight, bonus: 0 as const },
				mig: { base: data.attributes.might, current: data.attributes.might, bonus: 0 as const },
				wlp: { base: data.attributes.willpower, current: data.attributes.willpower, bonus: 0 as const },
			},
			derived: {
				init: {
					value: 0,
					bonus: data.modifiers.init,
				},
				def: {
					value: 0,
					bonus: data.modifiers.def,
				},
				mdef: {
					value: 0,
					bonus: data.modifiers.mdef,
				},
			},
			bonuses: {
				accuracy: {
					accuracyCheck: 0,
					accuracyMelee: data.modifiers.meleePrec,
					accuracyRanged: data.modifiers.rangedPrec,
					magicCheck: data.modifiers.magicPrec,
				},
				damage: {
					melee: 0,
					ranged: 0,
					spell: 0,
				},
			},
			description: data.info.description || "",
		},
		type: "character",
		name: data.name != "" ? data.name : "Unnamed NPC",
	};

	// Extracted constants for mapped items
	const classItems = (data.classes || []).map((cls): FUItem => {
		return {
			name: cls.name !== "" ? cls.name : "Unnamed Class",
			system: {
				level: { value: cls.lvl },
				benefits: {
					resources: {
						hp: { value: cls.benefits.hpplus },
						mp: { value: cls.benefits.mpplus },
						ip: { value: cls.benefits.ipplus },
					},
					martials: {
						melee: { value: cls.benefits.martials.melee },
						ranged: { value: cls.benefits.martials.ranged },
						armor: { value: cls.benefits.martials.armor },
						shields: { value: cls.benefits.martials.shields },
					},
					rituals: {
						arcanism: { value: cls.benefits.rituals.arcanism },
						chimerism: { value: cls.benefits.rituals.chimerism },
						elementalism: { value: cls.benefits.rituals.elementalism },
						entropism: { value: cls.benefits.rituals.entropism },
						ritualism: { value: cls.benefits.rituals.ritualism },
						spiritism: { value: cls.benefits.rituals.spiritism },
					},
				},
				description: "",
			},
			type: "class" as const,
		};
	});

	const skillItems = (data.classes || []).flatMap((cls) =>
		(cls.skills || [])
			.filter((skill) => skill.currentLvl > 0)
			.map(
				(skill): FUItem => ({
					type: "skill",
					name: skill.skillName !== "" ? skill.skillName : "Unnamed Skill",
					system: {
						description: skill.description,
						level: { value: skill.currentLvl, max: skill.maxLvl },
					},
				}),
			),
	);

	const heroicItems = (data.classes || []).flatMap((cls) => {
		if (cls.heroic && cls.lvl >= 10) {
			return [
				{
					type: "heroic",
					name: cls.heroic.name !== "" ? cls.heroic.name : "Unnamed Heroic Skill",
					system: {
						subtype: { value: "skill" },
						class: { value: cls.name },
						description: cls.heroic.description,
					},
				},
			];
		}
		return [];
	});

	const spellItems = (data.classes || []).flatMap((cls) =>
		(cls.spells || []).map(
			(pcSpell): FUItem => ({
				type: "spell" as const,
				name: pcSpell.name != "" ? pcSpell.name : "Unnamed Spell",
				system: {
					mpCost: { value: pcSpell.mp.toString() },
					maxTargets: { value: pcSpell.maxTargets.toString() },
					target: { value: pcSpell.targetDesc.toString() },
					duration: { value: pcSpell.duration },
					isOffensive: { value: pcSpell.isOffensive == true },
					hasRoll: { value: pcSpell.isOffensive == true },
					rollInfo:
						pcSpell.isOffensive == true
							? {
									attributes: {
										primary: { value: STAT_MAPPING[pcSpell.attr1] },
										secondary: { value: STAT_MAPPING[pcSpell.attr2] },
									},
									accuracy: {
										value: 0,
									},
								}
							: undefined,
					description: pcSpell.description,
					isBehavior: false,
					weight: { value: 1 },
					quality: { value: "" },
				},
			}),
		),
	);

	const noteItems = (data.notes || []).flatMap((note): FUItem[] => {
		return [
			{
				name: note.name !== "" ? note.name : "Unnamed Note",
				system: {
					description: note.description,
					isBehavior: false,
					weight: { value: 1 },
					hasClock: { value: false },
					hasRoll: { value: false },
				},
				type: "miscAbility" as const,
			},
			...(note.clocks || []).map((clock) => ({
				name: clock.name !== "" ? `${clock.name}` : "Unnamed Clock",
				system: {
					description: clock.name,
					isBehavior: false,
					isFavored: { value: true },
					weight: { value: 1 },
					hasClock: { value: true },
					progress: {
						current: 0,
						step: 0,
						max: clock.sections || 0,
					},
					hasRoll: { value: false },
				},
				type: "miscAbility" as const,
			})),
		];
	});

	const weaponItems = (data.weapons || []).map((weapon): FUItem => {
		const type = weapon.type;
		const category = weapon.category;

		return {
			type: "weapon" as const,
			name: weapon.name !== "" ? weapon.name : "Unnamed Weapon",
			system: {
				attributes: {
					primary: { value: STAT_MAPPING[weapon.att1] },
					secondary: { value: STAT_MAPPING[weapon.att2] },
				},
				accuracy: { value: weapon.prec },
				damage: { value: weapon.damage },
				type: { value: weapon.ranged ? "ranged" : "melee" },
				damageType: { value: ELEMENTS_MAPPING[type] },
				description: "",
				isBehavior: false,
				cost: { value: weapon.cost },
				weight: { value: 1 },
				quality: { value: weapon.quality },
				isMartial: { value: weapon.martial },
				category: { value: CATEGORY_MAPPING[category] },
				hands: { value: weapon.hands === 1 ? "one-handed" : "two-handed" },
				isCustomWeapon: { value: false },
			},
		};
	});

	const armorItems = (data.armor || []).map((armor): FUItem => {
		const defMod = armor.defModifier ?? 0;
		const mDefMod = armor.mDefModifier ?? 0;
		const initMod = armor.initModifier ?? 0;
		return {
			type: "armor" as const,
			name: armor.name !== "" ? armor.name : "Unnamed Armor",
			system: {
				def: { value: armor.def + defMod },
				mdef: { value: armor.mdef + mDefMod },
				init: { value: armor.init + initMod },
				description: "",
				isBehavior: false,
				cost: { value: armor.cost },
				weight: { value: 1 },
				quality: { value: armor.quality },
				isMartial: { value: armor.martial },
			},
		};
	});

	const shieldItems = (data.shields || []).map((shield): FUItem => {
		const defMod = shield.defModifier ?? 0;
		const mDefMod = shield.mDefModifier ?? 0;
		const initMod = shield.initModifier ?? 0;
		return {
			type: "shield" as const,
			name: shield.name !== "" ? shield.name : "Unnamed Shield",
			system: {
				def: { value: shield.def + defMod },
				mdef: { value: shield.mdef + mDefMod },
				init: { value: shield.init + initMod },
				description: "",
				isBehavior: false,
				cost: { value: shield.cost },
				weight: { value: 1 },
				quality: { value: shield.quality },
				isMartial: { value: shield.martial },
			},
		};
	});

	const accessoryItems = (data.accessories || []).map((accessory): FUItem => {
		const defMod = accessory.defModifier ?? 0;
		const mDefMod = accessory.mDefModifier ?? 0;
		const initMod = accessory.initModifier ?? 0;
		return {
			type: "accessory" as const,
			name: accessory.name !== "" ? accessory.name : "Unnamed accessory",
			system: {
				def: { value: defMod },
				mdef: { value: mDefMod },
				init: { value: initMod },
				description: "",
				isBehavior: false,
				cost: { value: accessory.cost },
				weight: { value: 1 },
				quality: { value: accessory.quality },
				isMartial: { value: false },
			},
		};
	});

	const quirkItems: FUItem[] = (Array.isArray(data.quirk) ? data.quirk : []).map((quirk) => ({
		type: "optionalFeature" as const,
		name: quirk.name !== "" ? quirk.name : "Unnamed quirk",
		system: {
			optionalType: "projectfu.quirk",
			data: { description: (quirk.description || "") + "<br>" + (quirk.effect || "") },
		},
	}));

	// Create the actor and add items
	const actor = await Actor.create(payload);
	await actor.createEmbeddedDocuments("Item", [
		...weaponItems,
		...armorItems,
		...shieldItems,
		...accessoryItems,
		...classItems,
		...skillItems,
		...heroicItems,
		...spellItems,
		...noteItems,
		...quirkItems,
	]);

	await actor.update({
		"system.resources.hp.value": actor.system.resources.hp.max,
		"system.resources.mp.value": actor.system.resources.mp.max,
	});
};

const importFultimatorNPC = async (data: Npc) => {
	typeof data.id === "number" ? data.id.toString() : data.id;
	const phases = typeof data.phases === "string" ? Number(data.phases) : data.phases;
	let mainHandFree = true;
	let offHandFree = true;

	const equipment = [data.armor, data.shield, ...(data.weaponattacks?.map((e) => e.weapon) || [])]
		.filter((e): e is NpcArmor | Weapon => e != null)
		.map((e) => {
			const item = game.items.find((f) => f.name.toLowerCase() === e.name.toLowerCase()) as FUItem;
			if (item) {
				const data = duplicate(item);
				const itemType = data.type;
				if (itemType === "weapon") {
					if (mainHandFree) {
						data.system.isEquipped = { slot: "mainHand", value: true };
						mainHandFree = false;
						if (data.system.hands.value == "two-handed") {
							offHandFree = false;
						}
					} else {
						if (offHandFree && data.system.hands.value == "one-handed") {
							data.system.isEquipped = { slot: "offHand", value: true };
							offHandFree = false;
						}
					}
				} else if (itemType === "shield") {
					if (offHandFree) {
						data.system.isEquipped = { slot: "offHand", value: true };
						offHandFree = false;
					}
				} else if (itemType == "accessory" || itemType == "armor") {
					data.system.isEquipped = { slot: itemType, value: true };
				}
				return data;
			} else {
				console.log("Not Found", e);
			}
		})
		.filter((d): d is FUItem => d !== undefined);

	const payload: FUActor = {
		system: {
			level: { value: data.lvl },
			resources: {
				hp: {
					value: 0,
					max: 0,
					min: 0,
					bonus: data.extra && data.extra.hp ? Number(data.extra.hp) : 0,
				},
				mp: {
					value: 0,
					max: 0,
					min: 0,
					bonus: data.extra && data.extra.mp ? Number(data.extra.mp) : 0,
				},
				ip: { value: 6, max: 6, min: 0 },
				fp: { value: 3 },
			},
			affinities: {
				physical: {
					base: lookupAffinity(data.affinities.physical),
					current: lookupAffinity(data.affinities.physical),
					bonus: 0 as const,
				},
				air: {
					base: lookupAffinity(data.affinities.wind),
					current: lookupAffinity(data.affinities.wind),
					bonus: 0 as const,
				},
				bolt: {
					base: lookupAffinity(data.affinities.bolt),
					current: lookupAffinity(data.affinities.bolt),
					bonus: 0 as const,
				},
				dark: {
					base: lookupAffinity(data.affinities.dark),
					current: lookupAffinity(data.affinities.dark),
					bonus: 0 as const,
				},
				earth: {
					base: lookupAffinity(data.affinities.earth),
					current: lookupAffinity(data.affinities.earth),
					bonus: 0 as const,
				},
				fire: {
					base: lookupAffinity(data.affinities.fire),
					current: lookupAffinity(data.affinities.fire),
					bonus: 0 as const,
				},
				ice: {
					base: lookupAffinity(data.affinities.ice),
					current: lookupAffinity(data.affinities.ice),
					bonus: 0 as const,
				},
				light: {
					base: lookupAffinity(data.affinities.light),
					current: lookupAffinity(data.affinities.light),
					bonus: 0 as const,
				},
				poison: {
					base: lookupAffinity(data.affinities.poison),
					current: lookupAffinity(data.affinities.poison),
					bonus: 0 as const,
				},
			},
			attributes: {
				dex: { base: data.attributes.dexterity, current: data.attributes.dexterity, bonus: 0 as const },
				ins: { base: data.attributes.insight, current: data.attributes.insight, bonus: 0 as const },
				mig: { base: data.attributes.might, current: data.attributes.might, bonus: 0 as const },
				wlp: { base: data.attributes.will, current: data.attributes.will, bonus: 0 as const },
			},
			derived: {
				init: {
					value: 0,
					bonus:
						(data.extra && data.extra.init ? 4 : 0) +
						(data.extra && data.extra?.extrainit ? Number(data.extra.extrainit) : 0),
				},
				def: { value: 0, bonus: (data.extra && data.extra.def) || 0 },
				mdef: { value: 0, bonus: (data.extra && data.extra.mDef) || 0 },
				accuracy: { value: 0, bonus: data.extra && data.extra.precision ? 3 : 0 },
				magic: { value: 0, bonus: data.extra && data.extra.magic ? 3 : 0 },
			},
			traits: { value: data.traits || "" },
			species: { value: data.species.toLowerCase() },
			useEquipment: { value: equipment.length != 0 },
			villain: { value: data.villain || "" },
			phases: { value: phases || 0 },
			multipart: { value: data.multipart || "" },
			isElite: { value: data.rank == "elite" },
			isChampion: { value: data.rank && /champion/.test(data.rank) ? Number(data.rank.slice(-1)) : 1 },
			isCompanion: { value: data.rank == "companion" },
			study: { value: 0 as const },
			description: data.description || "",
		},
		type: "npc",
		name: data.name != "" ? data.name : "Unnamed NPC",
	};

	const actor = await Actor.create(payload);

	const attackItems = data.attacks.map((attack): FUItem => {
		return {
			type: "basic" as const,
			name: attack.name != "" ? attack.name : "Unnamed Attack",
			system: {
				attributes: {
					primary: { value: STAT_MAPPING[attack.attr1] },
					secondary: { value: STAT_MAPPING[attack.attr2] },
				},
				accuracy: {
					value:
						Math.floor(data.lvl / 10) +
						(data.rank == "companion" ? data.lvl || 1 : 0) +
						(attack.flathit ? Number(attack.flathit) : 0),
				},
				damage: {
					value:
						Math.floor(data.lvl / 20) * 5 +
						5 +
						(attack.extraDamage ? 5 : 0) +
						(data.rank == "companion" ? data.lvl || 1 : 0) +
						(attack.flatdmg ? Number(attack.flatdmg) : 0),
				},
				type: { value: attack.range == "distance" ? "ranged" : "melee" },
				damageType: { value: ELEMENTS_MAPPING[attack.type] },
				quality: { value: attack.special.join(" ") },
				isBehavior: false,
				weight: { value: 1 },
				description: "",
			},
		};
	});

	const weaponAttackItems = (data.weaponattacks || []).map((attack): FUItem => {
		const type = attack.type ?? attack.weapon.type ?? "physical";
		return {
			type: "basic" as const,
			name: attack.name != "" ? attack.name : "Unnamed Weapon Attack",
			system: {
				attributes: {
					primary: { value: STAT_MAPPING[attack.weapon.att1] },
					secondary: { value: STAT_MAPPING[attack.weapon.att2] },
				},
				accuracy: {
					value:
						Math.floor(data.lvl / 10) +
						attack.weapon.prec +
						(data.rank == "companion" ? data.lvl || 1 : 0) +
						(attack.flathit ? Number(attack.flathit) : 0),
				},
				damage: {
					value:
						Math.floor(data.lvl / 20) * 5 +
						attack.weapon.damage +
						(attack.extraDamage ? 5 : 0) +
						(attack.flatdmg ? Number(attack.flatdmg) : 0),
				},
				type: { value: attack.weapon.range == "distance" ? "ranged" : "melee" },
				damageType: { value: ELEMENTS_MAPPING[type] },
				description: "",
				isBehavior: false,
				weight: { value: 1 },
				quality: { value: attack.special.join(" ") },
			},
		};
	});

	const spellItems = (data.spells || []).map((spell) => {
		return {
			type: "spell" as const,
			name: spell.name != "" ? spell.name : "Unnamed Spell",
			system: {
				mpCost: { value: spell.mp },
				target: { value: spell.target },
				duration: { value: spell.duration },
				isOffensive: { value: spell.type == "offensive" },
				hasRoll: { value: spell.type == "offensive" },
				rollInfo:
					spell.type == "offensive"
						? {
								attributes: {
									primary: { value: STAT_MAPPING[spell.attr1] },
									secondary: { value: STAT_MAPPING[spell.attr2] },
								},
								accuracy: {
									value: Math.floor(data.lvl / 10) + (data.rank == "companion" ? data.lvl || 1 : 0),
								},
							}
						: undefined,
				description: spell.effect,
				isBehavior: false,
				weight: { value: 1 },
				quality: { value: "" },
			},
		};
	});

	const otherActionItems = (data.actions || []).map((oa): FUItem => {
		return {
			name: oa.name != "" ? oa.name : "Unnamed Other Action",
			system: {
				description: oa.effect,
				isBehavior: false,
				weight: { value: 1 },
				hasClock: { value: false },
				hasRoll: { value: false },
			},
			type: "miscAbility" as const,
		};
	});

	const specialRuleItems = (data.special || []).map((sr): FUItem => {
		return {
			name: sr.name != "" ? sr.name : "Unnamed Special Rule",
			system: {
				description: sr.effect,
				isBehavior: false,
				weight: { value: 1 },
				hasClock: { value: false },
			},
			type: "rule" as const,
		};
	});

	const rareGearItems = (data.raregear || []).map((sr): FUItem => {
		return {
			name: sr.name != "" ? sr.name : "Unnamed Rare Gear",
			system: {
				description: sr.effect,
				isBehavior: false,
				weight: { value: 1 },
				hasClock: { value: false },
			},
			type: "rule" as const,
		};
	});

	const noteItems = (data.notes || []).map((sr): FUItem => {
		return {
			name: sr.name != "" ? sr.name : "Unnamed Note",
			system: {
				description: sr.effect,
				isBehavior: false,
				weight: { value: 1 },
				hasClock: { value: false },
			},
			type: "rule" as const,
		};
	});

	await actor.createEmbeddedDocuments("Item", [
		...attackItems,
		...weaponAttackItems,
		...spellItems,
		...otherActionItems,
		...specialRuleItems,
		...rareGearItems,
		...noteItems,
	]);

	await actor.createEmbeddedDocuments("Item", equipment);

	await actor.update({
		"system.resources.hp.value": actor.system.resources.hp.max,
		"system.resources.mp.value": actor.system.resources.mp.max,
	});
};

// Define DataType as an enum
enum DataType {
	Npc = "npc",
	Pc = "pc",
	Class = "class",
	PCWeapon = "weapon",
	PCArmor = "armor",
	PCShield = "shield",
	PCAccessory = "accessory",
	Arcana = "arcana",
}

type FultimatorSubmissionData = {
	text: string;
};

type FultimatorImportData = FultimatorSubmissionData & {
	parse?: Npc | Player | PCWeapon | PCShield | PCArmor | PCAccessory;
	error?: string;
	inProgress: boolean;
	dataType?: DataType;
};

export class FultimatorImportApplication extends FormApplication<FultimatorImportData> {
	async _updateObject<T extends FultimatorSubmissionData>(_e: Event, data: T) {
		if (data.text != this.object.text) {
			delete this.object.error;
			this.object.text = data.text;

			// Determine dataType from text using regex
			this.object.dataType = this.detectDataType(data.text);

			try {
				switch (this.object.dataType) {
					case DataType.Npc:
						this.object.parse = json.assertParse<Npc>(this.object.text);
						break;
					case DataType.Pc:
						this.object.parse = json.assertParse<Player>(this.object.text);
						break;
					case DataType.PCWeapon:
						this.object.parse = json.assertParse<PCWeapon>(this.object.text);
						break;
					case DataType.PCShield:
						this.object.parse = json.assertParse<PCShield>(this.object.text);
						break;
					case DataType.PCArmor:
						this.object.parse = json.assertParse<PCArmor>(this.object.text);
						break;
					case DataType.PCAccessory:
						this.object.parse = json.assertParse<PCAccessory>(this.object.text);
						break;
				}
			} catch (e) {
				this.object.error = e instanceof Error ? e.message : String(e);
			}
		}
		this.render();
	}

	detectDataType(text: string): DataType | undefined {
		if (/"dataType"\s*:\s*"npc"/i.test(text)) return DataType.Npc;
		if (/"dataType"\s*:\s*"pc"/i.test(text)) return DataType.Pc;
		if (/"dataType"\s*:\s*"weapon"/i.test(text)) return DataType.PCWeapon;
		if (/"dataType"\s*:\s*"shield"/i.test(text)) return DataType.PCShield;
		if (/"dataType"\s*:\s*"armor"/i.test(text)) return DataType.PCArmor;
		if (/"dataType"\s*:\s*"accessory"/i.test(text)) return DataType.PCAccessory;
		return undefined;
	}

	async getData(): Promise<FultimatorImportData & { disabled: boolean }> {
		const { text, error, inProgress, dataType } = this.object;
		return {
			...this.object,
			disabled: !text || !!error || inProgress,
			dataType,
		};
	}

	get template(): string {
		return "modules/fu-parser/templates/import-fultimator.hbs";
	}

	activateListeners(html: JQuery): void {
		super.activateListeners(html);
		html.find("#sub").on("click", async (e) => {
			e.preventDefault();
			this.object.inProgress = true;
			this.render();
			try {
				if (this.object.parse) {
					switch (this.object.dataType) {
						case DataType.Npc:
							await importFultimatorNPC(this.object.parse as Npc);
							break;
						case DataType.Pc:
							await importFultimatorPC(this.object.parse as Player);
							break;
						case DataType.PCWeapon:
							await importFultimatorWeapon(this.object.parse as PCWeapon);
							break;
						case DataType.PCShield:
							await importFultimatorShield(this.object.parse as PCShield);
							break;
						case DataType.PCArmor:
							await importFultimatorArmor(this.object.parse as PCArmor);
							break;
						case DataType.PCAccessory:
							await importFultimatorAccessory(this.object.parse as PCAccessory);
							break;
					}
				}
			} finally {
				this.object.inProgress = false;
				this.close();
			}
		});
	}
}
