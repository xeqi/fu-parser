import * as pdfjsLib from "pdfjs-dist";
import { Image, Token } from "./token";
import { DocumentInitParameters, TypedArray } from "pdfjs-dist/types/src/display/api";

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
			const data: { font: string; tokens: Token[] } = { font: "", tokens: [] };
			opList.fnArray.map((opCode, index) => {
				const args = opList.argsArray[index];
				switch (opCode) {
					case pdfjsLib.OPS.paintImageXObject: {
						let img: Image | null = null;
						try {
							img = page.objs.get(args[0]);
						} catch (err) {
							if (args[0].startsWith("g_")) {
								img = page.commonObjs.get(args[0]);
							}
						}
						if (img && img.height > 0 && img.width > 0) {
							data.tokens.push({ kind: "Image", image: img });
						}
						break;
					}
					case pdfjsLib.OPS.setFont: {
						if (args[0].startsWith("g_")) {
							const font = page.commonObjs.get(args[0]);
							data.font = font.name;
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
				return null;
			}, []);
			const r = await f(data.tokens);
			return [r, () => page.cleanup()];
		},
		() => doc.destroy(),
	];
};

// case pdfjsLib.OPS.transform: {
//   parsedData.push(args);
//   break;
// }

// case pdfjsLib.OPS.setFillColorN:{
//   parsedData.push(`setFillDataN: ${args}`)
//   break;
// }
// case pdfjsLib.OPS.setFillRGBColor:{
//   parsedData.push(`setFillRGBColor: ${args}`)
//   break;
// }
// default:
//   parsedData.push({unknown: Object.entries(pdfjsLib.OPS).filter(([k,v]) => v === opCode).map(([k,v])=>k)[0]})
