import chatbotTranslations from './chatbotTranslations';

// Merge chatbot translations into existing translations
export const extendTranslations = (existingTranslations) => {
    return {
        vi: {
            ...existingTranslations.vi,
            ...chatbotTranslations.vi,
        },
        en: {
            ...existingTranslations.en,
            ...chatbotTranslations.en,
        }
    };
};

export default chatbotTranslations;
