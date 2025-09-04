import { Token } from "../../pdf/lexers/token";
import { saveAccessories, saveArmors, saveShields, saveWeaponModules, saveWeapons } from "./save-utils";
import { BookType, ParseResult } from "../import-pdf";
import { parseAtlasPage } from "../../pdf/atlas-parsers/page-parser";
import { Item, ItemCategory } from "../../pdf/model/common";
import { Weapon } from "../../pdf/model/weapon";
import { Armor } from "../../pdf/model/armor";
import { Shield } from "../../pdf/model/shield";
import { Accessory } from "../../pdf/model/accessory";
import { WeaponModule } from "../../pdf/model/weapon-module";

const FUHF_PAGES = [80, 81, 82, 83];
const FUNF_PAGES = [86, 87, 88, 89];
const FUTF_PAGES = [84, 85, 86, 87, 88, 89];

const FUHF_FOLDER = "High Fantasy Equipment";
const FUNF_FOLDER = "Natural Fantasy Equipment";
const FUTF_FOLDER = "Techno Fantasy Equipment";

const PAGES = new Map<BookType, number[]>([
	["FUHF", FUHF_PAGES],
	["FUNF", FUNF_PAGES],
	["FUTF", FUTF_PAGES],
]);

const FOLDERS = new Map<BookType, string>([
	["FUHF", FUHF_FOLDER],
	["FUNF", FUNF_FOLDER],
	["FUTF", FUTF_FOLDER],
]);

export function importAtlas(
	withPage: <R>(pageNum: number, f: (d: Token[]) => Promise<R>) => Promise<[R, () => boolean]>,
	bookType: BookType,
): Promise<ParseResult[]> {
	return Promise.all(
		PAGES.get(bookType)!.map(async (pageNum) => {
			const [r, cleanup] = await withPage(pageNum, async (data) => {
				try {
					return Array.from(
						parseAtlasPage(data)
							.mapValues((items: Item[], category: ItemCategory) => {
								const source = bookType + (pageNum - 2);
								const saveFunction = assignSave(category, items, FOLDERS.get(bookType)!, source);
								return {
									type: "success" as const,
									page: pageNum,
									save: saveFunction,
								};
							})
							.values(),
					);
				} catch (e) {
					const error = e instanceof Error ? e : Error(`Unexpected error: ${e}`);
					return [errorToParseFailure(error, pageNum)];
				}
			});

			return r.map((result) => {
				if (result.type === "success") {
					// Assigning the same cleanup to multiple results is risky. It will work because clean up is done at the very end.
					return { ...result, cleanup };
				} else {
					cleanup();
					return result;
				}
			});
		}),
	).then((results) => results.flat());
}

function assignSave(
	category: ItemCategory,
	items: Item[],
	folder: string,
	source: string,
): (imagePath: string) => Promise<void> {
	switch (category) {
		case "WEAPON":
			return (imagePath: string) => saveWeapons(items as Weapon[], source, [folder, "Weapons"], imagePath);
		case "ARMOR":
			return (imagePath: string) => saveArmors(items as Armor[], source, [folder, "Armors"], imagePath);
		case "SHIELD":
			return (imagePath: string) => saveShields(items as Shield[], source, [folder, "Shields"], imagePath);
		case "ACCESSORY":
			return (imagePath: string) =>
				saveAccessories(items as Accessory[], source, [folder, "Accessories"], imagePath);
		case "WEAPON MODULE":
			return (imagePath: string) =>
				saveWeaponModules(items as WeaponModule[], source, [folder, "Weapon Modules"], imagePath);
		default:
			// This should never happen if `category` is properly typed
			throw new Error(`Unknown item category: ${category}`);
	}
}

const errorToParseFailure = (error: Error, pageNum: number) => {
	return {
		type: "failure" as const,
		page: pageNum,
		errors: [
			{
				found: "",
				error: error.message,
				distance: 0,
			},
		],
	};
};
