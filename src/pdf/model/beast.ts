import { Accuracy, DamageType, DieSize, Distance, Image, ResistanceMap, Stat } from "./common";

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
