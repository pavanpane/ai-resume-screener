# AI-Powered Resume Screening and Interview Generator

## Project Overview

An intelligent full-stack application that automates the resume screening process using advanced AI models. The system analyzes resumes to extract key information, evaluate candidates against role requirements, and generate tailored content—either technical interview questions for qualified candidates or constructive feedback for those who don't match.

**Key Capability**: Screens individual resumes or batch processes up to 10 PDFs simultaneously, making it scalable for recruitment pipelines.

## Setup Instructions

### Prerequisites

- **Node.js** (v16 or higher) and npm
- **Hugging Face API Key** ([Get one here](https://huggingface.co/settings/tokens))
- Git

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ai-resume-screener.git
   cd ai-resume-screener
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Configuration**
   
   Create a `.env` file in the `backend` directory:
   ```
   HUGGINGFACE_API_KEY=your_hugging_face_api_key
   ```

5. **Start the Application**
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   npm start
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm start
   ```

The application will be available at `http://localhost:3000`

## Features

### Core Capabilities

- **Resume Analysis**
  - Extracts candidate skills, years of experience, key strengths, and gaps
  - Supports both text input and PDF file uploads
  - Validates resume content for safety and quality

- **Role-Based Evaluation**
  - Configurable roles: Frontend Engineer, Backend Engineer, Full Stack, DevOps, Data Engineer
  - Skill-based scoring system with weighted criteria
  - Automatic pass/reject decision based on role thresholds

- **Dynamic Content Generation**
  - **Interview Path**: Generates 5 tailored technical interview questions based on candidate strengths
  - **Rejection Path**: Provides polite rejection reasons and constructive improvement suggestions

- **Recruiter Summary**
  - AI-generated 2-3 sentence summary highlighting key qualifications
  - **LLM-Verified**: Uses iterative validation (up to 10 retries) to ensure summary accuracy
  - Validates summaries against extracted data for consistency

- **Batch Processing**
  - Process up to 10 resumes in a single request
  - Returns aggregated statistics and individual results
  - Handles partial failures gracefully

- **Content Safety Checks**
  - Validates all AI-generated content for safety and appropriateness
  - Flags potentially unsafe content in responses

### Supported Roles

| Role | Required Skills | Min. Experience | Preferred Skills |
|------|-----------------|-----------------|------------------|
| Frontend Engineer | JavaScript, React, HTML, CSS | 2 years | TypeScript, Vue, Angular |
| Backend Engineer | Node.js, JavaScript, Database, API Design, Python | 3 years | Express, PostgreSQL, Docker |
| Full Stack Engineer | JavaScript, React, Node.js, Database, HTML | 3 years | TypeScript, Express, MongoDB |
| DevOps Engineer | Docker, Kubernetes, AWS, Linux, CI/CD | 3 years | Terraform, Jenkins, Monitoring |
| Data Engineer | Python, SQL, Database, Data Pipelines, ETL | 2 years | Spark, Hadoop, Airflow |

## Architecture & Workflow

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│  - Resume Upload (Text/PDF)                                 │
│  - Role Selection Dropdown                                  │
│  - Results Display (Analysis, Decision, Summary)            │
└──────────────────────┬──────────────────────────────────────┘
                       │ Axios HTTP Requests
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Express.js)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ API Routes                                           │   │
│  │ - POST /api/screen/:role (Single resume)            │   │
│  │ - POST /api/batch-screen/:role (Batch processing)   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Request Processing                                   │   │
│  │ - PDF Extraction (PDFjs)                             │   │
│  │ - Resume Validation                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Core Logic                                           │   │
│  │ - analyzeResume() → Extract skills, experience      │   │
│  │ - evaluateCandidate() → Calculate match score       │   │
│  │ - generateDecision() → Interview or Reject          │   │
│  │ - validateRecruiterSummary() → LLM verification     │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ OpenAI SDK (Hugging Face Router)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Hugging Face Inference API                          │
│  Models Used:                                               │
│  - Meta-Llama-3.1-8B-Instruct (Analysis & Generation)      │
│  - Meta-Llama-Guard-3-8B (Content Safety)                  │
└─────────────────────────────────────────────────────────────┘
```

### Request/Response Flow

#### Single Resume Screening
```
1. User uploads resume (PDF or text) + selects role
2. Backend receives multipart form data
3. Extract text from PDF (if applicable)
4. Validate resume content
5. Call Llama model to analyze and extract data
6. Evaluate candidate against role requirements
7. Generate interview questions or rejection feedback
8. Generate and validate recruiter summary (with retries)
9. Perform safety checks on all generated content
10. Return comprehensive response to frontend
```

#### Batch Processing
```
1. User uploads 1-10 resumes + selects role
2. Process each resume sequentially (same steps as above)
3. Aggregate results (interview count, reject count, avg score)
4. Return batch summary + individual results
```

### Scoring Algorithm

**Weighted Formula:**
- Required Skills Match: 40% weight
- Years of Experience: 30% weight
- Preferred Skills Match: 30% weight

**Example:**
- 75% required skills (30 pts) + Full experience (30 pts) + 50% preferred (15 pts) = **75/100**
- If role threshold is 50, candidate moves to **interview** stage

## AI Capabilities Used

### Models Leveraged

1. **Meta-Llama-3.1-8B-Instruct** (Primary Analysis Model)
   - **Used for**: Resume analysis, interview question generation, rejection feedback
   - **API Endpoint**: Hugging Face Inference API via OpenAI SDK
   - **Base URL**: `https://router.huggingface.co/v1`

2. **Meta-Llama-Guard-3-8B** (Safety Verification)
   - **Used for**: Content safety validation on all AI outputs
   - **Prevents**: Unsafe, offensive, or harmful content in summaries and feedback

3. **Custom Validation Logic** (LLM-Verified Summaries)
   - Iterative validation: Generates summary → Validates accuracy → Retries if needed (up to 10 attempts)
   - Ensures recruiter summaries are factually accurate and match extracted data

### Prompting Techniques

- **Structured Output**: All models instructed to return JSON for consistent parsing
- **Role-Context Prompts**: Questions/feedback tailored to specific job roles
- **Safety Constraints**: Explicit instructions for truthful, non-misleading content
- **Multi-Step Validation**: Summary accuracy verified against extracted skills and experience

## Challenges Faced

### 1. **API Token Security**
   - **Challenge**: Hardcoded API keys in source code exposed sensitive credentials
   - **Solution**: Migrated to environment variables using `process.env.HUGGINGFACE_API_KEY`
   - **Impact**: Improved security posture for production deployments

### 2. **LLM Output Inconsistency**
   - **Challenge**: Models didn't always return valid JSON; formatting varied
   - **Solution**: Implemented robust JSON parsing with fallback extraction logic
   - **Code**: `parseJsonResponse()` handles both JSON blocks and raw objects

### 3. **Summary Validation Reliability**
   - **Challenge**: Initial LLM-generated summaries sometimes contained inaccuracies or omitted key skills
   - **Solution**: Implemented iterative validation loop with retry logic (max 10 attempts)
   - **Threshold**: Requires 70%+ confidence score + accurate flag before accepting summary

### 4. **PDF Text Extraction**
   - **Challenge**: Complex PDFs (scanned images, special formatting) may fail extraction
   - **Solution**: Graceful error handling with user-friendly error messages
   - **Validation**: Resume must contain extractable text; validates character count

### 5. **Content Safety**
   - **Challenge**: Need to prevent generation of biased, discriminatory, or harmful content
   - **Solution**: Post-generation validation using Llama-Guard-3 model
   - **Approach**: All analyses, summaries, and feedback run through safety checks

### 6. **Batch Processing Scalability**
   - **Challenge**: Processing multiple resumes sequentially could be slow
   - **Current**: Sequential processing with individual error handling per file
   - **Trade-off**: Maintains simplicity; parallel processing deferred for future

### 7. **Role Configuration Maintenance**
   - **Challenge**: Skills and thresholds hardcoded in `roles.js`
   - **Current**: Centralized config file allows easy updates
   - **Future**: Could be migrated to database for dynamic role management

## Future Improvements

### Short-Term (High Priority)
1. **Database Integration**
   - Store screening history and candidate profiles
   - Track which summaries required multiple validation attempts
   - Enable analytics on acceptance/rejection rates by role

2. **Enhanced PDF Support**
   - Handle image-based PDFs (OCR integration)
   - Support resumes in multiple languages
   - Preserve formatting information

3. **Role Management UI**
   - Admin panel to add/modify roles and thresholds
   - Custom required and preferred skills per role
   - Dynamic interview question templates

### Medium-Term (Performance & UX)
4. **Parallel Processing**
   - Use Promise.all() for batch resume processing
   - Implement job queue (Bull/RabbitMQ) for large batches
   - Add progress tracking for multi-file uploads

5. **Advanced Analytics Dashboard**
   - Visualize screening trends (acceptance rate, avg scores)
   - Filter results by role, date range, score
   - Export reports (CSV, PDF)

6. **Interview Question Banking**
   - Store and reuse vetted interview questions
   - Category-based question selection (technical, behavioral, system design)
   - Difficulty levels for different experience levels

### Long-Term (Advanced Features)
7. **Model Upgrades**
   - Test with Claude 3+ models for higher quality summaries
   - Fine-tune models with company-specific evaluation criteria
   - Implement prompt caching for repeated role evaluations

8. **Multimodal Support**
   - LinkedIn profile parsing
   - Video interview initial screening
   - GitHub repo analysis for technical candidates

9. **Compliance & Audit Trail**
   - GDPR compliance features (data deletion, consent tracking)
   - Complete audit log of all screening decisions
   - Explainability: Detailed reasoning for accept/reject decisions

10. **Candidate Communication**
    - Auto-generate professional email templates
    - Schedule interview confirmations
    - Send constructive feedback to rejected candidates

## API Endpoints Reference

### Single Resume Screening
```
POST /api/screen/:role
POST /api/screen (defaults to 'fullstack' role)
```

**Request**: Multipart form with `resume` file (PDF) or `resume` field (text)

**Response**:
```json
{
  "analysis": {
    "skills": ["React", "Node.js", ...],
    "experience": 5,
    "strengths": ["..."],
    "missing_requirements": [...]
  },
  "decision": "interview|reject",
  "score": 75,
  "role": "Full Stack Engineer",
  "recruiter_summary": "...",
  "summary_validation": {
    "verified": true,
    "is_accurate": true,
    "confidence": 85,
    "attempts": 2
  },
  "interview_questions": [...] // if decision === "interview"
  "rejection_reason": "...",     // if decision === "reject"
  "improvement_suggestions": "...",
  "safety_checks": { /* ... */ }
}
```

### Batch Resume Screening
```
POST /api/batch-screen/:role
POST /api/batch-screen
```

**Request**: Multipart form with `resumes` files (up to 10 PDFs)

**Response**:
```json
{
  "batch_id": 1234567890,
  "role": {...},
  "total_resumes": 5,
  "processed": 5,
  "failed": 0,
  "summary": {
    "interview_count": 3,
    "reject_count": 2,
    "average_score": 68
  },
  "results": [...],
  "summaries": [...]
}
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | ^19.2 |
| | Bootstrap | ^5.3 |
| | Axios | ^1.16 |
| **Backend** | Node.js | v16+ |
| | Express | ^4.19 |
| | Multer | ^2.1 |
| **AI/ML** | Hugging Face Inference API | - |
| | OpenAI SDK | ^6.39 |
| **PDF Processing** | pdfjs-dist | ^3.11 |

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues, questions, or suggestions, please open an [GitHub issue](https://github.com/your-username/ai-resume-screener/issues).

---

**Last Updated**: May 2026 | **Project Status**: Active Development
