
# AI-Powered Resume Screening and Interview Generator

This is a full-stack application that uses AI to screen resumes, and based on the analysis, generates either interview questions or a rejection letter.

## Features

*   **Resume Analysis**: Extracts skills, experience, strengths, and missing requirements from a resume.
*   **Automated Decision Making**: Based on a match score, the application decides whether to proceed with an interview or reject the candidate.
*   **Dynamic Content Generation**:
    *   Generates advanced technical interview questions for qualified candidates.
    *   Provides constructive feedback and rejection reasons for candidates who are not a good fit.
*   **Recruiter Summary**: Creates a concise summary of the candidate's profile for the recruiter.

## Architecture

The application is composed of a React frontend and a Node.js (Express) backend. It interacts with the Hugging Face Inference API for all AI-powered text generation tasks.

### Tech Stack

*   **Frontend**: React, Axios
*   **Backend**: Node.js, Express
*   **AI**: Hugging Face Inference API

## Getting Started

### Prerequisites

*   Node.js and npm
*   Hugging Face API Token

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/ai-resume-screener.git
    cd ai-resume-screener
    ```

2.  **Backend Setup:**
    ```bash
    cd backend
    npm install
    ```

3.  **Frontend Setup:**
    ```bash
    cd ../frontend
    npm install
    ```

### Environment Variables

Create a `.env` file in the `backend` directory with the following content:

```
HUGGING_FACE_API_KEY=your_hugging_face_api_key
```

### Running the Application

1.  **Start the backend server:**
    ```bash
    cd backend
    npm start
    ```

2.  **Start the frontend development server:**
    ```bash
    cd ../frontend
    npm start
    ```

The application will be available at `http://localhost:3000`.

## API Endpoints

*   `POST /api/screen`: The main endpoint that takes a resume as input and returns the full analysis, including interview questions or rejection feedback, and a recruiter summary.

### Request Body

```json
{
  "resume": "The text of the resume..."
}
```

### Success Response (for a qualified candidate)

```json
{
  "analysis": {
    "skills": [...],
    "experience": [...],
    "strengths": [...],
    "missing_requirements": [...]
  },
  "decision": "interview",
  "interview_questions": [...],
  "recruiter_summary": "..."
}
```

### Success Response (for an unqualified candidate)

```json
{
  "analysis": {
    "skills": [...],
    "experience": [...],
...
  },
  "decision": "reject",
  "rejection_reason": "...",
  "improvement_suggestions": "...",
  "recruiter_summary": "..."
}
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
