import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { logAuditEvent } from './profileService';

export type FeedbackCategory = 'bug' | 'idea' | 'other';

export const FEEDBACK_CATEGORIES: { key: FeedbackCategory; label: string }[] = [
  { key: 'bug',   label: 'Bug report'         },
  { key: 'idea',  label: 'Idea or suggestion' },
  { key: 'other', label: 'Something else'     },
];

export const MAX_FEEDBACK_LENGTH = 2000;

function currentPlatform(): 'ios' | 'android' | 'web' {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
}

export async function submitFeedback(
  category: FeedbackCategory,
  message: string,
): Promise<void> {
  const trimmed = message.trim();
  if (trimmed.length === 0) throw new Error('Please describe it first.');

  const { error } = await supabase.rpc('submit_feedback', {
    p_category:    category,
    p_message:     trimmed.slice(0, MAX_FEEDBACK_LENGTH),
    p_app_version: Constants.expoConfig?.version ?? null,
    p_platform:    currentPlatform(),
  });

  if (error) {
    if (error.message?.includes('rate limit')) {
      throw new Error("You've sent a lot of feedback recently — please try again later.");
    }
    throw error;
  }

  try {
    await logAuditEvent('feedback_submitted', null, { category });
  } catch {
  }
}
