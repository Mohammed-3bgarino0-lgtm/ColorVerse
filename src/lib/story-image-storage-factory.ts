import { FileStoryImageStorage, type StoryImageStorage } from './story-image-storage';
import {
  GoogleDriveStoryImageStorage,
  isGoogleDriveStorageConfigured,
} from './google-drive-storage';
import { GoogleDriveClient } from './google-drive-client';
import { driveWritesEnabled } from './runtime-configuration';

export interface StoryImageStorageSelection {
  storage: StoryImageStorage;
  type: 'google-drive' | 'server-filesystem';
}

export function createStoryImageStorage(): StoryImageStorageSelection {
  const client = new GoogleDriveClient();
  if (driveWritesEnabled() && isGoogleDriveStorageConfigured(client)) {
    return {
      storage: new GoogleDriveStoryImageStorage(client),
      type: 'google-drive',
    };
  }
  return {
    storage: new FileStoryImageStorage(),
    type: 'server-filesystem',
  };
}
