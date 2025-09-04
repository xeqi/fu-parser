import { StringToken } from "./lexers/token";

export const isMartial = (token: StringToken) => token.font.includes("BasicShapes1") && token.string === "E";
export const convertDashOrNumber = (s: string) => (s === "-" ? 0 : Number(s));

export const convertCosts = (s: string) => {
	if (s.endsWith(" z")) {
		return Number(s.slice(0, -2));
	} else if (s === "-") {
		return 0;
	} else {
		return Number(s);
	}
};

export const prettifyStrings = (lines: string[]): string => {
	return lines
		.reduce((acc, line) => {
			const s = line.trim();
			if (/^[.?!),]/.test(s)) {
				return acc + s;
			} else {
				return acc + " " + s;
			}
		}, "")
		.trim();
};
