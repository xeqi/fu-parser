import { Actor, Item, getFolder, saveImage } from "./foundry";
import { Accessory } from "./parsers/accessoryPage";
import { Armor } from "./parsers/armorPage";
import { Beast } from "./parsers/beastiaryPage";
import { Consumable } from "./parsers/consumablePage";
import { Stat } from "./parsers/lib";
import { Shield } from "./parsers/shieldPage";
import { Weapon } from "./parsers/weaponPage";

type ATTR = "mig" | "wlp" | "dex" | "ins";
type DamageType = "physical" | "air" | "bolt" | "dark" | "earth" | "fire" | "ice" | "light" | "poison";

type Base = {
	description: string;
};
type SystemItem = {
	cost: { value: number };
};
type Defensive = {
	def: { value: number };
	mdef: { value: number };
	init: { value: number };
};

type Equippable = {
	isMartial: { value: boolean };
	quality?: { value: string };
	isEquipped?: { value: boolean; slot: string };
};

type Weaponize = {
	attributes: {
		primary: { value: ATTR };
		secondary: { value: ATTR };
	};
	accuracy: { value: number };
	damage: { value: number };
	type: { value: "melee" | "ranged" };
	category: {
		value: "arcane" | "bow" | "brawling" | "dagger" | "firearm" | "flail" | "heavy" | "spear" | "sword" | "thrown";
	};
	hands: { value: "one-handed" | "two-handed" };
	damageType: { value: DamageType };
};

type RollInfo = {
	useWeapon?: {
		accuracy: { value: boolean };
		damage: { value: boolean };
		hrZero: { value: boolean };
	};
	attributes?: {
		primary: { value: ATTR };
		secondary: { value: ATTR };
	};
	accuracy?: { value: number };
	damage?: {
		hasDamage: { value: boolean };
		value: number;
		type: { value: DamageType };
	};
};

type HasBehavior = {
	isBehavior: boolean;
	weight: { value: number };
};

type HasProgress = {
	hasClock: { value: boolean };
	progress?: { current: number; step: number; max: number };
};

export type FUItem = Item &
	(
		| {
				type: "weapon";
				system: Base &
					SystemItem &
					Equippable &
					Weaponize &
					HasBehavior & {
						isCustomWeapon: { value: boolean };
					};
		  }
		| {
				type: "armor" | "accessory" | "shield";
				system: Base & SystemItem & Equippable & Defensive & HasBehavior;
		  }
		| {
				type: "consumable";
				system: Base & { ipCost: { value: number } };
		  }
		| {
				type: "basic";
				system: Base &
					HasBehavior & {
						attributes: {
							primary: { value: ATTR };
							secondary: { value: ATTR };
						};
						accuracy: { value: number };
						damage: { value: number };
						type: { value: "melee" | "ranged" };

						damageType: {
							value: DamageType | null;
						};
						quality: { value: "" };
					};
		  }
		| {
				type: "spell";
				system: Base &
					RollInfo &
					HasBehavior & {
						mpCost: { value: string };
						target: { value: string };
						duration: { value: string };
						isOffensive: { value: boolean };
						quality: { value: string };
					};
		  }
		| {
				type: "miscAbility";
				system: Base & RollInfo & HasBehavior & HasProgress;
		  }
		| {
				type: "rule";
				system: Base & HasBehavior & HasProgress;
		  }
	);

export type FUActor = Actor & {
	system: {
		level: { value: number };
		resources: {
			hp: { value: number; min: number; max: number; bonus: number };
			mp: { value: number; min: number; max: number; bonus: number };
		};
		affinities: {
			phys: { base: number; current: number; bonus: 0 };
			air: { base: number; current: number; bonus: 0 };
			bolt: { base: number; current: number; bonus: 0 };
			dark: { base: number; current: number; bonus: 0 };
			earth: { base: number; current: number; bonus: 0 };
			fire: { base: number; current: number; bonus: 0 };
			ice: { base: number; current: number; bonus: 0 };
			light: { base: number; current: number; bonus: 0 };
			poison: { base: number; current: number; bonus: 0 };
		};
		attributes: {
			dex: { base: number; current: number; bonus: 0 };
			ins: { base: number; current: number; bonus: 0 };
			mig: { base: number; current: number; bonus: 0 };
			wlp: { base: number; current: number; bonus: 0 };
		};
		derived: {
			init: { value: number; bonus: number };
			def: { value: number; bonus: number };
			mdef: { value: number; bonus: number };
		};
	} & {
		resources: {
			ip: { value: number; min: number; max: number };
			fp: { value: number };
		};
		traits: { value: string };
		species: { value: string };
		villain: { value: "" };
		isElite: { value: false };
		isChampion: { value: 1 };
		isCompanion: { value: false };
		useEquipment: { value: boolean };
		study: { value: 0 };
	};
};

export const AFF_MAPPING = {
	VU: -1,
	N: 0,
	RS: 1,
	IM: 2,
	AB: 3,
};

export const saveConsumables = async (
	categories: [string, Consumable[]][],
	pageNum: number,
	folderNames: readonly string[],
	imagePath: string,
) => {
	for (const [category, consumables] of categories) {
		const folder = await getFolder([...folderNames, category], "Item");
		if (folder) {
			for (const data of consumables) {
				await saveImage(data.image, data.name + ".png", imagePath);
				const payload = {
					type: "consumable" as const,
					name: data.name,
					img: imagePath + "/" + data.name + ".png",
					folder: folder._id,
					system: {
						ipCost: { value: data.ipCost },
						description: data.description,
						source: { value: pageNum - 2 },
					},
				};
				await Item.create(payload);
			}
		}
	}
};

const convertStat = (s: Stat) => {
	switch (s) {
		case "DEX":
			return "dex" as const;
		case "MIG":
			return "mig" as const;
		case "INS":
			return "ins" as const;
		case "WLP":
			return "wlp" as const;
	}
};

export const saveWeapons = async (
	weapons: Weapon[],
	pageNum: number,
	folderNames: readonly string[],
	imagePath: string,
) => {
	const folder = await getFolder(folderNames, "Item");
	if (folder) {
		for (const data of weapons) {
			const saved = await saveImage(data.image, data.name + ".png", imagePath);
			if (saved && Object.keys(saved).length != 0) {
				const payload = {
					type: "weapon" as const,
					name: data.name,
					img: imagePath + "/" + data.name + ".png",
					folder: folder._id,
					system: {
						isMartial: { value: data.martial },
						description: data.description === "No Quality." ? "" : data.description,
						cost: { value: data.cost },
						attributes: {
							primary: { value: convertStat(data.accuracy.primary) },
							secondary: { value: convertStat(data.accuracy.secondary) },
						},
						accuracy: { value: data.accuracy.bonus },
						damage: { value: data.damage },
						type: { value: data.melee },
						category: { value: data.category },
						hands: { value: data.hands },
						damageType: { value: data.damageType },
						source: { value: pageNum - 2 },
						isBehavior: false,
						weight: { value: 1 },
						isCustomWeapon: { value: false },
					},
				};
				await Item.create(payload);
			}
		}
	}
};

export const saveArmors = async (
	armors: Armor[],
	pageNum: number,
	folderNames: readonly string[],
	imagePath: string,
) => {
	const folder = await getFolder(folderNames, "Item");
	if (folder) {
		for (const data of armors) {
			await saveImage(data.image, data.name + ".png", imagePath);
			const payload = {
				type: "armor" as const,
				name: data.name,
				img: imagePath + "/" + data.name + ".png",
				folder: folder._id,
				system: {
					isMartial: { value: data.martial },
					description: data.description === "No Quality." ? "" : data.description,
					cost: { value: data.cost },
					source: { value: pageNum - 2 },
					def: { value: data.def },
					mdef: { value: data.mdef },
					init: { value: data.init },
					isBehavior: false,
					weight: { value: 1 },
				},
			};
			await Item.create(payload);
		}
	}
};

export const saveAccessories = async (
	accessories: Accessory[],
	pageNum: number,
	folderNames: readonly string[],
	imagePath: string,
) => {
	for (const data of accessories) {
		const folder = await getFolder(folderNames, "Item");
		if (folder) {
			await saveImage(data.image, data.name + ".png", imagePath);
			const payload = {
				type: "accessory" as const,
				name: data.name,
				img: imagePath + "/" + data.name + ".png",
				folder: folder._id,
				system: {
					isMartial: { value: false },
					description: data.description,
					cost: { value: data.cost },
					source: { value: pageNum - 2 },
					def: { value: 0 },
					mdef: { value: 0 },
					init: { value: 0 },
					isBehavior: false,
					weight: { value: 1 },
				},
			};
			await Item.create(payload);
		}
	}
};

export const saveShields = async (
	shields: Shield[],
	pageNum: number,
	folderNames: readonly string[],
	imagePath: string,
) => {
	const folder = await getFolder(folderNames, "Item");
	if (folder) {
		for (const data of shields) {
			await saveImage(data.image, data.name + ".png", imagePath);
			const payload = {
				type: "shield" as const,
				name: data.name,
				img: imagePath + "/" + data.name + ".png",
				folder: folder._id,
				system: {
					isMartial: { value: data.martial },
					description: data.description === "No Quality." ? "" : data.description,
					cost: { value: data.cost },
					source: { value: pageNum - 2 },
					def: { value: data.def },
					mdef: { value: data.mdef },
					init: { value: data.init },
					isBehavior: false,
					weight: { value: 1 },
				},
			};
			await Item.create(payload);
		}
	}
};

export const saveBeasts = async (
	beasts: Beast[],
	pageNum: number,
	folderNames: readonly string[],
	imagePath: string,
) => {
	for (const b of beasts) {
		const folder = await getFolder([...folderNames, b.type], "Actor");
		if (folder) {
			let mainHandFree = true;
			let offHandFree = true;

			const equipment = (b.equipment || [])
				.map((e) => {
					const item = game.items.find((f) => f.name.toLowerCase() === e.toLowerCase()) as FUItem;
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
								if (offHandFree) {
									if (data.system.hands.value == "one-handed") {
										data.system.isEquipped = { slot: "offHand", value: true };
										offHandFree = false;
									}
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
			const initBonus =
				b.attributes.init -
				equipment.reduce(
					(acc, i) =>
						(i.type == "armor" || i.type == "accessory" || i.type == "shield") && i.system.isEquipped
							? i.system.init.value
							: 0,
					0,
				) -
				(b.attributes.dex + b.attributes.ins) / 2;
			const payload = {
				system: {
					description: b.description,
					level: { value: b.level },
					resources: {
						hp: { value: b.attributes.maxHp, max: b.attributes.maxHp, min: 0, bonus: 0 },
						mp: { value: b.attributes.maxMp, max: b.attributes.maxMp, min: 0, bonus: 0 },
						ip: { value: 0, max: 0, min: 0, bonus: 0 },
						fp: { value: 0, max: 0, min: 0, bonus: 0 },
					},
					affinities: {
						phys: {
							base: AFF_MAPPING[b.resists.physical],
							current: AFF_MAPPING[b.resists.physical],
							bonus: 0 as const,
						},
						air: {
							base: AFF_MAPPING[b.resists.air],
							current: AFF_MAPPING[b.resists.air],
							bonus: 0 as const,
						},
						bolt: {
							base: AFF_MAPPING[b.resists.bolt],
							current: AFF_MAPPING[b.resists.bolt],
							bonus: 0 as const,
						},
						dark: {
							base: AFF_MAPPING[b.resists.dark],
							current: AFF_MAPPING[b.resists.dark],
							bonus: 0 as const,
						},
						earth: {
							base: AFF_MAPPING[b.resists.earth],
							current: AFF_MAPPING[b.resists.earth],
							bonus: 0 as const,
						},
						fire: {
							base: AFF_MAPPING[b.resists.fire],
							current: AFF_MAPPING[b.resists.fire],
							bonus: 0 as const,
						},
						ice: {
							base: AFF_MAPPING[b.resists.ice],
							current: AFF_MAPPING[b.resists.ice],
							bonus: 0 as const,
						},
						light: {
							base: AFF_MAPPING[b.resists.light],
							current: AFF_MAPPING[b.resists.light],
							bonus: 0 as const,
						},
						poison: {
							base: AFF_MAPPING[b.resists.poison],
							current: AFF_MAPPING[b.resists.poison],
							bonus: 0 as const,
						},
					},
					attributes: {
						dex: { base: b.attributes.dex, current: b.attributes.dex, bonus: 0 as const },
						ins: { base: b.attributes.ins, current: b.attributes.ins, bonus: 0 as const },
						mig: { base: b.attributes.mig, current: b.attributes.mig, bonus: 0 as const },
						wlp: { base: b.attributes.wlp, current: b.attributes.wlp, bonus: 0 as const },
					},
					derived: {
						init: { value: b.attributes.init, bonus: initBonus },
						def: { value: 0, bonus: b.equipment == null ? b.attributes.def : 0 },
						mdef: { value: 0, bonus: b.equipment == null ? b.attributes.def : 0 },
					},
					traits: { value: b.traits },
					species: { value: b.type.toLowerCase() },
					useEquipment: { value: b.equipment != null },
					source: { value: pageNum - 2 },
					villain: { value: "" as const },
					isElite: { value: false as const },
					isChampion: { value: 1 as const },
					isCompanion: { value: false as const },
					study: { value: 0 as const },
				},
				type: "npc" as const,
				name: b.name,
				img: imagePath + "/" + b.name + ".png",
				prototypeToken: { texture: { src: imagePath + "/" + b.name + ".png" } },
				folder: folder._id,
			};
			await saveImage(b.image, b.name + ".png", imagePath);
			const actor = await Actor.create(payload);

			actor.createEmbeddedDocuments("Item", [
				...b.attacks.map((attack) => {
					return {
						type: "basic" as const,
						name: attack.name,
						system: {
							attributes: {
								primary: { value: convertStat(attack.accuracy.primary) },
								secondary: { value: convertStat(attack.accuracy.secondary) },
							},
							accuracy: { value: attack.accuracy.bonus },
							damage: { value: attack.damage },
							type: { value: attack.range },
							damageType: { value: attack.damageType },
							description: attack.description,
							isBehavior: false,
							weight: { value: 1 },
							quality: { value: "" as const },
						},
					};
				}),
				...b.spells.map((spell) => {
					return {
						type: "spell" as const,
						name: spell.name,
						system: {
							attributes:
								spell.accuracy == null
									? undefined
									: {
											primary: { value: convertStat(spell.accuracy.primary) },
											secondary: { value: convertStat(spell.accuracy.secondary) },
										},
							accuracy: spell.accuracy == null ? undefined : { value: spell.accuracy?.bonus },
							mpCost: { value: spell.mp },
							target: { value: spell.target },
							duration: { value: spell.duration },
							isOffensive: { value: spell.accuracy !== null },
							hasRoll: { value: spell.accuracy !== null },
							rollInfo:
								spell.accuracy == null
									? undefined
									: {
											attributes: {
												primary: { value: convertStat(spell.accuracy.primary) },
												secondary: { value: convertStat(spell.accuracy.secondary) },
											},
											accuracy: { value: spell.accuracy.bonus },
										},
							description: spell.description,
							isBehavior: false,
							weight: { value: 1 },
							quality: { value: spell.opportunity || ("" as const) },
						},
					};
				}),
				...b.otherActions.map((oa) => {
					return {
						name: oa.name,
						system: {
							description: oa.description,
							isBehavior: false,
							weight: { value: 1 },
							quality: { value: "" as const },
							hasClock: { value: false },
						},
						type: "miscAbility" as const,
					};
				}),
				...b.specialRules.map((sr) => {
					return {
						name: sr.name,
						system: {
							description: sr.description,
							isBehavior: false,
							weight: { value: 1 },
							hasClock: { value: false },
						},
						type: "rule" as const,
					};
				}),
			]);
			actor.createEmbeddedDocuments("Item", equipment);
		}
	}
};
