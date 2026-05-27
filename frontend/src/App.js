import React, { useState, useEffect } from 'react';
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
  const [files, setFiles] = useState([]);
  const [inputMode, setInputMode] = useState('text');
  const [screenMode, setScreenMode] = useState('single');
  const [selectedRole, setSelectedRole] = useState('fullstack');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Global Logic Screening';
  }, []);

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

  const handleMultipleFilesChange = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const fileArray = Array.from(selectedFiles);
      const newFiles = [...files, ...fileArray];

      if (newFiles.length > 10) {
        setError('Maximum 10 PDF files allowed. You already have ' + files.length);
        e.target.value = '';
        return;
      }

      for (let f of fileArray) {
        if (f.type !== 'application/pdf') {
          setError('Only PDF files are allowed');
          e.target.value = '';
          return;
        }
        if (f.size > 5 * 1024 * 1024) {
          setError('File size must be less than 5MB');
          e.target.value = '';
          return;
        }
      }

      // Check for duplicate filenames
      const duplicates = fileArray.filter(newFile =>
        files.some(existingFile => existingFile.name === newFile.name)
      );

      if (duplicates.length > 0) {
        setError(`Duplicate files: ${duplicates.map(f => f.name).join(', ')}`);
        e.target.value = '';
        return;
      }

      setFiles(newFiles);
      setError('');
      e.target.value = '';
    }
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleScreenResume = async () => {
    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      // Batch mode with multiple files
      if (screenMode === 'batch' && files.length > 0) {
        const apiUrl = `http://localhost:9999/api/batch-screen/${selectedRole}`;
        const formData = new FormData();
        files.forEach(f => formData.append('resumes', f));
        const response = await axios.post(apiUrl, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000
        });
        setAnalysis(response.data);
      }
      // Single mode with file or text
      else if (inputMode === 'file' && file) {
        const apiUrl = `http://localhost:9999/api/screen/${selectedRole}`;
        const formData = new FormData();
        formData.append('resume', file);
        const response = await axios.post(apiUrl, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setAnalysis(response.data);
      } else if (inputMode === 'text' && resume) {
        const apiUrl = `http://localhost:9999/api/screen/${selectedRole}`;
        const response = await axios.post(apiUrl, { resume });
        setAnalysis(response.data);
      } else {
        setError('Please provide resume content or upload file(s)');
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

  const handleScreenModeSwitch = (mode) => {
    setScreenMode(mode);
    setError('');
    setAnalysis(null);
    setFiles([]);
    setFile(null);
    setResume('');
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center">Global Logic Screening</h1>

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
          name="screenMode"
          id="singleMode"
          checked={screenMode === 'single'}
          onChange={() => handleScreenModeSwitch('single')}
        />
        <label className="btn btn-outline-success" htmlFor="singleMode">
          Single Resume
        </label>

        <input
          type="radio"
          className="btn-check"
          name="screenMode"
          id="batchMode"
          checked={screenMode === 'batch'}
          onChange={() => handleScreenModeSwitch('batch')}
        />
        <label className="btn btn-outline-success" htmlFor="batchMode">
          Batch (5-10 PDFs)
        </label>
      </div>

      {screenMode === 'single' && (
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
      )}

      <div className="form-group mt-4">
        {screenMode === 'single' ? (
          <>
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
          </>
        ) : (
          <div className="border p-4 text-center" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ marginBottom: '1rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#10b981', opacity: 0.6 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <p style={{ color: '#cbd5e1', marginBottom: '1rem' }}>Upload 5-10 PDF resumes for batch screening</p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleMultipleFilesChange}
              id="batchPdfInput"
              style={{ display: 'none' }}
              multiple
            />
            <label htmlFor="batchPdfInput" className="btn btn-success" style={{ cursor: 'pointer' }}>
              Choose PDF Files
            </label>
            {files.length > 0 && (
              <div className="mt-4" style={{ width: '100%' }}>
                <div className="alert alert-success mb-3">
                  <p style={{ marginBottom: '0.5rem' }}>✓ {files.length} file(s) selected</p>
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {files.map((f, idx) => (
                    <div key={idx} className="alert alert-info mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{f.name}</strong><br />
                        <small>{(f.size / 1024).toFixed(2)} KB</small>
                      </div>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removeFile(idx)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <button
        className="btn btn-primary mt-3"
        onClick={handleScreenResume}
        disabled={loading || (screenMode === 'batch' ? files.length === 0 : inputMode === 'text' ? !resume : !file)}
      >
        {loading ? (screenMode === 'batch' ? 'Processing Batch...' : 'Analyzing...') : (screenMode === 'batch' ? `Analyze ${files.length} Resumes` : 'Analyze Resume')}
      </button>

      {error && <div className="alert alert-danger mt-4">{error}</div>}

      {analysis && analysis.batch_id && (
        <div className="mt-5 mb-5">
          <h2 style={{ marginBottom: '2rem' }}>📊 Batch Analysis Results</h2>

          <div className="card mb-4">
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ color: '#cbd5e1', marginBottom: '0.5rem' }}>Total Processed</p>
                  <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#6ee7b7' }}>{analysis.processed}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ color: '#cbd5e1', marginBottom: '0.5rem' }}>Interview</p>
                  <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#6ee7b7' }}>{analysis.summary.interview_count}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ color: '#cbd5e1', marginBottom: '0.5rem' }}>Reject</p>
                  <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fca5a5' }}>{analysis.summary.reject_count}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ color: '#cbd5e1', marginBottom: '0.5rem' }}>Avg Score</p>
                  <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fcd34d' }}>{analysis.summary.average_score}%</p>
                </div>
              </div>

              <h5 style={{ marginBottom: '1.5rem', color: '#38bdf8' }}>Candidate Summaries</h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {analysis.summaries.map((item, idx) => (
                  <div key={idx} style={{ backgroundColor: 'rgba(14, 165, 233, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <p style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '0.5rem', wordBreak: 'break-word' }}>{item.filename}</p>
                        <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                          {item.decision === 'interview' ? '✅ Interview' : '❌ Reject'} • Score: {item.score}%
                        </p>
                        {item.verified && (
                          <p style={{ color: '#6ee7b7', fontSize: '0.85rem' }}>✓ Verified by LLM Judge</p>
                        )}
                      </div>
                    </div>
                    <p style={{ color: '#a1d5f7', fontSize: '0.9rem', lineHeight: '1.5' }}>{item.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h5 style={{ marginBottom: '1.5rem', marginTop: '2rem' }}>Detailed Results</h5>
          {analysis.results.map((result, idx) => (
            <div key={idx} className="card mb-3">
              <div className="card-body">
                <h6 style={{ color: '#38bdf8', marginBottom: '1rem' }}>📄 {result.filename}</h6>
                {result.error ? (
                  <div className="alert alert-warning mb-0">{result.error}</div>
                ) : (
                  <div>
                    <p style={{ color: '#cbd5e1', marginBottom: '1rem' }}>
                      <strong>Decision:</strong> {result.decision === 'interview' ? '✅ Interview' : '❌ Reject'} • <strong>Score:</strong> {result.score}%
                    </p>
                    <div style={{ backgroundColor: 'rgba(14, 165, 233, 0.05)', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
                      <p style={{ color: '#cbd5e1', marginBottom: '0.5rem' }}><strong>Skills Found:</strong></p>
                      <p style={{ color: '#a1d5f7' }}>{result.candidate_analysis.skills.join(', ') || 'None'}</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                      <div>
                        <p style={{ color: '#cbd5e1', marginBottom: '0.3rem' }}><strong>Experience:</strong></p>
                        <p style={{ color: '#a1d5f7' }}>{result.candidate_analysis.experience} years</p>
                      </div>
                      <div>
                        <p style={{ color: '#cbd5e1', marginBottom: '0.3rem' }}><strong>Matched Skills:</strong></p>
                        <p style={{ color: '#6ee7b7' }}>{result.matched_skills.join(', ') || 'None'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {analysis && !analysis.batch_id && (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <p style={{ color: '#cbd5e1', marginBottom: '0' }}><strong>Recruiter Summary</strong></p>
                  {analysis.summary_validation && analysis.summary_validation.verified && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.5)',
                      borderRadius: '20px',
                      padding: '0.3rem 0.8rem',
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}>
                      <span style={{ color: '#6ee7b7' }}>✓</span>
                      <span style={{ color: '#6ee7b7' }}>Verified by LLM Judge</span>
                      <span style={{
                        color: '#a7f3d0',
                        fontSize: '0.75rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.3)',
                        borderRadius: '12px',
                        padding: '0.2rem 0.4rem'
                      }}>
                        {analysis.summary_validation.confidence}%
                      </span>
                    </div>
                  )}
                </div>
                <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                  {analysis.recruiter_summary.replace(/^Here's a 2-3 sentence summary for a recruiter:\s*/, '').trim()}
                </p>
                {analysis.summary_validation && analysis.summary_validation.verified && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    borderLeft: '3px solid #6ee7b7',
                    borderRadius: '4px'
                  }}>
                    <p style={{ color: '#a1d5f7', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong>✓ Verification Details:</strong>
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ color: '#cbd5e1' }}>Confidence: </span>
                        <span style={{ color: '#6ee7b7', fontWeight: '600' }}>{analysis.summary_validation.confidence}%</span>
                      </div>
                      <div>
                        <span style={{ color: '#cbd5e1' }}>Attempts: </span>
                        <span style={{ color: '#6ee7b7', fontWeight: '600' }}>{analysis.summary_validation.attempts}</span>
                      </div>
                    </div>
                  </div>
                )}
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

                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ marginBottom: '0.75rem', color: '#cbd5e1' }}><strong>Skills</strong></p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {analysis.analysis.skills.map((skill, idx) => (
                      <span key={idx} style={{ backgroundColor: 'rgba(14, 165, 233, 0.2)', color: '#a1d5f7', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ marginBottom: '0.75rem', color: '#cbd5e1' }}><strong>Experience</strong></p>
                  <p style={{ color: '#a1d5f7', fontSize: '1.1rem', fontWeight: '600' }}>{analysis.analysis.experience} years</p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ marginBottom: '0.75rem', color: '#cbd5e1' }}><strong>💪 Strengths</strong></p>
                  {analysis.analysis.strengths.length > 0 ? (
                    <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
                      {analysis.analysis.strengths.map((strength, idx) => (
                        <li key={idx} style={{ color: '#6ee7b7', marginBottom: '0.5rem' }}>{strength}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: '#a1d5f7' }}>None</p>
                  )}
                </div>

                <div>
                  <p style={{ marginBottom: '0.75rem', color: '#cbd5e1' }}><strong>Missing Requirements</strong></p>
                  {analysis.analysis.missing_requirements.length > 0 ? (
                    <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
                      {analysis.analysis.missing_requirements.map((req, idx) => (
                        <li key={idx} style={{ color: '#fca5a5', marginBottom: '0.5rem' }}>{req}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: '#a1d5f7' }}>None</p>
                  )}
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
