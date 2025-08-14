import { ItemToken } from "../lexers/token";
import { convertCosts, isMartial, prettifyStrings } from "../parsers-commons";
import { Weapon } from "../model/weapon";
import { DamageType, Distance, Handed, Stat, WeaponCategory } from "../model/common";

export function parseWeapon(weaponToken: ItemToken): Weapon {
	// This value will change depending on optional martial and accuracy bonus strings
	let indexShift = 0;

	const weaponStringTokens = weaponToken.strings.map((token) => token.string);
	const name = weaponStringTokens[0];

	const martial = isMartial(weaponToken.strings[1]);

	// Martial string is optional
	if (martial) {
		indexShift++;
	}

	const cost = convertCosts(weaponStringTokens[1 + indexShift]);

	// We skip index 2(+) and 4(+), these are "【" and "】"
	const [primaryAccuracyStat, secondaryAccuracyStat] = weaponStringTokens[3 + indexShift].split("+");

	// Bonus string is optional
	const maybeBonus = Number(weaponStringTokens[5 + indexShift]);
	if (!isNaN(maybeBonus)) {
		indexShift++;
	}
	const bonus = isNaN(maybeBonus) ? 0 : maybeBonus;
	const accuracy = {
		primary: primaryAccuracyStat.trim() as Stat,
		secondary: secondaryAccuracyStat.trim() as Stat,
		bonus: bonus,
	};

	// We skip index 5(+) and 7(+), these are "【" and "】"
	const damage = Number(weaponStringTokens[6 + indexShift].slice(5)); // Removing "HR + " part
	const damageType = weaponStringTokens[8 + indexShift] as DamageType;

	const category = weaponStringTokens[9 + indexShift].toLowerCase() as WeaponCategory;

	// We skip index 10(+) this is section separator
	const hands = weaponStringTokens[11 + indexShift].toLowerCase() as Handed;

	// We skip index 12(+) this is section separator
	const distance = weaponStringTokens[13 + indexShift].toLowerCase() as Distance;

	// We skip index 14(+) this is section separator
	const description = prettifyStrings(weaponStringTokens.slice(15 + indexShift));

	return {
		image: weaponToken.image.image,
		name: name,
		martial: martial,
		cost: cost,
		accuracy: accuracy,
		damage: damage,
		damageType: damageType,
		hands: hands,
		melee: distance,
		category: category,
		description: description,
	};
}
