import { Image } from "./common";
import { FUItem } from "../../external/project-fu";

// A "New Arcana" entry from Bestiary vol.1.
export type Arcanum = {
	image: Image;
	name: string;
	caption: string;
	domains: string;
	merge: { title: string; description: string };
	dismiss: { title: string; description: string };
};

const slugify = (name: string): string =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

const abilityHtml = (ability: { title: string; description: string }): string => {
	const heading = ability.title ? `<p><strong>${ability.title}</strong></p>` : "";
	const body = ability.description ? `<p>${ability.description}</p>` : "";
	return heading + body;
};

export function arcanumToFuItem(a: Arcanum, imagePath: string, folderId: string, source: string): FUItem {
	return {
		type: "classFeature",
		name: a.name,
		img: imagePath + "/" + a.name + ".png",
		folder: folderId,
		system: {
			fuid: slugify(a.name),
			summary: { value: a.caption },
			featureType: "projectfu.arcanum",
			source: source,
			data: {
				merge: abilityHtml(a.merge),
				pulse: "",
				dismiss: abilityHtml(a.dismiss),
				domains: a.domains,
			},
		},
	};
}
