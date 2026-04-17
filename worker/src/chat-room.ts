import { DurableObject } from 'cloudflare:workers';
import type { UIMessage } from 'ai';

export class ChatRoom extends DurableObject {
  async getMessages(): Promise<UIMessage[]> {
    const messages = await this.ctx.storage.get<UIMessage[]>('messages');
    return messages ?? [];
  }

  async saveMessages(messages: UIMessage[]): Promise<void> {
    await this.ctx.storage.put('messages', messages);
  }
}
