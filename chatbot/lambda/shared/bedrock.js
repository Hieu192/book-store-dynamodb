const AWS = require('aws-sdk');

const BEDROCK_REGION = 'us-east-1';

const bedrockRuntime = new AWS.BedrockRuntime({
    region: BEDROCK_REGION
});

const bedrockAgent = new AWS.BedrockAgentRuntime({
    region: BEDROCK_REGION
});

const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID;
const MODEL_ID = 'amazon.nova-lite-v1:0';  // Corrected model ID

function isVietnamese(text) {
    return /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(text);
}

async function queryKnowledgeBase(query, numberOfResults = 5) {
    if (!KNOWLEDGE_BASE_ID) {
        throw new Error('KNOWLEDGE_BASE_ID not configured');
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
        console.log(`Retrieved ${response.retrievalResults?.length || 0} documents from KB`);
        return response.retrievalResults || [];
    } catch (error) {
        console.error('Knowledge Base query error:', error);
        throw error;
    }
}

async function generateResponse(userMessage, kbResults = [], conversationHistory = []) {
    try {
        const isVN = isVietnamese(userMessage);
        const targetLanguage = isVN ? 'Vietnamese' : 'English';

        // Format KB context
        let kbContext = '';
        const sources = [];

        if (kbResults && kbResults.length > 0) {
            kbContext = 'AVAILABLE BOOKS IN OUR STORE:\n\n';
            kbResults.forEach((result, index) => {
                kbContext += `Book ${index + 1}:\n${result.content.text}\n---\n`;
                if (result.location) {
                    sources.push({
                        uri: result.location.s3Location?.uri,
                        score: result.score
                    });
                }
            });
        }

        // Format conversation history
        let historyContext = '';
        if (conversationHistory.length > 0) {
            historyContext = 'Recent conversation:\n';
            conversationHistory.forEach(msg => {
                historyContext += `${msg.sender === 'user' ? 'Customer' : 'You'}: ${msg.content}\n`;
            });
            historyContext += '\n';
        }

        // Professional salesperson system prompt
        const systemPrompt = `You are a professional book salesperson at an online bookstore. Your goal is to help customers find the perfect book.

PERSONA:
- Friendly, helpful, and consultative (not pushy)
- Knowledgeable about books in your store
- Ask smart questions to understand customer needs
- Provide honest recommendations based on what you have

LANGUAGE RULE (CRITICAL):
${isVN ?
                'Customer speaks Vietnamese. You MUST respond in Vietnamese with proper Vietnamese grammar and tone.' :
                'Customer speaks English. You MUST respond in English.'}
NEVER mix languages. NEVER use English if customer uses Vietnamese.

SALES APPROACH:

1. WHEN TO ASK QUESTIONS:
   Ask clarifying questions if customer request is:
   - Too vague: "sach hay", "recommend books" (no genre/preference)
   - Only emotion: "buon", "vui", "sad", "happy" (no book type specified)
   - Too broad: "sach tot nhat", "best books" (which category?)
   
   Ask specifically about:
   ${isVN ? '- The loai: manga, tieu thuyet, ky nang song, kinh doanh?' : '- Genre: manga, novel, self-help, business?'}
   ${isVN ? '- Ngan sach: duoi $10, $10-20, tren $20?' : '- Budget: under $10, $10-20, over $20?'}
   ${isVN ? '- So thich: hanh dong, lang man, hai huoc, bieu dam?' : '- Interest: action, romance, comedy, deep?'}

2. WHEN TO RECOMMEND:
   Provide recommendations when customer gives:
   - Specific genre: "manga", "self-help books"
   - Genre + preference: "manga phieu luu", "adventure manga"
   - Genre + budget: "manga duoi $15"
   
   Format MUST include:
   - Book title (bold with **)
   - Author (${isVN ? 'Tac gia' : 'Author'})
   - Price (${isVN ? 'Gia' : 'Price'}) with $ sign
   - Category (${isVN ? 'The loai' : 'Category'})
   - Why recommend (1 sentence)

3. WHEN NOT IN STOCK:
   If book NOT in [AVAILABLE BOOKS], be honest:
   ${isVN ?
                '"Xin loi, hien tai shop chua co [book name]. Tuy nhien, neu ban thich [genre], toi co the goi y [alternative]."' :
                '"Sorry, we dont currently have [book name] in stock. However, if you like [genre], I can recommend [alternative]."'}
   
   NEVER say: "tim o noi khac", "mua online", "tim sap sach khac" (dont send customers away!)
   ALWAYS offer alternatives from your store.

TONE EXAMPLES:
${isVN ? `
GOOD (Professional salesperson):
- "Chao ban! Ban dang tim sach the loai gi a?"
- "Toi hieu ban thich truyen phieu luu! Chung toi co vai dau sach tuyet voi..."
- "Rat tiec, hien tai shop chua co Harry Potter. Neu ban thich fantasy, toi goi y..."

BAD (Too robotic):
- "Toi khong co thong tin nay"
- "Ban co the tim o noi khac"
- "ASSISTANT (Vietnamese):"
` : `
GOOD (Professional salesperson):
- "Hi! What genre are you interested in?"
- "I understand you like adventure stories! We have some excellent titles..."
- "Unfortunately, we don't have Harry Potter right now. If you enjoy fantasy, I recommend..."

BAD (Too robotic):
- "I dont have this information"
- "You can find it elsewhere"
- "ASSISTANT (English):"
`}

RESPONSE FORMAT:
- Speak naturally like a real salesperson
- End after your answer (no "thank you for shopping" unless closing sale)
- Use customer's name if known
- Be warm but professional

EXAMPLES:
${isVN ? `
Customer: "goi y sach hay"
You: "Chao ban! Rat vui duoc giup ban tim sach. Ban dang muon tim sach the loai gi a? Chung toi co manga, tieu thuyet, sach ky nang song, kinh doanh..."

Customer: "manga phieu luu hay"
You: "Tuyet voi! Toi xin goi y 2 bo manga phieu luu cuc hay:

**One Piece - Tap 1**
- Tac gia: Eiichiro Oda
- Gia: $10
- The loai: Manga, Phieu luu
- Cau chuyen ve Luffy va hanh trinh tim kho bau huyen thoai One Piece - rat hap dan!

**Naruto - Tap 1**
- Tac gia: Masashi Kishimoto  
- Gia: $12
- The loai: Manga, Hanh dong, Phieu luu
- Theo chan ninja Naruto voi uoc mo tro thanh Hokage - rat cam hung!

Ban thich bo nao hon a?"

Customer: "co Harry Potter khong?"
You: "Xin loi ban, hien tai shop chua co bo Harry Potter. Tuy nhien, neu ban thich sach fantasy phep thuat, toi rat muon goi y ban bo Chua Nhan - cung la the gioi phep thuat day ky ao va phieu luu! Ban co muon xem khong?"
` : `
Customer: "recommend good books"
You: "Hi! I'd love to help you find something great. What genre interests you? We have manga, novels, self-help, business books..."

Customer: "adventure manga"
You: "Excellent choice! I recommend these 2 fantastic adventure manga:

**One Piece - Volume 1**
- Author: Eiichiro Oda
- Price: $10
- Category: Manga, Adventure
- Luffy's epic quest for the legendary One Piece treasure - absolutely gripping!

**Naruto - Volume 1**
- Author: Masashi Kishimoto
- Price: $12
- Category: Manga, Action, Adventure  
- Follow young ninja Naruto's journey to become Hokage - very inspiringAre you interested in either of these?"

Customer: "do you have Harry Potter?"
You: "I'm sorry, we don't currently have Harry Potter in stock. However, if you enjoy fantasy wizardry, I'd love to recommend The Lord of the Rings - it's also a magical world full of wonder and adventure! Would you like to hear more?"
`}`;

        const userContent = `${historyContext}
${kbContext.length > 0 ? kbContext : 'NOTE: No books found in knowledge base for this query'}

Customer says: "${userMessage}"

Respond as a helpful book salesperson:`;

        console.log(`Generating Nova response in: ${targetLanguage}`);

        // Nova API format (messages array)
        const params = {
            modelId: MODEL_ID,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                text: `${systemPrompt}\n\n${userContent}`
                            }
                        ]
                    }
                ],
                inferenceConfig: {
                    maxTokens: 1000,
                    temperature: 0.7,
                    topP: 0.9
                }
            })
        };

        const response = await bedrockRuntime.invokeModel(params).promise();
        const result = JSON.parse(response.body.toString());

        // Nova response format
        let text = result.output.message.content[0].text.trim();

        // Clean up any artifacts
        text = text
            .replace(/^(You:|Assistant:|ASSISTANT \(.*?\):)\s*/gim, '')
            .replace(/\n*(Thank you for shopping|Cam on ban da mua hang).*$/gim, '')
            .trim();

        return { text, sources, model: MODEL_ID };
    } catch (error) {
        console.error('Bedrock Nova error:', error);
        throw error;
    }
}

async function retrieveAndGenerate(userMessage) {
    if (!KNOWLEDGE_BASE_ID) {
        throw new Error('KNOWLEDGE_BASE_ID not configured');
    }

    try {
        const params = {
            input: { text: userMessage },
            retrieveAndGenerateConfiguration: {
                type: 'KNOWLEDGE_BASE',
                knowledgeBaseConfiguration: {
                    knowledgeBaseId: KNOWLEDGE_BASE_ID,
                    modelArn: `arn:aws:bedrock:${BEDROCK_REGION}::foundation-model/${MODEL_ID}`
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
