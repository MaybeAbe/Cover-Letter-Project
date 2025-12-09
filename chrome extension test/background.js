// background.js
console.log('Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateCoverLetter') {
    handleCoverLetterGeneration(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function handleCoverLetterGeneration(data) {
  const { resume, jobPosting, hfToken } = data;
  
  const messages = [
    { 
      role: "system", 
      content: "You are an expert career coach. Write a professional, compelling cover letter based on the resume and job description provided." 
    },
    { 
      role: "user", 
      content: `JOB TITLE: ${jobPosting.title}
COMPANY: ${jobPosting.company}
DESCRIPTION: ${jobPosting.description}

CANDIDATE RESUME:
${resume}` 
    }
  ];

  const coverLetter = await callHuggingFace(messages, hfToken);
  await generatePDF(coverLetter, jobPosting);
  
  return { coverLetter };
}

async function callHuggingFace(messages, token) {
  const API_URL = "https://router.huggingface.co/v1/chat/completions";
  const MODEL_ID = "Qwen/Qwen2.5-72B-Instruct";

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: messages,
        max_tokens: 1024,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 503) {
        throw new Error('Model is loading (cold boot). Please wait 30 seconds and try again.');
      }
      if (response.status === 400 || response.status === 404) {
         throw new Error('Model unavailable on free tier. Please check background.js for updates.');
      }
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result.choices[0].message.content.trim();

  } catch (error) {
    console.error('Hugging Face API Error:', error);
    throw error;
  }
}

// UPDATED: Uses FileReader to avoid URL.createObjectURL error
async function generatePDF(coverLetterText, jobPosting) {
  const content = `COVER LETTER
${jobPosting.company ? `For: ${jobPosting.company}` : ''}
${jobPosting.title ? `Position: ${jobPosting.title}` : ''}

${coverLetterText}
`;

  // Create Blob
  const blob = new Blob([content], { type: 'text/plain' });
  
  // Convert Blob to Base64 Data URL (Service Worker Safe)
  const reader = new FileReader();
  const dataUrl = await new Promise((resolve) => {
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
  
  const filename = `CoverLetter_${jobPosting.company || 'Job'}.txt`;
  
  await chrome.downloads.download({
    url: dataUrl,
    filename: filename,
    saveAs: true
  });
}



// console.log('Background script loaded');

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   console.log('Message received in background:', request);
  
//   if (request.action === 'generateCoverLetter') {
//     handleCoverLetterGeneration(request.data)
//       .then(result => {
//         console.log('Generation successful:', result);
//         sendResponse({ success: true, data: result });
//       })
//       .catch(error => {
//         console.error('Generation failed:', error);
//         sendResponse({ success: false, error: error.message });
//       });
//     return true;
//   }
// });

// async function handleCoverLetterGeneration(data) {
//   console.log('Starting cover letter generation...');
//   const { resume, jobPosting, hfToken } = data;
//   const MODEL_ID = 'mistralai/Mistral-7B-Instruct-v0.3';
//   const prompt = buildPrompt(resume, jobPosting);
//   const API_URL = `https://router.huggingface.co/hf-inference/models/${MODEL_ID}`;
  
//   console.log('Building prompt...');
//   console.log('Prompt preview:', prompt.substring(0, 200) + '...');
  
//   console.log('Calling Hugging Face API...');
//   const coverLetter = await callHuggingFace(API_URL, prompt, hfToken);  
//   await generatePDF(coverLetter, jobPosting);
  
//   return { coverLetter };
// }

// function buildPrompt(resume, jobPosting) {
//   return `<s>[INST] You are an expert career coach. Write a professional cover letter for the following job application.

// Job Title: ${jobPosting.title}
// Company: ${jobPosting.company}
// Location: ${jobPosting.location}

// Job Description:
// ${jobPosting.description}

// Candidate's Resume:
// ${resume}
// Generate a compelling cover letter that highlights relevant experience and explains why the candidate is a great fit for this position. [/INST]`;
// }


// async function callHuggingFace(url, prompt, token) {
//   try {
//     const response = await fetch(url, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({
//         inputs: prompt,
//         parameters: {
//           max_new_tokens: 1024,
//           temperature: 0.7,
//           top_p: 0.9,
//           return_full_text: false,
//           do_sample: true
//         }
//       })
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       if (response.status === 503) {
//         throw new Error('Model is warming up. Please wait 30 seconds and try again.');
//       }
//       throw new Error(`API Error ${response.status}: ${errorText}`);
//     }

//     const result = await response.json();
    
//     // Handle result
//     let generatedText = '';
//     if (Array.isArray(result) && result[0]?.generated_text) {
//       generatedText = result[0].generated_text;
//     } else if (result.generated_text) {
//       generatedText = result.generated_text;
//     } else {
//       generatedText = JSON.stringify(result);
//     }

//     return generatedText.trim();

//   } catch (error) {
//     console.error('Hugging Face API Error:', error);
//     throw error;
//   }
// }

// async function generatePDF(coverLetterText, jobPosting) {
//   const content = `COVER LETTER
// ${jobPosting.company ? `For: ${jobPosting.company}` : ''}
// ${jobPosting.title ? `Position: ${jobPosting.title}` : ''}

// ${coverLetterText}
// `;
  
//   const blob = new Blob([content], { type: 'text/plain' });
//   const url = URL.createObjectURL(blob);
//   const filename = `CoverLetter_${jobPosting.company || 'Job'}.txt`;
  
//   await chrome.downloads.download({
//     url: url,
//     filename: filename,
//     saveAs: true
//   });
// }
// // async function callHuggingFace(prompt, token) {

// //   // modify line below to set the API URL
// //   const MODEL_ID = 'czszt/llama-coverletter-final';
// //   const API_URL = 'https://api-inference.huggingface.co/models/${MODEL_ID}';
  
// //   try {
// //     console.log('Sending request to Hugging Face...');
// //     const requestBody = {
// //       // change the model below 
// //       model: 'meta-llama/Llama-3.2-3B-Instruct',
// //         messages: [
// //           {
// //             role: 'user',
// //             content: prompt
// //           }
// //         ],
// //       parameters: {
// //         max_length: 1024,
// //         temperature: 0.7,
// //         top_p: 0.9,
// //         do_sample: true,
// //         repetition_penalty: 1.2
// //       }
// //     };


// //     console.log('Request parameters:', requestBody.parameters);
    
// //     const response = await fetch(API_URL, {
// //       method: 'POST',
// //       headers: {
// //         'Authorization': `Bearer ${token}`,
// //         'Content-Type': 'application/json'
// //       },
// //       body: JSON.stringify(requestBody)
// //     });
    
    
// //     console.log('Response status:', response.status, response.statusText);
    
// //     if (!response.ok) {
// //       const error = await response.text();
// //       console.error('API error response:', error);
// //       if (response.status === 503) {
// //         throw new Error('Model is loading.');
// //       }
// //       throw new Error(`HuggingFace API error (${response.status}): ${error}`);
// //     }
    
// //     const result = await response.json();
// //     console.log('API response:', result);
    
// //     const generatedText = result.choices[0].message.content;

    
// //     console.log('Extracted text length:', generatedText.length);
    
// //     return generatedText.trim();
    
// //   } catch (error) {
// //     console.error('Error calling Hugging Face:', error);
// //     throw error;
// //   }
// // }