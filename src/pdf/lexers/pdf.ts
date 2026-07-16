import * as pdfjsLib from "pdfjs-dist";
import { Token } from "./token";
import { DocumentInitParameters, TypedArray } from "pdfjs-dist/types/src/display/api";
import { Image } from "../model/common";

export const tokenizePDF = async (
	docId: string | URL | TypedArray | ArrayBuffer | DocumentInitParameters,
): Promise<
	[<R>(pageNum: number, f: (d: Token[]) => Promise<R>) => Promise<[R, () => boolean]>, () => Promise<void>]
> => {
	const doc = await pdfjsLib.getDocument(docId).promise;

	return [
		async <R>(pageNum: number, f: (d: Token[]) => Promise<R>): Promise<[R, () => boolean]> => {
			const page = await doc.getPage(pageNum);

			const opList = await page.getOperatorList();

			const resolveObject = (id: string): Promise<{ name?: string; width?: number; height?: number } | null> => {
				const store = id.startsWith("g_") ? page.commonObjs : page.objs;
				return new Promise((resolve) => {
					try {
						store.get(id, (obj: unknown) => resolve((obj as { name?: string } | null) ?? null));
					} catch {
						resolve(null);
					}
				});
			};

			const data: { font: string; tokens: Token[] } = { font: "", tokens: [] };
			for (let index = 0; index < opList.fnArray.length; index++) {
				const opCode = opList.fnArray[index];
				const args = opList.argsArray[index];
				switch (opCode) {
					case pdfjsLib.OPS.paintImageXObject: {
						const img = (await resolveObject(args[0])) as Image | null;
						if (img && img.height > 0 && img.width > 0) {
							const yPosition = findPreviousTransform(index, opList.fnArray, opList.argsArray);
							data.tokens.push({ kind: "Image", image: img, y: yPosition });
						}
						break;
					}
					case pdfjsLib.OPS.setFont: {
						if (args[0].startsWith("g_")) {
							const font = await resolveObject(args[0]);
							if (font?.name) data.font = font.name;
						}
						break;
					}
					case pdfjsLib.OPS.showText: {
						if (args.length !== 1) {
							throw new Error("Expected text to be an array with a single array element.");
						}
						const text: string = args[0]
							.filter((a: { unicode?: string }) => a.unicode)
							.map((a: { unicode: string }) => a.unicode)
							.join("")
							.trim();
						if (text !== "") {
							data.tokens.push({ kind: "String", font: data.font, string: text });
						}
						break;
					}
				}
			}
			const r = await f(data.tokens);
			return [r, () => page.cleanup()];
		},
		() => doc.destroy(),
	];
};

function findPreviousTransform(index: number, fnArray: Array<number>, argsArray: Array<any>): number {
	for (let i = index - 1; i >= 0; i--) {
		if (fnArray[i] === pdfjsLib.OPS.transform) {
			return argsArray[i][5]; // [a, b, c, d, e, f] last one is y
		}
	}
	// Default to 0 if none found
	return 0;
}
