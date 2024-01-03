import { Image } from "./lexers/token";

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
	const Item: { create<T extends Item>(payload: T): Promise<T & Document> };
	const Actor: { create<T extends Actor>(payload: T): Promise<T & Document> };
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
		close(options?: unknown): Promise<void>;
	}
}

type Folder = {
	_id: string;
	name: string;
	getSubfolders(): Collection<Folder>;
};

type Document = {
	createEmbeddedDocuments<T extends Item>(type: "Item", data: T[]): Promise<T[]>;
};

export type Item = {
	name: string;
	img?: string;
	folder?: string;
	type: string;
};

export type Actor = {
	type: string;
	name: string;
	img: string;
	prototypeToken: { texture: { src: string } };
	folder?: string;
};

type Collection<Q> = {
	contents: Array<Q>;
	[Symbol.iterator](): Iterator<Q>;
	find(f: (q: Q) => boolean): Q | null;
};

export const getFolder = async (folders: readonly string[], type: string) => {
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

export const saveImage = async (
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
