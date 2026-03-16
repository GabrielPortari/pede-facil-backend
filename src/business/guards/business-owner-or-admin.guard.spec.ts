import { ExecutionContext } from '@nestjs/common';
import { BusinessOwnerOrAdminGuard } from './business-owner-or-admin.guard';
import { FirebaseService } from 'src/firebase/firebase.service';

describe('BusinessOwnerOrAdminGuard', () => {
  const verifyIdToken = jest.fn();
  const firebaseServiceMock = {
    verifyIdToken,
  } as unknown as FirebaseService;

  const guard = new BusinessOwnerOrAdminGuard(firebaseServiceMock);

  function mockContext(request: any): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows owner when uid matches route id', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'biz-1', role: 'business' });

    const allowed = await guard.canActivate(
      mockContext({
        params: { id: 'biz-1' },
        headers: { authorization: 'Bearer owner-token' },
      }),
    );

    expect(allowed).toBe(true);
  });

  it('allows admin for any business id', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'admin-1', role: 'admin' });

    const allowed = await guard.canActivate(
      mockContext({
        params: { id: 'biz-1' },
        headers: { authorization: 'Bearer admin-token' },
      }),
    );

    expect(allowed).toBe(true);
  });

  it('denies non-owner business', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'biz-2', role: 'business' });

    const allowed = await guard.canActivate(
      mockContext({
        params: { id: 'biz-1' },
        headers: { authorization: 'Bearer other-business-token' },
      }),
    );

    expect(allowed).toBe(false);
  });

  it('denies when token verification fails', async () => {
    verifyIdToken.mockRejectedValue(new Error('invalid token'));

    const allowed = await guard.canActivate(
      mockContext({
        params: { id: 'biz-1' },
        headers: { authorization: 'Bearer invalid-token' },
      }),
    );

    expect(allowed).toBe(false);
  });
});
