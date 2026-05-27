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
      const apiUrl = `http://localhost:3001/api/screen/${selectedRole}`;
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
          <div className="border rounded p-4 text-center" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="form-control"
              id="pdfInput"
            />
            {file && (
              <div className="mt-3">
                <p className="text-success">✓ File selected: <strong>{file.name}</strong></p>
                <small className="text-muted">{(file.size / 1024).toFixed(2)} KB</small>
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
              <h5 className="card-title">Role: {analysis.role}</h5>
              <div className="alert alert-info" role="alert">
                <strong>Match Score: {analysis.score}%</strong>
              </div>

              {analysis.roleEvaluation && (
                <div className="mb-3">
                  <h6>Role Fit Analysis</h6>
                  <p><strong>Matched Skills:</strong> {analysis.roleEvaluation.matchedSkills.length > 0 ? analysis.roleEvaluation.matchedSkills.join(', ') : 'None'}</p>
                  <p><strong>Missing Required Skills:</strong> {analysis.roleEvaluation.missingRequiredSkills.length > 0 ? analysis.roleEvaluation.missingRequiredSkills.join(', ') : 'None'}</p>
                  <p><strong>Preferred Skills:</strong> {analysis.roleEvaluation.matchedPreferredSkills.length > 0 ? analysis.roleEvaluation.matchedPreferredSkills.join(', ') : 'None'}</p>
                  <p><strong>Experience Fit:</strong> {analysis.roleEvaluation.experienceFit ? '✓ Yes' : '✗ No'}</p>
                </div>
              )}

              <hr />
              <h5 className="card-title">Decision: {analysis.decision === 'interview' ? '✓ Interview' : '✗ Reject'}</h5>
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
