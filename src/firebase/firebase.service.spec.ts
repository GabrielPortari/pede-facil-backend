import { FirebaseService } from './firebase.service';

describe('FirebaseService', () => {
  let service: FirebaseService;

  beforeEach(() => {
    const mockConfig: any = { apiKey: 'test' };
    service = new FirebaseService(mockConfig);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
