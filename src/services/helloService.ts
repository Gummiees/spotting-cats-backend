import { HelloResponse } from '@/types';

export class HelloService {
  static getHelloMessage(name?: string): HelloResponse {
    const message = name ? `Hello ${name}!` : 'Hello World!';

    return {
      message,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
  }

  static getWelcomeMessage(): string {
    return 'Hello World! Welcome to the Backend API';
  }
}
