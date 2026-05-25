const { OpenAI } = require("openai");

const client = new OpenAI({
	baseURL: "https://router.huggingface.co/v1",
	apiKey: process.env.HUGGING_FACE_API_KEY,
});

const MAX_RESUME_SIZE = 50000; // 50KB

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
}

const screenResume = async (req, res) => {
  const { resume } = req.body;

  if (!resume) {
    return res.status(400).json({ error: 'Resume content is required' });
  }

  try {
    validateResume(resume);
    const analysisPrompt = `Analyze the provided resume for a software engineer position. Extract skills, years of experience (as a number), strengths, and any missing key requirements.
Return a JSON object with the following structure: {"skills": [], "experience": 0, "strengths": [], "missing_requirements": []}.
Do not include any text other than the JSON object.

Resume:
${resume}`;
    const analysisModel = 'meta-llama/Llama-3.1-8B-Instruct:novita';
    const analysisResult = await callHuggingFaceApi(analysisModel, analysisPrompt);
    const analysis = parseJsonResponse(analysisResult);

    // More sophisticated scoring logic
    const score = (analysis.skills.length * 5) + (analysis.experience * 10) + (analysis.strengths.length * 2);

    let decision, secondCallResult;

    if (score > 40) {
      decision = 'interview';
      const questionsPrompt = `Generate 5 advanced technical interview questions for a software engineer based on these skills: ${analysis.skills.join(', ')}. Return a JSON object with a single key "interview_questions" which is an array of objects, where each object has a "question" key. Example: { "interview_questions": [{ "question": "Describe a time you used Java streams." }] }`;
      const questionsModel = 'meta-llama/Llama-3.1-8B-Instruct:novita';
      const questionsResult = await callHuggingFaceApi(questionsModel, questionsPrompt);
      const questionsData = parseJsonResponse(questionsResult);
      secondCallResult = { interview_questions: questionsData.interview_questions };

    } else {
      decision = 'reject';
      const rejectionPrompt = `The candidate is not a good fit for a software engineer role based on this analysis:
${JSON.stringify(analysis, null, 2)}
Generate a polite rejection reason and provide constructive suggestions for improvement.
Return a JSON object with two keys: "rejection_reason" and "improvement_suggestions".`;
      const rejectionModel = 'meta-llama/Llama-3.1-8B-Instruct:novita';
      const rejectionResult = await callHuggingFaceApi(rejectionModel, rejectionPrompt);
      secondCallResult = parseJsonResponse(rejectionResult);
    }

    const summaryPrompt = `Based on the following analysis, generate a 2-3 sentence summary for a recruiter.
Analysis:
${JSON.stringify(analysis, null, 2)}`;
    const summaryModel = 'meta-llama/Llama-3.1-8B-Instruct:novita';
    const summaryResult = await callHuggingFaceApi(summaryModel, summaryPrompt);
    const recruiter_summary = summaryResult.trim();

    res.json({
      analysis,
      decision,
      ...secondCallResult,
      recruiter_summary,
    });
  } catch (error) {
    console.error("Error in screenResume:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  screenResume,
};
