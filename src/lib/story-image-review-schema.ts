export interface ReviewedImageAsset {
  approved: boolean;
  note?: string;
  updatedAt?: string | null;
}

export interface ReviewedSceneImagePair {
  storyApproved: boolean;
  coloringApproved: boolean;
  pairMatched: boolean;
  note?: string;
  updatedAt?: string | null;
}

export interface StoryImageReview {
  version: number;
  approved: boolean;
  approvedAt?: string | null;
  hero: ReviewedImageAsset;
  cover: ReviewedImageAsset;
  scenes: Record<string, ReviewedSceneImagePair>;
  reviewedAssetCount?: number;
  reviewedPairCount?: number;
  lastChangedAt: string;
}

export function isStoryImageReviewComplete(
  review: StoryImageReview | undefined,
  sceneCount: number,
): boolean {
  if (!review?.hero.approved || !review.cover.approved) return false;
  if (Object.keys(review.scenes).length < sceneCount) return false;
  for (let scene = 1; scene <= sceneCount; scene += 1) {
    const item = review.scenes[String(scene)];
    if (!item?.storyApproved || !item.coloringApproved || !item.pairMatched) return false;
  }
  return review.approved === true && Boolean(review.approvedAt);
}
