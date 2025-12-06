import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HomePage } from './home.page';
import { PoseService } from '../services/pose.service';
import { FrameExtractorService } from '../services/frame-extractor.service';
import { AnalysisService } from '../services/analysis.service';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    const poseServiceMock = { estimate: jasmine.createSpy('estimate'), dispose: jasmine.createSpy('dispose') };
    const frameExtractorMock = { extractFrames: jasmine.createSpy('extractFrames').and.resolveTo([]) };
    const analysisServiceMock = {
      buildFrame: jasmine.createSpy('buildFrame'),
      summarize: jasmine.createSpy('summarize').and.returnValue({ phases: [], summary: [], frameCount: 0, duration: 0 }),
    };

    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot(), FormsModule],
      providers: [
        { provide: PoseService, useValue: poseServiceMock },
        { provide: FrameExtractorService, useValue: frameExtractorMock },
        { provide: AnalysisService, useValue: analysisServiceMock },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
