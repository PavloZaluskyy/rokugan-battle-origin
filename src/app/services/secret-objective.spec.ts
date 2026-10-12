import { TestBed } from '@angular/core/testing';

import { SecretObjective } from './secret-objective';

describe('SecretObjective', () => {
  let service: SecretObjective;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SecretObjective);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
