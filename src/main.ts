/**@license
 * fu-parser
 *
 *   All rights reserved
 *
 * ------------------------------------------------------------------------
 * pdf.js
 * Copyright 2023 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import { tokenizePDF } from "./lexers/pdf";
import * as pdfjsLib from "pdfjs-dist";
import { Image } from "./lexers/token";
import { Consumable, consumablesPage } from "./parsers/consumablePage";
import { Parser, Stat, isError, isResult } from "./parsers/lib";
import { Beast, beastiary } from "./parsers/beastiaryPage";
import { Weapon, basicWeapons, rareWeapons } from "./parsers/weaponPage";
import { Accessory, accessories } from "./parsers/accessoryPage";
import { Armor, armorPage } from "./parsers/armorPage";
import { Shield, shieldPage } from "./parsers/shieldPage";
import { Folder, Item } from "./foundry";

// Relative url that foundry serves for the compiled webworker
pdfjsLib.GlobalWorkerOptions.workerSrc = "modules/fu-parser/pdf.worker.js";

// Foundry v10 creates these methods, but pdfjs does not like extra methods on Object that are enumerable,
// so fix the compatibility issue
for (const prop of ["deepFlatten", "equals", "partition", "filterJoin", "findSplice"]) {
	Object.defineProperty(Array.prototype, prop, {
		enumerable: false,
	});
}

const getFolder = async (folders: readonly string[], type: string) => {
	let folder: Folder | null = null;
	for (const folderName of folders) {
		if (folder) {
			folder =
				folder.getSubfolders().find((f) => f.name === folderName) ||
				(await Folder.create({ name: folderName, type, folder: folder._id }));
		} else {
			folder =
				game.folders.find((f) => f.name === folderName) || (await Folder.create({ name: folderName, type }));
		}
	}
	return folder;
};

const saveImage = async (
	img: Image,
	name: string,
	imagePath: string,
): Promise<false | Response | Record<string, never> | null> => {
	try {
		const canvas = document.createElement("canvas");
		canvas.width = img.width;
		canvas.height = img.height;
		const ctx = canvas.getContext("2d");
		if (ctx !== null && "bitmap" in img) {
			ctx.drawImage(img.bitmap as ImageBitmap, 0, 0);

			const blob = await new Promise<Blob | null>(function (resolve, _reject) {
				canvas.toBlob(function (blob) {
					resolve(blob);
				});
			});
			if (blob) {
				return FilePicker.upload("data", imagePath, new File([blob], name), {}, { notify: false });
			}
		}
	} catch (err) {
		console.log(err);
	}
	return false;
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

const saveWeapons = async (weapons: Weapon[], pageNum: number, folderNames: readonly string[], imagePath: string) => {
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

const saveArmors = async (armors: Armor[], pageNum: number, folderNames: readonly string[], imagePath: string) => {
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

const saveAccessories = async (
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

const saveShields = async (shields: Shield[], pageNum: number, folderNames: readonly string[], imagePath: string) => {
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

const saveConsumables = async (
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

const PROJECT_FU_AFF_MAPPING = {
	VU: -1,
	N: 0,
	RS: 1,
	IM: 2,
	AB: 3,
};

const saveBeasts = async (beasts: Beast[], pageNum: number, folderNames: readonly string[], imagePath: string) => {
	for (const b of beasts) {
		const folder = await getFolder([...folderNames, b.type], "Actor");
		if (folder) {
			let mainHandFree = true;
			let offHandFree = true;

			const equipment = (b.equipment || [])
				.map((e) => {
					const item = game.items.find((f) => f.name.toLowerCase() === e.toLowerCase());
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
				.filter((d): d is Item => d !== undefined);
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
					level: { value: b.level },
					resources: {
						hp: { value: b.attributes.maxHp, max: b.attributes.maxHp, min: 0, bonus: 0 },
						mp: { value: b.attributes.maxMp, max: b.attributes.maxMp, min: 0, bonus: 0 },
						ip: { value: 0, max: 0, min: 0, bonus: 0 },
						fp: { value: 0, max: 0, min: 0, bonus: 0 },
					},
					affinities: {
						phys: {
							base: PROJECT_FU_AFF_MAPPING[b.resists.physical],
							current: PROJECT_FU_AFF_MAPPING[b.resists.physical],
							bonus: 0 as const,
						},
						air: {
							base: PROJECT_FU_AFF_MAPPING[b.resists.air],
							current: PROJECT_FU_AFF_MAPPING[b.resists.air],
							bonus: 0 as const,
						},
						bolt: {
							base: PROJECT_FU_AFF_MAPPING[b.resists.bolt],
							current: PROJECT_FU_AFF_MAPPING[b.resists.bolt],
							bonus: 0 as const,
						},
						dark: {
							base: PROJECT_FU_AFF_MAPPING[b.resists.dark],
							current: PROJECT_FU_AFF_MAPPING[b.resists.dark],
							bonus: 0 as const,
						},
						earth: {
							base: PROJECT_FU_AFF_MAPPING[b.resists.earth],
							current: PROJECT_FU_AFF_MAPPING[b.resists.earth],
							bonus: 0 as const,
						},
						fire: {
							base: PROJECT_FU_AFF_MAPPING[b.resists.fire],
							current: PROJECT_FU_AFF_MAPPING[b.resists.fire],
							bonus: 0 as const,
						},
						ice: {
							base: PROJECT_FU_AFF_MAPPING[b.resists.ice],
							current: PROJECT_FU_AFF_MAPPING[b.resists.ice],
							bonus: 0 as const,
						},
						light: {
							base: PROJECT_FU_AFF_MAPPING[b.resists.light],
							current: PROJECT_FU_AFF_MAPPING[b.resists.light],
							bonus: 0 as const,
						},
						poison: {
							base: PROJECT_FU_AFF_MAPPING[b.resists.poison],
							current: PROJECT_FU_AFF_MAPPING[b.resists.poison],
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

type Wrapper = <T>(
	p: Parser<T>,
	s: (t: T, pn: number, f: readonly string[], imagePath: string) => Promise<void>,
) => Promise<void>;

const PAGES = {
	106: [["Equipment", "Consumables"], (f: Wrapper) => f(consumablesPage, saveConsumables)],
	132: [["Equipment", "Weapons", "Basic"], (f: Wrapper) => f(basicWeapons, saveWeapons)],
	133: [["Equipment", "Weapons", "Basic"], (f: Wrapper) => f(basicWeapons, saveWeapons)],
	134: [["Equipment", "Armors", "Basic"], (f: Wrapper) => f(armorPage, saveArmors)],
	135: [["Equipment", "Shields", "Basic"], (f: Wrapper) => f(shieldPage, saveShields)],
	272: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	273: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	274: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	275: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	276: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	277: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	278: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	279: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	280: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	281: [["Equipment", "Weapons", "Rare"], (f: Wrapper) => f(rareWeapons, saveWeapons)],
	283: [["Equipment", "Armors", "Rare"], (f: Wrapper) => f(armorPage, saveArmors)],
	284: [["Equipment", "Armors", "Rare"], (f: Wrapper) => f(armorPage, saveArmors)],
	285: [["Equipment", "Shields", "Rare"], (f: Wrapper) => f(shieldPage, saveShields)],
	287: [["Equipment", "Accessories"], (f: Wrapper) => f(accessories, saveAccessories)],
	288: [["Equipment", "Accessories"], (f: Wrapper) => f(accessories, saveAccessories)],
	289: [["Equipment", "Accessories"], (f: Wrapper) => f(accessories, saveAccessories)],
	326: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	327: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	328: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	329: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	330: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	331: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	332: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	333: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	334: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	335: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	336: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	337: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	338: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	339: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	340: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	341: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	342: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	343: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	344: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	345: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	346: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	347: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	348: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	349: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	350: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	351: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	352: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	353: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	354: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
	355: [["Beastiary"], (f: Wrapper) => f(beastiary, saveBeasts)],
} as const;

const parsePdf = async (pdfPath: string, imagePath: string) => {
	const withPage = await tokenizePDF(pdfPath);

	for (const [pageNumStr, [folders, f]] of Object.entries(PAGES)) {
		await f((parser, save) => {
			const pageNum = Number(pageNumStr);
			return withPage(pageNum, async (data) => {
				const parses = parser([data, 0]);
				const successes = parses.filter(isResult);
				if (successes.length === 1) {
					await save(successes[0].result[0], pageNum, folders, imagePath);
				} else {
					console.log(`${pageNum}: ${successes.length} successful parses, ${parses.length} failed parses.`);
					const failures = parses.filter(isError);
					console.log("failed parses:", failures);
				}
			});
		});
	}
};

type FormSubmissionData = { pdfPath: string; imagePath: string };
type ObjectData = FormSubmissionData;

class ObjectFormApplication extends FormApplication<ObjectData> {
	async _updateObject(_e: Event, data: FormSubmissionData) {
		for (const a in data) {
			const k = <keyof FormSubmissionData>a;
			this.object[k] = data[k];
		}
	}
	async getData(): Promise<ObjectData> {
		return this.object;
	}
	get template(): string {
		return "modules/fu-parser/templates/import.hbs";
	}

	activateListeners(html: JQuery): void {
		super.activateListeners(html);
		html.find("#sub").on("click", (e) => {
			e.preventDefault();
			parsePdf(this.object.pdfPath, this.object.imagePath);
			this.close();
		});
	}
}

Hooks.on("renderSettings", async (_app, $html) => {
	if (game.user.isGM) {
		const html = $html[0];
		const header = document.createElement("h2");
		header.appendChild(new Text("FU Importer"));
		const importButton = document.createElement("button");
		importButton.type = "button";
		importButton.append("Import PDF");
		importButton.addEventListener("click", () => {
			const application = new ObjectFormApplication(
				{ pdfPath: "", imagePath: "" },
				{ width: 450, submitOnChange: true, closeOnSubmit: false, title: "FU importer", resizable: true },
			);
			application.render(true);
		});
		const div = document.createElement("div");
		div.appendChild(importButton);
		html.querySelector("#settings-documentation")?.after(header, div);
	}
});
