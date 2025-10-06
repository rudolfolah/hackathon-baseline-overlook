import { PathLike } from "node:fs";

export interface Suggestion {
    title: string;
    overview: string;
    browserSupportFeatureId: string;
    featureIds: string[];
    descriptionFeatureId: string;
}

export interface ReviewUse {
    title: string;
    featureId: string;
    isPresent: (filepath: PathLike) => Promise<boolean>;
}

export interface Suggestions {
    [id: string]: Suggestion
}

export const suggestions: Suggestions = {
    'font-family-ui': {
        title: "Font Family UI",
        overview: "Designing a user interface? Try using the user interface fonts of the device",
        browserSupportFeatureId: "font-family-ui",
        descriptionFeatureId: "font-family-ui",
        featureIds: ["font-family", "font-family-ui"],
    },
    popover: {
        title: "Popover",
        overview: "Did you know that Popovers, also known as modals, are built into modern browsers?",
        browserSupportFeatureId: "popover",
        descriptionFeatureId: "popover",
        featureIds: ["popover", "popover-hint"],
    },
};
