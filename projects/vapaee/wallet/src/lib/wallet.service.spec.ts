import { TestBed } from '@angular/core/testing';

import { VapaeeWallet } from './wallet.service';

describe('VapaeeWallet', () => {
  let service: VapaeeWallet;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VapaeeWallet);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
