import type { RequestHandler } from 'express';
import {
  colorVerseRuntimeMode,
  driveWritesEnabled,
  liveAiEnabled,
} from '../lib/runtime-configuration.js';

function blockedResponse(code: string, error: string) {
  return {
    ok: false,
    code,
    error,
    runtimeMode: colorVerseRuntimeMode(),
    changeAfterTrial: true,
  };
}

export const liveAiTrialGuard: RequestHandler = (request, response, next) => {
  if (request.method !== 'POST' || liveAiEnabled()) {
    next();
    return;
  }
  response.status(503).json(blockedResponse(
    'LIVE_AI_DISABLED_FOR_TRIAL',
    'التوليد الحقيقي مقفل أثناء التجربة. غيّر COLORVERSE_ENABLE_LIVE_AI إلى true بعد إضافة مفتاح Gemini الحقيقي.',
  ));
};

export const driveWriteTrialGuard: RequestHandler = (request, response, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) || driveWritesEnabled()) {
    next();
    return;
  }
  response.status(503).json(blockedResponse(
    'DRIVE_WRITES_DISABLED_FOR_TRIAL',
    'الرفع والتعديل على Google Drive مقفلان أثناء التجربة. غيّر COLORVERSE_ENABLE_DRIVE_WRITES إلى true بعد ضبط حساب الخدمة.',
  ));
};
