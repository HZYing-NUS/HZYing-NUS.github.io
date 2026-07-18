import { ChatGenerator } from '@/shared/blocks/chat/generator';
import { getUserInfo } from '@/shared/models/user';

export default async function ChatPage() {
  const user = await getUserInfo();

  return <ChatGenerator initiallyAuthenticated={Boolean(user)} />;
}
