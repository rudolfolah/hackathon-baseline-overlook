import * as vscode from 'vscode';
import { ReviewUse } from "./registry";
import * as fs from 'node:fs/promises';
import { PathLike } from 'node:fs';

async function findRegexMatch(filepath: PathLike, pattern: RegExp): Promise<boolean> {
    const content = await fs.readFile(filepath, 'utf-8');
    return pattern.test(content);
}

const FEATURES_TO_REVIEW: ReviewUse[] = [
    {
        title: 'Font Family',
        featureId: 'font-family',
        isPresent: async (filepath) => {
            return findRegexMatch(filepath, /font-family\:/);
        }
    },
    // {
    //     title: 'Font Family',
    //     featureId: 'font-family',
    //     isPresent: async (filepath) => {
    //         return findRegexMatch(filepath, /font-family\:/);
    //     }
    // },
];

interface FeatureFoundLocation {
    filePath: string;
}

interface FeatureFound {
    feature: Omit<ReviewUse, "isPresent">;
    description: string;
    locations: FeatureFoundLocation[];
    browsers: { [browser: string]: number };
    baselineSupportLevel: string;
    baselineSupportDate: string;
}

export class Scanner {
    private _featuresToReview: ReviewUse[];
    private _featuresFound: FeatureFound[] = [];

    constructor(private readonly _webFeaturesData: Record<string, any>) {
        this._featuresToReview = FEATURES_TO_REVIEW;
    }

    resetFeatureFoundList() {
        this._featuresFound = new Array(this._featuresToReview.length);
    }

    async findFiles(): Promise<vscode.Uri[]> {
        return vscode.workspace.findFiles(
            '**/*.{css,scss,html,jsx,tsx,astro}',
            '**/node_modules/*'
        );
    }

    async start(): Promise<FeatureFound[]> {
        const files = await this.findFiles();
        this.resetFeatureFoundList();
        const results = await Promise.all(this._featuresToReview.map(async (feature: ReviewUse) => {
            console.log(`checking feature ${feature.title}`);
            let featureFound: FeatureFound | null = null;
            for (let file of files) {
                // console.log(file.fsPath);
                if (await feature.isPresent(file.fsPath)) {
                    if (featureFound === null) {
                        featureFound = {
                            feature,
                            description: this._webFeaturesData["features"][feature.featureId]["description_html"],
                            browsers: this._webFeaturesData["features"][feature.featureId]["status"]["support"],
                            baselineSupportLevel: this._webFeaturesData["features"][feature.featureId]["status"]["baseline"],
                            baselineSupportDate: this._webFeaturesData["features"][feature.featureId]["status"]["baseline_low_date"],
                            locations: [],
                        };
                    }
                    featureFound.locations.push({ filePath: vscode.workspace.asRelativePath(file.fsPath) });
                }
            }
            return featureFound;
        }));
        this._featuresFound = results.filter(result => result !== null);
        return this._featuresFound;
    }

    public get featuresFound(): FeatureFound[] {
        return this._featuresFound;
    }
}
