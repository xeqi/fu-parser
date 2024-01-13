import { json } from "typia";
import { Affinities, Attributes, Elements, Npc, NpcArmor, Weapon } from "../external/fultimator";
import { ATTR, FUActor, FUItem } from "../external/project-fu";
import { DamageType } from "../pdf/parsers/lib";

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

const importFultimator = async (data: Npc) => {
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
				phys: {
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
			villian: { value: data.villain || "" },
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

	actor.createEmbeddedDocuments("Item", [
		...data.attacks.map((attack): FUItem => {
			return {
				type: "basic" as const,
				name: attack.name != "" ? attack.name : "Unnamed Attack",
				system: {
					attributes: {
						primary: { value: STAT_MAPPING[attack.attr1] },
						secondary: { value: STAT_MAPPING[attack.attr2] },
					},
					accuracy: {
						value: Math.floor(data.lvl / 10) + (data.rank == "companion" ? data.lvl || 1 : 0),
					},
					damage: {
						value: Math.floor(data.lvl / 20) * 5 + 5 + (attack.extraDamage ? 5 : 0),
					},
					type: { value: attack.range == "distance" ? "ranged" : "melee" },
					damageType: { value: ELEMENTS_MAPPING[attack.type] },
					quality: { value: attack.special.join(" ") },
					isBehavior: false,
					weight: { value: 1 },
					description: "",
				},
			};
		}),
		...(data.weaponattacks || []).map((attack): FUItem => {
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
					damageType: { value: ELEMENTS_MAPPING[attack.weapon.type] },
					description: "",
					isBehavior: false,
					weight: { value: 1 },
					quality: { value: attack.special.join(" ") },
				},
			};
		}),
		...(data.spells || []).map((spell) => {
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
										value:
											Math.floor(data.lvl / 10) + (data.rank == "companion" ? data.lvl || 1 : 0),
									},
								}
							: undefined,
					description: spell.effect,
					isBehavior: false,
					weight: { value: 1 },
					quality: { value: "" },
				},
			};
		}),
		...(data.actions || []).map((oa): FUItem => {
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
		}),
		...(data.special || []).map((sr): FUItem => {
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
		}),
		...(data.raregear || []).map((sr): FUItem => {
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
		}),
	]);
	await actor.createEmbeddedDocuments("Item", equipment);
	actor.update({
		"system.resources.hp.value": actor.system.resources.hp.max,
		"system.resources.mp.value": actor.system.resources.mp.max,
	});
};

type FultimatorSubmissionData = {
	text: string;
};

type FultimatorImportData = FultimatorSubmissionData & {
	parse?: Npc;
	error?: string;
	inProgress: boolean;
};

export class FultimatorImportApplication extends FormApplication<FultimatorImportData> {
	async _updateObject<T extends FultimatorSubmissionData>(_e: Event, data: T) {
		if (data.text != this.object.text) {
			delete this.object.error;
			this.object.text = data.text;
			try {
				this.object.parse = json.assertParse<Npc>(this.object.text);
			} catch (e) {
				if (typeof e === "string") {
					this.object.error = e.toUpperCase();
				} else if (e instanceof Error) {
					this.object.error = e.message;
				}
			}
		}
		this.render();
	}
	async getData(): Promise<FultimatorImportData & { disabled: boolean }> {
		return {
			...this.object,
			disabled: this.object.text === "" || this.object.error != null || this.object.inProgress,
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
			if (this.object.parse) await importFultimator(this.object.parse);
			this.close();
		});
	}
}
