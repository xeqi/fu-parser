import fc from "fast-check";
import { cost, description, word } from "../arbs/arbs";
import { flatMap, isResult, prettifyStrings } from "./lib";
import { Image, Token } from "../lexers/token";
import { imageToken, stringToken, watermark } from "../arbs/output";
import { Accessory, accessories } from "./accessoryPage";

const accessoryDataGen = fc.array(
	fc.record({
		name: word(),
		cost: cost(),
		description: description(),
		image: fc.constant({ width: 0, height: 0 } as Image),
	}),
	{ minLength: 1 },
);

test("parses generated", () => {
	fc.assert(
		fc.property(accessoryDataGen, (data): void => {
			const pageTokens: Token[] = [
				imageToken({ width: 0, height: 0 } as Image),
				imageToken({ width: 0, height: 0 } as Image),
				stringToken(""),

				...flatMap(data, (m) => [
					imageToken(m.image),
					stringToken(m.name),
					stringToken(m.cost.toString(), "FBDLWO+PTSans-Narrow"),
					...m.description.map((s) => stringToken(s, "FBDLWO+PTSans-Narrow")),
				]),

				watermark,
			];
			const parses = accessories([pageTokens, 0]);
			const expected: Accessory[] = data.map((v) => {
				return { ...v, description: prettifyStrings(v.description) };
			});
			const successful = parses.filter(isResult);
			for (const p of successful) {
				expect(p.result[0]).toEqual(expected);
			}
			expect(successful.length).toBe(1);
		}),
	);
});
