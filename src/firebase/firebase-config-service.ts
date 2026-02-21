export class FirebaseConfigService {
  constructor(public readonly apiKey: string) {
    if (!apiKey) {
      throw new Error('API Key is required');
    }
  }
}
