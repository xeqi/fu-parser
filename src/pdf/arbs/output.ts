import { Image, ImageToken, StringToken } from "../lexers/token";

export const imageToken = (image: Image): ImageToken => {
	return { kind: "Image", image: image };
};
export const stringToken = (s: string, f: string = ""): StringToken => {
	return { kind: "String", string: s, font: f };
};

export const watermark = stringToken("", "Helvetica");
