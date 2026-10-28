import { TestBed } from '@angular/core/testing';

import { RegionCardService } from './region-card.service';

describe('RegionCardService', () => {
  let service: RegionCardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RegionCardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
