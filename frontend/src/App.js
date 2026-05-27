import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const ROLES = {
  frontend: 'Frontend Engineer',
  backend: 'Backend Engineer',
  fullstack: 'Full Stack Engineer',
  devops: 'DevOps Engineer',
  dataengineer: 'Data Engineer'
};

function App() {
  const [resume, setResume] = useState('');
  const [file, setFile] = useState(null);
  const [inputMode, setInputMode] = useState('text');
  const [selectedRole, setSelectedRole] = useState('fullstack');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        setFile(null);
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleScreenResume = async () => {
    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const apiUrl = `http://localhost:5000/api/screen/${selectedRole}`;
      if (inputMode === 'file' && file) {
        const formData = new FormData();
        formData.append('resume', file);
        const response = await axios.post(apiUrl, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setAnalysis(response.data);
      } else if (inputMode === 'text' && resume) {
        const response = await axios.post(apiUrl, { resume });
        setAnalysis(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze resume. Please try again.');
      console.error(err);
    }
    setLoading(false);
  };

  const handleModeSwitch = (mode) => {
    setInputMode(mode);
    setError('');
    setAnalysis(null);
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center">AI Resume Screener</h1>

      <div className="card mt-4">
        <div className="card-body">
          <label className="form-label"><strong>Select Job Role</strong></label>
          <select
            className="form-select"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            {Object.entries(ROLES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="btn-group mt-4 w-100" role="group">
        <input
          type="radio"
          className="btn-check"
          name="inputMode"
          id="textMode"
          checked={inputMode === 'text'}
          onChange={() => handleModeSwitch('text')}
        />
        <label className="btn btn-outline-primary" htmlFor="textMode">
          Paste Text
        </label>

        <input
          type="radio"
          className="btn-check"
          name="inputMode"
          id="fileMode"
          checked={inputMode === 'file'}
          onChange={() => handleModeSwitch('file')}
        />
        <label className="btn btn-outline-primary" htmlFor="fileMode">
          Upload PDF
        </label>
      </div>

      <div className="form-group mt-4">
        {inputMode === 'text' ? (
          <textarea
            className="form-control"
            rows="15"
            placeholder="Paste resume here..."
            value={resume}
            onChange={(e) => setResume(e.target.value)}
          ></textarea>
        ) : (
          <div className="border p-4 text-center" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ marginBottom: '1rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#0ea5e9', opacity: 0.6 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <p style={{ color: '#cbd5e1', marginBottom: '1rem' }}>Click to upload your PDF resume</p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              id="pdfInput"
              style={{ display: 'none' }}
            />
            <label htmlFor="pdfInput" className="btn btn-primary" style={{ cursor: 'pointer' }}>
              Choose PDF File
            </label>
            {file && (
              <div className="mt-4" style={{ width: '100%' }}>
                <div className="alert alert-success mb-0">
                  <p style={{ marginBottom: '0.5rem' }}>✓ File selected</p>
                  <strong>{file.name}</strong><br />
                  <small>{(file.size / 1024).toFixed(2)} KB</small>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <button
        className="btn btn-primary mt-3"
        onClick={handleScreenResume}
        disabled={loading || (inputMode === 'text' ? !resume : !file)}
      >
        {loading ? 'Analyzing...' : 'Analyze Resume'}
      </button>

      {error && <div className="alert alert-danger mt-4">{error}</div>}

      {analysis && (
        <div className="mt-5 mb-5">
          <h2 style={{ marginBottom: '2rem' }}>📊 Analysis Result</h2>
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
          <div className="card mb-4">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h5 className="card-title mb-0">💼 {analysis.role}</h5>
                <div style={{
                  backgroundColor: analysis.score >= 70 ? 'rgba(16, 185, 129, 0.2)' : analysis.score >= 50 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  border: `2px solid ${analysis.score >= 70 ? '#10b981' : analysis.score >= 50 ? '#f59e0b' : '#ef4444'}`
                }}>
                  <strong style={{ fontSize: '1.5rem', color: analysis.score >= 70 ? '#6ee7b7' : analysis.score >= 50 ? '#fcd34d' : '#fca5a5' }}>
                    {analysis.score}%
                  </strong>
                </div>
              </div>

              {analysis.roleEvaluation && (
                <div className="mb-4" style={{ backgroundColor: 'rgba(14, 165, 233, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                  <h6 style={{ marginBottom: '1rem', color: '#38bdf8' }}>🎯 Role Fit Analysis</h6>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <p style={{ marginBottom: '0.5rem', color: '#cbd5e1' }}><strong>✓ Matched Skills</strong></p>
                      <p style={{ color: '#6ee7b7' }}>{analysis.roleEvaluation.matchedSkills.length > 0 ? analysis.roleEvaluation.matchedSkills.join(', ') : 'None'}</p>
                    </div>
                    <div>
                      <p style={{ marginBottom: '0.5rem', color: '#cbd5e1' }}><strong>✗ Missing Required</strong></p>
                      <p style={{ color: '#fca5a5' }}>{analysis.roleEvaluation.missingRequiredSkills.length > 0 ? analysis.roleEvaluation.missingRequiredSkills.join(', ') : 'None'}</p>
                    </div>
                    <div>
                      <p style={{ marginBottom: '0.5rem', color: '#cbd5e1' }}><strong>⭐ Preferred Skills</strong></p>
                      <p style={{ color: '#fcd34d' }}>{analysis.roleEvaluation.matchedPreferredSkills.length > 0 ? analysis.roleEvaluation.matchedPreferredSkills.join(', ') : 'None'}</p>
                    </div>
                    <div>
                      <p style={{ marginBottom: '0.5rem', color: '#cbd5e1' }}><strong>📅 Experience Fit</strong></p>
                      <p style={{ color: analysis.roleEvaluation.experienceFit ? '#6ee7b7' : '#fca5a5' }}>
                        {analysis.roleEvaluation.experienceFit ? '✓ Yes' : '✗ No'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <hr />
              <div style={{ marginBottom: '1.5rem' }}>
                <h5 className="card-title" style={{ marginBottom: '0.5rem' }}>
                  {analysis.decision === 'interview' ? '✅ Interview' : '❌ Reject'}
                </h5>
                <p style={{ color: '#cbd5e1', marginBottom: '1rem' }}><strong>Recruiter Summary</strong></p>
                <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>{analysis.recruiter_summary}</p>
              </div>

              {analysis.decision === 'interview' && (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <h6 style={{ marginBottom: '1rem', color: '#6ee7b7' }}>❓ Interview Questions</h6>
                  <ol style={{ paddingLeft: '1.5rem' }}>
                    {analysis.interview_questions.map((q, index) => (
                      <li key={index} style={{ marginBottom: '1rem', color: '#cbd5e1', lineHeight: '1.6' }}>{q.question}</li>
                    ))}
                  </ol>
                </div>
              )}

              {analysis.decision === 'reject' && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem' }}>
                  <h6 style={{ marginBottom: '1rem', color: '#fca5a5' }}>💡 Feedback</h6>
                  <p style={{ marginBottom: '1rem', color: '#cbd5e1' }}><strong>Rejection Reason</strong></p>
                  <p style={{ color: '#cbd5e1', lineHeight: '1.6', marginBottom: '1.5rem' }}>{typeof analysis.rejection_reason === 'string' ? analysis.rejection_reason : JSON.stringify(analysis.rejection_reason, null, 2)}</p>
                  <p style={{ marginBottom: '1rem', color: '#cbd5e1' }}><strong>📈 Improvement Suggestions</strong></p>
                  <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>{typeof analysis.improvement_suggestions === 'string' ? analysis.improvement_suggestions : JSON.stringify(analysis.improvement_suggestions, null, 2)}</p>
                </div>
              )}

              <div style={{ backgroundColor: 'rgba(14, 165, 233, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                <h6 style={{ marginBottom: '1rem', color: '#38bdf8' }}>📋 Resume Details</h6>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <p style={{ marginBottom: '0.5rem', color: '#cbd5e1' }}><strong>Skills</strong></p>
                    <p style={{ color: '#a1d5f7' }}>{analysis.analysis.skills.join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <p style={{ marginBottom: '0.5rem', color: '#cbd5e1' }}><strong>Experience</strong></p>
                    <p style={{ color: '#a1d5f7' }}>{analysis.analysis.experience} years</p>
                  </div>
                  <div>
                    <p style={{ marginBottom: '0.5rem', color: '#cbd5e1' }}><strong>Strengths</strong></p>
                    <p style={{ color: '#a1d5f7' }}>{analysis.analysis.strengths.join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <p style={{ marginBottom: '0.5rem', color: '#cbd5e1' }}><strong>Missing Requirements</strong></p>
                    <p style={{ color: '#a1d5f7' }}>{analysis.analysis.missing_requirements.join(', ') || 'None'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
