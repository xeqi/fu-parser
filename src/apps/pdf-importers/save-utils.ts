import { FUItem, getFolder, saveImage } from "../../external/project-fu";
import { Beast, beastToFuActor } from "../../pdf/model/beast";

const usedImageNames = new Set<string>();
const uniqueImageName = (name: string): string => {
	let candidate = name;
	for (let n = 2; usedImageNames.has(candidate); n++) {
		candidate = `${name}-${n}`;
	}
	usedImageNames.add(candidate);
	return candidate;
};
import { Consumable, consumableToFuItem } from "../../pdf/model/consumable";
import { Weapon, weaponToFuItem } from "../../pdf/model/weapon";
import { Armor, armorToFuItem } from "../../pdf/model/armor";
import { Accessory, accessoryToFuItem } from "../../pdf/model/accessory";
import { Shield, shieldToFuItem } from "../../pdf/model/shield";
import { WeaponModule, weaponModuleToFuItem } from "../../pdf/model/weapon-module";
import { CampActivity, campActivityToFuItem } from "../../pdf/model/camp-activity";
import { Arcanum, arcanumToFuItem } from "../../pdf/model/arcanum";
import { Rule, ruleToFuItem } from "../../pdf/model/rule";

export const saveConsumables = async (
	categories: [string, Consumable[]][],
	source: string,
	folderNames: readonly string[],
	imagePath: string,
) => {
	for (const [category, consumables] of categories) {
		const folder = await getFolder([...folderNames, category], "Item");
		if (folder) {
			for (const data of consumables) {
				const src = await saveImage(data.image, data.name + ".png", imagePath);
				const payload: FUItem = consumableToFuItem(data, imagePath, folder._id, source);
				if (src) payload.img = src;
				await Item.create(payload);
			}
		}
	}
};

export const saveWeapons = async (
	weapons: Weapon[],
	source: string,
	folderNames: readonly string[],
	imagePath: string,
) => {
	const folder = await getFolder(folderNames, "Item");
	if (folder) {
		for (const data of weapons) {
			const src = await saveImage(data.image, data.name + ".png", imagePath);
			if (src) {
				const payload: FUItem = weaponToFuItem(data, imagePath, folder._id, source);
				payload.img = src;
				await Item.create(payload);
			}
		}
	}
};

export const saveArmors = async (
	armors: Armor[],
	source: string,
	folderNames: readonly string[],
	imagePath: string,
) => {
	const folder = await getFolder(folderNames, "Item");
	if (folder) {
		for (const data of armors) {
			const src = await saveImage(data.image, data.name + ".png", imagePath);
			const payload: FUItem = armorToFuItem(data, imagePath, folder._id, source);
			if (src) payload.img = src;
			await Item.create(payload);
		}
	}
};

export const saveAccessories = async (
	accessories: Accessory[],
	source: string,
	folderNames: readonly string[],
	imagePath: string,
) => {
	for (const data of accessories) {
		const folder = await getFolder(folderNames, "Item");
		if (folder) {
			const src = await saveImage(data.image, data.name + ".png", imagePath);
			const payload: FUItem = accessoryToFuItem(data, imagePath, folder._id, source);
			if (src) payload.img = src;
			await Item.create(payload);
		}
	}
};

export const saveShields = async (
	shields: Shield[],
	source: string,
	folderNames: readonly string[],
	imagePath: string,
) => {
	const folder = await getFolder(folderNames, "Item");
	if (folder) {
		for (const data of shields) {
			const src = await saveImage(data.image, data.name + ".png", imagePath);
			const payload: FUItem = shieldToFuItem(data, imagePath, folder._id, source);
			if (src) payload.img = src;
			await Item.create(payload);
		}
	}
};

export const saveWeaponModules = async (
	weaponModules: WeaponModule[],
	source: string,
	folderNames: readonly string[],
	imagePath: string,
) => {
	const folder = await getFolder(folderNames, "Item");
	if (folder) {
		for (const data of weaponModules) {
			const saved = await saveImage(data.image, data.name + ".png", imagePath);
			if (saved && Object.keys(saved).length != 0) {
				const payload: FUItem = weaponModuleToFuItem(data, imagePath, folder._id, source);
				await Item.create(payload);
			}
		}
	}
};

export const saveCampActivities = async (
	campActivities: CampActivity[],
	source: string,
	folderNames: readonly string[],
) => {
	const folder = await getFolder(folderNames, "Item");
	if (folder) {
		for (const data of campActivities) {
			const payload: FUItem = campActivityToFuItem(data, folder._id, source);
			await Item.create(payload);
		}
	}
};

export const saveArcana = async (
	arcana: Arcanum[],
	source: string,
	folderNames: readonly string[],
	imagePath: string,
) => {
	const folder = await getFolder(folderNames, "Item");
	if (folder) {
		for (const data of arcana) {
			const src = await saveImage(data.image, data.name + ".png", imagePath);
			const payload: FUItem = arcanumToFuItem(data, imagePath, folder._id, source);
			if (src) payload.img = src;
			await Item.create(payload);
		}
	}
};

export const saveRules = async (rules: Rule[], source: string, folderNames: readonly string[], imagePath: string) => {
	for (const data of rules) {
		const path = data.category ? [...folderNames, data.category] : folderNames;
		const folder = await getFolder(path, "Item");
		if (folder) {
			const payload: FUItem = ruleToFuItem(data, imagePath, folder._id, source);
			await Item.create(payload);
		}
	}
};

export const saveBeasts = async (
	beasts: Beast[],
	source: string,
	folderNames: readonly string[],
	imagePath: string,
) => {
	for (const b of beasts) {
		const subfolder = b.rank === "companion" ? "COMPANION" : b.type;
		const folder = await getFolder([...folderNames, subfolder], "Actor");
		if (folder) {
			const imageName = uniqueImageName(b.name);
			const [payload, otherItems, equipment] = beastToFuActor(b, imagePath, folder._id, source, imageName);
			const src = await saveImage(b.image, imageName + ".png", imagePath);
			if (src) {
				payload.img = src;
				if (payload.prototypeToken) payload.prototypeToken.texture.src = src;
			}
			const actor = await Actor.create(payload);
			await actor.rest(true);

			await actor.createEmbeddedDocuments("Item", otherItems);
			await actor.createEmbeddedDocuments("Item", equipment);
		}
	}
};
