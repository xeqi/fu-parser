import { Image } from "../model/common";

export type ImageToken = { kind: "Image"; image: Image };
export type StringToken = { kind: "String"; string: string; font: string };
export type Token = ImageToken | StringToken;

export const isImageToken = (token: Token): token is ImageToken => {
	return token.kind === "Image";
};
export const isStringToken = (token: Token): token is StringToken => {
	return token.kind === "String";
};

export const asStringToken = (token: Token) => token as StringToken;
export const asImageToken = (token: Token) => token as ImageToken;

export type ItemToken = {
	image: ImageToken;
	strings: StringToken[];
};
