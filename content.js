

async function fetchTranscriptOfficialYoutube() {
  var videoPageBody = document.body.innerHTML;


  //youtube bot limiting
  if (videoPageBody?.error  ||
    videoPageBody.includes('class="g-recaptcha"') ||
    !videoPageBody.includes('"playabilityStatus":') 
  )
    return { error: true };



  var videoObj = videoPageBody.replace("\n", "")
  .split('"captions":')?.[1]
  ?.split(',"videoDetails')[0]
  

  if (!videoObj) return {error:1}

  const captions = JSON.parse(videoObj)?.playerCaptionsTracklistRenderer;

  if (!captions?.captionTracks)
    return { error: true };

  const track = captions.captionTracks.find(
    (track) => track.languageCode === "en"
  );

  if (!track) return { error: true };

  console.log(track.baseUrl);
  const transcriptBody = await (await fetch(track.baseUrl)).text();

  if (transcriptBody.error) return { error: true };

  const results = [
    ...transcriptBody.matchAll(
      /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g
    ),
  ];

  var transcript = results.map(([, start, duration, text]) => ({
    text,
    duration: parseFloat(duration),
    offset: parseFloat(start),
    lang: track.languageCode,
  }));

  var content = "";
  var timestamps = [];
  transcript.forEach(({ offset, text }) => {
    timestamps.push([content.length, Math.floor(offset, 0)]);

    content += text + " ";
  });

  return { content, timestamps };
}


/**
 * Converts HTML special characters like &<>"'`&rsquo; to & escaped codes or vice versa.
 * It handles named entities and hexadecimal numeric character references.
 *
 * @param {string} str - The string to process.
 * @param {boolean} unescape  default=true - If true, converts & codes to characters.
 *                                     If false, converts characters to codes.
 * @return {string} The processed string.
 * @category HTML Utilities
 * @example
 * var normalHTML = convertHTMLSpecialChars('&lt;p&gt;This &amp; that &copy; 2023 '+
 * '&quot;Quotes&quot;&#39;Apostrophes&#39; &euro;100 &#x263A;&lt;/p&gt;', true)
 * console.log(normalHTML) // Returns: "<p>This & that © 2023 "Quotes" 'Apostrophes' €100 ☺</p>"
 */
function convertHTMLSpecialChars(str, unescape = true) {
  const entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    " ": "&nbsp;",
    "'": "&#39;",
    "`": "&#96;",
    "¢": "&cent;",
    "£": "&pound;",
    "¥": "&yen;",
    "€": "&euro;",
    "©": "&copy;",
    "®": "&reg;",
    "™": "&trade;",
  };

  // Add numeric character references for Latin-1 Supplement characters
  for (let i = 160; i <= 255; i++) {
    entityMap[String.fromCharCode(i)] = `&#${i};`;
  }

  if (unescape) {
    // Create a reverse mapping for unescaping
    const reverseEntityMap = Object.fromEntries(
      Object.entries(entityMap).map(([k, v]) => [v, k])
    );

    // Add alternative representations
    reverseEntityMap["&apos;"] = "'";
    reverseEntityMap["&laquo;"] = "«";
    reverseEntityMap["&raquo;"] = "»";

    // Regex to match all types of HTML entities
    const entityRegex = new RegExp(
      Object.keys(reverseEntityMap).join("|") + "|&#[0-9]+;|&#x[0-9a-fA-F]+;",
      "g"
    );

    str = str.replace(entityRegex, (entity) => {
      if (entity.startsWith("&#x")) {
        // Convert hexadecimal numeric character reference
        return String.fromCharCode(parseInt(entity.slice(3, -1), 16));
      } else if (entity.startsWith("&#")) {
        // Convert decimal numeric character reference
        return String.fromCharCode(parseInt(entity.slice(2, -1), 10));
      }
      // Convert named entity
      return reverseEntityMap[entity] || entity;
    });

    str = str.replace(/[\u0300-\u036f]/g, ""); //special chars

    return str;
  } else {
    // Regex to match all characters that need to be escaped
    const charRegex = new RegExp(`[${Object.keys(entityMap).join("")}]`, "g");
    return str.replace(charRegex, (char) => entityMap[char]);
  }
}

const OPTION_CHUNK_INTERVAL = 120;
const OPTION_HOW_MANY_CHUNKS = 5

async function addYoutubeTranscript() {


  // alert(1)
  var  { content, timestamps } = await fetchTranscriptOfficialYoutube();

  //chunk timestamps into 60s intervals and grab the offset text at for each interval
  var chunkedTimestamps = [];
  var chunk = [];
  var chunkTime = 0;
  for (var i = 0; i < timestamps.length; i++) {
    var [offset, time] = timestamps[i];
    if (time - chunkTime > OPTION_CHUNK_INTERVAL) {
      chunkedTimestamps.push(chunk);
      chunk = [];
      chunkTime = time;
    }
    chunk.push([offset, time]);
  }
  chunkedTimestamps.push(chunk);

  // for each chunk get the text at the offset beginning and last offset
  chunkedTimestamps = chunkedTimestamps.map((chunk) => {
    var [startOffset, startTime] = chunk[0];
    var [endOffset, endTime] = chunk[chunk.length - 1];
    var textAtOffset = content.substring(startOffset, endOffset).trim();
    return [startTime, textAtOffset]
  });

  //for the first 5, pass into prompt and get summary

  for (var chunk in chunkedTimestamps) {
    var [startTime, textAtOffset] = chunkedTimestamps[chunk];
    try{
    var summary = await passPrompt(textAtOffset);
    }  catch (e) {
      console.log(e)
    }

    chunkedTimestamps[chunk].push(summary)

  }

  content = chunkedTimestamps.map(([startTime, textAtOffset, summary]) => {
    return `<a  href="#" onclick="document.querySelector('video').currentTime = ${startTime}; return false;"  style="text-decoration: none; color: black;">
    <b> ${new Date(startTime * 1000).toISOString().slice(14, 19)} </b> <br />
    <h2>${summary}</h2> <br />
    ${textAtOffset}</a>`;
  }).join('<br /><br />');

  content = convertHTMLSpecialChars(content);
    
    // Create sidebar element
    var sidebar = document.createElement('div');
    sidebar.style.position = 'fixed';
    sidebar.style.top = '0';
    sidebar.style.left = '0';
    sidebar.style.width = '300px';
    sidebar.style.height = '100vh';
    sidebar.style.overflow = 'auto';
    sidebar.style.backgroundColor = 'white';
    sidebar.style.color = 'black';
    sidebar.style.boxShadow = '0 4px 8px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19)';
    sidebar.style.zIndex = '1000';

    sidebar.innerHTML = content 

    // Create wrapper for existing content
    var contentWrapper = document.createElement('div');
    contentWrapper.style.position = 'absolute';
    contentWrapper.style.left = '300px';
    contentWrapper.style.top = '0';
    contentWrapper.style.right = '0';
    contentWrapper.style.minHeight = '100vh';
    contentWrapper.style.overflow = 'auto';
    
    // Move all existing body content to wrapper
    while (document.body.firstChild) {
        contentWrapper.appendChild(document.body.firstChild);
    }
    
    // Reset body styling
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'relative';
    document.body.style.minHeight = '100vh';
    
    // Add elements back to body
    document.body.appendChild(sidebar);
    document.body.appendChild(contentWrapper);



}


async function passPrompt(content){
  content = content.replace(/<[^>]*>?/gm, '');
    content = content.slice(0, 1000)

    var response = await fetch('http://54.176.85.238:2000/?msg='+"create unique   label of 8 to  15 words for this text and do not return anything else:" + encodeURIComponent(content))
    var data = await response.json()
    data = data?.content[0]?.text || " " 

    return data

}
addYoutubeTranscript();
