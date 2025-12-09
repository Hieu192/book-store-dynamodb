const AWS = require('aws-sdk');

/**
 * Bedrock Client Configuration
 * For RAG (Retrieval Augmented Generation) with Knowledge Base
 */

const bedrockRuntime = new AWS.BedrockRuntime({
    region: process.env.AWS_REGION || 'ap-southeast-1'
});

const bedrockAgent = new AWS.BedrockAgentRuntime({
    region: process.env.AWS_REGION || 'ap-southeast-1'
});

const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID;
const MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0'; // Cheapest, fast model

/**
 * Query Knowledge Base for relevant documents
 * 
 * @param {string} query - User's question
 * @param {number} numberOfResults - Number of results to retrieve
 * @returns {Promise<Array>} Retrieved documents
 */
async function queryKnowledgeBase(query, numberOfResults = 5) {
    if (!KNOWLEDGE_BASE_ID) {
        throw new Error('KNOWLEDGE_BASE_ID not configured');
    }

    try {
        const params = {
            knowledgeBaseId: KNOWLEDGE_BASE_ID,
            retrievalQuery: {
                text: query
            },
            retrievalConfiguration: {
                vectorSearchConfiguration: {
                    numberOfResults: numberOfResults
                }
            }
        };

        const response = await bedrockAgent.retrieve(params).promise();

        console.log(`Retrieved ${response.retrievalResults?.length || 0} documents from KB`);

        return response.retrievalResults || [];
    } catch (error) {
        console.error('Knowledge Base query error:', error);
        throw error;
    }
}

/**
 * Generate response using Claude with context from Knowledge Base
 * 
 * @param {string} userMessage - User's message
 * @param {Array} kbResults - Results from Knowledge Base
 * @param {Array} conversationHistory - Previous messages (optional)
 * @returns {Promise<Object>} { text: string, sources: Array }
 */
async function generateResponse(userMessage, kbResults = [], conversationHistory = []) {
    try {
        // Format context from KB results
        let context = '';
        const sources = [];

        if (kbResults && kbResults.length > 0) {
            context = 'Relevant information from our database:\n\n';
            kbResults.forEach((result, index) => {
                context += `[${index + 1}] ${result.content.text}\n\n`;

                // Extract source metadata
                if (result.location) {
                    sources.push({
                        uri: result.location.s3Location?.uri,
                        score: result.score
                    });
                }
            });
        }

        // Build conversation context
        let conversationContext = '';
        if (conversationHistory.length > 0) {
            conversationContext = 'Previous conversation:\n';
            conversationHistory.forEach(msg => {
                conversationContext += `${msg.sender}: ${msg.content}\n`;
            });
            conversationContext += '\n';
        }

        // Create prompt
        const systemPrompt = `You are a helpful customer service assistant for an online bookstore. 
Use the provided context to answer questions accurately. 
If you don't know the answer, say so politely.
Always be friendly and professional.
Answer in Vietnamese if the question is in Vietnamese, otherwise use English.`;

        const userPrompt = `${conversationContext}${context}\n\nCustomer question: ${userMessage}\n\nAssistant:`;

        // Call Claude
        const params = {
            modelId: MODEL_ID,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 1000,
                temperature: 0.7,
                system: systemPrompt,
                messages: [{
                    role: 'user',
                    content: userPrompt
                }]
            })
        };

        const response = await bedrockRuntime.invokeModel(params).promise();
        const result = JSON.parse(response.body.toString());

        return {
            text: result.content[0].text,
            sources: sources,
            model: MODEL_ID,
            stopReason: result.stop_reason
        };
    } catch (error) {
        console.error('Bedrock generation error:', error);
        throw error;
    }
}

/**
 * Generate response using RetrieveAndGenerate API (simplified RAG)
 * Alternative to separate retrieve + generate
 * 
 * @param {string} userMessage - User's message
 * @returns {Promise<Object>} { text: string, sources: Array }
 */
async function retrieveAndGenerate(userMessage) {
    if (!KNOWLEDGE_BASE_ID) {
        throw new Error('KNOWLEDGE_BASE_ID not configured');
    }

    try {
        const params = {
            input: {
                text: userMessage
            },
            retrieveAndGenerateConfiguration: {
                type: 'KNOWLEDGE_BASE',
                knowledgeBaseConfiguration: {
                    knowledgeBaseId: KNOWLEDGE_BASE_ID,
                    modelArn: `arn:aws:bedrock:${process.env.AWS_REGION}::foundation-model/${MODEL_ID}`
                }
            }
        };

        const response = await bedrockAgent.retrieveAndGenerate(params).promise();

        return {
            text: response.output.text,
            sources: response.citations || [],
            sessionId: response.sessionId
        };
    } catch (error) {
        console.error('RetrieveAndGenerate error:', error);
        throw error;
    }
}

module.exports = {
    queryKnowledgeBase,
    generateResponse,
    retrieveAndGenerate,
    KNOWLEDGE_BASE_ID,
    MODEL_ID
};
