import { Token, isStringToken } from "../lexers/token";
import {
	Parser,
	accuracy,
	alt,
	cost,
	damage,
	damageType,
	description,
	eof,
	fmap,
	hands,
	image,
	kl,
	kr,
	many1,
	martial,
	melee,
	sep,
	seq,
	starting,
	str,
	text,
	then,
	fail,
	nextToken,
	success,
	inc,
	watermark,
} from "./lib";
import { Weapon } from "../model/weapon";
import { WEAPON_CATEGORIES, WeaponCategory } from "../model/common";

const weaponListingParser = fmap(
	seq(image, str, martial, cost, accuracy, damage, damageType, kl(hands, sep), kl(melee, sep), description),
	([image, name, martial, cost, accuracy, damage, damageType, hands, melee, description]) => {
		return { image, name, martial, cost, damage, accuracy, damageType, hands, melee, description };
	},
);

const advancedStarting: Parser<WeaponCategory> = kl(
	kr(seq(image, image, many1(str)), (ptr) => {
		const token = nextToken(ptr);
		if (token && isStringToken(token) && /^SAMPLE RARE .* WEAPONS$/.test(token.string)) {
			return asWeaponCategory(token.string.slice(12, -8).toLowerCase(), ptr);
		}
		return fail<WeaponCategory>("Category")(ptr);
	}),
	many1(str),
);

function asWeaponCategory(s: string, ptr: [Token[], number]) {
	if ((WEAPON_CATEGORIES as readonly string[]).includes(s)) {
		return success(s as WeaponCategory)(inc(ptr));
	}
	return fail<WeaponCategory>(`Unexpected category ${s}`)(ptr);
}

const categoryTitle: Parser<WeaponCategory> = (ptr) => {
	const token = nextToken(ptr);
	if (token && isStringToken(token) && token.string.endsWith(" Category")) {
		return asWeaponCategory(token.string.slice(0, -9).toLowerCase(), ptr);
	}
	return fail<WeaponCategory>("Category")(ptr);
};
const weaponsParser = fmap(then(categoryTitle, many1(weaponListingParser)), ([category, weapons]) =>
	weapons.map((v) => {
		return { ...v, category };
	}),
);
const ending = then(alt(then(text("BASIC WEAPONS"), watermark), watermark), eof);

export const basicWeapons: Parser<Weapon[]> = fmap(kl(kr(starting, many1(weaponsParser)), ending), (k) => k.flat(1));
export const rareWeapons: Parser<Weapon[]> = kl(
	fmap(then(advancedStarting, many1(weaponListingParser)), ([category, weapons]) =>
		weapons.map((v) => {
			return { ...v, category };
		}),
	),
	then(watermark, eof),
);
