declare global {
	const game: {
		folders: Collection<Folder>;
		user: { isGM: boolean };
		items: Collection<Item>;
	};
	const Hooks: {
		on(s: "init", f: () => unknown): null;
		on(s: "renderSettings", f: (app: unknown, html: JQuery) => unknown): null;
	};
	const duplicate: <T>(d: T) => T;
	const Folder: { create(payload: { name: string; type: string; folder?: string }): Promise<Folder> };
	const Item: { create(payload: Item): Promise<Item & Document> };
	const Actor: { create(payload: Actor): Promise<Actor & Document> };
	class FilePicker {
		/**
		 * Dispatch a POST request to the server containing a directory path and a file to upload
		 * @param {string} source   The data source to which the file should be uploaded
		 * @param {string} path     The destination path
		 * @param {File} file       The File object to upload
		 * @param {object} [body={}]  Additional file upload options sent in the POST body
		 * @param {object} [options]  Additional options to configure how the method behaves
		 * @param {boolean} [options.notify=true] Display a UI notification when the upload is processed
		 * @returns {Promise<object>}  The response object
		 */
		static upload(
			source: string,
			path: string,
			file: File,
			body?: { [key: string]: string | Blob },
			options?: { notify?: boolean },
		): Promise<null | false | Response | Record<string, never>>;
		constructor(options?: { [key: string]: unknown });
	}
	class FormApplication<T> {
		constructor(object?: T, options?: unknown);
		render(force?: boolean): FormApplication<T>;
		activateListeners(html: JQuery): void;
		object: T;
		close(): void;
	}
}

export type Folder = {
	_id: string;
	name: string;
	getSubfolders(): Collection<Folder>;
};

type ATTR = "mig" | "wlp" | "dex" | "ins";
type DamageType = "physical" | "air" | "bolt" | "dark" | "earth" | "fire" | "ice" | "light" | "poison";

type Base = {
	description: string;
};
type SystemItem = {
	cost: { value: number };
};
type Defensive = {
	def: { value: number };
	mdef: { value: number };
	init: { value: number };
};

// type HasLevel = { level: { value: number; max: number; min: number } };

type Equippable = {
	isMartial: { value: boolean };
	quality?: { value: string };
	isEquipped?: { value: boolean; slot: string };
};

type Weaponize = {
	attributes: {
		primary: { value: ATTR };
		secondary: { value: ATTR };
	};
	accuracy: { value: number };
	damage: { value: number };
	type: { value: "melee" | "ranged" };
	category: {
		value: "arcane" | "bow" | "brawling" | "dagger" | "firearm" | "flail" | "heavy" | "spear" | "sword" | "thrown";
	};
	hands: { value: "one-handed" | "two-handed" };
	damageType: { value: DamageType };
};

type RollInfo = {
	useWeapon?: {
		accuracy: { value: boolean };
		damage: { value: boolean };
		hrZero: { value: boolean };
	};
	attributes?: {
		primary: { value: ATTR };
		secondary: { value: ATTR };
	};
	accuracy?: { value: number };
	damage?: {
		hasDamage: { value: boolean };
		value: number;
		type: { value: DamageType };
	};
};

type HasBehavior = {
	isBehavior: boolean;
	weight: { value: number };
};

type HasProgress = {
	hasClock: { value: boolean };
	progress?: { current: number; step: number; max: number };
};

export type Item = {
	name: string;
	img?: string;
	folder?: string;
} & (
	| {
			type: "weapon";
			system: Base &
				SystemItem &
				Equippable &
				Weaponize &
				HasBehavior & {
					isCustomWeapon: { value: boolean };
				};
	  }
	| {
			type: "armor" | "accessory" | "shield";
			system: Base & SystemItem & Equippable & Defensive & HasBehavior;
	  }
	| {
			type: "consumable";
			system: Base & { ipCost: { value: number } };
	  }
	| {
			type: "basic";
			system: Base &
				HasBehavior & {
					attributes: {
						primary: { value: ATTR };
						secondary: { value: ATTR };
					};
					accuracy: { value: number };
					damage: { value: number };
					type: { value: "melee" | "ranged" };

					damageType: {
						value: DamageType | null;
					};
					quality: { value: "" };
				};
	  }
	| {
			type: "spell";
			system: Base &
				RollInfo &
				HasBehavior & {
					mpCost: { value: string };
					target: { value: string };
					duration: { value: string };
					isOffensive: { value: boolean };
					quality: { value: string };
				};
	  }
	| {
			type: "miscAbility";
			system: Base & RollInfo & HasBehavior & HasProgress;
	  }
	| {
			type: "rule";
			system: Base & HasBehavior & HasProgress;
	  }
);

export type Actor = {
	type: "npc";
	name: string;
	img: string;
	prototypeToken: { texture: { src: string } };
	folder?: string;
	system: {
		level: { value: number };
		resources: {
			hp: { value: number; min: number; max: number; bonus: number };
			mp: { value: number; min: number; max: number; bonus: number };
		};
		affinities: {
			phys: { base: number; current: number; bonus: 0 };
			air: { base: number; current: number; bonus: 0 };
			bolt: { base: number; current: number; bonus: 0 };
			dark: { base: number; current: number; bonus: 0 };
			earth: { base: number; current: number; bonus: 0 };
			fire: { base: number; current: number; bonus: 0 };
			ice: { base: number; current: number; bonus: 0 };
			light: { base: number; current: number; bonus: 0 };
			poison: { base: number; current: number; bonus: 0 };
		};
		attributes: {
			dex: { base: number; current: number; bonus: 0 };
			ins: { base: number; current: number; bonus: 0 };
			mig: { base: number; current: number; bonus: 0 };
			wlp: { base: number; current: number; bonus: 0 };
		};
		derived: {
			init: { value: number; bonus: number };
			def: { value: number; bonus: number };
			mdef: { value: number; bonus: number };
		};
	} & {
		resources: {
			ip: { value: number; min: number; max: number };
			fp: { value: number };
		};
		traits: { value: string };
		species: { value: string };
		villain: { value: "" };
		isElite: { value: false };
		isChampion: { value: 1 };
		isCompanion: { value: false };
		useEquipment: { value: boolean };
		study: { value: 0 };
	};
};

type Document = {
	createEmbeddedDocuments(type: "Item", data: Item[]): Promise<Item>;
};

type Collection<Q> = {
	contents: Array<Q>;
	[Symbol.iterator](): Iterator<Q>;
	find(f: (q: Q) => boolean): Q | null;
};
