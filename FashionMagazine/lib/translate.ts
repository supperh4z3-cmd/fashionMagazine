
export const translateText = async (text: string, sourceLang: string, targetLang: string): Promise<string | null> => {
  try {
    const langPair = `${sourceLang}|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
    }
    return null;
  } catch (error) {
    console.error("Translation API error:", error);
    return null;
  }
};
