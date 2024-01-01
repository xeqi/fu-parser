import fc from "fast-check";
import { AFFINITIES } from "../parsers/lib";

export const word = () => fc.stringMatching(/^\w+$/);
export const multiString = () => fc.array(fc.stringMatching(/^[a-z]+.*$/), { minLength: 1 });
export const descriptionEnd = () => fc.stringMatching(/^[a-z]+.[.?!]$/);
export const cost = () => fc.nat();
export const description = () =>
	fc.tuple(multiString(), descriptionEnd()).map(([descBegin, descEnd]) => [...descBegin, descEnd]);

export const resistance = () => fc.constantFrom(...AFFINITIES);
