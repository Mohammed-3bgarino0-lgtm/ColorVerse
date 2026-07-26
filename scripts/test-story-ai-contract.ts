import assert from 'node:assert/strict';
import {
  GeneratedStoryValidationError,
  parseGeneratedStoryDocument,
  type GeneratedStoryDocument,
} from '../src/lib/generated-story-schema';
import type {
  StoryProvider,
  StoryProviderRequest,
  StoryProviderResponse,
} from '../src/lib/gemini-story-provider';
import { parseStoryGenerationApiInput } from '../src/lib/story-api-contract';
import { generateProfessionalStory } from '../src/lib/story-generation-service';

const input = parseStoryGenerationApiInput({
  childName: 'ليان',
  childAge: 8,
  heroName: 'ليان',
  childStory: 'ليان وجدت نجمة زرقاء. أرادت أن تعيدها إلى السماء.',
  adventure: 'رحلة فضائية عن التعاون والأمانة.',
  moral: 'التعاون والأمانة',
  helperCharacter: 'روبوت مرح',
  templateLabel: 'الفضاء',
  pageCount: 8,
  language: 'ar',
  referenceMode: 'none',
});

function validStory(): GeneratedStoryDocument {
  const sceneTexts = [
    'ليان وجدت نجمة زرقاء قرب نافذة المرصد، فحملتها بلطف وبدأت تفكر في موطنها البعيد.',
    'أرادت أن تعيدها إلى السماء، لذلك طلبت من الروبوت المرح مساعدتها في تجهيز مركبة صغيرة.',
    'انطلقت المركبة، لكن سحابة من الغبار الفضائي أخفت الطريق وجعلت الخريطة غير واضحة.',
    'تعاونت ليان مع الروبوت، فقسمت المهمة بينهما وراجعا الإشارات بهدوء حتى ظهرت بوابة مضيئة.',
    'وجدت ليان طريقًا سريعًا لكنه غير آمن، فاختارت أن تخبر صديقها بالحقيقة وتسلك الطريق الصحيح.',
    'عند حافة المجرة استخدمت ليان فكرة مبتكرة، فجمعت أضواء الكواكب لتصنع جسرًا نحو السماء.',
    'عادت النجمة إلى مكانها، وأضاءت الطريق لكل المسافرين وشكرت ليان على أمانتها وتعاونها.',
    'رجعت ليان سعيدة وكتبت مغامرتها الجديدة، ثم سألت نفسها عن العالم الذي ستكتشفه في المرة القادمة.',
  ];

  return {
    title: 'ليان والنجمة الزرقاء',
    creativeCredit: 'فكرة وتأليف: ليان',
    preservedChildIdeas: [
      'ليان وجدت نجمة زرقاء',
      'أرادت أن تعيدها إلى السماء',
    ],
    moral: 'التعاون والأمانة يساعدان على اتخاذ القرار الصحيح.',
    referenceUsed: null,
    characters: ['ليان', 'روبوت مرح'],
    setting: 'مرصد صغير ثم رحلة بين الكواكب والنجوم.',
    scenes: sceneTexts.map((storyText, index) => ({
      sceneNumber: index + 1,
      beatType: [
        'opening',
        'goal',
        'obstacle',
        'helper',
        'choice',
        'climax',
        'resolution',
        'reflection',
      ][index] as GeneratedStoryDocument['scenes'][number]['beatType'],
      title: `المشهد ${index + 1}`,
      storyText,
      dialogue: index === 3 ? ['قالت ليان: سننجح عندما نتعاون.'] : [],
      illustrationPrompt: `Children's storybook scene ${index + 1}, Layan and a friendly robot in colorful space, consistent characters.`,
      coloringPrompt: `Same scene ${index + 1} as clean black line art for children, white background, consistent characters.`,
    })),
    endingReflection: 'ما العالم الجديد الذي ترغب ليان في الكتابة عنه؟',
  };
}

class FakeStoryProvider implements StoryProvider {
  async generate(request: StoryProviderRequest): Promise<StoryProviderResponse> {
    const story = parseGeneratedStoryDocument(validStory(), request);
    return {
      story,
      model: 'fake-story-model',
      modelVersion: 'test',
      responseId: 'fake-response',
    };
  }
}

const parsed = parseGeneratedStoryDocument(validStory(), {
  pageCount: 8,
  creativeCredit: 'فكرة وتأليف: ليان',
  expectedReferenceId: null,
});
assert.equal(parsed.scenes.length, 8);
assert.equal(parsed.creativeCredit, 'فكرة وتأليف: ليان');

const invalid = { ...validStory(), scenes: validStory().scenes.slice(0, 7) };
assert.throws(
  () =>
    parseGeneratedStoryDocument(invalid, {
      pageCount: 8,
      creativeCredit: 'فكرة وتأليف: ليان',
      expectedReferenceId: null,
    }),
  GeneratedStoryValidationError,
);

const result = await generateProfessionalStory(input, {
  provider: new FakeStoryProvider(),
  maxAttempts: 2,
  random: () => 0,
});

assert.equal(result.story.title, 'ليان والنجمة الزرقاء');
assert.equal(result.review.accepted, true);
assert.equal(result.attempts.length, 1);
assert.equal(result.attempts[0]?.outcome, 'accepted');
assert.equal(result.metadata.referenceId, null);
assert.ok(result.review.report.preservedChildIdeasRatio >= 0.5);

console.log('Story AI contract tests passed.');
