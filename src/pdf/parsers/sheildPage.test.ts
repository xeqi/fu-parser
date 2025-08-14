import fc from "fast-check";
import { cost, description, word } from "../arbs/arbs";
import { flatMap, isResult } from "./lib";
import { Token } from "../lexers/token";
import { imageToken, stringToken, watermark } from "../arbs/output";
import { shieldPage } from "./shieldPage";
import { Shield } from "../model/shield";
import { Image } from "../model/common";
import { prettifyStrings } from "../parsers-commons";

const shieldDataGen = fc.array(
	fc.record({
		name: word(),
		cost: cost(),
		description: description(),
		image: fc.constant({ width: 0, height: 0 } as Image),
		martial: fc.boolean(),
		def: fc.nat(),
		mdef: fc.nat(),
		init: fc.integer(),
	}),
	{ minLength: 1 },
);

test("parses generated", () => {
	fc.assert(
		fc.property(shieldDataGen, (data): void => {
			const pageTokens: Token[] = [
				imageToken({ width: 0, height: 0 } as Image),
				imageToken({ width: 0, height: 0 } as Image),
				stringToken(""),

				...flatMap(data, (m) => [
					imageToken(m.image),
					stringToken(m.name),
					...(m.martial ? [stringToken("E", "FnT_BasicShapes1")] : []),
					stringToken(m.cost.toString(), "FBDLWO+PTSans-Narrow"),
					stringToken(`${m.def === 0 ? "-" : m.def}`),
					stringToken(`${m.mdef === 0 ? "-" : m.mdef}`),
					stringToken(`${m.init === 0 ? "-" : m.init}`),
					...m.description.map((s) => stringToken(s, "FBDLWO+PTSans-Narrow")),
				]),

				watermark,
			];
			const parses = shieldPage([pageTokens, 0]);
			const expected: Shield[] = data.map((v) => {
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
