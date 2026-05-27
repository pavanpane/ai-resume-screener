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

    const summaryPrompt = `Based on the following analysis, generate a 2-3 sentence summary for a recruiter.
Analysis:
${JSON.stringify(analysis, null, 2)}`;
    const summaryModel = 'meta-llama/Llama-3.1-8B-Instruct:novita';
    const summaryResult = await callHuggingFaceApi(summaryModel, summaryPrompt);
    const recruiter_summary = summaryResult.trim();
    const summarySafetyCheck = await checkContentSafety(recruiter_summary);

    res.json({
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
      safety_checks: {
        analysis_safe: analysisSafetyCheck.is_safe,
        analysis_warning: !analysisSafetyCheck.is_safe ? analysisSafetyCheck.reason : null,
        secondary_content_safe: secondCallSafetyCheck.is_safe,
        secondary_content_warning: !secondCallSafetyCheck.is_safe ? secondCallSafetyCheck.reason : null,
        summary_safe: summarySafetyCheck.is_safe,
        summary_warning: !summarySafetyCheck.is_safe ? summarySafetyCheck.reason : null,
      },
    });
  } catch (error) {
    console.error("Error in screenResume:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  screenResume,
  extractTextFromPDF,
};
