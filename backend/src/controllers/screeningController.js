const { OpenAI } = require("openai");
const { getDocument } = require('pdfjs-dist/legacy/build/pdf');
const roles = require('../config/roles');

const client = new OpenAI({
	baseURL: "https://router.huggingface.co/v1",
	apiKey: process.env.HUGGINGFACE_API_KEY,
});

const MAX_RESUME_SIZE = 50000; // 50KB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const extractTextFromPDF = async (pdfBuffer) => {
  try {
    const uint8Array = new Uint8Array(pdfBuffer);
    const pdf = await getDocument({ data: uint8Array }).promise;
    let extractedText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      extractedText += pageText + ' ';
    }

    extractedText = extractedText.trim();

    if (!extractedText || extractedText.length === 0) {
      throw new Error('No text found in PDF');
    }

    return extractedText;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
};

const validateResume = (resume) => {
  if (!resume || typeof resume !== 'string') {
    throw new Error('Resume must be a non-empty string');
  }
  if (resume.length > MAX_RESUME_SIZE) {
    throw new Error(`Resume exceeds maximum size of ${MAX_RESUME_SIZE} characters`);
  }
  if (/```|[\x00\x1a]/g.test(resume)) {
    throw new Error('Resume contains invalid characters');
  }
};

const callHuggingFaceApi = async (model, prompt) => {
  try {
    const chatCompletion = await client.chat.completions.create({
      model: model,
      messages: [
          {
              role: "user",
              content: prompt,
          },
      ],
    });
    return chatCompletion.choices[0].message.content;
  } catch (error) {
    console.error(`Error calling Hugging Face API for model ${model}:`, error);
    throw new Error('Failed to get response from AI model');
  }
};

const checkContentSafety = async (content) => {
  try {
    const safetyCheckPrompt = `You are a content safety classifier. Analyze the following text and determine if it contains any unsafe, offensive, harmful, or inappropriate content. Respond with a JSON object: {"is_safe": true/false, "reason": "explanation if unsafe"}

Content to analyze:
${content}`;

    const safetyModel = 'meta-llama/Llama-Guard-3-8B';
    const safetyResult = await callHuggingFaceApi(safetyModel, safetyCheckPrompt);

    try {
      // Try to parse JSON response from safety model
      const jsonMatch = safetyResult.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      // Fallback: check if response contains safety indicators
      const lowercaseResult = safetyResult.toLowerCase();
      return {
        is_safe: !lowercaseResult.includes('unsafe') && !lowercaseResult.includes('harmful'),
        reason: safetyResult
      };
    } catch (parseError) {
      console.error('Failed to parse safety check response:', safetyResult);
      // Default to safe if we can't parse (to avoid blocking valid content)
      return { is_safe: true, reason: 'Unable to parse safety response' };
    }
  } catch (error) {
    console.error('Error checking content safety:', error);
    // Default to safe if safety check fails
    return { is_safe: true, reason: 'Safety check unavailable' };
  }
};

const parseJsonResponse = (text) => {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```|(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error('Invalid JSON response from model');
  }
  // If the model returns a JSON block, it will be in group 1. If it returns a raw JSON object, it will be in group 2.
  const jsonString = jsonMatch[1] || jsonMatch[2];
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse JSON:", jsonString);
    throw new Error('Failed to parse JSON response from model');
  }
};

const validateRecruiterSummary = async (summary, analysis, roleEvaluation) => {
  try {
    const validationPrompt = `You are a validation judge. Evaluate if the recruiter summary accurately reflects the candidate's profile.

Extracted Data:
- Skills: ${analysis.skills.join(', ')}
- Years of Experience: ${analysis.experience}
- Strengths: ${analysis.strengths.join(', ')}
- Missing Skills: ${roleEvaluation.feedback.missingRequiredSkills.join(', ')}

Recruiter Summary:
"${summary}"

Check if the summary:
1. Mentions key extracted skills
2. Reflects the years of experience accurately
3. Highlights key strengths
4. Is truthful and not misleading

Return a JSON object: {"is_accurate": true/false, "missing_information": [], "discrepancies": [], "confidence": 0-100}`;

    const validationModel = 'meta-llama/Llama-3.1-8B-Instruct:novita';
    const validationResult = await callHuggingFaceApi(validationModel, validationPrompt);
    const validationData = parseJsonResponse(validationResult);

    return {
      is_accurate: validationData.is_accurate,
      missing_information: validationData.missing_information || [],
      discrepancies: validationData.discrepancies || [],
      confidence: validationData.confidence || 0,
      validation_summary: validationResult
    };
  } catch (error) {
    console.error('Error validating recruiter summary:', error);
    return {
      is_accurate: null,
      missing_information: [],
      discrepancies: [],
      confidence: 0,
      validation_error: error.message
    };
  }
};

const generateAndValidateRecruiterSummary = async (analysis, roleEvaluation, maxRetries = 10) => {
  let attempt = 0;
  let recruiter_summary = '';
  let summaryValidation = null;
  let verified = false;

  console.log(`[SUMMARY_VALIDATION] Starting summary generation with max retries: ${maxRetries}`);

  while (attempt < maxRetries) {
    attempt++;
    console.log(`[SUMMARY_VALIDATION] Generating recruiter summary - Attempt ${attempt}/${maxRetries}`);

    const summaryPrompt = `Based on the following analysis, generate a 2-3 sentence summary for a recruiter.
Make sure to clearly mention:
1. The candidate's key skills
2. Years of experience
3. Main strengths

Be concise and accurate.
Analysis:
${JSON.stringify(analysis, null, 2)}`;

    const summaryModel = 'meta-llama/Llama-3.1-8B-Instruct:novita';
    const summaryResult = await callHuggingFaceApi(summaryModel, summaryPrompt);
    recruiter_summary = summaryResult.trim();

    // Validate the generated summary
    console.log(`[SUMMARY_VALIDATION] Validating summary...`);
    summaryValidation = await validateRecruiterSummary(recruiter_summary, analysis, roleEvaluation);
    console.log(`[SUMMARY_VALIDATION] Validation result - Accurate: ${summaryValidation.is_accurate}, Confidence: ${summaryValidation.confidence}`);

    // Check if summary is accurate and confidence is acceptable (>= 70)
    if (summaryValidation.is_accurate === true && summaryValidation.confidence >= 70) {
      verified = true;
      console.log(`[SUMMARY_VALIDATION] ✓ Summary verified on attempt ${attempt}`);
      break;
    } else {
      console.log(`[SUMMARY_VALIDATION] ✗ Summary validation failed on attempt ${attempt}. Confidence: ${summaryValidation.confidence}, Discrepancies: ${summaryValidation.discrepancies.length}`);
    }
  }

  // If not verified after max retries, throw error to guarantee verified summary
  if (!verified) {
    const errorMsg = `Failed to generate a verified recruiter summary after ${maxRetries} attempts. Last validation confidence: ${summaryValidation.confidence}%`;
    console.error(`[SUMMARY_VALIDATION] ${errorMsg}`);
    throw new Error(errorMsg);
  }
  console.log(`[SUMMARY_VALIDATION] Summary generation and validation complete!`);

  return {
    recruiter_summary,
    validated: summaryValidation,
    verified: true,
    attempts: attempt
  };
};

const evaluateCandidateForRole = (analysis, roleKey) => {
  const role = roles[roleKey];
  if (!role) {
    throw new Error('Invalid role specified');
  }

  let score = 0;
  const feedback = {
    matchedSkills: [],
    missingRequiredSkills: [],
    matchedPreferredSkills: [],
    experienceFit: false
  };

  const candidateSkills = (analysis.skills || []).map(s => s.toLowerCase());
  const candidateExperience = analysis.experience || 0;

  // Check required skills (40% weight)
  const requiredSkillsLower = role.requiredSkills.map(s => s.toLowerCase());
  let requiredSkillsMatch = 0;
  for (const skill of requiredSkillsLower) {
    if (candidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))) {
      feedback.matchedSkills.push(skill);
      requiredSkillsMatch++;
    } else {
      feedback.missingRequiredSkills.push(skill);
    }
  }
  const requiredSkillsScore = (requiredSkillsMatch / role.requiredSkills.length) * 40;

  // Check experience (30% weight)
  const experienceScore = candidateExperience >= role.minYearsExperience ? 30 : (candidateExperience / role.minYearsExperience) * 30;
  if (candidateExperience >= role.minYearsExperience) {
    feedback.experienceFit = true;
  }

  // Check preferred skills (30% weight)
  const preferredSkillsLower = role.preferredSkills.map(s => s.toLowerCase());
  let preferredSkillsMatch = 0;
  for (const skill of preferredSkillsLower) {
    if (candidateSkills.some(cs => cs.includes(skill) || skill.includes(cs))) {
      feedback.matchedPreferredSkills.push(skill);
      preferredSkillsMatch++;
    }
  }
  const preferredSkillsScore = (preferredSkillsMatch / role.preferredSkills.length) * 30;

  score = requiredSkillsScore + experienceScore + preferredSkillsScore;

  return {
    score: Math.round(score),
    role: role.name,
    feedback,
    decision: score >= role.scoreThresholds.interview ? 'interview' : 'reject'
  };
};

const screenResume = async (req, res) => {
  const textResume = req.body.resume;
  const file = req.file;
  const roleKey = req.params.role || 'fullstack';

  if (!roles[roleKey]) {
    return res.status(400).json({ error: `Invalid role. Supported roles: ${Object.keys(roles).join(', ')}` });
  }

  if (!textResume && !file) {
    return res.status(400).json({ error: 'Resume content or PDF file is required' });
  }

  try {
    let resume;
    if (file) {
      resume = await extractTextFromPDF(file.buffer);
    } else {
      resume = textResume;
    }

    validateResume(resume);
    const analysisPrompt = `Analyze the provided resume. Extract skills, years of experience (as a number), strengths, and any missing key requirements.
Return a JSON object with the following structure: {"skills": [], "experience": 0, "strengths": [], "missing_requirements": []}.
Do not include any text other than the JSON object.

Resume:
${resume}`;
    const analysisModel = 'meta-llama/Llama-3.1-8B-Instruct:novita';
    const analysisResult = await callHuggingFaceApi(analysisModel, analysisPrompt);
    const analysis = parseJsonResponse(analysisResult);

    // Check safety of analysis
    const analysisSafetyCheck = await checkContentSafety(JSON.stringify(analysis));

    // Role-based evaluation
    const roleEvaluation = evaluateCandidateForRole(analysis, roleKey);
    const decision = roleEvaluation.decision;

    let secondCallResult, secondCallSafetyCheck;

    if (decision === 'interview') {
      const questionsPrompt = `Generate 5 technical interview questions for a ${roles[roleKey].name} position. The candidate has these skills: ${analysis.skills.join(', ')}. Focus on their strengths: ${analysis.strengths.join(', ')}. Return a JSON object with a single key "interview_questions" which is an array of objects, where each object has a "question" key. Example: { "interview_questions": [{ "question": "Describe a time you used Java streams." }] }`;
      const questionsModel = 'meta-llama/Llama-3.1-8B-Instruct:novita';
      const questionsResult = await callHuggingFaceApi(questionsModel, questionsPrompt);
      const questionsData = parseJsonResponse(questionsResult);
      secondCallResult = { interview_questions: questionsData.interview_questions };
      secondCallSafetyCheck = await checkContentSafety(questionsResult);

    } else {
      const rejectionPrompt = `The candidate is not a good fit for a ${roles[roleKey].name} role.
Analysis: ${JSON.stringify(analysis, null, 2)}
Missing required skills: ${roleEvaluation.feedback.missingRequiredSkills.join(', ')}
Experience: ${analysis.experience} years (required: ${roles[roleKey].minYearsExperience})
Generate a polite rejection reason and provide constructive suggestions for improvement to match this role.
Return a JSON object with two keys: "rejection_reason" and "improvement_suggestions".`;
      const rejectionModel = 'meta-llama/Llama-3.1-8B-Instruct:novita';
      const rejectionResult = await callHuggingFaceApi(rejectionModel, rejectionPrompt);
      secondCallResult = parseJsonResponse(rejectionResult);
      secondCallSafetyCheck = await checkContentSafety(rejectionResult);
    }

    // Generate and validate recruiter summary with retry logic
    let summaryResult, recruiter_summary, summarySafetyCheck;
    try {
      summaryResult = await generateAndValidateRecruiterSummary(analysis, roleEvaluation);
      recruiter_summary = summaryResult.recruiter_summary;
      summarySafetyCheck = await checkContentSafety(recruiter_summary);
    } catch (summaryError) {
      console.error("Error generating verified summary:", summaryError.message);
      // Fallback: return error response instead of crashing
      return res.status(500).json({ error: `Failed to generate verified recruiter summary: ${summaryError.message}` });
    }

    try {
      const responseData = {
        analysis,
        decision,
        role: roleEvaluation.role,
        score: roleEvaluation.score,
        roleEvaluation: {
          matchedSkills: roleEvaluation.feedback.matchedSkills,
          missingRequiredSkills: roleEvaluation.feedback.missingRequiredSkills,
          matchedPreferredSkills: roleEvaluation.feedback.matchedPreferredSkills,
          experienceFit: roleEvaluation.feedback.experienceFit,
        },
        ...secondCallResult,
        recruiter_summary,
        summary_validation: {
          verified: summaryResult.verified,
          is_accurate: summaryResult.validated.is_accurate,
          missing_information: summaryResult.validated.missing_information,
          discrepancies: summaryResult.validated.discrepancies,
          confidence: summaryResult.validated.confidence,
          attempts: summaryResult.attempts,
        },
        safety_checks: {
          analysis_safe: analysisSafetyCheck.is_safe,
          analysis_warning: !analysisSafetyCheck.is_safe ? analysisSafetyCheck.reason : null,
          secondary_content_safe: secondCallSafetyCheck.is_safe,
          secondary_content_warning: !secondCallSafetyCheck.is_safe ? secondCallSafetyCheck.reason : null,
          summary_safe: summarySafetyCheck.is_safe,
          summary_warning: !summarySafetyCheck.is_safe ? summarySafetyCheck.reason : null,
        },
      };
      console.log("[RESPONSE] Summary validation data:", responseData.summary_validation);
      res.json(responseData);
    } catch (responseError) {
      console.error("[RESPONSE_ERROR]", responseError);
      res.status(500).json({ error: `Failed to construct response: ${responseError.message}` });
    }
  } catch (error) {
    console.error("Error in screenResume:", error);
    res.status(500).json({ error: error.message });
  }
};

const batchScreenResumes = async (req, res) => {
  const files = req.files;
  const roleKey = req.params.role || 'fullstack';

  if (!roles[roleKey]) {
    return res.status(400).json({ error: `Invalid role. Supported roles: ${Object.keys(roles).join(', ')}` });
  }

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'At least one PDF file is required' });
  }

  if (files.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 PDFs allowed per batch' });
  }

  try {
    console.log(`[BATCH_SCREENING] Starting batch screening of ${files.length} resumes for role: ${roleKey}`);

    const results = [];
    const summaryByFile = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`[BATCH_SCREENING] Processing file ${i + 1}/${files.length}: ${file.originalname}`);

      try {
        const resume = await extractTextFromPDF(file.buffer);
        validateResume(resume);

        // Analyze resume
        const analysisPrompt = `Analyze the provided resume. Extract skills, years of experience (as a number), strengths, and any missing key requirements.
Return a JSON object with the following structure: {"skills": [], "experience": 0, "strengths": [], "missing_requirements": []}.
Do not include any text other than the JSON object.

Resume:
${resume}`;

        const analysisModel = 'meta-llama/Llama-3.1-8B-Instruct:novita';
        const analysisResult = await callHuggingFaceApi(analysisModel, analysisPrompt);
        const analysis = parseJsonResponse(analysisResult);

        // Role evaluation
        const roleEvaluation = evaluateCandidateForRole(analysis, roleKey);
        const decision = roleEvaluation.decision;

        // Generate and validate summary
        let summaryResult;
        try {
          summaryResult = await generateAndValidateRecruiterSummary(analysis, roleEvaluation);
        } catch (summaryError) {
          console.error(`[BATCH_SCREENING] Summary generation failed for file ${i + 1}`, summaryError.message);
          summaryResult = {
            recruiter_summary: `Unable to generate verified summary. ${summaryError.message}`,
            validated: { is_accurate: false, confidence: 0 },
            verified: false,
            attempts: 0
          };
        }

        const recruiter_summary = summaryResult.recruiter_summary;

        results.push({
          filename: file.originalname,
          candidate_analysis: {
            skills: analysis.skills,
            experience: analysis.experience,
            strengths: analysis.strengths,
          },
          decision,
          role: roleEvaluation.role,
          score: roleEvaluation.score,
          recruiter_summary,
          summary_validation: {
            verified: summaryResult.verified,
            is_accurate: summaryResult.validated.is_accurate,
            confidence: summaryResult.validated.confidence,
            attempts: summaryResult.attempts,
          },
          matched_skills: roleEvaluation.feedback.matchedSkills,
          missing_skills: roleEvaluation.feedback.missingRequiredSkills,
          preferred_skills: roleEvaluation.feedback.matchedPreferredSkills,
          experience_fit: roleEvaluation.feedback.experienceFit,
        });

        summaryByFile.push({
          filename: file.originalname,
          summary: recruiter_summary.replace(/^Here's a 2-3 sentence summary for a recruiter:\s*/, '').trim(),
          decision,
          score: roleEvaluation.score,
          verified: summaryResult.verified
        });

      } catch (fileError) {
        console.error(`[BATCH_SCREENING] Error processing file ${i + 1}:`, fileError.message);
        results.push({
          filename: file.originalname,
          error: fileError.message,
          status: 'failed'
        });
      }
    }

    // Batch summary
    const interviewCount = results.filter(r => r.decision === 'interview' && !r.error).length;
    const rejectCount = results.filter(r => r.decision === 'reject' && !r.error).length;
    const failedCount = results.filter(r => r.error).length;
    const avgScore = results
      .filter(r => !r.error && r.score)
      .reduce((sum, r) => sum + r.score, 0) / (results.length - failedCount);

    console.log(`[BATCH_SCREENING] Batch complete. Interview: ${interviewCount}, Reject: ${rejectCount}, Failed: ${failedCount}`);

    res.json({
      batch_id: Date.now(),
      role: roles[roleKey],
      total_resumes: files.length,
      processed: files.length - failedCount,
      failed: failedCount,
      summary: {
        interview_count: interviewCount,
        reject_count: rejectCount,
        average_score: Math.round(avgScore),
      },
      results,
      summaries: summaryByFile,
    });

  } catch (error) {
    console.error("Error in batchScreenResumes:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  screenResume,
  batchScreenResumes,
  extractTextFromPDF,
};
