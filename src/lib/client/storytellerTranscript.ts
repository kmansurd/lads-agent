import type { StorytellerChatMessage } from '@/lib/client/storytellerChatStorage';

export function formatStorytellerTranscript(messages: StorytellerChatMessage[]): string {
  if (messages.length === 0) return '';
  return messages
    .map((m) => {
      const label = m.sender === 'user' ? 'You' : 'Data Storyteller';
      return `${label}:\n${m.text}`;
    })
    .join('\n\n');
}

export function formatLastExchange(messages: StorytellerChatMessage[]): string {
  let lastUser: StorytellerChatMessage | null = null;
  let lastBot: StorytellerChatMessage | null = null;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (!lastBot && m.sender === 'bot') lastBot = m;
    if (!lastUser && m.sender === 'user') lastUser = m;
    if (lastUser && lastBot) break;
  }
  const parts: string[] = [];
  if (lastUser) parts.push(`You:\n${lastUser.text}`);
  if (lastBot) parts.push(`Data Storyteller:\n${lastBot.text}`);
  return parts.join('\n\n');
}
