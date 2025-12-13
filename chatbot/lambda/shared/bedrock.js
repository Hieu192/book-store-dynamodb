const AWS = require('aws-sdk');
const axios = require('axios');

const BEDROCK_REGION = 'us-east-1';

const bedrockRuntime = new AWS.BedrockRuntime({
    region: BEDROCK_REGION
});

const bedrockAgent = new AWS.BedrockAgentRuntime({
    region: BEDROCK_REGION
});

const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID;
const MODEL_ID = 'amazon.nova-lite-v1:0';
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:4000/api/v1';

// Import modular prompts
const PERSONA = require('./prompts/persona');
const PRODUCT_RECOMMENDATIONS = require('./prompts/productRecommendations');
const ORDER_MANAGEMENT = require('./prompts/orderManagement');
const SECURITY_RULES = require('./prompts/securityRules');

// Import tools
const ORDER_TOOLS = require('./tools/orderTools');

function isVietnamese(text) {
    return /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(text);
}

/**
 * Query Knowledge Base for product information
 */
async function queryKnowledgeBase(query, numberOfResults = 5) {
    if (!KNOWLEDGE_BASE_ID) {
        console.log('⚠️ KNOWLEDGE_BASE_ID not configured, skipping KB query');
        return [];
    }

    try {
        const params = {
            knowledgeBaseId: KNOWLEDGE_BASE_ID,
            retrievalQuery: { text: query },
            retrievalConfiguration: {
                vectorSearchConfiguration: { numberOfResults: numberOfResults }
            }
        };

        const response = await bedrockAgent.retrieve(params).promise();
        console.log(`📚 Retrieved ${response.retrievalResults?.length || 0} documents from KB`);
        return response.retrievalResults || [];
    } catch (error) {
        console.error('❌ Knowledge Base query error:', error);
        return []; // Return empty array instead of throwing
    }
}

/**
 * Build modular system prompt
 */
function buildSystemPrompt(features = {}) {
    const {
        hasOrderTracking = false,
        hasProductRecommendations = true
    } = features;

    let sections = [PERSONA];

    if (hasProductRecommendations) {
        sections.push(PRODUCT_RECOMMENDATIONS);
    }

    if (hasOrderTracking) {
        sections.push(ORDER_MANAGEMENT);
    }

    sections.push(SECURITY_RULES);

    return sections.join('\n\n');
}

/**
 * Execute tool call by calling backend APIs
 * Uses EXISTING order controller endpoints - no duplication
 */
async function executeToolCall(toolName, toolInput, authToken) {
    console.log(`🔧 Executing tool: ${toolName}`, toolInput);

    try {
        switch (toolName) {
            case 'get_user_orders': {
                // ✅ Use existing endpoint: GET /api/v1/orders/me
                const response = await axios.get(
                    `${BACKEND_API_URL}/orders/me`,
                    {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 5000
                    }
                );

                console.log(`✅ Tool response: ${response.data.orders.length} orders found`);
                return {
                    success: true,
                    orders: response.data.orders,
                    count: response.data.orders.length
                };
            }

            case 'get_order_details': {
                // ✅ Use existing endpoint: GET /api/v1/order/:id
                const { orderId } = toolInput;

                if (!orderId) {
                    return {
                        success: false,
                        error: 'Order ID is required'
                    };
                }

                const response = await axios.get(
                    `${BACKEND_API_URL}/order/${orderId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 5000
                    }
                );

                console.log(`✅ Tool response: Order details retrieved`);
                return {
                    success: true,
                    order: response.data.order
                };
            }

            default:
                console.error(`❌ Unknown tool: ${toolName}`);
                return {
                    success: false,
                    error: `Unknown tool: ${toolName}`
                };
        }
    } catch (error) {
        console.error(`❌ Tool execution error for ${toolName}:`, error.message);

        if (error.response) {
            return {
                success: false,
                error: error.response.data?.message || 'API error occurred',
                statusCode: error.response.status
            };
        }

        return {
            success: false,
            error: error.message || 'Failed to execute tool'
        };
    }
}

/**
 * Generate response with Function Calling support
 */
async function generateResponseWithTools(userMessage, conversationHistory = [], authToken = null) {
    try {
        console.log('🤖 Starting generateResponseWithTools...');

        const isVN = isVietnamese(userMessage);

        // Build system prompt with order tracking if auth token available
        const systemPrompt = buildSystemPrompt({
            hasOrderTracking: !!authToken,
            hasProductRecommendations: true
        });

        // Query Knowledge Base for product info
        let kbResults = [];
        try {
            kbResults = await queryKnowledgeBase(userMessage, 3);
        } catch (kbError) {
            console.error('KB query failed, continuing without it:', kbError);
        }

        // Format KB context
        let kbContext = '';
        if (kbResults && kbResults.length > 0) {
            kbContext = '\n\nAVAILABLE BOOKS IN STORE:\n';
            kbResults.forEach((result, index) => {
                kbContext += `\nBook ${index + 1}:\n${result.content.text}\n`;
            });
        }

        // Build messages for Converse API
        const messages = [
            ...conversationHistory.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: [{ text: msg.content }]
            })),
            {
                role: 'user',
                content: [{ text: userMessage + kbContext }]
            }
        ];

        // Prepare tools (only if authenticated)
        const tools = authToken ? ORDER_TOOLS : [];
        console.log(`🔧 Tools configuration: authToken=${!!authToken}, tools count=${tools.length}`);

        let continueLoop = true;
        let finalResponse = '';
        let toolResults = [];

        while (continueLoop) {
            const params = {
                modelId: MODEL_ID,
                messages: messages,
                system: [{ text: systemPrompt }],
                inferenceConfig: {
                    maxTokens: 2048,
                    temperature: 0.7,
                    topP: 0.9
                }
            };

            // Only add toolConfig if we have tools
            if (tools.length > 0) {
                params.toolConfig = { tools };
            }

            console.log('📡 Calling Bedrock Converse API...');
            const response = await bedrockRuntime.converse(params).promise();

            const { stopReason, output } = response;
            console.log(`📊 Stop reason: ${stopReason}`);

            if (stopReason === 'tool_use') {
                // Find tool use block
                const toolUseBlock = output.message.content.find(block => block.toolUse);

                if (toolUseBlock && authToken) {
                    const { toolUse } = toolUseBlock;
                    console.log(`🔧 Tool requested: ${toolUse.name}`);

                    // Execute the tool
                    const toolResult = await executeToolCall(toolUse.name, toolUse.input, authToken);
                    toolResults.push({ tool: toolUse.name, result: toolResult });

                    // Add assistant's tool use to messages
                    messages.push({
                        role: 'assistant',
                        content: output.message.content
                    });

                    // Add tool result to messages
                    messages.push({
                        role: 'user',
                        content: [{
                            toolResult: {
                                toolUseId: toolUse.toolUseId,
                                content: [{ json: toolResult }]
                            }
                        }]
                    });

                    // Continue loop to get final response
                    continue;
                } else {
                    // Tool use but no auth token - shouldn't happen with our logic
                    finalResponse = 'Xin lỗi, em cần xác thực để thực hiện yêu cầu này.';
                    continueLoop = false;
                }
            }
            else if (stopReason === 'end_turn') {
                // Extract text response
                const textBlock = output.message.content.find(block => block.text);
                finalResponse = textBlock ? textBlock.text : 'Xin lỗi, em không hiểu câu hỏi của anh/chị.';
                continueLoop = false;
            }
            else {
                // Other stop reasons (max_tokens, etc.)
                finalResponse = 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.';
                continueLoop = false;
            }
        }

        console.log('✅ Response generated successfully');

        return {
            text: finalResponse,
            sources: kbResults.map(r => ({
                uri: r.location?.s3Location?.uri,
                score: r.score
            })),
            toolsUsed: toolResults
        };

    } catch (error) {
        console.error('❌ generateResponseWithTools error:', error);

        return {
            text: 'Xin lỗi, em đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.',
            sources: [],
            error: error.message
        };
    }
}

/**
 * Legacy function for backwards compatibility
 */
async function generateResponse(userMessage, kbResults = [], conversationHistory = []) {
    // This is the old function - redirect to new implementation
    return generateResponseWithTools(userMessage, conversationHistory, null);
}

module.exports = {
    queryKnowledgeBase,
    generateResponse,
    generateResponseWithTools,
    executeToolCall,
    buildSystemPrompt
};
