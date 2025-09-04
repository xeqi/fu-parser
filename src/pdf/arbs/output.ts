import { ImageToken, StringToken } from "../lexers/token";
import { Image } from "../model/common";

export const imageToken = (image: Image): ImageToken => {
	return { kind: "Image", image: image, y: 0 };
};
export const stringToken = (s: string, f: string = ""): StringToken => {
	return { kind: "String", string: s, font: f };
};

export const watermark = stringToken("", "Helvetica");
