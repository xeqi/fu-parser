import { FUItem, getFolder, saveImage } from "../../external/project-fu";
import { Beast, beastToFuActor } from "../../pdf/model/beast";
import { Consumable, consumableToFuItem } from "../../pdf/model/consumable";
import { Weapon, weaponToFuItem } from "../../pdf/model/weapon";
import { Armor, armorToFuItem } from "../../pdf/model/armor";
import { Accessory, accessoryToFuItem } from "../../pdf/model/accessory";
import { Shield, shieldToFuItem } from "../../pdf/model/shield";
import { WeaponModule, weaponModuleToFuItem } from "../../pdf/model/weapon-module";

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
				await saveImage(data.image, data.name + ".png", imagePath);
				const payload: FUItem = consumableToFuItem(data, imagePath, folder._id, source);
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
			const saved = await saveImage(data.image, data.name + ".png", imagePath);
			if (saved && Object.keys(saved).length != 0) {
				const payload: FUItem = weaponToFuItem(data, imagePath, folder._id, source);
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
			await saveImage(data.image, data.name + ".png", imagePath);
			const payload: FUItem = armorToFuItem(data, imagePath, folder._id, source);
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
			await saveImage(data.image, data.name + ".png", imagePath);
			const payload: FUItem = accessoryToFuItem(data, imagePath, folder._id, source);
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
			await saveImage(data.image, data.name + ".png", imagePath);
			const payload: FUItem = shieldToFuItem(data, imagePath, folder._id, source);
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

export const saveBeasts = async (
	beasts: Beast[],
	source: string,
	folderNames: readonly string[],
	imagePath: string,
) => {
	for (const b of beasts) {
		const folder = await getFolder([...folderNames, b.type], "Actor");
		if (folder) {
			const [payload, otherItems, equipment] = beastToFuActor(b, imagePath, folder._id, source);
			await saveImage(b.image, b.name + ".png", imagePath);
			const actor = await Actor.create(payload);

			actor.createEmbeddedDocuments("Item", otherItems);
			actor.createEmbeddedDocuments("Item", equipment);
		}
	}
};
