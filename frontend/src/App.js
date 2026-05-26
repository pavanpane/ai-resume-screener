import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [resume, setResume] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleScreenResume = async () => {
    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const response = await axios.post('http://localhost:5000/api/screen', { resume });
      setAnalysis(response.data);
    } catch (err) {
      setError('Failed to analyze resume. Please try again.');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center">AI Resume Screener</h1>
      <div className="form-group mt-4">
        <textarea
          className="form-control"
          rows="15"
          placeholder="Paste resume here..."
          value={resume}
          onChange={(e) => setResume(e.target.value)}
        ></textarea>
      </div>
      <button
        className="btn btn-primary mt-3"
        onClick={handleScreenResume}
        disabled={loading || !resume}
      >
        {loading ? 'Analyzing...' : 'Analyze Resume'}
      </button>

      {error && <div className="alert alert-danger mt-4">{error}</div>}

      {analysis && (
        <div className="mt-5">
          <h2>Analysis Result</h2>
          {analysis.safety_checks && (
            <div className="mb-4">
              {!analysis.safety_checks.analysis_safe && (
                <div className="alert alert-warning" role="alert">
                  <strong>⚠️ Safety Warning:</strong> Analysis content flagged as potentially unsafe.
                  <br />
                  <small>{analysis.safety_checks.analysis_warning}</small>
                </div>
              )}
              {!analysis.safety_checks.secondary_content_safe && (
                <div className="alert alert-warning" role="alert">
                  <strong>⚠️ Safety Warning:</strong> Generated content flagged as potentially unsafe.
                  <br />
                  <small>{analysis.safety_checks.secondary_content_warning}</small>
                </div>
              )}
              {!analysis.safety_checks.summary_safe && (
                <div className="alert alert-warning" role="alert">
                  <strong>⚠️ Safety Warning:</strong> Summary content flagged as potentially unsafe.
                  <br />
                  <small>{analysis.safety_checks.summary_warning}</small>
                </div>
              )}
            </div>
          )}
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Decision: {analysis.decision}</h5>
              <p className="card-text"><strong>Recruiter Summary:</strong> {analysis.recruiter_summary}</p>

              {analysis.decision === 'interview' && (
                <div>
                  <h6>Interview Questions:</h6>
                  <ul>
                    {analysis.interview_questions.map((q, index) => (
                      <li key={index}>{q.question}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.decision === 'reject' && (
                <div>
                  <p><strong>Rejection Reason:</strong> {typeof analysis.rejection_reason === 'string' ? analysis.rejection_reason : <pre>{JSON.stringify(analysis.rejection_reason, null, 2)}</pre>}</p>
                  <p><strong>Improvement Suggestions:</strong> {typeof analysis.improvement_suggestions === 'string' ? analysis.improvement_suggestions : <pre>{JSON.stringify(analysis.improvement_suggestions, null, 2)}</pre>}</p>
                </div>
              )}

              <hr />

              <h6>Resume Details:</h6>
              <p><strong>Skills:</strong> {analysis.analysis.skills.join(', ')}</p>
              <p><strong>Experience:</strong> {analysis.analysis.experience}</p>
              <p><strong>Strengths:</strong> {analysis.analysis.strengths.join(', ')}</p>
              <p><strong>Missing Requirements:</strong> {analysis.analysis.missing_requirements.join(', ')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
