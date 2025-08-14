import { ItemToken, StringToken } from "../lexers/token";
import { convertCosts, prettifyStrings } from "../parsers-commons";
import { DamageType, Distance, Stat, WeaponCategory } from "../model/common";
import { WeaponModule } from "../model/weapon-module";

export function parseWeaponModule(weaponModuleToken: ItemToken): WeaponModule {
	const isShield =
		weaponModuleToken.strings.find(
			(token) => token.font.includes("PTSans-NarrowBold") && token.string.includes("Shield module"),
		) !== undefined;
	return isShield ? parseShield(weaponModuleToken) : parseWeapon(weaponModuleToken);
}

function parseShield(weaponModuleToken: ItemToken): WeaponModule {
	const weaponModuleStringTokens = weaponModuleToken.strings.map((token) => token.string);
	const name = weaponModuleStringTokens[0];
	const cost = convertCosts(weaponModuleStringTokens[1]);
	const description = parseDescription(weaponModuleToken.strings.slice(4));

	// Accuracy, damage, damage type and category do not matter for shield. We will return some defaults.
	return {
		image: weaponModuleToken.image.image,
		name: name,
		cost: cost,
		accuracy: {
			primary: "DEX",
			secondary: "INS",
			bonus: 0,
		},
		damage: 0,
		damageType: "physical",
		moduleType: "shield",
		category: "arcane",
		description: description,
	};
}

function parseWeapon(weaponModuleToken: ItemToken): WeaponModule {
	const weaponModuleStringTokens = weaponModuleToken.strings.map((token) => token.string);
	const name = weaponModuleStringTokens[0];
	const cost = convertCosts(weaponModuleStringTokens[1]);

	// We skip index 2 and 4, these are "【" and "】"
	const [primaryAccuracyStat, secondaryAccuracyStat] = weaponModuleStringTokens[3].split("+");

	// Bonus string is optional
	const maybeBonus = Number(weaponModuleStringTokens[5]);
	const indexShift = isNaN(maybeBonus) ? 0 : 1;

	const bonus = isNaN(maybeBonus) ? 0 : maybeBonus;
	const accuracy = {
		primary: primaryAccuracyStat as Stat,
		secondary: secondaryAccuracyStat as Stat,
		bonus: bonus,
	};

	// We skip index 5(+) and 7(+), these are "【" and "】"
	const damage = Number(weaponModuleStringTokens[6 + indexShift].slice(5)); // Removing "HR + " part
	const damageType = weaponModuleStringTokens[8 + indexShift] as DamageType;

	const category = weaponModuleStringTokens[9 + indexShift].toLowerCase() as WeaponCategory;

	// We skip index 10(+) this is section separator
	const distance = weaponModuleStringTokens[11 + indexShift].toLowerCase() as Distance;

	// We skip index 12(+) this is section separator
	const description = parseDescription(weaponModuleToken.strings.slice(13 + indexShift));

	return {
		image: weaponModuleToken.image.image,
		name: name,
		cost: cost,
		accuracy: accuracy,
		damage: damage,
		damageType: damageType,
		moduleType: distance,
		category: category,
		description: description,
	};
}

function parseDescription(weaponModuleTokenStrings: StringToken[]) {
	// Remove section separator and No qualities
	return prettifyStrings(
		weaponModuleTokenStrings
			.filter((token) => !token.font.includes("Wingdings-Regular") && token.string !== "No qualities.")
			.map((token) => token.string),
	);
}
