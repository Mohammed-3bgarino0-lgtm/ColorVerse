export interface ProductionAssetLike {
  url?: string;
  productionReady?: boolean;
}

export interface ProductionScenePair {
  story?: ProductionAssetLike;
  coloring?: ProductionAssetLike;
}

export interface BookProductionReadinessInput {
  expectedSceneCount: number;
  actualSceneCount: number;
  parentApproved: boolean;
  imageReviewApproved: boolean;
  hero?: ProductionAssetLike;
  cover?: ProductionAssetLike;
  scenes: Record<string, ProductionScenePair>;
}

export interface BookProductionReadiness {
  expectedSceneCount: number;
  actualSceneCount: number;
  sceneCountValid: boolean;
  parentApproved: boolean;
  imageReviewApproved: boolean;
  heroReady: boolean;
  coverReady: boolean;
  storyAssetsReady: number;
  coloringAssetsReady: number;
  requiredSceneAssets: number;
  storyFinalReady: boolean;
  coloringFinalReady: boolean;
  driveArchiveReady: boolean;
  blockers: string[];
}

function assetReady(asset: ProductionAssetLike | undefined): boolean {
  return Boolean(asset?.url && asset.productionReady === true);
}

export function evaluateBookProductionReadiness(
  input: BookProductionReadinessInput,
): BookProductionReadiness {
  const expected = Number(input.expectedSceneCount || 0);
  const actual = Number(input.actualSceneCount || 0);
  const sceneCountValid = [8, 12, 16].includes(expected) && actual === expected;
  const heroReady = assetReady(input.hero);
  const coverReady = assetReady(input.cover);
  let storyAssetsReady = 0;
  let coloringAssetsReady = 0;

  for (let sceneNumber = 1; sceneNumber <= actual; sceneNumber += 1) {
    const pair = input.scenes[String(sceneNumber)] || input.scenes[sceneNumber];
    if (assetReady(pair?.story)) storyAssetsReady += 1;
    if (assetReady(pair?.coloring)) coloringAssetsReady += 1;
  }

  const commonReady = input.parentApproved
    && input.imageReviewApproved
    && sceneCountValid
    && heroReady
    && coverReady
    && actual > 0;
  const storyFinalReady = commonReady && storyAssetsReady === actual;
  const coloringFinalReady = commonReady && coloringAssetsReady === actual;
  const blockers: string[] = [];

  if (!input.parentApproved) blockers.push('PARENT_REVIEW_REQUIRED');
  if (!input.imageReviewApproved) blockers.push('IMAGE_REVIEW_REQUIRED');
  if (!sceneCountValid) blockers.push('SCENE_COUNT_INVALID');
  if (!heroReady) blockers.push('HERO_NOT_PRODUCTION_READY');
  if (!coverReady) blockers.push('COVER_NOT_PRODUCTION_READY');
  if (storyAssetsReady !== actual) blockers.push('STORY_IMAGES_INCOMPLETE');
  if (coloringAssetsReady !== actual) blockers.push('COLORING_IMAGES_INCOMPLETE');

  return {
    expectedSceneCount: expected,
    actualSceneCount: actual,
    sceneCountValid,
    parentApproved: input.parentApproved,
    imageReviewApproved: input.imageReviewApproved,
    heroReady,
    coverReady,
    storyAssetsReady,
    coloringAssetsReady,
    requiredSceneAssets: actual,
    storyFinalReady,
    coloringFinalReady,
    driveArchiveReady: storyFinalReady && coloringFinalReady,
    blockers,
  };
}
