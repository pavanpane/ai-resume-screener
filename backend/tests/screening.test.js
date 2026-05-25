const request = require('supertest');
const express = require('express');
const screeningRoutes = require('../src/routes/screeningRoutes');
const { screenResume } = require('../src/controllers/screeningController');

process.env.HUGGING_FACE_API_KEY = 'test-token';

// Mock the controller to avoid actual API calls
jest.mock('../src/controllers/screeningController', () => ({
  screenResume: jest.fn((req, res) => {
    res.status(200).json({
      analysis: {
        skills: ['React', 'Node.js'],
        experience: 5,
        strengths: ['Teamwork'],
        missing_requirements: ['AWS']
      },
      decision: 'interview',
      interview_questions: ['What is a closure?', 'What is the event loop?'],
      recruiter_summary: 'A good candidate.'
    });
  })
}));

const app = express();
app.use(express.json());
app.use('/api', screeningRoutes);

describe('POST /api/screen', () => {
  it('should return a 200 OK status and a valid JSON response', async () => {
    const resumeText = 'This is a test resume.';
    const response = await request(app)
      .post('/api/screen')
      .send({ resume: resumeText });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('analysis');
    expect(response.body).toHaveProperty('decision');
    expect(response.body).toHaveProperty('recruiter_summary');
    expect(screenResume).toHaveBeenCalled();
  });

  it('should return a 400 Bad Request status if resume is not provided', async () => {
    // Restore the original implementation for this test
    const originalScreenResume = jest.requireActual('../src/controllers/screeningController').screenResume;
    require('../src/controllers/screeningController').screenResume.mockImplementation(originalScreenResume);
    
    const response = await request(app)
      .post('/api/screen')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Resume content is required' });
    
    // Restore the mock for other tests
    require('../src/controllers/screeningController').screenResume.mockImplementation((req, res) => {
        res.status(200).json({ decision: 'mocked' });
    });
  });
});
