import type { ChatRequestOptions, ChatTransport, UIMessage, UIMessageChunk } from 'ai';

/**
 * MockChatTransport — returns a streamed "Echo: {your message}" response.
 *
 * Implements the ChatTransport interface from Vercel AI SDK v5.
 * The `sendMessages` method must return a ReadableStream<UIMessageChunk>
 * — a stream of plain JavaScript objects (not HTTP/SSE text).
 *
 * Chunk sequence for one text reply:
 *   { type: 'start' }
 *   { type: 'text-start', id: 'text-0' }
 *   { type: 'text-delta', id: 'text-0', delta: 'word' }  ← one per word
 *   { type: 'text-end',   id: 'text-0' }
 *   { type: 'finish' }
 *
 * In Phase 2 this is replaced by DefaultChatTransport pointing at the
 * Cloudflare Worker:
 *   new DefaultChatTransport({ api: '/api/chat' })
 */
export class MockChatTransport implements ChatTransport<UIMessage> {
  sendMessages({
    messages,
    abortSignal,
  }: {
    trigger: 'submit-message' | 'regenerate-message';
    chatId: string;
    messageId: string | undefined;
    messages: UIMessage[];
    abortSignal: AbortSignal | undefined;
  } & ChatRequestOptions): Promise<ReadableStream<UIMessageChunk>> {
    // Extract the text from the last user message
    const lastMessage = messages[messages.length - 1];
    const userText =
      lastMessage?.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join(' ') ?? '(empty)';

    const echoText = `Echo: ${userText}`;
    const words = echoText.split(' ');

    const stream = new ReadableStream<UIMessageChunk>({
      async start(controller) {
        if (abortSignal?.aborted) {
          controller.close();
          return;
        }

        // 1. Start the assistant message
        controller.enqueue({ type: 'start' });

        // 2. Open a text block — the 'id' links start/delta/end together
        controller.enqueue({ type: 'text-start', id: 'text-0' });

        // 3. Stream each word with a short delay to make streaming visible
        for (let i = 0; i < words.length; i++) {
          if (abortSignal?.aborted) break;

          const delta = i === 0 ? words[i] : ' ' + words[i];
          controller.enqueue({ type: 'text-delta', id: 'text-0', delta });

          // Simulate network latency — 80ms between words
          await new Promise<void>((resolve) => setTimeout(resolve, 80));
        }

        // 4. Close the text block
        controller.enqueue({ type: 'text-end', id: 'text-0' });

        // 5. Finish the message (returns useChat status to 'ready')
        controller.enqueue({ type: 'finish' });

        controller.close();
      },
    });

    return Promise.resolve(stream);
  }

  reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    // No reconnection logic needed for the mock
    return Promise.resolve(null);
  }
}