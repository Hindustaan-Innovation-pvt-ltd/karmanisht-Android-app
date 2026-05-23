async function run() {
  const tags = ["Fan installation", "AC gas refilling", "Tap repair"];
  const text = tags.join("\n");
  const q = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${q}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    // Google Translate returns an array of segment results
    const translatedSegments = data[0].map(s => s[0]).join("");
    const translatedTags = translatedSegments.split("\n").map(t => t.trim());
    
    console.log("Original Tags:", tags);
    console.log("Translated Tags:", translatedTags);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
