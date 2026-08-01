import { Image } from "./common";
import { FUItem } from "../../external/project-fu";

// A "rule" item from the Bestiary vol.1.
export type Rule = {
	image: Image;
	name: string;
	category: string; // sub-section, e.g. "Control Skills"
	caption: string; // italic flavour line
	description: string; // body text
	bullets?: string[];
};

const slugify = (name: string): string =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

const ruleHtml = (r: Rule): string => {
	const quote = r.caption ? `<blockquote><p>${r.caption}</p></blockquote><p></p>` : "";
	const body = r.description ? `<p>${r.description.replace(/\s*•\s*/g, "<br>• ")}</p>` : "";
	const list = r.bullets && r.bullets.length ? `<ul>${r.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : "";
	return quote + body + list;
};

export function ruleToFuItem(r: Rule, imagePath: string, folderId: string, source: string): FUItem {
	return {
		type: "rule",
		name: r.name,
		img: "icons/svg/item-bag.svg",
		folder: folderId,
		system: {
			fuid: slugify(r.name),
			description: ruleHtml(r),
			summary: { value: "" },
			showTitleCard: { value: false },
			isBehavior: false,
			weight: { value: 1 },
			hasClock: { value: false },
			hasRoll: { value: false },
			targeting: { rule: "special", max: 0 },
			source: source,
		},
	};
}
