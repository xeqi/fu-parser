import {
	Accuracy,
	AFF_MAPPING,
	DamageType,
	DieSize,
	Distance,
	Image,
	ResistanceMap,
	Stat,
	STAT_MAPPING,
} from "./common";
import { FUActor, FUItem } from "../../external/project-fu";

export type Beast = {
	image: Image;
	name: string;
	level: number;
	type: string;
	description: string;
	traits: string;
	attributes: {
		dex: DieSize;
		ins: DieSize;
		mig: DieSize;
		wlp: DieSize;
		maxHp: number;
		crisis: number;
		maxMp: number;
		init: number;
		def: number;
		mdef: number;
	};
	resists: ResistanceMap;
	equipment: string[] | null;
	attacks: {
		range: Distance;
		name: string;
		accuracy: Accuracy;
		damage: number;
		damageType: DamageType | null;
		description: string;
	}[];
	spells: {
		name: string;
		accuracy: {
			primary: Stat;
			secondary: Stat;
			bonus: number;
		} | null;
		mp: string;
		target: string;
		duration: string;
		description: string;
		opportunity?: string;
	}[];
	otherActions: {
		name: string;
		description: string;
	}[];
	specialRules: {
		name: string;
		description: string;
	}[];
};

export function beastToFuActor(
	b: Beast,
	imagePath: string,
	folderId: string,
	source: string,
): [FUActor, FUItem[], FUItem[]] {
	const equipment = extractBeastEquipment(b);
	const initBonus = calculateInitBonus(b, equipment);
	const calculatedMaxHp = 2 * b.level + 5 * b.attributes.mig;

	const calculatedMaxMp = b.level + 5 * b.attributes.wlp;
	const beastActor: FUActor = {
		system: {
			description: b.description,
			level: { value: b.level },
			resources: {
				hp: {
					value: b.attributes.maxHp,
					max: calculatedMaxHp,
					min: 0,
					bonus: b.attributes.maxHp - calculatedMaxHp,
				},
				mp: {
					value: b.attributes.maxMp,
					max: calculatedMaxMp,
					min: 0,
					bonus: b.attributes.maxMp - calculatedMaxMp,
				},
				ip: { value: 6, max: 6, min: 0 },
				fp: { value: 3 },
			},
			affinities: {
				physical: {
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
				mdef: { value: 0, bonus: b.equipment == null ? b.attributes.mdef : 0 },
				accuracy: { value: 0, bonus: 0 },
				magic: { value: 0, bonus: 0 },
			},
			traits: { value: b.traits },
			species: { value: b.type.toLowerCase() },
			useEquipment: { value: b.equipment != null },
			source: { value: source },
			villain: { value: "" as const },
			isElite: { value: false as const },
			isChampion: { value: 1 as const },
			isCompanion: { value: false as const },
			study: { value: 0 as const },
		},
		type: "npc",
		name: b.name,
		img: imagePath + "/" + b.name + ".png",
		prototypeToken: { texture: { src: imagePath + "/" + b.name + ".png" } },
		folder: folderId,
	};

	const otherBeastItems = [
		...b.attacks.map((attack): FUItem => {
			return {
				type: "basic" as const,
				name: attack.name,
				system: {
					attributes: {
						primary: { value: STAT_MAPPING[attack.accuracy.primary] },
						secondary: { value: STAT_MAPPING[attack.accuracy.secondary] },
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
		...b.spells.map((spell): FUItem => {
			return {
				type: "spell" as const,
				name: spell.name,
				system: {
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
										primary: { value: STAT_MAPPING[spell.accuracy.primary] },
										secondary: { value: STAT_MAPPING[spell.accuracy.secondary] },
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
		...b.otherActions.map((oa): FUItem => {
			return {
				name: oa.name,
				system: {
					description: oa.description,
					isBehavior: false,
					weight: { value: 1 },
					hasClock: { value: false },
					hasRoll: { value: false },
				},
				type: "miscAbility" as const,
			};
		}),
		...b.specialRules.map((sr): FUItem => {
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
	];

	return [beastActor, otherBeastItems, equipment];
}

function extractBeastEquipment(b: Beast): FUItem[] {
	let mainHandFree = true;
	let offHandFree = true;

	return (b.equipment || [])
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
}

function calculateInitBonus(b: Beast, equipment: FUItem[]): number {
	return (
		b.attributes.init -
		equipment.reduce(
			(acc, i) =>
				(i.type == "armor" || i.type == "accessory" || i.type == "shield") && i.system.isEquipped
					? i.system.init.value
					: 0,
			0,
		) -
		(b.attributes.dex + b.attributes.ins) / 2
	);
}
